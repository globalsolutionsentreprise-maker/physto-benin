-- Différencier interventions (traitement) et contrôles (vérification boîtes/état)
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS type_passage text DEFAULT 'intervention';
