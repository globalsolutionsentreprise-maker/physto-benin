-- Table fiches de passage
CREATE TABLE IF NOT EXISTS fiches_passage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_unique text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  type_passage text,
  prestations jsonb DEFAULT '[]',
  autres_prestation text,
  lieu_prestation text,
  nuisibles jsonb DEFAULT '[]',
  autres_nuisible text,
  produits jsonb DEFAULT '{}',
  duree_debut text,
  duree_fin text,
  remarques text,
  date_passage date DEFAULT CURRENT_DATE,
  superviseur_nom text,
  superviseur_contact text,
  created_at timestamptz DEFAULT now()
);

-- Génération du numéro de fiche (ex: FP-GSE-2026-0001)
CREATE OR REPLACE FUNCTION generate_fiche_numero()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(COUNT(*), 0) + 1 INTO next_num FROM fiches_passage;
  RETURN 'FP-GSE-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
END;
$$;
