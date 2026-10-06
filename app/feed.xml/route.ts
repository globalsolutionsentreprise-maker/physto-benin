import { createClient } from "@supabase/supabase-js"

const BASE = "https://www.phyto-benin.com"

// Revalidation horaire : un nouvel article apparaît dans le flux sous 1h (aligné sur sitemap.ts)
export const revalidate = 3600

function slugifier(titre: string): string {
  return titre
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function GET() {
  let articles: any[] = []
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase.from("articles").select("*").order("id", { ascending: false })
    if (data) articles = data.filter((a: any) => a.titre && a.contenu && a.contenu.trim() !== "")
  } catch (e) {
    // BDD indisponible (ex. au build) : on renvoie un flux valide mais vide
    console.error("feed: erreur chargement articles", e)
  }

  const items = articles.map((a: any) => {
    const url = `${BASE}/blog/${slugifier(a.titre)}`
    const date = a.updated_at ? new Date(a.updated_at)
      : a.created_at ? new Date(a.created_at)
      : new Date()
    const desc = (a.extrait || a.contenu || "").toString().slice(0, 300)
    return `    <item>
      <title>${esc(a.titre)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date.toUTCString()}</pubDate>${a.categorie ? `\n      <category>${esc(a.categorie)}</category>` : ""}
      <description>${esc(desc)}</description>
    </item>`
  }).join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Phyto Bénin by GSE — Blog hygiène &amp; anti-nuisibles</title>
    <link>${BASE}/blog</link>
    <description>Conseils et actualités sur la désinsectisation, la dératisation, la désinfection et l'hygiène sanitaire au Bénin.</description>
    <language>fr-FR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
