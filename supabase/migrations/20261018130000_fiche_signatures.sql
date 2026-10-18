-- Signatures capturées sur place (téléphone) pour la fiche de passage ET de contrôle.
-- Jusqu'ici seule la fiche de contrôle stockait la signature client dans controle_data.
-- On unifie en colonnes dédiées : signature du client + signature du technicien.
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS client_signataire text;
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS signature_client_data_url text;
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS signature_tech_data_url text;
