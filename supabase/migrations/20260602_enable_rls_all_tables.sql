-- Activer RLS sur toutes les tables qui ne l'ont pas encore
-- La clé service_role utilisée côté serveur bypasse RLS automatiquement
-- L'accès direct avec la clé anon (publique) sera bloqué

ALTER TABLE fiches_passage        ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificats           ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses_globales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel             ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses_devis        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_visite       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_intervention ENABLE ROW LEVEL SECURITY;
