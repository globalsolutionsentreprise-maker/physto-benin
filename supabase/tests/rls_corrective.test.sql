-- =============================================================================
-- Test RLS CORRECTIF (après 20261107120000 + 20261107130000) — node psql.
-- Démontre : anon sans accès privé, authenticated sans profil = rien de privé,
-- client ne peut PAS modifier le montant de son devis mais peut le LIRE,
-- contenu public lisible, écritures admin OK, service_role conserve l'accès,
-- aucune policy permissive dangereuse résiduelle.
-- À lancer en `postgres` sur la base scratch : psql "$L" -v ON_ERROR_STOP=1 -f ...
-- Transaction annulée (ROLLBACK) → aucune donnée persistante.
-- =============================================================================
begin;

-- ---- Helpers de contexte (reset fiable avant chaque bascule) ----
create or replace function pg_temp.reset_ctx() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claims','',true); end $$;
create or replace function pg_temp.as_setup() returns void language plpgsql as $$
begin perform pg_temp.reset_ctx(); end $$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin perform pg_temp.reset_ctx(); execute 'set local role anon'; end $$;
create or replace function pg_temp.as_user(p_email text) returns void language plpgsql as $$
begin perform pg_temp.reset_ctx();
  perform set_config('request.jwt.claims', json_build_object('email',p_email)::text, true);
  execute 'set local role authenticated'; end $$;
create or replace function pg_temp.as_client(p_sub uuid) returns void language plpgsql as $$
begin perform pg_temp.reset_ctx();
  perform set_config('request.jwt.claims', json_build_object('sub',p_sub::text,'role','authenticated')::text, true);
  execute 'set local role authenticated'; end $$;
create or replace function pg_temp.as_service() returns void language plpgsql as $$
begin perform pg_temp.reset_ctx(); execute 'set local role service_role'; end $$;

-- ---- Seeds (contexte session = postgres, bypass RLS) ----
insert into public.admin_acces(email,nom,role,actif) values
  ('t_admin@test','Admin','admin',true),
  ('t_lecture@test','Lecture','lecture',true)
on conflict (email) do update set role=excluded.role, actif=excluded.actif;

do $$
declare v_sub uuid := '11111111-1111-4111-8111-111111111111';
        v_client uuid; v_devis uuid;
begin
  -- clients.user_id a une FK vers auth.users → créer l'utilisateur auth d'abord
  -- (auth.users ne requiert que `id`). Contexte session = postgres.
  insert into auth.users(id) values (v_sub) on conflict (id) do nothing;
  insert into public.clients(nom, user_id) values ('ZZ_client_test', v_sub) returning id into v_client;
  insert into public.devis(client_id, numero, prestation, montant_total)
    values (v_client, 'ZZ-DEVIS-TEST', 'Test', 500000) returning id into v_devis;
  insert into public.paiements(devis_id, type_versement, montant)
    values (v_devis, '60', 100000);
  insert into public.contenus(page, section, cle, valeur) values ('test','test','zz_pub_test','visible') on conflict do nothing;
end $$;

-- ===========================================================================
-- S1 — ANON : aucun accès aux données privées ; contenu public lisible ; pas d'écriture
-- ===========================================================================
do $$
declare n int; denied boolean:=false;
begin
  perform pg_temp.as_anon();
  select count(*) into n from public.clients;      assert n=0, 'anon ne doit PAS lire clients';
  select count(*) into n from public.devis;        assert n=0, 'anon ne doit PAS lire devis';
  select count(*) into n from public.paiements;    assert n=0, 'anon ne doit PAS lire paiements';
  select count(*) into n from public.attestations; assert n=0, 'anon ne doit PAS lire attestations';
  select count(*) into n from public.contenus where cle='zz_pub_test'; assert n=1, 'anon DOIT lire le contenu public';
  begin insert into public.contenus(page,section,cle,valeur) values('t','t','zz_anon','x'); exception when insufficient_privilege then denied:=true; end;
  assert denied, 'anon ne doit PAS écrire contenus';
  raise notice 'OK S1 — anon: privé inaccessible, contenu public lisible, écriture refusée';
end $$;

