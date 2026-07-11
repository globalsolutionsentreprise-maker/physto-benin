-- Devis à lignes multiples : chaque ligne = un objet
-- { prestation, secteur, superficie, prix_m2, montant }.
-- NULL = ancien devis (rétrocompat gérée côté app par lignesFromDevis).
ALTER TABLE devis ADD COLUMN IF NOT EXISTS lignes JSONB DEFAULT NULL;
