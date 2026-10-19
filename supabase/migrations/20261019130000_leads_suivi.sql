-- Suivi des leads par Fabrice via la page unique /suivi (un seul secret partagé,
-- pas un jeton par lead). On ajoute le résultat du dernier appel directement sur
-- la table leads pour que Kabir le voie dans l'admin (onglet Leads). Colonnes, pas
-- jsonb : l'admin et les filtres les lisent directement, sans parsing.
alter table leads
  add column if not exists suivi_statut text,       -- a_relancer | rdv | devis | perdu
  add column if not exists suivi_note text,          -- note libre de Fabrice
  add column if not exists rappel_le date,           -- date de relance choisie
  add column if not exists dernier_contact timestamptz;  -- horodatage du dernier résultat
