// Générateurs de fiches GSE (passage + contrôle). Fonctions pures, sans React :
// partagées par le bureau (app/admin/page.js) ET le terrain
// (app/fiche/[token]/page.tsx), pour que Fabrice télécharge la fiche signée sur
// son téléphone et l'envoie au client.
//
// Bilingue : opts.bilingue => le MÊME document (un seul PDF) contient la page FR
// puis la page EN (saut de page entre les deux). Les libellés fixes sont traduits ;
// les valeurs saisies (noms de produits, dates, noms) restent telles quelles,
// seule la locale de date change (fr-FR / en-GB).

export function nomFichierDoc() {
  var parts = []
  for (var i = 0; i < arguments.length; i++) {
    var v = (arguments[i] == null ? "" : String(arguments[i])).trim()
    if (v) parts.push(v)
  }
  return parts.join(" ")
    .replace(/[—–]/g, "-")
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
}

function pick(pair, en) { return en ? pair[1] : pair[0] }

// Enumérations : valeur canonique FR (celle stockée/cochée) + libellé EN.
var PASS_TYPES = [['Contractuel', 'Contractual'], ['Occasionnel', 'One-off'], ['Essai', 'Trial'], ['Contrôle', 'Inspection']]
var PRESTA = [
  ['Désinsectisation', 'Insect control'],
  ['Désinfection', 'Disinfection'],
  ['Dératisation', 'Rodent control'],
  ['Fumigation', 'Fumigation'],
  ['Traitement phytosanitaire espèces verts', 'Green-space phytosanitary treatment'],
]
var NUIS = [['Insectes rampants', 'Crawling insects'], ['Insectes volants', 'Flying insects'], ['Rongeurs', 'Rodents'], ['Microbes', 'Microbes']]
// key, libellé FR, libellé EN
var PRODUITS = [
  ['insecticides', 'Insecticides (Rampants / Volants)', 'Insecticides (crawling / flying)'],
  ['raticides', 'Raticides (Rats / Souris)', 'Rodenticides (rats / mice)'],
  ['desinfectants', 'Désinfectants (Bactéries, virus, champignons)', 'Disinfectants (bacteria, viruses, fungi)'],
  ['fumigants', 'Fumigants', 'Fumigants'],
  ['phytosanitaires', 'Phytosanitaires (espèces vertes)', 'Phytosanitary (green spaces)'],
  ['autres', 'Autres (à préciser)', 'Other (please specify)'],
]
// Niveaux (postes + infestation), stockés en FR, traduits à l'affichage EN.
var NIV = { 'Nul': 'None', 'Faible': 'Low', 'Moyen': 'Medium', 'Modéré': 'Moderate', 'Élevé': 'High', 'Fort': 'High' }
function nivLabel(v, en) { return en ? (NIV[v] || v || '') : (v || '') }

var CHK_STYLE_ON = 'display:inline-block;width:12px;height:12px;border:1.5px solid #333;border-radius:2px;vertical-align:middle;margin-right:4px;background:#0a2e1a;text-align:center;line-height:12px;font-size:9px;color:#fff'
var CHK_STYLE_OFF = 'display:inline-block;width:12px;height:12px;border:1.5px solid #333;border-radius:2px;vertical-align:middle;margin-right:4px;background:#fff;text-align:center;line-height:12px;font-size:9px;color:#fff'
function chk(checked) { return '<span style="' + (checked ? CHK_STYLE_ON : CHK_STYLE_OFF) + '">' + (checked ? '✓' : '') + '</span>' }

var AGR = '<div class="agr">✅ Agrément APA-26-026/CNGP-BEN &nbsp;·&nbsp; Police d\'assurance N°:3901/7010000035 &nbsp;·&nbsp; RCCM: RB/COT/24 B 38910 &nbsp;·&nbsp; IFU: 3202420126111</div>'
var FOOTER = '<div class="footer">Phyto Bénin by GSE (Global Solutions Entreprise) | Applicateur Agréé | Réf. APA-26-026/CNGP-BEN<br>RCCM: RB/COT/24 B 38910 · IFU: 3202420126111 · direction@phyto-benin.com · Cotonou, Bénin</div>'
var LOGO_IMG = '<img src="/logo-gse.png" alt="GSE" style="width:56px;height:56px;object-fit:contain;border-radius:4px;background:#fff;padding:3px">'

