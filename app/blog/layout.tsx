import type { Metadata } from "next"

// Métadonnées de la page liste /blog. Chaque article (/blog/[slug]) définit
// ensuite ses propres métadonnées via generateMetadata, qui priment sur celles-ci.
export const metadata: Metadata = {
  title: "Blog Nuisibles & Hygiène au Bénin — Conseils d'experts | Phyto Bénin",
  description:
    "Conseils pratiques pour lutter contre cafards, rats, termites, moustiques et punaises de lit au Bénin. Guides d'experts en hygiène sanitaire par Phyto Bénin.",
  alternates: { canonical: "https://www.phyto-benin.com/blog" },
  openGraph: {
    title: "Blog Nuisibles & Hygiène au Bénin — Phyto Bénin",
    description:
      "Conseils d'experts pour lutter contre les nuisibles au Bénin : désinsectisation, dératisation, anti-termites et plus.",
    url: "https://www.phyto-benin.com/blog",
    siteName: "Phyto Bénin by GSE",
    locale: "fr_FR",
    type: "website",
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
