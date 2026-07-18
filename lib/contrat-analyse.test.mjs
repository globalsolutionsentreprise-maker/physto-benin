import { test } from "node:test"
import assert from "node:assert/strict"
import { construireSocleDevis } from "./contrat-analyse.mjs"

test("devis à lignes multiples: montant net, superficie sommée, remise déduite", () => {
  const socle = construireSocleDevis({
    montant_net: 46286,
    montant_total: 47000,
    prestation: "Désinsectisation + Désinfection",
    superficie: null,
    lignes: [
      { prestation: "Désinsectisation", secteur: "Bloc A", superficie: 41.85, prix_m2: 200, montant: 8370 },
      { prestation: "Désinfection", secteur: "Bloc B", superficie: 215.295, prix_m2: 200, montant: 43059 },
    ],
  })
  assert.equal(socle.montant, 46286)
  assert.equal(socle.totalLignes, 51429)
  assert.equal(socle.superficie, 257.145)
  assert.equal(socle.remise, 5143)
  assert.equal(socle.prestation, "Désinsectisation + Désinfection")
})

test("devis ancien sans lignes: repli sur montant_total et superficie de la colonne", () => {
  const socle = construireSocleDevis({
    montant_net: null,
    montant_total: 39690,
    prestation: "Dératisation",
    superficie: 120,
    lignes: null,
  })
  assert.equal(socle.montant, 39690)
  assert.equal(socle.totalLignes, 0)
  assert.equal(socle.superficie, 120)
  assert.equal(socle.remise, null)
})

test("devis vide: aucune valeur inventée", () => {
  const socle = construireSocleDevis({})
  assert.equal(socle.montant, null)
  assert.equal(socle.superficie, null)
  assert.equal(socle.remise, null)
  assert.deepEqual(socle.lignes, [])
})