function hdr(title, numero) {
  return '<div class="hdr">' +
    '<div class="hdr-left"><div class="sub">Global Solutions Entreprise</div><div class="name">Phyto Bénin by GSE</div></div>' +
    LOGO_IMG +
    '<div class="hdr-right"><div class="title">' + title + '</div><div class="num">N° ' + numero + '</div></div>' +
    '</div>'
}

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// ---------- FICHE DE PASSAGE ----------

function pageFichePassage(form, client, numero, en, brk) {
  var loc = en ? 'en-GB' : 'fr-FR'
  var nomClient = form.nomClient || [(client.prenom || ''), client.nom].filter(Boolean).join(' ')
  var dateAff = form.datePassage ? new Date(form.datePassage).toLocaleDateString(loc) : '__________'
  var dateFinAff = form.dateFinPassage ? new Date(form.dateFinPassage).toLocaleDateString(loc) : ''
  var autresLbl = en ? 'Other' : 'Autres'

  var typesPassageHtml = PASS_TYPES.map(function(t) { return chk(form.typePassage === t[0]) + pick(t, en) }).join('<span style="margin:0 10px;color:#ccc">|</span>')

  var typesPrestHtml = PRESTA.map(function(t) {
    return '<span style="margin-right:14px;white-space:nowrap">' + chk((form.prestations || []).includes(t[0])) + pick(t, en) + '</span>'
  }).join('') +
    (form.autresPrestation
      ? '<span style="margin-right:14px;white-space:nowrap">' + chk(true) + autresLbl + ' : <u>' + form.autresPrestation + '</u></span>'
      : '<span style="margin-right:14px;white-space:nowrap">' + chk(false) + autresLbl + ' ___________</span>')

  var nuisiblesHtml = NUIS.map(function(n) {
    return '<span style="margin-right:14px;white-space:nowrap">' + chk((form.nuisibles || []).includes(n[0])) + pick(n, en) + '</span>'
  }).join('') +
    (form.autresNuisible
      ? '<span style="margin-right:14px;white-space:nowrap">' + chk(true) + autresLbl + ' : <u>' + form.autresNuisible + '</u></span>'
      : '<span style="margin-right:14px;white-space:nowrap">' + chk(false) + autresLbl + ' ___________</span>')

  var produitsHtml = PRODUITS.map(function(cat) {
    var coched = (form.produitsCoches || []).includes(cat[0])
    var nom = (form.produits || {})[cat[0]] || ''
    var label = en ? cat[2] : cat[1]
    return '<tr>' +
      '<td style="border:1px solid #ccc;padding:7px 10px;white-space:nowrap">' + chk(coched) + label + '</td>' +
      '<td style="border:1px solid #ccc;padding:7px 10px;color:#0a2e1a;font-weight:' + (nom ? '600' : '400') + '">' + (nom || '<span style="color:#ccc">___________________________</span>') + '</td>' +
      '</tr>'
  }).join('')

  var horairesHtml = (form.journees && form.journees.length)
    ? '<table style="width:100%;border-collapse:collapse;font-size:12.5px">' +
      form.journees.map(function(j) {
        var jd = j.date ? new Date(j.date).toLocaleDateString(loc) : '__________'
        var h = (j.debut || j.fin) ? ((en ? 'from ' : 'de ') + (j.debut || '____') + (en ? ' to ' : ' à ') + (j.fin || '____')) : '__________'
        return '<tr>' +
          '<td style="padding:4px 14px 4px 0;font-weight:700;color:#0a2e1a;white-space:nowrap;border-bottom:1px solid #eee;width:1%">' + jd + '</td>' +
          '<td style="padding:4px 0;border-bottom:1px solid #eee">' + h + '</td>' +
          '</tr>'
      }).join('') +
      '</table>'
    : '<div style="display:flex;align-items:baseline;gap:12px;font-size:13px">' +
      (en ? 'from ' : 'de ') + '<span style="border-bottom:1px solid #999;min-width:120px;display:inline-block;padding-bottom:1px">&nbsp;' + (form.dureeDebut || '') + '&nbsp;</span>' +
      (en ? 'to ' : 'à ') + '<span style="border-bottom:1px solid #999;min-width:120px;display:inline-block;padding-bottom:1px">&nbsp;' + (form.dureeFin || '') + '&nbsp;</span>' +
      '</div>'

  var periodeLbl = dateFinAff ? (en ? 'Visit period' : 'Période de passage') : (en ? 'Visit date' : 'Date de passage')
  var periodeVal = dateFinAff ? ((en ? 'from ' : 'du ') + dateAff + (en ? ' to ' : ' au ') + dateFinAff) : dateAff

  var valeur = en
    ? '<strong style="color:#0a2e1a">Legal value.</strong> Drawn up and signed by the Global Solutions Entreprise technician at the end of the intervention, this sheet is authoritative and serves as proof of visit and of performance of the service, including in the absence of the client\'s signature.'
    : '<strong style="color:#0a2e1a">Valeur du document.</strong> Établie et signée par le technicien de Global Solutions Entreprise à l\'issue de l\'intervention, la présente fiche fait foi et vaut preuve de passage et d\'exécution de la prestation, y compris en l\'absence de signature du client.'

  return '<div class="page"' + (brk ? ' style="page-break-before:always;margin-top:30px"' : '') + '>' +
    hdr(en ? 'Service Visit Sheet' : 'Fiche de Passage', numero) +
    AGR +
    '<div class="body">' +

    '<div style="margin-bottom:16px">' +
    '<div class="section-title">' + (en ? 'Client information' : 'Informations client') + '</div>' +
    '<div class="field-row"><span class="field-label">' + (en ? 'Client name' : 'Nom du client') + '</span><span class="field-value">' + nomClient + '</span></div>' +
    '<div class="field-row"><span class="field-label">' + (en ? 'Address' : 'Adresse') + '</span><span class="field-value">' + (form.adresse || '') + '</span></div>' +
    '<div style="display:flex;gap:24px">' +
    '<div class="field-row" style="flex:1"><span class="field-label">' + (en ? 'Tel.' : 'Tél.') + '</span><span class="field-value">' + (form.tel || '') + '</span></div>' +
    '<div class="field-row" style="flex:1"><span class="field-label">Mob.</span><span class="field-value">' + (form.mob || '') + '</span></div>' +
    '</div>' +
    '</div>' +

    '<div style="margin-bottom:14px"><div class="section-title">' + (en ? 'Visit type' : 'Type de passage') + '</div><div class="chk-row">' + typesPassageHtml + '</div></div>' +
    '<div style="margin-bottom:14px"><div class="section-title">' + (en ? 'Service type' : 'Type de prestation') + '</div><div class="chk-row">' + typesPrestHtml + '</div></div>' +
    '<div style="margin-bottom:14px"><div class="section-title">' + (en ? 'Service location' : 'Lieu de prestation') + '</div><div class="field-row"><span class="field-value">' + (form.lieuPrestation || '') + '</span></div></div>' +
    '<div style="margin-bottom:14px"><div class="section-title">' + (en ? 'Pests present' : 'Nuisibles présents') + '</div><div class="chk-row">' + nuisiblesHtml + '</div></div>' +

    '<div style="margin-bottom:16px">' +
    '<div class="section-title">' + (en ? 'Phytopharmaceutical products applied' : 'Nom des produits phytopharmaceutiques appliqués') + '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-top:6px">' +
    '<thead><tr>' +
    '<th style="background:#0a2e1a;color:#fff;padding:7px 10px;text-align:left;font-size:11px;width:52%;border:1px solid #0a2e1a">' + (en ? 'Product category' : 'Catégorie de produit') + '</th>' +
    '<th style="background:#0a2e1a;color:#fff;padding:7px 10px;text-align:left;font-size:11px;border:1px solid #0a2e1a">' + (en ? 'Product used' : 'Produit utilisé') + '</th>' +
    '</tr></thead><tbody>' + produitsHtml + '</tbody></table>' +
    '</div>' +

    '<div style="margin-bottom:14px"><div class="section-title">' + (en ? 'Intervention schedule' : 'Horaires d\'intervention') + '</div>' + horairesHtml + '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">' +
    '<div>' +
    '<div class="section-title" style="margin-bottom:8px">' + periodeLbl + '</div>' +
    '<div style="font-size:14px;font-weight:700;color:#0a2e1a">' + periodeVal + '</div>' +
    '</div>' +
    '<div></div>' +
    '<div>' +
    '<div class="sig-title">' + (en ? 'For the client · Full name' : 'Pour le client · Nom & Prénom(s)') + '</div>' +
    '<div class="sig-zone">' +
    (form.signatureClient ? '<img src="' + form.signatureClient + '" alt="Signature" style="max-height:60px;max-width:100%;display:block;margin-bottom:2px">' : '') +
    (form.clientSignataire ? '<div style="font-weight:700;font-size:12px;color:#0a2e1a">' + form.clientSignataire + '</div>' : '') +
    '</div>' +
    '</div>' +
    '<div>' +
    '<div class="sig-title">' + (en ? 'For Global Solutions Entreprise' : 'Pour Global Solutions Entreprise') + '</div>' +
    '<div class="sig-zone">' +
    (form.signatureTech ? '<img src="' + form.signatureTech + '" alt="Signature" style="max-height:60px;max-width:100%;display:block;margin-bottom:2px">' : '') +
    (form.superviseurNom ? '<div style="font-weight:700;font-size:12px;color:#0a2e1a">' + form.superviseurNom + '</div>' : '') +
    (form.superviseurContact ? '<div style="font-size:11px;color:#666;margin-top:2px">' + form.superviseurContact + '</div>' : '') +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div style="margin-top:4px;border:1px solid #d4a920;background:#fffdf5;border-radius:6px;padding:8px 12px;font-size:10.5px;color:#555;line-height:1.5;text-align:center">' + valeur + '</div>' +

    '</div>' +
    FOOTER +
    '</div>'
}

