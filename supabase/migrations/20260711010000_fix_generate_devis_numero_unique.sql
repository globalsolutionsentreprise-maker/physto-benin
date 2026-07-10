-- BUG : créer un devis échouait avec « duplicate key value violates unique constraint
-- devis_numero_key ». La fonction generate_devis_numero() (créée manuellement, absente
-- des migrations) renvoyait un numéro déjà existant. Elle est utilisée par un
-- trigger/DEFAULT sur devis.numero qui ÉCRASE la valeur fournie par l'application —
-- donc même en passant un numéro crypto unique côté app, l'insert collisionnait.
-- Voir tasks/lessons.md 2026-06-09 et 2026-07-11.
--
-- Correctif : redéfinir la fonction pour renvoyer un numéro garanti unique (même format
-- que create-client / add_client : 8 hexadécimaux aléatoires via gen_random_uuid).
-- gen_random_uuid() sur un espace de 4 milliards → collision négligeable, et un tirage
-- frais ne peut matcher aucun numéro existant (séquentiel « -0001 » ou hexa).
CREATE OR REPLACE FUNCTION generate_devis_numero()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'DEV-GSE-' || EXTRACT(YEAR FROM now())::int::text || '-' ||
         upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;
