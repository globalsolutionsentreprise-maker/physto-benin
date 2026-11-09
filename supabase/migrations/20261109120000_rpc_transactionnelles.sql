-- =============================================================================
-- P1 #7 — RPC transactionnelles (atomicité des écritures multi-étapes du CRM)
-- Audit : tasks/audit-p1-7-rpc-transactionnelles.md
--
-- OBJET : envelopper 3 opérations multi-écritures dans des fonctions PL/pgSQL
-- (donc 1 transaction implicite = tout-ou-rien) pour supprimer les états
-- partiels (orphelins / planning perdu / client sans ses devis).
--
-- CONTRAINTES RESPECTÉES :
--   * SECURITY INVOKER (défaut) : appelées par le service_role des routes API
--     (qui bypasse déjà la RLS) APRÈS verifyAdminWrite. Aucune RLS modifiée.
--   * EXECUTE restreint au seul service_role (revoke public/anon/authenticated)
--     → un compte « lecture » ne peut PAS déclencher ces écritures via anon key.
--   * Aucune donnée existante modifiée par cette migration (définitions seules).
--   * Les numéros (devis.numero UNIQUE) restent générés côté application et
--     passés en paramètre : la base ne les génère pas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) rpc_replace_planning — generate_planning : DELETE puis INSERT atomiques.
--    Le calcul des dates/montants reste côté application (lignes passées en jsonb).
-- -----------------------------------------------------------------------------
create or replace function public.rpc_replace_planning(p_devis_id uuid, p_rows jsonb)
returns integer
language plpgsql
as $$
declare n integer;
begin
  -- Sérialise les régénérations concurrentes du même contrat (anti-doublon).
  perform pg_advisory_xact_lock(hashtext(p_devis_id::text));

  delete from public.interventions
    where devis_id = p_devis_id and statut = 'planifiee';

  insert into public.interventions
    (devis_id, date_intervention, statut, client_nom, adresse, notes, type_passage, montant_du)
  select p_devis_id,
         (r->>'date_intervention')::date,
         'planifiee',
         r->>'client_nom', r->>'adresse', r->>'notes', r->>'type_passage',
         coalesce((r->>'montant_du')::numeric, 0)
  from jsonb_array_elements(p_rows) as r;

  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.rpc_replace_planning(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.rpc_replace_planning(uuid, jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- 2) rpc_add_client_devis — add_client : INSERT clients + INSERT devis (+ remise
--    + archivage lead) atomiques. Si l'insert devis échoue, le client est annulé
--    (zéro orphelin). Les champs CRM absents s'appuient sur les DEFAULT de la table.
-- -----------------------------------------------------------------------------
create or replace function public.rpc_add_client_devis(
  p_client jsonb,
  p_devis jsonb,
  p_lead_id uuid default null,
  p_offre_bienvenue boolean default false
) returns uuid
language plpgsql
as $$
declare v_client_id uuid; v_devis_id uuid;
begin
  insert into public.clients (nom, prenom, email, telephone, ifu, rccm)
  values (p_client->>'nom', p_client->>'prenom', p_client->>'email',
          p_client->>'telephone', p_client->>'ifu', p_client->>'rccm')
  returning id into v_client_id;                 -- nom NOT NULL : garanti par l'appelant

  insert into public.devis (
    client_id, numero, prestation, description, montant_net, montant_total,
    statut, crm_statut, provenance, zone, categorie, motif_echec, paiements_recus,
    date_contact, attestation_crm, date_facture_crm, montant_facture_crm, type_crm,
    duree_contrat_mois, frequence_intervention, date_debut_contrat, remise_bienvenue
  ) values (
    v_client_id,
    p_devis->>'numero',                                        -- NOT NULL UNIQUE (généré app)
    coalesce(nullif(p_devis->>'prestation',''), '—'),          -- NOT NULL
    p_devis->>'description',
    coalesce((p_devis->>'montant_net')::numeric, 0),
    coalesce((p_devis->>'montant_total')::numeric, 0),         -- NOT NULL
    'brouillon',
    p_devis->>'crm_statut', p_devis->>'provenance', p_devis->>'zone',
    p_devis->>'categorie', p_devis->>'motif_echec',
    coalesce((p_devis->>'paiements_recus')::numeric, 0),
    (p_devis->>'date_contact')::date, p_devis->>'attestation_crm',
    (p_devis->>'date_facture_crm')::date,
    coalesce((p_devis->>'montant_facture_crm')::numeric, 0),
    p_devis->>'type_crm',
    coalesce((p_devis->>'duree_contrat_mois')::int, 12),
    p_devis->>'frequence_intervention',
    (p_devis->>'date_debut_contrat')::date,
    case when p_offre_bienvenue then 10 else null end
  )
  returning id into v_devis_id;

  if p_lead_id is not null and p_offre_bienvenue then
    update public.leads set traite = true where id = p_lead_id;
  end if;

  return v_devis_id;
end $$;

revoke all on function public.rpc_add_client_devis(jsonb, jsonb, uuid, boolean) from public, anon, authenticated;
grant execute on function public.rpc_add_client_devis(jsonb, jsonb, uuid, boolean) to service_role;

-- -----------------------------------------------------------------------------
-- 3) rpc_delete_client — supprimerClient : DELETE devis + DELETE client atomiques.
--    Garde-fou : refuse si des attestations (valeur légale, FK NO ACTION) existent
--    → message explicite au lieu d'une FK violation opaque. Préserve les données.
-- -----------------------------------------------------------------------------
create or replace function public.rpc_delete_client(p_client_id uuid)
returns void
language plpgsql
as $$
begin
  if exists (
    select 1 from public.attestations a
    join public.devis d on d.id = a.devis_id
    where d.client_id = p_client_id
  ) then
    raise exception 'CLIENT_HAS_ATTESTATIONS' using errcode = '23503';
  end if;

  delete from public.devis   where client_id = p_client_id;  -- cascades/set null gérés par les FK
  delete from public.clients where id = p_client_id;
end $$;

revoke all on function public.rpc_delete_client(uuid) from public, anon, authenticated;
grant execute on function public.rpc_delete_client(uuid) to service_role;

-- =============================================================================
-- ROLLBACK (DOWN) — à exécuter pour revenir en arrière (les fonctions sont
-- inertes tant que le code route ne les appelle pas) :
--
--   drop function if exists public.rpc_replace_planning(uuid, jsonb);
--   drop function if exists public.rpc_add_client_devis(jsonb, jsonb, uuid, boolean);
--   drop function if exists public.rpc_delete_client(uuid);
-- =============================================================================
