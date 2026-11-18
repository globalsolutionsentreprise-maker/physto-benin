// Recherche rapide multicritère des clients (filtre CÔTÉ CLIENT sur la liste déjà
// chargée via get_clients — le CRM charge tous les clients en mémoire, pas de
// pagination serveur). Logique pure et testable : normalisation téléphone tolérante
// + correspondance nom/prénom/entreprise/email/téléphone.
// ponytail: filtre client-side, OK tant que le parc clients tient en mémoire
// (quelques centaines). Si >~2000 clients : passer à une recherche serveur paginée.

// Garde uniquement les chiffres et retire les préfixes internationaux du Bénin
// (00229 / 229) pour comparer sur le numéro local. Ne modifie jamais la donnée en
// base : on normalise des DEUX côtés (stocké + requête) au moment de comparer.
export function normTel(s) {
  var d = String(s == null ? "" : s).replace(/\D/g, "")
  if (d.startsWith("00229")) d = d.slice(5)
  else if (d.startsWith("229") && d.length > 8) d = d.slice(3)
  return d
}

// Retire les accents et met en minuscules pour une comparaison tolérante.
function norm(s) {
  return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

// true si le client correspond à la requête. Requête vide => true (liste normale).
// - Chiffres (>= 2) : match sur le téléphone normalisé (sous-chaîne, tolérant aux
//   séparateurs, +229, 00229, numéro partiel).
// - Texte : match sur nom / prénom / entreprise / email (sous-chaîne, sans accent).
// Un client ne peut matcher qu'une fois (filtre d'un tableau) => pas de doublon.
export function clientMatchesQuery(c, q) {
  var query = String(q == null ? "" : q).trim()
  if (!query) return true
  if (!c) return false

  var qDigits = query.replace(/\D/g, "")
  if (qDigits.length >= 2) {
    var tel = normTel(c.telephone)
    if (tel && tel.indexOf(normTel(qDigits)) !== -1) return true
  }

  var hay = norm([c.prenom, c.nom, c.entreprise, c.email].filter(Boolean).join(" "))
  return hay.indexOf(norm(query)) !== -1
}
