-- Ajouter les colonnes pour les modalités de paiement sur les devis
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS pct_acompte integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS conditions_paiement text;
