-- Catégories de dépenses : transport, produits, matériels, autre
ALTER TABLE depenses_globales ADD COLUMN IF NOT EXISTS categorie text DEFAULT 'autre';
