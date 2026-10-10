-- Fiche de passage remplie sur site par le technicien (Fabrice), via un lien token
-- par passage. Chaque ligne `interventions` (contrôle OU intervention du planning)
-- porte un `fiche_token` : Fabrice ouvre /fiche/<token> sur son téléphone, remplit
-- (même à la va-vite), ajoute photos/vidéos, et génère la fiche de passage.
-- Permet de suivre le travail passage par passage depuis l'admin.

-- 1. Token par passage. Nullable : généré à la demande quand on envoie le lien.
--    fiche_remplie_at : horodatage de la soumission terrain (suivi d'avancement).
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS fiche_token text UNIQUE;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS fiche_remplie_at timestamptz;

-- 2. Rattachement de la fiche au passage + médias terrain + auteur.
--    medias : [{ path, type, name }] (chemins dans le bucket privé fiches-medias).
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS intervention_id uuid REFERENCES interventions(id) ON DELETE SET NULL;
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS medias jsonb DEFAULT '[]';
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS rempli_par text;

-- Une seule fiche terrain par passage (ré-soumission = update via intervention_id).
CREATE UNIQUE INDEX IF NOT EXISTS fiches_passage_intervention_id_key
  ON fiches_passage (intervention_id) WHERE intervention_id IS NOT NULL;

-- 3. Bucket privé pour les médias terrain (lecture via URL signée, comme 'candidatures').
--    L'upload se fait en direct depuis le téléphone via URL signée (hors plafond
--    4,5 Mo de Vercel) ; toute écriture en base passe par l'API (service_role).
INSERT INTO storage.buckets (id, name, public)
VALUES ('fiches-medias', 'fiches-medias', false)
ON CONFLICT (id) DO NOTHING;
