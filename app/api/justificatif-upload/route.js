// app/api/justificatif-upload/route.js
// Lot B — Dépôt FACULTATIF d'un justificatif de règlement (capture MoMo / photo chèque).
// Upload vers un bucket PRIVÉ via service_role (aucune exposition publique). Validation
// stricte du type et de la taille côté serveur (+ restrictions bucket en défense en profondeur).
// Autorisé : admin OU client PROPRIÉTAIRE du devis. Retourne le CHEMIN de stockage
// (jamais une URL publique) à passer ensuite à /api/declarer-paiement.
import { createClient } from "@supabase/supabase-js"
import { verifyAdminWrite } from "@/lib/verify-admin"

export const dynamic = "force-dynamic"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BUCKET = "justificatifs"
const MAX_BYTES = 4 * 1024 * 1024 // 4 Mo (sous le plafond ~4,5 Mo de Vercel)
const TYPES = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf",
}

export async function POST(req) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Admin OU client propriétaire.
  const adminUser = await verifyAdminWrite(req)
  let clientUserId = null
  if (!adminUser) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Authentification requise" }, { status: 401 })
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user } } = await anon.auth.getUser(token)
    if (!user) return Response.json({ error: "Session invalide" }, { status: 401 })
    clientUserId = user.id
  }

  let form
  try { form = await req.formData() } catch {
    return Response.json({ error: "Requête multipart invalide" }, { status: 400 })
  }
  const devisId = form.get("devisId")
  const file = form.get("file")
  if (!devisId || !file || typeof file === "string") {
    return Response.json({ error: "devisId et file requis" }, { status: 400 })
  }

  // Validation type + taille (serveur).
  const ext = TYPES[file.type]
  if (!ext) {
    return Response.json({ error: "Type non autorisé (JPEG, PNG, WebP ou PDF)" }, { status: 415 })
  }
  if (typeof file.size === "number" && file.size > MAX_BYTES) {
    return Response.json({ error: "Fichier trop volumineux (max 4 Mo)" }, { status: 413 })
  }

  // Propriété du devis pour un client.
  const { data: devis, error: devisErr } = await supabase
    .from("devis").select("id, client_id").eq("id", devisId).single()
  if (devisErr || !devis) return Response.json({ error: "Devis introuvable" }, { status: 404 })
  if (!adminUser) {
    const { data: owner } = await supabase
      .from("clients").select("id").eq("id", devis.client_id).eq("user_id", clientUserId).maybeSingle()
    if (!owner) return Response.json({ error: "Accès refusé à ce devis" }, { status: 403 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.byteLength > MAX_BYTES) {
    return Response.json({ error: "Fichier trop volumineux (max 4 Mo)" }, { status: 413 })
  }
  const path = `${devisId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false })
  if (upErr) {
    return Response.json({ error: "Échec de l'upload: " + upErr.message }, { status: 500 })
  }

  return Response.json({ path })
}
