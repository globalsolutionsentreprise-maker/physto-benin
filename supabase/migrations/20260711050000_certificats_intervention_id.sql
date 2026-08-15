-- Lien passage -> certificat, pour préparer automatiquement (jamais envoyer) un
-- certificat brouillon quand une intervention est marquée terminée, et rester
-- idempotent (un seul certificat par passage et par type).
ALTER TABLE certificats ADD COLUMN IF NOT EXISTS intervention_id uuid REFERENCES interventions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS certificats_intervention_id_idx ON certificats (intervention_id);
