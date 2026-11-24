-- Offre de bienvenue : passe la remise appliquée de 10% à 5%.
-- Seul le littéral de rpc_add_client_devis change (ligne remise_bienvenue).
-- Les devis déjà posés gardent leur valeur ; seuls les nouveaux prennent 5.
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
  returning id into v_client_id;

  insert into public.devis (
    client_id, numero, prestation, description, montant_net, montant_total,
    statut, crm_statut, provenance, zone, categorie, motif_echec, paiements_recus,
    date_contact, attestation_crm, date_facture_crm, montant_facture_crm, type_crm,
    duree_contrat_mois, frequence_intervention, date_debut_contrat, remise_bienvenue
  ) values (
    v_client_id,
    p_devis->>'numero',
    coalesce(nullif(p_devis->>'prestation',''), '—'),
    p_devis->>'description',
    coalesce((p_devis->>'montant_net')::numeric, 0),
    coalesce((p_devis->>'montant_total')::numeric, 0),
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
    case when p_offre_bienvenue then 5 else null end
  )
  returning id into v_devis_id;

  if p_lead_id is not null and p_offre_bienvenue then
    update public.leads set traite = true where id = p_lead_id;
  end if;

  return v_devis_id;
end $$;

revoke all on function public.rpc_add_client_devis(jsonb, jsonb, uuid, boolean) from public, anon, authenticated;
grant execute on function public.rpc_add_client_devis(jsonb, jsonb, uuid, boolean) to service_role;
