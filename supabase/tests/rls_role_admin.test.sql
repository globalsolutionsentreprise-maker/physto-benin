-- =============================================================================
-- Test RLS — séparation des rôles (migration 20261107120000_rls_role_admin).
-- NE PEUT PAS être exécuté sans base : à lancer sur une BRANCHE Supabase APRÈS
-- application de la migration, p.ex. :  psql "$BRANCH_URL" -f ce_fichier.sql
-- Tout tourne dans une transaction annulée (ROLLBACK) → aucune donnée laissée.
-- Chaque échec lève une exception (le script s'arrête en rouge).
-- =============================================================================
begin;

-- Faux comptes de test (supprimés par le rollback).
insert into public.admin_acces(email, nom, role, actif) values
  ('t_admin@test',   'Admin test',   'admin',   true),
  ('t_lecture@test', 'Lecture test', 'lecture', true),
  ('t_inactif@test', 'Inactif test', 'admin',   false)
on conflict (email) do update set role = excluded.role, actif = excluded.actif;

-- A2 — Bascule de rôle FIABLE : on repart systématiquement de l'utilisateur de
-- session (RESET ROLE) avant chaque SET LOCAL ROLE, pour éviter « permission denied
-- to set role » lors des transitions authenticated <-> anon (chaque SET est alors
-- évalué vis-à-vis de l'utilisateur de session, pas du rôle courant). Les claims JWT
-- sont réinitialisés à chaque bascule. Prérequis : exécuter la suite en tant que
-- superutilisateur / postgres (membre de anon, authenticated, service_role).
create or replace function pg_temp.reset_ctx() returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

create or replace function pg_temp.as_user(p_email text) returns void
language plpgsql as $$
begin
  perform pg_temp.reset_ctx();
  perform set_config('request.jwt.claims',
    case when p_email is null then '{}' else json_build_object('email', p_email)::text end, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.as_anon() returns void
language plpgsql as $$
begin
  perform pg_temp.reset_ctx();
  execute 'set local role anon';
end $$;

-- Repart en session (postgres) pour les opérations de seed (bypass RLS).
create or replace function pg_temp.as_setup() returns void
language plpgsql as $$
begin
  perform pg_temp.reset_ctx();
end $$;

-- ---------------------------------------------------------------------------
-- 1. Matrice des fonctions centrales (gate partagé par TOUTES les policies)
-- ---------------------------------------------------------------------------
do $$
begin
  perform pg_temp.as_user('t_admin@test');
  assert public.is_admin() = true,         'admin actif → is_admin doit être true';
  assert public.is_active_admin() = true,  'admin actif → is_active_admin true';

  perform pg_temp.as_user('t_lecture@test');
  assert public.is_admin() = false,        'lecture → is_admin DOIT être false';
  assert public.is_active_admin() = true,  'lecture actif → is_active_admin true (consultation)';

  perform pg_temp.as_user('t_inactif@test');
  assert public.is_admin() = false,        'admin inactif → is_admin false';
  assert public.is_active_admin() = false, 'inactif → is_active_admin false';

  perform pg_temp.as_user('absent@test');
  assert public.is_admin() = false,        'absent de admin_acces → is_admin false';
  assert public.is_active_admin() = false, 'absent → is_active_admin false';

  perform pg_temp.as_anon();
  assert public.is_admin() = false,        'anon → is_admin false';
  assert public.is_active_admin() = false, 'anon → is_active_admin false';
  raise notice 'OK 1 — matrice is_admin/is_active_admin';
end $$;

-- ---------------------------------------------------------------------------
-- 2. ÉCRITURE : lecture REFUSÉE, admin AUTORISÉE (table simple : stock_produits)
-- ---------------------------------------------------------------------------
do $$
declare denied boolean := false; n int;
begin
  -- lecture : INSERT doit être refusé par WITH CHECK (is_admin)
  perform pg_temp.as_user('t_lecture@test');
  begin
    insert into public.stock_produits(nom, unite, quantite, seuil_alerte)
    values ('ZZ_test_lecture', 'u', 0, 0);
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'lecture → INSERT stock_produits DOIT être refusé';

  -- admin : INSERT autorisé
  perform pg_temp.as_user('t_admin@test');
  insert into public.stock_produits(nom, unite, quantite, seuil_alerte)
  values ('ZZ_test_admin', 'u', 0, 0);
  get diagnostics n = row_count;
  assert n = 1, 'admin → INSERT stock_produits DOIT réussir';

  -- lecture : UPDATE filtré par USING(is_admin) → 0 ligne touchée (pas d'erreur)
  perform pg_temp.as_user('t_lecture@test');
  update public.stock_produits set quantite = 999 where nom = 'ZZ_test_admin';
  get diagnostics n = row_count;
  assert n = 0, 'lecture → UPDATE stock_produits DOIT toucher 0 ligne';

  -- lecture : DELETE filtré → 0 ligne
  delete from public.stock_produits where nom = 'ZZ_test_admin';
  get diagnostics n = row_count;
  assert n = 0, 'lecture → DELETE stock_produits DOIT toucher 0 ligne';
  raise notice 'OK 2 — écriture stock : lecture refusée, admin autorisée';
end $$;

-- ---------------------------------------------------------------------------
-- 3. LECTURE : lecture PEUT consulter (is_active_admin) sur une table interne
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.as_user('t_admin@test');
  insert into public.stock_produits(nom, unite, quantite, seuil_alerte)
  values ('ZZ_test_visible', 'u', 5, 0);

  perform pg_temp.as_user('t_lecture@test');
  select count(*) into n from public.stock_produits where nom = 'ZZ_test_visible';
  assert n = 1, 'lecture → DOIT voir le produit (consultation préservée)';

  perform pg_temp.as_anon();
  select count(*) into n from public.stock_produits where nom = 'ZZ_test_visible';
  assert n = 0, 'anon → ne DOIT PAS voir le stock (aucune policy publique)';
  raise notice 'OK 3 — lecture consulte, anon ne voit rien';
end $$;

-- ---------------------------------------------------------------------------
-- 4. contrats : écriture réservée admin — test PROBANT (A1).
--    Seed d'un vrai contrat (via client + devis), puis tentatives de DELETE par
--    anon ET par lecture : la ligne DOIT survivre. Puis DELETE admin : réussit.
--    (Tout est annulé par le ROLLBACK final.)
-- ---------------------------------------------------------------------------
do $$
declare v_client uuid; v_devis uuid; v_contrat uuid; n int;
begin
  -- Seed en contexte session (postgres, bypass RLS). Colonnes alignées sur les
  -- INSERT réels de l'app (create-client / generate-contract) → NOT NULL satisfaits.
  perform pg_temp.as_setup();
  insert into public.clients (nom) values ('ZZ_test_client')
    returning id into v_client;
  insert into public.devis (client_id, numero, prestation, montant_net, montant_total, statut, crm_statut)
    values (v_client, 'ZZ-TEST-DEVIS', 'Test', 0, 0, 'brouillon', 'contact')
    returning id into v_devis;
  insert into public.contrats (devis_id, client_id, reference, annee)
    values (v_devis, v_client, 'ZZ-TEST-CONTRAT', extract(year from now())::int)
    returning id into v_contrat;

  -- anon : DELETE filtré par USING(is_admin) → 0 ligne, et la ligne SURVIT.
  perform pg_temp.as_anon();
  delete from public.contrats where id = v_contrat;
  get diagnostics n = row_count;
  assert n = 0, 'anon → DELETE contrats DOIT toucher 0 ligne';

  -- lecture : idem, 0 ligne.
  perform pg_temp.as_user('t_lecture@test');
  delete from public.contrats where id = v_contrat;
  get diagnostics n = row_count;
  assert n = 0, 'lecture → DELETE contrats DOIT toucher 0 ligne';

  -- La ligne doit toujours exister (vérifié en session, hors filtre RLS).
  perform pg_temp.as_setup();
  select count(*) into n from public.contrats where id = v_contrat;
  assert n = 1, 'le contrat de test DOIT toujours exister après les tentatives anon/lecture';

  -- admin : DELETE autorisé (is_admin) → 1 ligne.
  perform pg_temp.as_user('t_admin@test');
  delete from public.contrats where id = v_contrat;
  get diagnostics n = row_count;
  assert n = 1, 'admin → DELETE contrats DOIT réussir (1 ligne)';

  raise notice 'OK 4 — contrats : anon/lecture refusés, admin autorisé (test probant)';
end $$;

-- ---------------------------------------------------------------------------
-- 5. Contenu public : lecture publique toujours ouverte (site)
-- ---------------------------------------------------------------------------
do $$
declare n int; denied boolean := false;
begin
  perform pg_temp.as_anon();
  perform count(*) from public.contenus;  -- *_public_read USING(true) → OK, pas d'erreur

  perform pg_temp.as_user('t_lecture@test');
  begin
    insert into public.contenus(cle, valeur) values ('zz_test', 'x');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'lecture → INSERT contenus DOIT être refusé';
  raise notice 'OK 5 — contenu : lecture publique OK, écriture lecture refusée';
end $$;

do $$ begin raise notice '✅ TOUS LES TESTS RLS PASSENT'; end $$;
rollback;
