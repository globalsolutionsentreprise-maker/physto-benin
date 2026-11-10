# Étape A — Audit + architecture : gestion documentaire de l'espace client

Date : 2026-11-10 · **PROPOSITION. Aucune migration, aucun code, aucun déploiement appliqué. À valider avant Étape B.**

## 1. Audit de l'existant (code vérifié)

### Comptes & établissement
- Un **client = un établissement** : table `public.clients`, colonne `user_id` (FK `auth.users`, NULL pour les clients CRM sans accès). L'accès espace client n'existe que si `user_id` est renseigné.
- Espace client réel : `/espace-client` (login Supabase Auth), `/dashboard`, `/devis/[id]`, `/attestations/[id]`. Il lit `clients`/`devis`/`attestations`/`paiements` **en direct via supabase-js** (anon key + session), la RLS filtrant par propriété.

### Sécurité / RLS déjà en place (à réutiliser tel quel)
- Helpers SECURITY DEFINER : `public.is_active_admin()` (actif, tout rôle) et `public.is_admin()` (actif ET `role='admin'`), source `admin_acces` (migration `20261107120000_rls_role_admin.sql`).
- Convention policies : lecture admin = `is_active_admin()`, écriture admin = `is_admin()`, lecture propriétaire espace client = `*_own_*` avec `client_id in (select id from public.clients where user_id = auth.uid())`.
- Gardes routes : `verifyAdmin` / `verifyAdminWrite` (`lib/verify-admin.js`), sur `admin_acces` (rôle métier admin/lecture). `verifyAdminWrite` exige `role='admin'`.

### Stockage de fichiers déjà en place (pattern à réutiliser)
- Buckets **privés fermés** : `justificatifs` (migration `20261108130000`), même modèle que `fiches-medias` / `candidatures`. `public=false`, `file_size_limit`, `allowed_mime_types`. **Aucune policy storage** : tout l'accès (upload + lecture signée) passe par des **routes API en service_role**.
- Route de référence `app/api/justificatif-upload/route.js` : createClient(service_role), `verifyAdminWrite` **OU** client propriétaire (via `anon.auth.getUser(token)` + match `clients.user_id`), validation **MIME + taille serveur**, chemin `${id}/${timestamp}-${rand}.${ext}`, **retourne le chemin, jamais une URL publique**.
- `service_role` n'est jamais exposé au navigateur (uniquement dans les routes API).

### Documentaire existant ?
- **Aucune table `documents`**, aucune rubrique « Mes documents ». Factures : hors app (portail gouvernemental → PDF transmis). Rapports : CRM → WhatsApp. Attestations : rendues/affichées (pas de PDF stocké). Devis : champ `pdf_url`.
- Conclusion : **rien à dédoublonner** ; on ajoute une brique `documents` qui réutilise bucket privé + helpers RLS + pattern de route.

## 2. Architecture proposée (minimale, greffée sur l'existant)

**Principe :** une table `documents` (métadonnées) + un bucket privé `documents` (PDF). GSE dépose/édite/publie depuis le CRM ; le client voit uniquement ses documents **publiés**. Fichiers servis par **URL signée courte** via route service_role. Double contrôle : **RLS sur les métadonnées** + **vérification serveur + bucket fermé** sur le fichier.

