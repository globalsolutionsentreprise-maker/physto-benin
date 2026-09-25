# Frise d'encaissement des contrats

Date : 2026-09-25
Auteur : Kabir YAKOUBOU (avec Claude)
Statut : proposé (en attente de validation)

## 1. Intention et contexte

Kabir veut suivre **visuellement** l'état de facturation et d'encaissement des
contrats récurrents, passage par passage. Cas déclencheur : La Manne Dorée (2e
site) dont le démarrage est réglé en deux versements. Besoins exprimés :

- suivre si la **facturation** a été faite, par contrat ;
- suivre les **encaissements en fonction des passages** ;
- **renseigner les montants à la main** en cas d'entente, sinon les avoir
  **automatiquement** ;
- que tout soit **relié** (pas de saisie en double, cohérence Finances) ;
- être **alerté si un paiement n'a pas été fait avant un passage** ;
- le tout **sans surcharger l'existant**.

Emplacement validé avec l'utilisateur : **onglet Contrats** (la frise y existe
déjà), avec reprise dans le Dossier client et une alerte dans l'onglet Analyse.

Succès = depuis l'onglet Contrats, d'un coup d'œil : combien encaissé sur
combien dû, quels passages sont réglés / partiels / en retard, et une alerte
avant tout passage non couvert.

## 2. État existant sur lequel on s'appuie (rien à réinventer)

- **Passages persistés** : table `interventions` (une ligne par passage), créées
  par l'action `generate_planning` (crm-data), avec `date_intervention`,
  `statut` (planifiee/terminee/annulee), `type_passage` (intervention/controle),
  `personnel_ids`, `montant_prestataire`.
- **Frise existante** : `renderVueContrats()` (app/admin/page.js) rend déjà une
  frise par contrat via `renderFrise(d)`, barre de durée + jalons de passage.
- **Moteur testé** : `lib/contrat-analyse.mjs` → `resumeContrat({devis,
  interventions}, auj)` renvoie `{ debut, fin, statut, passages[], faits, total,
  prochain, enRetard, ... }`. Couvert par `lib/contrat-analyse.test.mjs`.
- **Édition passage** : `savePassagePlanning(passageId, patch)` (page.js) met
  déjà à jour un passage (date, personnel) de façon optimiste via une action API.
- **Cohérence Finances** : `devis.paiements_recus` (cumulé) alimente les vues
  Finances/Analyse ; `finMontantParInter(c)` fait déjà une répartition égale
  `montant_net / nb passages`.

Le travail est donc **enrichir** ces briques, pas en créer.

## 3. Modèle de données

Aucune nouvelle table. On ajoute **4 colonnes nullables** à `interventions`
(RLS déjà active sur la table, héritée) :

| colonne | type | rôle |
|---|---|---|
| `montant_du` | integer | montant attendu du passage (auto à la génération, éditable) |
| `montant_paye` | integer DEFAULT 0 | cumulé encaissé sur ce passage |
| `date_facture` | date | date de facturation (null = non facturé) |
| `date_paiement` | date | date du dernier règlement |

Migration : `supabase/migrations/20260925130000_interventions_encaissement.sql`
(timestamp strictement supérieur au dernier distant `20260925120000`), poussée
via `npx supabase db push`.

Les états de paiement ne sont **pas stockés**, ils sont **dérivés** (section 5).

## 4. Montants automatiques (défaut) et manuels (entente)

À la génération du planning (`generate_planning`), chaque passage reçoit un
`montant_du` :

- `type_passage = "controle"` → `montant_du = 0` (inclus, simple jalon).
- `type_passage = "intervention"` → répartition **égale** :
  `round(montant_net / nbInterventions)` (nbInterventions = passages de type
  intervention). Reprend la logique de `finMontantParInter`.

Le `montant_net` du devis EST le prix négocié du contrat (calculé de façon
déterministe dans `contrat-analyse.mjs`, jamais par l'IA). L'auto est donc bien
**en fonction du contrat** : on répartit ce montant négocié sur les passages
payants, on ne réinvente aucun tarif.

L'utilisateur peut **écraser `montant_du` de n'importe quel passage** (entente,
ex. démarrage plein réglé en deux fois + entretiens ajustés). La valeur saisie
n'est jamais recalculée automatiquement.

> Décision validée avec l'utilisateur : auto = répartition du `montant_net` du
> contrat sur ses passages d'intervention (contrôles à 0), modifiable à la main.
> Pas de barème « plein / entretien » séparé pour l'instant (le démarrage se
> règle par saisie manuelle). Seuil d'alerte validé à 7 jours.

## 5. Statut de paiement dérivé (par passage)

Fonction pure (dans `contrat-analyse.mjs`), à partir de `montant_du`,
`montant_paye`, `date_facture` :

