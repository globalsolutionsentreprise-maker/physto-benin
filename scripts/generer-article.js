import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SUJETS = [
  { categorie: "DÉSINSECTISATION", mots_cles: "cafards, moustiques, fourmis, restaurant, hotel, Cotonou" },
  { categorie: "DÉRATISATION", mots_cles: "rats, souris, rongeurs, entrepot, Benin" },
  { categorie: "DÉSINFECTION", mots_cles: "desinfection, assainissement, bacteries, locaux professionnels" },
  { categorie: "ANTI-TERMITES", mots_cles: "termites, bois, fondations, maison, Benin" },
  { categorie: "REPTILES", mots_cles: "geckos, serpents, lezards, securisation, Benin" },
  { categorie: "HYGIÈNE PROFESSIONNELLE", mots_cles: "normes hygiene, inspection sanitaire, hotel, restaurant" },
  { categorie: "PRÉVENTION", mots_cles: "prevention nuisibles, conseils hygiene, Benin" },
]

const sujet = SUJETS[new Date().getDay() % SUJETS.length]

async function genererArticle() {
  console.log("Sujet du jour:", sujet.categorie)

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Tu es un expert en hygiene sanitaire au Benin pour PHYSTO Benin. Genere un article de blog professionnel en francais sur : ${sujet.mots_cles}. Categorie : ${sujet.categorie}. Reponds UNIQUEMENT en JSON valide sans backticks : {"titre":"max 80 chars","resume":"max 200 chars","contenu":"400-600 mots avec sauts de ligne et # pour les titres"}`
      }]
    })
  })

  if (!response.ok) throw new Error("Anthropic error: " + response.status + " " + await response.text())

  const data = await response.json()
  const article = JSON.parse(data.content[0].text.trim())

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

  if (error) throw new Error("Supabase error: " + JSON.stringify(error))
  console.log("Article insere:", article.titre)
}

genererArticle().catch(err => { console.error(err.message); process.exit(1) })
