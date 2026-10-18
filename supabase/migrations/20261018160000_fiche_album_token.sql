-- Album public des médias d'une intervention (photos + vidéos), lié en fin de
-- rapport d'intervention. Jeton DÉDIÉ, distinct du fiche_token de saisie : le
-- lien d'album se partage au client sans lui ouvrir le formulaire terrain.
-- Le bucket des médias (fiches-medias) reste privé ; l'album signe les URLs.
alter table fiches_passage add column if not exists album_token text;
update fiches_passage set album_token = replace(gen_random_uuid()::text, '-', '') where album_token is null;
alter table fiches_passage alter column album_token set default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists fiches_passage_album_token_key on fiches_passage(album_token);
