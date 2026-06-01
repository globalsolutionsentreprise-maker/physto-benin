-- Historique des mouvements de stock (entrées achat, sorties chez clients)
CREATE TABLE IF NOT EXISTS stock_mouvements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  produit_id uuid REFERENCES stock_produits(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('entree', 'sortie')),
  quantite numeric NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_mouvements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mouvements_all" ON stock_mouvements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
