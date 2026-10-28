-- RLS hardening — audit ECC 2026-10-28
-- À appliquer via `supabase db push` (déploiement). Idempotent (IF EXISTS).

-- #4 STOCK : supprime les policies permissives anon (USING(true) WITH CHECK(true)).
-- Elles laissaient la clé anon (publique, côté navigateur) lire/modifier/supprimer
-- tout le stock. Les policies admin (stock_produits_admin / stock_mouvements_admin,
-- migration 20260604010003) subsistent → l'admin garde l'accès complet.
DROP POLICY IF EXISTS "stock_all" ON stock_produits;
DROP POLICY IF EXISTS "mouvements_all" ON stock_mouvements;

-- #3 DEVIS : devis_own_update laissait un client modifier N'IMPORTE QUELLE colonne
-- de son propre devis (dont montant_total / montant_net / paiements_recus) avec la
-- clé anon → il pouvait baisser son prix avant de payer (create-payment lit
-- montant_total). Les seules actions client légitimes (accepter / demander une
-- modification) passent désormais par /api/client-devis (ownership vérifié, champs
-- whitelistés, service role). On retire donc le droit d'UPDATE direct du client.
-- La lecture reste permise par devis_own_select.
DROP POLICY IF EXISTS "devis_own_update" ON devis;