var STYLE_FICHE =
  '<style>' +
  '* { box-sizing: border-box; margin: 0; padding: 0; }' +
  'body { font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; color: #111; background: #f5f5f0; }' +
  '.noprint { text-align: center; padding: 12px; background: #f0fdf4; border-bottom: 1px solid #bbf7d0; }' +
  '.noprint button { background: #0a2e1a; color: #d4a920; border: none; border-radius: 6px; padding: 9px 24px; font-size: 13px; font-weight: 700; cursor: pointer; margin: 4px; font-family: inherit; }' +
  '.noprint button.sec { background: #fff; color: #0a2e1a; border: 1px solid #0a2e1a; }' +
  '.page { max-width: 780px; margin: 0 auto; background: #fff; position: relative; isolation: isolate; }' +
  '.page::before { content: ""; position: absolute; inset: 0; background: url("/logo-gse.png") no-repeat center 44%; background-size: min(70%, 520px); opacity: 0.06; z-index: -1; pointer-events: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
  '.hdr { background: #0a2e1a; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; }' +
  '.hdr-left .sub { color: #d4a920; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 4px; }' +
  '.hdr-left .name { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.03em; }' +
  '.hdr-right { text-align: right; }' +
  '.hdr-right .title { color: #fff; font-size: 15px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }' +
  '.hdr-right .num { color: #d4a920; font-size: 13px; font-weight: 700; margin-top: 4px; }' +
  '.agr { background: #d4a920; padding: 5px 12px; font-size: 10px; color: #0a2e1a; font-weight: 700; letter-spacing: 0.06em; }' +
  '.body { padding: 22px 28px; }' +
  '.section-title { font-size: 10px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid #0a2e1a; padding-bottom: 4px; margin-bottom: 10px; }' +
  '.field-row { display: flex; gap: 0; margin-bottom: 8px; align-items: baseline; }' +
  '.field-label { font-weight: 700; color: #555; min-width: 90px; font-size: 11.5px; }' +
  '.field-value { flex: 1; border-bottom: 1px solid #999; min-height: 18px; padding-bottom: 2px; font-size: 12.5px; }' +
  '.chk-row { line-height: 2; }' +
  '.box { border: 1px solid #ccc; border-radius: 4px; min-height: 54px; padding: 10px; font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; }' +
  '.sig-zone { border: 1px solid #ccc; border-radius: 6px; padding: 12px; min-height: 80px; }' +
  '.sig-title { font-size: 10px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }' +
  '.footer { background: #f0ede6; border-top: 1px solid #e0ddd6; padding: 8px 28px; text-align: center; font-size: 10px; color: #888; line-height: 1.6; }' +
  '@media print {' +
  '  @page { size: A4 portrait; margin: 7mm 10mm; }' +
  '  .noprint { display: none; }' +
  '  body { background: #fff; font-size: 10px; }' +
  '  .page { max-width: 100%; margin-top: 0 !important; }' +
  '  .hdr { padding: 10px 20px; }' +
  '  .hdr-left .name { font-size: 15px; }' +
  '  .hdr-right .title { font-size: 12px; }' +
  '  .hdr-right .num { font-size: 11px; }' +
  '  .agr { padding: 3px 10px; font-size: 8.5px; }' +
  '  .body { padding: 10px 20px; }' +
  '  .section-title { font-size: 8.5px; margin-bottom: 5px; padding-bottom: 2px; }' +
  '  .field-row { margin-bottom: 4px; }' +
  '  .field-label { font-size: 9.5px; min-width: 70px; }' +
  '  .field-value { font-size: 10px; }' +
  '  .chk-row { line-height: 1.6; font-size: 10px; }' +
  '  .box { min-height: 34px; }' +
  '  .sig-zone { min-height: 44px; padding: 6px; }' +
  '  .sig-title { font-size: 8.5px; }' +
  '  .footer { padding: 5px 20px; font-size: 8.5px; }' +
  '  table td, table th { padding: 4px 8px !important; font-size: 9.5px; }' +
  '  [style*="min-height:60px"] { min-height: 32px !important; }' +
  '  [style*="margin-bottom:16px"], [style*="margin-bottom:14px"] { margin-bottom: 7px !important; }' +
  '  [style*="gap:20px"] { gap: 10px !important; }' +
  '}' +
  '</style>'

