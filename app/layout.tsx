import '../styles/premium-gse.css'
import type { Metadata } from "next"
import "./globals.css"
import Footer from "./components/Footer"

export const metadata: Metadata = {
  title: "PHYSTO Benin - Desinsectisation Cotonou | 24h/24",
  description: "Desinsectisation, deratisation, desinfection au Benin. Techniciens certifies, produits homologues. Intervention rapide 24h/24 a Cotonou.",
  keywords: "desinsectisation Cotonou, deratisation Benin, desinfection hotel, cafards Cotonou, termites Benin",
  metadataBase: new URL("https://physto-benin.vercel.app"),
  openGraph: {
    title: "PHYSTO Benin - Hygiene Sanitaire Professionnelle",
    description: "Desinsectisation, deratisation, desinfection au Benin. Intervention rapide 24h/24.",
    url: "https://physto-benin.vercel.app",
    siteName: "PHYSTO Benin",
    locale: "fr_FR",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/logo-gse.jpeg" type="image/jpeg" />
        <meta name="theme-color" content="#0a2e1a" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Google Analytics GA4 — G-9XPCMJE1PJ */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-9XPCMJE1PJ" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-9XPCMJE1PJ');
        `}} />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>

        <style>{`
          * { box-sizing: border-box; }
          .nav-desktop { display: flex; }
          .nav-mobile-btn { display: none; }
          .nav-links-mobile { display: none; }

          @media (max-width: 768px) {
            .nav-desktop { display: none !important; }
            .nav-mobile-btn { display: flex !important; }
            .urgband-tags { display: none !important; }
            .hero-padding { padding: 40px 20px 60px !important; }
            .hero-h1 { font-size: 32px !important; }
            .hero-p { font-size: 14px !important; }
            .hero-btns { flex-direction: column !important; }
            .hero-btns a { text-align: center; }
            .hero-stats { flex-wrap: wrap; }
            .hero-stats > div { min-width: 50%; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.08); }
            .grid-2 { grid-template-columns: 1fr !important; }
            .grid-3 { grid-template-columns: 1fr !important; }
            .grid-4 { grid-template-columns: 1fr 1fr !important; }
            .section-padding { padding: 60px 20px !important; }
            .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
            .footer-padding { padding: 48px 20px 24px !important; }
            .cta-btns { justify-content: center !important; }
            .badge-float { display: none !important; }
            .nav-padding { padding: 10px 20px !important; }
            .urgband-padding { padding: 8px 16px !important; }
          }

          @media (max-width: 480px) {
            .grid-4 { grid-template-columns: 1fr !important; }
            .hero-h1 { font-size: 26px !important; }
          }
        `}</style>

        {/* NAVBAR */}
        <nav style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 50 }}>
          <div className="nav-padding" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 40px" }}>
            <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", flexShrink: 0 }}>
              <img src="/logo-gse.jpeg" alt="Logo Global Solutions Entreprise" style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "8px" }} />
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0a2e1a" }}>PHYSTO <span style={{ color: "#d4a920" }}>by</span> GSE</div>
                <div style={{ fontSize: "10px", color: "#888" }}>Global Solutions Entreprise</div>
              </div>
            </a>

            <div className="nav-desktop" style={{ alignItems: "center", gap: "28px" }}>
              {[
                { label: "Accueil", href: "/" },
                { label: "Services", href: "/services" },
                { label: "Qui sommes-nous", href: "/qui-sommes-nous" },
                { label: "Blog", href: "/blog" },
                { label: "Contact", href: "/contact" },
                { label: "Espace client", href: "/espace-client" },
              ].map((l) => (
                <a key={l.href} href={l.href} style={{
                  fontSize: "12px",
                  color: l.href === "/espace-client" ? "#0a2e1a" : "#444",
                  textDecoration: "none",
                  fontWeight: l.href === "/espace-client" ? "700" : "500",
                  border: l.href === "/espace-client" ? "0.5px solid #d4a920" : "none",
                  padding: l.href === "/espace-client" ? "6px 14px" : "0",
                  letterSpacing: l.href === "/espace-client" ? "0.04em" : "normal",
                }}>
                  {l.label}
                </a>
              ))}
            </div>

            <div className="nav-desktop" style={{ alignItems: "center", gap: "8px" }}>
              <a href="https://wa.me/2290153047950" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#25d366", color: "#fff", fontSize: "12px", fontWeight: "600", padding: "9px 14px", borderRadius: "20px", textDecoration: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
              <a href="tel:+2290153047950" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "12px", fontWeight: "600", padding: "9px 14px", borderRadius: "8px", textDecoration: "none" }}>
                Appel
              </a>
            </div>

            <div className="nav-mobile-btn" style={{ display: "none", alignItems: "center", gap: "8px" }}>
              <a href="https://wa.me/2290153047950" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#25d366", color: "#fff", fontSize: "11px", fontWeight: "600", padding: "8px 12px", borderRadius: "20px", textDecoration: "none" }}>
                WhatsApp
              </a>
              <a href="tel:+2290153047950" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "11px", fontWeight: "600", padding: "8px 12px", borderRadius: "8px", textDecoration: "none" }}>
                Appel
              </a>
            </div>
          </div>
        </nav>

        {/* BANDEAU URGENCE */}
        <div className="urgband-padding" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#991b1b", padding: "8px 40px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#fca5a5", flexShrink: 0 }} />
            <span style={{ color: "#fff", fontSize: "11px", fontWeight: "600" }}>Urgence 24h/24 — 7j/7</span>
            <div className="urgband-tags" style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {["Cafards", "Rats", "Geckos", "Termites", "Moustiques", "Serpents", "+ Tous"].map((t) => (
                <span key={t} style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "9px", padding: "2px 7px", borderRadius: "10px" }}>{t}</span>
              ))}
            </div>
          </div>
          <a href="tel:+2290153047950" style={{ backgroundColor: "#fff", color: "#991b1b", fontSize: "10px", fontWeight: "700", padding: "5px 12px", borderRadius: "5px", textDecoration: "none", whiteSpace: "nowrap" }}>
            Appeler maintenant
          </a>
        </div>

        {children}

        <Footer />
      </body>
    </html>
  )
}
