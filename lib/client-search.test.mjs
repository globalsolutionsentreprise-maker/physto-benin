// node --test lib/client-search.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { normTel, clientMatchesQuery } from "./client-search.mjs"

// Client de référence : téléphone stocké tel quel en base (jamais réécrit).
const C = { prenom: "Jean", nom: "Dagbé", entreprise: "Hôtel Océan", email: "jean@ocean.bj", telephone: "+229 01 53 04 79 50" }

test("numéro complet (avec espaces) → match", () => {
  assert.equal(clientMatchesQuery(C, "+229 01 53 04 79 50"), true)
  assert.equal(clientMatchesQuery(C, "0153047950"), true)
})

test("derniers chiffres du numéro → match", () => {
  assert.equal(clientMatchesQuery(C, "047950"), true)
  assert.equal(clientMatchesQuery(C, "79 50"), true)
})

test("préfixe 00229 → match (numéro local identique)", () => {
  assert.equal(clientMatchesQuery(C, "0022901530479"), true)
})

test("préfixe 229 brut → match", () => {
  assert.equal(clientMatchesQuery(C, "22901530479"), true)
})

test("numéro qui ne correspond pas → pas de match", () => {
  assert.equal(clientMatchesQuery(C, "0190000000"), false)
})

test("par nom / prénom (insensible casse + accents)", () => {
  assert.equal(clientMatchesQuery(C, "jean"), true)
  assert.equal(clientMatchesQuery(C, "dagbe"), true)   // sans accent
  assert.equal(clientMatchesQuery(C, "DAGBÉ"), true)
})

test("par établissement / entreprise (accents tolérés)", () => {
  assert.equal(clientMatchesQuery(C, "hotel"), true)   // Hôtel sans accent
  assert.equal(clientMatchesQuery(C, "océan"), true)
})

test("par email", () => {
  assert.equal(clientMatchesQuery(C, "ocean.bj"), true)
})

test("sans résultat → false", () => {
  assert.equal(clientMatchesQuery(C, "zzzzz"), false)
})

test("requête vide → true (liste normale)", () => {
  assert.equal(clientMatchesQuery(C, ""), true)
  assert.equal(clientMatchesQuery(C, "   "), true)
})

test("normTel retire bien les préfixes", () => {
  assert.equal(normTel("+229 01 53 04 79 50"), "0153047950")
  assert.equal(normTel("0022901530479"), "01530479")
  assert.equal(normTel("22901530479"), "01530479")
  assert.equal(normTel("0153047950"), "0153047950")
})

test("téléphone absent → pas de crash, pas de match tel", () => {
  assert.equal(clientMatchesQuery({ nom: "Sans Tel" }, "0153"), false)
  assert.equal(clientMatchesQuery({ nom: "Sans Tel" }, "sans"), true)
})
