// Script à mettre dans scripts/generer-article.js
// Exécuté automatiquement chaque jour par GitHub Actions

const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Sujets d article a alterner
const SUJETS = [
  { categorie: "DÉSINSECTISATION", mots_cles: "cafards, blattes, moustiques, fourmis, Cotonou, restaurant, hotel" },
  { categorie: "DÉRATISATION", mots_cles: "rats, souris, rongeurs, entrepot, hangar, Bénin, hygiene" },
  { categorie: "DÉSINFECTION", mots_cles: "desinfection, assainissement, bacteries, virus, locaux professionnels" },
  { categorie: "ANTI-TERMITES", mots_cles: "termites, bois, fondations, maison, protection, traitement" },
  { categorie: "REPTILES", mots_cles: "geckos, serpents, lezards, maison, securisation, Benin" },
  { categorie: "HYGIÈNE PROFESSIONNELLE", mots_cles: "normes hygiene, inspection sanitaire, certification, hotel, restaurant Benin" },
  { categorie: "PRÉVENTION", mots_cles: "prevention nuisibles, conseils hygiene, securiser locaux, Benin" },
]

async function genererArticle() {
  // Appel à l API Anthropic pour générer l article
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
        content: `Tu es un expert en hygiène sanitaire au Bénin travaillant pour PHYSTO Bénin.
        
Génère un article de blog professionnel en français parfait (avec tous les accents) sur le sujet : ${sujet.mots_cles}
Catégorie : ${sujet.categorie}

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "titre": "Titre accrocheur et SEO (max 80 chars)",
  "resume": "Résumé en 2 phrases (max 200 chars)",
  "contenu": "Contenu complet de l article en 400-600 mots avec des paragraphes séparés par des sauts de ligne. Utilise # pour les titres de section."
}

Le contenu doit être pratique, professionnel, adapté au contexte béninois et optimisé pour le SEO.
Mentionne naturellement PHYSTO Bénin comme expert de référence.`
      }]
    })
  })

  const data = await response.json()
  const texte = data.content[0].text.trim()
  
  // Nettoyer le JSON
  const jsonPropre = texte.replace(/```json|```/g, "").trim()
  const article = JSON.parse(jsonPropre)

  // Insérer dans Supabase
  const aujourd_hui = new Date()
  const mois = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
  const dateFormatee = aujourd_hui.getDate() + " " + mois[aujourd_hui.getMonth()] + " " + aujourd_hui.getFullYear()

  const { error } = await supabase.from("articles").insert([{
    categorie: sujet.categorie,
    titre: article.titre,
    resume: article.resume,
    contenu: article.contenu,
    date: dateFormatee,
    lecture: "5 min",
    vedette: false,
    actif: true
  }])

  if (error) {
    console.error("Erreur insertion Supabase:", error)
    process.exit(1)
  }

  console.log("Article inséré avec succès :", article.titre)
}

// Choisir le sujet du jour (rotation basée sur le jour de la semaine)
const jourDeLaSemaine = new Date().getDay()
const sujet = SUJETS[jourDeLaSemaine % SUJETS.length]

genererArticle().catch(function(err) {
  console.error("Erreur:", err)
  process.exit(1)
})
