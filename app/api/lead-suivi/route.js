import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Suivi des leads par Fabrice depuis la page publique UNIQUE /suivi/[secret].
// Un seul secret partagé (SUIVI_SECRET) garde la route, pas un jeton par lead,
// pour ne pas semer des centaines d'URL d'écriture dans les boîtes mail (choix
// du conseil LLM, 19/10/2026). La route est STRICTEMENT bornée à la table `leads`
// (jamais `prospects`). Toute écriture passe par service_role, en POST seulement
// (jamais GET : les bots d'aperçu de lien pré-chargent les URL).

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Comparaison à temps ~constant pour éviter de fuir la longueur/le préfixe du secret.
function secretOk(fourni) {
  const attendu = process.env.SUIVI_SECRET || ""
  if (!attendu || typeof fourni !== "string" || fourni.length !== attendu.length) return false
  let diff = 0
  for (let i = 0; i < attendu.length; i++) diff |= attendu.charCodeAt(i) ^ fourni.charCodeAt(i)
  return diff === 0
}

const STATUTS = ["a_relancer", "rdv", "devis", "perdu"]

// Liste des leads encore à suivre (non traités), avec leur dernier suivi.
export async function GET(req) {
  try {
    if (!secretOk(new URL(req.url).searchParams.get("k"))) {
      return Response.json({ error: "Lien invalide." }, { status: 401 })
    }
    const sb = db()
    const { data: leads } = await sb
      .from("leads")
      .select("id, nom, telephone, nuisible, ville, message, urgence, created_at, suivi_statut, suivi_note, rappel_le, dernier_contact")
      .eq("traite", false)
      .order("rappel_le", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
    return Response.json({ ok: true, leads: leads || [] })
  } catch (err) {
    console.error("lead-suivi GET error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Enregistre le résultat d'un appel sur UN lead désigné par son id.
export async function POST(req) {
  try {
    const body = await req.json()
    if (!secretOk(body.k)) return Response.json({ error: "Lien invalide." }, { status: 401 })
    if (!body.id) return Response.json({ error: "Lead manquant." }, { status: 400 })
    const statut = STATUTS.includes(body.statut) ? body.statut : null
    if (!statut) return Response.json({ error: "Statut inconnu." }, { status: 400 })

    const sb = db()
    const note = (body.note || "").toString().slice(0, 2000) || null
    const patch = {
      suivi_statut: statut,
      suivi_note: note,
      rappel_le: statut === "a_relancer" ? (body.rappel_le || null) : null,
      dernier_contact: new Date().toISOString(),
    }
    // « Perdu » = le lead sort de la liste d'attente (comme dans l'admin), motif = la note.
    if (statut === "perdu") { patch.traite = true; patch.motif = note || "Non précisé" }

    const { error } = await sb.from("leads").update(patch).eq("id", body.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (err) {
    console.error("lead-suivi POST error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
