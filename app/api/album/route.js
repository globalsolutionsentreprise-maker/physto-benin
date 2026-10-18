import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Album public des médias d'une intervention (photos + vidéos). Route PUBLIQUE
// gardée par le jeton d'album (fiches_passage.album_token), distinct du
// fiche_token de saisie : le lien se partage au client sans ouvrir le formulaire
// terrain. Le bucket fiches-medias est privé ; on renvoie des URLs signées (1 h,
// régénérées à chaque ouverture de l'album).

const BUCKET = "fiches-medias"

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function GET(req) {
  try {
    const sb = db()
    const token = new URL(req.url).searchParams.get("token")
    if (!token || typeof token !== "string") return Response.json({ error: "Lien invalide." }, { status: 404 })

    const { data: fiche } = await sb
      .from("fiches_passage")
      .select("medias, date_passage, date_fin_passage, lieu_prestation, devis_id, numero_unique")
      .eq("album_token", token)
      .maybeSingle()
    if (!fiche) return Response.json({ error: "Album introuvable ou expiré." }, { status: 404 })

    let client = ""
    let lieu = fiche.lieu_prestation || ""
    if (fiche.devis_id) {
      const { data: devis } = await sb
        .from("devis")
        .select("etablissement_nom, clients(entreprise, nom, prenom)")
        .eq("id", fiche.devis_id)
        .maybeSingle()
      const cl = devis && devis.clients
      if (cl) client = cl.entreprise || [cl.prenom, cl.nom].filter(Boolean).join(" ") || ""
      if (!lieu && devis && devis.etablissement_nom) lieu = devis.etablissement_nom
    }

    const medias = []
    for (const m of Array.isArray(fiche.medias) ? fiche.medias : []) {
      if (!m || !m.path) continue
      const { data } = await sb.storage.from(BUCKET).createSignedUrl(m.path, 3600)
      if (data && data.signedUrl) {
        medias.push({ url: data.signedUrl, type: m.type || "", name: m.name || "", note: m.note || "" })
      }
    }

    return Response.json({
      ok: true,
      client: client || "Client",
      lieu,
      date: fiche.date_passage || "",
      dateFin: fiche.date_fin_passage || "",
      numero: fiche.numero_unique || "",
      medias,
    })
  } catch (e) {
    return Response.json({ error: "Album momentanément indisponible." }, { status: 500 })
  }
}
