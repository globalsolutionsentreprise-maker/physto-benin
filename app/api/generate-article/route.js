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
    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, attempt * 2000))
      continue
    }
    throw Object.assign(new Error("Gemini " + res.status), { data: errData })
  }
  throw Object.assign(new Error("Gemini indisponible"), { data: lastErr })
}

export async function POST(req) {
  const { sujet } = await req.json()
  if (!sujet) return NextResponse.json({ error: "Sujet requis" }, { status: 400 })

  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

  const prompt = `Tu es un expert en SEO et en rédaction web pour Phyto Bénin by GSE, une entreprise d'hygiène sanitaire et phytosanitaire basée à Cotonou, Bénin. Tu rédiges des articles de blog optimisés pour Google, ciblant les recherches locales en français.

SUJET DE L'ARTICLE : "${sujet}"

RÈGLES IMPÉRATIVES :
- Ton : professionnel, expert, rassurant. Jamais publicitaire.
- Longueur : 600 à 900 mots de contenu (champ contenu)
- Mots-clés : intègre naturellement des termes comme "Cotonou", "Bénin", "hygiène sanitaire", et les termes spécifiques au sujet
- Structure : utilise le format suivant pour le contenu :
  * "# Titre de section" pour les H2 (titres principaux)
  * "## Sous-titre" pour les H3
  * "- élément" pour les listes
  * Paragraphes normaux pour le texte courant
- Termine toujours par une mention de Phyto Bénin et son numéro +229 01 53 04 79 50
- Ne mets PAS de HTML, uniquement ce format texte simple

RETOURNE UNIQUEMENT ce JSON valide (sans markdown, sans backticks) :
{
  "titre": "titre optimisé SEO incluant un mot-clé + localisation (max 80 chars)",
  "categorie": "UNE seule catégorie en MAJUSCULES parmi : DÉSINSECTISATION, DÉRATISATION, ANTI-TERMITES, DÉSINFECTION, REPTILES, PUNAISES DE LIT, ANTI-MOUSTIQUES, HYGIÈNE PROFESSIONNELLE, PRÉVENTION",
  "resume": "résumé accrocheur de 2-3 phrases (max 200 chars) qui donne envie de lire",
  "lecture": "X min",
  "contenu": "le contenu complet de l'article avec la structure # ## - décrite ci-dessus"
}`

  let geminiRes
  try {
    geminiRes = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    })
  } catch (e) {
    return NextResponse.json({ error: "IA indisponible — réessaie dans quelques secondes." }, { status: 503 })
  }

  const data = await geminiRes.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""

  // Extraire le JSON même s'il est entouré de texte ou de backticks
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  // Si l'IA a quand même mis du texte avant/après, extraire le premier bloc JSON
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) cleaned = jsonMatch[0]

  try {
    const article = JSON.parse(cleaned)
    if (!article.titre || !article.contenu) throw new Error("Champs manquants")
    // Valeurs par défaut si champs optionnels absents
    if (!article.categorie) article.categorie = "HYGIÈNE PROFESSIONNELLE"
    if (!article.resume) article.resume = article.titre
    if (!article.lecture) article.lecture = "5 min"
    return NextResponse.json({ ok: true, article })
  } catch {
    // Dernier recours : construire un article minimal depuis le texte brut
    if (raw.length > 100) {
      const lines = raw.split("\n").filter(Boolean)
      return NextResponse.json({
        ok: true,
        article: {
          titre: lines[0]?.replace(/^#+\s*/, "").substring(0, 80) || "Article",
          categorie: "HYGIÈNE PROFESSIONNELLE",
          resume: lines[1]?.substring(0, 200) || "",
          contenu: raw,
          lecture: "5 min",
        }
      })
    }
    return NextResponse.json({ error: "L'IA n'a pas retourné de contenu. Réessaie.", raw }, { status: 422 })
  }
}
