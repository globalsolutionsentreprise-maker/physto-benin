import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { NUISIBLES, NUISIBLE_SLUGS, titreArticle } from "../data"

const BASE = "https://www.phyto-benin.com"
const WA = "https://wa.me/2290153047950?text=" + encodeURIComponent("Bonjour Phyto Bénin, je souhaite un devis / des informations.")

export async function generateStaticParams() {
  return NUISIBLE_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const n = NUISIBLES[slug]
  if (!n) return {}
  return {
    title: n.metaTitle,
    description: n.metaDesc,
    keywords: n.mots,
    alternates: { canonical: `${BASE}/nuisibles/${slug}` },
    openGraph: {
      title: n.metaTitle, description: n.metaDesc, url: `${BASE}/nuisibles/${slug}`,
      siteName: "Phyto Bénin by GSE", locale: "fr_FR", type: "website",
      images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: n.metaTitle }],
    },
  }
}

export default async function NuisiblePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const n = NUISIBLES[slug]
  if (!n) notFound()

  const schemaBreadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Nuisibles", "item": `${BASE}/nuisibles` },
      { "@type": "ListItem", "position": 3, "name": n.nom, "item": `${BASE}/nuisibles/${slug}` },
    ],
  }
  const schemaService = {
    "@context": "https://schema.org", "@type": "Service",
    "name": `Traitement ${n.nom.toLowerCase()} au Bénin`, "description": n.intro,
    "provider": { "@type": "LocalBusiness", "name": "Phyto Bénin by GSE", "url": BASE, "telephone": "+2290153047950", "address": { "@type": "PostalAddress", "addressLocality": "Cotonou", "addressCountry": "BJ" } },
    "areaServed": { "@type": "Country", "name": "Bénin" }, "url": `${BASE}/nuisibles/${slug}`,
  }

  const lbl = { fontSize: "11px", color: "#d4a920", fontWeight: 700, letterSpacing: "0.12em", marginBottom: "12px" as const }
  const h2 = { fontSize: "22px", fontWeight: 700, color: "#0a2e1a", marginBottom: "16px" } as const
  const card = { backgroundColor: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "20px 22px" } as const

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaService) }} />

      {/* BREADCRUMB */}
      <div style={{ backgroundColor: "#f7f7f5", padding: "12px 40px", borderBottom: "1px solid #eee" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", fontSize: "12px", color: "#888", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>Accueil</a><span>›</span>
          <a href="/nuisibles" style={{ color: "#888", textDecoration: "none" }}>Nuisibles</a><span>›</span>
          <span style={{ color: "#0a2e1a", fontWeight: 600 }}>{n.nom}</span>
        </div>
      </div>

      {/* HERO */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "64px 40px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={lbl}>{n.emoji} NUISIBLE · BÉNIN</div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 700, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "18px", maxWidth: "680px" }}>{n.h1}</h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.65)", lineHeight: 1.85, maxWidth: "620px", marginBottom: "30px" }}>{n.intro}</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: 700, fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none" }}>Devis gratuit</a>
            <a href={WA} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#25D366", color: "#fff", fontWeight: 700, fontSize: "14px", padding: "14px 24px", borderRadius: "6px", textDecoration: "none" }}>WhatsApp</a>
          </div>
        </div>
      </section>

      {/* CONTENU */}
      <section style={{ padding: "56px 40px", backgroundColor: "#faf9f6" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="grid-2">
          <div style={card}>
            <h2 style={h2}>Signes d'infestation</h2>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#444", fontSize: "14px", lineHeight: 2 }}>
              {n.signes.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
          <div style={card}>
            <h2 style={h2}>Notre méthode</h2>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#444", fontSize: "14px", lineHeight: 2 }}>
              {n.methode.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        </div>

        <div style={{ maxWidth: "1000px", margin: "28px auto 0" }}>
          <a href={`/services/${n.service.slug}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", backgroundColor: "#0a2e1a", borderRadius: "10px", padding: "20px 24px", textDecoration: "none", flexWrap: "wrap" }}>
            <span style={{ color: "#fff", fontSize: "15px", fontWeight: 600 }}>Service associé : <strong style={{ color: "#d4a920" }}>{n.service.label}</strong></span>
            <span style={{ color: "#d4a920", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>Voir le service →</span>
          </a>
        </div>

        {n.articles.length > 0 && (
          <div style={{ maxWidth: "1000px", margin: "36px auto 0" }}>
            <h2 style={h2}>À lire sur le blog</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {n.articles.map((a) => (
                <a key={a} href={`/blog/${a}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", ...card, textDecoration: "none" }}>
                  <span style={{ color: "#0a2e1a", fontSize: "14px", fontWeight: 500 }}>{titreArticle(a)}</span>
                  <span style={{ color: "#d4a920", fontSize: "18px" }}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: "48px 40px", backgroundColor: "#0a2e1a", textAlign: "center" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>Un problème de {n.nom.toLowerCase()} ?</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", marginBottom: "24px" }}>Diagnostic gratuit, techniciens agréés par l'État béninois (APA/26-025/CNGP-BEN). Intervention rapide à Cotonou et dans tout le Bénin.</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }} className="cta-btns">
            <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: 700, fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none" }}>Demander un devis</a>
            <a href={WA} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#25D366", color: "#fff", fontWeight: 700, fontSize: "14px", padding: "14px 24px", borderRadius: "6px", textDecoration: "none" }}>Écrire sur WhatsApp</a>
          </div>
        </div>
      </section>
    </main>
  )
}
