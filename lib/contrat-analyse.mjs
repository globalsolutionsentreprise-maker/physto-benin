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
