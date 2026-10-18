-- Passage sur plusieurs jours : date de fin optionnelle.
-- Renseignée seulement quand l'intervention s'étale sur plus d'une journée ;
-- sinon NULL et la fiche n'affiche qu'une date simple.
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS date_fin_passage date;
