-- Policies RLS complètes pour tous les tables
-- service_role bypasse RLS automatiquement (routes API admin)
-- Les policies ci-dessous couvrent les accès anon+JWT (admin panel et espace-client)

-- ===========================
-- HELPER : est-ce un admin actif ?
-- (utilisé dans plusieurs policies)
-- ===========================
-- Fonction inline via EXISTS (pas de fonction SQL pour éviter les dépendances)

-- ===========================
-- TABLES CMS — lecture publique, écriture admin authentifié
-- ===========================

CREATE POLICY "parametres_public_read"  ON parametres FOR SELECT USING (true);
CREATE POLICY "parametres_admin_write"  ON parametres FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "chiffres_public_read"    ON chiffres FOR SELECT USING (true);
CREATE POLICY "chiffres_admin_write"    ON chiffres FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "contenus_public_read"    ON contenus FOR SELECT USING (true);
CREATE POLICY "contenus_admin_write"    ON contenus FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "temoignages_public_read" ON temoignages FOR SELECT USING (true);
CREATE POLICY "temoignages_admin_write" ON temoignages FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "articles_public_read"    ON articles FOR SELECT USING (true);
CREATE POLICY "articles_admin_write"    ON articles FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "equipe_public_read"      ON equipe FOR SELECT USING (true);
CREATE POLICY "equipe_admin_write"      ON equipe FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "services_public_read"    ON services FOR SELECT USING (true);
CREATE POLICY "services_admin_write"    ON services FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "realisations_public_read" ON realisations FOR SELECT USING (true);
CREATE POLICY "realisations_admin_write" ON realisations FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

-- ===========================
-- TABLE CLIENTS
-- Espace-client : un utilisateur lit/modifie son propre profil
-- Admin : lit tous les clients (pour dropdowns stock, etc.)
-- ===========================

CREATE POLICY "clients_own_select" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clients_own_update" ON clients
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_admin_read" ON clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true)
  );

-- ===========================
-- TABLE DEVIS
-- Espace-client : lit et signe ses propres devis
-- ===========================

CREATE POLICY "devis_own_select" ON devis
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "devis_own_update" ON devis
  FOR UPDATE
  USING  (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- ===========================
-- TABLE ATTESTATIONS
-- ===========================

CREATE POLICY "attestations_own_select" ON attestations
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- ===========================
-- TABLE PAIEMENTS
-- ===========================

CREATE POLICY "paiements_own_select" ON paiements
  FOR SELECT USING (
    devis_id IN (
      SELECT d.id FROM devis d
      JOIN clients c ON c.id = d.client_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ===========================
-- TABLES STOCK — admin uniquement
-- ===========================

CREATE POLICY "stock_produits_admin" ON stock_produits FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));

CREATE POLICY "stock_mouvements_admin" ON stock_mouvements FOR ALL
  USING  (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_acces WHERE email = auth.jwt() ->> 'email' AND actif = true));
