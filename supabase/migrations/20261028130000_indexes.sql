-- Index manquants (audit ECC) — idempotent, sûr à rejouer.
-- Colonnes de FK / filtres fréquents vérifiées dans le code et les migrations.
CREATE INDEX IF NOT EXISTS idx_devis_client_id              ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id              ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_devis_id       ON interventions(devis_id);
CREATE INDEX IF NOT EXISTS idx_interventions_personnel_id   ON interventions(personnel_id);
CREATE INDEX IF NOT EXISTS idx_fiches_passage_intervention  ON fiches_passage(intervention_id);
CREATE INDEX IF NOT EXISTS idx_fiches_passage_devis_id      ON fiches_passage(devis_id);
CREATE INDEX IF NOT EXISTS idx_fiches_passage_client_id     ON fiches_passage(client_id);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_produit     ON stock_mouvements(produit_id);
CREATE INDEX IF NOT EXISTS idx_certificats_devis_id         ON certificats(devis_id);
CREATE INDEX IF NOT EXISTS idx_paiements_devis_id           ON paiements(devis_id);
CREATE INDEX IF NOT EXISTS idx_leads_traite_created         ON leads(traite, created_at DESC);
