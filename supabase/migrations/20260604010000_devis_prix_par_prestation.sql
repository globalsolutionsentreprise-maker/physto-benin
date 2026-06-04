ALTER TABLE devis ADD COLUMN IF NOT EXISTS prix_par_prestation jsonb DEFAULT NULL;
