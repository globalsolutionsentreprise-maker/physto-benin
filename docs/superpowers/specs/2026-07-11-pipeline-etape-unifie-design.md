# Pipeline unifié piloté par `etape` — Design

**Date :** 2026-07-11
**Statut :** Design validé (architecture : champ `etape` explicite), en attente d'approbation finale de la spec
**Fichiers :** migration Supabase + `app/admin/page.js` (`SectionClientsDevis`, `renderVuePipelineUnifie`, `saveParcours`, `deplacerCarte`, `creerDevis`) + action `move` de `app/api/crm-data/route.js`

## Problème

La colonne d'une carte dans le pipeline unifié n'est pas stockée : `colUnifiee(c)` la
**recalcule** à partir d'un mélange de `crm_statut` (commercial) et de signaux
d'exécution (`parcours.*.done`, existence réelle de `fiches_passage`/`certificats`).
Ce couplage implicite fait que l'exécution **prime** sur le commercial → « Déplacer
vers → Devis envoyé » paraît sans effet dès qu'une visite est marquée. Incohérent et
non prévisible.

## Décision d'architecture

**Une seule source de vérité : une colonne `etape` sur le devis.** La colonne du
pipeline = `devis.etape`, point. Tous les mécanismes (déplacement manuel, bouton
Avancer, avancement automatique par le travail réel) **écrivent** `etape`.

## 1. Le parcours (ordre canonique)

```
Commercial :  prospect(0) → devis(1) → relance(2) → converti(3)
Exécution  :  visite(4) → intervention(5) → certificat(6) → encaissement(7) → cloture(8)
Hors-parcours : perdu
```

`etape` ∈ {prospect, devis, relance, converti, visite, intervention, certificat,
encaissement, cloture, perdu}.

`ETAPES` (ordre + libellé + lane) et `PROCHAINE_ETAPE` (chemin « happy path », saute
relance/perdu) définis en constantes dans `SectionClientsDevis` :
- prochaine : prospect→devis, devis→converti, relance→converti, converti→visite,
  visite→intervention, intervention→certificat, certificat→encaissement,
  encaissement→cloture. cloture/perdu → pas de suivant.

## 2. Migration + backfill

```sql
ALTER TABLE devis ADD COLUMN IF NOT EXISTS etape TEXT;
```

**Backfill (script service_role, une fois)** : pour chaque devis, calculer `etape` en
répliquant la logique `colUnifiee` ACTUELLE (crm_statut + parcours + présence de
`fiches_passage`/`certificats` via `devis_id`), puis écrire `etape`. Ainsi l'état
visible ne change pas au déploiement. Devis sans crm_statut (null) → non affichés
au pipeline de toute façon ; leur `etape` peut rester null.

Mapping backfill (repris de colUnifiee) :
- crm_statut `echec` → `perdu`.
- exécution démarrée (crm_statut `converti`/`termine`, ou `parcours.visite/facture/
  intervention.done`, ou fiche/cert existante) → la plus avancée : encaissement.done→
  `cloture` ; cert existant→`encaissement` ; intervention.done|fiche→`certificat` ;
  facture.done→`intervention` ; visite.done→`visite` ; sinon `converti`.
- sinon commercial : crm_statut `devis`→`devis` ; `attente`/`relance`→`relance` ;
  sinon `prospect`.

## 3. `colUnifiee` (simplifié)

```
colUnifiee(c) → c.etape || defautDepuisStatut(c)
```
`defautDepuisStatut` : filet pour un devis sans `etape` (echec→perdu, devis→devis,
attente/relance→relance, converti→converti, sinon prospect). Plus AUCune dépendance à
fiches/certs ici : la position est portée par `etape`.

## 4. Écriture de `etape` — tous les points

