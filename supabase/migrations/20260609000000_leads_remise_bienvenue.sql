CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  nuisible TEXT,
  ville TEXT,
  message TEXT,
  urgence BOOLEAN DEFAULT false,
  offre_bienvenue BOOLEAN DEFAULT true,
  traite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE devis ADD COLUMN IF NOT EXISTS remise_bienvenue INTEGER DEFAULT 0;
