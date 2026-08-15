-- Équipe de plusieurs techniciens par passage de contrat.
-- personnel_id reste le technicien PRINCIPAL (planning RH, calendrier, paiements
-- prestataire inchangés) ; personnel_ids porte l'équipe complète, éditée depuis
-- la frise des contrats signés. La liste inclut toujours le principal en 1er.
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS personnel_ids uuid[] DEFAULT '{}';
