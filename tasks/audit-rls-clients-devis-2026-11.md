# Audit RLS — tables `clients` et `devis` (production)

Date : 2026-11-08 · Projet Supabase prod `ijgjdtfaimamcrrnyrvk` · Audit **lecture seule**, aucune politique ni donnée modifiée.

## Statut
**Séparation lecture/écriture VÉRIFIÉE en production.** Le test **indépendant du rôle admin reste NON réalisé** (aucun compte admin de test ; seul `role='admin'` actif = le DG, non impersonable). Aucune vulnérabilité de séparation des rôles identifiée. Aucun correctif requis.

## Méthode & limites
- Introspection SQL directe des politiques impossible en autonomie (MCP refusé — projet sous un autre compte ; pas de mot de passe DB ; pas de `DATABASE_URL`). Politiques ci-dessous = **migrations versionnées** ; application réelle **prouvée par comportement REST**.
- Deux principals indépendants : `anon` (sans JWT) et `lecture` (`qa.automation@phyto-benin.com`, magic-link via service_role). `QA_ADMIN_EMAIL` pointe en réalité sur `qa.automation` (role `lecture`).
- Comptes `admin_acces` : `admin` actif = `yakoubou.kabir@gmail.com` (DG) ; `lecture` actif = `qa.automation@phyto-benin.com`.
- Tests non destructifs : SELECT, INSERT (marqueur nettoyé), UPDATE **no-op** (valeur identique), DELETE sur **fixture jetable** créée+supprimée via service_role. Zéro donnée métier modifiée.

## Politiques (état après migrations de durcissement 20261028120000 + 20261107120000 + 20261107130000)
Fonctions : `is_admin()` = `actif AND role='admin'` ; `is_active_admin()` = `actif` (tout rôle). SECURITY DEFINER, `search_path=''`, owner postgres.

`clients` : `clients_own_select` (SELECT `auth.uid()=user_id`) · `clients_own_update` (UPDATE `auth.uid()=user_id`) · `clients_admin_read` (SELECT `is_active_admin()`) · `clients_admin_write` (ALL `is_admin()`). Supprimées : `admin_all_clients USING(true)`, `clients_admin_insert`, ancien `clients_admin_update` (actif).

`devis` : `devis_own_select` (SELECT ownership) · `devis_admin_read` (SELECT `is_active_admin()`) · `devis_admin_write` (ALL `is_admin()`). Supprimées : `devis_own_update`, `admin_all_devis USING(true)`, `client_update_devis USING(true)`, `devis_admin_insert`, `devis_admin_all` (actif).

## Preuves HTTP (PostgREST prod, `/rest/v1`)

| Principal | SELECT clients/devis | INSERT clients | UPDATE no-op clients/devis | DELETE (fixture réelle) |
|---|---|---|---|---|
| anon (sans JWT) | `200 rows=0` | `401` (42501 RLS) | `200 affected=0` | `200 supprimé=0` — fixture intacte |
| lecture | `200 rows=3` | `403` (42501 RLS) | `200 affected=0` (clients + devis) | `200 supprimé=0` — fixture intacte |
| service_role (contrôle) | bypass | OK | — | OK (nettoyage fixture) |
| **admin (DG)** | **non testé** (pas de compte admin de test ; DG non impersonable) | — | — | — |

`affected=0` / `supprimé=0` sur une ligne visible = écriture filtrée par `USING(is_admin())` → **bloquée**. INSERT `42501` = `WITH CHECK(is_admin())` refusé.

## Verdict par critère
1. Politiques examinées ✅ (déclarées ; application réelle confirmée par comportement).
2. SELECT/INSERT/UPDATE/DELETE ✅ pour anon + lecture ; DELETE prouvé sur fixture réelle.
3. Admin peut tout faire ⚠️ **non vérifié en session live** ; étayé par policy `FOR ALL is_admin()` + réalité de prod (le DG opère le CRM quotidiennement).
4. Lecture ne peut rien écrire **même hors UI** ✅ PROUVÉ (REST direct : INSERT 403, UPDATE 0, DELETE 0 sur clients + devis).
5. Utilisateur authentifié ordinaire ne contourne pas la séparation ✅ (lecture bloqué ; portail = `*_own_*` + `clients_own_update` sur son seul profil).
6. Aucune policy permissive neutralisante ✅ (anon lit 0 ligne ; aucune écriture `true`). `admin_all_*` / `client_update_devis` confirmées absentes.

**Conséquence :** les migrations `rls_role_admin` + `rls_drop_permissive` sont bien **appliquées en prod** (les mentions « NON APPLIQUÉE » des fichiers sont périmées).

## Observations (pas des failles)
- `clients_own_update` subsiste : un client du portail modifie **sa propre** fiche (`WITH CHECK user_id`). Voulu (édition profil). Durcissement possible via route API, non urgent.
- Écritures directes admin clients/devis : sûres car `is_admin()` garde l'écriture au niveau base.
- Recommandation : compte admin de test dédié pour vérifier le critère #3 en autonomie (NON créé — interdit par consigne).
