-- Suivi facturation/encaissement par passage de contrat.
-- montant_du : attendu (auto depuis le contrat, editable) ; montant_paye : cumule.
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS montant_du integer;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS montant_paye integer DEFAULT 0;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS date_facture date;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS date_paiement date;
