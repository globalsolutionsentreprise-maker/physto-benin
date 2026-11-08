// Lot A — Tests des routes de règlement HORS SITE (declarer-paiement + valider-paiement)
// et du re-câblage de l'émission d'attestation (lib/attestation via valider-paiement).
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __config, __log, __reset } from "./mocks.mjs";

register("./loader.mjs", import.meta.url);

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
process.env.RESEND_API_KEY = "re";

const { POST: DECLARER } = await import(new URL("./declarer.mjs", import.meta.url).href);
const { POST: VALIDER } = await import(new URL("./valider.mjs", import.meta.url).href);

function req(headers, body) {
  const h = headers || {};
  return { headers: { get: (k) => h[k] ?? h[k.toLowerCase()] ?? null }, async json() { return body || {}; } };
}
const DEVIS = { id: "d1", client_id: "c1", montant_total: 500000, prestation: "T", pct_acompte: 60, statut: "accepte", clients: { email: "c@x", prenom: "A", nom: "B", adresse: "X" } };

// ---------- declarer-paiement ----------
test("DP1 client sans jeton -> 401", async () => {
  __config({}); __reset();
  const r = await DECLARER(req({}, { devisId: "d1", typeVersement: "60", mode: "cheque" }));
  assert.equal(r.status, 401);
});

test("DP2 client propriétaire -> déclaration créée (statut declare), montant serveur", async () => {
  __config({ user: { id: "u1" }, db: { devis: DEVIS, clients: { id: "c1" } } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer x" }, { devisId: "d1", typeVersement: "60", mode: "mobile_money", reference: "MoMo-42" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.statut, "declare");
  assert.equal(body.montant, 300000); // 60% de 500000, recalculé serveur
  const ins = __log().inserts.find((i) => i.table === "paiements");
  assert.equal(ins.obj.statut, "declare");
  assert.equal(ins.obj.mode, "mobile_money");
});

test("DP3 devis d'un AUTRE client -> 403", async () => {
  __config({ user: { id: "pirate" }, db: { devis: DEVIS, clients: null } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer x" }, { devisId: "d1", typeVersement: "60", mode: "cheque" }));
  assert.equal(r.status, 403);
  assert.equal(__log().inserts.length, 0);
});

test("DP4 admin déclare pour n'importe quel devis (sans propriété)", async () => {
  __config({ isAdmin: true, db: { devis: DEVIS } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "60", mode: "cheque", reference: "CHQ-7" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.montant, 300000); // acompte 60% de 500000
});

test("DP5 mode invalide -> 400", async () => {
  __config({ isAdmin: true, db: { devis: DEVIS } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "60", mode: "especes" }));
  assert.equal(r.status, 400);
});

test("DP6 doublon (23505) sur échéance déjà réglée -> 409", async () => {
  __config({
    isAdmin: true, db: { devis: DEVIS },
    insertErr: { paiements: { code: "23505" } },
    // 1re lecture = échéances existantes (vide) ; après 23505 = le paiement gagnant confirmé.
    dbQueue: { paiements: [[], { id: "p-actif", statut: "confirme" }] },
  }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "60", mode: "cheque" }));
  assert.equal(r.status, 409);
});

test("DP7 devis ANNULÉ -> 409, aucune déclaration", async () => {
  __config({ isAdmin: true, db: { devis: { ...DEVIS, statut: "annule" } } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "60", mode: "cheque" }));
  assert.equal(r.status, 409);
  assert.equal(__log().inserts.length, 0);
});

test("DP8 devis BROUILLON (pas à l'étape de règlement) -> 409", async () => {
  __config({ isAdmin: true, db: { devis: { ...DEVIS, statut: "brouillon" } } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "60", mode: "cheque" }));
  assert.equal(r.status, 409);
});

test("DP9 justificatif rattaché à un AUTRE devis -> 400", async () => {
  __config({ isAdmin: true, db: { devis: DEVIS } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "60", mode: "cheque", justificatifUrl: "autre-devis/x.png" }));
  assert.equal(r.status, 400);
  assert.equal(__log().inserts.length, 0);
});

