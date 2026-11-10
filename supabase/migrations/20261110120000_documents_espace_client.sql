-- =============================================================================
-- Gestion documentaire de l'espace client (Étape B)
-- Audit / architecture : tasks/audit-documents-espace-client.md
--
-- OBJET : permettre à GSE de déposer depuis le CRM des documents PDF (factures,
-- rapports d'intervention, fiches, attestations, contrats, devis, autres) et de
-- les rendre disponibles, après PUBLICATION explicite, dans l'espace du client
-- concerné (= un établissement).
--
-- RÉUTILISE STRICTEMENT L'EXISTANT :
--   * Bucket PRIVÉ fermé (public=false, sans policy storage) : tout l'accès passe
--     par des routes API en service_role. Même modèle que 'justificatifs'
--     (20261108130000) / 'fiches-medias' / 'candidatures'.
--   * Helpers RLS existants public.is_admin() / public.is_active_admin()
--     (20261107120000_rls_role_admin.sql). AUCUNE redéfinition ici.
--   * Propriété espace client par clients.user_id = auth.uid(), comme devis_own.
--
-- N'ALTÈRE AUCUNE TABLE NI POLICY EXISTANTE. Ajout seul : 1 bucket, 1 table,
-- 1 trigger, 3 policies. Zéro régression sur CRM / devis / attestations /
-- paiements / comptes / Premium.
--
-- ⚠️ NON APPLIQUÉE. À relire puis `supabase db push` par le DG après validation.
--    PRÉREQUIS (déjà requis par l'existant) : le compte DG est admin actif dans
--    admin_acces (sinon il n'a pas is_admin() et ne peut pas écrire).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Bucket PRIVÉ 'documents' — PDF uniquement, fermé.
--    file_size_limit 4 Mo (aligné sur le plafond de requête Vercel ~4,5 Mo, et
--    sur la validation serveur de la route). allowed_mime_types = défense en
--    profondeur. AUCUNE policy storage => inaccessible à anon/authenticated :
--    upload, remplacement, suppression et lecture signée passent uniquement par
--    les routes API en service_role.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 4194304, array['application/pdf'])
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2) Table des métadonnées de documents.
--    storage_path : chemin interne au bucket privé (jamais exposé tel quel au
--    client ; le fichier est servi par URL signée courte via route).
--    devis_id / intervention_id : liaison facultative à une prestation (permet
--    d'associer un rapport à l'intervention du CRM — établissement + date +
--    prestation ; base d'une automatisation ultérieure).
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  categorie       text not null check (categorie in (
                    'facture','rapport_intervention','fiche_technique','fiche_controle',
                    'attestation','contrat','devis','autre')),
  titre           text not null,
  date_document   date,
  reference       text,
  description     text,
  statut          text not null default 'brouillon'
                    check (statut in ('brouillon','publie','archive')),
  storage_path    text not null,
  nom_fichier     text,                -- nom d'origine, affichage seulement
  mime_type       text,
  taille_bytes    integer,
  devis_id        uuid references public.devis(id) on delete set null,
  intervention_id uuid references public.interventions(id) on delete set null,
  created_by      text,                -- email admin (traçabilité)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz,
  archived_at     timestamptz
);

create index if not exists documents_client_idx     on public.documents(client_id);
create index if not exists documents_client_pub_idx  on public.documents(client_id) where statut = 'publie';

-- updated_at automatique (même esprit que devis_updated_at).
create or replace function public.documents_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.documents_set_updated_at();

-- -----------------------------------------------------------------------------
-- 3) RLS — réutilise les helpers existants, mêmes conventions que clients/devis.
--    * Lecture admin (consultation, tout rôle métier actif) : is_active_admin()
--    * Écriture admin (insert/update/delete) : is_admin() (actif ET role=admin)
--    * Lecture client : SES documents PUBLIÉS uniquement (jamais brouillon/archivé)
--    Aucune policy d'écriture client. Les routes API (service_role) bypassent la
--    RLS ; ces policies protègent les accès directs supabase-js (espace client).
-- -----------------------------------------------------------------------------
alter table public.documents enable row level security;

drop policy if exists documents_admin_read  on public.documents;
drop policy if exists documents_admin_write on public.documents;
drop policy if exists documents_own_read    on public.documents;

create policy documents_admin_read  on public.documents
  for select using (public.is_active_admin());

create policy documents_admin_write on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

create policy documents_own_read on public.documents
  for select using (
    statut = 'publie'
    and client_id in (select id from public.clients where user_id = auth.uid())
  );

-- =============================================================================
-- VÉRIFICATION post-application (lecture seule, ne modifie rien) :
--
--   -- a) Bucket privé bien fermé (public=false) :
--   select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'documents';
--
--   -- b) Les 3 policies sont bien en place et l'écriture est gardée par is_admin :
--   select policyname, cmd, qual, with_check
--   from pg_policies where schemaname='public' and tablename='documents';
--
-- ROLLBACK (si besoin) :
--   drop table if exists public.documents;                 -- (cascade trigger)
--   drop function if exists public.documents_set_updated_at();
--   delete from storage.buckets where id = 'documents';     -- (bucket vide requis)
-- =============================================================================
