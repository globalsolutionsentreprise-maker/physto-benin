// Tests de la route PUBLIQUE /api/verifier/[token] — runner natif `node --test`.
// Teste la VRAIE route (app/api/verifier/[token]/route.js) avec un mock Supabase.
// 100% hors ligne : aucune requête réseau, aucun accès à Supabase production.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { TOKENS, __getCalls, __reset } from "./supabase-mock.mjs";

// Hooks : mock @supabase/supabase-js + parse de la route en ESM.
register("./loader.mjs", import.meta.url);

// Config serveur (mockée → valeurs sans importance pour la logique).
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-mock";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-mock";

// Import de la route APRÈS register() → son import de @supabase/supabase-js est mocké.
const { GET } = await import(new URL("../route.js", import.meta.url).href);

const ctx = (token) => ({ params: Promise.resolve({ token }) });
const req = (token) => new Request("https://site/api/verifier/" + encodeURIComponent(token));
async function call(token) {
  const res = await GET(req(token), ctx(token));
  let body = null;
  try { body = await res.clone().json(); } catch {}
  return { status: res.status, body, headers: res.headers };
}

// Valeurs sensibles interdites dans toute réponse publique.
const FORBIDDEN = [
  "montant_total", "350000",
  "jane@acme.bj", "email",
  "+2290100000000", "telephone",
  "Rue 12.345", "adresse",
  "3202412345678", "ifu", "RB/COT/24 B 99999", "rccm",
  "devis_id", "dddddddd-dddd",
  "client_id", "cccccccc-cccc",
  "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", // id complet (seul ref 8 car. autorisé)
  "08006", "ECONNREFUSED", "5432",        // détails techniques
];
const leaks = (body) => FORBIDDEN.filter((f) => JSON.stringify(body || {}).includes(f));

// 1 — UUID valide → attestation valide (200, champs publics, no-store, 0 fuite)
test("1. UUID valide → 200 valid:true, champs publics only, no-store, aucune fuite", async () => {
  const r = await call(TOKENS.VALID);
  assert.equal(r.status, 200);
  assert.equal(r.body.valid, true);
  const a = r.body.attestation;
  assert.equal(a.numero_unique, "ATT-GSE-2026-0001");
  assert.equal(a.prestation, "Désinsectisation locaux");
  assert.equal(a.beneficiaire, "Jane Doe");
  assert.equal(a.clients.entreprise, "ACME SARL");
  assert.equal(a.ref, "aaaaaaaa");
  assert.ok((r.headers.get("cache-control") || "").includes("no-store"));
  assert.deepEqual(leaks(r.body), []);
});

// 2 — UUID inexistant (format valide) → 404
test("2. UUID inexistant → 404 valid:false", async () => {
  const r = await call(TOKENS.NONEXISTENT);
  assert.equal(r.status, 404);
  assert.equal(r.body.valid, false);
  assert.equal(r.body.attestation, undefined);
});

// 3 — UUID malformé (8 variantes) → 404 SANS requête DB (validation non contournable)
test("3. UUID malformé (8 variantes, dont SQLi/path traversal) → 404 sans requête DB", async () => {
  const malformes = [
    "", "not-a-uuid", "123",
    "11111111-1111-4111-8111-11111111111",            // trop court
    "11111111-1111-4111-8111-111111111111-extra",     // trop long
    "'; DROP TABLE attestations;--",
    "../../etc/passwd",
    "11111111111141118111111111111111",               // sans tirets
  ];
  for (const t of malformes) {
    __reset();
    const r = await call(t);
    assert.equal(r.status, 404, `token "${t}" devrait donner 404`);
    assert.equal(r.body.valid, false);
    assert.equal(__getCalls(), 0, `aucune requête DB attendue pour "${t}"`);
  }
});

// 4 — Attestation révoquée (statut≠valide) → 404 (uniforme, pas de divulgation)
test("4. Attestation révoquée → 404 valid:false", async () => {
  const r = await call(TOKENS.REVOKED);
  assert.equal(r.status, 404);
  assert.equal(r.body.valid, false);
});

// 5 — Attestation expirée : notion absente du modèle → traitée comme non-valide
test("5. Attestation expirée (N/A au modèle) → 404 valid:false", async () => {
  const r = await call(TOKENS.EXPIRED);
  assert.equal(r.status, 404);
  assert.equal(r.body.valid, false);
});

// 6 — Erreur Supabase → 502, aucun détail technique exposé
test("6. Erreur Supabase → 502, aucun détail technique", async () => {
  const r = await call(TOKENS.ERROR);
  assert.equal(r.status, 502);
  assert.equal(r.body.valid, false);
  assert.deepEqual(leaks(r.body), []);
  assert.equal(r.body.error, "Vérification impossible.");
});

// 7 — service_role absente (anon présent) → 503, aucune requête, pas de fallback anon
test("7. service_role absente → 503, 0 requête, pas de fallback anon", async () => {
  const saved = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY; // anon reste défini
  __reset();
  const r = await call(TOKENS.VALID);
  process.env.SUPABASE_SERVICE_ROLE_KEY = saved;
  assert.equal(r.status, 503);
  assert.equal(__getCalls(), 0);
});
