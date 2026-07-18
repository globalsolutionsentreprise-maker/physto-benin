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
  const montant = Number(d.montant_net) || Number(d.montant_total) || null
  return {
    montant,
    prestation: d.prestation || null,
    lignes,
    totalLignes,
    superficie: superficieLignes > 0 ? superficieLignes : (Number(d.superficie) || null),
    // La colonne `remise` n'est jamais persistée par creerDevis: on la déduit.
    remise: (totalLignes > 0 && montant) ? totalLignes - montant : null,
  }
}
