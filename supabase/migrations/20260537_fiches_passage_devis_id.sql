-- Add devis_id foreign key to fiches_passage
-- Nullable: not all fiches are linked to a devis
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS devis_id uuid REFERENCES devis(id) ON DELETE SET NULL;