- `montant_du <= 0` → `inclus` (contrôle ou passage offert).
- `date_facture` nulle et `montant_paye = 0` → `a_venir` (⚪).
- `date_facture` non nulle et `montant_paye = 0` → `facture` (🔵).
- `0 < montant_paye < montant_du` → `partiel` (🟠).
- `montant_paye >= montant_du` → `regle` (🟢).
- surcharge **alerte** (🔴) si le passage est **dû** (date ≤ auj + `SEUIL_ALERTE_JOURS`)
  et `montant_paye < montant_du`, ou si un passage antérieur non réglé le précède.

`SEUIL_ALERTE_JOURS` = constante (défaut **7**), à confirmer à la revue.

## 6. Extension de `resumeContrat` (moteur, testé)

`passages[]` gagne : `montantDu`, `montantPaye`, `dateFacture`, `datePaiement`,
`statutPaiement` (section 5).

Le retour gagne les agrégats contrat :

- `encaisse` = somme des `montantPaye` des passages ;
- `duTotal` = somme des `montantDu` ;
- `resteDu` = `duTotal - encaisse` ;
- `alertesPaiement[]` = passages en état `alerte` (date, reste dû).

Tout est pur et testable → nouveaux cas dans `contrat-analyse.test.mjs`
(dérivation des statuts, agrégats, alertes, seuil, contrôle exclu du dû).

## 7. Interface

### 7.1 Onglet Contrats (`renderFrise`)

- **En-tête carte** (replié) : ajouter « encaissé X / Y » et, si `alertesPaiement`,
  « ⚠ N paiement(s) à régler ».
- **Barre encaissement** (déplié) : jauge `encaisse / duTotal (%)` + « prochain dû :
  passage du <date> ».
- **Jalons** : couleur du point selon `statutPaiement` (⚪🔵🟠🟢🔴). Tooltip =
  dû / payé / facturé le.
- **Lignes passages** (déplié) : par passage, `dû` (éditable), `payé` (éditable,
  cumulatif), bouton/date « facturé », date de paiement. Édition optimiste via
  une extension de `savePassagePlanning`.

### 7.2 Dossier client (`renderDossier`)

Même composant de frise, inséré juste après « Parcours client » (les passages
`intervDevis` y sont déjà assemblés). Lecture + édition identiques.

### 7.3 Onglet Analyse (insights)

Ajouter, dans le bandeau d'insights existant, une carte par alerte :
« Passage <n> <client> le <date> : <reste> FCFA non réglés ».

## 8. API et cohérence

Une action `update_passage_finances` (ou extension de l'action passage
existante) acceptant un patch partiel `{ montantDu?, montantPaye?, dateFacture?,
datePaiement? }` sur un `passageId`.

**Règle de cohérence (reliure) :** après toute mise à jour de `montant_paye`
d'un passage d'un devis de **type contrat**, recalculer côté serveur
`devis.paiements_recus = somme des montant_paye des passages de ce devis`. Ainsi
Finances et Analyse restent justes, sans double comptage.

Garde-fou : pour un devis contrat à passages générés, le basculement de l'étape
« Encaissement » du parcours ne doit **pas** écraser `paiements_recus` (la source
de vérité devient la somme des passages). À traiter dans l'action `saveParcours`
/ `set_parcours`.

## 9. Périmètre exclu (YAGNI)

- Pas d'historique détaillé multi-versements par passage (le cumul `montant_paye`
  suffit ; un ledger `encaissements` pourra venir plus tard si besoin).
- Pas de barème « plein / entretien » automatique (répartition égale + saisie
  manuelle couvrent l'entente).
- Pas de génération de facture PDF ici (on suit la facturation, on ne l'émet pas).
- Pas de nouvel onglet.

## 10. Tests

- `contrat-analyse.test.mjs` : dérivation `statutPaiement`, agrégats
  `encaisse/duTotal/resteDu`, `alertesPaiement` (seuil, passage antérieur non
  réglé, contrôle exclu). Fonctions pures, `node --test`.
- Vérif manuelle post-déploiement : générer un planning, saisir un paiement
  partiel, voir le jalon passer 🟠 puis 🟢, vérifier `paiements_recus` recalculé
  dans Finances, vérifier l'alerte avant un passage.

## 11. Impact / fichiers touchés

- `supabase/migrations/20260925130000_interventions_encaissement.sql` (nouveau)
- `lib/contrat-analyse.mjs` (extension `resumeContrat` + fonctions pures paiement)
- `lib/contrat-analyse.test.mjs` (nouveaux cas)
- `app/api/crm-data/route.js` (`generate_planning` auto montant_du ; action de
  mise à jour finances passage ; reliure `paiements_recus`)
- `app/admin/page.js` (`renderFrise`, `renderDossier`, insights Analyse,
  `savePassagePlanning` étendu)

Aucune nouvelle table, aucun nouvel onglet, aucune dépendance ajoutée.