- **Déplacement manuel** (`deplacerCarte` + action `move`) : `etape = cible`.
  - Cible commerciale (prospect/devis/relance/converti/perdu) → `parcours = {}`
    (garde-fou déjà en place ; on l'étend à `converti` qui n'a pas d'exécution).
  - Cible exécution → poser les flags `parcours` cumulés cohérents avec les
    consommateurs existants (Finances lit `parcours.encaissement.done` = payé) :
    visite→`{visite}` ; intervention→`{visite,facture}` ; certificat→
    `{visite,facture,intervention}` ; encaissement→idem certificat (PAS payé) ;
    cloture→+`{encaissement:{done}}` (payé). Reculer en-deçà de cloture retire
    `encaissement.done`.
  - Mise à jour optimiste front : `devisList[].etape` + `parcours` en plus de
    `finData.clients[].statut`.
- **`saveParcours(devisId, newParcours)`** : dériver `etape` depuis `newParcours` (même
  échelle exécution que le backfill) et l'écrire en même temps que `parcours`. Couvre
  les boutons du Dossier + « ✓ Marquer encaissé ». Ne jamais faire RECULER `etape` en
  commercial ici (un parcours vide via saveParcours ne doit pas casser une carte
  commerciale — mais saveParcours n'est appelé qu'en contexte exécution, donc dériver
  ≥ `visite`).
- **`creerDevis`** (enregistrer/renvoyer un devis) : si `etape` courante est null ou
  `prospect`, passer à `devis` ; sinon NE PAS rétrograder (un devis déjà converti/en
  exécution qu'on ré-enregistre garde son étape).
- **Création certificat / fiche de passage** : au point d'insertion (à localiser
  pendant l'implémentation — handlers `openCertModal`/`ouvrirFicheModal`), avancer
  `etape` à au moins `certificat` si l'étape courante est antérieure. Sans ça, créer
  un document n'avancerait plus la carte (colUnifiee ne lit plus fiches/certs).

## 5. Les 4 améliorations UI (`renderVuePipelineUnifie`)

1. **Déplacement unifié** : le `<select>` « Déplacer vers… » liste les 10 étapes
   (`ETAPES`), plus « ❌ Perdu ». Choisir une étape appelle `deplacerCarte(id, etape)`
   (voir §4). Remplace `SALES_MOVES`.
2. **Bouton « Avancer → »** : bouton principal par carte → `deplacerCarte(id,
   PROCHAINE_ETAPE[etapeCourante])`, masqué si pas de suivant (cloture/perdu). Libellé
   « Avancer → <prochaine> ».
3. **2 lanes visuelles** : les colonnes regroupées sous deux en-têtes de section —
   **Commercial** (prospect→converti) et **Exécution** (visite→cloture) — séparées par
   un trait ; **Perdu** en colonne à part (grisée). Purement présentation (groupement
   de `COLS`).
4. **Mini-stepper par carte** : petite rangée de pastilles (●=faite jusqu'à l'étape,
   ○=à venir) selon l'index de `etape` dans `ETAPES` (hors perdu). Perdu → pastille
   rouge unique.

## 6. Non concerné / conservé

- `renderVuePipeline` (autre vue, ~ligne 4686) : non modifiée si non utilisée par
  l'onglet Pipeline (vérifier ; l'onglet rend `renderVuePipelineUnifie`).
- Finances / `chargerFinances` / `move` `converti` (montant_facture_crm) : logique
  inchangée ; `etape` s'ajoute sans casser `parcours.encaissement.done` (préservé).
- Le devis, ses lignes, l'impression : hors périmètre.

## 7. Tests / vérification

- **Build** vert.
- **Backfill** : après script, chaque devis affiché conserve sa colonne actuelle
  (comparer un échantillon avant/après).
- **Déplacement** : bouger BIA Bohicon de `devis`→`converti`→`visite` et revenir à
  `devis` → la carte suit à chaque fois (plus de no-op). `parcours.encaissement.done`
  cohérent avec Finances.
- **Avancer →** : sur une carte `devis`, un clic → `converti`.
- **Auto** : marquer une visite via le Dossier → carte passe en `visite` (etape mis à
  jour par saveParcours). Générer un certificat → carte ≥ `certificat`.
- **Stepper & lanes** : lisibles, la position du stepper correspond à la colonne.
- **Rétrocompat** : un devis ancien sans `etape` tombe sur `defautDepuisStatut`.

## Risques

- Les points d'insertion certificat/fiche doivent être trouvés et câblés (sinon
  régression d'avancement auto). À confirmer pendant l'implémentation.
- Cohérence `etape` ↔ `parcours.encaissement.done` pour Finances : le déplacement
  manuel doit poser/retirer ce flag correctement (§4).
- Deux consommateurs de `parcours` (Finances, sync_encaissements) ne lisent QUE
  `encaissement.done` → seul ce flag est critique à garder juste.
