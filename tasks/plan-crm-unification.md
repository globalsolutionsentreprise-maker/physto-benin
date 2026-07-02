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
| G5 | **Pipeline : déplacer une carte entre étapes** | `moveCard` L974 → action `move` | `move` |

⚠️ **G5 à vérifier en priorité** : aucun appel à l'action `move` n'existe dans la partie
React (`grep move app/admin/page.js` = vide). Donc soit `renderVuePipeline` est en
lecture seule, soit il change d'étape autrement. À confirmer avant d'estimer G5.

---

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

## 9. Décisions actées (2026-07-02)

1. **Graphiques → `recharts`** (réécriture des graphes, pas de réutilisation Chart.js).
2. **Livraison → incrémentale, 5 étapes** (G4 → G2 → G3 → G1 → G5), chacune déployée + QA
   avant la suivante.
3. **crm.html → suppression franche** en Phase 3 une fois la parité prouvée (le code reste
   récupérable dans l'historique git).
