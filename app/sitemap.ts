import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"

const BASE = "https://www.phyto-benin.com"

// Date de dernière modification des pages statiques. Volontairement STABLE
// (pas `new Date()`, qui changerait à chaque revalidation horaire et produirait
// un <lastmod> instable que Google finit par ignorer). À bumper lors d'une
// refonte de contenu du site vitrine.
const DERNIERE_MODIF = new Date("2026-08-04")

// Revalidation horaire : un nouvel article apparaît dans le sitemap sous 1h
export const revalidate = 3600

function slugifier(titre: string): string {
  return titre
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// Pages statiques du site vitrine (hors /admin, /espace-client)
const pagesStatiques: MetadataRoute.Sitemap = [
  { url: BASE, changeFrequency: "weekly", priority: 1.0 },
  { url: `${BASE}/contrat-conformite`, changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/services`, changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/services/desinsectisation-cotonou`, changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/services/deratisation-benin`, changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/services/desinfection-locaux`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/services/anti-termites-benin`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/services/reptiles-serpents-benin`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/services/anti-moustiques-cotonou`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/services/punaises-de-lit-cotonou`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/services/contrat-entretien-hygiene`, changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/blog`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${BASE}/qui-sommes-nous`, changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.8 },
  // Pages locales par ville (SEO local)
  { url: `${BASE}/zones`, changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/zones/abomey-calavi`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/zones/porto-novo`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/zones/ouidah`, changeFrequency: "monthly", priority: 0.8 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let articles: MetadataRoute.Sitemap = []

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase.from("articles").select("*").order("id")
    if (data) {
      articles = data
        // On n'indexe que les articles réellement rédigés (contenu non vide)
        .filter((a: any) => a.titre && a.contenu && a.contenu.trim() !== "")
        .map((a: any) => ({
          url: `${BASE}/blog/${slugifier(a.titre)}`,
          // On préfère la date de dernière mise à jour si la colonne existe,
          // sinon la date de création, sinon maintenant (dernier recours).
          lastModified: a.updated_at ? new Date(a.updated_at)
            : a.created_at ? new Date(a.created_at)
            : new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
    }
  } catch (e) {
    // BDD indisponible (ex. au build) : on renvoie au moins les pages statiques
    console.error("sitemap: erreur chargement articles", e)
  }

  // Injecte une date de dernière modif sur chaque page statique (les articles
  // ont déjà la leur, dérivée de la BDD).
  const statiquesAvecDate = pagesStatiques.map((p) => ({
    ...p,
    lastModified: p.lastModified ?? DERNIERE_MODIF,
  }))

  return [...statiquesAvecDate, ...articles]
}
