-- Charges fixes récurrentes (salaires, loyer, abonnements…) : montant mensuel +
-- date de début, cumulées dans le résultat financier (montant × mois écoulés).
-- Premier cas : salaire de Fabrice (50 000 / mois).
--
-- Sécurité : accès exclusivement via /api/crm-data (service_role + verifyAdmin).
-- RLS activée SANS policy permissive, comme le reste du CRM.

CREATE TABLE IF NOT EXISTS charges_fixes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle         TEXT NOT NULL,
  montant_mensuel NUMERIC NOT NULL DEFAULT 0,
  date_debut      DATE NOT NULL DEFAULT CURRENT_DATE,
  actif           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS charges_fixes_actif_idx ON charges_fixes (actif);

ALTER TABLE charges_fixes ENABLE ROW LEVEL SECURITY;
-- Aucune policy permissive : accès uniquement via service_role (API).
