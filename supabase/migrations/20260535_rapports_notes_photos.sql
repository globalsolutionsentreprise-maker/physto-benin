ALTER TABLE rapports_visite ADD COLUMN IF NOT EXISTS notes_technicien text;
ALTER TABLE rapports_visite ADD COLUMN IF NOT EXISTS photos text[];

ALTER TABLE rapports_intervention ADD COLUMN IF NOT EXISTS notes_technicien text;
ALTER TABLE rapports_intervention ADD COLUMN IF NOT EXISTS photos text[];
