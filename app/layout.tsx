import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PHYSTO Benin - Desinsectisation Cotonou | 24h/24",
  description: "Desinsectisation, deratisation, desinfection au Benin. Techniciens certifies, produits homologues. Intervention rapide 24h/24 a Cotonou.",
  keywords: "desinsectisation Cotonou, deratisation Benin, desinfection hotel, cafards Cotonou, rats Benin, termites Benin, hygiene sanitaire Benin, nuisibles Cotonou, PHYSTO Benin",
  authors: [{ name: "Global Solutions Entreprise" }],
  creator: "Global Solutions Entreprise",
  metadataBase: new URL("https://physto-benin.bj"),
  openGraph: {
    title: "PHYSTO Benin - Hygiene Sanitaire Professionnelle",
    description: "Desinsectisation, deratisation, desinfection au Benin. Intervention rapide 24h/24.",
    url: "https://physto-benin.bj",
    siteName: "PHYSTO Benin",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/logo-gse.jpeg",
        width: 500,
        height: 500,
        alt: "PHYSTO Benin - Global Solutions Entreprise",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "PHYSTO Benin - Desinsectisation Cotonou",
    description: "Desinsectisation, deratisation, desinfection au Benin. Intervention rapide 24h/24.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/logo-gse.jpeg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo-gse.jpeg" />
        <meta name="theme-color" content="#0a2e1a" />
        <meta name="geo.region" content="BJ" />
        <meta name="geo.placename" content="Cotonou, Benin" />
        <meta name="language" content="French" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>

        <nav style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 40px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #f0f0f0",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
            <img src="/logo-gse.jpeg" alt="Logo Global Solutions Entreprise" style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "8px" }} />
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0a2e1a", letterSpacing: "0.02em" }}>PHYSTO Benin</div>
              <div style={{ fontSize: "10px", color: "#888" }}>Global Solutions Entreprise</div>
            </div>
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            {[
              { label: "Accueil", href: "/" },
              { label: "Services", href: "/services" },
              { label: "Qui sommes-nous", href: "/qui-sommes-nous" },
              { label: "Blog", href: "/blog" },
              { label: "Zones et Contact", href: "/contact" },
            ].map((l) => (
              <a key={l.href} href={l.href} style={{ fontSize: "12px", color: "#444", textDecoration: "none", fontWeight: "500" }}>
                {l.label}
              </a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a
              href="https://wa.me/2290153047950"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contacter PHYSTO Benin sur WhatsApp"
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                backgroundColor: "#25d366", color: "#ffffff",
                fontSize: "12px", fontWeight: "600",
                padding: "9px 16px", borderRadius: "20px",
                textDecoration: "none",
                boxShadow: "0 0 0 3px rgba(37,211,102,0.2)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <a
              href="tel:+2290153047950"
              aria-label="Appeler PHYSTO Benin"
              style={{
                backgroundColor: "#0a2e1a", color: "#d4a920",
                fontSize: "12px", fontWeight: "600",
                padding: "9px 16px", borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Appel
            </a>
          </div>
        </nav>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "#991b1b", padding: "8px 40px", flexWrap: "wrap", gap: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#fca5a5", flexShrink: 0 }} />
            <span style={{ color: "#fff", fontSize: "11px", fontWeight: "600" }}>Urgence 24h/24 — 7j/7</span>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {["Cafards", "Rats", "Geckos", "Termites", "Moustiques", "Serpents", "+ Tous traitements"].map((t) => (
                <span key={t} style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "9px", padding: "2px 8px", borderRadius: "10px" }}>{t}</span>
              ))}
            </div>
          </div>
          <a href="tel:+2290153047950" style={{ backgroundColor: "#fff", color: "#991b1b", fontSize: "10px", fontWeight: "700", padding: "5px 14px", borderRadius: "5px", textDecoration: "none" }}>
            Appeler maintenant
          </a>
        </div>

        {children}

        <footer style={{ backgroundColor: "#f9f9f9", padding: "56px 40px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "40px", marginBottom: "40px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <img src="/logo-gse.jpeg" alt="Logo PHYSTO Benin" style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "8px" }} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a" }}>PHYSTO Benin</div>
                  <div style={{ fontSize: "10px", color: "#888" }}>Global Solutions Entreprise</div>
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "#888", lineHeight: "1.8" }}>
                Specialiste hygiene sanitaire et phytosanitaire au Benin.
                Intervention rapide, produits certifies, resultats probants.
              </p>
            </div>
            {[
              { titre: "Nos services", liens: [
                { label: "Desinsectisation", href: "/services" },
                { label: "Deratisation", href: "/services" },
                { label: "Desinfection", href: "/services" },
                { label: "Anti-termites", href: "/services" },
                { label: "Reptiles et Serpents", href: "/services" },
              ]},
              { titre: "Entreprise", liens: [
                { label: "Qui sommes-nous", href: "/qui-sommes-nous" },
                { label: "Blog et Conseils", href: "/blog" },
                { label: "Contact", href: "/contact" },
              ]},
              { titre: "Zones et Contact", liens: [
                { label: "Cotonou, Benin", href: "/contact" },
                { label: "+229 01 53 04 79 50", href: "tel:+2290153047950" },
                { label: "WhatsApp", href: "https://wa.me/2290153047950" },
                { label: "contact@physto-benin.com", href: "mailto:contact@physto-benin.com" },
              ]},
            ].map((col) => (
              <div key={col.titre}>
                <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>{col.titre}</h4>
                {col.liens.map((l) => (
                  <a key={l.label} href={l.href} style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{l.label}</a>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #eee", paddingTop: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <p style={{ fontSize: "11px", color: "#aaa" }}>2025 PHYSTO Benin — Global Solutions Entreprise — Tous droits reserves</p>
            <div style={{ display: "flex", gap: "8px" }}>
              {["Produits certifies", "Agrees par l Etat", "Resultats probants", "24h/24"].map((c) => (
                <span key={c} style={{ fontSize: "10px", backgroundColor: "#fff", border: "1px solid #eee", padding: "3px 10px", borderRadius: "4px", color: "#aaa" }}>{c}</span>
              ))}
            </div>
          </div>
        </footer>

      </body>
    </html>
  )
}
