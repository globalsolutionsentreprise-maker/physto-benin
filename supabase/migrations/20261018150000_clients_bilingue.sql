-- Client anglophone : sortir ses documents en bilingue (FR + EN).
-- Pilote sur la fiche de passage/contrôle ; étendu ensuite aux autres documents.
alter table clients add column if not exists bilingue boolean not null default false;
