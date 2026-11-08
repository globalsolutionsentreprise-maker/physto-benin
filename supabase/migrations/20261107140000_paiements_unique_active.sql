-- =============================================================================
-- Idempotence paiements — index UNIQUE PARTIEL  [PROPOSITION, NON APPLIQUÉE]
--
-- Empêche DEUX paiements ACTIFS du même type pour un même devis (double-clic /
-- requêtes simultanées sur create-payment). On exclut 'echoue' pour autoriser un
-- nouvel essai après un échec. L'anti-duplication applicative de create-payment
-- reste, cet index la rend atomique côté base.
--
-- ⚠️ PRÉREQUIS avant application : vérifier qu'aucun doublon actif n'existe déjà :
--   select devis_id, type_versement, count(*)
--   from paiements where statut <> 'echoue'
--   group by 1,2 having count(*) > 1;
--   (Nettoyer les doublons AVANT, sinon la création de l'index échoue.)
-- ⚠️ NON APPLIQUÉE. `supabase db push` seulement après validation + nettoyage.
-- =============================================================================

create unique index if not exists paiements_devis_type_actif_uidx
  on public.paiements (devis_id, type_versement)
  where statut <> 'echoue';
