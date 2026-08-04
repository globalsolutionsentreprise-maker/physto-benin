import type { Metadata } from "next"

const VILLES = [
  { slug: "abomey-calavi", nom: "Abomey-Calavi", region: "Atlantique", accroche: "Termites, serpents, moustiques, punaises" },
  { slug: "porto-novo", nom: "Porto-Novo", region: "Ouémé", accroche: "Termites, cafards, rats, désinfection" },
  { slug: "ouidah", nom: "Ouidah", region: "Atlantique", accroche: "Punaises de lit, moustiques, désinfection" },
]

export const metadata: Metadata = {
  title: "Zones d'intervention au Bénin, Cotonou, Calavi, Porto-Novo, Ouidah | Phyto Bénin",
  description: "Phyto Bénin intervient à Cotonou, Abomey-Calavi, Porto-Novo, Ouidah et dans tout le Bénin : désinsectisation, dératisation, désinfection. Techniciens agréés, 24h/24.",
  keywords: "désinsectisation Bénin, dératisation Cotonou, anti-nuisibles Abomey-Calavi, désinfection Porto-Novo, punaises de lit Ouidah",
  alternates: { canonical: "https://www.phyto-benin.com/zones" },
  openGraph: {
    title: "Zones d'intervention, Phyto Bénin",
    description: "Cotonou, Abomey-Calavi, Porto-Novo, Ouidah et tout le Bénin. Désinsectisation, dératisation, désinfection, 24h/24.",
    url: "https://www.phyto-benin.com/zones",
    siteName: "Phyto Bénin by GSE",
    locale: "fr_FR",
    type: "website",
  },
}

export default function ZonesIndex() {
  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ backgroundColor: "#f7f7f5", padding: "12px 60px", borderBottom: "1px solid #eee" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", fontSize: "12px", color: "#888", display: "flex", gap: "8px", alignItems: "center" }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>Accueil</a>
          <span>›</span>
          <span style={{ color: "#0a2e1a", fontWeight: "600" }}>Zones d'intervention</span>
        </div>
      </div>

      <section style={{ backgroundColor: "#0a2e1a", padding: "72px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOS ZONES D'INTERVENTION</div>
          <h1 style={{ fontSize: "clamp(30px, 4vw, 52px)", fontWeight: "700", color: "#fff", lineHeight: "1.1", letterSpacing: "-0.02em", marginBottom: "20px", maxWidth: "720px" }}>
            Présents à Cotonou et dans tout le Bénin
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.65)", lineHeight: "1.85", maxWidth: "620px" }}>
            Nos techniciens agréés interviennent à Cotonou et dans les principales villes du pays pour la désinsectisation, la dératisation et la désinfection, 24h/24.
          </p>
        </div>
      </section>

      <section style={{ backgroundColor: "#f7f7f5", padding: "64px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {VILLES.map((v) => (
            <a key={v.slug} href={`/zones/${v.slug}`} style={{ display: "block", backgroundColor: "#fff", padding: "32px", textDecoration: "none", borderTop: "3px solid #d4a920" }}>
              <div style={{ fontSize: "10px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "12px" }}>{v.region.toUpperCase()}</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0a2e1a", marginBottom: "8px" }}>{v.nom}</div>
              <div style={{ fontSize: "13px", color: "#777", lineHeight: "1.6", marginBottom: "18px" }}>{v.accroche}</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#0a2e1a" }}>Voir l'intervention à {v.nom} →</div>
            </a>
          ))}
        </div>
        <div style={{ maxWidth: "1200px", margin: "24px auto 0", textAlign: "center" }}>
          <a href="/contact" style={{ display: "inline-block", backgroundColor: "#0a2e1a", color: "#fff", fontWeight: "700", fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none" }}>
            Votre ville n'est pas listée ? Contactez-nous →
          </a>
        </div>
      </section>
    </main>
  )
}
