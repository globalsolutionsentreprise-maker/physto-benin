// Mock @supabase/supabase-js pour tester lib/verify-admin.js — 100% hors ligne.
// Scénario piloté par __config() : user (résolu depuis le token) + ligne admin_acces.
let scenario = {};
export function __config(c) { scenario = c || {}; }

export function createClient(_url, _key) {
  return {
    auth: {
      // anon.auth.getUser(token) : renvoie le user du scénario (null = token invalide).
      async getUser(_token) {
        return { data: { user: scenario.user || null }, error: null };
      },
    },
    from(_table) {
      const b = {
        select() { return b; },
        eq() { return b; },
        async maybeSingle() {
          return { data: scenario.acces ?? null, error: scenario.accesError || null };
        },
      };
      return b;
    },
  };
}
