// P2 — Séparation des rôles : prouve qu'un compte "lecture" ne peut effectuer AUCUNE
// écriture via les routes admin, tandis que l'admin conserve l'accès. Garde SERVEUR
// (le masquage des boutons UI n'est pas testé ici : c'est de la défense en profondeur).
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __config, __reset } from "./mocks.mjs";

register("./loader.mjs", import.meta.url);

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";

const { POST: CRM } = await import(new URL("./crm-data.mjs", import.meta.url).href);
const { POST: RH } = await import(new URL("./rh-data.mjs", import.meta.url).href);
const { POST: RECRUT } = await import(new URL("./recrutement.mjs", import.meta.url).href);
const { POST: PROSPECT } = await import(new URL("./prospection.mjs", import.meta.url).href);
const { POST: ADMINAUTH } = await import(new URL("./admin-auth.mjs", import.meta.url).href);
const { POST: CREATECLIENT } = await import(new URL("./create-client.mjs", import.meta.url).href);

function req(body, headers) {
  const h = headers || { authorization: "Bearer x" };
  return { headers: { get: (k) => h[k] ?? h[k.toLowerCase()] ?? null }, async json() { return body || {}; } };
}
const LECTURE = { isActiveAdmin: true, isAdmin: false }; // verifyAdmin -> acces_role "lecture"
const ADMIN = { isAdmin: true };                          // verifyAdmin/Write -> "admin"
const ANON = { isActiveAdmin: false, isAdmin: false };    // verifyAdmin -> null

// ---------- LECTURE bloqué en écriture ----------
test("crm-data : lecture + action d'écriture -> 403", async () => {
  __config(LECTURE); __reset();
  const r = await CRM(req({ action: "supprimer_devis", id: "d1" }));
  assert.equal(r.status, 403);
});
test("crm-data : non authentifié -> 401", async () => {
  __config(ANON); __reset();
  const r = await CRM(req({ action: "supprimer_devis" }, {}));
  assert.equal(r.status, 401);
});

test("rh-data : lecture + POST (écriture) -> 403", async () => {
  __config(LECTURE); __reset();
  const r = await RH(req({ action: "ajouter_personnel", nom: "X" }));
  assert.equal(r.status, 403);
});
test("rh-data : non authentifié -> 401", async () => {
  __config(ANON); __reset();
  const r = await RH(req({ action: "ajouter_personnel" }, {}));
  assert.equal(r.status, 401);
});

test("recrutement : lecture + action d'écriture -> 403", async () => {
  __config(LECTURE); __reset();
  const r = await RECRUT(req({ action: "supprimer_offre", id: "o1" }));
  assert.equal(r.status, 403);
});
test("recrutement : lecture + action de LECTURE (cv_url) -> NON bloqué", async () => {
  __config({ ...LECTURE, db: { candidatures: { cv_path: "c/x.pdf" } } }); __reset();
  const r = await RECRUT(req({ action: "cv_url", path: "c/x.pdf" }));
  assert.notEqual(r.status, 403);
  assert.notEqual(r.status, 401);
});

test("prospection : lecture + POST (écriture) -> 403", async () => {
  __config(LECTURE); __reset();
  const r = await PROSPECT(req({ action: "importer", lignes: [] }));
  assert.equal(r.status, 403);
});
test("prospection : non authentifié -> 401", async () => {
  __config(ANON); __reset();
  const r = await PROSPECT(req({ action: "importer" }, {}));
  assert.equal(r.status, 401);
});

test("admin-auth : lecture + create_user -> 401 (gestion des comptes réservée admin)", async () => {
  __config(LECTURE); __reset();
  const r = await ADMINAUTH(req({ action: "create_user", email: "x@y", password: "p" }));
  assert.equal(r.status, 401);
});

test("create-client (write standalone, verifyAdminWrite) : lecture -> 403", async () => {
  __config(LECTURE); __reset();
  const r = await CREATECLIENT(req({ prenom: "A", nom: "B", email: "a@b" }));
  assert.equal(r.status, 403);
});
test("create-client : non authentifié -> 403", async () => {
  __config(ANON); __reset();
  const r = await CREATECLIENT(req({ prenom: "A" }, {}));
  assert.equal(r.status, 403);
});

// ---------- ADMIN conserve l'accès (passe la garde) ----------
test("crm-data : admin + action d'écriture -> PAS 401/403 (garde franchie)", async () => {
  __config({ ...ADMIN, db: {} }); __reset();
  const r = await CRM(req({ action: "action_inconnue_pour_test" }));
  assert.notEqual(r.status, 401);
  assert.notEqual(r.status, 403);
});
test("prospection : admin + POST -> PAS 401/403 (garde franchie)", async () => {
  __config({ ...ADMIN, db: {} }); __reset();
  const r = await PROSPECT(req({ action: "action_inconnue_pour_test" }));
  assert.notEqual(r.status, 401);
  assert.notEqual(r.status, 403);
});
