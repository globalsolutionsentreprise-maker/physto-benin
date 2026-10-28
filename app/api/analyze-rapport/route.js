import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyAdmin } from "@/lib/verify-admin"

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
const GEMINI_FILES_UPLOAD = "https://generativelanguage.googleapis.com/upload/v1beta/files"
const GEMINI_FILES = "https://generativelanguage.googleapis.com/v1beta"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // lecture vidéo (upload + traitement Gemini) peut prendre > 60s

// Anti-SSRF : on ne télécharge QUE les médias hébergés sur le Storage Supabase du
// projet (URLs signées). Toute autre URL fournie par l'appelant est ignorée, pour
// empêcher d'atteindre des endpoints internes/cloud via cette route.
const MEDIA_ORIGIN = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin } catch { return "" } })()
function mediaAutorisee(u) {
  try { const x = new URL(u); return !!MEDIA_ORIGIN && x.origin === MEDIA_ORIGIN && x.pathname.startsWith("/storage/") } catch { return false }
}

async function callGeminiWithRetry(body, maxRetries = 3) {
  let lastErr
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) return res
    const errData = await res.json().catch(() => ({}))
    lastErr = errData
    // Retry only on overload / rate-limit errors
    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, attempt * 2000))
      continue
    }
    throw Object.assign(new Error("Gemini " + res.status), { data: errData })
  }
  throw Object.assign(new Error("Gemini unavailable après " + maxRetries + " tentatives"), { data: lastErr })
}

// Télécharge la vidéo (depuis Supabase Storage) puis la pousse à la Files API Gemini,
// qui l'analyse nativement (image + piste audio). Attend l'état ACTIVE avant usage.
async function uploadVideoToGemini(url) {
  if (!mediaAutorisee(url)) return null
  const key = process.env.GEMINI_API_KEY
  let vRes
  try { vRes = await fetch(url, { signal: AbortSignal.timeout(25000) }) } catch { return null }
  if (!vRes.ok) return null
  const buf = Buffer.from(await vRes.arrayBuffer())
  const mimeType = vRes.headers.get("content-type") || "video/mp4"

  let up
  try {
    up = await fetch(`${GEMINI_FILES_UPLOAD}?key=${key}`, {
      method: "POST",
      headers: { "X-Goog-Upload-Protocol": "raw", "X-Goog-Upload-File-Name": "rapport-video", "Content-Type": mimeType },
      body: buf,
    })
  } catch { return null }
  if (!up.ok) return null
  const meta = await up.json().catch(() => null)
  let file = meta && (meta.file || meta)
  if (!file || !file.name) return null

  // ponytail: poll jusqu'à ACTIVE (max ~60s) — la Files API traite la vidéo en arrière-plan
  for (let i = 0; i < 30 && file.state !== "ACTIVE"; i++) {
    if (file.state === "FAILED") return null
    await new Promise(r => setTimeout(r, 2000))
    const st = await fetch(`${GEMINI_FILES}/${file.name}?key=${key}`).catch(() => null)
    if (!st || !st.ok) break
    file = await st.json().catch(() => file)
  }
  return file.state === "ACTIVE" ? { mimeType: file.mimeType || mimeType, fileUri: file.uri } : null
}

// Accès : admin authentifié, OU token de passage valide (page publique
// technicien /fiche/[token]). Une erreur de lecture ferme l'accès.
async function ficheTokenValide(token) {
  if (!token || typeof token !== "string") return false
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data, error } = await sb.from("interventions").select("id").eq("fiche_token", token).maybeSingle()
  return !error && !!data
}

