-- =============================================================================
-- RLS — Suppression des policies permissives hors-dépôt  [PROPOSITION / CORRECTIF]
-- Fait suite à 20261107120000_rls_role_admin.sql.
--
-- CONTEXTE : l'inventaire du schéma RÉEL de prod (dump) a révélé 20 policies
-- `FOR ALL TO public USING(true) WITH CHECK(true)` ABSENTES du dépôt (créées
-- autrefois via le dashboard). En RLS, les policies permissives se combinent en
-- OU : ces policies `true` neutralisent tout le modèle → CRUD complet pour tout
-- le monde (anon inclus) sur clients, devis, paiements, attestations et le
-- contenu du site. De plus `client_update_devis` (doublon hors-repo de
-- `devis_own_update`, déjà supprimé) laisse un client modifier le montant de son
-- propre devis avant paiement.
--
-- OBJET : supprimer ces policies dangereuses. On NE recrée RIEN (les accès
-- légitimes — is_admin/is_active_admin de la migration précédente, ownership
-- *_own_*/client_own_*, *_public_read/lecture*, admin_acces/journal, prono,
-- service_role bypass — restent en place). AUCUNE nouvelle permission.
--
-- Idempotent (`drop policy if exists`). ⚠️ NON APPLIQUÉE en prod. Test local only.
-- Dédoublonnage (lecture*/client_own_*) VOLONTAIREMENT reporté à une opération
-- ultérieure distincte (non traité ici).
-- =============================================================================

-- 1. Tables de contenu : retirer les accès « tout public » (lecture publique
--    conservée par *_public_read / lecture* ; écriture par *_admin_write/is_admin).
drop policy if exists "acces total articles"    on public.articles;
drop policy if exists "ecriture anon articles"  on public.articles;
drop policy if exists "acces total chiffres"    on public.chiffres;
drop policy if exists "ecriture anon chiffres"  on public.chiffres;
drop policy if exists "acces total contenus"    on public.contenus;
drop policy if exists "ecriture anon contenus"  on public.contenus;
drop policy if exists "acces total equipe"      on public.equipe;
drop policy if exists "ecriture anon equipe"    on public.equipe;
drop policy if exists "acces total parametres"  on public.parametres;
drop policy if exists "ecriture anon parametres" on public.parametres;
drop policy if exists "acces total services"    on public.services;
drop policy if exists "ecriture anon services"  on public.services;
drop policy if exists "acces total temoignages" on public.temoignages;
drop policy if exists "ecriture anon temoignages" on public.temoignages;
drop policy if exists "ecriture anon realisations" on public.realisations;
-- NB : pas de "acces total realisations" en prod (seul "ecriture anon" existe).

-- 2. Données privées : retirer l'accès total public (lecture propriétaire via
--    *_own_*/client_own_* conservée ; écriture admin via is_admin ; service_role
--    bypass pour les routes API create-payment / generate-attestation / verifier).
drop policy if exists "admin_all_clients"      on public.clients;
drop policy if exists "admin_all_devis"        on public.devis;
drop policy if exists "admin_all_paiements"    on public.paiements;
drop policy if exists "admin_all_attestations" on public.attestations;

-- 3. contrats : la policy permissive "Service role full access on contrats"
--    (USING(true)) est déjà supprimée par 20261107120000 ; redondance idempotente
--    de sûreté au cas où l'ordre d'application diffère.
drop policy if exists "Service role full access on contrats" on public.contrats;

-- 4. client_update_devis : doublon hors-repo de devis_own_update (supprimé en
--    20261028120000). UPDATE sur ses propres devis SANS WITH CHECK → un client
--    pouvait modifier montant_total avant paiement (create-payment le lit). Les
--    actions légitimes passent par /api/client-devis (service_role, champs
--    whitelistés). La LECTURE des devis du client reste via devis_own_select.
drop policy if exists "client_update_devis" on public.devis;

-- =============================================================================
-- VÉRIFICATION post-application (lecture seule) : plus aucune policy d'écriture
-- permissive ouverte à public/anon sans is_admin (hors ownership/service/journal) :
--
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname='public' and cmd in ('ALL','INSERT','UPDATE','DELETE')
--   and (coalesce(qual,'')='true' or coalesce(with_check,'')='true')
--   and policyname not in ('journal_service_all','acces_service_all','prono_insert_public');
-- -- attendu : 0 ligne (hors prono/service_role légitimes).
-- =============================================================================
