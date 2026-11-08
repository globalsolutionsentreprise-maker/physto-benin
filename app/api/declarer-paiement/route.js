// app/api/declarer-paiement/route.js
// Lot A — Déclaration d'un règlement HORS SITE (chèque / Mobile Money).
// Le client (propriétaire du devis) OU un admin déclare un versement. La ligne est créée
// en statut 'declare' : elle NE compte PAS encore dans le solde (c'est 'confirme', posé par
// valider-paiement après vérification comptable, qui compte). Montant recalculé côté serveur.
import { createClient } from "@supabase/supabase-js"
import { verifyAdminWrite } from "@/lib/verify-admin"

export const dynamic = "force-dynamic"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(req) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Admin (rôle) OU client propriétaire (jeton Bearer).
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

  let body
  try { body = await req.json() } catch {
    return Response.json({ error: "JSON invalide" }, { status: 400 })
  }
  const { devisId, typeVersement, mode, reference, justificatifUrl } = body
  if (!devisId || !typeVersement) {
    return Response.json({ error: "Paramètres manquants" }, { status: 400 })
  }
  if (typeVersement !== "60" && typeVersement !== "40") {
    return Response.json({ error: "typeVersement invalide" }, { status: 400 })
  }
  if (mode !== "cheque" && mode !== "mobile_money") {
    return Response.json({ error: "mode invalide (cheque | mobile_money)" }, { status: 400 })
  }

  const { data: devis, error: devisError } = await supabase
    .from("devis")
    .select("id, client_id, montant_total, pct_acompte")
    .eq("id", devisId)
    .single()
  if (devisError || !devis) {
    return Response.json({ error: "Devis introuvable" }, { status: 404 })
  }

  // Propriété stricte pour un client (un admin déclare pour n'importe quel devis).
  if (!adminUser) {
    const { data: owner } = await supabase
      .from("clients")
      .select("id")
      .eq("id", devis.client_id)
      .eq("user_id", clientUserId)
      .maybeSingle()
    if (!owner) return Response.json({ error: "Accès refusé à ce devis" }, { status: 403 })
  }

  // Montant recalculé serveur (jamais pris du client).
  const pctAcompte = devis.pct_acompte || 60
  const pct = typeVersement === "60" ? pctAcompte : 100 - pctAcompte
  const montant = Math.round(Number(devis.montant_total || 0) * pct / 100)

  const { data: paiement, error: insErr } = await supabase
    .from("paiements")
    .insert({
      devis_id: devisId,
      client_id: devis.client_id,
      type_versement: typeVersement,
      montant,
      statut: "declare",
      mode,
      reference: reference || null,
      justificatif_url: justificatifUrl || null,
    })
    .select("id, statut")
    .single()

  if (insErr || !paiement) {
    // Index unique partiel : une échéance ACTIVE existe déjà (déclarée ou payée).
    if (insErr?.code === "23505") {
      const { data: actif } = await supabase
        .from("paiements")
        .select("id, statut")
        .eq("devis_id", devisId)
        .eq("type_versement", typeVersement)
        .not("statut", "in", "(echoue,rejete)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (actif?.statut === "confirme") {
        return Response.json({ error: "Ce versement est déjà réglé." }, { status: 409 })
      }
      return Response.json({ error: "Une déclaration est déjà en cours pour ce versement.", paiementId: actif?.id }, { status: 409 })
    }
    return Response.json({ error: "Erreur enregistrement: " + (insErr?.message || "") }, { status: 500 })
  }

  return Response.json({ paiementId: paiement.id, statut: paiement.statut, montant })
}
