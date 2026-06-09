-- Ajout des politiques INSERT manquantes pour que les admins puissent créer des clients et devis
-- Le service_role bypasse RLS, mais en cas de fallback sur anon key ces policies sont nécessaires

CREATE POLICY "clients_admin_insert" ON clients
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true)
  );

CREATE POLICY "devis_admin_insert" ON devis
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true)
  );

CREATE POLICY "clients_admin_update" ON clients
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true)
  );

CREATE POLICY "devis_admin_all" ON devis
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true)
  );
