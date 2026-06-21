import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  try {
    const url              = new URL(req.url)
    const devisId          = url.searchParams.get("devisId")
    const prixAnnuel       = parseInt(url.searchParams.get("prixAnnuel") || "200000")
    const prixTrim         = parseInt(url.searchParams.get("prixTrimestre") || "50000")
    const formule          = url.searchParams.get("formule") || "Formule Intégrale"
    const passages         = parseInt(url.searchParams.get("passages") || "4")
    const controles        = parseInt(url.searchParams.get("controles") || "8")
    const duree            = parseInt(url.searchParams.get("duree") || "12")
    const typeEtablissement = url.searchParams.get("typeEtablissement") || ""
    const paiement         = url.searchParams.get("paiement") || "trimestriel_avance"
    const remisePassed     = parseInt(url.searchParams.get("remise") || "0")
    const sansNoteDevis    = url.searchParams.get("sansNoteDevis") === "1"

    if (!devisId) return NextResponse.json({ error: "devisId requis" }, { status: 400 })

    const { data: devis } = await supabase
      .from("devis")
      .select("*, clients(*)")
      .eq("id", devisId)
      .single()

    if (!devis) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })

    const client     = devis.clients || {}
    const nomClient  = [client.prenom, client.nom].filter(Boolean).join(" ")
    const entreprise = client.entreprise || nomClient
    const adresse    = client.adresse || "Cotonou, Bénin"
    const telephone  = client.telephone || "_______________"
    const superficie = devis.superficie ? devis.superficie.toLocaleString("fr-FR") + " m²" : "_______________"
    const montant    = (devis.montant_total || devis.montant || 0).toLocaleString("fr-FR")
    const typeEtabLabel = typeEtablissement || "_______________"
    const prestationLabel = Array.isArray(devis.prestations) && devis.prestations.length > 0
      ? devis.prestations.join(" + ")
      : devis.prestation || "Désinsectisation + Dératisation"

    const today  = new Date()
    const annee  = today.getFullYear()
    const dateJour = today.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, " / ")

    // Calcul des initiales
    const prenom = (client.prenom || "").trim().toUpperCase()
    const nom    = (client.nom    || "").trim().toUpperCase()
    const ent    = (client.entreprise || "").trim().toUpperCase()
    let initiales
    if (prenom && nom) {
      initiales = prenom[0] + nom[0]
    } else if (nom.length >= 2) {
      initiales = nom[0] + nom[nom.length - 1]
    } else if (ent.length >= 2) {
      initiales = ent[0] + ent[ent.length - 1]
    } else {
      initiales = (nom[0] || ent[0] || "X").repeat(2)
    }

    // Référence : réutiliser si contrat déjà généré pour ce devis
    let contratRef
    const { data: contratExistant } = await supabase
      .from("contrats")
      .select("reference")
      .eq("devis_id", devisId)
      .maybeSingle()

    if (contratExistant?.reference) {
      contratRef = contratExistant.reference
    } else {
      const { count } = await supabase
        .from("contrats")
        .select("*", { count: "exact", head: true })
        .eq("annee", annee)
      const seq = String((count || 0) + 1).padStart(3, "0")
      contratRef = `CONT-${annee}-${initiales}-GSE-${seq}`
      await supabase.from("contrats").insert({
        devis_id:        devisId,
        client_id:       devis.client_id,
        reference:       contratRef,
        annee,
        date_generation: today.toISOString().slice(0, 10),
        params: {
          prixAnnuel, prixTrim, formule, passages, controles,
          duree, paiement, typeEtablissement, remisePassed, sansNoteDevis
        }
      })
    }

    const remisePct  = remisePassed > 0 ? remisePassed : (prixTrim * 4 > 0 ? Math.round((1 - prixAnnuel / (prixTrim * 4)) * 100) : 0)
    const prixRef    = remisePct > 0 ? Math.round(prixAnnuel / (1 - remisePct / 100)) : prixTrim * 4
    const remiseMontant = prixRef - prixAnnuel

    function esc(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    }

    function artTitle(text) {
      return `<div class="art-title">${esc(text)}</div>`
    }

    function li(text) {
      return `<li>${esc(text)}</li>`
    }

    function frequenceLabel() {
      if (passages === 1) return "(annuelle)"
      if (passages === 2) return "(semestrielle)"
      if (passages === 3) return "(quadrimestrielle)"
      if (passages === 4) return "(trimestrielle)"
      if (passages === 6) return "(bimestrielle)"
      if (passages === 12) return "(mensuelle)"
      return `(× ${passages}/an)`
    }

    const periodicite        = passages <= 1 ? "an"      : passages === 2 ? "semestre" : passages >= 12 ? "mois" : "trimestre"
    const periodiciteEnCours = passages <= 1 ? "d'année" : `de ${passages === 2 ? "semestre" : passages >= 12 ? "mois" : "trimestre"}`
    const periodiciteRestants = passages <= 1 ? "les années restantes" : `les ${periodicite}s restants`

    function paiementArticle() {
      if (paiement === "mensuel") return `
        <ul class="clauses">
          ${li("Le paiement s'effectue par mensualité, en avance, avant le début de chaque mois de prestation.")}
          ${li("Aucune prestation ne sera réalisée en l'absence de règlement du mois correspondant.")}
          ${li("Modes acceptés : espèces, Mobile Money (MTN / Moov), virement bancaire.")}
          ${li("Tout retard de paiement supérieur à 10 jours suspend l'exécution du contrat.")}
        </ul>`
      if (paiement === "annuel") return `
        <ul class="clauses">
          ${li("Le règlement s'effectue en une seule fois, en avance, avant le démarrage du contrat.")}
          ${li("Le paiement intégral conditionne le lancement des prestations.")}
          ${li("Modes acceptés : espèces, Mobile Money (MTN / Moov), virement bancaire.")}
          ${li("En cas de résiliation anticipée par le Client, les périodes non consommées ne sont pas remboursées.")}
        </ul>`
      if (paiement === "semestriel") return `
        <ul class="clauses">
          ${li("Le paiement s'effectue par semestre, en avance, avant tout passage semestriel.")}
          ${li("Aucune prestation ne sera réalisée en l'absence de règlement du semestre correspondant.")}
          ${li("Modes acceptés : espèces, Mobile Money (MTN / Moov), virement bancaire.")}
          ${li("Tout retard de paiement supérieur à 15 jours suspend l'exécution du contrat.")}
        </ul>`
      return `
        <ul class="clauses">
          ${li("Le paiement s'effectue par trimestre, en avance, avant tout passage trimestriel.")}
          ${li("Aucune prestation ne sera réalisée en l'absence de règlement du trimestre correspondant.")}
          ${li("Les contrôles mensuels intermédiaires sont inclus dans le forfait trimestriel.")}
          ${li("Modes acceptés : espèces, Mobile Money (MTN / Moov), virement bancaire.")}
          ${li("Tout retard de paiement supérieur à 15 jours suspend l'exécution du contrat.")}
        </ul>`
    }

    function paiementLabel() {
      if (paiement === "mensuel") return `Paiement mensuel en avance`
      if (paiement === "annuel") return `Paiement annuel en avance (intégral)`
      if (paiement === "semestriel") return `Paiement semestriel en avance`
      return `Paiement trimestriel en avance`
    }

    function paiementMontant() {
      if (paiement === "mensuel") return `${Math.round(prixAnnuel / 12).toLocaleString("fr-FR")} FCFA / mois`
      if (paiement === "annuel") return `${prixAnnuel.toLocaleString("fr-FR")} FCFA (règlement unique)`
      if (paiement === "semestriel") return `${Math.round(prixAnnuel / 2).toLocaleString("fr-FR")} FCFA / semestre`
      return `${prixTrim.toLocaleString("fr-FR")} FCFA / trimestre`
    }

    const controleRow = controles > 0 ? `
      <tr>
        <td>× ${controles} / an<br><small>(mensuel, inter-passage)</small></td>
        <td>Contrôle des stations à rongeurs</td>
        <td>
          — Vérification état et consommation des appâts<br>
          — Rechargement si nécessaire<br>
          — Rapport succinct transmis au Client
        </td>
      </tr>` : ""

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Contrat ${esc(entreprise)} — GSE</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; background: #f5f5f0; }
.noprint { text-align: center; padding: 12px; background: #f0fdf4; border-bottom: 1px solid #bbf7d0; }
.noprint button { background: #0a2e1a; color: #d4a920; border: none; border-radius: 6px; padding: 9px 24px; font-size: 13px; font-weight: 700; cursor: pointer; margin: 4px; font-family: inherit; }
.noprint button.sec { background: #fff; color: #0a2e1a; border: 1px solid #0a2e1a; }
.page { max-width: 780px; margin: 0 auto; background: #fff; }
.hdr { background: #0a2e1a; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; }
.hdr-left .sub { color: #d4a920; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 4px; }
.hdr-left .name { color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 0.03em; }
.hdr-right { text-align: right; }
.hdr-right .title { color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.hdr-right .ref { color: #d4a920; font-size: 12px; margin-top: 4px; }
.agr { background: #d4a920; padding: 5px 12px; font-size: 10px; color: #0a2e1a; font-weight: 700; letter-spacing: 0.06em; }
.body { padding: 24px 32px; }
.ref-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 20px; }
.ref-cell { background: #f5f5f0; border-radius: 6px; padding: 10px 12px; text-align: center; }
.ref-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
.ref-value { font-size: 13px; font-weight: 700; color: #0a2e1a; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
.party-box { background: #f5f5f0; border-radius: 6px; padding: 12px 14px; }
.party-title { font-size: 10px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #0a2e1a; padding-bottom: 4px; margin-bottom: 8px; }
.party-row { display: flex; gap: 6px; margin-bottom: 4px; font-size: 11.5px; line-height: 1.4; }
.party-key { font-weight: 700; color: #555; min-width: 90px; flex-shrink: 0; }
.party-val { color: #111; }
.art-title { font-size: 11px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #0a2e1a; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; }
p.art-text { font-size: 12px; line-height: 1.65; margin-bottom: 8px; }
.note-box { background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 6px; padding: 10px 14px; font-size: 11.5px; color: #065f46; margin-bottom: 12px; }
table.services { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11.5px; }
table.services th { background: #0a2e1a; color: #d4a920; padding: 7px 10px; text-align: left; font-size: 11px; }
table.services td { border: 1px solid #ccc; padding: 7px 10px; vertical-align: top; line-height: 1.5; }
table.services tr:nth-child(odd) td { background: #fafaf8; }
table.finances { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 12px; }
table.finances th { background: #0a2e1a; color: #d4a920; padding: 7px 12px; text-align: left; }
table.finances td { border: 1px solid #ddd; padding: 7px 12px; }
table.finances tr.total td { background: #0a2e1a; color: #d4a920; font-weight: 700; font-size: 13px; }
table.finances tr.alt td { background: #f5f5f0; }
ul.clauses { padding-left: 18px; margin-bottom: 10px; }
ul.clauses li { margin-bottom: 5px; font-size: 12px; line-height: 1.55; }
.sub-title { font-size: 12px; font-weight: 700; color: #0a2e1a; margin-top: 14px; margin-bottom: 6px; }
.sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 28px; }
.sig-box { border: 1px solid #ccc; border-radius: 6px; padding: 14px; }
.sig-title { font-size: 10px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
.sig-sub { font-size: 10px; color: #888; font-style: italic; margin-bottom: 4px; }
.sig-line { height: 56px; }
.sig-date { font-size: 11px; color: #888; margin-top: 6px; }
.sig-name { font-weight: 700; font-size: 12px; margin-top: 4px; }
.gse-footer { background: #f0ede6; border-top: 1px solid #e0ddd6; padding: 8px 28px; text-align: center; font-size: 10px; color: #888; line-height: 1.6; }
@media print {
  .noprint { display: none; }
  body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px; }
  .page { max-width: 100%; }
  @page { size: A4 portrait; margin: 7mm 10mm; }
  .hdr { padding: 8px 16px; }
  .hdr img { width: 40px !important; height: 40px !important; }
  .body { padding: 10px 18px; }
  .art-title { margin-top: 12px; }
  .sigs { margin-top: 18px; }
}
</style>
</head>
<body>
<div class="noprint">
  <button onclick="window.print()">🖨️ Imprimer / PDF</button>
  <button class="sec" onclick="window.close()">Fermer</button>
</div>
<div class="page">

  <div class="hdr">
    <div class="hdr-left">
      <div class="sub">Global Solutions Entreprise</div>
      <div class="name">Phyto Bénin</div>
    </div>
    <img src="/logo-gse.jpeg" alt="GSE" style="width:56px;height:56px;object-fit:contain;border-radius:4px;background:#fff;padding:3px">
    <div class="hdr-right">
      <div class="title">Contrat d'entretien annuel</div>
      <div class="ref">Réf. ${esc(contratRef)}</div>
    </div>
  </div>
  <div class="agr">✅ Agrément APA/26-025/CNGP-BEN &nbsp;·&nbsp; Police d'assurance N°:13901/7010000035 &nbsp;·&nbsp; RCCM: RB/COT/24 B 38910 &nbsp;·&nbsp; IFU: 3202420126111</div>

  <div class="body">

    <div class="ref-grid">
      <div class="ref-cell"><div class="ref-label">Réf. contrat</div><div class="ref-value">${esc(contratRef)}</div></div>
      <div class="ref-cell"><div class="ref-label">Date de signature</div><div class="ref-value">${esc(dateJour)}</div></div>
      <div class="ref-cell"><div class="ref-label">Durée</div><div class="ref-value">${duree} mois</div></div>
    </div>

    ${artTitle("Article 1 — Parties contractantes")}
    <div class="parties">
      <div class="party-box">
        <div class="party-title">Prestataire</div>
        <div class="party-row"><span class="party-key">Société :</span><span class="party-val">Global Solutions Entreprise (GSE)</span></div>
        <div class="party-row"><span class="party-key">Agrément :</span><span class="party-val">N° APA-26-025/CNGP-BEN</span></div>
        <div class="party-row"><span class="party-key">RCCM :</span><span class="party-val">RB/COT/24 B 38910</span></div>
        <div class="party-row"><span class="party-key">IFU :</span><span class="party-val">3202420126111</span></div>
        <div class="party-row"><span class="party-key">Adresse :</span><span class="party-val">Ilot 3535, Cotonou, Bénin</span></div>
        <div class="party-row"><span class="party-key">Téléphone :</span><span class="party-val">+229 53 04 79 50</span></div>
        <div class="party-row"><span class="party-key">Email :</span><span class="party-val">contact@phyto-benin.com</span></div>
      </div>
      <div class="party-box">
        <div class="party-title">Client</div>
        <div class="party-row"><span class="party-key">Dénomination :</span><span class="party-val">${esc(entreprise)}</span></div>
        <div class="party-row"><span class="party-key">Représentant :</span><span class="party-val">${esc(nomClient)}</span></div>
        <div class="party-row"><span class="party-key">Adresse :</span><span class="party-val">${esc(adresse)}</span></div>
        <div class="party-row"><span class="party-key">Téléphone :</span><span class="party-val">${esc(telephone)}</span></div>
        <div class="party-row"><span class="party-key">Type d'établ. :</span><span class="party-val">${esc(typeEtabLabel)}</span></div>
        <div class="party-row"><span class="party-key">Superficie :</span><span class="party-val">${esc(superficie)}</span></div>
      </div>
    </div>

    ${artTitle("Article 2 — Objet du contrat")}
    <p class="art-text">Le présent contrat a pour objet la réalisation par GSE d'un programme annuel d'entretien sanitaire conformément aux recommandations du rapport de visite technique et dans le respect de la loi 91-004 du 11 Février 1991 portant réglementation Phytosanitaire en République du Bénin.</p>
    ${!sansNoteDevis ? `<div class="note-box"><strong>Note :</strong> L'intervention initiale (devis ${esc(devis.numero)}) est facturée séparément à ${esc(montant)} FCFA et doit être réglée avant démarrage du présent contrat.</div>` : ""}

    ${artTitle(`Article 3 — Prestations incluses (${esc(formule)})`)}
    <table class="services">
      <thead>
        <tr>
          <th style="width:18%">Fréquence</th>
          <th style="width:28%">Nature de l'intervention</th>
          <th>Détail</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>× ${passages} / an<br><small>${frequenceLabel()}</small></td>
          <td>${esc(prestationLabel)}</td>
          <td>
            — Traitement insecticide rémanent : murs, plinthes, zones d'ombre<br>
            — Dératisation : vérification et rechargement des stations<br>
            — Inspection visuelle complète<br>
            — Fiche de passage + Attestation GSE à chaque intervention
          </td>
        </tr>
        ${controleRow}
        <tr>
          <td>× 1 / an<br><small>(fin de contrat)</small></td>
          <td>Audit de conformité sanitaire annuel</td>
          <td>
            — Bilan complet du plan IPM sur 12 mois<br>
            — Rapport écrit utilisable lors de contrôles sanitaires officiels
          </td>
        </tr>
      </tbody>
    </table>

    ${artTitle("Article 4 — Conditions financières")}
    <table class="finances">
      <thead>
        <tr><th>Désignation</th><th style="width:35%;text-align:right">Montant</th></tr>
      </thead>
      <tbody>
        <tr class="alt">
          <td>Prix de référence — ${passages} passages ponctuels</td>
          <td style="text-align:right">${prixRef.toLocaleString("fr-FR")} FCFA</td>
        </tr>
        <tr>
          <td>Remise contrat annuel (${remisePct} %)</td>
          <td style="text-align:right">− ${remiseMontant.toLocaleString("fr-FR")} FCFA</td>
        </tr>
        <tr class="total">
          <td>MONTANT ANNUEL DU CONTRAT (TTC)</td>
          <td style="text-align:right">${prixAnnuel.toLocaleString("fr-FR")} FCFA</td>
        </tr>
        <tr class="alt">
          <td>${paiementLabel()}</td>
          <td style="text-align:right">${paiementMontant()}</td>
        </tr>
      </tbody>
    </table>
    ${!sansNoteDevis ? `<p style="font-size:11px;color:#888;font-style:italic;margin-bottom:12px">* L'intervention initiale ${esc(devis.numero)} (${esc(montant)} FCFA) est facturée séparément.</p>` : ""}

    ${artTitle("Article 5 — Modalités de paiement")}
    ${paiementArticle()}

    ${artTitle("Article 6 — Durée et renouvellement")}
    <ul class="clauses">
      ${li(`Le contrat est conclu pour une durée de ${duree} mois à compter de la date de signature.`)}
      ${li(`À l'échéance, il est reconduit tacitement pour une nouvelle période de ${duree} mois, sauf dénonciation.`)}
      ${li("La date du premier passage sera fixée d'un commun accord dans les 30 jours suivant la signature.")}
    </ul>

    ${artTitle("Article 7 — Résiliation")}
    <ul class="clauses">
      ${li(`Chaque partie peut résilier le contrat avec un préavis écrit d'un ${periodicite} complet.`)}
      ${li(`Toute résiliation en cours ${periodiciteEnCours} ne donne droit à aucun remboursement.`)}
      ${li(`En cas de résiliation anticipée du Client, ${periodiciteRestants} sont dus à GSE.`)}
      ${li("GSE peut résilier sans préavis en cas de non-paiement ou d'impossibilité d'accès répétée.")}
    </ul>

    ${artTitle("Article 8 — Obligations des parties")}
    <div class="sub-title">8.1 &nbsp; Obligations de GSE</div>
    <ul class="clauses">
      ${li("Réaliser les interventions aux dates convenues par des techniciens certifiés.")}
      ${li("Utiliser exclusivement des produits homologués par l'État du Bénin.")}
      ${li(`Remettre une fiche de passage + attestation après chaque intervention ${frequenceLabel().replace(/[()]/g, "").trim()}.`)}
      ${li("Transmettre le rapport d'audit annuel au plus tard 15 jours après la dernière intervention.")}
    </ul>
    <div class="sub-title">8.2 &nbsp; Obligations du Client</div>
    <ul class="clauses">
      ${li("Garantir l'accès libre au site dans les 72h suivant la notification de passage par GSE.")}
      ${li("Tout refus d'accès injustifié est décompté comme passage effectué.")}
      ${li("Mettre en œuvre les recommandations d'hygiène émises par GSE.")}
      ${li("Informer GSE de tout changement affectant le site.")}
    </ul>

    ${artTitle("Article 9 — Limitation de responsabilité")}
    <p class="art-text">GSE ne saurait être tenu responsable des recontaminations résultant du non-respect par le Client des recommandations d'hygiène transmises. Le rapport de visite technique GSE fait foi en cas de litige.</p>

    ${artTitle("Article 10 — Révision tarifaire")}
    <p class="art-text">Le tarif annuel peut être révisé à chaque renouvellement sur notification écrite 30 jours avant l'échéance.</p>

    <div class="sigs">
      <div class="sig-box">
        <div class="sig-title">Signature du client</div>
        <div class="sig-sub">${esc(entreprise)} — Bon pour accord</div>
        <div class="sig-line"></div>
        <div class="sig-date">À Cotonou, le ${esc(dateJour)}</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">Pour Global Solutions Entreprise</div>
        <div class="sig-sub">Le Directeur Technique</div>
        <div class="sig-line"></div>
        <div class="sig-name">Fabrice ADOSSOU</div>
        <div class="sig-date">À Cotonou, le ${esc(dateJour)}</div>
      </div>
    </div>

  </div>

  <div class="gse-footer">Global Solutions Entreprise — Phyto Bénin | Applicateur Agréé | Réf. APA/26-025/CNGP-BEN<br>RCCM: RB/COT/24 B 38910 &nbsp;·&nbsp; IFU: 3202420126111 &nbsp;·&nbsp; contact@phyto-benin.com &nbsp;·&nbsp; Cotonou, Bénin</div>

</div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    })

  } catch (err) {
    console.error("generate-contract error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
