-- Table des contrats générés
CREATE TABLE IF NOT EXISTS contrats (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id    uuid REFERENCES devis(id) ON DELETE CASCADE NOT NULL,
  client_id   uuid REFERENCES clients(id) ON DELETE SET NULL,
  reference   text NOT NULL UNIQUE,
  annee       integer NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE contrats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on contrats" ON contrats
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS contrats_devis_id_idx ON contrats (devis_id);
CREATE INDEX IF NOT EXISTS contrats_annee_idx ON contrats (annee);
