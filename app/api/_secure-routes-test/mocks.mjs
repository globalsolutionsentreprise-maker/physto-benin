// Mocks pour tester generate-attestation + create-payment (chemins de rejet).
let sc = {};
export function __config(c) { sc = c || {}; }
let log = { updates: [], inserts: [] };
export function __log() { return log; }
export function __reset() { log = { updates: [], inserts: [] }; }

// --- @supabase/supabase-js ---
export function createClient(_url, key) {
  return {
    auth: {
      admin: {},
      async getUser(_t) { return { data: { user: sc.user ?? null }, error: null }; },
    },
    async rpc(_n) { return { data: "ATT-TEST-0001", error: null }; },
    from(table) {
      const b = {
        _t: table, _op: "select", _obj: null,
        select() { return b; },
        eq() { return b; },
        in() { return b; },
        not() { return b; },
        order() { return b; },
        limit() { return b; },
        insert(o) { b._op = "insert"; b._obj = o; return b; },
        update(o) { b._op = "update"; b._obj = o; return b; },
        async single() { return term(b, table); },
        async maybeSingle() { return term(b, table); },
        then(res, rej) { return Promise.resolve(term(b, table)).then(res, rej); },
      };
      return b;
    },
    storage: { from() { return {
      async upload(path) { log.inserts.push({ table: "storage", obj: { path } }); return { data: { path }, error: sc.uploadErr || null }; },
      async createSignedUrl(p) { return { data: { signedUrl: "https://signed/" + p }, error: null }; },
    }; } },
  };
}
function term(b, table) {
  if (b._op === "insert") { log.inserts.push({ table, obj: b._obj }); return { data: sc.insertErr?.[table] ? null : { id: "new", ...b._obj, ...(sc.insertReturn?.[table] || {}) }, error: sc.insertErr?.[table] || null }; }
  if (b._op === "update") { log.updates.push({ table, obj: b._obj }); return { data: null, error: null }; }
  // File de SELECT par table : chaque lecture consomme l'élément suivant (modélise une
  // ligne qui change entre deux lectures, ex. récupération après course 23505).
  if (sc.dbQueue?.[table] && sc.dbQueue[table].length) {
    return { data: sc.dbQueue[table].shift(), error: sc.dbErr?.[table] || null };
  }
  const key = sc.dbKeyOverride?.[table] || table;
  return { data: (sc.db?.[key] ?? null), error: sc.dbErr?.[table] || null };
}

// --- @/lib/verify-admin ---
export async function verifyAdminWrite(_req) { return sc.isAdmin ? { id: "a", email: "a@x", acces_role: "admin" } : null; }
export async function verifyAdmin(_req) { return sc.isActiveAdmin || sc.isAdmin ? { id: "a", email: "a@x", acces_role: sc.isAdmin ? "admin" : "lecture" } : null; }

// --- next/server ---
export const NextResponse = {
  json(data, init) { return { status: init?.status || 200, _data: data, async json() { return data; } }; },
};
export class NextRequest {}

// --- resend ---
export class Resend { constructor() {} get emails() { return { send: async () => ({ id: "mail" }) }; } }
