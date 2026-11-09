// P1 #7 — bascule des écritures CRM vers les RPC transactionnelles.
// Commit 1 : generate_planning -> rpc_replace_planning (DELETE+INSERT atomiques).
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __config, __reset, __log } from "./mocks.mjs";

register("./loader.mjs", import.meta.url);
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";

const { POST: CRM } = await import(new URL("./crm-data.mjs", import.meta.url).href);
function req(body) { return { headers: { get: () => "Bearer x" }, async json() { return body; } }; }
const DEVIS_CONTRAT = { date_debut_contrat: "2026-01-01", frequence_intervention: "trimestrielle", duree_contrat_mois: 12, montant_net: 1000 };

test("generate_planning -> appelle rpc_replace_planning (atomique), aucune écriture directe", async () => {
  __reset();
  __config({ isAdmin: true, rpcReturn: 7, db: { devis: DEVIS_CONTRAT } });
  const res = await CRM(req({ action: "generate_planning", devisId: "DID-1", clientNom: "ACME", adresse: "Rue X" }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.count, 7, "count = retour de la RPC");
  const calls = __log().rpcCalls;
  assert.equal(calls.length, 1, "un seul appel RPC");
  assert.equal(calls[0].name, "rpc_replace_planning");
  assert.equal(calls[0].args.p_devis_id, "DID-1");
  assert.ok(Array.isArray(calls[0].args.p_rows) && calls[0].args.p_rows.length >= 4, "lignes de planning en jsonb");
  for (const r of calls[0].args.p_rows) {
    assert.equal(r.devis_id, "DID-1");
    assert.equal(r.statut, "planifiee");
    assert.ok(r.date_intervention && r.type_passage, "chaque ligne a date + type");
  }
  assert.equal(__log().inserts.filter((i) => i.table === "interventions").length, 0, "plus d'INSERT direct interventions");
  assert.equal(__log().updates.filter((u) => u.table === "interventions").length, 0, "plus d'UPDATE direct interventions");
});

test("generate_planning -> 403 pour un compte lecture, aucune RPC déclenchée", async () => {
  __reset();
  __config({ isActiveAdmin: true, isAdmin: false });
  const res = await CRM(req({ action: "generate_planning", devisId: "DID-1" }));
  assert.equal(res.status, 403);
  assert.equal(__log().rpcCalls.length, 0);
});

test("generate_planning -> erreur RPC remonte en 500", async () => {
  __reset();
  __config({ isAdmin: true, rpcErr: { message: "boom" }, db: { devis: DEVIS_CONTRAT } });
  const res = await CRM(req({ action: "generate_planning", devisId: "DID-1" }));
  assert.equal(res.status, 500);
});

test("generate_planning -> 400 si pas de date de début de contrat (comportement inchangé)", async () => {
  __reset();
  __config({ isAdmin: true, db: { devis: { frequence_intervention: "trimestrielle", duree_contrat_mois: 12 } } });
  const res = await CRM(req({ action: "generate_planning", devisId: "DID-1" }));
  assert.equal(res.status, 400);
  assert.equal(__log().rpcCalls.length, 0);
});
