// Anti-abus des endpoints publics : honeypot (register-lead, newsletter), échappement
// HTML des emails (register-lead), fail-closed du cron (weekly-prospects), chemins normaux.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { __log, __reset } from "./mocks.mjs";

register("./loader.mjs", import.meta.url);

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
process.env.RESEND_API_KEY = "re_test"; // pour exercer le chemin email

const { POST: LEAD } = await import(new URL("./register-lead.mjs", import.meta.url).href);
const { POST: NEWS } = await import(new URL("./newsletter.mjs", import.meta.url).href);
const { GET: WEEKLY } = await import(new URL("./weekly.mjs", import.meta.url).href);

// --- Stub global.fetch pour capturer les appels Resend (et ne rien envoyer) ---
let mails = [];
globalThis.fetch = async (url, opts) => {
  mails.push({ url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null });
  return { ok: true, status: 200, async json() { return {}; } };
};

function reqJSON(body) { return { headers: { get: () => null }, async json() { return body || {}; } }; }
function reqGET(headers) { return { headers: { get: (k) => headers[k] ?? headers[k.toLowerCase()] ?? null } }; }

// ============================ register-lead ============================
test("register-lead · honeypot rempli -> faux succès, AUCUN insert ni email", async () => {
  __reset(); mails = [];
  const res = await LEAD(reqJSON({ nom: "Bot", telephone: "100", hp: "je-suis-un-bot" }));
  assert.equal(res.status, 200);
  assert.equal(res._data.ok, true);
  assert.equal(__log().inserts.filter((i) => i.table === "leads").length, 0, "aucun lead inséré");
  assert.equal(mails.length, 0, "aucun email envoyé");
});

test("register-lead · soumission normale -> insert + email avec HTML échappé", async () => {
  __reset(); mails = [];
  const res = await LEAD(reqJSON({ nom: "<script>alert(1)</script>", telephone: "", message: "<b>x</b> & \"y\"" }));
  assert.equal(res.status, 200);
  const ins = __log().inserts.filter((i) => i.table === "leads");
  assert.equal(ins.length, 1, "un lead inséré");
  assert.equal(ins[0].obj.nom, "<script>alert(1)</script>", "la base stocke la valeur brute (pas d'altération métier)");
  assert.equal(mails.length, 1, "un email envoyé");
  const html = mails[0].body.html;
  assert.ok(!html.includes("<script>alert(1)</script>"), "le HTML ne contient PAS le script brut");
  assert.ok(html.includes("&lt;script&gt;"), "le nom est échappé dans le HTML");
  assert.ok(html.includes("&amp;") && html.includes("&quot;"), "& et guillemets échappés");
});

test("register-lead · nom manquant -> 400", async () => {
  __reset(); mails = [];
  const res = await LEAD(reqJSON({ telephone: "123" }));
  assert.equal(res.status, 400);
  assert.equal(mails.length, 0);
});

// ============================ newsletter-subscribe ============================
test("newsletter · honeypot -> faux succès, aucun insert", async () => {
  __reset();
  const res = await NEWS(reqJSON({ email: "a@b.com", hp: "bot" }));
  assert.equal(res.status, 200);
  assert.equal(res._data.ok, true);
  assert.equal(__log().inserts.filter((i) => i.table === "newsletter_subscribers").length, 0);
});

test("newsletter · email valide -> insert normalisé (minuscule)", async () => {
  __reset();
  const res = await NEWS(reqJSON({ email: "  A@B.COM  " }));
  assert.equal(res.status, 200);
  const ins = __log().inserts.filter((i) => i.table === "newsletter_subscribers");
  assert.equal(ins.length, 1);
  assert.equal(ins[0].obj.email, "a@b.com", "email normalisé");
});

test("newsletter · email invalide -> 400, aucun insert", async () => {
  __reset();
  const res = await NEWS(reqJSON({ email: "pas-un-email" }));
  assert.equal(res.status, 400);
  assert.equal(__log().inserts.filter((i) => i.table === "newsletter_subscribers").length, 0);
});

// ============================ weekly-prospects (fail-closed) ============================
test("weekly-prospects · CRON_SECRET absent -> 401 (fail-closed)", async () => {
  delete process.env.CRON_SECRET;
  const res = await WEEKLY(reqGET({ authorization: "Bearer peu-importe" }));
  assert.equal(res.status, 401);
});

test("weekly-prospects · secret présent mais en-tête invalide -> 401", async () => {
  process.env.CRON_SECRET = "s3cr3t";
  const res = await WEEKLY(reqGET({ authorization: "Bearer mauvais" }));
  assert.equal(res.status, 401);
});

test("weekly-prospects · secret correct -> franchit la garde (pas 401)", async () => {
  process.env.CRON_SECRET = "s3cr3t";
  const res = await WEEKLY(reqGET({ authorization: "Bearer s3cr3t" }));
  assert.notEqual(res.status, 401, "le cron Vercel légitime passe la garde");
  delete process.env.CRON_SECRET;
});
