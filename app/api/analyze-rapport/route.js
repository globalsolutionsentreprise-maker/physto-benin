import { NextResponse } from "next/server"

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

export const dynamic = "force-dynamic"

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

export async function POST(req) {
  try {
    const { type, notes, photos, context } = await req.json()

    const parts = []

    const promptText = type === "visite" ? buildPromptVisite(notes, context) : buildPromptIntervention(notes, context)
    parts.push({ text: promptText })

    // Fetch photos and pass as inline data (max 6)
    for (const url of (photos || []).slice(0, 12)) {
      try {
        const imgRes = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (!imgRes.ok) continue
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString("base64")
        const mimeType = imgRes.headers.get("content-type") || "image/jpeg"
        parts.push({ inlineData: { mimeType, data: base64 } })
      } catch {
        // skip failed images
      }
    }

    let geminiRes
    try {
      geminiRes = await callGeminiWithRetry({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
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
      return NextResponse.json({ error: "Réponse non parseable", raw: rawText }, { status: 500 })
    }

    return NextResponse.json({ success: true, rapport })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildPromptVisite(notes, ctx) {
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

${(ctx?.photos?.length > 0) ? `${ctx.photos.length} visuel${ctx.photos.length > 1 ? 's' : ''} joint${ctx.photos.length > 1 ? 's' : ''} (photos et/ou frames extraites de vidéos) — analyse-les attentivement pour enrichir le rapport.` : ""}

Rédige un rapport structuré en JSON avec exactement ces champs. Utilise un langage professionnel, précis et factuel. Réponds UNIQUEMENT avec le JSON, sans markdown :

{
  "descriptionSite": "Description professionnelle du site (type de bâtiment, configuration, état général, superficie approximative si connue)",
  "nuisibles": ["liste des nuisibles identifiés"],
  "zonesInfestees": "Description précise des zones infestées ou à risque",
  "niveauInfestation": "Faible | Moyen | Élevé",
  "observations": "Observations techniques détaillées (points critiques, facteurs favorisants, accessibilité, conditions sanitaires)",
  "recommandations": "Recommandations de traitement professionnelles (méthodes, fréquence, mesures préventives, délais)"
}`
}

function buildPromptIntervention(notes, ctx) {
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

${(ctx?.photos?.length > 0) ? `${ctx.photos.length} visuel${ctx.photos.length > 1 ? 's' : ''} joint${ctx.photos.length > 1 ? 's' : ''} (photos et/ou frames extraites de vidéos) — analyse-les attentivement pour enrichir le rapport.` : ""}

Rédige un rapport structuré en JSON avec exactement ces champs. Utilise un langage professionnel, précis et factuel. Réponds UNIQUEMENT avec le JSON, sans markdown :

{
  "zonesTraitees": "Description professionnelle des zones traitées avec précision",
  "methodeApplication": "Méthode(s) d'application employée(s)",
  "dureeIntervention": "Durée de l'intervention",
  "resultats": "Résultats obtenus et évaluation de l'efficacité du traitement",
  "observations": "Observations techniques (difficultés, zones à risque résiduel, état général post-traitement)",
  "recommandations": "Recommandations de suivi (prochaine visite, délai, mesures préventives, actions correctives)"
}`
}
