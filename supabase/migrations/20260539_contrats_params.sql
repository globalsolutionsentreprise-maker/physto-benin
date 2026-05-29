-- Ajout des params de génération pour pouvoir réimprimer le contrat
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS params jsonb;
ALTER TABLE contrats ADD COLUMN IF NOT EXISTS date_generation date;