### Migration (à relire — NON APPLIQUÉE)
```sql
-- supabase/migrations/2026XXXX_documents_espace_client.sql   [NON APPLIQUÉE]

-- 1) Bucket privé PDF, fermé (accès 100% via routes service_role, zéro policy storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents','documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- 2) Table métadonnées
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  categorie text not null check (categorie in
    ('facture','rapport_intervention','fiche_technique','fiche_controle','attestation','contrat','devis','autre')),
  titre text not null,
  date_document date,
  reference text,
  description text,
  statut text not null default 'brouillon' check (statut in ('brouillon','publie','archive')),
  storage_path text not null,           -- chemin bucket privé, jamais exposé tel quel
  nom_fichier text,                     -- nom d'origine (affichage seulement)
  mime_type text,
  taille_bytes integer,
  devis_id uuid references public.devis(id) on delete set null,
  intervention_id uuid references public.interventions(id) on delete set null,
  created_by text,                      -- email admin (traçabilité)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz
);
create index if not exists documents_client_idx on public.documents(client_id);
create index if not exists documents_client_pub_idx on public.documents(client_id) where statut='publie';

create or replace function public.documents_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents
  for each row execute function public.documents_set_updated_at();

-- 3) RLS (réutilise is_admin / is_active_admin)
alter table public.documents enable row level security;
create policy documents_admin_read  on public.documents for select using (public.is_active_admin());
create policy documents_admin_write on public.documents for all    using (public.is_admin()) with check (public.is_admin());
-- client : uniquement SES documents PUBLIÉS (jamais brouillon ni archivé)
create policy documents_own_read on public.documents for select using (
  statut = 'publie'
  and client_id in (select id from public.clients where user_id = auth.uid())
);
-- Aucune policy d'écriture client. Bucket 'documents' sans policy => fermé.
```
Traçabilité : `created_by` + `published_at` + `updated_at` (remplacement) + `archived_at`. La « suppression » par défaut = **archivage** (ligne + fichier conservés, invisibles côté client). Un **hard-delete** éventuel (fichier storage puis ligne) sera une action admin distincte et journalisée (réutilisation d'`admin_journal` à confirmer en Étape B) — pas d'orphelin : on supprime le fichier puis la ligne, dans cet ordre, en service_role.

### Routes API
- **`POST /api/admin-documents`** (service_role, `verifyAdminWrite`), actions :
  - `add` (multipart : fichier + métadonnées) — **PDF only**, taille ≤ 4 Mo (plafond Vercel ~4,5 Mo ; cf. justificatifs), nom de stockage généré `${client_id}/${uuid}.pdf` (**le nom d'origine n'est jamais utilisé comme chemin** → neutralise les noms dangereux), `statut='brouillon'` par défaut. **Le dépôt ne publie pas.**
  - `update` (métadonnées), `replace` (nouveau fichier, ancien supprimé du bucket), `publish` (→ `publie`, `published_at=now()`), `unpublish`/`archive`, `delete` (hard, encadré), `list` (par `client_id`).
- **`POST /api/client-documents`** (session client) action `download` : vérifie que le document appartient au client connecté (`clients.user_id = user.id`) **et** `statut='publie'`, puis renvoie une **URL signée ~60 s**. La **liste** « Mes documents » se lit en direct via supabase-js (RLS `documents_own_read`), comme devis/attestations.

### Interface admin (CRM) — `app/admin/page.js`
Dans la fiche client : section **« Documents du client »** = liste (titre, catégorie, date, statut, réf) + bouton **« Ajouter un document »** (modale : fichier, catégorie, titre, date, référence facultative, description facultative, visibilité brouillon/publié) + actions par ligne (modifier, remplacer, publier/dépublier, archiver, supprimer selon droits).

### Interface espace client — `app/espace-client/dashboard`
Rubrique **« Mes documents »** : liste des documents **publiés** du client, **filtre par catégorie**, recherche par **référence** (facture), date, bouton **Ouvrir/Télécharger** (→ route `download` → URL signée). **État vide propre**. **Jamais** de brouillon ni d'archivé. Responsive mobile.

### Cas factures (Section 4 du cahier)
Aucune connexion au portail gouvernemental. Flux : fiche client → Ajouter un document → catégorie **Facture** → joindre le PDF de la comptable → date + référence → **Publier**. Le client consulte/télécharge. Rien d'automatisé n'est présenté comme tel.

### Cas rapports d'intervention (Section 5)
Dépôt manuel PDF possible immédiatement (comme tout document), avec liaison `intervention_id` (→ établissement + date + prestation ; zones si disponibles via la fiche). **Auto-publication** depuis le CRM : à étudier en Étape B selon qu'un **générateur de PDF côté serveur** existe (sinon le rapport est produit côté client par impression) ; si oui, bouton « Publier le rapport dans l'espace client » à la validation de l'intervention ; sinon, dépôt manuel. **Aucune publication d'un rapport non validé.**

### Notifications (Section 9)
Un mécanisme email **fiable existe** (Resend, déjà utilisé par `send-devis`). Donc faisable. Proposition : par défaut, **indicateur visuel** (badge « nouveau » sur les documents publiés non encore ouverts, via `localStorage` côté client). Email de notification à la publication : **optionnel, Étape C/ultérieure, sur ta décision** (pas de fausse notification, pas de temps réel).

## 3. Sécurité (exigences Section 7) — comment chaque point est couvert
- Stockage **privé** (`public=false`) + **bucket sans policy** (fermé) → aucune URL publique permanente. ✅
- Chaque fichier lié à `client_id` (= établissement). ✅
- Contrôle **côté serveur** (routes service_role) **et** **RLS** (`documents_own_read` publié+propriétaire). ✅
- Téléchargement par **URL signée courte** uniquement, après vérif propriété+publié. Modifier un id/URL ne donne rien (route refuse, bucket fermé). ✅
- `service_role` **jamais** au navigateur. ✅
- Validation MIME + extension + taille (serveur) **et** restrictions bucket (défense en profondeur). PDF only. ✅
- Chemin de stockage généré (uuid), nom d'origine jamais utilisé comme chemin → **noms dangereux neutralisés**. ✅
- Traçabilité (created_by/published_at/updated_at/archived_at ; journal des suppressions en Étape B). ✅

## 4. États (Section 8)
`brouillon` (GSE seul) · `publie` (client) · `archive` (conservé, masqué au client). Publication = action explicite. Suppression encadrée = archivage par défaut ; hard-delete = fichier puis ligne (zéro orphelin), journalisé.

## 5. Tests prévus (Section 11) — RLS + routes, pas que l'UI
Reprise de l'infra `app/api/_secure-routes-test/` (node --test + mocks) et tests RLS comportementaux via REST (2 sessions), comme l'audit RLS clients/devis :
1. Dépôt facture PDF (admin) → ligne `brouillon`, fichier dans bucket. 2. Publication → `publie`. 3. Consultation par **le bon client** (liste + download signé). 4. **Refus** pour un **autre client** (id deviné → 403 route + 0 ligne RLS). 5. Download sécurisé (URL signée courte, pas d'URL publique). 6. Dépôt rapport. 7. Publication + consultation rapport. 8. **Brouillon invisible** côté client (RLS + route). 9. Remplacement (ancien fichier supprimé). 10. Archivage + suppression (pas d'orphelin). 11. Contrôles taille/type (PDF only, >4 Mo refusé). 12. **Aucune fuite** fichier/privilège (anon/lecture ne peuvent rien ; service_role absent du bundle navigateur).

## 6. Plan par étapes (Section 12) — déploiement seulement après validation
- **A (présent) : audit + architecture + migration à relire.** ← STOP, en attente de ton feu vert.
- **B :** migration (appliquée par toi via `supabase db push` après relecture) + route `admin-documents` + section « Documents du client » dans le CRM + tests routes.
- **C :** route `client-documents` (download signé) + rubrique « Mes documents » dans l'espace client + tests.
- **D :** tests sécurité/RLS/non-régression + (option) email de notification.

Non-régression garantie : aucune table/policy existante modifiée (ajout seul : 1 bucket, 1 table, 3 policies, 1 trigger). CRM, devis, attestations, paiements, comptes, Premium : intacts.

## 7. Points à confirmer avant Étape B
1. **Feu vert** sur l'architecture et la migration ci-dessus.
2. Taille max fichier : **4 Mo** (contrainte Vercel) convient-elle ? (au-delà, il faudrait un upload direct Supabase par URL signée — surcoût).
3. Rapports : veux-tu l'**auto-publication** depuis le CRM (sous réserve d'un générateur PDF serveur) ou le **dépôt manuel** suffit pour commencer ?
4. **Notification email** à la publication : maintenant (Étape C) ou plus tard ?
5. La migration sera **appliquée par toi** (projet prod sous ton compte Supabase) ; je ne pousse rien.

