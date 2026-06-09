import { notFound } from "next/navigation"
import type { Metadata } from "next"

const SERVICES: Record<string, {
  titre: string
  ico: string
  accroche: string
  description: string
  tag: string
  details: string[]
  metaTitle: string
  metaDesc: string
  mots: string
  faqs: { q: string; r: string }[]
  secteursCibles: string[]
  urgence: boolean
}> = {
  "desinsectisation-cotonou": {
    titre: "Désinsectisation",
    ico: "🪳",
    accroche: "Cafards · Fourmis · Moustiques · Mouches",
    description: "Cafards, fourmis, moustiques, mouches — on choisit la bonne méthode selon votre situation : gel appât, pulvérisation résiduelle ou fumigation. Techniciens certifiés, résultat garanti.",
    tag: "Devis gratuit",
    details: ["Diagnostic complet et gratuit avant intervention", "Gel appât professionnel longue durée", "Pulvérisation résiduelle certifiée OMS", "Fumigation pour les infestations sévères", "Contrat de suivi mensuel disponible"],
    metaTitle: "Désinsectisation Cotonou — Cafards, Fourmis, Moustiques | Phyto Bénin",
    metaDesc: "Désinsectisation professionnelle à Cotonou et au Bénin. Élimination cafards, fourmis, moustiques, mouches. Techniciens agréés, produits homologués. Devis gratuit.",
    mots: "désinsectisation Cotonou, désinsectisation Bénin, élimination cafards Cotonou, traitement insectes Bénin, cafards appartement Cotonou",
    faqs: [
      { q: "Combien de temps dure une intervention de désinsectisation ?", r: "Une intervention standard dure entre 1 et 3 heures selon la superficie. Nous recommandons de quitter les locaux pendant 2 à 4 heures après le traitement." },
      { q: "Les produits utilisés sont-ils dangereux pour les enfants et animaux ?", r: "Non — tous nos produits passent les normes OMS et les standards béninois. On vous donne le délai exact à respecter avant de réoccuper les lieux, selon le traitement." },
      { q: "Faut-il une deuxième intervention ?", r: "Pour les cafards, on recommande un passage de contrôle 3 à 4 semaines après — c'est le temps que mettent les œufs à éclore. Ça évite les rechutes et garantit le résultat dans la durée." },
      { q: "Intervenez-vous en urgence la nuit ou le week-end ?", r: "Oui, on est disponibles 24h/24 et 7j/7 à Cotonou et dans les zones prioritaires (Abomey-Calavi, Sèmè-Kpodji)." },
    ],
    secteursCibles: ["Restaurants et cuisines", "Hôtels et hébergements", "Entrepôts alimentaires", "Bureaux et entreprises", "Appartements et villas", "Établissements de santé"],
    urgence: true,
  },
  "deratisation-benin": {
    titre: "Dératisation",
    ico: "🐀",
    accroche: "Rats · Souris · Rongeurs",
    description: "Rats, souris, rongeurs — on les élimine et on sécurise vos points d'entrée pour qu'ils ne reviennent pas. Pièges homologués, raticides certifiés, suivi mensuel disponible.",
    tag: "Contrat mensuel disponible",
    details: ["Inspection complète des zones à risque", "Pièges professionnels certifiés", "Raticides homologués et sécurisés", "Sécurisation des points d'entrée", "Rapport d'intervention détaillé et suivi mensuel"],
    metaTitle: "Dératisation Bénin — Rats et Souris | Intervention Rapide | Phyto Bénin",
    metaDesc: "Dératisation professionnelle au Bénin et à Cotonou. Élimination rats, souris, rongeurs. Pièges homologués, raticides certifiés. Intervention rapide 24h/24.",
    mots: "dératisation Cotonou, dératisation Bénin, élimination rats Cotonou, traitement rongeurs Bénin, souris maison Cotonou",
    faqs: [
      { q: "Comment savoir si j'ai une infestation de rats ?", r: "Crottes noires, bruits la nuit, câbles ou emballages rongés, traces de morsures, odeurs — si vous avez un ou deux de ces signes, appelez-nous. Mieux vaut agir tôt." },
      { q: "Vos raticides sont-ils dangereux pour les animaux domestiques ?", r: "Non — on utilise des stations d'appât fermées, inaccessibles aux enfants et aux animaux. Les produits sont dosés pour cibler les rongeurs, pas votre entourage." },
      { q: "Combien de temps faut-il pour éliminer une infestation ?", r: "En général, entre 2 et 3 semaines selon l'ampleur. On propose aussi un contrat mensuel si vous voulez maintenir le résultat dans le temps." },
      { q: "Intervenez-vous dans les entrepôts et industries ?", r: "Oui — la dératisation des entrepôts et industries agroalimentaires, c'est l'une de nos spécialités. Protocoles adaptés aux normes HACCP, suivi rigoureux." },
    ],
    secteursCibles: ["Entrepôts et industrie", "Restaurants et cuisine", "Marchés et commerces", "Résidences et villas", "Établissements de santé", "Hôtels et hébergements"],
    urgence: true,
  },
  "desinfection-locaux": {
    titre: "Désinfection",
    ico: "🧴",
    accroche: "Assainissement · Virucide · Bactéricide",
    description: "Assainissement complet de vos locaux au Bénin avec produits virucides, bactéricides et fongicides homologués. Service certifié pour restaurants, hôtels et établissements de santé.",
    tag: "Certificat officiel remis",
    details: ["Désinfection totale des surfaces et équipements", "Produits virucides certifiés OMS", "Conforme aux normes sanitaires béninoises", "Certificat d'hygiène officiel remis à l'issue", "Traitement adapté aux ERP et établissements recevant du public"],
    metaTitle: "Désinfection Locaux Cotonou — Certificat Hygiène Officiel | Phyto Bénin",
    metaDesc: "Désinfection professionnelle à Cotonou et au Bénin. Assainissement complet, produits virucides et bactéricides certifiés OMS. Certificat d'hygiène officiel. Restaurants, hôtels, santé.",
    mots: "désinfection Cotonou, assainissement locaux Bénin, certificat hygiène Bénin, désinfection restaurant Cotonou, désinfection hôtel Bénin",
    faqs: [
      { q: "À quelle fréquence faut-il désinfecter ses locaux ?", r: "Pour un restaurant ou un hôtel, une fois par mois c'est la base. Pour une clinique ou une pharmacie, ça peut être hebdomadaire selon votre activité." },
      { q: "Le certificat d'hygiène remis est-il reconnu officiellement ?", r: "Oui — notre certificat est émis par une entreprise agréée par l'État béninois (agrément APA/26-025/CNGP-BEN). Il est accepté par les autorités sanitaires et les inspecteurs." },
      { q: "Faut-il vider les locaux avant la désinfection ?", r: "Pas grand chose à faire de votre côté — juste retirer les denrées alimentaires exposées. On vous envoie un protocole précis avant de passer." },
      { q: "Vos produits protègent-ils contre les virus et bactéries ?", r: "Oui — on travaille avec des produits virucides à large spectre homologués OMS : bactéries, virus, champignons, moisissures. Tout est couvert." },
    ],
    secteursCibles: ["Restaurants et traiteurs", "Hôtels et hébergements", "Cliniques et pharmacies", "Crèches et écoles", "Marchés et surfaces commerciales", "Bureaux et open spaces"],
    urgence: false,
  },
  "anti-termites-benin": {
    titre: "Anti-termites",
    ico: "🐜",
    accroche: "Protection bois et béton",
    description: "Protection durable de vos structures contre les termites au Bénin. Barrière chimique en profondeur, traitement par injection et garantie longue durée avec contrôle annuel inclus.",
    tag: "Garantie longue durée",
    details: ["Diagnostic complet des structures bois et béton", "Barrière chimique par injection en profondeur", "Traitement du bois et des fondations", "Garantie longue durée sur le traitement", "Contrôle annuel inclus dans le contrat"],
    metaTitle: "Anti-termites Bénin — Protection Structures | Garantie Longue Durée | Phyto Bénin",
    metaDesc: "Traitement anti-termites professionnel au Bénin. Protection bois, béton et fondations. Barrière chimique certifiée, garantie longue durée, contrôle annuel. Devis gratuit.",
    mots: "anti-termites Bénin, traitement termites Cotonou, protection bois termites Bénin, termites maison Cotonou, barrière chimique termites",
    faqs: [
      { q: "Comment savoir si ma maison est infestée de termites ?", r: "Regardez les murs et fondations : galeries de terre, bois qui sonne creux, ailes abandonnées près des fenêtres, menuiseries abîmées — si vous voyez un ou deux de ces signes, appelez-nous avant que ça s'aggrave." },
      { q: "Le traitement anti-termites est-il dangereux pour les occupants ?", r: "Non — les produits vont dans les fondations et les structures, pas dans les espaces de vie. Les locaux restent habitables. On recommande juste d'aérer après le traitement des espaces fermés." },
      { q: "Quelle est la durée de garantie du traitement ?", r: "Un contrôle annuel est inclus dans le contrat. La durée exacte de garantie dépend du type de traitement réalisé — on vous l'indique clairement avant de commencer." },
      { q: "Peut-on traiter une maison déjà construite contre les termites ?", r: "Oui, sans problème. On intervient sur les constructions existantes par injection dans les fondations, traitement des menuiseries et barrières périmétriques." },
    ],
    secteursCibles: ["Maisons individuelles", "Immeubles résidentiels", "Entrepôts et hangars", "Bureaux et commerces", "Villas et résidences", "Bâtiments industriels"],
    urgence: false,
  },
  "reptiles-serpents-benin": {
    titre: "Reptiles et Serpents",
    ico: "🐍",
    accroche: "Geckos · Serpents · Lézards",
    description: "Sécurisation complète contre les reptiles au Bénin. Répulsifs professionnels longue durée, barrières physiques et intervention d'urgence disponible 24h/24 à Cotonou.",
    tag: "Urgence — disponible 24h/24",
    details: ["Intervention d'urgence disponible 24h/24 à Cotonou", "Répulsifs professionnels longue durée", "Sécurisation périmétrique complète du site", "Pose de barrières physiques anti-reptiles", "Suivi post-intervention et contrôle inclus"],
    metaTitle: "Serpents et Reptiles Bénin — Urgence 24h/24 Cotonou | Phyto Bénin",
    metaDesc: "Intervention d'urgence contre serpents, geckos et reptiles à Cotonou et au Bénin. Sécurisation complète, répulsifs professionnels. Disponible 24h/24.",
    mots: "serpents Cotonou, reptiles maison Bénin, élimination serpents Cotonou, geckos appartement Bénin, urgence serpent Cotonou",
    faqs: [
      { q: "Que faire si je trouve un serpent dans ma maison ?", r: "N'approchez pas l'animal. Fermez la pièce, éloignez les personnes et appelez-nous immédiatement. Notre équipe est disponible 24h/24 à Cotonou." },
      { q: "Tous les serpents au Bénin sont-ils dangereux ?", r: "Non — mais certaines espèces présentes au Bénin sont venimeuses. Sans identification certaine, mieux vaut traiter chaque serpent comme potentiellement dangereux." },
      { q: "Comment empêcher les serpents d'entrer chez soi ?", r: "On installe des grillages, des joints de portes et on applique des répulsifs périmètriques durables. Un contrôle annuel suffit à maintenir la protection." },
      { q: "Intervenez-vous aussi pour les geckos en grande quantité ?", r: "Oui — les proliférations de geckos dans les locaux commerciaux et entrepôts, c'est quelque chose qu'on traite régulièrement." },
    ],
    secteursCibles: ["Maisons et villas", "Jardins et terrasses", "Entrepôts et hangars", "Résidences avec espaces verts", "Hôtels et resorts", "Sites industriels"],
    urgence: true,
  },
  "anti-moustiques-cotonou": {
    titre: "Anti-moustiques",
    ico: "🦟",
    accroche: "Gîtes larvaires · Jardins · Extérieurs",
    description: "Traitement professionnel anti-moustiques à Cotonou et au Bénin. Élimination des gîtes larvaires, pulvérisation des espaces extérieurs et protection durable pour votre famille et vos employés.",
    tag: "Traitement extérieur inclus",
    details: ["Identification et traitement des gîtes larvaires", "Pulvérisation résiduelle des extérieurs", "Brumisation professionnelle des jardins", "Pose de diffuseurs longue durée", "Traitement préventif de saison des pluies"],
    metaTitle: "Anti-moustiques Cotonou — Traitement Gîtes Larvaires | Phyto Bénin",
    metaDesc: "Traitement anti-moustiques professionnel à Cotonou et au Bénin. Élimination gîtes larvaires, brumisation jardins, protection durable. Particuliers et professionnels.",
    mots: "anti-moustiques Cotonou, traitement moustiques Bénin, élimination moustiques Cotonou, gîtes larvaires Bénin, brumisation jardin Cotonou",
    faqs: [
      { q: "À quelle période de l'année faut-il traiter contre les moustiques au Bénin ?", r: "La saison des pluies (mars-juillet et septembre-novembre) est la plus critique. Un traitement préventif juste avant les pluies donne les meilleurs résultats." },
      { q: "Le traitement est-il efficace en extérieur ?", r: "Oui, nos traitements de brumisation et pulvérisation résiduelle en extérieur offrent une protection de 4 à 8 semaines selon les conditions climatiques." },
      { q: "Vos produits sont-ils dangereux pour les plantes et jardins ?", r: "Nous utilisons des produits sélectifs adaptés aux espaces verts, sans danger pour les plantes, les arbres fruitiers et les animaux domestiques." },
      { q: "Pouvez-vous traiter une piscine ou un bassin ?", r: "Oui, nous traitons les points d'eau stagnants avec des larvicides biologiques homologués, sans danger pour l'environnement aquatique." },
    ],
    secteursCibles: ["Villas et résidences avec jardin", "Hôtels et piscines", "Écoles et crèches", "Terrasses et restaurants en plein air", "Campings et lodges", "Bureaux avec espaces verts"],
    urgence: false,
  },
  "punaises-de-lit-cotonou": {
    titre: "Punaises de lit",
    ico: "🛏️",
    accroche: "Hôtels · Appartements · Résidences",
    description: "Élimination complète et garantie des punaises de lit à Cotonou. Traitement thermique à 60°C et traitement chimique certifié. Inspection intégrale du mobilier et résultat garanti.",
    tag: "Résultat garanti",
    details: ["Inspection complète du mobilier et literie", "Traitement thermique à 60°C — technique la plus efficace", "Traitement chimique résiduel complémentaire", "Protection des matelas incluse", "Garantie sans punaises 3 mois après intervention"],
    metaTitle: "Punaises de Lit Cotonou — Traitement Thermique Garanti | Phyto Bénin",
    metaDesc: "Élimination punaises de lit à Cotonou et au Bénin. Traitement thermique à 60°C + traitement chimique certifié. Résultat garanti, inspection complète. Hôtels et particuliers.",
    mots: "punaises de lit Cotonou, traitement punaises Bénin, élimination punaises lit Cotonou, punaises hôtel Bénin, traitement thermique punaises",
    faqs: [
      { q: "Comment savoir si j'ai des punaises de lit ?", r: "Les signes sont des piqûres en ligne sur la peau au réveil, de petites taches noires sur le matelas et les coutures, et parfois une légère odeur sucrée dans la chambre." },
      { q: "Le traitement thermique est-il vraiment plus efficace ?", r: "Oui, la chaleur à 60°C élimine 100% des punaises à tous les stades, y compris les œufs. C'est la méthode la plus efficace et elle ne laisse aucun résidu chimique." },
      { q: "Faut-il jeter le matelas ?", r: "Dans la majorité des cas, non. Nous traitons et protégeons le matelas avec une housse anti-punaises après l'intervention. Un remplacement n'est nécessaire qu'en cas de matelas très endommagé." },
      { q: "Combien de temps dure le traitement ?", r: "Une intervention complète (traitement thermique + chimique) dure entre 4 et 8 heures selon la taille de la chambre et le niveau d'infestation." },
    ],
    secteursCibles: ["Hôtels et auberges", "Appartements en location", "Résidences universitaires", "Foyers et pensions", "Villas et résidences privées", "Airbnb et meublés"],
    urgence: false,
  },
  "contrat-entretien-hygiene": {
    titre: "Contrat d'entretien",
    ico: "📋",
    accroche: "Mensuel · Trimestriel · Sur mesure",
    description: "Programme d'entretien hygiénique régulier sur mesure au Bénin. Visites planifiées, rapports détaillés, alerte préventive et tarif préférentiel pour les entreprises et institutions.",
    tag: "À partir de 25 000 FCFA/mois",
    details: ["Fréquence mensuelle ou trimestrielle selon vos besoins", "Rapport détaillé après chaque visite d'entretien", "Alerte préventive par SMS et WhatsApp", "Tarif préférentiel sous contrat annuel", "Priorité d'intervention en cas d'urgence"],
    metaTitle: "Contrat Entretien Hygiène Bénin — Mensuel à partir de 25 000 FCFA | Phyto Bénin",
    metaDesc: "Contrat d'entretien hygiénique au Bénin. Programme mensuel ou trimestriel, rapport détaillé, tarif préférentiel. Désinsectisation, dératisation, désinfection régulières.",
    mots: "contrat entretien hygiène Bénin, désinsectisation mensuelle Cotonou, programme hygiène entreprise Bénin, contrat dératisation Cotonou",
    faqs: [
      { q: "Qu'est-ce qu'un contrat d'entretien hygiénique ?", r: "C'est un programme de visites régulières planifiées (mensuelles ou trimestrielles) incluant désinsectisation, dératisation et vérification sanitaire globale, avec rapport détaillé à chaque passage." },
      { q: "Quel est le prix d'un contrat d'entretien ?", r: "Nos contrats démarrent à 25 000 FCFA par mois pour les petites structures. Le tarif est ajusté selon la superficie, la fréquence et les services inclus. Demandez un devis gratuit." },
      { q: "Est-ce que le contrat inclut les interventions d'urgence ?", r: "Oui, les clients sous contrat bénéficient d'une priorité d'intervention en cas d'urgence et d'un tarif préférentiel sur les traitements supplémentaires." },
      { q: "Le contrat inclut-il un certificat d'hygiène ?", r: "Oui, nous délivrons un certificat d'hygiène officiel après chaque visite d'entretien, valable auprès des autorités sanitaires béninoises." },
    ],
    secteursCibles: ["Restaurants et traiteurs", "Hôtels et hébergements", "Cliniques et pharmacies", "Établissements scolaires", "Entrepôts et industries", "Bureaux et open spaces"],
    urgence: false,
  },
}

