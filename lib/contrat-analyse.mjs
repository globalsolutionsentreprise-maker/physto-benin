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
    .replace(/[̀-ͯ]/g, "")
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
  const points = Array.isArray(out.pointsAttention) ? out.pointsAttention.slice() : []
  const plancher = plancherPour(niveauInfestation)

  if (plancher && Number(out.frequencePassages || 0) < plancher) {
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
