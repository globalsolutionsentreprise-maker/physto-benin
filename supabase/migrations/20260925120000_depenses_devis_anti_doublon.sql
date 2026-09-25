-- Empêche l'insertion de deux dépenses strictement identiques sur une même affaire
-- (même libellé, montant et catégorie). Bloque les doublons accidentels : double
-- soumission du formulaire, re-run d'un backfill de dépenses. Les NULL sont
-- normalisés (libelle -> '', categorie -> 'autre') pour que la contrainte
-- s'applique même sans libellé/catégorie renseignés.
CREATE UNIQUE INDEX IF NOT EXISTS depenses_devis_uniq
  ON depenses_devis (devis_id, coalesce(libelle, ''), montant, coalesce(categorie, 'autre'));
