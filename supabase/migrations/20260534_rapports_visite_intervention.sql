CREATE TABLE IF NOT EXISTS rapports_visite (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id uuid REFERENCES devis(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  numero_unique text,
  date_visite date,
  adresse_site text,
  description_site text,
  nuisibles text[],
  autres_nuisible text,
  zones_infestees text,
  niveau_infestation text,
  recommandations text,
  observations text,
  technicien text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rapports_intervention (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id uuid REFERENCES devis(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  numero_unique text,
  date_intervention date,
  technicien text,
  zones_traitees text,
  produits_utilises text,
  methode_application text,
  duree_intervention text,
  resultats text,
  observations text,
  recommandations text,
  created_at timestamptz DEFAULT now()
);
