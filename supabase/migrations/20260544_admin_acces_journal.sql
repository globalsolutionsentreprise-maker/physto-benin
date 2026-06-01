-- Gestion des accès admin (multi-utilisateurs)
CREATE TABLE IF NOT EXISTS admin_acces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  nom text NOT NULL,
  role text DEFAULT 'lecture' CHECK (role IN ('admin', 'lecture')),
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_acces ENABLE ROW LEVEL SECURITY;
-- Un utilisateur authentifié peut lire sa propre ligne (pour vérifier son rôle à la connexion)
CREATE POLICY "acces_read_own" ON admin_acces FOR SELECT TO authenticated USING (email = auth.jwt() ->> 'email');
-- Le service role peut tout faire (gestion depuis l'API)
CREATE POLICY "acces_service_all" ON admin_acces FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Journal d'activité admin
CREATE TABLE IF NOT EXISTS admin_journal (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text NOT NULL,
  user_nom text,
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_journal ENABLE ROW LEVEL SECURITY;
-- Un utilisateur authentifié peut insérer ses propres entrées
CREATE POLICY "journal_insert_own" ON admin_journal FOR INSERT TO authenticated WITH CHECK (user_email = auth.jwt() ->> 'email');
-- Le service role peut tout lire (pour afficher le journal)
CREATE POLICY "journal_service_all" ON admin_journal FOR ALL TO service_role USING (true) WITH CHECK (true);
