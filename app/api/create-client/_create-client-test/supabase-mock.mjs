// Mock de @supabase/supabase-js pour create-client — 100% hors ligne, aucune prod.
// Scénario piloté par __config() ; les écritures sont journalisées dans __log().

let scenario = {};
const freshLog = () => ({ updates: [], inserts: [], createUserCalls: 0, listUsersCalls: 0, updateUserByIdCalls: 0, generateLinkCalls: 0, createUserPasswords: [], deleteUserCalls: 0, deletedUserIds: [], calls: [] });
let log = freshLog();

export function __config(c) {
  scenario = c || {};
  log = freshLog();
}
export function __log() { return log; }

export function createClient(_url, _key, _opts) {
  return {
    auth: {
      admin: {
        async createUser({ email, password }) {
          log.createUserCalls++;
          log.calls.push("createUser");
          log.createUserPasswords.push(password);
          if (scenario.authError) {
            // Échec Auth générique (hors « déjà inscrit ») : aucun compte créé.
            return { data: null, error: { message: scenario.authError } };
          }
          if (scenario.authExists) {
            return { data: null, error: { message: "A user with this email address has already been registered" } };
          }
          return { data: { user: { id: scenario.newAuthId || "u-new", email, password } }, error: null };
        },
        // Rollback compensatoire : supprime UNIQUEMENT le compte Auth créé dans la requête.
        async deleteUser(id) {
          log.deleteUserCalls++;
          log.deletedUserIds.push(id);
          log.calls.push("deleteUser");
          if (scenario.deleteError) return { data: null, error: { message: scenario.deleteError } };
          return { data: null, error: null };
        },
        async generateLink({ type, email, options }) {
          log.generateLinkCalls++;
          log.calls.push("generateLink");
          if (scenario.generateLinkError) return { data: null, error: { message: scenario.generateLinkError } };
          return { data: { properties: { action_link: `https://mock.supabase.co/auth/v1/verify?type=${type}&redirect_to=${encodeURIComponent(options?.redirectTo || "")}` } }, error: null };
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
            log.calls.push("insert");
            return { data: { id: scenario.newClientId || "c-new", ...pendingObj }, error: scenario.insertError || null };
          }
          return { data: null, error: null };
        },
        // `.update(...).eq(...)` est awaité directement : builder thenable.
        then(resolve, reject) {
          if (op === "update") { log.updates.push(pendingObj); log.calls.push("update"); }
          const res = op === "update" ? { error: scenario.updateError || null } : { data: null, error: null };
          return Promise.resolve(res).then(resolve, reject);
        },
      };
      return b;
    },
  };
}
