-- Brouillon serveur de la fiche terrain : la saisie de Fabrice est enregistrée
-- automatiquement côté serveur à chaque modification (pas seulement sur le
-- téléphone). Objectif : ne JAMAIS perdre le travail, même si la page se
-- recharge brutalement (appareil photo, navigateur interne WhatsApp, autre
-- téléphone). Vidé à l'envoi de la fiche.
alter table interventions add column if not exists fiche_draft jsonb;