var NOPRINT = '<div class="noprint"><button onclick="window.print()">🖨️ Imprimer / PDF</button><button class="sec" onclick="window.close()">Fermer</button></div>'

export function buildFichePassageHtml(form, client, numero, medias, opts) {
  var bilingue = !!(opts && opts.bilingue)
  var title = nomFichierDoc('Fiche_passage', numero, (client && (client.entreprise || client.nom)) || '')
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    '<title>' + title + '</title>' + STYLE_FICHE + '</head><body>' +
    NOPRINT +
    pageFichePassage(form, client || {}, numero, false, false) +
    (bilingue ? pageFichePassage(form, client || {}, numero, true, true) : '') +
    '</body></html>'
}

// ---------- FICHE DE CONTRÔLE ----------

function pageFicheControle(fiche, client, numero, medias, en, brk) {
  var loc = en ? 'en-GB' : 'fr-FR'
  var cd = (fiche && fiche.controle_data) || {}
  var postes = cd.postes || {}
  var infestation = cd.infestation || {}
  var nomClient = (client && (client.entreprise || [(client.prenom || ''), client.nom].filter(Boolean).join(' '))) || (fiche && fiche.superviseur_nom) || ''
  var adresse = (client && client.adresse) || ''
  var lieu = (fiche && fiche.lieu_prestation) || ''
  var dateAff = (fiche && fiche.date_passage) ? new Date(fiche.date_passage).toLocaleDateString(loc) : '__________'
  var dateFinAff = (fiche && fiche.date_fin_passage) ? new Date(fiche.date_fin_passage).toLocaleDateString(loc) : ''
  var prochain = cd.prochainPassage ? new Date(cd.prochainPassage).toLocaleDateString(loc) : ''
  function couleurNiveau(v) { return v === 'Nul' ? '#16a34a' : v === 'Élevé' ? '#dc2626' : (v ? '#d97706' : '#999') }

  var infestHtml = NUIS.map(function(n) {
    var v = infestation[n[0]] || ''
    return '<tr>' +
      '<td style="border:1px solid #ccc;padding:6px 10px">' + pick(n, en) + '</td>' +
      '<td style="border:1px solid #ccc;padding:6px 10px;font-weight:700;color:' + couleurNiveau(v) + '">' + (v ? nivLabel(v, en) : '<span style="color:#ccc">·</span>') + '</td>' +
      '</tr>'
  }).join('')

  var sigClient = ((fiche && fiche.signature_client_data_url) || cd.signatureDataUrl) || ''
  var nomSignClient = ((fiche && fiche.client_signataire) || cd.clientSignataire) || ''
  var valeur = en
    ? '<strong style="color:#0a2e1a">Legal value.</strong> Drawn up and signed by the Global Solutions Entreprise technician during the control visit, this sheet is authoritative and serves as proof of the control visit, including in the absence of the client\'s signature.'
    : '<strong style="color:#0a2e1a">Valeur du document.</strong> Établie et signée par le technicien de Global Solutions Entreprise lors de la visite de contrôle, la présente fiche fait foi et vaut preuve de passage de contrôle, y compris en l\'absence de signature du client.'

  return '<div class="page"' + (brk ? ' style="page-break-before:always;margin-top:30px"' : '') + '>' +
    hdr(en ? 'Control Visit Sheet' : 'Fiche de Contrôle', numero) +
    AGR +
    '<div class="body">' +

    '<div style="margin-bottom:16px">' +
    '<div class="section-title">' + (en ? 'Client information' : 'Informations client') + '</div>' +
    '<div class="field-row"><span class="field-label">Client</span><span class="field-value">' + esc(nomClient) + '</span></div>' +
    '<div class="field-row"><span class="field-label">' + (en ? 'Site / location' : 'Site / lieu') + '</span><span class="field-value">' + esc(lieu || adresse) + '</span></div>' +
    '<div class="field-row"><span class="field-label">' + (dateFinAff ? (en ? 'Control period' : 'Période du contrôle') : (en ? 'Control date' : 'Date du contrôle')) + '</span><span class="field-value">' + (dateFinAff ? ((en ? 'from ' : 'du ') + dateAff + (en ? ' to ' : ' au ') + dateFinAff) : dateAff) + '</span></div>' +
    '</div>' +

    '<div style="margin-bottom:16px">' +
    '<div class="section-title">' + (en ? 'Bait station survey' : 'Relevé des postes d\'appâtage') + '</div>' +
    '<div style="display:flex;gap:24px;margin-bottom:6px">' +
    '<div class="field-row" style="flex:1"><span class="field-label">' + (en ? 'Installed' : 'Installés') + '</span><span class="field-value">' + esc(postes.installes) + '</span></div>' +
    '<div class="field-row" style="flex:1"><span class="field-label">' + (en ? 'Consumed' : 'Consommés') + '</span><span class="field-value">' + esc(postes.actifs) + '</span></div>' +
    '<div class="field-row" style="flex:1"><span class="field-label">' + (en ? 'Consumption' : 'Consommation') + '</span><span class="field-value" style="font-weight:700;color:' + couleurNiveau(postes.niveau) + '">' + esc(nivLabel(postes.niveau, en)) + '</span></div>' +
    '</div>' +
    '<div class="field-row"><span class="field-label">' + (en ? 'Moved / refilled' : 'Déplacés / rechargés') + '</span><span class="field-value">' + esc(postes.remarque) + '</span></div>' +
    '</div>' +

    '<div style="margin-bottom:16px">' +
    '<div class="section-title">' + (en ? 'Observed infestation level' : 'Niveau d\'infestation constaté') + '</div>' +
    '<table style="width:100%;border-collapse:collapse"><thead><tr>' +
    '<th style="background:#0a2e1a;color:#fff;padding:6px 10px;text-align:left;font-size:11px;border:1px solid #0a2e1a;width:60%">' + (en ? 'Pest' : 'Nuisible') + '</th>' +
    '<th style="background:#0a2e1a;color:#fff;padding:6px 10px;text-align:left;font-size:11px;border:1px solid #0a2e1a">' + (en ? 'Level' : 'Niveau') + '</th>' +
    '</tr></thead><tbody>' + infestHtml + '</tbody></table>' +
    '</div>' +

    '<div style="margin-bottom:16px"><div class="section-title">' + (en ? 'Findings' : 'Constat') + '</div><div class="box">' + esc(cd.constat) + '</div></div>' +
    '<div style="margin-bottom:16px"><div class="section-title">' + (en ? 'Recommendations / corrective actions' : 'Recommandations / actions correctives') + '</div><div class="box">' + esc(cd.recommandations) + '</div></div>' +

    (prochain ? '<div class="field-row" style="margin-bottom:16px"><span class="field-label">' + (en ? 'Next visit' : 'Prochain passage') + '</span><span class="field-value" style="font-weight:700;color:#0a2e1a">' + prochain + '</span></div>' : '') +

    ((medias && medias.length)
      ? '<div style="margin-bottom:16px"><div class="section-title">' + (en ? 'Control photos / videos' : 'Photos / vidéos du contrôle') + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
        medias.map(function(m) {
          var isImg = String(m.type || '').indexOf('image') === 0
          var media = isImg
            ? '<img src="' + (m.url || '') + '" style="width:150px;height:150px;object-fit:cover;border:1px solid #ccc;border-radius:6px;display:block">'
            : '<a href="' + (m.url || '#') + '" style="display:flex;align-items:center;justify-content:center;width:150px;height:150px;border:1px solid #ccc;border-radius:6px;background:#f3f4f6;color:#0a2e1a;text-decoration:none;font-size:13px;text-align:center">🎬 ' + (en ? 'Video<br>(view online)' : 'Vidéo<br>(voir en ligne)') + '</a>'
          var cap = m.note ? '<div style="width:150px;font-size:11px;color:#333;line-height:1.4;margin-top:3px">' + m.note + '</div>' : ''
          return '<div style="width:150px">' + media + cap + '</div>'
        }).join('') +
        '</div></div>'
      : '') +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">' +
    '<div>' +
    '<div class="sig-title">' + (en ? 'For the client · Full name' : 'Pour le client · Nom & Prénom(s)') + '</div>' +
    '<div class="sig-zone">' +
    (sigClient ? '<img src="' + sigClient + '" alt="Signature" style="max-height:60px;max-width:100%;display:block;margin-bottom:2px">' : '') +
    (nomSignClient ? '<div style="font-weight:700;font-size:12px;color:#0a2e1a">' + esc(nomSignClient) + '</div>' : '') +
    '</div>' +
    '</div>' +
    '<div>' +
    '<div class="sig-title">' + (en ? 'For Global Solutions Entreprise' : 'Pour Global Solutions Entreprise') + '</div>' +
    '<div class="sig-zone">' +
    ((fiche && fiche.signature_tech_data_url) ? '<img src="' + fiche.signature_tech_data_url + '" alt="Signature" style="max-height:60px;max-width:100%;display:block;margin-bottom:2px">' : '') +
    ((fiche && fiche.superviseur_nom) ? '<div style="font-weight:700;font-size:12px;color:#0a2e1a">' + esc(fiche.superviseur_nom) + '</div>' : '') +
    ((fiche && fiche.superviseur_contact) ? '<div style="font-size:11px;color:#666;margin-top:2px">' + esc(fiche.superviseur_contact) + '</div>' : '') +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div style="margin-top:4px;border:1px solid #d4a920;background:#fffdf5;border-radius:6px;padding:8px 12px;font-size:10.5px;color:#555;line-height:1.5;text-align:center">' + valeur + '</div>' +

    '</div>' +
    FOOTER +
    '</div>'
}

export function buildFicheControleHtml(fiche, client, numero, medias, opts) {
  var bilingue = !!(opts && opts.bilingue)
  var title = nomFichierDoc('Fiche_controle', numero, (client && (client.entreprise || client.nom)) || '')
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    '<title>' + title + '</title>' + STYLE_FICHE + '</head><body>' +
    NOPRINT +
    pageFicheControle(fiche, client || {}, numero, medias, false, false) +
    (bilingue ? pageFicheControle(fiche, client || {}, numero, medias, true, true) : '') +
    '</body></html>'
}
