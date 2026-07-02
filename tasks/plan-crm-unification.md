# Plan — Unification du CRM (piste 1 : tout en React, suppression de crm.html)

Statut : **proposé, à valider avant tout code**
Date : 2026-07-02
Risque global : **élevé** (outil de gestion en prod, vraies données clients + paiements FedaPay)

---

## 1. Objectif

Supprimer le double système CRM. Aujourd'hui il y a **deux** interfaces CRM qui tapent sur
la même base :

- **Système A** — `public/crm.html` (~1624 l., HTML/JS vanilla + Chart.js), chargé en iframe
  via `/api/crm-frame`, ouvert depuis le menu **« CRM Pipeline »**.
- **Système B** — `SectionClientsDevis` (~2700 l., React) dans `app/admin/page.js`, ouvert
  quand on clique **« Dossier »** sur une carte (handoff `postMessage` → `open_dossier`).

But : garder **un seul** CRM, en React, cohérent avec le reste de l'admin. Supprimer
`crm.html`, `/api/crm-frame`, et le pont `postMessage`.

Contrainte : **zéro changement de fond** — mêmes données, mêmes calculs, même API
`/api/crm-data`. On déplace des fonctionnalités, on n'en réécrit pas la logique métier.

---

## 2. Bonne nouvelle : le backend est déjà unifié

`/api/crm-data/route.js` gère déjà **toutes** les actions dont les deux systèmes ont besoin :
`add_client, save_client, del_client, move, add_depense, del_depense, add_dep_client,
del_dep_client, generate_planning, save_devis_fields, get_clients, get_leads`.

→ **Aucun changement backend requis.** Le chantier est frontend uniquement.

---

## 3. Écart fonctionnel à combler (ce que React n'a pas encore)

Ce que `SectionClientsDevis` couvre déjà : vues **Clients, Devis-client, Devis, Pipeline,
Documents** (`renderVueClients/DevisClient/Devis/Pipeline/Documents`), génération de devis,
contrat IA, impression, paiements.

Ce qui n'existe **que** dans `crm.html` et doit être porté :

| # | Bloc | Source crm.html | Actions API (déjà OK) |
|---|------|-----------------|-----------------------|
| G1 | **Vue Analyse** (KPIs + graphiques Chart.js) | `renderAnalyse` L582-973 (~392 l.), `renderKPIs` L297 | lecture seule |
| G2 | **Vue Finances** + CRUD dépenses | `renderFinance` L421-549, `openAddDep/saveDep/delDep/addDepClient/delDepClient` | `add_depense, del_depense, add_dep_client, del_dep_client` |
| G3 | **Objectif CA** (modal) | `openObjectif/saveObjectif` L555-576 | stocké côté param (à confirmer) |
| G4 | **Export CSV** | `exportCSV` L1572 | lecture seule (génère le CSV client-side) |
| G5 | **Kanban COMMERCIAL** (statut) : colonnes + move + type mission | `renderKanban` L332-378, `moveCard` L974 → action `move` | `move` |

✅ **G5 clarifié en Phase 0** : le pipeline React existant est le workflow d'exécution
(`parcours`), un concept **différent** du kanban commercial de `crm.html` (`statut`). Décision
actée : garder les deux. G5 = **porter le kanban commercial entier** dans React (nouvelle vue
« Commercial » : 6 colonnes statut, dropdown « Déplacer vers » → action `move`, barre type
mission). C'est donc plus gros que prévu, à replacer en dernier de la Phase 1.

---

## 3bis. Résultats Phase 0 (2026-07-02) — à intégrer

Investigation faite avant de coder. Trois découvertes qui corrigent le plan initial :

- **🔴 Les deux pipelines sont deux concepts différents, pas des doublons.**
  - `crm.html` (`renderKanban`) = **entonnoir commercial** par `statut` (premier contact →
    devis envoyé → attente → relance → converti → perdu). Move via dropdown → action `move`
    qui écrit `clients.statut`. Barre « Type de mission » (contrats vs ponctuels).
  - React (`renderVuePipeline`) = **workflow d'exécution** par `parcours` (contact → visite
    → facture → intervention → certificat → encaissement → clôturé), colonne calculée par
    `getColonne(d)` depuis `parcours` + fiches/certs. Pas de `statut`, pas de `move`.
  - **Décision actée : garder les DEUX** dans React (voir §9.4). Donc G5 n'est plus « ajouter
    le move » mais **« porter le kanban commercial complet »** (statut + move + type mission).
- **🟠 Objectif CA stocké en `localStorage` (`gse_objectif`), pas en base.** Propre au
  navigateur. Migration : le mettre dans la table `parametres` (partagé, propre). Petit +.
