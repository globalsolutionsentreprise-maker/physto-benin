-- Colonnes pour les contrats récurrents dans le CRM
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS type_crm text DEFAULT 'ponctuel',
  ADD COLUMN IF NOT EXISTS duree_contrat_mois integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS frequence_intervention text DEFAULT 'trimestrielle',
  ADD COLUMN IF NOT EXISTS date_debut_contrat date;
