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
