-- Lot B — Bucket PRIVÉ des justificatifs de règlement hors site (capture MoMo / photo chèque).
-- NON APPLIQUÉE. Même pattern privé que 'fiches-medias' / 'candidatures'.
-- public=false => aucune exposition publique ; lecture admin via URL signée courte.
-- file_size_limit + allowed_mime_types = défense en profondeur (validation aussi côté route).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'justificatifs', 'justificatifs', false, 4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Aucune policy publique. Tous les accès (upload + lecture signée) passent par les routes
-- API en service_role : le bucket reste fermé aux rôles anon/authenticated (pas de policy).
