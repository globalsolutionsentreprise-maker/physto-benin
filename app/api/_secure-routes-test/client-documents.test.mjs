// Étape C — Route /api/client-documents : téléchargement sécurisé côté client.
// Vérifie : auth requise, document publié uniquement, propriété stricte (un client
// ne peut pas obtenir le fichier d'un autre), URL signée seulement si tout est OK.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __config, __reset } from "./mocks.mjs";

register("./loader.mjs", import.meta.url);
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";

const { POST } = await import(new URL("./client-documents.mjs", import.meta.url).href);

function req(body, token = "tok") {
  return {
    headers: { get: (k) => (String(k).toLowerCase() === "authorization" ? (token ? "Bearer " + token : undefined) : "application/json") },
    async json() { return body; },
  };
}

test("401 sans token", async () => {
  __reset(); __config({ user: { id: "u1" } });
  assert.equal((await POST(req({ action: "download", documentId: "d1" }, null))).status, 401);
});

test("401 si session invalide (user null)", async () => {
  __reset(); __config({ user: null });
  assert.equal((await POST(req({ action: "download", documentId: "d1" }))).status, 401);
});

test("400 action inconnue", async () => {
  __reset(); __config({ user: { id: "u1" } });
  assert.equal((await POST(req({ action: "autre", documentId: "d1" }))).status, 400);
});

test("400 documentId manquant", async () => {
  __reset(); __config({ user: { id: "u1" } });
  assert.equal((await POST(req({ action: "download" }))).status, 400);
});

test("404 document introuvable", async () => {
  __reset(); __config({ user: { id: "u1" }, db: { documents: null } });
  assert.equal((await POST(req({ action: "download", documentId: "d1" }))).status, 404);
});

test("403 si le document n'est PAS publié (brouillon)", async () => {
  __reset(); __config({ user: { id: "u1" }, db: { documents: { client_id: "cX", statut: "brouillon", storage_path: "p" } } });
  assert.equal((await POST(req({ action: "download", documentId: "d1" }))).status, 403);
});

test("403 si le document appartient à un AUTRE client", async () => {
  __reset(); __config({ user: { id: "u1" }, db: { documents: { client_id: "cAutre", statut: "publie", storage_path: "p" }, clients: null } });
  const res = await POST(req({ action: "download", documentId: "d1" }));
  assert.equal(res.status, 403);
});

test("200 + URL signée pour un document publié du bon client", async () => {
  __reset(); __config({ user: { id: "u1" }, db: { documents: { client_id: "cMoi", statut: "publie", storage_path: "cMoi/x.pdf" }, clients: { id: "cMoi" } } });
  const res = await POST(req({ action: "download", documentId: "d1" }));
  assert.equal(res.status, 200);
  assert.match((await res.json()).url, /^https:\/\/signed\//);
});
