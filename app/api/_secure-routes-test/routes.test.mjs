// Tests exécutables (node --import tsx --test) des gardes de generate-attestation
// (accès admin-only). Chemins de rejet = aucun appel Resend réel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __config, __log, __reset } from "./mocks.mjs";

register("./loader.mjs", import.meta.url);

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
process.env.RESEND_API_KEY = "re";

const { POST: GEN } = await import(new URL("./gen.mjs", import.meta.url).href);

function req(headers, body) {
  const h = headers || {};
  return { headers: { get: (k) => h[k] ?? h[k.toLowerCase()] ?? null }, async json() { return body || {}; } };
}
const DEVIS = { id: "d1", client_id: "c1", montant_total: 500000, prestation: "T", pct_acompte: 60, clients: { email: "c@x", prenom: "A", nom: "B", adresse: "X" } };

// ---------- generate-attestation (admin-only) ----------
test("GA1 anon (non admin) -> 403", async () => {
  __config({ isAdmin: false }); __reset();
  const r = await GEN(req({}, { devisId: "d1" }));
  assert.equal(r.status, 403);
});

test("GA2 profil lecture -> 403 (verifyAdminWrite refuse)", async () => {
  __config({ isAdmin: false, isActiveAdmin: true }); __reset();
  const r = await GEN(req({ authorization: "Bearer lecture" }, { devisId: "d1" }));
  assert.equal(r.status, 403);
});

test("GA3 admin + devis NON soldé -> 402, aucune émission", async () => {
  __config({ isAdmin: true, db: { devis: DEVIS, paiements: [{ montant: 100000, statut: "confirme" }] } }); __reset();
  const r = await GEN(req({ authorization: "Bearer admin" }, { devisId: "d1" }));
  assert.equal(r.status, 402);
  assert.equal(__log().inserts.length, 0);
});

test("GA4 admin + soldé + pas d'attestation existante -> 200 (créée)", async () => {
  __config({ isAdmin: true, db: { devis: DEVIS, paiements: [{ montant: 500000, statut: "confirme" }], attestations: null }, insertReturn: { attestations: { id: "att1", qr_token: "qr", numero_unique: "N1" } } }); __reset();
  const r = await GEN(req({ authorization: "Bearer admin" }, { devisId: "d1" }));
  assert.equal(r.status, 200);
  assert.equal(__log().inserts.filter((i) => i.table === "attestations").length, 1);
});

test("GA5 admin + soldé + attestation DÉJÀ existante -> 200 alreadyExists, pas d'insert (réémission sûre)", async () => {
  __config({ isAdmin: true, db: { devis: DEVIS, paiements: [{ montant: 500000, statut: "confirme" }], attestations: { id: "old", numero_unique: "N0", qr_token: "q0" } } }); __reset();
  const r = await GEN(req({ authorization: "Bearer admin" }, { devisId: "d1" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.alreadyExists, true);
  assert.equal(__log().inserts.length, 0);
});
