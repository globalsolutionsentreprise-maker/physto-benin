// Tests du cœur de l'enforcement des rôles : lib/verify-admin.js (node --test).
// Matrice admin / lecture / inactif / sans rôle / erreur Supabase / token absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __config } from "./supabase-mock.mjs";

register("./loader.mjs", import.meta.url);

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-mock";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-mock";

const { verifyAdmin, verifyAdminWrite } = await import(new URL("../verify-admin.js", import.meta.url).href);

const reqWithToken = () => new Request("https://s/api/x", { headers: { authorization: "Bearer tok" } });
const reqNoToken = () => new Request("https://s/api/x");
const USER = { id: "u1", email: "k@phyto-benin.com" };

// 1 — admin actif : lecture OK, écriture OK.
test("admin actif → verifyAdmin OK (acces_role=admin), verifyAdminWrite OK", async () => {
  __config({ user: { ...USER }, acces: { actif: true, role: "admin" } });
  const r = await verifyAdmin(reqWithToken());
  assert.ok(r); assert.equal(r.acces_role, "admin");
  const w = await verifyAdminWrite(reqWithToken());
  assert.ok(w);
});

// 2 — lecture actif : lecture OK, écriture REFUSÉE.
test("lecture actif → verifyAdmin OK (consultation), verifyAdminWrite REFUSE", async () => {
  __config({ user: { ...USER }, acces: { actif: true, role: "lecture" } });
  const r = await verifyAdmin(reqWithToken());
  assert.ok(r); assert.equal(r.acces_role, "lecture");
  assert.equal(await verifyAdminWrite(reqWithToken()), null);
});

// 3 — compte inactif : tout refusé (même rôle admin).
test("inactif → verifyAdmin et verifyAdminWrite REFUSENT", async () => {
  __config({ user: { ...USER }, acces: { actif: false, role: "admin" } });
  assert.equal(await verifyAdmin(reqWithToken()), null);
  assert.equal(await verifyAdminWrite(reqWithToken()), null);
});

// 4 — sans rôle (role null) : consultation OK, écriture REFUSÉE (default-deny).
test("sans rôle (null) → verifyAdmin OK, verifyAdminWrite REFUSE (défaut)", async () => {
  __config({ user: { ...USER }, acces: { actif: true, role: null } });
  const r = await verifyAdmin(reqWithToken());
  assert.ok(r); assert.equal(r.acces_role, null);
  assert.equal(await verifyAdminWrite(reqWithToken()), null);
});

// 5 — rôle inconnu : écriture REFUSÉE.
test("rôle inconnu → verifyAdminWrite REFUSE", async () => {
  __config({ user: { ...USER }, acces: { actif: true, role: "editeur" } });
  assert.ok(await verifyAdmin(reqWithToken()));
  assert.equal(await verifyAdminWrite(reqWithToken()), null);
});

// 6 — erreur Supabase : fail-closed (refus).
test("erreur Supabase → REFUSE (fail-closed)", async () => {
  __config({ user: { ...USER }, accesError: { message: "db down" } });
  assert.equal(await verifyAdmin(reqWithToken()), null);
  assert.equal(await verifyAdminWrite(reqWithToken()), null);
});

// 7 — pas dans admin_acces (client espace client avec un compte Auth) : REFUSE.
test("compte hors admin_acces → REFUSE", async () => {
  __config({ user: { ...USER }, acces: null });
  assert.equal(await verifyAdmin(reqWithToken()), null);
});

// 8 — token absent : REFUSE sans même interroger Auth.
test("token absent → REFUSE", async () => {
  __config({ user: { ...USER }, acces: { actif: true, role: "admin" } });
  assert.equal(await verifyAdmin(reqNoToken()), null);
});

// 9 — token invalide (user null) : REFUSE.
test("token invalide (user null) → REFUSE", async () => {
  __config({ user: null, acces: { actif: true, role: "admin" } });
  assert.equal(await verifyAdmin(reqWithToken()), null);
});
