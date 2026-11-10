// Étape B — Route /api/admin-documents : permissions, validation, et sûreté des
// opérations fichier (remplacement = nouveau avant suppression de l'ancien ;
// suppression = fichier retiré avant la ligne, ligne conservée si le retrait échoue).
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __config, __reset, __log } from "./mocks.mjs";

register("./loader.mjs", import.meta.url);
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";

const { POST } = await import(new URL("./admin-documents.mjs", import.meta.url).href);

function jreq(body) {
  return { headers: { get: (k) => (String(k).toLowerCase() === "content-type" ? "application/json" : "Bearer x") }, async json() { return body; } };
}
function mreq(fields, file) {
  const map = new Map(Object.entries(fields));
  if (file) map.set("file", file);
  return {
    headers: { get: (k) => (String(k).toLowerCase() === "content-type" ? "multipart/form-data; boundary=x" : "Bearer x") },
    async formData() { return { get: (k) => (map.has(k) ? map.get(k) : null) }; },
  };
}
const pdf = (size = 1000) => ({ type: "application/pdf", size, name: "f.pdf", async arrayBuffer() { return new ArrayBuffer(size); } });
const png = () => ({ type: "image/png", size: 10, name: "x.png", async arrayBuffer() { return new ArrayBuffer(10); } });

// ---------- Permissions ----------
test("écriture refusée sans auth (403)", async () => {
  __reset(); __config({});
  const res = await POST(mreq({ action: "add", clientId: "c1", categorie: "facture", titre: "T" }, pdf()));
  assert.equal(res.status, 403);
});

test("écriture refusée pour un compte LECTURE (verifyAdminWrite exige admin)", async () => {
  __reset(); __config({ isActiveAdmin: true, isAdmin: false });
  const res = await POST(mreq({ action: "add", clientId: "c1", categorie: "facture", titre: "T" }, pdf()));
  assert.equal(res.status, 403);
});

test("lecture (list) autorisée pour un compte LECTURE", async () => {
  __reset(); __config({ isActiveAdmin: true, isAdmin: false, db: { documents: [{ id: "d1", titre: "x" }] } });
  const res = await POST(jreq({ action: "list", clientId: "c1" }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).documents.length, 1);
});

test("list sans auth (403)", async () => {
  __reset(); __config({});
  assert.equal((await POST(jreq({ action: "list", clientId: "c1" }))).status, 403);
});

// ---------- Validation fichier ----------
test("ajout refusé si le fichier n'est pas un PDF", async () => {
  __reset(); __config({ isAdmin: true });
  const res = await POST(mreq({ action: "add", clientId: "c1", categorie: "facture", titre: "T" }, png()));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /PDF/);
});

test("ajout refusé si > 4 Mo (message explicite)", async () => {
  __reset(); __config({ isAdmin: true });
  const res = await POST(mreq({ action: "add", clientId: "c1", categorie: "facture", titre: "T" }, pdf(5 * 1024 * 1024)));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /volumineux/);
});

test("catégorie invalide refusée", async () => {
  __reset(); __config({ isAdmin: true });
  const res = await POST(mreq({ action: "add", clientId: "c1", categorie: "n_importe_quoi", titre: "T" }, pdf()));
  assert.equal(res.status, 400);
});

// ---------- Le dépôt ne publie JAMAIS ----------
test("add crée en 'brouillon' (jamais publié automatiquement)", async () => {
  __reset(); __config({ isAdmin: true, db: { clients: { id: "c1" } } });
  const res = await POST(mreq({ action: "add", clientId: "c1", categorie: "facture", titre: "Facture 1" }, pdf()));
  assert.equal(res.status, 200);
  const ins = __log().inserts.find((i) => i.table === "documents");
  assert.ok(ins, "insert documents effectué");
  assert.equal(ins.obj.statut, "brouillon");
  assert.equal(ins.obj.client_id, "c1", "document associé au bon client");
  assert.equal(__log().updates.length, 0, "aucune publication implicite");
});

test("add refusé si le client n'existe pas", async () => {
  __reset(); __config({ isAdmin: true, db: { clients: null } });
  assert.equal((await POST(mreq({ action: "add", clientId: "zzz", categorie: "facture", titre: "T" }, pdf()))).status, 404);
});

// ---------- Download (URL signée) ----------
test("download renvoie une URL signée", async () => {
  __reset(); __config({ isActiveAdmin: true, db: { documents: { storage_path: "c1/x.pdf" } } });
  const res = await POST(jreq({ action: "download", id: "d1" }));
  assert.equal(res.status, 200);
  assert.match((await res.json()).url, /^https:\/\/signed\//);
});

// ---------- Suppression : fichier AVANT ligne ; ligne conservée si le fichier échoue ----------
test("delete échoue si le retrait du fichier échoue, et NE supprime PAS la ligne", async () => {
  __reset(); __config({ isAdmin: true, db: { documents: { storage_path: "c1/x.pdf" } }, removeErr: { message: "boom" } });
  const res = await POST(jreq({ action: "delete", id: "d1" }));
  assert.equal(res.status, 500);
  assert.equal(__log().deletes.length, 0, "la ligne n'est pas supprimée si le fichier reste");
});

test("delete OK : fichier retiré puis ligne supprimée (pas d'orphelin)", async () => {
  __reset(); __config({ isAdmin: true, db: { documents: { storage_path: "c1/x.pdf" } } });
  const res = await POST(jreq({ action: "delete", id: "d1" }));
  assert.equal(res.status, 200);
  assert.deepEqual(__log().removes[0], ["c1/x.pdf"], "fichier retiré");
  assert.ok(__log().deletes.includes("documents"), "ligne supprimée");
});

// ---------- Remplacement : nouveau fichier AVANT suppression de l'ancien ----------
test("replace : si l'upload du nouveau échoue, l'ancien n'est PAS supprimé et la ligne n'est pas modifiée", async () => {
  __reset(); __config({ isAdmin: true, db: { documents: { client_id: "c1", storage_path: "c1/old.pdf" } }, uploadErr: { message: "boom" } });
  const res = await POST(mreq({ action: "replace", id: "d1" }, pdf()));
  assert.equal(res.status, 500);
  assert.equal(__log().updates.length, 0, "ligne non modifiée");
  assert.equal(__log().removes.length, 0, "ancien fichier conservé");
});

test("replace OK : ligne pointée sur le nouveau, ancien fichier retiré ensuite", async () => {
  __reset(); __config({ isAdmin: true, db: { documents: { client_id: "c1", storage_path: "c1/old.pdf" } } });
  const res = await POST(mreq({ action: "replace", id: "d1" }, pdf()));
  assert.equal(res.status, 200);
  assert.ok(__log().updates.find((u) => u.table === "documents" && typeof u.obj.storage_path === "string"), "storage_path mis à jour");
  assert.deepEqual(__log().removes[0], ["c1/old.pdf"], "ancien fichier retiré après coup");
});

// ---------- update réservé à l'écriture admin ----------
test("update refusé pour un compte lecture", async () => {
  __reset(); __config({ isActiveAdmin: true, isAdmin: false });
  assert.equal((await POST(jreq({ action: "update", id: "d1", titre: "x" }))).status, 403);
});

test("publish/archive mettent à jour le statut", async () => {
  __reset(); __config({ isAdmin: true });
  assert.equal((await POST(jreq({ action: "publish", id: "d1" }))).status, 200);
  const up = __log().updates.find((u) => u.obj.statut === "publie");
  assert.ok(up && up.obj.published_at, "publish pose statut=publie + published_at");
});
