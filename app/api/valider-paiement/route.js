// app/api/valider-paiement/route.js
// Lot A — Vérification comptable + confirmation administrative d'un règlement hors site.
// RÉSERVÉ aux admins (rôle). 'confirmer' => la ligne compte dans le solde ; si le devis est
// alors intégralement réglé, l'attestation est émise (remplace le déclencheur webhook FedaPay).
// 'rejeter' => statut 'rejete' + motif (libère l'échéance pour une nouvelle déclaration).
import { createClient } from "@supabase/supabase-js"
import { verifyAdminWrite } from "@/lib/verify-admin"
import { emettreAttestation } from "@/lib/attestation"

export const dynamic = "force-dynamic"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req) {
  const adminUser = await verifyAdminWrite(req)
  if (!adminUser) {
    return Response.json({ error: "Droits insuffisants (admin requis)." }, { status: 403 })
  }

  let body
  try { body = await req.json() } catch {
    return Response.json({ error: "JSON invalide" }, { status: 400 })
  }
  const { paiementId, action, note, justificatifUrl } = body
  if (!paiementId || (action !== "confirmer" && action !== "rejeter")) {
    return Response.json({ error: "Paramètres invalides (action: confirmer | rejeter)" }, { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: paiement, error: pErr } = await supabase
    .from("paiements")
    .select("id, devis_id, montant, statut, type_versement")
    .eq("id", paiementId)
    .maybeSingle()
  if (pErr || !paiement) {
    return Response.json({ error: "Paiement introuvable" }, { status: 404 })
  }
  if (paiement.statut === "confirme") {
    return Response.json({ error: "Ce règlement est déjà confirmé." }, { status: 409 })
  }
  if (!["declare", "en_attente", "en_cours"].includes(paiement.statut)) {
    return Response.json({ error: `Règlement non vérifiable (statut ${paiement.statut}).` }, { status: 409 })
  }

  const horodatage = { verifie_par: adminUser.email, verifie_at: new Date().toISOString() }

  // ---- REJET ----
  if (action === "rejeter") {
    const { error } = await supabase
      .from("paiements")
      .update({ statut: "rejete", verif_note: note || null, ...horodatage })
      .eq("id", paiementId)
    if (error) return Response.json({ error: "Échec du rejet: " + error.message }, { status: 500 })
    return Response.json({ paiementId, statut: "rejete" })
  }

  // ---- CONFIRMATION ----
  const patch = {
    statut: "confirme",
    confirmed_at: new Date().toISOString(),
    verif_note: note || null,
    ...horodatage,
  }
  if (justificatifUrl) patch.justificatif_url = justificatifUrl
  const { error: upErr } = await supabase.from("paiements").update(patch).eq("id", paiementId)
  if (upErr) return Response.json({ error: "Échec de la confirmation: " + upErr.message }, { status: 500 })

  // Solde du devis après cette confirmation.
  const { data: devis } = await supabase
    .from("devis").select("montant_total").eq("id", paiement.devis_id).maybeSingle()
  const { data: toutes } = await supabase
    .from("paiements").select("montant, statut").eq("devis_id", paiement.devis_id)
  const totalConfirme = (toutes || [])
    .filter((p) => p.statut === "confirme")
    .reduce((s, p) => s + Number(p.montant || 0), 0)
  const montantDu = Number(devis?.montant_total || 0)
  const solde = montantDu > 0 && totalConfirme >= montantDu

  if (solde) {
    // Devis soldé : emettreAttestation pose le devis 'termine' + émet l'attestation + email.
    const att = await emettreAttestation(paiement.devis_id)
    return Response.json({ paiementId, statut: "confirme", solde: true, attestation: att.body, attestationStatus: att.status })
  }

  // Acompte reçu : devis en cours.
  await supabase.from("devis").update({ statut: "en_cours" }).eq("id", paiement.devis_id)
  return Response.json({ paiementId, statut: "confirme", solde: false, totalConfirme, montantDu })
}
