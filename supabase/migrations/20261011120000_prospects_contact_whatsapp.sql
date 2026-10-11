-- Fiche de démarchage : numéro WhatsApp distinct (si différent du téléphone
-- principal) et nom du contact (interlocuteur) sur un prospect.
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS whatsapp     TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contact_nom  TEXT;
