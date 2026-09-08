# Plan — Refonte CRM v2 (séparation Prospection/Exécution + 3 améliorations)

Statut : **en cours** — Date : 2026-09-07
Base : le CRM est déjà unifié en React (`SectionClientsDevis`, `app/admin/page.js`), pipeline
piloté par la source unique `devis.etape` (voir `plan-crm-unification.md` + spec
`pipeline-etape-unifie`). On NE refait PAS l'existant.

## Décision (validée avec Kabir)

Le plan ChatGPT (13 modules, table prospects/opportunités, RBAC 4 rôles, dossier numéroté,
dedup) est **écarté** : ~70 % est déjà en place, et le reste ne correspond pas au métier
(1 client = 1 affaire, équipe de 3, données FedaPay live = risque > gain).

On garde 4 chantiers à réelle valeur, faible risque :

0. **Séparer Prospection / Exécution en deux pages.** Aujourd'hui un seul onglet « Pipeline »
   empile les 2 lanes. On coupe en deux onglets : **Prospection** (prospect → devis → relance
   → converti → perdu) et **Exécution** (visite → intervention → certificat → encaissement →
   clôturé). Même `etape`, même `deplacerCarte` : c'est de l'affichage. La bascule
   converti → visite est le passage de main entre les deux pages.
1. **Boutons d'action contextuels** : « Avancer → » générique remplacé par un verbe métier par
   étape (Faire le devis, Marquer gagné, Planifier la visite, Démarrer l'intervention,
   Générer le certificat, Encaisser, Clôturer).
2. **Journal des changements de statut** : chaque `move` écrit dans `admin_journal`
   (qui/quand/de→vers), affiché par dossier.
3. **Fiche client 360** : un écran = devis + contrats + interventions + certificats + solde.

## Contraintes (RÈGLES ACTIVES)

- Source de vérité = `devis.etape`. Rien ne recalcule la colonne.
- Écritures Supabase via `/api/*` (`verifyAdmin` + Bearer), jamais direct depuis page.js.
- Migration éventuelle (journal) : timestamp > dernière migration distante, RLS dans la même
  migration, `npx supabase db push`.
- Pas de tiret cadratin. QA sur prod (`https://www.phyto-benin.com/admin`) après déploiement.

## Phases (chacune déployée + QA avant la suivante)

- **Phase 1 — Séparation + boutons contextuels** (frontend seul, zéro migration).
  - `renderVuePipelineUnifie()` → `renderVuePipeline(lane)` ; rend une seule lane.
  - Onglets : `Pipeline` → `Prospection` + `Exécution`. Dispatch + `vueInitiale` +
    déclencheur `chargerFinances` mis à jour.
  - « Déplacer vers » scopé à la lane courante (+ perdu côté commercial) pour éviter les sauts
    incohérents (ChatGPT §21). L'avance cross-lane converti→visite passe par le bouton.
  - `ACTION_LABEL` : verbe par étape sur le bouton principal.
  - Suppression du code mort `renderVueCommercial` (jamais appelé).
- **Phase 2 — Journal** : insert `admin_journal` dans l'action `move` (crm-data route),
  colonne `devis_id` (migration légère). Affichage global via l'onglet « Journal activité »
  existant. L'historique PAR DOSSIER est déplacé en Phase 3 (emplacement = la fiche 360).
- **Phase 3 — Fiche client 360** : enrichir `renderVueDevisClient`/`renderDossier` (contrats,
  interventions, certificats, solde) + encart « Historique » du dossier (lit `admin_journal`
  par `devis_id`).

## Journal d'avancement

- 2026-09-07 — Plan acté, Phase 1 démarrée.
- 2026-09-07 — **Phase 1 ✅ (build vert, à QA prod).** Onglet « Pipeline » scindé en
  « 🎯 Prospection » (prospect→converti + perdu) et « 🔧 Exécution »
  (visite→clôturé). `renderVuePipelineUnifie()` → `renderVuePipeline(lane)`. Boutons
  contextuels via `ACTION_LABEL` (Faire le devis, Marquer gagné, Planifier la visite,
  Démarrer l'intervention, Générer le certificat, Encaisser, Clôturer). « Déplacer vers »
  scopé à la lane (`movesForLane`). Bascule converti→visite via « Planifier la visite ».
  Supprimé 2 fonctions mortes (`renderVueCommercial`, ancien `renderVuePipeline`).
  Reste : QA prod, puis Phase 2 (journal) + Phase 3 (fiche 360).
- 2026-09-07 — **Phase 1 déployée** (commit `812aa75`), prod saine (/ 200, /admin 200,
  /api/crm-data 401).
- 2026-09-07 — **Phase 2 ✅ (build vert, à déployer).** Migration
  `20260907000000_admin_journal_devis_id.sql` (colonne `devis_id` nullable + index).
  Action `move` (crm-data route) : lit l'ancienne étape + le client, écrit une entrée
  `admin_journal` (`pipeline_move`, « Client : Ancienne → Nouvelle », `devis_id`), hors
  no-op ; `verifyAdmin` renvoie désormais l'user pour l'attribution. Onglet « Journal
  activité » existant : `pipeline_move` rendu « 🔄 Changement d'étape ». Reste : `db push`
  + déploiement + QA prod.
- 2026-09-07 — **Phase 2 déployée** (commit `c6e436b`, migration `db push` OK), prod saine.
- 2026-09-07 — **Phase 3 ✅ (build vert, à déployer).** Fiche client 360 enrichie
  (`renderVueDevisClient` / `renderDossier`) : synthèse financière du client (4 tuiles CA
  devis / Facturé / Encaissé / Solde dû), bloc **Interventions** par dossier (date + statut +
  lieu, invisible jusqu'ici), bloc **Historique** par dossier (journal Phase 2 lu par
  `devis_id` via nouvelle action `get_journal`, chargé à l'ouverture de la fiche). Aucune
  migration. **Les 4 chantiers du plan sont livrés.** Reste : QA prod.
- 2026-09-08 — **Perte depuis l'Exécution + Analyse.** « Déplacer vers → ❌ Perdu »
  désormais aussi sur la lane Exécution (movesForLane execution + ETAPE_PERDU) : une
  affaire visitée puis abandonnée peut être marquée perdue avec motif. Analyse : nouveau
  bloc « perdues APRÈS visite/intervention » (dérivé de la présence d'un rapport de visite /
  fiche de passage / intervention / certificat lié au devis, tables qui survivent au passage
  en perdu) — bannière rouge + montant + marquage 🔻 par dossier. Frontend seul, aucune migration.
