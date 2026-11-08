// Lot B — Tests des routes ADMIN de consultation (paiements-data) et d'upload de
// justificatif (justificatif-upload) : autorisations, validation type/taille, propriété.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __config, __log, __reset } from "./mocks.mjs";

register("./loader.mjs", import.meta.url);

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";

const { GET: PAIEMENTS_DATA } = await import(new URL("./paiements-data.mjs", import.meta.url).href);
const { POST: UPLOAD } = await import(new URL("./justif-upload.mjs", import.meta.url).href);

function req(headers) {
  const h = headers || {};
  return { headers: { get: (k) => h[k] ?? h[k.toLowerCase()] ?? null } };
}
function reqForm(headers, fd) {
  const h = headers || {};
  return { headers: { get: (k) => h[k] ?? h[k.toLowerCase()] ?? null }, async formData() { return fd; } };
}
function fichier(bytes, type, name) {
  return new File([new Uint8Array(bytes)], name, { type });
}

// ---------- paiements-data (lecture admin) ----------
test("PD1 non autorisé (ni admin ni lecture) -> 403", async () => {
  __config({ isAdmin: false, isActiveAdmin: false }); __reset();
  const r = await PAIEMENTS_DATA(req({}));
  assert.equal(r.status, 403);
});

test("PD2 lecture OK -> 200, justificatif en URL signée (jamais publique)", async () => {
  __config({ isActiveAdmin: true, db: { paiements: [
    { id: "p1", type_versement: "60", montant: 300000, statut: "declare", justificatif_url: "d1/a.png", devis: { numero: "D-1" }, clients: { nom: "X" } },
  ] } }); __reset();
  const r = await PAIEMENTS_DATA(req({ authorization: "Bearer lecture" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.paiements.length, 1);
  assert.equal(body.paiements[0].justificatifSignedUrl, "https://signed/d1/a.png");
});

// ---------- justificatif-upload ----------
test("UP1 sans auth -> 401", async () => {
  __config({ isAdmin: false }); __reset();
  const fd = new FormData(); fd.append("devisId", "d1"); fd.append("file", fichier(10, "image/png", "a.png"));
  const r = await UPLOAD(reqForm({}, fd));
  assert.equal(r.status, 401);
});

test("UP2 type non autorisé -> 415", async () => {
  __config({ isAdmin: true, db: { devis: { id: "d1", client_id: "c1" } } }); __reset();
  const fd = new FormData(); fd.append("devisId", "d1"); fd.append("file", fichier(10, "text/plain", "a.txt"));
  const r = await UPLOAD(reqForm({ authorization: "Bearer admin" }, fd));
  assert.equal(r.status, 415);
  assert.equal(__log().inserts.filter((i) => i.table === "storage").length, 0);
});

test("UP3 fichier trop volumineux -> 413", async () => {
  __config({ isAdmin: true, db: { devis: { id: "d1", client_id: "c1" } } }); __reset();
  const fd = new FormData(); fd.append("devisId", "d1"); fd.append("file", fichier(4 * 1024 * 1024 + 1, "image/png", "big.png"));
  const r = await UPLOAD(reqForm({ authorization: "Bearer admin" }, fd));
  assert.equal(r.status, 413);
});

test("UP4 client NON propriétaire -> 403", async () => {
  __config({ isAdmin: false, user: { id: "pirate" }, db: { devis: { id: "d1", client_id: "c1" }, clients: null } }); __reset();
  const fd = new FormData(); fd.append("devisId", "d1"); fd.append("file", fichier(10, "image/png", "a.png"));
  const r = await UPLOAD(reqForm({ authorization: "Bearer x" }, fd));
  assert.equal(r.status, 403);
});

test("UP5 admin + fichier valide -> 200, chemin privé retourné", async () => {
  __config({ isAdmin: true, db: { devis: { id: "d1", client_id: "c1" } } }); __reset();
  const fd = new FormData(); fd.append("devisId", "d1"); fd.append("file", fichier(2048, "image/jpeg", "recu.jpg"));
  const r = await UPLOAD(reqForm({ authorization: "Bearer admin" }, fd));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.ok(body.path.startsWith("d1/"), "chemin préfixé par devisId");
  assert.ok(body.path.endsWith(".jpg"));
  assert.equal(__log().inserts.filter((i) => i.table === "storage").length, 1);
});
