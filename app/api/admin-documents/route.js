// app/api/admin-documents/route.js
// Étape B — Gestion documentaire CRM (dépôt / édition / publication de documents PDF
// attachés à un client = établissement). Bucket PRIVÉ 'documents' via service_role.
//
// Cohérence permissions (identique aux autres routes + RLS) :
//   * Lecture / preview (list, download)        -> verifyAdmin      (admin OU lecture)  <-> RLS documents_admin_read  = is_active_admin()
//   * Écritures (add/update/replace/publish/...) -> verifyAdminWrite (role 'admin')      <-> RLS documents_admin_write = is_admin()
//
// Sécurité : PDF uniquement, <= 4 Mo (validation serveur + bucket). Chemin de
// stockage généré (uuid) : le nom d'origine n'est JAMAIS utilisé comme chemin.
// Suppression = fichier Storage retiré AVANT la ligne (pas d'orphelin). Remplacement
// = nouveau fichier écrit et ligne mise à jour AVANT suppression de l'ancien.
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import { verifyAdmin, verifyAdminWrite } from "@/lib/verify-admin"

export const dynamic = "force-dynamic"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = "documents"
const MAX_BYTES = 4 * 1024 * 1024
const CATEGORIES = ["facture", "rapport_intervention", "fiche_technique", "fiche_controle", "attestation", "contrat", "devis", "autre"]

function j(data, status) { return Response.json(data, status ? { status } : undefined) }

// Validation PDF + taille. Message explicite si dépassement (consigne 2).
function validateFile(file) {
  if (!file || typeof file === "string") return "Fichier PDF requis"
  if (file.type !== "application/pdf") return "Type non autorisé : PDF uniquement"
  if (typeof file.size === "number" && file.size > MAX_BYTES) return "Fichier trop volumineux (max 4 Mo)"
  return null
}
// Nom d'origine conservé pour affichage uniquement (jamais comme chemin). Nettoyage défensif.
function cleanName(name) {
  return String(name || "document.pdf").replace(/[\\/\x00-\x1f]/g, "_").slice(0, 160)
}

