-- Colonnes CRM sur la table devis
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS crm_statut text,
  ADD COLUMN IF NOT EXISTS provenance text DEFAULT '—',
  ADD COLUMN IF NOT EXISTS zone text DEFAULT '—',
  ADD COLUMN IF NOT EXISTS categorie text DEFAULT 'Particulier',
  ADD COLUMN IF NOT EXISTS motif_echec text DEFAULT '—',
  ADD COLUMN IF NOT EXISTS paiements_recus numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS depenses_client numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_contact date,
  ADD COLUMN IF NOT EXISTS attestation_crm text DEFAULT 'non',
  ADD COLUMN IF NOT EXISTS date_facture_crm date,
  ADD COLUMN IF NOT EXISTS montant_facture_crm numeric DEFAULT 0;

-- Initialiser crm_statut depuis le statut admin existant
UPDATE devis SET crm_statut = CASE
  WHEN statut = 'brouillon' THEN 'contact'
  WHEN statut = 'envoye' THEN 'devis'
  WHEN statut = 'accepte' THEN 'attente'
  WHEN statut = 'modification_demandee' THEN 'relance'
  WHEN statut = 'en_cours' THEN 'attente'
  WHEN statut = 'termine' THEN 'converti'
  WHEN statut = 'annule' THEN 'echec'
  ELSE 'contact'
END WHERE crm_statut IS NULL;

-- Table des dépenses générales du CRM
CREATE TABLE IF NOT EXISTS depenses_globales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  libelle text NOT NULL,
  montant numeric NOT NULL DEFAULT 0,
  date date,
  created_at timestamptz DEFAULT now()
);