- **🟡 Modèles de données différents.** `crm.html` = modèle « client » aplati
  (`c.client, c.montantDevis, c.statut, c.montantFacture, c.depenses`…). React = tables
  normalisées (`devis` joint `clients`, `depenses_devis`, `depenses_globales`,
  `interventions`). → Tout port (dont l'export CSV G4) doit **remapper** les champs, jamais
  copier-coller.

## 4. Dépendances techniques

- **Graphiques : décision actée → `recharts`** (au lieu de réutiliser Chart.js).
  - Ajouter `recharts` au `package.json`.
  - Les graphes de `renderAnalyse` (Chart.js) sont **réécrits** en composants recharts
    (`<BarChart>`, `<LineChart>`, `<PieChart>`…). Chaque graphe doit recevoir les mêmes
    données/agrégats que la version Chart.js.
  - ⚠️ Risque ajouté par ce choix : écart visuel/chiffré possible. Garde-fou → comparer
    chaque graphe recharts au screenshot de référence Chart.js (Phase 0) et vérifier que
    les valeurs affichées sont identiques.
  - Plus de dépendance CDN (bien pour un build reproductible).
- Aucune autre lib externe détectée dans `crm.html`.

---

## 5. Stratégie : migration incrémentale, `crm.html` reste en ligne jusqu'au bout

On ne supprime `crm.html` qu'**à la toute fin**, une fois la parité vérifiée. À chaque
phase, l'ancien système reste le filet de sécurité.

### Phase 0 — Préparation / vérif parité
- Confirmer G5 (comment React change l'étape d'une carte, s'il le fait).
- Lister les **params** utilisés par Objectif CA (clé en base ?) pour G3.
- Ajouter `chart.js` au `package.json`.
- Screenshots de référence de chaque onglet crm.html (Pipeline, Liste, Finances, Analyse)
  pour comparaison pixel après migration.

### Phase 1 — Porter les vues manquantes dans `SectionClientsDevis`
Une sous-vue à la fois, chacune livrée + QA avant la suivante :
1. **G4 Export CSV** (le plus simple, sans risque) — bouton dans le header React.
2. **G2 Finances + dépenses** — vue + modals add/del dépense, brancher sur les actions
   existantes.
3. **G3 Objectif CA** — modal + persistance.
4. **G1 Analyse** — port de `renderAnalyse` avec Chart.js via ref. Le plus gros morceau.
5. **G5 Pipeline move** (si absent en React) — ajouter le changement d'étape.

Ajouter ces sous-vues à la barre d'onglets interne de `SectionClientsDevis`
(`renderOnglets`, L3057) : Clients · Devis · **Pipeline** · **Finances** · **Analyse** ·
Documents.

### Phase 2 — Basculer le menu « CRM Pipeline » sur React
- Dans `app/admin/page.js`, remplacer le bloc `onglet === "crm"` (iframe, L1098-1105) par
  le rendu direct de `<SectionClientsDevis ... vueInitiale="pipeline" />`.
- Fusionner avec le bloc `onglet === "clients"` (L1090) qui rend déjà `SectionClientsDevis` :
  il ne doit plus y avoir qu'un seul point d'entrée.
- Supprimer le pont `postMessage`/`open_dossier` (listener L220-229 + `setOnglet("clients")`),
  devenu inutile puisque tout est dans le même composant React.

### Phase 3 — Suppression de l'ancien système
- Supprimer `public/crm.html`.
- Supprimer `app/api/crm-frame/route.js`.
- Chercher tout résidu (`grep -rn "crm-frame\|crm.html\|open_dossier"`).
- `graphify update .`

---

## 6. Points de risque / vigilance

- **Paiements FedaPay** : ne toucher à aucun flux de paiement/impression pendant la
  migration. Ce sont des vues déjà en React, hors périmètre — mais vérifier qu'on ne casse
  pas leur routage en fusionnant `crm` et `clients`.
- **Parité des calculs financiers** (Total devis, Total facturé, Dépenses, Résultat net,
  Objectif) : reprendre **exactement** les formules de `crm.html` (`renderKPIs`,
  `montantParIntervention`, `interventionDates`). Comparer les chiffres affichés avant/après
  sur les mêmes données.
- **Chart.js** : cleanup des instances (`destroyAnCharts` L577) → en React, détruire les
  charts au démontage (`useEffect` return) pour éviter les fuites.
- **Deux `GoTrueClient`** : l'avertissement console actuel vient probablement de la
  coexistence page.js + iframe. Devrait disparaître une fois l'iframe supprimée — à
  confirmer (bonus, pas un objectif).
- **Régression `lessons.md` 2026-06-04** : le bug « renommer un client ne propage pas »
  venait justement de la désynchro des deux systèmes. L'unification l'élimine par
  construction — le vérifier explicitement en QA.

---

## 7. Plan de QA (sur prod après déploiement, cf. lessons.md 2026-07-02)

Pour chaque phase, sur `https://www.phyto-benin.com/admin` (session déjà connectée) :
- Pipeline : afficher les 6 colonnes, déplacer une carte, vérifier persistance après reload.
- Finances : ajouter/supprimer une dépense, vérifier le recalcul du Résultat net.
- Analyse : les graphiques s'affichent, chiffres cohérents avec l'onglet Finances.
- Objectif CA : définir un objectif, vérifier l'affichage du % d'atteinte.
- Export CSV : le fichier se télécharge et contient les bonnes colonnes.
- Dossier client : ouvrir depuis le pipeline, créer/imprimer un devis (non-régression).
- Comparer chiffres KPI avant (crm.html archivé) / après (React).

---

## 8. Estimation grossière

- Phase 1 (les 5 sous-vues) : ~600-700 lignes React à écrire (port de ~560 l. vanilla).
  Le gros = Analyse (Chart.js). Découpable en 5 PR/livraisons indépendantes.
- Phases 2-3 : petites (routage + suppression), mais à faire **après** parité confirmée.

Ordre conseillé de livraison : G4 → G2 → G3 → G1 → G5 → bascule menu → suppression.

---

## 10. Journal d'avancement

- **2026-07-02 — Phase 0 ✅** : investigation faite (voir §3bis). 3 découvertes actées.
- **2026-07-02 — G4 Export CSV ✅ déployé + QA prod OK** (commit `893ad05`). Bouton
  « ⬇ Export CSV » dans la barre d'onglets du CRM React (`renderOnglets`). Récupère le
  tableau aplati via le GET par défaut de `/api/crm-data` (zéro duplication de calcul).
  Testé sur prod : message « Export CSV téléchargé », fichier généré, console propre.
  Accessible via CRM Pipeline → Dossier (la bascule menu = Phase 2).
- **2026-07-02 — G2 Finances + dépenses ✅ déployé + QA prod OK** (commit `a6d92ea`).
  Nouvel onglet « Finances » dans le CRM React (`renderVueFinances` + `renderDepModal`) :
  3 KPIs, tableau financier par client, dépenses générales (ajout modal + suppression),
  vue d'ensemble (barres) et projection contrats récurrents 12 mois. Données via le GET
  par défaut de `/api/crm-data` ; POST dépenses avec Bearer token (verifyAdmin l'exige).
  QA prod : KPIs identiques à crm.html (dépenses 533 500, résultat net +214 976), CRUD
  dépense testé (ajout → 533 501 puis suppression → 533 500), console propre.
  Écarts mineurs assumés : (1) la « vue d'ensemble » est rendue en barres CSS simples,
  pas en recharts — recharts est réservé à G1 (Analyse) où il y a de vrais graphes ;
  (2) le sous-détail « dont X prestataires » de la colonne Dépenses n'est pas repris
  (cosmétique). Note : le bouton suppression utilise `confirm()` (comme crm.html) — non
  cliquable en automation MCP (dialogue bloquant), testé en neutralisant confirm().
- **2026-07-02 — G3 Objectif CA ✅ déployé + QA prod OK** (commit `e1a8239`). Objectif CA
  annuel dans la vue Finances : carte de progression (facturé vs objectif) + modal
  d'édition. **Migré de localStorage vers la table `parametres`** (clé `objectif_ca`),
  chargé au montage, sauvegardé via `upsert onConflict cle` — partagé entre appareils.
  QA prod : défini 1 000 000 → progression 75% (facturé 748 476), puis remis à 0 pour
  laisser l'utilisateur fixer sa vraie cible ; console propre. Note : l'API renvoie
  toujours `objectifCA: 0` en dur (non utilisé par React qui lit `parametres` directement) ;
  à nettoyer côté API lors de la Phase 3 si besoin.
- **Suivant : G1** (Analyse — recharts, le gros morceau).

---

## 9. Décisions actées (2026-07-02)

1. **Graphiques → `recharts`** (réécriture des graphes, pas de réutilisation Chart.js).
2. **Livraison → incrémentale, 5 étapes** (G4 → G2 → G3 → G1 → G5), chacune déployée + QA
   avant la suivante.
3. **crm.html → suppression franche** en Phase 3 une fois la parité prouvée (le code reste
   récupérable dans l'historique git).
4. **Pipelines → garder les DEUX** (Phase 0). React aura une vue **Commercial** (statut,
   portée de crm.html) ET la vue **Exécution/parcours** (déjà en place). G5 = porter le
   kanban commercial.
5. **Objectif CA → migrer vers la table `parametres`** (au lieu de localStorage) pour qu'il
   soit partagé entre appareils. À confirmer.
