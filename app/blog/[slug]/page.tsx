import type { Metadata } from "next"
import { cache } from "react"
import { createClient } from "@supabase/supabase-js"
import ArticleClient from "./ArticleClient"

const BASE = "https://www.phyto-benin.com"
const OG_IMAGE = `${BASE}/images/hero-bg.jpg`
const OG_CARD = `${BASE}/opengraph-image`

// Revalidation horaire : un article publié/modifié voit ses métadonnées rafraîchies sous 1h
export const revalidate = 3600

function slugifier(titre: string): string {
  return titre
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// Chargé une seule fois par requête (partagé entre generateMetadata et la page)
const getArticle = cache(async function (slug: string): Promise<any | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase.from("articles").select("*").order("id")
    if (error || !data) return null
    return data.find((a: any) => slugifier(a.titre) === slug) || null
  } catch (e) {
    console.error("getArticle: erreur Supabase", e)
    return null
  }
})

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    return {
      title: "Article introuvable — Blog Phyto Bénin",
      robots: { index: false, follow: true },
    }
  }

  const canonical = `${BASE}/blog/${slug}`
  const resume: string = (article.resume || "").trim()
  const description = resume.length > 160 ? resume.slice(0, 157).trimEnd() + "…" : resume
  const title = `${article.titre} — Blog Phyto Bénin`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: article.titre,
      description,
      url: canonical,
      siteName: "Phyto Bénin by GSE",
      locale: "fr_FR",
      type: "article",
      images: [{ url: OG_CARD, width: 1200, height: 630, alt: article.titre }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.titre,
      description,
      images: [OG_CARD],
    },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticle(slug)

  const jsonLd = article
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": article.titre,
        "description": article.resume || "",
        "articleSection": article.categorie || undefined,
        "image": OG_IMAGE,
        "inLanguage": "fr-FR",
        "mainEntityOfPage": { "@type": "WebPage", "@id": `${BASE}/blog/${slug}` },
        "author": { "@type": "Organization", "name": "Phyto Bénin by GSE", "url": BASE },
        "publisher": {
          "@type": "Organization",
          "name": "Phyto Bénin by GSE",
          "logo": { "@type": "ImageObject", "url": `${BASE}/logo-gse.jpeg` },
        },
        ...(article.created_at ? { datePublished: article.created_at } : {}),
      }
    : null

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <ArticleClient slug={slug} />
    </>
  )
}
