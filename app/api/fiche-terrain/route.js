import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Fiche de passage remplie sur site par le technicien (Fabrice) via un lien token.
// Route PUBLIQUE gardée par le token du passage (interventions.fiche_token) :
// aucune authentification admin, mais tout accès est borné au seul passage que le
// token désigne. Toute écriture passe par service_role ici (jamais côté navigateur).
// Les médias sont uploadés en direct vers le bucket privé via URL signée (hors
// plafond ~4,5 Mo de Vercel).

const BUCKET = "fiches-medias"

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

async function passageFromToken(sb, token) {
  if (!token || typeof token !== "string") return null
  const { data } = await sb
    .from("interventions")
    .select("id, devis_id, date_intervention, type_passage, client_nom, adresse, notes, fiche_remplie_at")
    .eq("fiche_token", token)
    .maybeSingle()
  return data || null
}

async function signMedias(sb, medias) {
  const out = []
  for (const m of medias || []) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(m.path, 3600)
    out.push(Object.assign({}, m, { url: data?.signedUrl || null }))
  }
  return out
}

export async function GET(req) {
  try {
    const sb = db()
    const token = new URL(req.url).searchParams.get("token")
    const p = await passageFromToken(sb, token)
    if (!p) return Response.json({ error: "Lien invalide ou expiré." }, { status: 404 })

    let devis = null, client = null
    if (p.devis_id) {
      const { data } = await sb.from("devis").select("*, clients(*)").eq("id", p.devis_id).maybeSingle()
      devis = data || null
      client = devis && devis.clients ? devis.clients : null
    }

    const { data: fiche } = await sb.from("fiches_passage").select("*").eq("intervention_id", p.id).maybeSingle()
    const medias = fiche && Array.isArray(fiche.medias) && fiche.medias.length ? await signMedias(sb, fiche.medias) : []

    const prestationsDevis = Array.isArray(devis && devis.prestations) && devis.prestations.length
      ? devis.prestations
      : (devis && devis.prestation ? [devis.prestation] : [])

    return Response.json({
      ok: true,
      passage: { type_passage: p.type_passage, date: p.date_intervention, dejaRemplie: !!p.fiche_remplie_at },
      client: {
        nom: [client && client.prenom, client && client.nom].filter(Boolean).join(" ") || p.client_nom || "",
        entreprise: (client && client.entreprise) || "",
        adresse: (devis && devis.etablissement_adresse) || (client && client.adresse) || p.adresse || "",
        tel: (client && client.telephone) || "",
      },
      lieu: (devis && devis.etablissement_nom) || "",
      prestationsDevis,
      fiche: fiche || null,
      medias,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const sb = db()
    const body = await req.json()
    const p = await passageFromToken(sb, body.token)
    if (!p) return Response.json({ error: "Lien invalide." }, { status: 404 })

    // 1) URLs signées d'upload : le téléphone pousse les fichiers en direct vers
    //    Storage (pas via Vercel), puis renvoie les chemins au submit.
    if (body.action === "upload-url") {
      const files = Array.isArray(body.files) ? body.files.slice(0, 20) : []
      const uploads = []
      for (const f of files) {
        const ext = String((f && f.name) || "").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin"
        const path = `${p.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path)
        if (error) return Response.json({ error: error.message }, { status: 500 })
        uploads.push({ path, token: data.token, signedUrl: data.signedUrl, type: (f && f.type) || "", name: (f && f.name) || "" })
      }
      return Response.json({ ok: true, uploads })
    }

    // 2) Soumission de la fiche (upsert par passage : ré-ouverture = mise à jour).
    const f = body.fiche || {}
    const medias = Array.isArray(body.medias) ? body.medias.slice(0, 40) : []
    const ficheData = {
      type_passage: f.typePassage || p.type_passage || "Contrôle",
      prestations: Array.isArray(f.prestations) ? f.prestations : [],
      autres_prestation: f.autresPrestation || null,
      lieu_prestation: f.lieuPrestation || null,
      nuisibles: Array.isArray(f.nuisibles) ? f.nuisibles : [],
      autres_nuisible: f.autresNuisible || null,
      produits: f.produits && typeof f.produits === "object" ? f.produits : {},
      duree_debut: f.dureeDebut || null,
      duree_fin: f.dureeFin || null,
      remarques: f.remarques || null,
      date_passage: f.datePassage || p.date_intervention || new Date().toISOString().slice(0, 10),
      superviseur_nom: f.superviseurNom || null,
      superviseur_contact: f.superviseurContact || null,
      medias,
      rempli_par: f.rempliPar || "Fabrice",
      intervention_id: p.id,
    }

    const { data: existing } = await sb.from("fiches_passage").select("id, numero_unique").eq("intervention_id", p.id).maybeSingle()
    let numero
    if (existing) {
      numero = existing.numero_unique
      const { error } = await sb.from("fiches_passage").update(ficheData).eq("id", existing.id)
      if (error) return Response.json({ error: error.message }, { status: 500 })
    } else {
      let client_id = null
      const devis_id = p.devis_id || null
      if (devis_id) {
        const { data: d } = await sb.from("devis").select("client_id").eq("id", devis_id).maybeSingle()
        client_id = (d && d.client_id) || null
      }
      numero = `FP-GSE-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
      const { error } = await sb.from("fiches_passage").insert(Object.assign({}, ficheData, { numero_unique: numero, client_id, devis_id }))
      if (error) return Response.json({ error: error.message }, { status: 500 })
    }

    // Passage marqué fait (la frise lit statut === "terminee") + horodatage terrain.
    await sb.from("interventions").update({ statut: "terminee", fiche_remplie_at: new Date().toISOString() }).eq("id", p.id)

    return Response.json({ ok: true, numero })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
