// Helper de test (dossier privé _verifier-test). Hooks de personnalisation de
// modules (enregistrés via module.register) :
//  (1) remplace le specifier "@supabase/supabase-js" par le mock local ;
//  (2) force la route .js (CJS par défaut dans ce projet) à être parsée en ESM.
import { readFile } from "node:fs/promises";

const MOCK = new URL("./supabase-mock.mjs", import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === "@supabase/supabase-js") {
    return { url: MOCK, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.includes("/app/api/verifier/") && url.endsWith("/route.js")) {
    const source = await readFile(new URL(url), "utf8");
    return { format: "module", source, shortCircuit: true };
  }
  return next(url, context);
}