export async function generateStaticParams() {
  return Object.keys(SERVICES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = SERVICES[params.slug]
  if (!s) return {}
  return {
    title: s.metaTitle,
    description: s.metaDesc,
    keywords: s.mots,
    alternates: { canonical: `https://www.phyto-benin.com/services/${params.slug}` },
    openGraph: {
      title: s.metaTitle,
      description: s.metaDesc,
      url: `https://www.phyto-benin.com/services/${params.slug}`,
      siteName: "Phyto Bénin by GSE",
      locale: "fr_FR",
      type: "website",
      images: [{ url: "https://www.phyto-benin.com/images/hero-bg.jpg", width: 1200, height: 630, alt: s.metaTitle }],
    },
  }
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const s = SERVICES[params.slug]
  if (!s) notFound()

  const schemaService = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": s.titre,
    "description": s.description,
    "provider": {
      "@type": "LocalBusiness",
      "name": "Phyto Bénin by GSE",
      "url": "https://www.phyto-benin.com",
      "telephone": "+22901530 47950",
      "address": { "@type": "PostalAddress", "addressLocality": "Cotonou", "addressCountry": "BJ" }
    },
    "areaServed": { "@type": "Country", "name": "Bénin" },
    "url": `https://www.phyto-benin.com/services/${params.slug}`,
  }

  const schemaFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": s.faqs.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.r }
    }))
  }

  const schemaBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.phyto-benin.com" },
      { "@type": "ListItem", "position": 2, "name": "Services", "item": "https://www.phyto-benin.com/services" },
      { "@type": "ListItem", "position": 3, "name": s.titre, "item": `https://www.phyto-benin.com/services/${params.slug}` },
    ]
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaService) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFAQ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }} />

      {/* BREADCRUMB */}
      <div style={{ backgroundColor: "#f7f7f5", padding: "12px 60px", borderBottom: "1px solid #eee" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", fontSize: "12px", color: "#888", display: "flex", gap: "8px", alignItems: "center" }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>Accueil</a>
          <span>›</span>
          <a href="/services" style={{ color: "#888", textDecoration: "none" }}>Services</a>
          <span>›</span>
          <span style={{ color: "#0a2e1a", fontWeight: "600" }}>{s.titre}</span>
        </div>
      </div>

      {/* HERO */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "72px 60px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.05)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>
            {s.accroche.toUpperCase()}
          </div>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: "700", color: "#ffffff", lineHeight: "1.1", letterSpacing: "-0.02em", marginBottom: "20px", maxWidth: "680px" }}>
            {s.titre}
            <br />
            <span style={{ fontWeight: "300", color: "rgba(255,255,255,0.7)", fontSize: "0.75em" }}>au Bénin — Phyto Bénin by GSE</span>
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.6)", lineHeight: "1.85", maxWidth: "560px", marginBottom: "36px" }}>
            {s.description}
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none" }}>
              Devis gratuit
            </a>
            <a href="https://wa.me/2290153047950" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#25d366", color: "#fff", fontWeight: "700", fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none" }}>
              WhatsApp direct
            </a>
          </div>
        </div>
      </section>

      {/* CONTENU PRINCIPAL */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "72px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "60px", alignItems: "start" }}>

          {/* CE QU'ON FAIT */}
          <div>
            <h2 style={{ fontSize: "28px", fontWeight: "700", color: "#0a0a0a", marginBottom: "24px" }}>
              Nos prestations de {s.titre.toLowerCase()} au Bénin
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px 0", display: "flex", flexDirection: "column", gap: "14px" }}>
              {s.details.map((d, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "14px", fontSize: "15px", color: "#333", padding: "16px 20px", backgroundColor: "#fff", borderLeft: "3px solid #d4a920" }}>
                  <span style={{ color: "#1a6b38", fontWeight: "700", flexShrink: 0 }}>✓</span>
                  {d}
                </li>
              ))}
            </ul>

            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#0a0a0a", marginBottom: "20px" }}>
              Secteurs concernés
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "40px" }}>
              {s.secteursCibles.map((sec, i) => (
                <div key={i} style={{ backgroundColor: "#fff", padding: "12px 16px", fontSize: "13px", fontWeight: "500", color: "#444", borderLeft: "3px solid #0a2e1a" }}>
                  {sec}
                </div>
              ))}
            </div>

            {/* FAQ */}
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#0a0a0a", marginBottom: "20px" }}>
              Questions fréquentes
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {s.faqs.map((f, i) => (
                <div key={i} style={{ backgroundColor: "#fff", padding: "20px 24px", borderLeft: "3px solid transparent" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0a2e1a", marginBottom: "8px" }}>{f.q}</h3>
                  <p style={{ fontSize: "14px", color: "#555", lineHeight: "1.7", margin: 0 }}>{f.r}</p>
                </div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE */}
          <div style={{ position: "sticky", top: "90px" }}>
            <div style={{ backgroundColor: "#0a2e1a", padding: "32px", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "16px" }}>INTERVENTION RAPIDE</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>Devis gratuit</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", marginBottom: "24px", lineHeight: "1.6" }}>Diagnostic offert sans engagement.</div>
              <a href="/contact" style={{ display: "block", textAlign: "center", backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "14px", borderRadius: "4px", textDecoration: "none", marginBottom: "10px" }}>
                Demander un devis
              </a>
              <a href="https://wa.me/2290153047950" target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", backgroundColor: "#25d366", color: "#fff", fontWeight: "700", fontSize: "14px", padding: "14px", borderRadius: "4px", textDecoration: "none" }}>
                WhatsApp direct
              </a>
            </div>

            <div style={{ backgroundColor: "#fff", padding: "24px", border: "1px solid #f0ede6" }}>
              <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "16px" }}>POURQUOI PHYTO BÉNIN ?</div>
              {[
                "Agréé par l'État béninois",
                "Produits homologués OMS",
                "Techniciens certifiés",
                "Disponible 24h/24",
                "Devis gratuit",
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#444", padding: "8px 0", borderBottom: i < 4 ? "1px solid #f7f7f5" : "none" }}>
                  <span style={{ color: "#1a6b38", fontWeight: "700" }}>✓</span>
                  {r}
                </div>
              ))}
            </div>

            {s.urgence && (
              <div style={{ backgroundColor: "#991b1b", padding: "20px 24px", marginTop: "16px" }}>
                <div style={{ fontSize: "11px", color: "#fca5a5", fontWeight: "700", marginBottom: "8px" }}>URGENCE 24H/24</div>
                <a href="tel:+22901530 47950" style={{ display: "block", textAlign: "center", backgroundColor: "#fff", color: "#991b1b", fontWeight: "700", fontSize: "14px", padding: "12px", borderRadius: "4px", textDecoration: "none" }}>
                  Appeler maintenant
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AUTRES SERVICES */}
      <section style={{ backgroundColor: "#fff", padding: "64px 60px", borderTop: "1px solid #f0ede6" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0a0a0a", marginBottom: "24px" }}>Nos autres services</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {Object.entries(SERVICES).filter(([slug]) => slug !== params.slug).slice(0, 4).map(([slug, srv]) => (
              <a key={slug} href={`/services/${slug}`} style={{ display: "block", padding: "20px", backgroundColor: "#f7f7f5", textDecoration: "none", borderLeft: "3px solid transparent", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = "#d4a920")}
                onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = "transparent")}>
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>{srv.ico}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a" }}>{srv.titre}</div>
                <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{srv.accroche}</div>
              </a>
            ))}
          </div>
          <a href="/services" style={{ display: "inline-block", marginTop: "20px", fontSize: "13px", color: "#0a2e1a", fontWeight: "700", textDecoration: "none", borderBottom: "2px solid #d4a920", paddingBottom: "2px" }}>
            Voir tous nos services →
          </a>
        </div>
      </section>

    </main>
  )
}
