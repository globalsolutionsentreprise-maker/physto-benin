import { createClient } from "@supabase/supabase-js"
import { buildFichePassageHtml, buildFicheControleHtml } from "@/lib/fiche-html"

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
    .select("id, devis_id, date_intervention, type_passage, client_nom, adresse, notes, fiche_remplie_at, fiche_draft")
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

// Rend la fiche (passage ou contrôle) en HTML autonome, servie par le serveur à
// une URL partageable : Fabrice envoie CE LIEN au client (pas un fichier local
// qui casse sur mobile → ERR_FILE_NOT_FOUND). On rend l'état finalisé si la fiche
// est soumise, sinon le brouillon en cours (la page terrain sauvegarde en continu).
// Mêmes builders que le téléphone (lib/fiche-html.js), donc rendu identique.
function ficheDocHtml({ fiche, draft, client, lieu, passage }, origin) {
  const c = client || {}
  const d = draft || {}
  const sub = fiche || null
  const s = sub ? {
    typePassage: sub.type_passage || "Contrôle", prestations: sub.prestations || [], nuisibles: sub.nuisibles || [],
    produits: sub.produits || {}, produitsCoches: Object.keys(sub.produits || {}),
    dureeDebut: sub.duree_debut || "", dureeFin: sub.duree_fin || "",
    datePassage: sub.date_passage || "", dateFinPassage: sub.date_fin_passage || "",
    journees: Array.isArray(sub.journees) ? sub.journees : [], superviseurNom: sub.superviseur_nom || "Fabrice",
    clientSignataire: sub.client_signataire || "", signatureClient: sub.signature_client_data_url || "",
    signatureTech: sub.signature_tech_data_url || "", autresPrestation: sub.autres_prestation || "", autresNuisible: sub.autres_nuisible || "",
    controle: sub.controle_data || {},
  } : {
    typePassage: d.typePassage || "Contrôle", prestations: d.prestations || [], nuisibles: d.nuisibles || [],
    produits: d.produits || {}, produitsCoches: Array.isArray(d.produitsCoches) ? d.produitsCoches : Object.keys(d.produits || {}),
    dureeDebut: d.dureeDebut || "", dureeFin: d.dureeFin || "",
    datePassage: d.datePassage || "", dateFinPassage: d.dateFinPassage || "",
    journees: Array.isArray(d.journees) ? d.journees : [], superviseurNom: d.superviseurNom || "Fabrice",
    clientSignataire: d.clientSignataire || "", signatureClient: d.signatureClient || "",
    signatureTech: d.signatureTech || "", autresPrestation: "", autresNuisible: "",
    controle: { postes: d.postes, infestation: d.infestation, constat: d.constat, recommandations: d.recommandations, prochainPassage: d.prochainPassage },
  }
  const estControle = (passage && passage.type_passage === "controle") || s.typePassage === "Contrôle"
  const numero = (sub && sub.numero_unique) || "—"
  const jrs = (s.journees || []).filter((j) => j && (j.date || j.debut || j.fin))
  const jr0 = jrs[0] || { date: s.datePassage, debut: s.dureeDebut, fin: s.dureeFin }
  const dpass = jr0.date || s.datePassage
  const dfin = jrs.length > 1 ? jrs[jrs.length - 1].date : ""
  const bilingue = !!c.bilingue
  let html
  if (estControle) {
    const f = {
      controle_data: Object.assign({}, s.controle, { signatureDataUrl: s.signatureClient, clientSignataire: s.clientSignataire }),
      date_passage: dpass, date_fin_passage: dfin, lieu_prestation: lieu || "",
      signature_client_data_url: s.signatureClient, client_signataire: s.clientSignataire,
      signature_tech_data_url: s.signatureTech, superviseur_nom: s.superviseurNom, superviseur_contact: "",
    }
    html = buildFicheControleHtml(f, { entreprise: c.entreprise, nom: c.nom, adresse: c.adresse }, numero, [], { bilingue })
  } else {
    const form = {
      nomClient: c.entreprise || c.nom || "", adresse: c.adresse || "", tel: c.tel || "", mob: "",
      typePassage: s.typePassage, prestations: s.prestations, nuisibles: s.nuisibles, produits: s.produits, produitsCoches: s.produitsCoches,
      autresPrestation: s.autresPrestation, autresNuisible: s.autresNuisible,
      lieuPrestation: lieu || "", journees: jrs,
      dureeDebut: jr0.debut || "", dureeFin: jr0.fin || "", datePassage: dpass, dateFinPassage: dfin,
      clientSignataire: s.clientSignataire, signatureClient: s.signatureClient, signatureTech: s.signatureTech,
      superviseurNom: s.superviseurNom, superviseurContact: "",
    }
    html = buildFichePassageHtml(form, { entreprise: c.entreprise, nom: c.nom }, numero, [], { bilingue })
  }
  // <base> absolu : le logo (chemin racine) se résout même ouvert hors de notre origine.
  return html.replace("<head>", '<head><base href="' + origin + '/">')
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

    const clientInfo = {
      nom: [client && client.prenom, client && client.nom].filter(Boolean).join(" ") || p.client_nom || "",
      entreprise: (client && client.entreprise) || "",
      adresse: (devis && devis.etablissement_adresse) || (client && client.adresse) || p.adresse || "",
      tel: (client && client.telephone) || "",
      bilingue: !!(client && client.bilingue),
    }
    const lieu = (devis && devis.etablissement_nom) || ""

    // ?doc=1 : rend la fiche en PAGE HTML partageable (lien à envoyer au client),
    // au lieu du JSON. Lien stable, pas de fichier local qui casse sur mobile.
    if (new URL(req.url).searchParams.get("doc")) {
      const html = ficheDocHtml(
        { fiche: fiche || null, draft: p.fiche_draft || null, client: clientInfo, lieu, passage: p },
        new URL(req.url).origin
      )
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
    }

    return Response.json({
      ok: true,
      passage: { type_passage: p.type_passage, date: p.date_intervention, dejaRemplie: !!p.fiche_remplie_at },
      client: clientInfo,
      lieu,
      prestationsDevis,
      fiche: fiche || null,
      medias,
      draft: p.fiche_draft || null,
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

    // 1bis) Brouillon serveur : la saisie en cours est sauvegardée à chaque
    //       modification, pour la retrouver après un rechargement (appareil
    //       photo, navigateur WhatsApp) ou sur un autre appareil.
    if (body.action === "save_draft") {
      const draft = body.draft && typeof body.draft === "object" ? body.draft : null
      const { error } = await sb.from("interventions").update({ fiche_draft: draft }).eq("id", p.id)
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ ok: true })
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
      date_fin_passage: f.dateFinPassage || null,
      journees: Array.isArray(f.journees) ? f.journees : [],
      client_signataire: f.clientSignataire || null,
      signature_client_data_url: f.signatureClient || null,
      signature_tech_data_url: f.signatureTech || null,
      superviseur_nom: f.superviseurNom || null,
      superviseur_contact: f.superviseurContact || null,
      medias,
      rempli_par: f.rempliPar || "Fabrice",
      intervention_id: p.id,
      // Rubriques propres à la fiche de contrôle (postes d'appâtage, infestation,
      // constat, recommandations, prochain passage, signataire client). null pour
      // une fiche de passage ordinaire.
      controle_data: (f.controleData && typeof f.controleData === "object") ? f.controleData : null,
    }

    // Un passage de type contrôle (planning) OU une fiche explicitement marquée
    // « Contrôle » produit une FICHE DE CONTRÔLE (préfixe FC), sinon FP.
    const estControle = p.type_passage === "controle" || f.typePassage === "Contrôle"

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
      numero = `${estControle ? "FC" : "FP"}-GSE-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
      const { error } = await sb.from("fiches_passage").insert(Object.assign({}, ficheData, { numero_unique: numero, client_id, devis_id }))
      if (error) return Response.json({ error: error.message }, { status: 500 })
    }

    // Passage marqué fait (la frise lit statut === "terminee") + horodatage terrain.
    await sb.from("interventions").update({ statut: "terminee", fiche_remplie_at: new Date().toISOString(), fiche_draft: null }).eq("id", p.id)

    return Response.json({ ok: true, numero })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