test("DP10 solde EN_COURS avec acompte confirmé -> déclaration acceptée", async () => {
  __config({ isAdmin: true, db: {
    devis: { ...DEVIS, statut: "en_cours" }, // pct_acompte 60 -> solde 40% = 200000
    paiements: [{ type_versement: "60", montant: 300000, statut: "confirme" }],
  } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "40", mode: "mobile_money", justificatifUrl: "d1/recu.png" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.statut, "declare");
  assert.equal(body.montant, 200000);
});

// ---------- Modalités : 50/50 et 100 % ----------
test("DP11 fractionné 50/50 — acompte -> montant = 50 %", async () => {
  __config({ isAdmin: true, db: { devis: { ...DEVIS, pct_acompte: 50 } } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "60", mode: "cheque" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.montant, 250000); // 50% de 500000
});

test("DP12 fractionné 50/50 — solde AVANT acompte confirmé -> 409", async () => {
  __config({ isAdmin: true, db: { devis: { ...DEVIS, pct_acompte: 50, statut: "en_cours" } } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "40", mode: "cheque" }));
  assert.equal(r.status, 409);
  assert.equal(__log().inserts.length, 0);
});

test("DP13 fractionné 50/50 — solde APRÈS acompte confirmé -> 200", async () => {
  __config({ isAdmin: true, db: {
    devis: { ...DEVIS, pct_acompte: 50, statut: "en_cours" },
    paiements: [{ type_versement: "60", montant: 250000, statut: "confirme" }],
  } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "40", mode: "mobile_money" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.montant, 250000); // solde 50%
});

test("DP14 paiement INTÉGRAL 100 % — acompte = montant total -> 200", async () => {
  __config({ isAdmin: true, db: { devis: { ...DEVIS, pct_acompte: 100 } } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "60", mode: "cheque" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.montant, 500000); // 100%
});

test("DP15 INTÉGRAL 100 % — tentative de 'solde' (0 FCFA) -> 409", async () => {
  __config({ isAdmin: true, db: { devis: { ...DEVIS, pct_acompte: 100, statut: "en_cours" } } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "40", mode: "cheque" }));
  assert.equal(r.status, 409); // montant 0 -> rien à régler
  assert.equal(__log().inserts.length, 0);
});

test("DP16 déclaration dépassant le restant dû -> 409", async () => {
  // Déjà 400000 confirmés ; acompte 50% = 250000 > restant 100000.
  __config({ isAdmin: true, db: {
    devis: { ...DEVIS, pct_acompte: 50 },
    paiements: [{ type_versement: "40", montant: 400000, statut: "confirme" }],
  } }); __reset();
  const r = await DECLARER(req({ authorization: "Bearer admin" }, { devisId: "d1", typeVersement: "60", mode: "cheque" }));
  assert.equal(r.status, 409);
  assert.equal(__log().inserts.length, 0);
});

// ---------- valider-paiement ----------
test("VP1 non-admin -> 403", async () => {
  __config({ isAdmin: false }); __reset();
  const r = await VALIDER(req({}, { paiementId: "p1", action: "confirmer" }));
  assert.equal(r.status, 403);
});

test("VP2 rejet -> statut rejete + note", async () => {
  __config({ isAdmin: true, db: { paiements: { id: "p1", devis_id: "d1", montant: 300000, statut: "declare", type_versement: "60" } } }); __reset();
  const r = await VALIDER(req({ authorization: "Bearer admin" }, { paiementId: "p1", action: "rejeter", note: "chèque sans provision" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.statut, "rejete");
  const up = __log().updates.find((u) => u.table === "paiements");
  assert.equal(up.obj.statut, "rejete");
  assert.equal(up.obj.verif_note, "chèque sans provision");
});

test("VP3 confirmation d'un ACOMPTE (non soldé) -> devis en_cours, pas d'attestation", async () => {
  __config({
    isAdmin: true, db: { devis: DEVIS },
    dbQueue: { paiements: [
      { id: "p1", devis_id: "d1", montant: 300000, statut: "declare", type_versement: "60" }, // lecture initiale
      [{ montant: 300000, statut: "confirme" }],                                                // total après confirm
    ] },
  }); __reset();
  const r = await VALIDER(req({ authorization: "Bearer admin" }, { paiementId: "p1", action: "confirmer" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.solde, false);
  assert.ok(__log().updates.some((u) => u.table === "devis" && u.obj.statut === "en_cours"));
  assert.equal(__log().inserts.filter((i) => i.table === "attestations").length, 0, "aucune attestation sur acompte");
});

test("VP4 confirmation du SOLDE -> devis soldé -> émission attestation", async () => {
  __config({
    isAdmin: true,
    db: { devis: DEVIS, attestations: null },
    insertReturn: { attestations: { id: "att1", qr_token: "qr", numero_unique: "N1" } },
    dbQueue: { paiements: [
      { id: "p2", devis_id: "d1", montant: 200000, statut: "declare", type_versement: "40" }, // lecture initiale
      [{ montant: 300000, statut: "confirme" }, { montant: 200000, statut: "confirme" }],       // total (soldé) pour le calcul
      [{ montant: 300000, statut: "confirme" }, { montant: 200000, statut: "confirme" }],       // relecture par emettreAttestation
    ] },
  }); __reset();
  const r = await VALIDER(req({ authorization: "Bearer admin" }, { paiementId: "p2", action: "confirmer" }));
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.solde, true);
  assert.equal(__log().inserts.filter((i) => i.table === "attestations").length, 1, "attestation émise au solde");
});

test("VP5 déjà confirmé -> 409 (idempotence)", async () => {
  __config({ isAdmin: true, db: { paiements: { id: "p1", devis_id: "d1", montant: 300000, statut: "confirme", type_versement: "60" } } }); __reset();
  const r = await VALIDER(req({ authorization: "Bearer admin" }, { paiementId: "p1", action: "confirmer" }));
  assert.equal(r.status, 409);
});
