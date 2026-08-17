-- Module recrutement : offres d'emploi publiées sur le site + candidatures reçues.
-- Accès uniquement via les routes API en service_role (offres publiques en lecture,
-- candidatures en écriture publique, gestion réservée à l'admin). RLS activé sans
-- policy anon = tout accès direct client bloqué, seul service_role (API) passe.

CREATE TABLE IF NOT EXISTS offres_emploi (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titre text NOT NULL,
  description text,          -- missions du poste
  profil text,              -- profil recherché
  contrat text,             -- ex : Temps plein, Commission, CDD
  lieu text,                -- ex : Cotonou / Terrain
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offres_emploi ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS candidatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  offre_id uuid REFERENCES offres_emploi(id) ON DELETE SET NULL,
  nom text NOT NULL,
  telephone text,
  email text,
  ville text,
  experience text,
  motivation text,
  cv_path text,             -- chemin dans le bucket privé "candidatures" (null si pas de CV)
  statut text DEFAULT 'nouveau',   -- nouveau / rappeler / entretien / retenu / ecarte
  created_at timestamptz DEFAULT now()
);
ALTER TABLE candidatures ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS candidatures_offre_id_idx ON candidatures (offre_id);
CREATE INDEX IF NOT EXISTS candidatures_statut_idx ON candidatures (statut);

-- Bucket privé pour les CV (accès via URL signée générée côté admin uniquement).
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidatures', 'candidatures', false)
ON CONFLICT (id) DO NOTHING;

-- Offre d'amorçage : Commercial.
INSERT INTO offres_emploi (titre, description, profil, contrat, lieu, actif)
VALUES (
  'Commercial(e) terrain',
  'Prospecter de nouveaux clients (hôtels, restaurants, entreprises, particuliers), présenter les services de GSE Phyto-Bénin (désinsectisation, dératisation, désinfection), établir des devis et assurer le suivi jusqu''à la signature.',
  'Aisance relationnelle et sens du contact, première expérience commerciale appréciée, autonomie et rigueur dans le suivi, connaissance de Cotonou et environs, moyen de déplacement souhaité.',
  'Temps plein + commissions',
  'Cotonou et environs',
  true
) ON CONFLICT DO NOTHING;