---

## Étape B — réalisée (non déployée, migration non appliquée)

Décisions appliquées : 4 Mo + message explicite · rapports en dépôt manuel mais liaison `intervention_id` conservée · pas d'email · migration appliquée par le DG.

**Fichiers créés/modifiés :**
- `supabase/migrations/20261110120000_documents_espace_client.sql` (créé — bucket + table + trigger + 3 policies ; **NON APPLIQUÉE**)
- `app/api/admin-documents/route.js` (créé — route service_role, gate verifyAdmin/verifyAdminWrite)
- `app/admin/DocumentsClient.js` (créé — panneau « Documents du client »)
- `app/admin/page.js` (modifié — 1 import + 1 élément dans la vue détail client ; aucune autre ligne touchée)
- `app/api/_secure-routes-test/documents.test.mjs` (créé — 16 tests)
- `app/api/_secure-routes-test/mocks.mjs` (modifié — ajouts additifs : storage.remove, delete(), hooks d'erreur)
- `app/api/_secure-routes-test/run.sh` (modifié — build route + exécution de la suite documents)

**Tests :** suite routes **83/83** (dont 16 documents) · **isolation RLS 7/7** sur Postgres jetable (script `scratchpad/rls-documents-test.sql`).

**Reste Étape C (non commencée, en attente de validation) :** route `client-documents` (download signé) + rubrique « Mes documents » dans l'espace client.

---

## Migration appliquée en Production (2026-11-10)

`20261110120000_documents_espace_client` **appliquée** sur `ijgjdtfaimamcrrnyrvk` (Physto Bénin) via CLI (MCP refusé). RPC `20261109120000` isolé le temps du push puis restauré à l'identique (SHA inchangé) et **toujours non appliqué**. Vérifs prod (dump lecture seule) : table + RLS + 3 policies + bucket privé 4 Mo/PDF confirmés. Code applicatif B **non déployé**.

## Étape C — réalisée (non déployée)

**Fichiers :**
- `app/api/client-documents/route.js` (créé — download sécurisé : auth client + statut publié + propriété stricte → URL signée 60 s)
- `app/espace-client/dashboard/page.tsx` (modifié — state + fetch documents publiés (RLS) + handler + rubrique « Mes documents » : filtre catégorie, recherche référence/titre, état vide, responsive)
- `app/api/_secure-routes-test/client-documents.test.mjs` (créé — 8 tests) + `run.sh` (build + exécution)

**Tests : 91/91** (dont 8 Étape C : 401 sans/again session, 403 brouillon, **403 document d'un autre client**, 200+URL signée pour le bon client publié).

**Non déployé en Production. En attente de validation pour le déploiement (code B + C).**
