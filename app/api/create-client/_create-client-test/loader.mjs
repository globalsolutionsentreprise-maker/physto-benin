// Helper de test (dossier privé _create-client-test). Hooks de module :
//  (1) remplace "@supabase/supabase-js" par le mock local ;
//  (2) remplace "@/lib/verify-admin" par le mock local ;
//  (3) force la route .js (CJS par défaut dans ce projet) à être parsée en ESM.
import { readFile } from "node:fs/promises";

const SUPA_MOCK = new URL("./supabase-mock.mjs", import.meta.url).href;
const VERIFY_MOCK = new URL("./verify-admin-mock.mjs", import.meta.url).href;
const NEXT_MOCK = new URL("./next-server-mock.mjs", import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === "@supabase/supabase-js") {
    return { url: SUPA_MOCK, shortCircuit: true };
  }
  if (specifier === "@/lib/verify-admin") {
    return { url: VERIFY_MOCK, shortCircuit: true };
  }
  if (specifier === "next/server") {
    return { url: NEXT_MOCK, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.includes("/app/api/create-client/") && url.endsWith("/route.js")) {
    const source = await readFile(new URL(url), "utf8");
    return { format: "module", source, shortCircuit: true };
  }
  return next(url, context);
}
