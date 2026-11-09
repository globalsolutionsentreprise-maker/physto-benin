# P1 #7 — Audit read-only + SQL définitif des 3 RPC transactionnelles

Date : 2026-11-09 · Projet prod `ijgjdtfaimamcrrnyrvk` · **Audit READ-ONLY. Aucune migration, code, écriture, RLS ni déploiement.**

## Méthode & niveau de preuve
- **Graphe des FK + colonnes NOT NULL/DEFAULT : CONFIRMÉS EN LIVE PROD** via l'OpenAPI PostgREST (service_role, `GET /rest/v1/`).
- **Règles ON DELETE + triggers : export de schéma certifié** (`~/Desktop/Phase0-Export-Schema-Reel-GSE.md`, dump prod) + migrations versionnées. PostgREST n'expose pas ces métadonnées.
- Introspection `pg_catalog` directe indisponible (MCP sous un autre compte ; pas de mot de passe DB) — sans impact : voir « propriété fail-closed » ci-dessous.

## 1–2. FK référençant `devis` / `clients` + ON DELETE
**Enfants de `devis`** (FK live-confirmée · ON DELETE depuis export/migrations) :
| Enfant | ON DELETE | Effet d'un DELETE devis |
|---|---|---|
| `paiements.devis_id` | **CASCADE** | supprimés |
| `attestations.devis_id` | **NO ACTION** 🔴 | **BLOQUE** si attestation existe |
| `depenses_devis.devis_id` | CASCADE | supprimés |
| `rapports_visite.devis_id` | CASCADE | supprimés |
| `rapports_intervention.devis_id` | CASCADE | supprimés |
| `contrats.devis_id` (NOT NULL) | CASCADE | supprimés |
| `certificats.devis_id` | SET NULL | conservés (devis_id→NULL) |
| `fiches_passage.devis_id` | SET NULL | conservés |
| `interventions.devis_id` | SET NULL | conservés |
| `admin_journal.devis_id` | SET NULL | nulled |

