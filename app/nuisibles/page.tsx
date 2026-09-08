import type { Metadata } from "next"
import { NUISIBLES, NUISIBLE_SLUGS } from "./data"

const BASE = "https://www.phyto-benin.com"

export const metadata: Metadata = {
  title: "Nuisibles au Bénin, Cafards, Rats, Termites, Moustiques | Phyto Bénin",
  description: "Tous les nuisibles traités par Phyto Bénin à Cotonou et au Bénin : cafards, rats, termites, moustiques, punaises de lit, serpents, fourmis, mouches. Devis gratuit.",
  keywords: "nuisibles Bénin, anti-nuisibles Cotonou, cafards, rats, termites, moustiques, punaises de lit, serpents Bénin",
  alternates: { canonical: `${BASE}/nuisibles` },
  openGraph: {
    title: "Nuisibles traités au Bénin | Phyto Bénin by GSE",
    description: "Cafards, rats, termites, moustiques, punaises de lit, serpents et plus. Traitement professionnel à Cotonou et au Bénin.",
    url: `${BASE}/nuisibles`, siteName: "Phyto Bénin by GSE", locale: "fr_FR", type: "website",
    images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: "Nuisibles au Bénin" }],
  },
}

export default function NuisiblesIndex() {
  const schemaBreadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Nuisibles", "item": `${BASE}/nuisibles` },
    ],
  }
  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }} />

      <div style={{ backgroundColor: "#f7f7f5", padding: "12px 40px", borderBottom: "1px solid #eee" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", fontSize: "12px", color: "#888", display: "flex", gap: "8px" }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>Accueil</a><span>›</span>
          <span style={{ color: "#0a2e1a", fontWeight: 600 }}>Nuisibles</span>
        </div>
      </div>

      <section style={{ backgroundColor: "#0a2e1a", padding: "60px 40px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: 700, letterSpacing: "0.12em", marginBottom: "12px" }}>NOS CIBLES · BÉNIN</div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 700, color: "#fff", lineHeight: 1.15, marginBottom: "18px", maxWidth: "720px" }}>Les nuisibles que nous traitons au Bénin</h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.65)", lineHeight: 1.85, maxWidth: "620px" }}>Cafards, rats, termites, moustiques, punaises de lit, serpents et bien d'autres. Choisissez votre nuisible pour comprendre les signes, notre méthode et demander un devis gratuit.</p>
        </div>
      </section>

      <section style={{ padding: "56px 40px", backgroundColor: "#faf9f6" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }} className="grid-3">
          {NUISIBLE_SLUGS.map((slug) => {
            const n = NUISIBLES[slug]
            return (
              <a key={slug} href={`/nuisibles/${slug}`} style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "20px", textDecoration: "none", display: "block" }}>
                <div style={{ fontSize: "30px", marginBottom: "10px" }}>{n.emoji}</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#0a2e1a", marginBottom: "6px" }}>{n.nom}</div>
                <div style={{ fontSize: "12px", color: "#888", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.intro}</div>
                <div style={{ marginTop: "12px", fontSize: "12px", color: "#d4a920", fontWeight: 700 }}>Voir le traitement →</div>
              </a>
            )
          })}
        </div>
      </section>

      <section style={{ padding: "48px 40px", backgroundColor: "#0a2e1a", textAlign: "center" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>Un nuisible à éliminer ?</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", marginBottom: "24px" }}>Techniciens agréés par l'État béninois. Diagnostic gratuit, intervention rapide 24h/24 à Cotonou et dans tout le Bénin.</p>
          <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: 700, fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none" }}>Demander un devis gratuit</a>
        </div>
      </section>
    </main>
  )
}
