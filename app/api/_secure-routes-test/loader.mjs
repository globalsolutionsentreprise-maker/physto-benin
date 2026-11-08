// Resolve-only loader : redirige les specifiers externes vers mocks.mjs, et l'alias
// @/lib/attestation vers le VRAI module (pour exercer la logique d'émission contre le mock DB).
const M = new URL("./mocks.mjs", import.meta.url).href;
const ATT = new URL("../../../lib/attestation.js", import.meta.url).href;
const CONTRAT = new URL("../../../lib/contrat-analyse.mjs", import.meta.url).href;
const MOCK = new Set(["@supabase/supabase-js", "@/lib/verify-admin", "next/server", "resend"]);
export async function resolve(spec, ctx, next) {
  if (spec === "@/lib/attestation") return { url: ATT, shortCircuit: true };
  if (spec === "@/lib/contrat-analyse.mjs") return { url: CONTRAT, shortCircuit: true };
  if (MOCK.has(spec)) return { url: M, shortCircuit: true };
  return next(spec, ctx);
}
