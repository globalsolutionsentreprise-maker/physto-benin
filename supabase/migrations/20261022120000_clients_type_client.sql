-- Segment client explicite : 'particulier' | 'entreprise' (NULL = non classé, le
-- CRM retombe alors sur l'heuristique). Piloté au clic depuis la liste Clients.
alter table clients add column if not exists type_client text;

-- Pré-remplissage initial (one-shot) : entreprise si un signal structuré existe
-- (raison sociale / IFU / RCCM sur la fiche OU établissement renseigné sur un de
-- ses devis) ou si le nom contient un mot-clé d'enseigne évident. Tout le reste =
-- particulier. L'utilisateur corrige les cas limites en un clic ensuite.
-- ponytail: backfill heuristique one-shot, plafond connu (rate les enseignes sans
-- mot-clé) ; le correctif durable est le bouton de bascule dans la liste Clients.
update clients set type_client = 'entreprise'
where type_client is null and (
  entreprise is not null
  or ifu is not null
  or rccm is not null
  or id in (
    select client_id from devis
    where etablissement_ifu is not null
       or etablissement_rccm is not null
       or etablissement_nom is not null
  )
  or coalesce(nom, '') || ' ' || coalesce(prenom, '') ~* '(hotel|hôtel|groupe|network|limited|sarl|restaurant|resto|boulangerie|food|rooftop|grill|délice|delice|maison|ifu:|societe|société|company|pharmacie|clinique|hopital|hôpital|supermarch|boutique)'
);

update clients set type_client = 'particulier' where type_client is null;
