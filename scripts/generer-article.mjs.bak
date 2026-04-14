import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error("Variables manquantes:", { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_KEY: !!SUPABASE_KEY, ANTHROPIC_KEY: !!ANTHROPIC_KEY })
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const SUJETS = [
  { categorie: "DESINSECTISATION", mots_cles: "cafards moustiques fourmis restaurant hotel Cotonou" },
  { categorie: "DERATISATION", mots_cles: "rats souris rongeurs entrepot Benin hygiene" },
  { categorie: "DESINFECTION", mots_cles: "desinfection assainissement bacteries locaux professionnels" },
  { categorie: "ANTI-TERMITES", mots_cles: "termites bois fondations maison protection Benin" },
  { categorie: "REPTILES", mots_cles: "geckos serpents lezards maison securisation Benin" },
  { categorie: "HYGIENE PROFESSIONNELLE", mots_cles: "normes hygiene inspection sanitaire hotel restaurant" },
  { categorie: "PREVENTION", mots_cles: "prevention nuisibles conseils hygiene securiser locaux" },
]

const sujet = SUJETS[new Date().getDay() % SUJETS.length]
console.log("Sujet:", sujet.categorie)

const prompt = `Tu es un expert hygiene sanitaire au Benin pour PHYSTO Benin. Ecris un article blog en francais sur : ${sujet.mots_cles}. Reponds avec du JSON valide uniquement, sans markdown ni backticks : {"titre":"titre court et percutant","resume":"deux phrases de resume","contenu":"article complet de 500 mots"}`

const resp = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": ANTHROPIC_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }]
  })
})

if (!resp.ok) {
  const txt = await resp.text()
  console.error("Erreur Anthropic:", resp.status, txt)
  process.exit(1)
}

const json = await resp.json()
console.log("Status Anthropic:", json.type)

const texte = json.content[0].text.trim()
console.log("Reponse brute:", texte.substring(0, 200))

let article
try {
  article = JSON.parse(texte)
} catch(e) {
  // Essayer d extraire le JSON si entouré de texte
  const match = texte.match(/\{[\s\S]*\}/)
  if (match) {
    article = JSON.parse(match[0])
  } else {
    console.error("JSON invalide:", texte)
    process.exit(1)
  }
}

const mois = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"]
const d = new Date()
const date = d.getDate() + " " + mois[d.getMonth()] + " " + d.getFullYear()

const { error } = await supabase.from("articles").insert([{
  categorie: sujet.categorie,
  titre: article.titre,
  resume: article.resume,
  contenu: article.contenu,
  date: date,
  lecture: "5 min",
  vedette: false,
  actif: true
}])

if (error) {
  console.error("Erreur Supabase:", JSON.stringify(error))
  process.exit(1)
}

console.log("Article insere avec succes:", article.titre)
