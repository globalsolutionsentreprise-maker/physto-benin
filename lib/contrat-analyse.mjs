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
