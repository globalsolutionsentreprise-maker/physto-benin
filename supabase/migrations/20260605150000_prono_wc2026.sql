-- Table des pronostics World Cup 2026
CREATE TABLE IF NOT EXISTS prono_wc2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  predictions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prono_wc2026 ENABLE ROW LEVEL SECURITY;

-- Public : tout le monde peut déposer un prono
CREATE POLICY "prono_insert_public" ON prono_wc2026
  FOR INSERT WITH CHECK (true);

-- Public : classement visible par tous
CREATE POLICY "prono_select_public" ON prono_wc2026
  FOR SELECT USING (true);
