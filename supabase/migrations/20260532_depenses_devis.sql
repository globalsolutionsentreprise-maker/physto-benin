-- Dépenses détaillées par client/devis (transport, produits, matériels, autre)
CREATE TABLE IF NOT EXISTS depenses_devis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id uuid REFERENCES devis(id) ON DELETE CASCADE,
  libelle text,
  montant integer DEFAULT 0,
  categorie text DEFAULT 'autre',
  date date,
  created_at timestamptz DEFAULT now()
);
