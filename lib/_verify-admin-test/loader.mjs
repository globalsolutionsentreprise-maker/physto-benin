// Hooks de test : mock "@supabase/supabase-js" + parse de lib/verify-admin.js en ESM.
import { readFile } from "node:fs/promises";
const MOCK = new URL("./supabase-mock.mjs", import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === "@supabase/supabase-js") return { url: MOCK, shortCircuit: true };
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.endsWith("/lib/verify-admin.js")) {
    const source = await readFile(new URL(url), "utf8");
    return { format: "module", source, shortCircuit: true };
  }
  return next(url, context);
}
