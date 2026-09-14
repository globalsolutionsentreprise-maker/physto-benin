-- Module Prospection : table dédiée pour la prospection sortante (démarchage
-- froid), séparée des `leads` (leads entrants du site). Pipeline propre :
-- statut, canal, dates de contact/relance, campagne, lien vers le devis quand
-- le prospect bascule en exécution.
--
-- Sécurité : tout l'accès passe par /api/prospection (service_role + verifyAdmin).
-- RLS est activée SANS policy permissive : aucun rôle anon/authenticated ne peut
-- lire ou écrire directement (les clients de l'espace client ont un compte
-- Supabase). Le service_role de l'API contourne la RLS. Même modèle que le reste
-- du CRM (accès données sensibles = API only).

CREATE TABLE IF NOT EXISTS prospects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               TEXT NOT NULL,
  categorie         TEXT,          -- Hôtels, Restaurants, Cliniques...
  segment           TEXT,          -- Hôtels & Restaurants, Cliniques & Écoles, Supermarchés · Entrepôts · Agro, Sièges & Entreprises
  telephone         TEXT,
  email             TEXT,
  ville             TEXT DEFAULT 'Cotonou',
  adresse           TEXT,
  source            TEXT DEFAULT 'scraping',
  campagne          TEXT,
  statut            TEXT NOT NULL DEFAULT 'a_contacter'
                      CHECK (statut IN ('a_contacter','contacte','relance','rdv','gagne','perdu')),
  canal             TEXT           CHECK (canal IN ('whatsapp','tel','email') OR canal IS NULL),
  dernier_contact   TIMESTAMPTZ,
  prochaine_relance DATE,
  notes             TEXT,
  motif_perdu       TEXT,
  devis_id          UUID,          -- rempli quand le prospect bascule en exécution
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prospects_statut_idx   ON prospects (statut);
CREATE INDEX IF NOT EXISTS prospects_relance_idx  ON prospects (prochaine_relance);
CREATE INDEX IF NOT EXISTS prospects_campagne_idx ON prospects (campagne);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
-- Aucune policy permissive : accès exclusivement via service_role (API).
