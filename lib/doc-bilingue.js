// Sortie bilingue (un seul PDF : page FR puis page EN) pour les documents GSE
// déjà rendus en français. On NE modifie PAS le générateur FR (zéro régression) :
// on duplique le bloc <div class="page"> en traduisant les libellés FIXES connus,
// avec un saut de page. Les valeurs saisies (noms, montants, produits, dates)
// restent telles quelles. Piloté par clients.bilingue, comme la fiche de passage.
//
// dict = liste de paires [fr, en] appliquées dans l'ordre : placer les phrases
// LONGUES avant les courtes pour éviter qu'un fragment court n'altère une phrase.

export function translate(s, dict) {
  for (var i = 0; i < dict.length; i++) s = s.split(dict[i][0]).join(dict[i][1])
  return s
}

// Duplique le 1er bloc <div class="page">…</div> traduit, en page suivante.
export function appendEnglishPage(html, dict) {
  if (!html) return html
  var open = html.indexOf('<div class="page"')
  if (open < 0) return html
  var afterOpen = html.indexOf('>', open) + 1
  var re = /<\/?div\b/g
  re.lastIndex = afterOpen
  var depth = 1, m, end = -1
  while ((m = re.exec(html))) {
    if (m[0] === '<div') depth++
    else { depth--; if (depth === 0) { end = html.indexOf('>', m.index) + 1; break } }
  }
  if (end < 0) return html
  var page = translate(html.slice(open, end), dict)
  page = page.replace('<div class="page"', '<div class="page" style="page-break-before:always"')
  return html.slice(0, end) + page + html.slice(end)
}

// Libellés partagés (en-tête, signatures) communs aux documents GSE. Les
// identifiants légaux (agrément, RCCM, IFU) et le pied de page restent inchangés.
export var SHARED_EN = [
  ['Pour Global Solutions Entreprise', 'For Global Solutions Entreprise'],
  ['Signature du client', "Client's signature"],
  ['Bon pour accord', 'Agreed'],
  ['Le Directeur Général', 'Managing Director'],
  ['Réf. ', 'Ref. '],
]

// ---- DEVIS ----
export var DEVIS_EN = [
  ["Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention.", 'The balance may be paid up to 2 weeks after the intervention.'],
  ['TVA non applicable, entreprise non assujettie. Montant net à payer.', 'VAT not applicable (non-taxable business). Net amount payable.'],
  ['Ce devis est valable 30 jours', 'This quote is valid for 30 days'],
  ["Date d'émission", 'Issue date'],
  ['Valide jusqu\'au ', 'Valid until '],
  ['Détail financier', 'Financial details'],
  ['Prix de base', 'Base price'],
  ['Remise accordée (', 'Discount applied ('],
  ['Montant total', 'Total amount'],
  ['Modalités de paiement', 'Payment terms'],
  ['PAIEMENT PAR MOBILE MONEY', 'MOBILE MONEY PAYMENT'],
  ['CODE USSD À COMPOSER :', 'USSD CODE TO DIAL:'],
  ['Acompte de ', 'Deposit of '],
  ['depuis votre téléphone MTN', 'from your MTN phone'],
  ['% à la signature', '% on signing'],
  ['(acompte)', '(deposit)'],
  ['% après prestation', '% after service'],
  ['(solde)', '(balance)'],
  ['Prestation(s)', 'Service(s)'],
  ['>Prestation<', '>Service<'],
  ['>Secteur<', '>Sector<'],
  ['>Surface<', '>Area<'],
  ['>Prix/m²<', '>Price/m²<'],
  ['>Montant<', '>Amount<'],
  ['Forfait', 'Flat rate'],
  ['>DEVIS<', '>QUOTE<'],
].concat(SHARED_EN)

// ---- RAPPORT D'INTERVENTION ----
export var RAPPORT_INTERV_EN = [
  [">RAPPORT D'INTERVENTION<", '>INTERVENTION REPORT<'],
  ["Ouvrez le lien, ou scannez le QR code, pour voir toutes les photos et vidéos de l'intervention.", "Open the link, or scan the QR code, to view all the intervention's photos and videos."],
  ["Album photos &amp; vidéos de l'intervention", 'Intervention photos &amp; videos album'],
  ["Durée de l'intervention", 'Intervention duration'],
  ["Méthode d'application", 'Application method'],
  ['Zones traitées', 'Treated areas'],
  ['Produits utilisés', 'Products used'],
  ['Résultats obtenus', 'Results'],
  ['Recommandations / suivi', 'Recommendations / follow-up'],
  ['Technicien(s)', 'Technician(s)'],
  ['>Prestation<', '>Service<'],
  ['Date : ', 'Date: '],
  ['(photos &amp; vidéos)', '(photos &amp; videos)'],
  ['médias (', 'media ('],
  [' média (', ' media ('],
  ['Scannez', 'Scan'],
].concat(SHARED_EN)

