ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS montant_brut numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise_type text DEFAULT 'pct';
