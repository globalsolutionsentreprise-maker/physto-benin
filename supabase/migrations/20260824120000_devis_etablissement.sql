-- Multi-établissements par client : un devis/contrat peut porter les infos
-- propres à un site (nom, IFU, RCCM, adresse), distinctes de celles du client.
-- Vides => on retombe sur les valeurs du client (rétrocompat totale).
ALTER TABLE devis ADD COLUMN IF NOT EXISTS etablissement_nom text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS etablissement_ifu text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS etablissement_rccm text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS etablissement_adresse text;