// ---- CERTIFICAT (désinsectisation / dératisation) ----
export var CERT_EN = [
  ['>CERTIFICAT DE DÉSINSECTISATION ET DE DÉRATISATION<', '>DISINSECTION AND RODENT CONTROL CERTIFICATE<'],
  ['>CERTIFICAT DE DÉSINSECTISATION<', '>DISINSECTION CERTIFICATE<'],
  ['>CERTIFICAT DE DÉRATISATION<', '>RODENT CONTROL CERTIFICATE<'],
  ["L'opération de désinsectisation est réalisée par pulvérisation au moyen des produits homologués ci-après. L'opération de dératisation est réalisée par disposition de produit homologué dans les PVC (boîtes d'appâts).", 'The disinsection operation is carried out by spraying the approved products listed below. The rodent control operation is carried out by placing approved product in the PVC bait boxes.'],
  ["L'opération est réalisée par pulvérisation au moyen des produits homologués ci-après.", 'The operation is carried out by spraying the approved products listed below.'],
  ["L'opération est réalisée par disposition de produit homologué dans les PVC (boîtes d'appâts).", 'The operation is carried out by placing approved product in the PVC bait boxes.'],
  ["En foi de quoi le présent certificat est délivré pour servir et valoir ce que de droit.", 'In witness whereof this certificate is issued to serve and avail as of right.'],
  ["L'opération à valider sous quinzaine confère aux locaux une protection durable (mensuelle, bimensuelle ou trimestrielle).", 'The operation, to be confirmed within a fortnight, gives the premises durable protection (monthly, bi-monthly or quarterly).'],
  [" portant réglementation Phytosanitaire en République du Bénin, et ceux sous la supervision des structures Compétentes du Ministère de l'Agriculture, de l'Élevage et de la Pêche (MAEP), de l'exécution de l'opération de ", ' governing Phytosanitary regulation in the Republic of Benin, and under the supervision of the competent bodies of the Ministry of Agriculture, Livestock and Fisheries (MAEP), of the execution of the operation of '],
  ['loi 91-004 du 11 Février 1991', 'law 91-004 of 11 February 1991'],
  [' conformément à la ', ' in accordance with '],
  [' des locaux appartenant à :', ' of the premises belonging to:'],
  ['La Société ', 'The company '],
  [", agissant en qualité d'", ', acting as '],
  ["Référence ", 'Reference '],
  [" dont police d'assurance ", ', insurance policy '],
  ['Certifie', 'Certifies'],
  ['Applicateur Agréé', 'Approved Applicator'],
  ['Entreprise bénéficiaire', 'Beneficiary company'],
  ['N° IFU', 'IFU No.'],
  ['Magasin / Locaux', 'Store / Premises'],
  ['Situation Géographique', 'Location'],
  ['Matières actives', 'Active substances'],
  ['Observations · Homologués par le CNEIP / DPV APV / CNGP-BEN', 'Notes · Approved by CNEIP / DPV APV / CNGP-BEN'],
  ['Désinsectisation :', 'Disinsection:'],
  ['Dératisation :', 'Rodent control:'],
  ["Date d'exécution : ", 'Execution date: '],
  ['du <strong>', 'from <strong>'],
  ['</strong> au <strong>', '</strong> to <strong>'],
  ['du __________ au __________ 2026', 'from __________ to __________ 2026'],
  ['désinsectisation et de dératisation', 'disinsection and rodent control'],
  ['désinsectisation', 'disinsection'],
  ['dératisation', 'rodent control'],
  ['Cotonou le ', 'Cotonou, '],
  ['Réf : ', 'Ref: '],
].concat(SHARED_EN)

