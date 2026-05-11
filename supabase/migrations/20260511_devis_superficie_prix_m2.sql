-- Ajouter superficie et prix au m² sur les devis
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS superficie numeric,
  ADD COLUMN IF NOT EXISTS prix_m2 numeric;
