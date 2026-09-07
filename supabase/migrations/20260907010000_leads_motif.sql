-- Motif d'abandon d'un lead marqué « perdu » (pas de retour, concurrence,
-- client s'en est chargé lui-même, etc., ou texte libre). Nullable : un lead
-- converti ou en attente reste motif NULL. RLS déjà active sur leads, les
-- policies existantes couvrent la colonne.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS motif text;