// ---- CONTRAT D'ENTRETIEN ----
// Contrat = document contraignant : la page EN est une TRADUCTION DE COURTOISIE.
// Une mention en tête de la page EN précise que la version FRANÇAISE PRÉVAUT en
// cas de divergence (clause standard des contrats bilingues), ce qui neutralise
// le risque d'une traduction automatique imparfaite. La version FR reste intacte.
export var CONTRAT_EN = [
  // Bandeau "version française prévaut", ajouté en tête de la page EN.
  ['<div class="body">', '<div class="body"><div style="border:1px solid #d4a920;background:#fffdf5;border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:11px;color:#555;line-height:1.5"><strong>English translation (for convenience only).</strong> This is a courtesy translation of the French contract. In case of any discrepancy between the two language versions, the <strong>French version prevails</strong>.</div>'],
  // Titre
  [">Contrat d'entretien pluriannuel<", '>Multi-year maintenance contract<'],
  [">Contrat d'entretien annuel<", '>Annual maintenance contract<'],
  // Phrases longues (avant les fragments courts)
  ["Le présent contrat a pour objet la réalisation par GSE d'un programme annuel d'entretien sanitaire conformément aux recommandations du rapport de visite technique et dans le respect de la loi 91-004 du 11 Février 1991 portant réglementation Phytosanitaire en République du Bénin.", "The purpose of this contract is the performance by GSE of an annual sanitary maintenance programme in accordance with the recommendations of the technical visit report and in compliance with law 91-004 of 11 February 1991 governing Phytosanitary regulation in the Republic of Benin."],
  ["GSE ne saurait être tenu responsable des recontaminations résultant du non-respect par le Client des recommandations d'hygiène transmises. Le rapport de visite technique GSE fait foi en cas de litige.", "GSE cannot be held liable for re-infestations resulting from the Client's failure to comply with the hygiene recommendations provided. The GSE technical visit report is authoritative in case of dispute."],
  ["Le tarif annuel peut être révisé à chaque renouvellement sur notification écrite 30 jours avant l'échéance.", 'The annual price may be revised at each renewal upon written notice 30 days before expiry.'],
  // Résiliation en cours de période (ordre nom+adjectif FR -> phrase entière)
  ['Toute résiliation en cours de trimestre ne donne droit à aucun remboursement.', 'Any termination during the current quarter gives no right to any refund.'],
  ['Toute résiliation en cours de semestre ne donne droit à aucun remboursement.', 'Any termination during the current half-year gives no right to any refund.'],
  ['Toute résiliation en cours de mois ne donne droit à aucun remboursement.', 'Any termination during the current month gives no right to any refund.'],
  ["Toute résiliation en cours d'année ne donne droit à aucun remboursement.", 'Any termination during the current year gives no right to any refund.'],
  // Obligation : fiche + attestation après chaque intervention <fréquence>
  ['Remettre une fiche de passage + attestation après chaque intervention trimestrielle.', 'Provide a service visit sheet + certificate after each quarterly intervention.'],
  ['Remettre une fiche de passage + attestation après chaque intervention mensuelle.', 'Provide a service visit sheet + certificate after each monthly intervention.'],
  ['Remettre une fiche de passage + attestation après chaque intervention semestrielle.', 'Provide a service visit sheet + certificate after each half-yearly intervention.'],
  ['Remettre une fiche de passage + attestation après chaque intervention annuelle.', 'Provide a service visit sheet + certificate after each annual intervention.'],
  ['Remettre une fiche de passage + attestation après chaque intervention bimestrielle.', 'Provide a service visit sheet + certificate after each bi-monthly intervention.'],
  ['Remettre une fiche de passage + attestation après chaque intervention quadrimestrielle.', 'Provide a service visit sheet + certificate after each four-monthly intervention.'],
  ["À l'échéance, il est reconduit tacitement pour une durée identique, sauf dénonciation écrite avant le terme.", 'At expiry, it is tacitly renewed for an identical period, unless terminated in writing before the term.'],
  ["La date du premier passage sera fixée d'un commun accord dans les 30 jours suivant la signature.", 'The date of the first visit will be set by mutual agreement within 30 days of signing.'],
  ["Le contrat est conclu pour la durée d'engagement cochée à l'Article 4, à compter de la date de signature.", 'The contract is entered into for the commitment duration ticked in Article 4, from the signature date.'],
  ['Le contrat est conclu pour un engagement ferme de ', 'The contract is entered into for a firm commitment of '],
  [' à compter de la date de signature.', ' from the signature date.'],
  ["GSE peut résilier sans préavis en cas de non-paiement ou d'impossibilité d'accès répétée.", 'GSE may terminate without notice in case of non-payment or repeated impossibility of access.'],
  ['Chaque partie peut résilier le contrat avec un préavis écrit d\'un ', 'Either party may terminate the contract with written notice of one full '],
  [' complet.', '.'],
  ['Toute résiliation en cours ', 'Any termination during a current '],
  [' ne donne droit à aucun remboursement.', ' gives no right to any refund.'],
  ['En cas de résiliation anticipée du Client, ', 'In the event of early termination by the Client, '],
  [' sont dus à GSE.', ' are owed to GSE.'],
  // Obligations
  ['Réaliser les interventions aux dates convenues par des techniciens certifiés.', 'Carry out interventions on the agreed dates with certified technicians.'],
  ["Utiliser exclusivement des produits homologués par l'État du Bénin.", 'Use exclusively products approved by the State of Benin.'],
  ['Remettre une fiche de passage + attestation après chaque intervention ', 'Provide a service visit sheet + certificate after each '],
  ["Transmettre le rapport d'audit annuel au plus tard 15 jours après la dernière intervention.", 'Submit the annual audit report no later than 15 days after the last intervention.'],
  ["Garantir l'accès libre au site dans les 72h suivant la notification de passage par GSE.", "Guarantee free access to the site within 72h of GSE's visit notification."],
  ["Tout refus d'accès injustifié est décompté comme passage effectué.", 'Any unjustified refusal of access is counted as a completed visit.'],
  ["Mettre en œuvre les recommandations d'hygiène émises par GSE.", 'Implement the hygiene recommendations issued by GSE.'],
  ['Informer GSE de tout changement affectant le site.', 'Inform GSE of any change affecting the site.'],
  // Paiement
  ["Le paiement s'effectue par mensualité, en avance, avant le début de chaque mois de prestation.", 'Payment is made monthly, in advance, before the start of each service month.'],
  ["Aucune prestation ne sera réalisée en l'absence de règlement du mois correspondant.", 'No service will be carried out without payment for the corresponding month.'],
  ["Le règlement s'effectue en une seule fois, en avance, avant le démarrage du contrat.", 'Payment is made in a single instalment, in advance, before the contract starts.'],
  ['Le paiement intégral conditionne le lancement des prestations.', 'Full payment is a condition for starting the services.'],
  ['En cas de résiliation anticipée par le Client, les périodes non consommées ne sont pas remboursées.', 'In the event of early termination by the Client, unused periods are not refunded.'],
  ["Le paiement s'effectue par semestre, en avance, avant tout passage semestriel.", 'Payment is made every half-year, in advance, before each half-yearly visit.'],
  ["Aucune prestation ne sera réalisée en l'absence de règlement du semestre correspondant.", 'No service will be carried out without payment for the corresponding half-year.'],
  ["Le paiement s'effectue par trimestre, en avance, avant tout passage trimestriel.", 'Payment is made quarterly, in advance, before each quarterly visit.'],
  ["Aucune prestation ne sera réalisée en l'absence de règlement du trimestre correspondant.", 'No service will be carried out without payment for the corresponding quarter.'],
  ['Les contrôles mensuels intermédiaires sont inclus dans le forfait trimestriel.', 'Intermediate monthly checks are included in the quarterly package.'],
  ['Modes acceptés : espèces, Mobile Money (MTN / Moov), virement bancaire.', 'Accepted methods: cash, Mobile Money (MTN / Moov), bank transfer.'],
  ['Tout retard de paiement supérieur à 10 jours suspend l\'exécution du contrat.', 'Any payment delay over 10 days suspends performance of the contract.'],
  ['Tout retard de paiement supérieur à 15 jours suspend l\'exécution du contrat.', 'Any payment delay over 15 days suspends performance of the contract.'],
  // Article 4 (manuel + grille)
  ["Le Client choisit la durée de son engagement en cochant ", 'The Client chooses the commitment duration by ticking '],
  ["une seule", 'one single'],
  [" case ci-dessous. Le tarif par passage diminue à mesure que l'engagement s'allonge. Prix de référence d'un passage ponctuel : ", ' box below. The price per visit decreases as the commitment lengthens. Reference price of a one-off visit: '],
  ['Le présent contrat porte sur ', 'This contract covers '],
  ['</strong> sur une durée de ', '</strong> over a period of '],
  [', selon le détail ci-dessous.', ', as detailed below.'],
  ['Mise en place complète (1ᵉʳ passage)', 'Full setup (1st visit)'],
  ["Passage d'entretien ", 'Maintenance visit '],
  ['Passage complet ', 'Complete visit '],
  ['Total pour ', 'Total for '],
  ['(le plus avantageux)', '(best value)'],
  ['Base tarifaire :', 'Pricing basis:'],
  ['Engagement ferme de ', 'Firm commitment of '],
  ['Paiement par ', 'Payment by '],
  [', en avance (voir Article 5). TVA non applicable, entreprise non assujettie. Montant net à payer.', ', in advance (see Article 5). VAT not applicable (non-taxable business). Net amount payable.'],
  // Article 3 / lignes de tableau
  ["Audit de conformité sanitaire annuel", 'Annual sanitary compliance audit'],
  ['· Bilan complet du plan IPM sur 12 mois', '· Full review of the IPM plan over 12 months'],
  ['· Rapport écrit utilisable lors de contrôles sanitaires officiels', '· Written report usable during official sanitary inspections'],
  ['Contrôle des stations à rongeurs', 'Rodent station monitoring'],
  ['· Vérification état et consommation des appâts', '· Check condition and consumption of baits'],
  ['· Rechargement si nécessaire', '· Refill if necessary'],
  ['· Rapport succinct transmis au Client', '· Brief report sent to the Client'],
  ["· Traitement insecticide rémanent : murs, plinthes, zones d'ombre", '· Residual insecticide treatment: walls, skirting boards, shaded areas'],
  ['· Dératisation : vérification et rechargement des stations', '· Rodent control: checking and refilling of stations'],
  ['· Désinfection : traitement des surfaces et points de contact', '· Disinfection: treatment of surfaces and contact points'],
  ['· Inspection visuelle complète', '· Full visual inspection'],
  ['· Fiche de passage + Attestation GSE à chaque intervention', '· Service visit sheet + GSE certificate at each intervention'],
  ['(fin de contrat)', '(end of contract)'],
  ['(mensuel, inter-passage)', '(monthly, between visits)'],
  ['Prestation sanitaire (voir devis)', 'Sanitary service (see quote)'],
  // Titres d'articles
  ['Article 1 · Parties contractantes', 'Article 1 · Contracting parties'],
  ['Article 2 · Objet du contrat', 'Article 2 · Purpose of the contract'],
  ['Article 3 · Prestations incluses (', 'Article 3 · Included services ('],
  ["Article 4 · Formule d'engagement (à cocher par le Client)", 'Article 4 · Commitment plan (to be ticked by the Client)'],
  ["Article 4 · Formule d'engagement", 'Article 4 · Commitment plan'],
  ['Article 5 · Modalités de paiement', 'Article 5 · Payment terms'],
  ['Article 6 · Durée et renouvellement', 'Article 6 · Term and renewal'],
  ['Article 7 · Résiliation', 'Article 7 · Termination'],
  ['Article 8 · Obligations des parties', 'Article 8 · Obligations of the parties'],
  ['Article 9 · Limitation de responsabilité', 'Article 9 · Limitation of liability'],
  ['Article 10 · Révision tarifaire', 'Article 10 · Price revision'],
  ['Obligations de GSE', "GSE's obligations"],
  ['Obligations du Client', "Client's obligations"],
  // Parties / libellés
  ['Réf. contrat', 'Contract ref.'],
  ['Date de signature', 'Signature date'],
  ['>Prestataire<', '>Service provider<'],
  ['Société :', 'Company:'],
  ['Agrément :', 'Approval:'],
  ['Adresse :', 'Address:'],
  ['Téléphone :', 'Phone:'],
  ['Email :', 'Email:'],
  ['Dénomination :', 'Name:'],
  ['Représentant :', 'Representative:'],
  ["Type d'établ. :", 'Establishment type:'],
  ['Superficie :', 'Area:'],
  // En-têtes de tableaux
  ['>Fréquence<', '>Frequency<'],
  ["Nature de l'intervention", 'Type of intervention'],
  ['>Détail<', '>Details<'],
  ['>Prestation<', '>Service<'],
  ['>Quantité<', '>Quantity<'],
  ['>Montant total<', '>Total amount<'],
  ['>Montant<', '>Amount<'],
  ['>Engagement<', '>Commitment<'],
  ['>Choix<', '>Choice<'],
  ['Prix / passage', 'Price / visit'],
  ['À Cotonou, le ', 'In Cotonou, on '],
  [' inclus', ' included'],
  // Fréquences
  ['annuelle', 'annual'],
  ['semestrielle', 'half-yearly'],
  ['quadrimestrielle', 'four-monthly'],
  ['trimestrielle', 'quarterly'],
  ['bimestrielle', 'bi-monthly'],
  ['mensuelle', 'monthly'],
  // Périodicités (cas courant), passages, mois
  ['les trimestres restants', 'the remaining quarters'],
  ['les semestres restants', 'the remaining half-years'],
  ['les années restantes', 'the remaining years'],
  ['de trimestre', 'of a quarter'],
  ['de semestre', 'of a half-year'],
  ["d'année", 'of a year'],
  ['trimestre', 'quarter'],
  ['semestre', 'half-year'],
  [' passages', ' visits'],
  [' passage', ' visit'],
  [' / an', ' / year'],
  [' / mois', ' / month'],
  [' mois', ' months'],
].concat(SHARED_EN)
