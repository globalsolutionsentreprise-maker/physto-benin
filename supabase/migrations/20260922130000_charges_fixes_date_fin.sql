-- Date de fin (optionnelle) pour les charges fixes : gère les changements de
-- montant dans le temps (ex. salaire Fabrice 40 000 mars→août, puis 50 000).
-- Cumul = montant mensuel × mois entre date_debut et min(aujourd'hui, date_fin).

ALTER TABLE charges_fixes ADD COLUMN IF NOT EXISTS date_fin DATE;
