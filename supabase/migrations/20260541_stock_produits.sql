-- Module stock produits (simple, indépendant des finances pour l'instant)
CREATE TABLE IF NOT EXISTS stock_produits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  unite text DEFAULT 'unité',
  quantite numeric DEFAULT 0,
  seuil_alerte numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stock_produits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_all" ON stock_produits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Produits GSE pré-chargés
INSERT INTO stock_produits (nom, unite, quantite, seuil_alerte) VALUES
  ('IMPERA 300 CS', 'litre', 0, 1),
  ('ROCOGEL', 'kg', 0, 0.5),
  ('VERTOX', 'boîte', 0, 2);
