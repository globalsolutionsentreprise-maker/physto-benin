-- Policies RLS pour les tables RH/CRM sans policies
-- Ces tables ont RLS activé (20260602) mais aucune policy → bloque le client admin
-- service_role bypasse RLS automatiquement (routes /api/rh-data, /api/crm-data)
-- Les policies ci-dessous couvrent les accès anon+JWT depuis admin/page.js

CREATE POLICY "personnel_admin" ON personnel FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "interventions_admin" ON interventions FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "rapports_visite_admin" ON rapports_visite FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "rapports_intervention_admin" ON rapports_intervention FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "fiches_passage_admin" ON fiches_passage FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "certificats_admin" ON certificats FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "depenses_devis_admin" ON depenses_devis FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "depenses_globales_admin" ON depenses_globales FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));
