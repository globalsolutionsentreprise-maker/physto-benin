-- Pipeline unifié piloté par une source de vérité unique : l'étape du parcours.
-- Remplace le recalcul fragile de colUnifiee (crm_statut + parcours + documents).
-- Valeurs : prospect, devis, relance, converti, visite, intervention,
--           certificat, encaissement, cloture, perdu (NULL = hors pipeline).
ALTER TABLE devis ADD COLUMN IF NOT EXISTS etape TEXT;
