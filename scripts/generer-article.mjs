import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const GROQ_KEY = process.env.GROQ_API_KEY

console.log("Demarrage du script...")
console.log("SUPABASE_URL:", SUPABASE_URL ? "OUI" : "NON")
console.log("SUPABASE_KEY:", SUPABASE_KEY ? "OUI" : "NON")
console.log("GROQ_KEY:", GROQ_KEY ? "OUI" : "NON")

if (!SUPABASE_URL || !SUPABASE_KEY || !GROQ_KEY) {
  console.error("ERREUR: Variables manquantes")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const SUJETS = [
  { categorie: "DESINSECTISATION", mots_cles: "cafards moustiques fourmis restaurant hotel Cotonou Benin" },
  { categorie: "DERATISATION", mots_cles: "rats souris rongeurs entrepot hangar Benin hygiene" },
  { categorie: "DESINFECTION", mots_cles: "desinfection assainissement bacteries virus locaux professionnels Benin" },
  { categorie: "ANTI-TERMITES", mots_cles: "termites bois fondations maison protection traitement Benin" },
  { categorie: "REPTILES", mots_cles: "geckos serpents lezards maison securisation danger Benin" },
  { categorie: "HYGIENE PRO", mots_cles: "normes hygiene inspection sanitaire hotel restaurant certification Benin" },
  { categorie: "PREVENTION", mots_cles: "prevention nuisibles conseils hygiene securiser locaux entreprise Benin" },
]

const sujet = SUJETS[new Date().getDay() % SUJETS.length]
console.log("Sujet du jour:", sujet.categorie)

const prompt = `Tu es un expert en hygiène sanitaire au Bénin travaillant pour PHYSTO Bénin, entreprise spécialisée en désinsectisation, dératisation et désinfection à Cotonou.

Rédige un article de blog professionnel en français parfait (avec tous les accents) sur le sujet : ${sujet.mots_cles}

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, sans backticks, sans markdown :
{"titre":"Titre accrocheur et optimisé SEO, maximum 80 caractères","resume":"Résumé de l article en 2 phrases maximum, 200 caractères maximum","contenu":"Article complet de 400 à 500 mots. Utilise des paragraphes séparés par des sauts de ligne. Commence chaque section par # suivi du titre de section. Mentionne naturellement PHYSTO Bénin comme expert de référence. Adapte au contexte béninois."}`

console.log("Appel API Groq...")

let resp
try {
  resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + GROQ_KEY
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }]
    })
  })
} catch(e) {
  console.error("ERREUR reseau Groq:", e.message)
  process.exit(1)
}

console.log("Status Groq:", resp.status)

if (!resp.ok) {
  const txt = await resp.text()
  console.error("ERREUR Groq:", resp.status, txt)
  process.exit(1)
}

const json = await resp.json()
const texte = json.choices?.[0]?.message?.content?.trim()

if (!texte) {
  console.error("ERREUR: Reponse vide de Groq")
  process.exit(1)
}

console.log("Reponse brute (150 chars):", texte.substring(0, 150))

let article
try {
  article = JSON.parse(texte)
} catch(e) {
  console.log("JSON direct echoue, tentative extraction...")
  const match = texte.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      article = JSON.parse(match[0])
    } catch(e2) {
      console.error("ERREUR JSON invalide:", texte.substring(0, 300))
      process.exit(1)
    }
  } else {
    console.error("ERREUR: Pas de JSON dans la reponse:", texte.substring(0, 300))
    process.exit(1)
  }
}

console.log("Titre article:", article.titre)

const mois = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"]
const d = new Date()
const date = d.getDate() + " " + mois[d.getMonth()] + " " + d.getFullYear()

console.log("Insertion dans Supabase...")

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
  console.error("ERREUR Supabase:", JSON.stringify(error))
  process.exit(1)
}

console.log("SUCCESS: Article insere avec succes:", article.titre)