export async function POST(req) {
  try {
    const { type, notes, photos, audios, videos, context, ficheToken } = await req.json()
    if (!await verifyAdmin(req) && !await ficheTokenValide(ficheToken)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    const ctx = Object.assign({}, context)

    const mediaParts = []

    // Photos (+ frames déjà extraites) en inline data (max 12)
    for (const url of (photos || []).slice(0, 12)) {
      if (!mediaAutorisee(url)) continue
      try {
        const imgRes = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (!imgRes.ok) continue
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString("base64")
        const mimeType = imgRes.headers.get("content-type") || "image/jpeg"
        mediaParts.push({ inlineData: { mimeType, data: base64 } })
      } catch {
        // skip failed images
      }
    }

    // Notes vocales : déjà en base64 dans le body (max 5)
    for (const a of (audios || []).slice(0, 5)) {
      if (a && a.data && a.mimeType) {
        mediaParts.push({ inlineData: { mimeType: a.mimeType, data: a.data } })
      }
    }

    // Vidéos : lues nativement par Gemini via la Files API (image + son), max 3
    let videosCount = 0
    for (const url of (videos || []).slice(0, 3)) {
      const fd = await uploadVideoToGemini(url)
      if (fd && fd.fileUri) { mediaParts.push({ fileData: { mimeType: fd.mimeType, fileUri: fd.fileUri } }); videosCount++ }
    }

    ctx.photosCount = (photos || []).length
    ctx.videosCount = videosCount

    const promptText = type === "dictee" ? buildPromptDictee(notes, ctx)
      : type === "visite" ? buildPromptVisite(notes, ctx)
      : buildPromptIntervention(notes, ctx)
    const parts = [{ text: promptText }, ...mediaParts]

    let geminiRes
    try {
      geminiRes = await callGeminiWithRetry({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: "application/json" },
      })
    } catch (e) {
      return NextResponse.json({ error: "❌ Gemini indisponible — réessaie dans quelques secondes. (" + (e.message || "") + ")" }, { status: 503 })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ""
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

    let rapport
    try {
      rapport = JSON.parse(cleaned)
    } catch {
      // Fallback : extraire le bloc JSON si Gemini a ajouté du texte autour
      const match = cleaned.match(/\{[\s\S]*\}/)
      try {
        if (!match) throw new Error("no match")
        rapport = JSON.parse(match[0])
      } catch {
        return NextResponse.json({ error: "Réponse non parseable — réessaie ou reformule tes notes", raw: rawText }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, rapport })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function blocVisuels(ctx) {
  let out = ""
  if (ctx?.photosCount > 0) {
    out += `${ctx.photosCount} photo${ctx.photosCount > 1 ? "s" : ""} jointe${ctx.photosCount > 1 ? "s" : ""} — analyse-les attentivement pour enrichir le rapport.\n`
  }
  if (ctx?.videosCount > 0) {
    out += `${ctx.videosCount} vidéo${ctx.videosCount > 1 ? "s" : ""} jointe${ctx.videosCount > 1 ? "s" : ""} — REGARDE chaque vidéo EN ENTIER, l'image ET le son (le technicien commente souvent à voix haute en filmant). Exploite tout ce que tu vois et entends : nuisibles, zones, dégâts, état des lieux, gestes de traitement.\n`
  }
  if (ctx?.audiosCount > 0) {
    out += `${ctx.audiosCount} note${ctx.audiosCount > 1 ? "s" : ""} vocale${ctx.audiosCount > 1 ? "s" : ""} jointe${ctx.audiosCount > 1 ? "s" : ""} — écoute-les, transcris les informations utiles et intègre-les au rapport.\n`
  }
  return out
}

// Instruction + champ JSON pour que l'IA désigne les meilleurs instants à capturer.
function blocCaptures(ctx) {
  if (!(ctx?.videosCount > 0)) return { instr: "", champ: "" }
  const instr = `\nCAPTURES VIDÉO : pour CHAQUE vidéo jointe (index 0 = 1ère vidéo), choisis 1 à 3 instants (en SECONDES depuis le début) dont l'image fixe illustre le mieux le rapport : nuisible nettement visible, zone infestée, dégât, produit ou geste de traitement en action. ÉVITE IMPÉRATIVEMENT les images floues de mouvement, plans sombres, murs/sols/plafonds vides, portes, transitions. Si rien n'est exploitable dans une vidéo, ne mets pas d'entrée pour elle. Ces instants servent à extraire automatiquement les photos du rapport.`
  const champ = `,
  "capturesVideo": [{ "videoIndex": 0, "instants": [12.5], "legende": "Description courte de ce que montre l'image" }]`
  return { instr, champ }
}

// Dictée terrain : le technicien parle (note vocale), Gemini TRANSCRIT fidèlement
// et met au propre en français pro pour le champ « Observations libres » de la
// fiche. Aucun rapport structuré, aucune invention : le technicien relit ensuite.
function buildPromptDictee(notes, ctx) {
  return `Tu assistes un technicien de terrain de Global Solutions Entreprise (GSE), société de dératisation, désinsectisation et désinfection à Cotonou, Bénin. Il t'envoie une NOTE VOCALE (jointe) décrivant son intervention. Transcris-la et mets-la au propre pour le champ « Observations » de sa fiche.

CONTEXTE (indicatif, ne pas l'inventer dans le texte) :
- Client : ${ctx?.clientNom || "Non précisé"}
- Adresse : ${ctx?.adresse || "Non précisée"}
- Date : ${ctx?.date || "Non précisée"}
- Technicien : ${ctx?.technicien || "Non précisé"}
- Prestation : ${ctx?.prestation || "Non précisée"}
${notes ? `\nNOTES DÉJÀ SAISIES (à compléter, ne pas répéter) :\n${notes}\n` : ""}
RÈGLES STRICTES :
- Transcris FIDÈLEMENT ce qui est dit. Corrige l'orthographe, la grammaire et la ponctuation, reformule en français professionnel clair.
- N'INVENTE RIEN : aucun nuisible, produit, zone, quantité, chiffre ou action qui n'est pas dans la voix. Ne complète pas, ne déduis pas.
- Garde toutes les informations techniques (zones traitées, produits, quantités, constats, difficultés, conseils) exactement comme énoncées.
- Structure en phrases courtes ; utilise de courtes puces (préfixe «- ») si plusieurs points distincts.
- Si un passage est inaudible ou ambigu, écris [inaudible] à cet endroit plutôt que de deviner.
- Pas de formule d'introduction ni de conclusion ajoutée, pas de titre. Uniquement les observations.

Réponds UNIQUEMENT avec ce JSON, sans markdown :
{
  "observations": "Le texte mis au propre, prêt à relire par le technicien"
}`
}

function buildPromptVisite(notes, ctx) {
  const cap = blocCaptures(ctx)
  return `Tu es un expert en hygiène et lutte antiparasitaire pour Global Solutions Entreprise (GSE), société agréée de dératisation, désinsectisation et désinfection à Cotonou, Bénin.

Rédige un rapport de visite technique professionnel à partir des informations brutes du technicien.

CONTEXTE
- Client : ${ctx?.clientNom || "Non précisé"}
- Adresse : ${ctx?.adresse || "Non précisée"}
- Date de visite : ${ctx?.date || "Non précisée"}
- Technicien : ${ctx?.technicien || "Non précisé"}
- Prestation : ${ctx?.prestation || "Non précisée"}

NOTES BRUTES DU TECHNICIEN :
${notes || "(aucune note fournie)"}

${blocVisuels(ctx)}${cap.instr}

Rédige un rapport structuré en JSON avec exactement ces champs. Utilise un langage professionnel, précis et factuel. Réponds UNIQUEMENT avec le JSON, sans markdown :

{
  "descriptionSite": "Description professionnelle du site (type de bâtiment, configuration, état général, superficie approximative si connue)",
  "nuisibles": ["uniquement des valeurs parmi : Cafards, Rats, Souris, Moustiques, Mouches, Fourmis, Termites, Punaises de lit, Serpents"],
  "zonesInfestees": "Description précise des zones infestées ou à risque",
  "niveauInfestation": "Faible | Moyen | Élevé",
  "observations": "Observations techniques détaillées (points critiques, facteurs favorisants, accessibilité, conditions sanitaires)",
  "recommandations": "Recommandations de traitement professionnelles (méthodes, fréquence, mesures préventives, délais)"${cap.champ}
}`
}

function buildPromptIntervention(notes, ctx) {
  const cap = blocCaptures(ctx)
  return `Tu es un expert en hygiène et lutte antiparasitaire pour Global Solutions Entreprise (GSE), société agréée de dératisation, désinsectisation et désinfection à Cotonou, Bénin.

Rédige un rapport d'intervention technique professionnel à partir des informations brutes du technicien.

CONTEXTE
- Client : ${ctx?.clientNom || "Non précisé"}
- Adresse : ${ctx?.adresse || "Non précisée"}
- Date d'intervention : ${ctx?.date || "Non précisée"}
- Technicien(s) : ${ctx?.technicien || "Non précisé"}
- Prestation : ${ctx?.prestation || "Non précisée"}

NOTES BRUTES DU TECHNICIEN :
${notes || "(aucune note fournie)"}

${blocVisuels(ctx)}${cap.instr}

Rédige un rapport structuré en JSON avec exactement ces champs. Utilise un langage professionnel, précis et factuel. Réponds UNIQUEMENT avec le JSON, sans markdown :

{
  "zonesTraitees": "Description professionnelle des zones traitées avec précision",
  "methodeApplication": "Méthode(s) d'application employée(s)",
  "dureeIntervention": "Durée de l'intervention",
  "resultats": "Résultats obtenus et évaluation de l'efficacité du traitement",
  "observations": "Observations techniques (difficultés, zones à risque résiduel, état général post-traitement)",
  "recommandations": "Recommandations de suivi (prochaine visite, délai, mesures préventives, actions correctives)"${cap.champ}
}`
}
