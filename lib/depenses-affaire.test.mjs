// node --test lib/depenses-affaire.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { synthDepenses, isInvestissement, INVEST_CAT } from "./depenses-affaire.mjs"

test("ventile charges vs investissements, sans double comptage", () => {
  const items = [
    { id: 1, montant: 10000, categorie: "transport" },
    { id: 2, montant: 5000, categorie: "produit" },
    { id: 3, montant: 120000, categorie: INVEST_CAT },
  ]
  const s = synthDepenses(items)
  assert.equal(s.nb, 3)
  assert.equal(s.totalCharges, 15000)      // 10000 + 5000
  assert.equal(s.totalInvest, 120000)       // l'investissement n'est PAS dans les charges
  assert.equal(s.total, 135000)
})

test("liste vide / nulle", () => {
  assert.deepEqual(synthDepenses([]), { nb: 0, totalCharges: 0, totalInvest: 0, total: 0 })
  assert.deepEqual(synthDepenses(null), { nb: 0, totalCharges: 0, totalInvest: 0, total: 0 })
})

test("catégorie absente => charge (défaut 'autre')", () => {
  const s = synthDepenses([{ montant: 3000 }])
  assert.equal(s.totalCharges, 3000)
  assert.equal(s.totalInvest, 0)
})

test("montant non numérique => 0", () => {
  const s = synthDepenses([{ montant: null, categorie: "autre" }, { montant: "x", categorie: INVEST_CAT }])
  assert.equal(s.total, 0)
})

test("isInvestissement", () => {
  assert.equal(isInvestissement("investissement"), true)
  assert.equal(isInvestissement("transport"), false)
  assert.equal(isInvestissement(null), false)
})
