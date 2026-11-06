// Helper de test (NON exécuté par Next : dossier _verifier-test = dossier privé).
// Mock de @supabase/supabase-js — données 100% fictives, aucun réseau, aucune prod.
// Le builder branche son résultat sur le qr_token + statut passés en .eq(),
// ce qui reproduit fidèlement la requête de la route.

export const TOKENS = {
  VALID:       "11111111-1111-4111-8111-111111111111",
  NONEXISTENT: "22222222-2222-4222-8222-222222222222",
  REVOKED:     "33333333-3333-4333-8333-333333333333",
  ERROR:       "44444444-4444-4444-8444-444444444444",
  EXPIRED:     "55555555-5555-4555-8555-555555555555",
};

// Ligne "valide" volontairement RICHE en champs sensibles : la route NE DOIT
// en recopier aucun (montant, e-mail, tél, adresse, ids, ifu/rccm).
const VALID_ROW = {
  id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  numero_unique: "ATT-GSE-2026-0001",
  numero: "ATT-GSE-2026-0001",
  prestation: "Désinsectisation locaux",
  date_traitement: "2026-10-01",
  generated_at: "2026-10-02T10:00:00.000Z",
  lieu_intervention: "Cotonou, Zone 4",
  statut: "valide",
  // --- champs sensibles qui ne doivent JAMAIS ressortir ---
  montant_total: 350000,
  devis_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  client_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  clients: {
    nom: "Doe", prenom: "Jane", entreprise: "ACME SARL",
    email: "jane@acme.bj", telephone: "+2290100000000",
    adresse: "Rue 12.345 Cotonou", ifu: "3202412345678", rccm: "RB/COT/24 B 99999",
  },
};

let calls = 0;
export function __getCalls() { return calls; }
export function __reset() { calls = 0; }

export function createClient(_url, _key, _opts) {
  return {
    from(table) {
      calls++;
      const filters = {};
      const builder = {
        _table: table,
        select() { return builder; },
        eq(col, val) { filters[col] = val; return builder; },
        async maybeSingle() {
          const token = filters["qr_token"];
          const statut = filters["statut"];
          if (token === TOKENS.ERROR) {
            return { data: null, error: { message: "FATAL: connection to 10.0.0.9:5432 refused (ECONNREFUSED)", code: "08006" } };
          }
          // La route filtre toujours statut='valide' : seul le token VALID matche.
          if (token === TOKENS.VALID && statut === "valide") {
            return { data: VALID_ROW, error: null };
          }
          // NONEXISTENT / REVOKED / EXPIRED → aucune ligne valide
          return { data: null, error: null };
        },
      };
      return builder;
    },
  };
}
