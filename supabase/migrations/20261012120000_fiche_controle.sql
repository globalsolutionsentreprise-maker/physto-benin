-- Fiche de contrôle : document distinct de la fiche de passage. On remet une
-- fiche de passage à la FIN d'une intervention, et une fiche de CONTRÔLE lors
-- d'une visite de contrôle. Les deux partagent la table fiches_passage
-- (type_passage = 'Contrôle' pour un contrôle) et le même lien token terrain.
-- Les rubriques propres au contrôle (relevé des postes d'appâtage, niveau
-- d'infestation par nuisible, constat, recommandations, date du prochain
-- passage, signataire client) vivent dans une colonne jsonb dédiée pour ne pas
-- polluer les colonnes de la fiche de passage.
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS controle_data jsonb;
