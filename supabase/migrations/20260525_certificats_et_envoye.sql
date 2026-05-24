-- Champ envoye sur fiches_passage
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS envoye boolean DEFAULT false;
ALTER TABLE fiches_passage ADD COLUMN IF NOT EXISTS envoye_at timestamptz;

-- Table certificats (désinsectisation / dératisation)
CREATE TABLE IF NOT EXISTS certificats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_unique text UNIQUE NOT NULL,
  devis_id uuid REFERENCES devis(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('desinsect', 'derat')),
  envoye boolean DEFAULT false,
  envoye_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Numérotation automatique des certificats
CREATE OR REPLACE FUNCTION generate_certificat_numero(cert_type text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  prefix text;
  next_num integer;
BEGIN
  prefix := CASE WHEN cert_type = 'desinsect' THEN 'CERT-DES' ELSE 'CERT-RAT' END;
  SELECT COALESCE(COUNT(*), 0) + 1 INTO next_num FROM certificats WHERE type = cert_type;
  RETURN prefix || '-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
END;
$$;
