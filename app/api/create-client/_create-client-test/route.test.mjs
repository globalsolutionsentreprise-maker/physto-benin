// Tests de /api/create-client — runner natif `node --test`.
// Teste la VRAIE route avec mocks Supabase + verify-admin + fetch (Resend).
// 100% hors ligne : aucune requête réseau, aucun accès prod.
// Cible : P1 #8 audit ECC — bug « email déjà inscrit » (détachait user_id + envoyait
// un mot de passe bidon).
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __config, __log } from "./supabase-mock.mjs";

register("./loader.mjs", import.meta.url);

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-mock";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-mock";
process.env.RESEND_API_KEY = "resend-mock";

const { POST } = await import(new URL("../route.js", import.meta.url).href);

// Stub global fetch (Resend) → journalise les envois sans réseau.
let mails = [];
globalThis.fetch = async (url, opts) => {
  mails.push({ url, body: JSON.parse(opts?.body || "{}") });
  return { ok: true, json: async () => ({ id: "mail-mock" }) };
};

function call(payload) {
  const req = new Request("https://site/api/create-client", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer x" },
    body: JSON.stringify(payload),
  });
  return POST(req);
}
async function body(res) { try { return await res.json(); } catch { return null; } }

// 1 — Nouveau client avec email → compte créé, fiche insérée, email d'accès envoyé.
test("1. Nouveau client (email neuf) → insert + email d'accès avec mot de passe réel", async () => {
  __config({ authExists: false, existingClient: null, newAuthId: "u-new" });
  mails = [];
  const res = await call({ nom: "Doe", prenom: "Jane", email: "jane@acme.bj" });
  const b = await body(res);
  assert.equal(res.status, 200);
  assert.equal(b.success, true);
  assert.equal(b.emailEnvoye, true);
  const log = __log();
  assert.equal(log.inserts.length, 1);
  assert.equal(log.inserts[0].user_id, "u-new"); // lié au compte neuf
  assert.equal(mails.length, 1);                  // email d'accès envoyé
  assert.match(mails[0].body.html, /Mot de passe/);
  assert.equal(log.updateUserByIdCalls, 0);       // jamais de reset
});

// 2 — Email déjà inscrit + fiche existante AVEC user_id → user_id PRÉSERVÉ, 0 email, 0 reset.
test("2. Email déjà inscrit (fiche a déjà user_id) → user_id préservé, aucun email, aucun reset", async () => {
  __config({ authExists: true, existingClient: { id: "c1", user_id: "u-existing" } });
  mails = [];
  const res = await call({ nom: "Doe", email: "jane@acme.bj", telephone: "01" });
  const b = await body(res);
  assert.equal(res.status, 200);
  assert.equal(b.accountExisted, true);
  assert.equal(b.emailEnvoye, false);
  const log = __log();
  assert.equal(log.updates.length, 1);
  assert.equal(log.updates[0].user_id, "u-existing"); // lien conservé, PAS null
  assert.equal(mails.length, 0);                       // aucun identifiant bidon envoyé
  assert.equal(log.updateUserByIdCalls, 0);            // mot de passe jamais réinitialisé
});

// 3 — Email déjà inscrit + fiche SANS user_id → id retrouvé via listUsers, lien posé.
test("3. Email déjà inscrit (fiche user_id null) → id Auth retrouvé via listUsers", async () => {
  __config({
    authExists: true,
    existingClient: { id: "c1", user_id: null },
    authUsers: [{ id: "u-found", email: "jane@acme.bj" }],
  });
  mails = [];
  const res = await call({ nom: "Doe", email: "jane@acme.bj" });
  const b = await body(res);
  assert.equal(res.status, 200);
  assert.equal(b.accountExisted, true);
  const log = __log();
  assert.equal(log.updates[0].user_id, "u-found");
  assert.equal(mails.length, 0);
});

// 4 — Email déjà inscrit, fiche user_id null ET introuvable dans Auth → ne JAMAIS écrire null.
test("4. Email déjà inscrit, id introuvable → user_id absent de l'update (jamais null)", async () => {
  __config({ authExists: true, existingClient: { id: "c1", user_id: null }, authUsers: [] });
  const res = await call({ nom: "Doe", email: "ghost@acme.bj" });
  assert.equal(res.status, 200);
  const log = __log();
  assert.ok(!("user_id" in log.updates[0]), "user_id ne doit pas être posé (donc jamais écrasé par null)");
});

// 5 — Client sans email → insert user_id null, aucun compte, aucun email.
test("5. Client sans email → insert sans compte, aucun email", async () => {
  __config({ existingClient: null, newClientId: "c-ne" });
  mails = [];
  const res = await call({ nom: "SansMail" });
  const b = await body(res);
  assert.equal(res.status, 200);
  assert.equal(b.emailEnvoye, false);
  assert.equal(__log().createUserCalls, 0);
  assert.equal(mails.length, 0);
});

// 6 — nom manquant → 400.
test("6. nom manquant → 400", async () => {
  __config({});
  const res = await call({ email: "x@y.z" });
  assert.equal(res.status, 400);
});

// 7 — Non admin (verifyAdminWrite échoue) → 403 (aucune écriture).
test("7. Non admin → 403", async () => {
  process.env.__TEST_ADMIN_OK = "0";
  __config({});
  const res = await call({ nom: "Doe" });
  process.env.__TEST_ADMIN_OK = "1";
  assert.equal(res.status, 403);
  assert.equal(__log().createUserCalls, 0);
});

// 8 — listUsers échoue sur la branche compte-existant → 500 (pas de lien silencieux).
test("8. listUsers en erreur (compte existant, fiche user_id null) → 500", async () => {
  __config({ authExists: true, existingClient: { id: "c1", user_id: null }, listError: "boom" });
  const res = await call({ nom: "Doe", email: "jane@acme.bj" });
  assert.equal(res.status, 500);
});

// 9 — Compte en PAGE 2 d'Auth → trouvé quand même (pagination exhaustive).
test("9. Compte en page 2 de listUsers → trouvé (pagination)", async () => {
  __config({
    authExists: true,
    existingClient: { id: "c1", user_id: null },
    authUsersByPage: { 1: [{ id: "u-other", email: "autre@x.bj" }], 2: [{ id: "u-page2", email: "jane@acme.bj" }] },
  });
  const res = await call({ nom: "Doe", email: "jane@acme.bj" });
  assert.equal(res.status, 200);
  assert.equal(__log().updates[0].user_id, "u-page2");
  assert.ok(__log().listUsersCalls >= 2);
});

// 10 — Email avec casse/espaces → normalisé (match compte stocké en minuscules).
test("10. Email 'Jane@Acme.bj ' → normalisé, compte page 1 retrouvé", async () => {
  __config({
    authExists: true,
    existingClient: { id: "c1", user_id: null },
    authUsers: [{ id: "u-lc", email: "jane@acme.bj" }],
  });
  const res = await call({ nom: "Doe", email: "  Jane@Acme.bj  " });
  assert.equal(res.status, 200);
  assert.equal(__log().updates[0].user_id, "u-lc");
});
