import type { Metadata } from "next"

// Métadonnées de la page /qui-sommes-nous (le composant page est "use client",
// donc les métadonnées SEO sont définies ici, au niveau du layout serveur).
export const metadata: Metadata = {
  title: "Qui sommes-nous, Phyto Bénin by GSE | Hygiène sanitaire au Bénin",
  description:
    "Phyto Bénin (Global Solutions Entreprise) : spécialiste de l'hygiène sanitaire au Bénin, agréé par l'État. Techniciens certifiés, produits homologués OMS, plus de 10 ans d'expérience à Cotonou.",
  alternates: { canonical: "https://www.phyto-benin.com/qui-sommes-nous" },
  openGraph: {
    title: "Qui sommes-nous, Phyto Bénin by GSE",
    description:
      "Spécialiste de l'hygiène sanitaire au Bénin, agréé par l'État. Techniciens certifiés et produits homologués OMS depuis plus de 10 ans.",
    url: "https://www.phyto-benin.com/qui-sommes-nous",
    siteName: "Phyto Bénin by GSE",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "https://www.phyto-benin.com/opengraph-image", width: 1200, height: 630 }],
  },
}

export default function QuiSommesNousLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
