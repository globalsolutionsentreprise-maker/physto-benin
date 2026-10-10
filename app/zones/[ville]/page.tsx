import { notFound } from "next/navigation"
import type { Metadata } from "next"

type Nuisible = { ico: string; label: string; desc: string }
type Ville = {
  nom: string
  region: string
  intro: string
  contexte: string
  nuisibles: Nuisible[]
  quartiers: string[]
  services: { slug: string; label: string }[]
  faqs: { q: string; r: string }[]
  metaTitle: string
  metaDesc: string
  mots: string
}

// Chaque ville a un contenu RÉELLEMENT spécifique (nuisibles locaux, quartiers,
// contexte géographique). Objectif : de vraies pages locales utiles, jamais des
// « doorway pages » quasi identiques que Google pénalise.
const VILLES: Record<string, Ville> = {
  "abomey-calavi": {
    nom: "Abomey-Calavi",
    region: "Atlantique",
    intro: "Phyto Bénin intervient à Abomey-Calavi et dans toute sa périphérie pour la désinsectisation, la dératisation, l'anti-termites et les urgences reptiles. Techniciens agréés par l'État, produits homologués OMS, disponibles 24h/24.",
    contexte: "Abomey-Calavi est une ville en pleine expansion : nouvelles constructions, cité universitaire, proximité du lac Nokoué et des zones marécageuses. Cette croissance rapide et cette humidité créent des conditions idéales pour les termites dans le neuf, les moustiques autour des points d'eau, et les serpents dans les parcelles encore végétalisées. Les logements étudiants concentrent aussi cafards et punaises de lit.",
    nuisibles: [
      { ico: "🐛", label: "Termites", desc: "Fléau n°1 des constructions récentes de Calavi : sols humides et bois de charpente attaqués en silence. Barrière chimique par injection." },
      { ico: "🐍", label: "Serpents & reptiles", desc: "Parcelles végétalisées et proximité du lac : interventions d'urgence 24h/24 et sécurisation périmétrique." },
      { ico: "🦟", label: "Moustiques", desc: "Gîtes larvaires autour du lac Nokoué et des eaux stagnantes. Traitement des extérieurs et brumisation des jardins." },
      { ico: "🛏️", label: "Punaises de lit", desc: "Fréquentes dans les logements étudiants et meublés. Traitement thermique 60°C, le plus efficace." },
      { ico: "🐀", label: "Rats & souris", desc: "Marchés, commerces et zones résidentielles denses. Stations d'appât sécurisées et suivi mensuel." },
    ],
    quartiers: ["Godomey", "Akassato", "Zogbadjè", "Calavi centre", "Togba", "Hèvié", "Kpanroun", "Cité universitaire"],
    services: [
      { slug: "anti-termites-benin", label: "Anti-termites" },
      { slug: "reptiles-serpents-benin", label: "Reptiles & serpents" },
      { slug: "anti-moustiques-cotonou", label: "Anti-moustiques" },
      { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
      { slug: "deratisation-benin", label: "Dératisation" },
      { slug: "punaises-de-lit-cotonou", label: "Punaises de lit" },
    ],
    faqs: [
      { q: "Intervenez-vous rapidement à Godomey et Calavi centre ?", r: "Oui. Abomey-Calavi étant limitrophe de Cotonou, nos équipes y interviennent le jour même dans la majorité des cas, et 24h/24 pour les urgences (serpents notamment)." },
      { q: "Ma maison est neuve à Calavi, dois-je traiter contre les termites ?", r: "Vivement conseillé. Les sols de Calavi sont humides et les termites s'attaquent aux charpentes neuves très tôt. Un traitement préventif par injection protège durablement." },
      { q: "Traitez-vous les logements étudiants et les résidences meublées ?", r: "Oui, c'est une de nos spécialités à Calavi : cafards et punaises de lit dans les meublés et cités étudiantes, avec traitement thermique et suivi." },
    ],
    metaTitle: "Désinsectisation & Anti-termites Abomey-Calavi | Phyto Bénin",
    metaDesc: "Anti-nuisibles à Abomey-Calavi : anti-termites, désinsectisation, dératisation, serpents, moustiques. Techniciens agréés, urgence 24h/24. Devis gratuit.",
    mots: "désinsectisation Abomey-Calavi, anti-termites Calavi, dératisation Abomey-Calavi, serpents Calavi, moustiques Godomey, punaises de lit Calavi",
  },
  "porto-novo": {
    nom: "Porto-Novo",
    region: "Ouémé",
    intro: "Phyto Bénin assure la désinsectisation, la dératisation et la désinfection à Porto-Novo et dans l'Ouémé. Service agréé pour les administrations, commerces, restaurants et particuliers, avec certificat officiel remis.",
    contexte: "Capitale administrative bordée par la lagune, Porto-Novo mêle bâti ancien et forte humidité. Résultat : les termites s'attaquent aux vieilles menuiseries et charpentes, les cafards prolifèrent dans les bâtiments anciens, et les marchés comme Ouando attirent les rongeurs. La proximité de la lagune entretient aussi une pression constante des moustiques.",
    nuisibles: [
      { ico: "🐛", label: "Termites", desc: "Bâti ancien et humidité de la lagune : menuiseries, charpentes et archives administratives menacées. Traitement curatif et préventif." },
      { ico: "🪳", label: "Cafards", desc: "Très présents dans les vieux bâtiments et cuisines. Gel appât professionnel longue durée, sans nuisance pour l'activité." },
      { ico: "🐀", label: "Rats & souris", desc: "Marchés (Ouando), commerces et entrepôts. Sécurisation des points d'entrée et stations d'appât certifiées." },
      { ico: "🦟", label: "Moustiques", desc: "Pression forte liée à la lagune et aux eaux stagnantes. Traitement des gîtes larvaires et des extérieurs." },
      { ico: "🧴", label: "Désinfection", desc: "Restaurants, administrations et établissements de santé : assainissement certifié avec certificat d'hygiène officiel." },
    ],
    quartiers: ["Ouando", "Djassin", "Houinmè", "Tokpota", "Attaké", "Dowa", "Foun-Foun"],
    services: [
      { slug: "anti-termites-benin", label: "Anti-termites" },
      { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
      { slug: "deratisation-benin", label: "Dératisation" },
      { slug: "desinfection-locaux", label: "Désinfection" },
      { slug: "anti-moustiques-cotonou", label: "Anti-moustiques" },
      { slug: "contrat-entretien-hygiene", label: "Contrat d'entretien" },
    ],
    faqs: [
      { q: "Traitez-vous les administrations et bureaux à Porto-Novo ?", r: "Oui, avec des interventions planifiées hors heures d'ouverture et un certificat officiel remis. Nous protégeons aussi les archives contre les termites et les rongeurs." },
      { q: "Mon bâtiment est ancien, est-ce un problème pour le traitement anti-termites ?", r: "Au contraire, c'est là que le traitement est le plus utile. Nous traitons les constructions existantes par injection dans les menuiseries et fondations, sans travaux lourds." },
      { q: "Proposez-vous un certificat d'hygiène pour les restaurants ?", r: "Oui. Après désinfection, nous remettons un certificat d'hygiène officiel (agrément APA/26-025/CNGP-BEN), accepté par les autorités sanitaires." },
    ],
    metaTitle: "Désinsectisation, Dératisation & Désinfection Porto-Novo | Phyto Bénin",
    metaDesc: "Anti-nuisibles à Porto-Novo : désinsectisation, dératisation, désinfection, anti-termites. Certificat d'hygiène officiel, techniciens agréés. Devis gratuit.",
    mots: "désinsectisation Porto-Novo, dératisation Porto-Novo, désinfection Porto-Novo, anti-termites Porto-Novo, certificat hygiène Ouémé, rats marché Ouando",
  },
  "ouidah": {
    nom: "Ouidah",
    region: "Atlantique",
    intro: "Phyto Bénin protège hôtels, restaurants, résidences et sites touristiques de Ouidah : désinsectisation, punaises de lit, anti-moustiques, désinfection et urgences serpents. Techniciens agréés, disponibles 24h/24.",
    contexte: "Ville côtière et haut lieu touristique (musées, Route des Esclaves, Porte du Non-Retour), Ouidah vit au rythme de ses hôtels et de son littoral humide. La chaleur côtière et les eaux stagnantes favorisent les moustiques, les hôtels sont exposés aux punaises de lit, la végétation littorale abrite des serpents, et les structures anciennes en bois sont la cible des termites.",
    nuisibles: [
      { ico: "🦟", label: "Moustiques", desc: "Climat côtier humide et eaux stagnantes : forte pression. Traitement des gîtes larvaires, brumisation des jardins et terrasses d'hôtels." },
      { ico: "🛏️", label: "Punaises de lit", desc: "Enjeu majeur pour les hôtels et meublés touristiques. Traitement thermique 60°C, sans résidu, discret pour la clientèle." },
      { ico: "🐍", label: "Serpents & reptiles", desc: "Végétation littorale et abords sablonneux : sécurisation des sites et intervention d'urgence 24h/24." },
      { ico: "🧴", label: "Désinfection", desc: "Restaurants, hôtels et lieux recevant du public : assainissement certifié avec certificat d'hygiène officiel." },
      { ico: "🐛", label: "Termites", desc: "Structures anciennes et boiseries des bâtiments historiques et hôteliers. Protection par barrière chimique." },
    ],
    quartiers: ["Ouidah centre", "Djègbadji", "Pahou", "Savi", "Route des Pêches", "Gakpé"],
    services: [
      { slug: "anti-moustiques-cotonou", label: "Anti-moustiques" },
      { slug: "punaises-de-lit-cotonou", label: "Punaises de lit" },
      { slug: "reptiles-serpents-benin", label: "Reptiles & serpents" },
      { slug: "desinfection-locaux", label: "Désinfection" },
      { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
      { slug: "contrat-entretien-hygiene", label: "Contrat d'entretien" },
    ],
    faqs: [
      { q: "Intervenez-vous dans les hôtels de Ouidah contre les punaises de lit ?", r: "Oui, discrètement et sans interrompre votre activité. Le traitement thermique à 60°C élimine 100% des punaises et de leurs œufs, sans résidu chimique." },
      { q: "Peut-on traiter les moustiques en extérieur pour une terrasse ou un jardin d'hôtel ?", r: "Oui. Nos traitements de brumisation et de pulvérisation résiduelle en extérieur offrent une protection de plusieurs semaines, adaptée au climat côtier de Ouidah." },
      { q: "Faites-vous les certificats d'hygiène pour les restaurants touristiques ?", r: "Oui, un certificat d'hygiène officiel est remis après désinfection, valable pour vos clients comme pour les inspections sanitaires." },
    ],
    metaTitle: "Désinsectisation, Punaises de Lit & Désinfection Ouidah | Phyto Bénin",
    metaDesc: "Anti-nuisibles à Ouidah : punaises de lit (hôtels), moustiques, désinfection, serpents, désinsectisation. Techniciens agréés, 24h/24. Devis gratuit.",
    mots: "désinsectisation Ouidah, punaises de lit hôtel Ouidah, anti-moustiques Ouidah, désinfection restaurant Ouidah, serpents Ouidah, certificat hygiène Ouidah",
  },
  "seme-kpodji": {
    nom: "Sèmè-Kpodji",
    region: "Ouémé",
    intro: "Phyto Bénin intervient à Sèmè-Kpodji et le long du littoral est pour la désinsectisation, la dératisation, l'anti-moustiques et la désinfection. Techniciens agréés par l'État, produits homologués OMS, disponibles 24h/24.",
    contexte: "Porte d'entrée du Bénin depuis le Nigéria, Sèmè-Kpodji concentre commerce transfrontalier, entrepôts, maraîchage et villages de pêche le long de la lagune et du cordon littoral. Cette humidité côtière et ces eaux stagnantes entretiennent une forte pression des moustiques, tandis que les entrepôts et le négoce attirent les rongeurs. Les constructions récentes, dans le prolongement de Cotonou, sont très exposées aux termites.",
    nuisibles: [
      { ico: "🦟", label: "Moustiques", desc: "Lagune, bas-fonds maraîchers et eaux stagnantes du littoral : pression constante. Traitement des gîtes larvaires et brumisation des extérieurs." },
      { ico: "🐀", label: "Rats & souris", desc: "Entrepôts, commerce transfrontalier et marchés : rongeurs nombreux. Sécurisation des points d'entrée et stations d'appât certifiées." },
      { ico: "🪳", label: "Cafards", desc: "Restauration, commerces et logements denses. Gel appât professionnel longue durée, sans interrompre l'activité." },
      { ico: "🐛", label: "Termites", desc: "Constructions récentes sur sols humides, dans le prolongement de Cotonou. Barrière chimique par injection, préventive ou curative." },
      { ico: "🧴", label: "Désinfection", desc: "Restaurants, commerces et locaux professionnels : assainissement certifié avec certificat d'hygiène officiel." },
    ],
    quartiers: ["Agblangandan", "Djèffa", "Ekpè", "Tohouè", "Aholouyèmè", "Djrègbé", "Sèmè-Podji centre"],
    services: [
      { slug: "anti-moustiques-cotonou", label: "Anti-moustiques" },
      { slug: "deratisation-benin", label: "Dératisation" },
      { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
      { slug: "anti-termites-benin", label: "Anti-termites" },
      { slug: "desinfection-locaux", label: "Désinfection" },
      { slug: "contrat-entretien-hygiene", label: "Contrat d'entretien" },
    ],
    faqs: [
      { q: "Intervenez-vous rapidement à Agblangandan et Ekpè ?", r: "Oui. Sèmè-Kpodji étant limitrophe de Cotonou, nos équipes y interviennent le jour même dans la plupart des cas, et 24h/24 pour les urgences." },
      { q: "Comment traiter les moustiques près de la lagune ?", r: "Nous traitons les gîtes larvaires et pratiquons la brumisation des extérieurs et jardins. En zone humide, un passage régulier maintient la protection sur la durée." },
      { q: "Protégez-vous les entrepôts et commerces contre les rongeurs ?", r: "Oui, avec un plan de stations d'appât sécurisées, la sécurisation des points d'entrée et un suivi régulier, adaptés aux entrepôts et au négoce frontalier." },
    ],
    metaTitle: "Désinsectisation, Dératisation & Anti-moustiques Sèmè-Kpodji | Phyto Bénin",
    metaDesc: "Anti-nuisibles à Sèmè-Kpodji : moustiques, dératisation, désinsectisation, anti-termites, désinfection. Techniciens agréés, urgence 24h/24. Devis gratuit.",
    mots: "désinsectisation Sèmè-Kpodji, dératisation Sèmè-Kpodji, anti-moustiques Sèmè-Podji, désinfection Sèmè-Kpodji, rats entrepôt Sèmè, termites Agblangandan",
  },
  "parakou": {
    nom: "Parakou",
    region: "Borgou",
    intro: "Phyto Bénin assure la dératisation, l'anti-termites, la désinsectisation et la désinfection à Parakou et dans le Borgou. Service agréé pour les commerces, entrepôts, restaurants et particuliers, avec certificat officiel remis.",
    contexte: "Plus grande ville du nord et carrefour commercial, Parakou vit de son grand marché, de ses entrepôts (coton, marchandises) et de son terminus ferroviaire. Son climat soudanien, à longue saison sèche, n'épargne pas les nuisibles : rongeurs dans les entrepôts et les marchés, termites sur les charpentes, cafards dans la restauration, serpents venus de la savane environnante, et moustiques dès les premières pluies.",
    nuisibles: [
      { ico: "🐀", label: "Rats & souris", desc: "Grand marché, entrepôts de coton et de marchandises : forte présence de rongeurs. Stations d'appât sécurisées et suivi régulier." },
      { ico: "🐛", label: "Termites", desc: "Charpentes et menuiseries attaquées malgré le climat sec. Traitement curatif et barrière chimique préventive par injection." },
      { ico: "🪳", label: "Cafards", desc: "Restauration, buvettes et commerces alimentaires. Gel appât professionnel longue durée, sans nuisance pour l'activité." },
      { ico: "🐍", label: "Serpents & reptiles", desc: "Proximité de la savane et des parcelles végétalisées : interventions d'urgence 24h/24 et sécurisation périmétrique." },
      { ico: "🦟", label: "Moustiques", desc: "Pression saisonnière dès les pluies, autour des eaux stagnantes. Traitement des gîtes larvaires et des extérieurs." },
    ],
    quartiers: ["Arzèkè", "Guéma", "Zongo", "Banikanni", "Titirou", "Ladji", "Dépôt", "Albarika"],
    services: [
      { slug: "deratisation-benin", label: "Dératisation" },
      { slug: "anti-termites-benin", label: "Anti-termites" },
      { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
      { slug: "reptiles-serpents-benin", label: "Reptiles & serpents" },
      { slug: "anti-moustiques-cotonou", label: "Anti-moustiques" },
      { slug: "desinfection-locaux", label: "Désinfection" },
    ],
    faqs: [
      { q: "Traitez-vous les entrepôts et commerces du marché de Parakou ?", r: "Oui, c'est une de nos priorités dans le Borgou : dératisation des entrepôts de coton et de marchandises, sécurisation des points d'entrée et suivi régulier." },
      { q: "Les termites sont-ils un risque malgré le climat sec du nord ?", r: "Oui. Même en climat soudanien, les termites s'attaquent aux charpentes et menuiseries. Un traitement préventif par injection protège durablement les constructions." },
      { q: "Intervenez-vous pour les urgences serpents à Parakou ?", r: "Oui, 24h/24. La proximité de la savane expose les parcelles aux reptiles : nous intervenons en urgence et sécurisons le périmètre." },
    ],
    metaTitle: "Dératisation, Anti-termites & Désinsectisation Parakou | Phyto Bénin",
    metaDesc: "Anti-nuisibles à Parakou (Borgou) : dératisation entrepôts, anti-termites, désinsectisation, serpents, désinfection. Techniciens agréés, 24h/24. Devis gratuit.",
    mots: "dératisation Parakou, anti-termites Parakou, désinsectisation Parakou, serpents Parakou, rats marché Parakou, désinfection Borgou",
  },
  "bohicon": {
    nom: "Bohicon",
    region: "Zou",
    intro: "Phyto Bénin intervient à Bohicon et dans le Zou pour la dératisation, la désinsectisation, l'anti-termites et la désinfection. Techniciens agréés par l'État, produits homologués OMS, certificat officiel remis.",
    contexte: "Principal carrefour routier et ferroviaire du centre du Bénin, Bohicon est une ville de marché et de négoce, au croisement des axes nord-sud. L'intense activité de son grand marché et de ses entrepôts attire rats et cafards, tandis que l'habitat et les charpentes sont exposés aux termites, et les abords végétalisés aux serpents.",
    nuisibles: [
      { ico: "🐀", label: "Rats & souris", desc: "Grand marché, boutiques et entrepôts au carrefour commercial : rongeurs nombreux. Stations d'appât sécurisées et suivi régulier." },
      { ico: "🪳", label: "Cafards", desc: "Restauration, commerces alimentaires et logements denses. Gel appât professionnel longue durée, sans interrompre l'activité." },
      { ico: "🐛", label: "Termites", desc: "Charpentes, menuiseries et stocks menacés. Traitement curatif et barrière chimique préventive par injection." },
      { ico: "🐍", label: "Serpents & reptiles", desc: "Parcelles et abords végétalisés : interventions d'urgence 24h/24 et sécurisation périmétrique." },
      { ico: "🧴", label: "Désinfection", desc: "Restaurants, marchés et locaux recevant du public : assainissement certifié avec certificat d'hygiène officiel." },
    ],
    quartiers: ["Agbodjannou", "Houndjro", "Sodohomè", "Avogbanna", "Gnidjazoun", "Agongointo", "Lissèzoun"],
    services: [
      { slug: "deratisation-benin", label: "Dératisation" },
      { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
      { slug: "anti-termites-benin", label: "Anti-termites" },
      { slug: "reptiles-serpents-benin", label: "Reptiles & serpents" },
      { slug: "desinfection-locaux", label: "Désinfection" },
      { slug: "contrat-entretien-hygiene", label: "Contrat d'entretien" },
    ],
    faqs: [
      { q: "Traitez-vous les commerces et entrepôts du marché de Bohicon ?", r: "Oui. Au carrefour commercial du Zou, nous dératisons marchés et entrepôts, sécurisons les points d'entrée et assurons un suivi régulier." },
      { q: "Proposez-vous un certificat d'hygiène pour les restaurants ?", r: "Oui, un certificat d'hygiène officiel (agrément APA/26-025/CNGP-BEN) est remis après désinfection, valable pour vos clients comme pour les inspections." },
      { q: "Intervenez-vous à Bohicon le jour même ?", r: "Dans la plupart des cas oui, et 24h/24 pour les urgences (serpents notamment). Un diagnostic gratuit précède chaque intervention." },
    ],
    metaTitle: "Dératisation, Désinsectisation & Anti-termites Bohicon | Phyto Bénin",
    metaDesc: "Anti-nuisibles à Bohicon (Zou) : dératisation marché, désinsectisation, anti-termites, serpents, désinfection. Techniciens agréés, 24h/24. Devis gratuit.",
    mots: "dératisation Bohicon, désinsectisation Bohicon, anti-termites Bohicon, serpents Bohicon, désinfection Zou, certificat hygiène Bohicon",
  },
}

export async function generateStaticParams() {
  return Object.keys(VILLES).map((ville) => ({ ville }))
}

export async function generateMetadata({ params }: { params: Promise<{ ville: string }> }): Promise<Metadata> {
  const { ville } = await params
  const v = VILLES[ville]
  if (!v) return {}
  return {
    title: v.metaTitle,
    description: v.metaDesc,
    keywords: v.mots,
    alternates: { canonical: `https://www.phyto-benin.com/zones/${ville}` },
    openGraph: {
      title: v.metaTitle,
      description: v.metaDesc,
      url: `https://www.phyto-benin.com/zones/${ville}`,
      siteName: "Phyto Bénin by GSE",
      locale: "fr_FR",
      type: "website",
      images: [{ url: "https://www.phyto-benin.com/opengraph-image", width: 1200, height: 630, alt: v.metaTitle }],
    },
  }
}

export default async function ZonePage({ params }: { params: Promise<{ ville: string }> }) {
  const { ville } = await params
  const v = VILLES[ville]
  if (!v) notFound()

  const schemaService = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `Traitement anti-nuisibles à ${v.nom}`,
    "serviceType": "Désinsectisation, dératisation, désinfection",
    "description": v.intro,
    "provider": {
      "@type": "LocalBusiness",
      "name": "Phyto Bénin by GSE",
      "url": "https://www.phyto-benin.com",
      "telephone": "+2290153047950",
      "address": { "@type": "PostalAddress", "addressLocality": "Cotonou", "addressCountry": "BJ" },
    },
    "areaServed": { "@type": "City", "name": v.nom },
    "url": `https://www.phyto-benin.com/zones/${ville}`,
  }

  const schemaFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": v.faqs.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.r },
    })),
  }

  const schemaBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.phyto-benin.com" },
      { "@type": "ListItem", "position": 2, "name": "Zones d'intervention", "item": "https://www.phyto-benin.com/zones" },
      { "@type": "ListItem", "position": 3, "name": v.nom, "item": `https://www.phyto-benin.com/zones/${ville}` },
    ],
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaService) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFAQ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }} />

      {/* BREADCRUMB */}
      <div style={{ backgroundColor: "#f7f7f5", padding: "12px 60px", borderBottom: "1px solid #eee" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", fontSize: "12px", color: "#888", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>Accueil</a>
          <span>›</span>
          <a href="/services" style={{ color: "#888", textDecoration: "none" }}>Services</a>
          <span>›</span>
          <span style={{ color: "#0a2e1a", fontWeight: "600" }}>{v.nom}</span>
        </div>
      </div>

      {/* HERO */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "72px 60px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.05)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>
            ZONE D'INTERVENTION · {v.region.toUpperCase()}
          </div>
          <h1 style={{ fontSize: "clamp(30px, 4vw, 52px)", fontWeight: "700", color: "#ffffff", lineHeight: "1.1", letterSpacing: "-0.02em", marginBottom: "20px", maxWidth: "720px" }}>
            Désinsectisation, dératisation et désinfection à {v.nom}
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.65)", lineHeight: "1.85", maxWidth: "620px", marginBottom: "36px" }}>
            {v.intro}
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none" }}>
              Devis gratuit à {v.nom}
            </a>
            <a href="tel:+2290153047950" style={{ backgroundColor: "transparent", color: "#fff", fontWeight: "600", fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>
              Appeler, urgence 24h/24
            </a>
          </div>
        </div>
      </section>

      {/* CONTEXTE + NUISIBLES */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "72px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ maxWidth: "760px", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "26px", fontWeight: "700", color: "#0a0a0a", marginBottom: "18px" }}>
              Les nuisibles les plus fréquents à {v.nom}
            </h2>
            <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.85" }}>{v.contexte}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "12px" }}>
            {v.nuisibles.map((n, i) => (
              <div key={i} style={{ backgroundColor: "#fff", padding: "24px", borderLeft: "3px solid #d4a920" }}>
                <div style={{ fontSize: "26px", marginBottom: "10px" }}>{n.ico}</div>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0a2e1a", marginBottom: "8px" }}>{n.label}</h3>
                <p style={{ fontSize: "13px", color: "#666", lineHeight: "1.7", margin: 0 }}>{n.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUARTIERS + SERVICES */}
      <section style={{ backgroundColor: "#fff", padding: "64px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "start" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0a0a0a", marginBottom: "20px" }}>Quartiers desservis à {v.nom}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {v.quartiers.map((q, i) => (
                <span key={i} style={{ fontSize: "13px", fontWeight: "500", color: "#0a2e1a", backgroundColor: "#f7f7f5", border: "1px solid #e5e5e5", padding: "9px 16px", borderRadius: "30px" }}>{q}</span>
              ))}
            </div>
            <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.7", marginTop: "16px" }}>
              Vous n'êtes pas dans la liste ? Nous intervenons dans tout {v.nom} et sa périphérie. Appelez-nous.
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0a0a0a", marginBottom: "20px" }}>Nos services à {v.nom}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {v.services.map((s, i) => (
                <a key={i} href={`/services/${s.slug}`} style={{ display: "block", padding: "16px 18px", backgroundColor: "#f7f7f5", textDecoration: "none", borderLeft: "3px solid #0a2e1a", fontSize: "13px", fontWeight: "700", color: "#0a2e1a" }}>
                  {s.label} →
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "64px 60px" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#0a0a0a", marginBottom: "24px" }}>Questions fréquentes, {v.nom}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {v.faqs.map((f, i) => (
              <div key={i} style={{ backgroundColor: "#fff", padding: "22px 26px", borderLeft: "3px solid #d4a920" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0a2e1a", marginBottom: "8px" }}>{f.q}</h3>
                <p style={{ fontSize: "14px", color: "#555", lineHeight: "1.7", margin: 0 }}>{f.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUTRES ZONES */}
      <section style={{ backgroundColor: "#fff", padding: "56px 60px", borderTop: "1px solid #f0ede6" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0a0a0a", marginBottom: "20px" }}>Nos autres zones d'intervention</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {Object.entries(VILLES).filter(([slug]) => slug !== ville).map(([slug, autre]) => (
              <a key={slug} href={`/zones/${slug}`} style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a", backgroundColor: "#f7f7f5", padding: "10px 18px", borderRadius: "6px", textDecoration: "none", borderLeft: "3px solid #d4a920" }}>
                {autre.nom} →
              </a>
            ))}
            <a href="/contact" style={{ fontSize: "13px", fontWeight: "700", color: "#fff", backgroundColor: "#0a2e1a", padding: "10px 18px", borderRadius: "6px", textDecoration: "none" }}>
              Autre ville au Bénin ? →
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