**Enfants de `clients`** : `devis.client_id` SET NULL · `rapports_visite/intervention.client_id` CASCADE · `fiches_passage.client_id` CASCADE · `certificats.client_id` SET NULL · `contrats/stock_mouvements/paiements.client_id` SET NULL/NO ACTION · `clients.user_id`→auth.users CASCADE.
*(Live-confirmé : `interventions` n'a PAS de `client_id` FK — lien via devis uniquement.)*

**Propriété fail-closed :** un DELETE devis ne peut échouer QUE sur `attestations` (NO ACTION). Toute règle enfant plus stricte en prod qu'annoncée ne ferait qu'**annuler la transaction** → **jamais de perte partielle**. L'incertitude résiduelle ne crée aucun risque data.

## 3. Triggers
**Un seul : `devis_updated_at` (BEFORE UPDATE).** Aucun trigger DELETE/INSERT → pas d'effet de bord caché.

## 4. NOT NULL / DEFAULT / UNIQUE (live-confirmés)
- **`clients`** : `nom` NOT NULL (pas de default → à fournir) · `user_id` UNIQUE (NULL en CRM) · `bilingue` NOT NULL default false · `created_at` now().
- **`devis`** : `numero` NOT NULL **UNIQUE** · `prestation` NOT NULL · `montant_total` NOT NULL · `statut` default 'brouillon' · `pct_acompte` default 60. **Defaults DB confirmés** (utilisables par la RPC) : provenance/zone/motif_echec '—', categorie 'Particulier', attestation_crm 'non', type_crm 'ponctuel', duree_contrat_mois 12, frequence_intervention 'trimestrielle', paiements_recus/montant_brut/remise/remise_bienvenue 0, remise_type 'pct'.

## 5. Unicité & concurrence
1. `devis.numero` UNIQUE → numéro généré en JS (`crypto.randomUUID`), **passé** à la RPC (pas de génération en base).
2. Pas d'unicité d'identité sur `clients` (user_id NULL en CRM) → double-conversion = 2 clients. **Hors scope RPC** (cross-boundary Auth+DB).
3. `rpc_replace_planning` concurrents → verrou `pg_advisory_xact_lock`.

## 6. SQL définitif des 3 RPC (validé par l'introspection live — inchangé)

### RPC 1 — rpc_replace_planning
```sql
-- UP
create or replace function public.rpc_replace_planning(p_devis_id uuid, p_rows jsonb)
returns integer language plpgsql as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_devis_id::text));
  delete from public.interventions where devis_id = p_devis_id and statut = 'planifiee';
  insert into public.interventions
    (devis_id, date_intervention, statut, client_nom, adresse, notes, type_passage, montant_du)
  select p_devis_id, (r->>'date_intervention')::date, 'planifiee',
         r->>'client_nom', r->>'adresse', r->>'notes', r->>'type_passage',
         coalesce((r->>'montant_du')::numeric, 0)
  from jsonb_array_elements(p_rows) as r;
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.rpc_replace_planning(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.rpc_replace_planning(uuid, jsonb) to service_role;
-- DOWN
drop function if exists public.rpc_replace_planning(uuid, jsonb);
```
> ⚠️ Live : `interventions` a `montant_prestataire`, `montant_paye`, `heure_debut` etc. ; `client_nom`/`adresse`/`notes`/`montant_du` utilisés par le code actuel → présents. `date_intervention` NOT NULL (fourni), `statut` default 'planifiee'.

### RPC 2 — rpc_add_client_devis
```sql
-- UP
create or replace function public.rpc_add_client_devis(
  p_client jsonb, p_devis jsonb, p_lead_id uuid default null, p_offre_bienvenue boolean default false
) returns uuid language plpgsql as $$
declare v_client_id uuid; v_devis_id uuid;
begin
  insert into public.clients (nom, prenom, email, telephone, ifu, rccm)
  values (p_client->>'nom', p_client->>'prenom', p_client->>'email',
          p_client->>'telephone', p_client->>'ifu', p_client->>'rccm')
  returning id into v_client_id;
  insert into public.devis (client_id, numero, prestation, description, montant_net, montant_total,
       statut, crm_statut, provenance, zone, categorie, motif_echec, paiements_recus, date_contact,
       attestation_crm, date_facture_crm, montant_facture_crm, type_crm, duree_contrat_mois,
       frequence_intervention, date_debut_contrat, remise_bienvenue)
  values (v_client_id, p_devis->>'numero',
       coalesce(nullif(p_devis->>'prestation',''),'—'),
       p_devis->>'description',
       coalesce((p_devis->>'montant_net')::numeric,0),
       coalesce((p_devis->>'montant_total')::numeric,0),
       'brouillon', p_devis->>'crm_statut', p_devis->>'provenance', p_devis->>'zone',
       p_devis->>'categorie', p_devis->>'motif_echec',
       coalesce((p_devis->>'paiements_recus')::numeric,0),
       (p_devis->>'date_contact')::date, p_devis->>'attestation_crm',
       (p_devis->>'date_facture_crm')::date,
       coalesce((p_devis->>'montant_facture_crm')::numeric,0),
       p_devis->>'type_crm', coalesce((p_devis->>'duree_contrat_mois')::int,12),
       p_devis->>'frequence_intervention', (p_devis->>'date_debut_contrat')::date,
       case when p_offre_bienvenue then 10 else null end)
  returning id into v_devis_id;
  if p_lead_id is not null and p_offre_bienvenue then
    update public.leads set traite = true where id = p_lead_id;
  end if;
  return v_devis_id;
end $$;
revoke all on function public.rpc_add_client_devis(jsonb, jsonb, uuid, boolean) from public, anon, authenticated;
grant execute on function public.rpc_add_client_devis(jsonb, jsonb, uuid, boolean) to service_role;
-- DOWN
drop function if exists public.rpc_add_client_devis(jsonb, jsonb, uuid, boolean);
```

### RPC 3 — rpc_delete_client
```sql
-- UP
create or replace function public.rpc_delete_client(p_client_id uuid)
returns void language plpgsql as $$
begin
  if exists (select 1 from public.attestations a
             join public.devis d on d.id = a.devis_id
             where d.client_id = p_client_id) then
    raise exception 'CLIENT_HAS_ATTESTATIONS' using errcode = '23503';
  end if;
  delete from public.devis   where client_id = p_client_id;
  delete from public.clients where id = p_client_id;
end $$;
revoke all on function public.rpc_delete_client(uuid) from public, anon, authenticated;
grant execute on function public.rpc_delete_client(uuid) to service_role;
-- DOWN
drop function if exists public.rpc_delete_client(uuid);
```
> Changement de chemin requis : `supprimerClient` (2 DELETE directs client-side) → nouvelle action `crm-data` `delete_client` (après `verifyAdminWrite`) appelant la RPC. RPC exécutable **service_role uniquement** → un compte lecture ne peut pas la déclencher.

## 7. Tests prévus
1. **Atomicité (Supabase local)** : add_client_devis avec 2ᵉ insert en échec → 0 client (rollback) ; replace_planning insert en échec → ancien planning intact ; delete_client avec attestation → exception + données intactes, sans attestation → suppression + cascades.
2. **Permissions** : `supabase.rpc()` en session lecture → refus (non exécutable par authenticated).
3. **Route (node --test)** : mock `supabase.rpc()` → params corrects, parité réponse JSON, 500 sans faux succès si la RPC échoue.
4. **Concurrence** : 2 replace_planning simultanés → aucun doublon (verrou advisory).

## 8. Rollback
Déploiement découplé : (1) migration additive `create function` (inerte) ; (2) code route. Rollback = redéployer le code route précédent (les fonctions redeviennent inertes ou sont retirées via DOWN). **Risque données = nul** tant que le code route n'appelle pas les RPC.

## 9. À confirmer si accès catalog obtenu (non bloquant, tout est fail-closed)
- Colonnes `interventions` (confirmées utilisées en prod par le code actuel).
- ON DELETE des enfants hors export (certificats/fiches/rapports/depenses) — toute divergence = rollback atomique.
- `attestations.devis_id` NO ACTION — confirmé par l'export, géré par le garde-fou de rpc_delete_client.
