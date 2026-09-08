// Hub « Nuisibles » : une page par nuisible, à intention locale (Bénin/Cotonou),
// qui relie le service correspondant + les articles de blog déjà rédigés + un CTA.
// Contenu factuel (aucun prix, aucune donnée inventée). Structure pensée pour
// dépasser la grille "nos-cibles" du concurrent (local + maillage interne).

export type Nuisible = {
  nom: string
  emoji: string
  h1: string
  intro: string
  signes: string[]
  methode: string[]
  service: { slug: string; label: string }
  articles: string[] // slugs blog existants
  metaTitle: string
  metaDesc: string
  mots: string
}

export const NUISIBLES: Record<string, Nuisible> = {
  cafards: {
    nom: "Cafards", emoji: "🪳",
    h1: "Cafards à Cotonou et au Bénin",
    intro: "Les cafards (blattes) prolifèrent vite dans les cuisines, restaurants et logements au climat chaud et humide du Bénin. Ils contaminent les aliments et déclenchent allergies et mauvaises odeurs. On les élimine à la source, œufs compris.",
    signes: ["Cafards visibles la nuit dans la cuisine ou près des canalisations", "Petites taches noires (déjections) et odeur caractéristique", "Œufs (oothèques) dans les recoins chauds et humides"],
    methode: ["Diagnostic gratuit et localisation des foyers", "Gel appât professionnel longue durée", "Pulvérisation résiduelle certifiée dans les zones à risque", "Passage de contrôle 3 à 4 semaines après (éclosion des œufs)"],
    service: { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
    articles: ["cafards-dans-un-restaurant-a-cotonou-les-eliminer-durablement", "cafards-a-la-maison-les-5-erreurs-qui-les-font-toujours-revenir", "blattes-germaniques-ou-americaines-identifier-son-cafard-pour-mieux-le-traiter"],
    metaTitle: "Cafards à Cotonou, Élimination Durable | Phyto Bénin",
    metaDesc: "Élimination des cafards à Cotonou et au Bénin : gel appât, pulvérisation certifiée, contrôle anti-rechute. Techniciens agréés par l'État. Devis gratuit.",
    mots: "cafards Cotonou, blattes Bénin, élimination cafards restaurant, cafards cuisine Cotonou, anti-cafards Bénin",
  },
  "rats-et-souris": {
    nom: "Rats et souris", emoji: "🐀",
    h1: "Rats et souris au Bénin",
    intro: "Rats et souris rongent câbles, stocks et emballages, et transmettent des maladies. Dans les entrepôts, commerces et maisons du Bénin, une infestation s'installe vite. On élimine les rongeurs et on sécurise les points d'entrée.",
    signes: ["Crottes noires le long des murs et dans les placards", "Bruits de grattage la nuit dans les plafonds ou cloisons", "Câbles, emballages ou denrées rongés"],
    methode: ["Inspection des zones à risque et points d'entrée", "Stations d'appât fermées, sécurisées enfants et animaux", "Pièges professionnels homologués", "Rapport d'intervention + suivi mensuel possible (HACCP)"],
    service: { slug: "deratisation-benin", label: "Dératisation" },
    articles: ["rats-et-souris-les-signes-dinfestation-et-les-bons-reflexes", "deratisation-dune-maison-au-benin-reprendre-le-controle-chez-soi", "rats-dans-les-faux-plafonds-et-la-toiture-les-deloger"],
    metaTitle: "Rats et Souris au Bénin, Dératisation | Phyto Bénin",
    metaDesc: "Dératisation à Cotonou et au Bénin : élimination des rats et souris, sécurisation des accès, suivi HACCP. Intervention rapide 24h/24. Devis gratuit.",
    mots: "rats Cotonou, souris Bénin, dératisation maison, rongeurs entrepôt Bénin, anti-rats Cotonou",
  },
  termites: {
    nom: "Termites", emoji: "🐜",
    h1: "Termites au Bénin",
    intro: "Les termites attaquent le bois et les structures en silence et peuvent fragiliser une maison en quelques mois au Bénin. On traite en profondeur (préventif ou curatif) pour protéger durablement charpentes, menuiseries et fondations.",
    signes: ["Bois qui sonne creux, menuiseries qui s'effritent", "Galeries de terre le long des murs et fondations", "Ailes abandonnées près des fenêtres après un envol"],
    methode: ["Diagnostic des structures bois et béton", "Barrière chimique par injection en profondeur", "Traitement du bois et des fondations", "Contrôle annuel inclus dans le contrat"],
    service: { slug: "anti-termites-benin", label: "Anti-termites" },
    articles: ["termites-au-benin-proteger-sa-maison-contre-les-degats", "termites-traitement-preventif-ou-curatif-lequel-choisir", "termites-ailes-reconnaitre-un-envol-et-reagir-vite"],
    metaTitle: "Termites au Bénin, Traitement et Protection | Phyto Bénin",
    metaDesc: "Traitement anti-termites au Bénin : barrière chimique, protection du bois et des fondations, contrôle annuel. Préventif et curatif. Devis gratuit.",
    mots: "termites Bénin, traitement termites Cotonou, protection bois termites, anti-termites maison Bénin",
  },
  moustiques: {
    nom: "Moustiques", emoji: "🦟",
    h1: "Moustiques à Cotonou et au Bénin",
    intro: "Au Bénin, les moustiques gâchent le quotidien et transmettent le paludisme et la dengue, surtout en saison des pluies. On élimine les gîtes larvaires et on traite les extérieurs pour protéger familles, hôtels et entreprises.",
    signes: ["Piqûres nombreuses le soir et la nuit", "Eaux stagnantes (soucoupes, gouttières, bassins) autour du bâtiment", "Recrudescence marquée pendant la saison des pluies"],
    methode: ["Identification et traitement des gîtes larvaires", "Pulvérisation résiduelle et brumisation des extérieurs", "Larvicides biologiques pour les points d'eau", "Traitement préventif avant la saison des pluies"],
    service: { slug: "anti-moustiques-cotonou", label: "Anti-moustiques" },
    articles: ["moustiques-au-benin-se-proteger-efficacement-pendant-la-saison-des-pluies", "lutte-anti-moustiques-proteger-sa-famille-toute-lannee", "proteger-bebe-et-la-chambre-denfant-des-moustiques-au-benin"],
    metaTitle: "Moustiques à Cotonou, Traitement Anti-moustiques | Phyto Bénin",
    metaDesc: "Traitement anti-moustiques à Cotonou et au Bénin : élimination des gîtes larvaires, brumisation des extérieurs, protection durable. Devis gratuit.",
    mots: "moustiques Cotonou, anti-moustiques Bénin, gîtes larvaires, brumisation jardin Cotonou, paludisme prévention",
  },
  "punaises-de-lit": {
    nom: "Punaises de lit", emoji: "🛏️",
    h1: "Punaises de lit à Cotonou et au Bénin",
    intro: "Les punaises de lit se cachent dans les matelas et les sommiers, piquent la nuit et se propagent très vite d'une chambre à l'autre, un vrai risque pour les hôtels. On applique un protocole complet (thermique et chimique) pour tout éliminer.",
    signes: ["Piqûres alignées au réveil, surtout sur bras et jambes", "Petites taches de sang et points noirs sur les draps", "Punaises et œufs dans les coutures du matelas et du sommier"],
    methode: ["Inspection minutieuse des chambres et zones de repos", "Traitement thermique et chimique ciblé", "Traitement des textiles, sommiers et plinthes", "Passage de contrôle pour couper le cycle"],
    service: { slug: "punaises-de-lit-cotonou", label: "Punaises de lit" },
    articles: ["punaises-de-lit-dans-un-hotel-a-cotonou-le-protocole-delimination", "punaises-de-lit-comment-les-reconnaitre-et-eviter-une-infestation-chez-soi", "punaises-de-lit-le-guide-complet-pour-sen-debarrasser"],
    metaTitle: "Punaises de Lit à Cotonou, Protocole d'Élimination | Phyto Bénin",
    metaDesc: "Traitement des punaises de lit à Cotonou et au Bénin : protocole thermique et chimique, contrôle anti-rechute. Hôtels et particuliers. Devis gratuit.",
    mots: "punaises de lit Cotonou, punaises de lit hôtel Bénin, traitement punaises de lit, élimination punaises Cotonou",
  },
  serpents: {
    nom: "Serpents", emoji: "🐍",
    h1: "Serpents dans la maison et le jardin au Bénin",
    intro: "Au Bénin, la présence d'un serpent dans la cour ou la maison est fréquente et parfois dangereuse. On intervient en urgence 24h/24 et on sécurise le site pour éviter qu'ils reviennent.",
    signes: ["Serpent aperçu dans la cour, le jardin ou près d'un point d'eau", "Mues (peaux) retrouvées dans les recoins", "Trous et abris possibles le long des murs et sous les débris"],
    methode: ["Intervention d'urgence 24h/24 à Cotonou", "Répulsifs professionnels périmétriques longue durée", "Pose de barrières physiques et grillages", "Suivi post-intervention et contrôle inclus"],
    service: { slug: "reptiles-serpents-benin", label: "Reptiles et Serpents" },
    articles: ["serpent-dans-la-maison-au-benin-que-faire-et-comment-sen-proteger", "serpents-dans-la-cour-et-le-jardin-au-benin-prevenir-et-reagir"],
    metaTitle: "Serpents au Bénin, Intervention d'Urgence 24h/24 | Phyto Bénin",
    metaDesc: "Serpent dans la maison ou le jardin au Bénin ? Intervention d'urgence 24h/24 à Cotonou, sécurisation périmétrique, barrières. Devis gratuit.",
    mots: "serpent maison Bénin, serpent jardin Cotonou, urgence serpent Cotonou, répulsif serpents Bénin",
  },
  geckos: {
    nom: "Geckos et lézards", emoji: "🦎",
    h1: "Geckos et lézards au Bénin",
    intro: "Les geckos sont utiles mais leur prolifération dans les locaux commerciaux, entrepôts et logements salit les surfaces (déjections) et gêne l'activité. On réduit leur présence et on sécurise les accès.",
    signes: ["Nombreux geckos sur les murs et plafonds", "Déjections tachant les surfaces et les stocks", "Attirance vers les zones éclairées la nuit"],
    methode: ["Diagnostic des points d'entrée et sources de lumière/insectes", "Traitement des insectes dont ils se nourrissent", "Répulsifs et sécurisation des ouvertures", "Contrôle de suivi"],
    service: { slug: "reptiles-serpents-benin", label: "Reptiles et Serpents" },
    articles: ["geckos-et-lezards-faut-il-sen-inquieter-au-benin"],
    metaTitle: "Geckos et Lézards au Bénin, Solutions | Phyto Bénin",
    metaDesc: "Prolifération de geckos et lézards au Bénin ? Réduction de leur présence, traitement des insectes-proies, sécurisation des accès. Devis gratuit.",
    mots: "geckos Bénin, lézards maison Cotonou, prolifération geckos entrepôt, anti-geckos Bénin",
  },
  fourmis: {
    nom: "Fourmis", emoji: "🐜",
    h1: "Fourmis dans la maison au Bénin",
    intro: "Les fourmis envahissent cuisines, garde-manger et jardins au Bénin et contaminent les aliments. On traite les colonies à la source, pas seulement les ouvrières visibles.",
    signes: ["Files de fourmis vers la cuisine ou les denrées sucrées", "Nids dans les murs, sous le carrelage ou au jardin", "Retour rapide malgré les insecticides du commerce"],
    methode: ["Localisation des colonies et pistes", "Appâts qui remontent jusqu'à la reine", "Traitement ciblé des points d'entrée", "Conseils de prévention (denrées, humidité)"],
    service: { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
    articles: ["fourmis-dans-la-maison-et-la-cuisine-sen-debarrasser-durablement", "fourmis-dans-le-jardin-et-les-plantes-les-maitriser-sans-tout-abimer"],
    metaTitle: "Fourmis dans la Maison au Bénin, Traitement | Phyto Bénin",
    metaDesc: "Élimination des fourmis à Cotonou et au Bénin : traitement des colonies à la source, appâts ciblés, prévention. Cuisine, maison, jardin. Devis gratuit.",
    mots: "fourmis maison Bénin, anti-fourmis Cotonou, fourmis cuisine, traitement fourmis jardin Bénin",
  },
  mouches: {
    nom: "Mouches", emoji: "🪰",
    h1: "Mouches en restauration et à la maison au Bénin",
    intro: "Les mouches posent un vrai problème d'hygiène en restauration et sur les marchés au Bénin : elles contaminent les aliments et nuisent à l'image. On traite les sources et on pose des solutions durables.",
    signes: ["Présence importante autour des cuisines, poubelles et étals", "Larves dans les déchets organiques et zones humides", "Retour permanent malgré les moyens classiques"],
    methode: ["Identification des sources et zones de ponte", "Pulvérisation résiduelle et appâts adaptés", "Pose de pièges lumineux professionnels", "Conseils de gestion des déchets"],
    service: { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
    articles: ["mouches-en-restauration-pourquoi-elles-reviennent-et-comment-les-eliminer", "moucherons-et-drosophiles-dans-la-cuisine-dou-viennent-ils-et-comment-sen-debarrasser"],
    metaTitle: "Mouches en Restauration au Bénin, Traitement | Phyto Bénin",
    metaDesc: "Traitement anti-mouches à Cotonou et au Bénin : sources de ponte, pièges lumineux, appâts. Restaurants, marchés, cuisines. Devis gratuit.",
    mots: "mouches restaurant Bénin, anti-mouches Cotonou, moucherons cuisine, pièges à mouches Bénin",
  },
  "guepes-et-frelons": {
    nom: "Guêpes et frelons", emoji: "🐝",
    h1: "Guêpes et frelons au Bénin",
    intro: "Un nid de guêpes ou de frelons près de la maison est dangereux, surtout pour les enfants et les personnes allergiques. On retire le nid en sécurité et on traite la zone.",
    signes: ["Va-et-vient d'insectes vers un point fixe (toit, arbre, mur)", "Nid visible sous un auvent, dans un arbre ou une cavité", "Piqûres ou insectes agressifs autour du bâtiment"],
    methode: ["Repérage du nid et évaluation du risque", "Destruction sécurisée avec équipement de protection", "Retrait du nid et traitement de la zone", "Conseils pour éviter une nouvelle installation"],
    service: { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
    articles: ["guepes-et-frelons-que-faire-face-a-un-nid"],
    metaTitle: "Guêpes et Frelons au Bénin, Destruction de Nid | Phyto Bénin",
    metaDesc: "Nid de guêpes ou de frelons au Bénin ? Destruction sécurisée, retrait du nid, traitement de la zone. Intervention rapide. Devis gratuit.",
    mots: "nid de guêpes Bénin, frelons Cotonou, destruction nid guêpes, enlever nid frelons Bénin",
  },
  "puces-et-tiques": {
    nom: "Puces et tiques", emoji: "🐛",
    h1: "Puces et tiques à la maison au Bénin",
    intro: "Puces et tiques s'installent surtout chez les foyers ayant des animaux et piquent aussi les humains. On traite l'habitat en profondeur pour casser le cycle, en complément du traitement de l'animal.",
    signes: ["Piqûres sur les chevilles et les jambes", "Animaux qui se grattent, puces visibles dans les poils", "Tiques accrochées à l'animal ou dans les zones de couchage"],
    methode: ["Traitement des sols, textiles et zones de couchage", "Produits ciblant adultes et larves", "Conseils de coordination avec le vétérinaire", "Passage de contrôle si nécessaire"],
    service: { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
    articles: ["puces-et-tiques-a-la-maison-quand-on-a-des-animaux"],
    metaTitle: "Puces et Tiques à la Maison au Bénin | Phyto Bénin",
    metaDesc: "Traitement des puces et tiques dans l'habitat au Bénin : sols, textiles, zones de couchage. Foyers avec animaux. Devis gratuit.",
    mots: "puces maison Bénin, tiques Cotonou, anti-puces habitat, traitement puces animaux Bénin",
  },
  araignees: {
    nom: "Araignées", emoji: "🕷️",
    h1: "Araignées dans la maison au Bénin",
    intro: "La plupart des araignées sont inoffensives, mais leur prolifération salit les locaux (toiles) et inquiète. On réduit leur présence et les insectes dont elles se nourrissent.",
    signes: ["Multiplication des toiles dans les angles et sous les meubles", "Présence marquée dans les zones sombres et peu ventilées", "Insectes abondants (leur nourriture) dans le bâtiment"],
    methode: ["Traitement des insectes-proies", "Application ciblée dans les recoins et accès", "Dépoussiérage et conseils d'aération", "Contrôle de suivi si besoin"],
    service: { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
    articles: ["araignees-dans-la-maison-au-benin-faut-il-sen-inquieter"],
    metaTitle: "Araignées dans la Maison au Bénin | Phyto Bénin",
    metaDesc: "Réduction des araignées dans l'habitat au Bénin : traitement des insectes-proies, application ciblée, prévention. Devis gratuit.",
    mots: "araignées maison Bénin, anti-araignées Cotonou, toiles araignées, traitement araignées Bénin",
  },
  "mille-pattes-et-scolopendres": {
    nom: "Mille-pattes et scolopendres", emoji: "🐛",
    h1: "Mille-pattes et scolopendres au Bénin",
    intro: "Mille-pattes et scolopendres cherchent l'humidité et entrent dans les maisons, surtout en saison des pluies. Certaines espèces piquent. On traite les points d'entrée et les zones humides.",
    signes: ["Apparition dans les salles de bain, cuisines et garages", "Présence accrue après les pluies", "Zones humides et débris favorisant leur installation"],
    methode: ["Traitement des accès et zones humides", "Réduction de l'humidité et des abris", "Application ciblée en périphérie", "Conseils de prévention"],
    service: { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
    articles: ["mille-pattes-et-scolopendres-dans-la-maison-que-faire"],
    metaTitle: "Mille-pattes et Scolopendres au Bénin | Phyto Bénin",
    metaDesc: "Mille-pattes et scolopendres dans la maison au Bénin : traitement des accès et zones humides, prévention. Devis gratuit.",
    mots: "mille-pattes maison Bénin, scolopendre Cotonou, anti mille-pattes, nuisibles humidité Bénin",
  },
  "poissons-dargent": {
    nom: "Poissons d'argent", emoji: "🐟",
    h1: "Poissons d'argent (lépismes) au Bénin",
    intro: "Les poissons d'argent aiment l'humidité et abîment papiers, livres et textiles. Discrets, ils signalent souvent un problème d'humidité dans le logement. On traite l'infestation et on conseille sur l'humidité.",
    signes: ["Petits insectes argentés dans salles de bain, placards et cartons", "Papiers, livres ou textiles grignotés", "Zones humides et peu ventilées"],
    methode: ["Traitement ciblé des recoins et rangements", "Réduction de l'humidité (source du problème)", "Application dans les points d'entrée", "Contrôle de suivi si besoin"],
    service: { slug: "desinsectisation-cotonou", label: "Désinsectisation" },
    articles: ["poissons-dargent-lepismes-dans-la-maison-faut-il-sinquieter"],
    metaTitle: "Poissons d'Argent (Lépismes) au Bénin | Phyto Bénin",
    metaDesc: "Traitement des poissons d'argent au Bénin : recoins, rangements, gestion de l'humidité. Protection des papiers et textiles. Devis gratuit.",
    mots: "poissons d'argent Bénin, lépismes maison, insectes humidité Cotonou, anti poissons d'argent",
  },
}

export const NUISIBLE_SLUGS = Object.keys(NUISIBLES)

// Libellé lisible d'un article à partir de son slug (pour les liens « à lire »).
export function titreArticle(slug: string): string {
  const t = slug
    .replace(/-a-cotonou|-au-benin|-en-benin/g, "")
    .replace(/-/g, " ")
    .trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