-- ===========================================================================
-- S2 — AUTHENTIFIÉ SANS PROFIL interne : aucun droit privé/admin
-- ===========================================================================
do $$
declare n int; denied boolean:=false;
begin
  perform pg_temp.as_user('ghost@nowhere.test');
  assert public.is_admin()=false and public.is_active_admin()=false, 'inconnu: ni admin ni active_admin';
  select count(*) into n from public.clients; assert n=0, 'authenticated sans profil ne lit pas clients';
  begin insert into public.clients(nom) values('ZZ_ghost'); exception when insufficient_privilege then denied:=true; end;
  assert denied, 'authenticated sans profil ne crée pas de client';
  raise notice 'OK S2 — authenticated sans profil: aucun accès privé/admin';
end $$;

-- ===========================================================================
-- S3 — CLIENT propriétaire : lit ses devis, NE PEUT PAS modifier le montant
-- ===========================================================================
do $$
declare v_sub uuid := '11111111-1111-4111-8111-111111111111'; n int; m numeric;
begin
  perform pg_temp.as_client(v_sub);
  select count(*) into n from public.devis where numero='ZZ-DEVIS-TEST'; assert n=1, 'client DOIT lire son devis';
  select count(*) into n from public.paiements; assert n=1, 'client DOIT lire ses paiements';
  update public.devis set montant_total=1 where numero='ZZ-DEVIS-TEST';
  get diagnostics n = row_count; assert n=0, 'client NE DOIT PAS pouvoir modifier son devis (0 ligne)';
  -- montant inchangé ?
  perform pg_temp.as_setup();
  select montant_total into m from public.devis where numero='ZZ-DEVIS-TEST'; assert m=500000, 'le montant du devis DOIT rester 500000';
  raise notice 'OK S3 — client: lecture OK, modification du montant impossible';
end $$;

-- ===========================================================================
-- S4 — ADMIN : écritures légitimes fonctionnent
-- ===========================================================================
do $$
declare n int;
begin
  perform pg_temp.as_user('t_admin@test');
  insert into public.contenus(page,section,cle,valeur) values('t','t','zz_admin','ok'); get diagnostics n=row_count; assert n=1, 'admin DOIT écrire contenus';
  insert into public.stock_produits(nom,unite,quantite,seuil_alerte) values('ZZ_admin_stock','u',0,0); get diagnostics n=row_count; assert n=1, 'admin DOIT écrire stock';
  update public.devis set montant_total=750000 where numero='ZZ-DEVIS-TEST'; get diagnostics n=row_count; assert n=1, 'admin DOIT modifier un devis';
  raise notice 'OK S4 — admin: écritures contenus/stock/devis OK';
end $$;

-- ===========================================================================
-- S5 — LECTURE interne : consulte mais n'écrit pas
-- ===========================================================================
do $$
declare n int;
begin
  perform pg_temp.as_user('t_lecture@test');
  select count(*) into n from public.devis where numero='ZZ-DEVIS-TEST'; assert n=1, 'lecture DOIT consulter les devis';
  update public.devis set montant_total=2 where numero='ZZ-DEVIS-TEST'; get diagnostics n=row_count; assert n=0, 'lecture NE DOIT PAS modifier un devis';
  raise notice 'OK S5 — lecture: consultation OK, écriture refusée';
end $$;

-- ===========================================================================
-- S6 — SERVICE_ROLE : conserve l'accès complet (bypass RLS)
-- ===========================================================================
do $$
declare n int;
begin
  perform pg_temp.as_service();
  select count(*) into n from public.clients where nom='ZZ_client_test'; assert n>=1, 'service_role DOIT lire clients';
  insert into public.clients(nom) values('ZZ_service_client'); get diagnostics n=row_count; assert n=1, 'service_role DOIT écrire clients';
  raise notice 'OK S6 — service_role: accès complet conservé';
end $$;

-- ===========================================================================
-- S7 — Aucune policy permissive dangereuse résiduelle
-- ===========================================================================
do $$
declare n int;
begin
  perform pg_temp.as_setup();
  select count(*) into n from pg_policies
   where schemaname='public' and cmd in ('ALL','INSERT','UPDATE','DELETE')
     and (coalesce(qual,'')='true' or coalesce(with_check,'')='true')
     and policyname not in ('journal_service_all','acces_service_all','prono_insert_public');
  assert n=0, 'aucune policy d''écriture permissive (true) ne doit subsister hors service/prono';
  raise notice 'OK S7 — 0 policy permissive dangereuse résiduelle';
end $$;

do $$ begin raise notice '✅ TOUS LES TESTS CORRECTIFS PASSENT'; end $$;
rollback;
