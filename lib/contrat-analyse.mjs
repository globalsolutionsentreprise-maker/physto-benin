// Logique métier pure de l'analyse de contrat.
// Volontairement sans import Next ni Supabase: testable avec `node --test`.

// Socle de données du devis.
// Répare trois lectures fausses du prompt historique: `devis.montant` et
// `devis.prestations` n'existent pas en base, et `devis.superficie` est NULL
// depuis le passage aux lignes multi-secteurs (les surfaces vivent dans `lignes`).
export function construireSocleDevis(devis) {
  const d = devis || {}
  const lignes = Array.isArray(d.lignes) ? d.lignes : []
  const totalLignes = lignes.reduce((s, l) => s + (Number(l.montant) || 0), 0)
  const superficieLignes = lignes.reduce((s, l) => s + (Number(l.superficie) || 0), 0)
  // 0 est une valeur valide (devis offert) : distinguer "non renseigné" de 0
  // en testant la nullité AVANT conversion, jamais avec Number(x) || Number(y).
  const montant = d.montant_net != null
    ? Number(d.montant_net)
    : (d.montant_total != null ? Number(d.montant_total) : null)
  return {
    montant,
    prestation: d.prestation || null,
    lignes,
    totalLignes,
    // superficie garde || intentionnellement : en base, 0 signifie "non renseignée"
    // (9 devis en prod), pas une surface réelle de 0 m². Passer en ?? annoncerait
    // "0 m²" à l'IA et fausserait son dimensionnement. Ne pas "corriger" ce ||.
    superficie: superficieLignes > 0 ? superficieLignes : (Number(d.superficie) || null),
    // La colonne `remise` n'est jamais persistée par creerDevis: on la déduit.
    remise: (totalLignes > 0 && montant != null) ? totalLignes - montant : null,
  }
}

