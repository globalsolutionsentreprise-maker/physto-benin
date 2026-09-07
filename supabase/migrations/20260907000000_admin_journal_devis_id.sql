-- Historique par dossier : relier une entree de journal au devis concerne.
-- Permet d'afficher, sur la fiche d'une affaire, ses seuls changements de statut.
-- Colonne nullable : les entrees existantes (et les actions non liees a un devis)
-- restent valides avec devis_id NULL. RLS deja active sur admin_journal ; les
-- policies existantes (insert_own authenticated, service_role full) couvrent la
-- nouvelle colonne, rien a ajouter.

ALTER TABLE admin_journal
  ADD COLUMN IF NOT EXISTS devis_id uuid REFERENCES devis(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS admin_journal_devis_id_idx ON admin_journal (devis_id);
