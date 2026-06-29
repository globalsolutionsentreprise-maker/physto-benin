import '../styles/premium-gse.css'
import type { Metadata } from "next"
import "./globals.css"
import Footer from "./components/Footer"
import ScrollReveal from "./components/ScrollReveal"

export const metadata: Metadata = {
  title: "Phyto Bénin - Désinsectisation Cotonou | 24h/24",
  description: "Désinsectisation, dératisation, désinfection au Bénin. Techniciens certifiés, produits homologués. Intervention rapide 24h/24 à Cotonou.",
  keywords: "désinsectisation Cotonou, dératisation Bénin, désinfection hôtel, cafards Cotonou, termites Bénin, hygiène sanitaire Bénin, punaises de lit Cotonou",
  metadataBase: new URL("https://www.phyto-benin.com"),
  alternates: {
    canonical: "https://www.phyto-benin.com",
  },
  openGraph: {
    title: "Phyto Bénin — Hygiène Sanitaire Professionnelle au Bénin",
    description: "Désinsectisation, dératisation, désinfection au Bénin. Techniciens agréés par l'État. Intervention rapide 24h/24 à Cotonou.",
    url: "https://www.phyto-benin.com",
    siteName: "Phyto Bénin by GSE",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://www.phyto-benin.com/images/hero-bg.jpg",
        width: 1200,
        height: 630,
        alt: "Phyto Bénin — Désinsectisation et dératisation professionnelle au Bénin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Phyto Bénin — Hygiène Sanitaire 24h/24",
    description: "Désinsectisation, dératisation, désinfection au Bénin. Intervention rapide à Cotonou.",
    images: ["https://www.phyto-benin.com/images/hero-bg.jpg"],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/logo-gse.jpeg" type="image/jpeg" />
        <meta name="theme-color" content="#0a2e1a" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Schema.org LocalBusiness */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Phyto Bénin by GSE — Global Solutions Entreprise",
          "description": "Spécialiste en hygiène sanitaire et phytosanitaire au Bénin. Désinsectisation, dératisation, désinfection, anti-termites. Agréé par l'État béninois.",
          "url": "https://www.phyto-benin.com",
          "logo": "https://www.phyto-benin.com/logo-gse.jpeg",
          "image": "https://www.phyto-benin.com/images/hero-bg.jpg",
          "telephone": "+22901530 47950",
          "email": "contact@phyto-benin.com",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Cotonou",
            "addressRegion": "Littoral",
            "addressCountry": "BJ"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "6.3654",
            "longitude": "2.4183"
          },
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
            "opens": "00:00",
            "closes": "23:59"
          },
          "areaServed": [
            { "@type": "City", "name": "Cotonou" },
            { "@type": "City", "name": "Abomey-Calavi" },
            { "@type": "City", "name": "Porto-Novo" },
            { "@type": "City", "name": "Ouidah" },
            { "@type": "Country", "name": "Bénin" }
          ],
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Services d'hygiène sanitaire",
            "itemListElement": [
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Désinsectisation", "description": "Élimination complète des insectes nuisibles : cafards, fourmis, moustiques, mouches." } },
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Dératisation", "description": "Intervention sécurisée contre les rongeurs : rats, souris." } },
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Désinfection", "description": "Assainissement complet des locaux avec produits virucides et bactéricides certifiés." } },
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Anti-termites", "description": "Protection durable des structures contre les termites." } },
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Reptiles et Serpents", "description": "Sécurisation contre les reptiles, geckos et serpents." } },
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Punaises de lit", "description": "Élimination garantie des punaises de lit par traitement thermique et chimique." } }
            ]
          },
          "sameAs": [
            "https://wa.me/2290153047950"
          ]
        })}} />

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

          @keyframes logoEntree {
            0%   { opacity: 0; transform: scale(0.7) rotate(-8deg); }
            60%  { opacity: 1; transform: scale(1.08) rotate(3deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
          }
          @keyframes logoBrille {
            0%, 100% { box-shadow: 0 0 0 0 rgba(212,169,32,0), 0 2px 8px rgba(10,46,26,0.15); }
            50%       { box-shadow: 0 0 0 5px rgba(212,169,32,0.18), 0 2px 8px rgba(10,46,26,0.15); }
          }
          .logo-anime {
            animation: logoEntree 0.7s cubic-bezier(0.34,1.56,0.64,1) both,
                       logoBrille 3.5s ease-in-out 0.7s infinite;
            transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease;
            cursor: pointer;
          }
          .logo-anime:hover {
            transform: scale(1.15) rotate(6deg);
            box-shadow: 0 0 0 6px rgba(212,169,32,0.3), 0 6px 20px rgba(10,46,26,0.25) !important;
          }

          @keyframes texteEntree {
            0%   { opacity: 0; transform: translateX(-12px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes byShimmer {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.5; }
          }
          .nav-brand-text {
            animation: texteEntree 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both;
          }
          .nav-brand-by {
            animation: byShimmer 2.5s ease-in-out 0.8s infinite;
            display: inline-block;
          }
          .nav-agrement-mobile { display: none; }

          @media (max-width: 768px) {
            .nav-desktop { display: none !important; }
            .nav-mobile-btn { display: flex !important; }
            .nav-agrement-mobile { display: block !important; }
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
              <img src="/logo-gse.jpeg" alt="Logo Global Solutions Entreprise" className="logo-anime" style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "8px" }} />
              <div className="nav-brand-text">
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0a2e1a" }}>Phyto Bénin <span className="nav-brand-by" style={{ color: "#d4a920" }}>by</span> GSE</div>
                <div style={{ fontSize: "10px", color: "#888" }}>Global Solutions Entreprise</div>
                <div className="nav-agrement-mobile" style={{ fontSize: "9px", color: "#d4a920", fontWeight: "700", marginTop: "1px" }}>✓ APA/26-025/CNGP-BEN</div>
              </div>
            </a>

            <div className="nav-desktop" style={{ alignItems: "center", gap: "28px" }}>
              {[
                { label: "Accueil", href: "/" },
                { label: "Services", href: "/services" },
                { label: "Qui sommes-nous", href: "/qui-sommes-nous" },
                { label: "Blog", href: "/blog" },
                { label: "Contact", href: "/contact" },
              ].map((l) => (
                <a key={l.href} href={l.href} style={{ fontSize: "12px", color: "#444", textDecoration: "none", fontWeight: "500" }}>
                  {l.label}
                </a>
              ))}
            </div>

            <div className="nav-desktop" style={{ alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", backgroundColor: "#f0fdf4", border: "1px solid rgba(10,46,26,0.18)", padding: "6px 12px", borderRadius: "5px", marginRight: "4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "10px", fontWeight: "900", flexShrink: 0 }}>✓</span>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "#0a2e1a", letterSpacing: "0.07em", lineHeight: 1.1, whiteSpace: "nowrap" }}>AGRÉÉ PAR L'ÉTAT BÉNINOIS</div>
                  <div style={{ fontSize: "8.5px", color: "#1a6b38", letterSpacing: "0.05em", marginTop: "1px" }}>Autorités sanitaires du Bénin</div>
                  <div style={{ fontSize: "8.5px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.04em", marginTop: "1px" }}>APA/26-025/CNGP-BEN</div>
                </div>
              </div>
              <a href="/espace-client" style={{ fontSize: "11px", fontWeight: "700", color: "#0a2e1a", textDecoration: "none", border: "0.5px solid #d4a920", padding: "7px 14px", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Espace client</a>
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

        {/* OFFRE DE BIENVENUE */}
        <div style={{ backgroundColor: "#1a6b38", padding: "9px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "10px", fontWeight: "800", padding: "3px 9px", borderRadius: "20px", letterSpacing: "0.06em", flexShrink: 0 }}>−10%</span>
            <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "400" }}>
              Offre de bienvenue — <strong>10% de remise</strong> sur votre premier traitement · Pour toute première demande
            </span>
          </div>
          <a href="/contact" style={{ color: "#d4a920", fontSize: "11px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap", letterSpacing: "0.04em", flexShrink: 0 }}>
            En profiter →
          </a>
        </div>

        <ScrollReveal />

        {children}

        <Footer />
      </body>
    </html>
  )
}
