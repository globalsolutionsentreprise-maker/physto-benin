-- Module RH : personnel et planning interventions

CREATE TABLE IF NOT EXISTS personnel (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  prenom text,
  poste text NOT NULL DEFAULT 'Technicien',
  telephone text,
  email text,
  statut text DEFAULT 'actif',        -- actif | en_essai | inactif
  date_embauche date,
  -- Contrat
  contrat_date date,
  contrat_duree_mois integer DEFAULT 0, -- 0 = indéterminé
  -- CIP / Pièce d'identité
  cip_numero text,
  cip_expiration date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interventions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id uuid REFERENCES devis(id) ON DELETE SET NULL,
  personnel_id uuid REFERENCES personnel(id) ON DELETE SET NULL,
  date_intervention date NOT NULL,
  heure_debut time DEFAULT '08:00',
  statut text DEFAULT 'planifiee',    -- planifiee | terminee | annulee
  client_nom text,
  adresse text,
  notes text,
  created_at timestamptz DEFAULT now()
);
