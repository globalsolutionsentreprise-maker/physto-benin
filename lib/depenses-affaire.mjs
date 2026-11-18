// Synthèse des dépenses rattachées à une affaire (table depenses_devis).
// Logique PURE et testable, partagée par le tableau de bord de l'affaire et la vue
// Finances « Dépenses par affaire ». Ne touche AUCUNE formule financière existante :
// elle ne fait que ventiler des lignes déjà en base entre charges opérationnelles et
// investissements durables, à partir de la catégorie (source unique = depenses_devis).

export const INVEST_CAT = "investissement"

export function isInvestissement(categorie) {
  return (categorie || "autre") === INVEST_CAT
}

// items : [{ id, libelle, montant, categorie, date }]. Renvoie les agrégats de
// l'affaire. Investissement (durable) compté à part, jamais cumulé avec les charges.
export function synthDepenses(items) {
  var rows = items || []
  var totalCharges = 0
  var totalInvest = 0
  for (var k = 0; k < rows.length; k++) {
    var m = Number(rows[k].montant) || 0
    if (isInvestissement(rows[k].categorie)) totalInvest += m
    else totalCharges += m
  }
  return { nb: rows.length, totalCharges: totalCharges, totalInvest: totalInvest, total: totalCharges + totalInvest }
}
