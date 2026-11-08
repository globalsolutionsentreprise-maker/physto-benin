-- =============================================================================
-- RLS — Séparation réelle des rôles métier (admin vs lecture)  [PROPOSITION]
-- Audit ECC Phase 1 / correctif RLS centralisé.
--
-- PROBLÈME : toutes les policies d'écriture vérifiaient `admin_acces.actif = true`
-- sans jamais vérifier `role = 'admin'`. Un compte métier `lecture` pouvait donc
-- écrire/supprimer en appelant Supabase directement (les ~51 écritures directes
-- d'app/admin/page.js ne passent pas par les routes API protégées par verifyAdminWrite).
-- De plus, `contrats` avait une policy `FOR ALL USING (true)` (tous rôles, même anon).
--
-- PRINCIPE :
--   * LECTURE  (consultation) → public.is_active_admin()  (actif, tout rôle métier)
--   * ÉCRITURE (insert/update/delete) → public.is_admin()  (actif ET role = 'admin')
--   * Les lectures publiques du site (contenu) restent ouvertes (*_public_read).
--   * Les accès propriétaire de l'espace client (clients/devis/attestations/paiements
--     _own_*) sont inchangés. Le service_role (routes API, generate-contract) bypasse
--     la RLS et n'est pas affecté. Les accès technicien par token passent par des
--     routes service_role et ne sont pas affectés.
--
-- ⚠️ NON APPLIQUÉE. À relire puis `supabase db push` après validation.
-- ⚠️ PRÉREQUIS anti-lockout : le compte DG doit avoir role='admin' ET actif=true
--    dans admin_acces AVANT application (sinon il perd l'écriture). Vérif en bas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fonctions centrales
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER justifié : la fonction interroge admin_acces (elle-même sous
-- RLS). En DEFINER (propriétaire postgres) elle ne dépend PAS de la policy de
-- lecture d'admin_acces (acces_read_own) et ne peut pas être contournée par un
-- changement futur de cette policy ; c'est le patron recommandé pour un helper
-- de rôle. search_path vidé + objets qualifiés = pas d'injection de search_path.
-- STABLE = évalué une fois par requête (perf dans les policies).

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_acces
    where email = (auth.jwt() ->> 'email')
      and actif = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_acces
    where email = (auth.jwt() ->> 'email')
      and actif = true
      and role = 'admin'
  );
$$;

-- Propriétaire maîtrisé + EXECUTE restreint : un utilisateur non privilégié ne
-- peut ni remplacer la fonction (il n'en est pas propriétaire) ni élargir ses droits.
alter function public.is_active_admin() owner to postgres;
alter function public.is_admin()        owner to postgres;
revoke all on function public.is_active_admin() from public;
revoke all on function public.is_admin()        from public;
-- anon/authenticated doivent pouvoir EXÉCUTER la fonction pour l'évaluation des
-- policies (elle renvoie false pour eux) ; service_role pour complétude.
grant execute on function public.is_active_admin() to anon, authenticated, service_role;
grant execute on function public.is_admin()        to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Contenu du site : lecture publique conservée, écriture = admin
--    (SELECT déjà couvert par *_public_read USING(true) → inchangé)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['parametres','chiffres','contenus','temoignages','articles','equipe','services','realisations']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_admin_write', t);
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())', t||'_admin_write', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3. clients : lecture propriétaire (espace client) + lecture admin (consultation),
--              écriture = admin. (clients_own_select / clients_own_update inchangés.)
-- -----------------------------------------------------------------------------
drop policy if exists "clients_admin_insert" on public.clients;
drop policy if exists "clients_admin_update" on public.clients;
drop policy if exists "clients_admin_read"   on public.clients;
drop policy if exists "clients_admin_write"  on public.clients;
create policy "clients_admin_read"  on public.clients for select using (public.is_active_admin());
create policy "clients_admin_write" on public.clients for all    using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. devis : lecture propriétaire (devis_own_select inchangé) + lecture admin,
--            écriture = admin. (devis_own_update déjà supprimé en 20261028120000.)
-- -----------------------------------------------------------------------------
drop policy if exists "devis_admin_all"    on public.devis;
drop policy if exists "devis_admin_insert" on public.devis;
drop policy if exists "devis_admin_read"   on public.devis;
drop policy if exists "devis_admin_write"  on public.devis;
create policy "devis_admin_read"  on public.devis for select using (public.is_active_admin());
create policy "devis_admin_write" on public.devis for all    using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. RH / opérations / argent : lecture = actif, écriture = admin.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['personnel','interventions','rapports_visite','rapports_intervention','fiches_passage','certificats','depenses_devis','depenses_globales','stock_produits','stock_mouvements']
  loop
    -- ancienne policy FOR ALL (actif) : nom = <table>_admin (RH) ou <table>_admin (stock)
    execute format('drop policy if exists %I on public.%I', t||'_admin', t);
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for select using (public.is_active_admin())', t||'_read', t);
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())', t||'_write', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 6. contrats : SUPPRIME la policy permissive USING(true) (tous rôles, même anon).
--    Lecture = actif, écriture = admin. generate-contract écrit en service_role
--    (bypass RLS) → inchangé. Aucun accès public/anon n'est légitime ici.
-- -----------------------------------------------------------------------------
drop policy if exists "Service role full access on contrats" on public.contrats;
drop policy if exists "contrats_read"  on public.contrats;
drop policy if exists "contrats_write" on public.contrats;
create policy "contrats_read"  on public.contrats for select using (public.is_active_admin());
create policy "contrats_write" on public.contrats for all    using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- VÉRIFICATION post-application (à exécuter en lecture, ne modifie rien) :
--
-- -- a) Aucune policy d'écriture ne doit rester sans contrôle de rôle :
-- select tablename, policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname='public'
--   and cmd in ('ALL','INSERT','UPDATE','DELETE')
--   and coalesce(qual,'') !~ 'is_admin'
--   and coalesce(with_check,'') !~ 'is_admin'
--   and policyname not like '%own%'          -- accès propriétaire espace client
--   and policyname not like '%service%'      -- service_role
--   and policyname not in ('journal_insert_own');
--
-- -- b) Prérequis anti-lockout (le DG doit être admin actif) :
-- select email, role, actif from admin_acces order by role;
-- =============================================================================

-- =============================================================================
-- ROLLBACK (si besoin de revenir à l'état ANTÉRIEUR — permissif) :
--   Réappliquer les migrations d'origine qui recréent les policies *_admin /
--   *_admin_write (actif seul) et "Service role full access on contrats", OU
--   exécuter l'inverse : drop des *_read/*_write/*_admin_write ci-dessus et
--   recréer les anciennes avec le prédicat
--     EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt()->>'email' AND actif = true).
--   NB : revenir en arrière RÉOUVRE la faille (lecture peut écrire). À éviter.
-- =============================================================================
