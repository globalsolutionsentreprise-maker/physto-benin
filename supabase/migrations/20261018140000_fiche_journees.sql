-- Détail horaire par jour d'intervention : [{date, debut, fin}, ...].
-- Remplace le couple unique (duree_debut, duree_fin) pour les interventions
-- sur plusieurs jours. date_passage/date_fin_passage restent dérivés (1er/dernier jour).
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS journees jsonb DEFAULT '[]';
