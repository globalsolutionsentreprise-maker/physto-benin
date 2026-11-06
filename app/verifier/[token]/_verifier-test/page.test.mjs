// Tests de la page publique /verifier/[token] — runner natif `node --test`.
// Assertions statiques (pas de rendu DOM : éviterait d'ajouter jsdom/RTL).
// Vérifie la logique modifiée + la compatibilité des QR déjà imprimés.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const page = read("../page.tsx");
const attPage = read("../../../espace-client/attestations/[id]/page.tsx");
const genAtt = read("../../../api/generate-attestation/route.ts");

test("8. La page appelle /api/verifier/<token>", () => {
  assert.match(page, /fetch\(`\/api\/verifier\/\$\{encodeURIComponent\(token\)\}`/);
});
test("9. Lecture anon Supabase retirée de la page", () => {
  assert.doesNotMatch(page, /supabase|createClient|ANON_KEY/);
});
test("10. notFound si réponse non valide (!res.ok || !json.valid)", () => {
  assert.match(page, /!res\.ok \|\| !json\?\.valid/);
});
test("11. notFound sur erreur réseau (catch)", () => {
  assert.match(page, /catch\s*\{[\s\S]*setNotFound\(true\)/);
});
test("12. Bloc 'Document non trouvé' présent", () => {
  assert.match(page, /Document non trouv/);
});
test("13. Rendu des champs attestation (numero_unique + prestation)", () => {
  assert.match(page, /att\.numero_unique/);
  assert.match(page, /att\.prestation/);
});
test("14. Référence registre = att.ref (plus att.id)", () => {
  assert.match(page, /att\.ref/);
  assert.doesNotMatch(page, /att\.id/);
});
test("15. Responsive mobile (maxWidth 640 + padding)", () => {
  assert.match(page, /maxWidth:\s*"640px"/);
  assert.match(page, /padding:\s*"40px 24px"/);
});
test("16. URL publique /verifier/<token> inchangée (token via useParams)", () => {
  assert.match(page, /useParams\(\)/);
  assert.match(page, /params\.token/);
});
test("17. QR imprimés pointent toujours vers /verifier/<qr_token> (page attestation)", () => {
  assert.match(attPage, /\/verifier\/\$\{att\.qr_token\}/);
});
test("18. QR e-mail pointe vers /verifier/<qr_token> (generate-attestation)", () => {
  assert.match(genAtt, /\/verifier\/\$\{att\.qr_token\}/);
});
