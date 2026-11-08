-- Lot A — Règlement HORS SITE (chèque / Mobile Money) sur la table paiements existante.
-- NON DESTRUCTIF : ajoute des colonnes nullables + élargit le CHECK statut (purement additif,
-- aucune ligne existante ne peut le violer) + un index d'unicité d'échéance ACTIVE.
-- Les colonnes fedapay_* et les statuts historiques sont CONSERVÉS (traçabilité).
--
-- PRÉREQUIS (exécuter en lecture seule AVANT d'appliquer) : aucun doublon actif existant,
-- sinon l'index unique échoue. Détection :
--   select devis_id, type_versement, count(*)
--   from paiements where statut not in ('echoue','rejete')
--   group by 1,2 having count(*) > 1;
--
-- NON APPLIQUÉE. Remplace 20261107140000_paiements_unique_active.sql (ne pas appliquer ce dernier).

-- 1) Nouvelles colonnes du parcours hors site.
alter table public.paiements add column if not exists mode text;            -- 'cheque' | 'mobile_money'
alter table public.paiements add column if not exists reference text;        -- n° chèque / ID transaction MoMo
alter table public.paiements add column if not exists justificatif_url text; -- photo chèque / capture MoMo (Storage)
alter table public.paiements add column if not exists verifie_par text;      -- email admin ayant validé/refusé
alter table public.paiements add column if not exists verifie_at timestamptz;
alter table public.paiements add column if not exists verif_note text;       -- motif de rejet / note comptable

-- 2) CHECK mode (seulement si renseigné : les lignes FedaPay historiques ont mode NULL).
alter table public.paiements drop constraint if exists paiements_mode_check;
alter table public.paiements add constraint paiements_mode_check
  check (mode is null or mode in ('cheque', 'mobile_money'));

-- 3) Élargir le CHECK statut : ajoute 'declare' (déclaré, en attente de vérif) et 'rejete'
--    (refusé). On CONSERVE en_attente/en_cours/confirme/echoue (lignes FedaPay historiques).
alter table public.paiements drop constraint if exists paiements_statut_check;
alter table public.paiements add constraint paiements_statut_check
  check (statut in ('en_attente', 'en_cours', 'confirme', 'echoue', 'declare', 'rejete'));

-- 4) Unicité d'une échéance ACTIVE (une déclaration/paiement vivant par devis+versement).
--    Actif = tout sauf les états terminaux morts (echoue, rejete). Remplace l'index FedaPay.
drop index if exists public.paiements_devis_type_actif_uidx;
create unique index if not exists paiements_devis_type_actif_uidx
  on public.paiements (devis_id, type_versement)
  where statut not in ('echoue', 'rejete');