function normaliser(v) {
  return String(v == null ? "" : v)
    .normalize("NFD")
    // Diacritiques combinants (U+0300-U+036F), en forme échappée: deux
    // caractères invisibles écrits littéralement ici portaient toute la
    // contrainte du plancher (un outil qui les altère silencieusement fait
    // disparaître le garde-fou, cf. plancherPour("Élevé") -> null).
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

// Nombre de passages annuels minimum justifié par le constat terrain.
export const PLANCHER_PASSAGES = { faible: 1, moyen: 2, eleve: 4, critique: 6 }

export function plancherPour(niveau) {
  const cle = normaliser(niveau)
  return Object.prototype.hasOwnProperty.call(PLANCHER_PASSAGES, cle) ? PLANCHER_PASSAGES[cle] : null
}

// Fréquence demandée par le client, extraite de façon déterministe.
// Déplacée depuis la route pour être testable.
export function parseFrequenceClient(texte) {
  const t = (texte || "").toLowerCase()
  if (/\b1\s*passage|\bune?\s*fois|\bannuel|\b1\s*fois/.test(t)) return { freq: 1, paiement: "annuel" }
  if (/\b2\s*passages?|\bsemestriel|\bdeux\s*fois|\bdeux\s*passages?|\b2\s*fois/.test(t)) return { freq: 2, paiement: "semestriel" }
  if (/\b4\s*passages?|\btrimestriel|\bquatre\s*fois|\bquatre\s*passages?|\b4\s*fois/.test(t)) return { freq: 4, paiement: "trimestriel_avance" }
  if (/\b6\s*passages?|\bbimestriel|\bsix\s*fois/.test(t)) return { freq: 6, paiement: "trimestriel_avance" }
  if (/\b12\s*passages?|\bmensuel|\bchaque\s*mois|\btous\s*les\s*mois/.test(t)) return { freq: 12, paiement: "mensuel" }
  return null
}

// Arbitrage, du plus fort au plus faible:
//   1. demande explicite du client (souveraine, c'est ce qui est vendu)
//   2. plancher d'infestation (relève la proposition IA, ne la rabaisse jamais)
//   3. proposition de l'IA
// Un écart entre 1 et 2 n'est jamais tranché en silence: il remonte en tête
// de pointsAttention pour arbitrage commercial.
export function appliquerContraintes({ analyse, freqClient, niveauInfestation }) {
  const out = Object.assign({}, analyse)
  // pointsAttention non-tableau (ex: chaîne renvoyée par l'IA): converti en
  // entrée plutôt que jeté, sinon le contenu produit par l'IA disparaît en
  // silence.
  const points = Array.isArray(out.pointsAttention)
    ? out.pointsAttention.slice()
    : (out.pointsAttention != null ? [out.pointsAttention] : [])
  const plancher = plancherPour(niveauInfestation)
  const frequenceIA = Number(out.frequencePassages || 0)
  // Vrai seulement quand le code doit RÉELLEMENT relever la fréquence, c'est
  // à dire quand l'IA a ignoré la règle du prompt (voir route.js): le prix
  // qu'elle a calculé correspond alors à une fréquence trop basse.
  const releveParPlancher = !!(plancher && frequenceIA < plancher)

  if (releveParPlancher) {
    out.frequencePassages = plancher
  }

  if (freqClient) {
    if (plancher && freqClient.freq < plancher) {
      points.unshift(
        "Le client demande " + freqClient.freq + " passage(s), le constat terrain (" +
        niveauInfestation + ") en justifie " + plancher + ". Écart à arbitrer avant signature."
      )
    }
    out.frequencePassages = freqClient.freq
    out.paiementRecommande = freqClient.paiement
  }

  // Aucun code ne peut inventer un prix commercial: on ne corrige jamais
  // prixSuggere/prixTrimestre/paiementRecommande ici, on signale juste que
  // ceux produits par l'IA ne sont plus fiables.
  //
  // Uniquement en l'absence de demande client: quand le client impose sa
  // fréquence, c'est elle qui est retenue au final, pas le plancher. Annoncer
  // "relevée de 1 à 4" alors que le contrat portera 2 passages serait faux, et
  // le message de conflit ci-dessus couvre déjà ce cas.
  if (releveParPlancher && !freqClient) {
    points.push(
      "Fréquence relevée de " + frequenceIA + " à " + plancher + " passage(s) selon le constat terrain : prix, prix trimestriel et modalités de paiement à revalider avant envoi."
    )
  }

  // Plafond commercial. L'IA propose spontanément du bimestriel (6 passages)
  // sur les sites classés Élevé, ce qui revient trop cher aux clients sur ce
  // marché. On part du trimestriel, sauf demande explicite du client, qui
  // reste souverain y compris pour aller au dela.
  if (!freqClient && Number(out.frequencePassages || 0) > PASSAGES_MAX_SANS_FORCE_MAJEURE) {
    points.push(
      "Fréquence ramenée de " + out.frequencePassages + " à " + PASSAGES_MAX_SANS_FORCE_MAJEURE +
      " passages (trimestriel) : le bimestriel n'est proposé que sur cas de force majeure."
    )
    out.frequencePassages = PASSAGES_MAX_SANS_FORCE_MAJEURE
  }

  // Un niveau fourni mais absent des quatre clés connues désactive le
  // plancher sans le dire (plancherPour renvoie null) : le signaler plutôt
  // que de laisser le garde-fou disparaître en silence.
  if (niveauInfestation && !plancher) {
    points.push(
      "Niveau d'infestation \"" + niveauInfestation + "\" non reconnu : aucun plancher de passages n'a pu être appliqué."
    )
  }

  out.pointsAttention = points
  return out
}

// Section « constat terrain » du prompt. Une absence de rapport est déclarée
// telle quelle: l'IA ne doit jamais confondre « pas de visite » et « rien vu ».
export function blocRapport(rapport, precedents, origine) {
  if (origine === "indisponible") {
    return "CONSTAT TERRAIN\n- Rapports de visite indisponibles (erreur de lecture). Ne rien supposer sur l'état du site."
  }
  if (!rapport) {
    return "CONSTAT TERRAIN\n- Aucune visite terrain réalisée pour ce dossier. Fonde-toi sur le devis et les réponses techniques fournies, et signale cette absence dans pointsAttention."
  }

  const nuisibles = []
    .concat(Array.isArray(rapport.nuisibles) ? rapport.nuisibles : [])
    .concat(rapport.autres_nuisible ? [rapport.autres_nuisible] : [])
    .filter(Boolean)
    .join(", ")

  const lignes = [
    "CONSTAT TERRAIN" + (origine === "autre_dossier" ? " (rapport issu d'un autre dossier du même client, même site)" : ""),
    "- Rapport : " + (rapport.numero_unique || "sans référence") + " du " + (rapport.date_visite || "date inconnue"),
    "- Technicien : " + (rapport.technicien || "non précisé"),
    "- Niveau d'infestation constaté : " + (rapport.niveau_infestation || "non précisé"),
    "- Nuisibles identifiés : " + (nuisibles || "non précisés"),
    "- Description du site : " + (rapport.description_site || "non précisée"),
    "- Zones infestées : " + (rapport.zones_infestees || "non précisées"),
    "- Recommandations du technicien : " + (rapport.recommandations || "aucune"),
    "- Observations : " + (rapport.observations || "aucune"),
  ]
  if (rapport.notes_technicien) lignes.push("- Notes complémentaires : " + rapport.notes_technicien)

  if ((precedents || []).length > 0) {
    lignes.push("- Visites antérieures :")
    precedents.forEach(p => {
      lignes.push("  · " + (p.date_visite || "date inconnue") + " : niveau " + (p.niveau_infestation || "non précisé"))
    })
  }
  return lignes.join("\n")
}

// Fréquence de passages par défaut d'un contrat d'entretien.
// Plafonnée à 4 (trimestriel) : le bimestriel et le mensuel reviennent trop
// cher aux clients sur ce marché, et ne se justifient que sur un cas de force
// majeure explicite. Ce plafond n'est PAS un bug, ne pas le retirer en voyant
// un site classé Élevé recevoir 4 passages.
export const PASSAGES_DEFAUT = 4
export const PASSAGES_MAX_SANS_FORCE_MAJEURE = 4

// Remise systématique accordée à tout nouveau client, donc à tout nouveau
// contrat. Une seule fois, jamais cumulée.
export const REMISE_CONTRAT_PCT = 10

// Prix annuel du contrat, calculé dans le code et non par l'IA.
// L'IA produisait un prix différent à chaque exécution (320 000 puis 400 000
// sur le même dossier) à partir d'un "tarif de référence" qu'elle s'inventait.
//
// base = total des lignes du devis (montant BRUT, avant remise) quand il existe.
// La remise de 10 % s'applique alors ici, une seule fois, et le contrat affiche
// un prix de référence réel. Sur un devis ancien sans lignes, on ne dispose que
// du montant net, remise déjà incluse : on ne la réapplique pas.
export function prixContrat({ totalLignes, montantNet, passages }) {
  const n = Number(passages) || PASSAGES_DEFAUT
  const brut = Number(totalLignes) || 0
  if (brut > 0) {
    const reference = brut * n
    return {
      prixAnnuel: Math.round(reference * (1 - REMISE_CONTRAT_PCT / 100)),
      prixReference: reference,
      remisePct: REMISE_CONTRAT_PCT,
    }
  }
  const net = Number(montantNet) || 0
  const reference = net * n
  return { prixAnnuel: Math.round(reference), prixReference: reference, remisePct: 0 }
}

// ── Tarification déterministe du contrat : 3 formules d'engagement ───────────
// Règle métier arrêtée avec la direction : un passage sous contrat coûte
// TOUJOURS moins qu'une intervention ponctuelle (c'est l'argument d'engagement),
// et JAMAIS sous un plancher de rentabilité. Calculé ici, dans le code, pour
// être reproductible : l'IA ne fixe plus aucun montant (laissée libre, elle
// sortait 320 000 puis 400 000 sur le même dossier), seulement le texte.
//
//   prix/passage(durée) = max( plancher , taux(durée) × prix_ponctuel )
//   plafond   = prix_ponctuel (montant net du devis = prix d'UNE intervention)
//   taux      = dégressif : plus l'engagement est long, moins le passage coûte
//   plancher  = PLANCHER_PONCTUEL_PCT du ponctuel (garde-fou rentabilité)
//
// Le client choisit sa durée sur le contrat (case à cocher), GSE applique.
export const TAUX_ENGAGEMENT = { 3: 1.0, 6: 0.95, 12: 0.9 }
export const PLANCHER_PONCTUEL_PCT = 0.7
export const DUREES_ENGAGEMENT = [3, 6, 12]

// Nombre de passages inclus sur la fenêtre d'engagement, à cadence annuelle
// constante (4 passages/an sur 6 mois = 2 passages).
export function passagesPourDuree(passagesAnnuels, dureeMois) {
  const freq = Number(passagesAnnuels) || PASSAGES_DEFAUT
  return Math.max(1, Math.round((freq * (Number(dureeMois) || 12)) / 12))
}

export function offresContrat({ prixPonctuel, passagesAnnuels } = {}) {
  const ref = Math.max(0, Math.round(Number(prixPonctuel) || 0))
  const plancherPassage = Math.round(ref * PLANCHER_PONCTUEL_PCT)
  const offres = DUREES_ENGAGEMENT.map((dureeMois) => {
    const passages = passagesPourDuree(passagesAnnuels, dureeMois)
    const taux = TAUX_ENGAGEMENT[dureeMois] != null ? TAUX_ENGAGEMENT[dureeMois] : 1
    const prixPassage = Math.max(plancherPassage, Math.round(ref * taux))
    return { dureeMois, passages, prixPassage, prixTotal: prixPassage * passages, tauxPct: Math.round(taux * 100) }
  })
  return { prixPonctuel: ref, plancherPassage, offres }
}

// Prix déjà négocié mentionné dans les notes libres du commercial.
// Extrait dans le code et non par l'IA : le journal du projet documente deux
// cas où elle a ignoré une contrainte posée en texte. Un prix négocié prime
// sur le prix calculé, c'est un engagement déjà pris devant le client.
// Formats acceptés : "200000", "200 000", "200.000", "200k", "200 K FCFA".
export function montantNegocie(notes) {
  const t = String(notes || "").toLowerCase()
  if (!t.trim()) return null
  const enK = t.match(/(\d{2,4})\s*k\b/)
  if (enK) return parseInt(enK[1], 10) * 1000
  const brut = t.match(/(\d[\d\s.,]{4,})/)
  if (!brut) return null
  const n = parseInt(brut[1].replace(/[\s.,]/g, ""), 10)
  return Number.isFinite(n) && n >= 10000 ? n : null
}

// ── Score commercial ────────────────────────────────────────────────────────
// Qualifie le NIVEAU DE SERVICE d'un dossier, jamais son prix. Calculé dans le
// code pour être reproductible : deux préparations du même dossier donnent le
// même niveau de contrat. Le prix, lui, reste construit par l'IA avec son
// jugement commercial, dans le cadre que ce niveau fixe.
export const POIDS_SCORE = {
  superficie: 25,
  infestation: 25,
  typeClient: 20,
  frequence: 20,
  fidelisation: 10,
}

function pointsSuperficie(m2) {
  const s = Number(m2) || 0
  if (s <= 0) return 40      // surface inconnue : positionnement médian, pas de bonus
  if (s < 100) return 20
  if (s < 300) return 40
  if (s < 600) return 60
  if (s < 1500) return 80
  return 100
}

function pointsInfestation(niveau) {
  const cle = normaliser(niveau)
  if (cle === "faible") return 25
  if (cle === "moyen") return 50
  if (cle === "eleve") return 75
  if (cle === "critique") return 100
  return 50                  // niveau absent ou non reconnu : médian
}

// Le type d'établissement est un champ libre saisi par le commercial.
// Classé par mots-clés, avec un repli médian plutôt qu'un refus.
export function pointsTypeClient(texte) {
  const t = normaliser(texte)
  if (!t) return { points: 40, categorie: "non precise" }
  if (/industri|usine|agro|entrepot|stockage|production|conserverie|minoterie/.test(t)) return { points: 100, categorie: "industrie" }
  if (/clinique|hopital|pharmacie|laboratoire|sante|ecole|creche|maternite/.test(t)) return { points: 90, categorie: "sante ou enseignement" }
  if (/hotel|auberge|residence hoteliere|hebergement/.test(t)) return { points: 80, categorie: "hotellerie" }
  if (/restaurant|boulangerie|patisserie|cuisine|cantine|snack|bar|maquis|alimentaire/.test(t)) return { points: 70, categorie: "restauration" }
  if (/particulier|maison|domicile|residence|appartement|villa/.test(t)) return { points: 20, categorie: "particulier" }
  if (/bureau|commerce|boutique|magasin|immeuble|banque|agence|siege/.test(t)) return { points: 40, categorie: "bureau ou commerce" }
  return { points: 40, categorie: "non classe" }
}

function pointsFrequence(passages) {
  const n = Number(passages) || 0
  if (n <= 1) return 25
  if (n <= 2) return 50
  if (n <= 4) return 75
  return 100
}

export function scoreCommercial({ superficie, niveauInfestation, typeClient, frequence, clientAvecHistorique }) {
  const tc = pointsTypeClient(typeClient)
  const detail = {
    superficie: pointsSuperficie(superficie),
    infestation: pointsInfestation(niveauInfestation),
    typeClient: tc.points,
    frequence: pointsFrequence(frequence),
    fidelisation: clientAvecHistorique ? 100 : 50,
  }
  const score = Math.round(
    Object.keys(POIDS_SCORE).reduce((s, k) => s + detail[k] * POIDS_SCORE[k] / 100, 0)
  )
  return { score, detail, categorieClient: tc.categorie }
}

// Niveau de contrat déduit du score. C'est ce niveau, et non un tarif, que
// l'IA reçoit pour construire son offre.
export const NIVEAUX_CONTRAT = [
  { max: 30,  cle: "leger",           libelle: "Contrat léger" },
  { max: 50,  cle: "classique",       libelle: "Contrat classique" },
  { max: 70,  cle: "premium",         libelle: "Contrat premium" },
  { max: 100, cle: "haute_protection", libelle: "Contrat haute protection" },
]

export function niveauContrat(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  return NIVEAUX_CONTRAT.find(n => s <= n.max) || NIVEAUX_CONTRAT[NIVEAUX_CONTRAT.length - 1]
}

// Garde-fous de COHÉRENCE entre les formules proposées par l'IA.
// Ne dictent aucun prix : ils vérifient seulement qu'une offre plus longue
// coûte plus cher au total et moins cher au mois, sans quoi le client aurait
// intérêt à s'engager moins longtemps, ce qui viderait le contrat de son sens.
export function verifierCoherenceOffres(offres, { montantDevis } = {}) {
  const alertes = []
  const liste = (Array.isArray(offres) ? offres : [])
    .map(o => ({ dureeMois: Number(o.dureeMois) || 0, prixTotal: Number(o.prixTotal) || 0 }))
    .filter(o => o.dureeMois > 0 && o.prixTotal > 0)
    .sort((a, b) => a.dureeMois - b.dureeMois)

  for (let i = 1; i < liste.length; i++) {
    const court = liste[i - 1]
    const long = liste[i]
    if (long.prixTotal <= court.prixTotal) {
      alertes.push(
        "Incohérence : l'offre " + long.dureeMois + " mois (" + long.prixTotal.toLocaleString("fr-FR") +
        " FCFA) n'est pas supérieure à l'offre " + court.dureeMois + " mois (" +
        court.prixTotal.toLocaleString("fr-FR") + " FCFA)."
      )
    }
    if (long.prixTotal / long.dureeMois >= court.prixTotal / court.dureeMois) {
      alertes.push(
        "Incohérence : le coût mensuel de l'offre " + long.dureeMois +
        " mois n'est pas inférieur à celui de l'offre " + court.dureeMois +
        " mois. Un engagement plus long doit être plus avantageux."
      )
    }
  }

  const annuelle = liste.find(o => o.dureeMois >= 12)
  const devis = Number(montantDevis) || 0
  if (annuelle && devis > 0 && annuelle.prixTotal < devis) {
    alertes.push(
      "Offre annuelle (" + annuelle.prixTotal.toLocaleString("fr-FR") +
      " FCFA) inférieure au montant du devis (" + devis.toLocaleString("fr-FR") +
      " FCFA) : prix à revoir avant envoi."
    )
  }
  return alertes
}

// ── Suivi des contrats signés ───────────────────────────────────────────────
// Le contrat signé vit sur le devis (type_crm = 'contrat', date_debut_contrat,
// duree_contrat_mois, frequence_intervention). La table `contrats` ne trace que
// les PDF générés, elle ne dit pas si le client a signé.

export const PASSAGES_PAR_FREQUENCE = {
  mensuelle: 12, bimestrielle: 6, trimestrielle: 4, semestrielle: 2, annuelle: 1,
}

export function passagesParAn(frequence) {
  const cle = normaliser(frequence)
  return PASSAGES_PAR_FREQUENCE[cle] || 4
}

function isoPlusJours(iso, jours) {
  const d = new Date(String(iso) + "T00:00:00Z")
  if (isNaN(d.getTime())) return null
  d.setUTCDate(d.getUTCDate() + jours)
  return d.toISOString().slice(0, 10)
}

// Planning d'un contrat. L'intervalle entre interventions se déduit de la
// fréquence. Le contrôle intermédiaire, lui, n'est PAS une récurrence
// automatique : c'est une valeur métier par fréquence, parce qu'un contrôle
// n'a de sens que si l'intervalle entre deux interventions est assez long
// pour qu'un point de situation serve à quelque chose.
//
// Le 45 jours du trimestriel vient du planning réel de La Manne Dorée, relevé
// en base et validé par l'utilisateur : contrat annuel, interventions
// trimestrielles, contrôle à mi-parcours. Les autres valeurs suivent la même
// logique de mi-parcours. Zéro signifie aucun contrôle : en mensuel ou
// bimestriel, les interventions sont déjà assez rapprochées.
export const CONTROLE_PAR_FREQUENCE = {
  mensuelle: 0,
  bimestrielle: 0,
  trimestrielle: 45,
  semestrielle: 90,
  annuelle: 180,
}

export function joursAvantControle(frequence) {
  const cle = normaliser(frequence)
  return Object.prototype.hasOwnProperty.call(CONTROLE_PAR_FREQUENCE, cle)
    ? CONTROLE_PAR_FREQUENCE[cle]
    : CONTROLE_PAR_FREQUENCE.trimestrielle
}

export function datesPassages({ dateDebut, dureeMois, frequence }) {
  if (!dateDebut) return []
  const duree = Number(dureeMois) || 12
  const parAn = passagesParAn(frequence)
  const pas = Math.ceil(365 / parAn)
  const nb = Math.max(1, Math.round(parAn * duree / 12))
  const decalageControle = joursAvantControle(frequence)
  const out = []
  for (let i = 0; i < nb; i++) {
    const dateI = isoPlusJours(dateDebut, i * pas)
    if (!dateI) return []
    out.push({ date: dateI, type: "intervention" })
    // Jamais de contrôle qui déborderait sur l'intervention suivante, ni au
    // dela de la fin du contrat.
    if (decalageControle > 0 && decalageControle < pas && (i * pas + decalageControle) < duree * 30.44) {
      out.push({ date: isoPlusJours(dateDebut, i * pas + decalageControle), type: "controle" })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export function dateFinContrat(dateDebut, dureeMois) {
  if (!dateDebut) return null
  const d = new Date(String(dateDebut) + "T00:00:00Z")
  if (isNaN(d.getTime())) return null
  d.setUTCMonth(d.getUTCMonth() + (Number(dureeMois) || 12))
  return d.toISOString().slice(0, 10)
}

// Synthèse d'un contrat pour la vue de suivi. Aucune donnée inventée : ce qui
// manque (technicien non affecté, planning absent) est compté et remonté, pas
// masqué.
export function resumeContrat({ devis, interventions }, aujourdhui) {
  const auj = String(aujourdhui || new Date().toISOString().slice(0, 10))
  const debut = devis.date_debut_contrat || null
  const fin = dateFinContrat(debut, devis.duree_contrat_mois)
  const passages = (interventions || [])
    .filter(i => i.devis_id === devis.id)
    .map(i => ({
      id: i.id,
      date: i.date_intervention,
      type: i.type_passage || "intervention",
      statut: i.statut || "planifiee",
      personnelId: i.personnel_id || (i.personnel && i.personnel.id) || null,
      // Équipe complète : personnel_ids si présent, sinon retombe sur le principal.
      personnelIds: (Array.isArray(i.personnel_ids) && i.personnel_ids.length > 0)
        ? i.personnel_ids
        : (i.personnel_id ? [i.personnel_id] : []),
      technicien: i.personnel ? [i.personnel.prenom, i.personnel.nom].filter(Boolean).join(" ") : null,
    }))
    .filter(p => p.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))

  const faits = passages.filter(p => p.statut === "terminee").length
  const prochain = passages.find(p => p.statut !== "terminee" && String(p.date) >= auj) || null
  const sansTechnicien = passages.filter(p => !p.technicien).length
  // Passages dont la date est dépassée sans avoir été pointés terminés : soit
  // ils n'ont pas été faits, soit ils n'ont pas été saisis. Dans les deux cas
  // c'est ce qu'un suivi doit remonter en premier, jamais laisser filer.
  const enRetard = passages.filter(p => p.statut !== "terminee" && String(p.date) < auj)

  let statut = "actif"
  if (!debut) statut = "sans_date"
  else if (debut > auj) statut = "a_venir"
  else if (fin && fin < auj) statut = "termine"
  else if (fin && isoPlusJours(auj, 60) >= fin) statut = "a_renouveler"

  return {
    debut, fin, statut, passages, faits,
    total: passages.length,
    prochain,
    sansTechnicien,
    enRetard,
    passagesAttendus: datesPassages({
      dateDebut: debut,
      dureeMois: devis.duree_contrat_mois,
      frequence: devis.frequence_intervention,
    }).length,
  }
}

// ── Divergence entre le devis et le constat terrain ─────────────────────────
// Le rapport de visite fait foi pour ce que le contrat doit couvrir. Le devis,
// lui, est ce qui a été chiffré. Quand les deux ne portent pas sur les mêmes
// prestations, on ne tranche pas en silence : on le signale pour arbitrage.
//
// Cas réel à l'origine de ce contrôle : le devis de Jean Folly portait une
// ligne Désinfection sur 215 m2 alors que le constat ne relevait que termites
// et rats. C'était une erreur de saisie, invisible jusqu'à ce qu'un humain la
// remarque.
const NUISIBLE_VERS_PRESTATION = [
  { motif: /termite|cafard|blatte|fourmi|moustique|mouche|punaise|araign|insecte|charan/, prestation: "Désinsectisation" },
  { motif: /rat|souris|rongeur|derat/, prestation: "Dératisation" },
  { motif: /virus|bacterie|microbe|germe|desinfect|assainiss/, prestation: "Désinfection" },
]

export function prestationsDepuisNuisibles(nuisibles, autresNuisible) {
  const liste = []
    .concat(Array.isArray(nuisibles) ? nuisibles : [])
    .concat(autresNuisible ? [autresNuisible] : [])
    .filter(Boolean)
  const out = []
  liste.forEach(n => {
    const cle = normaliser(n)
    NUISIBLE_VERS_PRESTATION.forEach(r => {
      if (r.motif.test(cle) && out.indexOf(r.prestation) === -1) out.push(r.prestation)
    })
  })
  return out
}

// Renvoie les prestations facturées au devis que le constat terrain ne
// justifie pas. Ne renvoie rien s'il n'y a pas de rapport : sans constat, il
// n'y a pas de divergence, seulement une absence d'information.
export function divergencePrestations({ prestationDevis, rapport }) {
  if (!rapport) return { verifiable: false, enTrop: [], attendues: [] }
  const attendues = prestationsDepuisNuisibles(rapport.nuisibles, rapport.autres_nuisible)
  if (attendues.length === 0) return { verifiable: false, enTrop: [], attendues: [] }
  const facturees = String(prestationDevis || "")
    .split(" + ")
    .map(p => p.trim())
    .filter(Boolean)
  const enTrop = facturees.filter(p => {
    const c = normaliser(p)
    return !attendues.some(a => normaliser(a) === c)
  })
  return { verifiable: true, enTrop, attendues }
}
