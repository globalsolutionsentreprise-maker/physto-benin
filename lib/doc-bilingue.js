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
