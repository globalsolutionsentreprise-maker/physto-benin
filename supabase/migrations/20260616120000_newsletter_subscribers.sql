-- Table des abonnés newsletter (formulaire /blog)
-- Écriture exclusivement via route API serveur (clé service-role) — jamais depuis le navigateur.
-- RLS activé sans policy publique : service_role bypasse RLS, donc aucun accès anon/JWT n'est nécessaire ni créé.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
