import '../styles/premium-gse.css'
import type { Metadata } from "next"
import "./globals.css"
import Footer from "./components/Footer"
import ScrollReveal from "./components/ScrollReveal"
import WhatsAppFloat from "./components/WhatsAppFloat"
import SiteHeader from "./components/SiteHeader"

export const metadata: Metadata = {
  title: "Phyto Bénin - Désinsectisation Cotonou | 24h/24",
  description: "Désinsectisation, dératisation, désinfection au Bénin. Techniciens certifiés, produits homologués. Intervention rapide 24h/24 à Cotonou.",
  keywords: "désinsectisation Cotonou, dératisation Bénin, désinfection hôtel, cafards Cotonou, termites Bénin, hygiène sanitaire Bénin, punaises de lit Cotonou",
  metadataBase: new URL("https://www.phyto-benin.com"),
  alternates: {
    canonical: "https://www.phyto-benin.com",
    types: {
      "application/rss+xml": "https://www.phyto-benin.com/feed.xml",
    },
  },
  openGraph: {
    title: "Phyto Bénin, Hygiène Sanitaire Professionnelle au Bénin",
    description: "Désinsectisation, dératisation, désinfection au Bénin. Techniciens agréés par l'État. Intervention rapide 24h/24 à Cotonou.",
    url: "https://www.phyto-benin.com",
    siteName: "Phyto Bénin by GSE",
    locale: "fr_FR",
    type: "website",
    // og:image fourni automatiquement par app/opengraph-image.tsx (carte de marque 1200×630)
  },
  twitter: {
    card: "summary_large_image",
    title: "Phyto Bénin, Hygiène Sanitaire 24h/24",
    description: "Désinsectisation, dératisation, désinfection au Bénin. Intervention rapide à Cotonou.",
    // twitter:image hérité de la carte OpenGraph générée
  },
  verification: {
    google: "oh7n9Xm6TseGTYnAz43xklTeoI1jtWFSZIgYquEo0uY",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/logo-gse.png" type="image/png" />
        <meta name="theme-color" content="#0a2e1a" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Police display du hero (accueil) : Bricolage Grotesque, chargée une fois */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap" />

        {/* Schema.org LocalBusiness */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": "https://www.phyto-benin.com/#business",
          "name": "Phyto Bénin by GSE",
          "legalName": "Global Solutions Entreprise (GSE)",
          "alternateName": ["Phyto Bénin", "GSE Global Solutions Entreprise"],
          "description": "Spécialiste en hygiène sanitaire et phytosanitaire au Bénin. Désinsectisation, dératisation, désinfection, anti-termites. Agréé par l'État béninois.",
          "url": "https://www.phyto-benin.com",
          "logo": "https://www.phyto-benin.com/logo-gse.png",
          "image": "https://www.phyto-benin.com/images/hero-bg.jpg",
          "telephone": "+2290153047950",
          "email": "direction@phyto-benin.com",
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
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Punaises de lit", "description": "Traitement des punaises de lit par méthode thermique et chimique." } }
            ]
          },
          "sameAs": ["https://www.facebook.com/MadeinBeninbyUs", "https://www.linkedin.com/company/105831348/"]
        })}} />

        {/* Schema.org WebSite (entité site, pour désambiguïsation par les IA) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": "https://www.phyto-benin.com/#website",
          "name": "Phyto Bénin by GSE",
          "alternateName": "Phyto Bénin",
          "url": "https://www.phyto-benin.com",
          "inLanguage": "fr-FR",
          "publisher": { "@id": "https://www.phyto-benin.com/#business" }
        })}} />

        {/* Google Analytics GA4, G-9XPCMJE1PJ */}
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

          /* Transform composé via custom properties : chaque source (entrée, flottement
             ambiant, survol) possède ses propres variables, donc aucune ne surcharge
             l'autre dans la cascade. @property les rend interpolables. */
          @property --logo-ent-sc { syntax: "<number>"; inherits: false; initial-value: 1; }
          @property --logo-ent-rot { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
          @property --logo-ty { syntax: "<length>"; inherits: false; initial-value: 0px; }
          @property --logo-breathe { syntax: "<number>"; inherits: false; initial-value: 1; }
          @property --logo-hov-sc { syntax: "<number>"; inherits: false; initial-value: 1; }
          @property --logo-hov-rot { syntax: "<angle>"; inherits: false; initial-value: 0deg; }

          @keyframes logoEntree {
            0%   { opacity: 0; --logo-ent-sc: 0.7;  --logo-ent-rot: -8deg; }
            60%  { opacity: 1; --logo-ent-sc: 1.08; --logo-ent-rot: 3deg; }
            100% { opacity: 1; --logo-ent-sc: 1;    --logo-ent-rot: 0deg; }
          }
          /* Vie au repos : flottement vertical quasi imperceptible + légère respiration. */
          @keyframes logoFloat {
            0%, 100% { --logo-ty: 0px;    --logo-breathe: 1; }
            50%      { --logo-ty: -4px;   --logo-breathe: 1.015; }
          }
          .logo-anime {
            animation: logoEntree 0.7s cubic-bezier(0.34,1.56,0.64,1) both,
                       logoFloat 7s ease-in-out 0.7s infinite;
            transform:
              translateY(var(--logo-ty))
              rotate(calc(var(--logo-ent-rot) + var(--logo-hov-rot)))
              scale(calc(var(--logo-ent-sc) * var(--logo-breathe) * var(--logo-hov-sc)));
            will-change: transform;
            cursor: pointer;
          }
          /* Survol seulement sur vrai pointeur (évite les faux hover au tap). */
          @media (hover: hover) and (pointer: fine) {
            .logo-anime {
              transition: --logo-hov-sc 0.35s cubic-bezier(0.34,1.56,0.64,1),
                          --logo-hov-rot 0.35s cubic-bezier(0.34,1.56,0.64,1);
            }
            .logo-anime:hover { --logo-hov-sc: 1.12; --logo-hov-rot: 5deg; }
          }
          /* Accessibilité : on coupe tout mouvement, on garde juste l'apparition. */
          @keyframes logoFade { from { opacity: 0; } to { opacity: 1; } }
          @media (prefers-reduced-motion: reduce) {
            .logo-anime {
              animation: logoFade 0.4s ease both;
              transform: none;
              transition: none;
            }
            .logo-anime:hover { --logo-hov-sc: 1; --logo-hov-rot: 0deg; }
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

        <SiteHeader />

        <ScrollReveal />

        {children}

        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  )
}
