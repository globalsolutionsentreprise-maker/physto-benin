-- Permettre le type 'double' (désinsectisation + dératisation) dans certificats
ALTER TABLE certificats DROP CONSTRAINT IF EXISTS certificats_type_check;
ALTER TABLE certificats ADD CONSTRAINT certificats_type_check CHECK (type IN ('desinsect', 'derat', 'double'));

-- Mise à jour de la fonction de numérotation pour le type 'double'
CREATE OR REPLACE FUNCTION generate_certificat_numero(cert_type text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  prefix text;
  next_num integer;
BEGIN
  prefix := CASE
    WHEN cert_type = 'desinsect' THEN 'CERT-DES'
    WHEN cert_type = 'double'    THEN 'CERT-DBL'
    ELSE                              'CERT-RAT'
  END;
  SELECT COALESCE(COUNT(*), 0) + 1 INTO next_num FROM certificats WHERE type = cert_type;
  RETURN prefix || '-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
END;
$$;
