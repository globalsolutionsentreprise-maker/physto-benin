// app/api/paiements-data/route.js
// Lot B — Consultation ADMIN des règlements (déclarés / confirmés / rejetés).
// Lecture seule : accessible admin ET lecture (verifyAdmin). Les actions
// (confirmer/rejeter) passent par /api/valider-paiement (verifyAdminWrite).
// Joint devis (numéro, montant dû) + client, et produit une URL SIGNÉE courte
// pour le justificatif (bucket privé, jamais d'URL publique).
import { createClient } from "@supabase/supabase-js"
import { verifyAdmin } from "@/lib/verify-admin"

export const dynamic = "force-dynamic"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = "justificatifs"

export async function GET(req) {
  if (!await verifyAdmin(req)) {
    return Response.json({ error: "Non autorisé" }, { status: 403 })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: paiements, error } = await supabase
    .from("paiements")
    .select("id, devis_id, type_versement, montant, statut, mode, reference, justificatif_url, verif_note, verifie_par, verifie_at, created_at, confirmed_at, devis(numero, montant_total, prestation), clients(nom, prenom, email)")
    .in("statut", ["declare", "confirme", "rejete"])
    .order("created_at", { ascending: false })
    .limit(300)
  if (error) {
    return Response.json({ error: "Erreur lecture paiements: " + error.message }, { status: 500 })
  }

  // URL signée (1 h) pour chaque justificatif présent. Jamais d'URL publique.
  const out = []
  for (const p of paiements || []) {
    let justificatifSignedUrl = null
    if (p.justificatif_url) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p.justificatif_url, 3600)
      justificatifSignedUrl = data?.signedUrl || null
    }
    out.push({ ...p, justificatifSignedUrl })
  }

  return Response.json({ paiements: out })
}
