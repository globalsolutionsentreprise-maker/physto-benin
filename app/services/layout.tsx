import type { Metadata } from "next"

// La page /services est "use client" → ses métadonnées SEO (dont le canonical)
// sont définies ici, au niveau du layout serveur. Sans ça elle héritait du
// canonical de l'accueil (risque de désindexation).
export const metadata: Metadata = {
  title: "Nos services, désinsectisation, dératisation, désinfection | Phyto Bénin",
  description:
    "Services d'hygiène sanitaire au Bénin : désinsectisation, dératisation, désinfection, fumigation. Techniciens agréés par l'État, produits homologués. Intervention 24h/24 à Cotonou et dans tout le Bénin.",
  alternates: { canonical: "https://www.phyto-benin.com/services" },
  openGraph: {
    title: "Nos services, Phyto Bénin by GSE",
    description:
      "Désinsectisation, dératisation, désinfection et fumigation au Bénin. Techniciens agréés, produits homologués OMS.",
    url: "https://www.phyto-benin.com/services",
    siteName: "Phyto Bénin by GSE",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "https://www.phyto-benin.com/opengraph-image", width: 1200, height: 630 }],
  },
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
