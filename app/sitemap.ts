import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"

const BASE = "https://www.phyto-benin.com"

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
          lastModified: a.created_at ? new Date(a.created_at) : new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
    }
  } catch (e) {
    // BDD indisponible (ex. au build) : on renvoie au moins les pages statiques
    console.error("sitemap: erreur chargement articles", e)
  }

  return [...pagesStatiques, ...articles]
}
