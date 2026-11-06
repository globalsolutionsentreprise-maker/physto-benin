// Mock de @supabase/supabase-js pour create-client — 100% hors ligne, aucune prod.
// Scénario piloté par __config() ; les écritures sont journalisées dans __log().

let scenario = {};
let log = { updates: [], inserts: [], createUserCalls: 0, listUsersCalls: 0, updateUserByIdCalls: 0 };

export function __config(c) {
  scenario = c || {};
  log = { updates: [], inserts: [], createUserCalls: 0, listUsersCalls: 0, updateUserByIdCalls: 0 };
}
export function __log() { return log; }

export function createClient(_url, _key, _opts) {
  return {
    auth: {
      admin: {
        async createUser({ email, password }) {
          log.createUserCalls++;
          if (scenario.authExists) {
            return { data: null, error: { message: "A user with this email address has already been registered" } };
          }
          return { data: { user: { id: scenario.newAuthId || "u-new", email, password } }, error: null };
        },
        async listUsers(opts) {
          log.listUsersCalls++;
          if (scenario.listError) return { data: null, error: { message: scenario.listError } };
          // Paginé : page 1 renvoie les comptes, pages suivantes vides (fin de liste).
          const page = opts?.page || 1;
          if (scenario.authUsersByPage) {
            return { data: { users: scenario.authUsersByPage[page] || [] }, error: null };
          }
          return { data: { users: page === 1 ? (scenario.authUsers || []) : [] }, error: null };
        },
        async updateUserById() {
          // La route ne DOIT jamais réinitialiser un mot de passe → compteur de garde.
          log.updateUserByIdCalls++;
          return { data: null, error: null };
        },
      },
    },
    from(_table) {
      let op = "select";
      let pendingObj = null;
      const b = {
        select() { return b; },
        insert(obj) { op = "insert"; pendingObj = obj; return b; },
        update(fields) { op = "update"; pendingObj = fields; return b; },
        eq() { return b; },
        async maybeSingle() {
          return { data: scenario.existingClient ?? null, error: scenario.selectError || null };
        },
        async single() {
          if (op === "insert") {
            log.inserts.push(pendingObj);
            return { data: { id: scenario.newClientId || "c-new", ...pendingObj }, error: scenario.insertError || null };
          }
          return { data: null, error: null };
        },
        // `.update(...).eq(...)` est awaité directement : builder thenable.
        then(resolve, reject) {
          if (op === "update") log.updates.push(pendingObj);
          const res = op === "update" ? { error: scenario.updateError || null } : { data: null, error: null };
          return Promise.resolve(res).then(resolve, reject);
        },
      };
      return b;
    },
  };
}
