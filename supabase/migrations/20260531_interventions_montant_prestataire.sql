-- Coût prestataire par intervention (commission variable par chantier)
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS montant_prestataire integer DEFAULT 0;