export async function POST(req) {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const ct = req.headers.get("content-type") || ""
  const isMultipart = ct.includes("multipart/form-data")

  // --- parse + action ---
  let action, body = {}, form = null
  if (isMultipart) {
    try { form = await req.formData() } catch { return j({ error: "Requête multipart invalide" }, 400) }
    action = form.get("action")
  } else {
    try { body = await req.json() } catch { return j({ error: "JSON invalide" }, 400) }
    action = body.action
  }

  // --- gate : lecture (list/download) vs écriture (le reste) ---
  const readOnly = action === "list" || action === "download"
  const admin = readOnly ? await verifyAdmin(req) : await verifyAdminWrite(req)
  if (!admin) return j({ error: "Accès refusé" }, 403)

  try {
    // ---------- LIST ----------
    if (action === "list") {
      const clientId = body.clientId
      if (!clientId) return j({ error: "clientId requis" }, 400)
      const { data, error } = await supabase.from("documents")
        .select("*").eq("client_id", clientId)
        .order("date_document", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
      if (error) return j({ error: error.message }, 500)
      return j({ documents: data || [] })
    }

    // ---------- DOWNLOAD (preview admin) ----------
    if (action === "download") {
      const { id } = body
      if (!id) return j({ error: "id requis" }, 400)
      const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", id).single()
      if (!doc) return j({ error: "Document introuvable" }, 404)
      const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60)
      if (error) return j({ error: "URL signée indisponible" }, 500)
      return j({ url: signed.signedUrl })
    }

    // ---------- ADD ----------
    if (action === "add") {
      if (!form) return j({ error: "Requête multipart requise" }, 400)
      const clientId = form.get("clientId")
      const categorie = form.get("categorie")
      const titre = (form.get("titre") || "").toString().trim()
      const file = form.get("file")
      if (!clientId) return j({ error: "clientId requis" }, 400)
      if (!CATEGORIES.includes(categorie)) return j({ error: "Catégorie invalide" }, 400)
      if (!titre) return j({ error: "Titre requis" }, 400)
      const fileErr = validateFile(file)
      if (fileErr) return j({ error: fileErr }, 400)

      // Le client (établissement) doit exister : association garantie.
      const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).single()
      if (!client) return j({ error: "Client introuvable" }, 404)

      const buf = Buffer.from(await file.arrayBuffer())
      if (buf.byteLength > MAX_BYTES) return j({ error: "Fichier trop volumineux (max 4 Mo)" }, 413)

      const path = `${clientId}/${randomUUID()}.pdf`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: "application/pdf", upsert: false })
      if (upErr) return j({ error: "Échec de l'upload : " + upErr.message }, 500)

      // Le dépôt ne publie JAMAIS : statut 'brouillon'. Publication = action explicite.
      const { data: row, error: insErr } = await supabase.from("documents").insert({
        client_id: clientId,
        categorie,
        titre,
        date_document: form.get("date_document") || null,
        reference: form.get("reference") || null,
        description: form.get("description") || null,
        statut: "brouillon",
        storage_path: path,
        nom_fichier: cleanName(file.name),
        mime_type: "application/pdf",
        taille_bytes: buf.byteLength,
        devis_id: form.get("devisId") || null,
        intervention_id: form.get("interventionId") || null,
        created_by: admin.email || null,
      }).select("*").single()
      if (insErr) {
        // Nettoyage : pas de fichier orphelin si l'insert échoue.
        await supabase.storage.from(BUCKET).remove([path])
        return j({ error: "Échec de l'enregistrement : " + insErr.message }, 500)
      }
      return j({ document: row })
    }

    // ---------- REPLACE (nouveau fichier avant suppression de l'ancien) ----------
    if (action === "replace") {
      if (!form) return j({ error: "Requête multipart requise" }, 400)
      const id = form.get("id")
      const file = form.get("file")
      if (!id) return j({ error: "id requis" }, 400)
      const fileErr = validateFile(file)
      if (fileErr) return j({ error: fileErr }, 400)

      const { data: doc } = await supabase.from("documents").select("id, client_id, storage_path").eq("id", id).single()
      if (!doc) return j({ error: "Document introuvable" }, 404)

      const buf = Buffer.from(await file.arrayBuffer())
      if (buf.byteLength > MAX_BYTES) return j({ error: "Fichier trop volumineux (max 4 Mo)" }, 413)

      const newPath = `${doc.client_id}/${randomUUID()}.pdf`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, buf, { contentType: "application/pdf", upsert: false })
      if (upErr) return j({ error: "Échec de l'upload : " + upErr.message }, 500) // ancien intact

      const { error: updErr } = await supabase.from("documents")
        .update({ storage_path: newPath, nom_fichier: cleanName(file.name), taille_bytes: buf.byteLength, mime_type: "application/pdf" })
        .eq("id", id)
      if (updErr) {
        await supabase.storage.from(BUCKET).remove([newPath]) // rollback nouveau, ancien intact
        return j({ error: "Échec de la mise à jour : " + updErr.message }, 500)
      }
      // Nouveau fichier enregistré et pointé : on retire l'ancien (best-effort).
      if (doc.storage_path && doc.storage_path !== newPath) {
        await supabase.storage.from(BUCKET).remove([doc.storage_path])
      }
      return j({ ok: true })
    }

    // ---------- UPDATE (métadonnées) ----------
    if (action === "update") {
      const { id } = body
      if (!id) return j({ error: "id requis" }, 400)
      const patch = {}
      if (body.titre !== undefined) { const t = String(body.titre).trim(); if (!t) return j({ error: "Titre requis" }, 400); patch.titre = t }
      if (body.categorie !== undefined) { if (!CATEGORIES.includes(body.categorie)) return j({ error: "Catégorie invalide" }, 400); patch.categorie = body.categorie }
      if (body.date_document !== undefined) patch.date_document = body.date_document || null
      if (body.reference !== undefined) patch.reference = body.reference || null
      if (body.description !== undefined) patch.description = body.description || null
      if (body.devisId !== undefined) patch.devis_id = body.devisId || null
      if (body.interventionId !== undefined) patch.intervention_id = body.interventionId || null
      if (!Object.keys(patch).length) return j({ error: "Rien à modifier" }, 400)
      const { error } = await supabase.from("documents").update(patch).eq("id", id)
      if (error) return j({ error: error.message }, 500)
      return j({ ok: true })
    }

    // ---------- PUBLISH / UNPUBLISH / ARCHIVE ----------
    if (action === "publish" || action === "unpublish" || action === "archive") {
      const { id } = body
      if (!id) return j({ error: "id requis" }, 400)
      const patch = action === "publish" ? { statut: "publie", published_at: new Date().toISOString(), archived_at: null }
        : action === "unpublish" ? { statut: "brouillon" }
        : { statut: "archive", archived_at: new Date().toISOString() }
      const { error } = await supabase.from("documents").update(patch).eq("id", id)
      if (error) return j({ error: error.message }, 500)
      return j({ ok: true })
    }

    // ---------- DELETE (hard : fichier AVANT ligne, pas d'orphelin) ----------
    if (action === "delete") {
      const { id } = body
      if (!id) return j({ error: "id requis" }, 400)
      const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", id).single()
      if (!doc) return j({ error: "Document introuvable" }, 404)
      if (doc.storage_path) {
        const { error: rmErr } = await supabase.storage.from(BUCKET).remove([doc.storage_path])
        if (rmErr) return j({ error: "Échec de la suppression du fichier : " + rmErr.message }, 500) // ligne conservée
      }
      const { error: delErr } = await supabase.from("documents").delete().eq("id", id)
      if (delErr) return j({ error: delErr.message }, 500)
      return j({ ok: true })
    }

    return j({ error: "Action inconnue" }, 400)
  } catch (e) {
    return j({ error: "Erreur serveur : " + (e?.message || String(e)) }, 500)
  }
}
