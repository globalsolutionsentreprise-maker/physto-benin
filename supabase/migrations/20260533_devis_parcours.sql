-- Add parcours JSONB column to devis table
ALTER TABLE devis ADD COLUMN IF NOT EXISTS parcours JSONB DEFAULT '{}';
