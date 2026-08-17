-- Annonce complète (modèle Talenco adapté à GSE) : champs éditoriaux + résumé structuré.
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS pourquoi_postuler text;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS futur_employeur text;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS avantages text;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS deplacements text;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS temps_travail text;              -- ex : Temps plein
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS salaire_min integer;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS salaire_max integer;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS salaire_devise text DEFAULT 'FCFA';
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS salaire_periode text DEFAULT 'mois';
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS salaire_visible boolean DEFAULT true;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS est_stage boolean DEFAULT false;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS stage_duree text;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS stage_gratifie boolean;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS stage_montant integer;
ALTER TABLE offres_emploi ADD COLUMN IF NOT EXISTS stage_profil text;

-- Pré-remplissage GSE de l'offre Commercial : Pourquoi postuler + Futur employeur
-- (adaptés au contexte GSE, éditables ensuite dans l'admin).
UPDATE offres_emploi SET
  pourquoi_postuler = 'Vous souhaitez rejoindre une entreprise béninoise agréée par l''État, référence de l''hygiène sanitaire et de la lutte anti-nuisibles au Bénin ?
Vous avez le goût du terrain et du contact client, et l''envie de développer un portefeuille dans un secteur en pleine croissance ?
Vous recherchez un poste offrant une réelle autonomie, une rémunération motivante (fixe et commissions) et un impact direct sur la croissance de l''entreprise ?',
  futur_employeur = 'GSE (Global Solutions Entreprise), à travers sa marque Phyto Bénin, est spécialisée dans l''hygiène sanitaire et phytosanitaire au Bénin : désinsectisation, dératisation, désinfection et traitement anti-termites. Agréée par l''État béninois (APA/26-025/CNGP-BEN), elle protège foyers, hôtels, restaurants, entreprises et industries contre les nuisibles, avec des techniciens formés et des produits homologués. En pleine croissance, GSE développe son réseau commercial et ses contrats d''entretien à Cotonou et dans tout le Bénin.',
  temps_travail = 'Temps plein',
  salaire_visible = true,
  salaire_devise = 'FCFA',
  salaire_periode = 'mois'
WHERE titre = 'Commercial(e) terrain';
