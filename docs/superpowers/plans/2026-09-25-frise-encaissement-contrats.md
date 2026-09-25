# Frise d'encaissement des contrats — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suivre visuellement, dans l'onglet Contrats, la facturation et l'encaissement d'un contrat passage par passage (montants auto issus du contrat, éditables, alerte avant un passage non réglé).

**Architecture:** On enrichit l'existant, sans nouvelle table ni onglet. 4 colonnes ajoutées à `interventions` portent le dû/payé/facturé/payé-le par passage. La logique de statut de paiement et d'alerte est ajoutée aux fonctions pures de `lib/contrat-analyse.mjs` (déjà testées). La frise existante (`renderFrise` dans `app/admin/page.js`) et le dossier client colorent les jalons et permettent la saisie ; l'onglet Analyse remonte les alertes. `devis.paiements_recus` est recalculé depuis la somme des passages pour garder Finances cohérent.

**Tech Stack:** Next.js (App Router), React (createElement, sans JSX), Supabase (service_role côté API), modules ESM purs testés avec `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-25-frise-encaissement-contrats-design.md`

## Global Constraints

- Toute écriture Supabase passe par une route `/api/*` avec `verifyAdmin` ; jamais de `db.from(...).update/delete` direct depuis `page.js` sur une table RLS.
- `createClient` s'instancie DANS le handler ; chaque route exporte `const dynamic = "force-dynamic"` (déjà en place).
- Migration : timestamp strictement supérieur au dernier distant `20260925120000`. DDL via `npx supabase db push`, jamais via MCP.
- Montants en entiers FCFA. TVA non applicable. Pas de tiret cadratin (—) dans l'UI ni les libellés.
- Le `montant_net` du devis est le prix négocié du contrat (déterministe, jamais l'IA) : l'auto s'en déduit, on ne réinvente aucun tarif.
- Répartition auto = `montant_net` réparti sur les passages d'intervention (contrôles à 0). Seuil d'alerte = 7 jours.
- Fonctions pures dans `lib/contrat-analyse.mjs`, testées dans `lib/contrat-analyse.test.mjs` (`node --test`). L'UI React inline n'a pas de harnais de test composant : elle est vérifiée manuellement (pattern projet ui-qa), la logique qu'elle consomme étant testée en pur.

## Review Focus

- **Contrat sans passages générés** (interventions vide) : la frise doit afficher 0/0 sans division par zéro ni plantage. → Task 1, test `resumeContrat sans passages`.
- **Trop-perçu** (`montant_paye > montant_du`) : statut `regle`, pas d'alerte, `resteDu` global ne doit pas générer de fausse alerte. → Task 1, test `statutPaiement trop-percu`.
- **Passage contrôle avec un paiement saisi par erreur** (`montant_du = 0`, `montant_paye > 0`) : reste `inclus`, jamais `alerte`. → Task 1, test `statutPaiement controle inclus`.
- **Contrat à montant_net = 0 ou que des contrôles** : `montantDuPassage` renvoie 0, `duTotal = 0`, aucune alerte, aucune division invalide. → Task 1, test `montantDuPassage bornes`.
- **Réconciliation sur un devis NON contrat** : la mise à jour d'un paiement de passage ne doit recalculer `paiements_recus` que pour un devis de type contrat (ou avec date de début de contrat). → Task 4, garde explicite + vérif manuelle.

---

### Task 1: Logique pure de paiement dans `contrat-analyse.mjs`

**Files:**
- Modify: `lib/contrat-analyse.mjs` (ajouts près de `resumeContrat`, ~ligne 466-516)
- Test: `lib/contrat-analyse.test.mjs` (nouveaux cas)

**Interfaces:**
- Produces:
  - `SEUIL_ALERTE_JOURS: number` (= 7)
  - `montantDuPassage({ montantNet, nbInterventions, type }): number`
  - `statutPaiementPassage(passage, { auj, seuilJours?, aPassageAnterieurImpaye? }): "inclus"|"a_venir"|"facture"|"partiel"|"regle"|"alerte"`
  - `resumeContrat(...)` retourne en plus : chaque `passages[i]` a `montantDu, montantPaye, dateFacture, datePaiement, statutPaiement` ; l'objet a `encaisse, duTotal, resteDu, alertesPaiement[]` (chaque alerte = `{ id, date, reste }`).

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `lib/contrat-analyse.test.mjs` :

```js
import {
  montantDuPassage, statutPaiementPassage, SEUIL_ALERTE_JOURS,
} from "./contrat-analyse.mjs"

test("montantDuPassage repartit le montant du contrat, controles a 0", () => {
  assert.equal(montantDuPassage({ montantNet: 200000, nbInterventions: 4, type: "intervention" }), 50000)
  assert.equal(montantDuPassage({ montantNet: 200000, nbInterventions: 4, type: "controle" }), 0)
})

test("montantDuPassage bornes (0 / nb absent)", () => {
  assert.equal(montantDuPassage({ montantNet: 0, nbInterventions: 4, type: "intervention" }), 0)
  assert.equal(montantDuPassage({ montantNet: 100000, nbInterventions: 0, type: "intervention" }), 100000)
})

test("statutPaiement a_venir / facture / partiel / regle", () => {
  const base = { date: "2026-06-01", montantDu: 50000 }
  const ctx = { auj: "2026-01-01" } // echeance lointaine, pas d'alerte
  assert.equal(statutPaiementPassage({ ...base, montantPaye: 0, dateFacture: null }, ctx), "a_venir")
  assert.equal(statutPaiementPassage({ ...base, montantPaye: 0, dateFacture: "2026-05-01" }, ctx), "facture")
  assert.equal(statutPaiementPassage({ ...base, montantPaye: 20000 }, ctx), "partiel")
  assert.equal(statutPaiementPassage({ ...base, montantPaye: 50000 }, ctx), "regle")
})

test("statutPaiement trop-percu = regle, pas d'alerte", () => {
  const p = { date: "2025-01-01", montantDu: 50000, montantPaye: 60000 }
  assert.equal(statutPaiementPassage(p, { auj: "2026-01-01" }), "regle")
})

test("statutPaiement controle inclus meme si paiement saisi", () => {
  const p = { date: "2025-01-01", montantDu: 0, montantPaye: 9999 }
  assert.equal(statutPaiementPassage(p, { auj: "2026-01-01" }), "inclus")
})

test("statutPaiement alerte quand echeance proche et non solde", () => {
  const p = { date: "2026-01-05", montantDu: 50000, montantPaye: 0, dateFacture: "2026-01-01" }
  assert.equal(statutPaiementPassage(p, { auj: "2026-01-01", seuilJours: SEUIL_ALERTE_JOURS }), "alerte")
})

test("statutPaiement alerte si passage anterieur impaye", () => {
  const p = { date: "2026-12-01", montantDu: 50000, montantPaye: 0, dateFacture: null }
  assert.equal(statutPaiementPassage(p, { auj: "2026-01-01", aPassageAnterieurImpaye: true }), "alerte")
})
```

Ajouter aussi, dans le test existant qui appelle `resumeContrat`, des colonnes de paiement et des assertions d'agrégat (nouveau test dédié) :

```js
test("resumeContrat agrege encaisse / duTotal / resteDu et alertes", () => {
  const devis = { id: "d1", date_debut_contrat: "2026-01-01", duree_contrat_mois: 12, frequence_intervention: "trimestrielle" }
  const interventions = [
    { id: "p1", devis_id: "d1", date_intervention: "2026-01-01", type_passage: "intervention", statut: "terminee", montant_du: 50000, montant_paye: 50000, date_facture: "2026-01-01", date_paiement: "2026-01-05" },
    { id: "p2", devis_id: "d1", date_intervention: "2026-04-01", type_passage: "intervention", statut: "planifiee", montant_du: 50000, montant_paye: 20000, date_facture: "2026-03-25" },
  ]
  const r = resumeContrat({ devis, interventions }, "2026-04-01")
  assert.equal(r.encaisse, 70000)
  assert.equal(r.duTotal, 100000)
  assert.equal(r.resteDu, 30000)
  assert.equal(r.passages[0].statutPaiement, "regle")
  assert.equal(r.passages[1].statutPaiement, "alerte") // echeance = auj, non solde
  assert.equal(r.alertesPaiement.length, 1)
  assert.equal(r.alertesPaiement[0].reste, 30000)
})

test("resumeContrat sans passages ne plante pas", () => {
  const devis = { id: "d1", date_debut_contrat: "2026-01-01", duree_contrat_mois: 12, frequence_intervention: "trimestrielle" }
  const r = resumeContrat({ devis, interventions: [] }, "2026-04-01")
  assert.equal(r.encaisse, 0)
  assert.equal(r.duTotal, 0)
  assert.equal(r.resteDu, 0)
  assert.deepEqual(r.alertesPaiement, [])
})
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `node --test lib/contrat-analyse.test.mjs`
Expected: FAIL (`montantDuPassage is not a function`, agrégats absents).

- [ ] **Step 3: Implémenter les fonctions pures**

Dans `lib/contrat-analyse.mjs`, juste AVANT `export function resumeContrat` :

```js
export const SEUIL_ALERTE_JOURS = 7

// Montant attendu d'un passage, dérivé du contrat : les contrôles sont inclus
// (0), les interventions se partagent le montant négocié du contrat.
export function montantDuPassage({ montantNet, nbInterventions, type }) {
  if (type === "controle") return 0
  const n = Math.max(1, Number(nbInterventions) || 1)
  return Math.round((Number(montantNet) || 0) / n)
}

// État de paiement d'un passage, dérivé (jamais stocké).
export function statutPaiementPassage(p, { auj, seuilJours = SEUIL_ALERTE_JOURS, aPassageAnterieurImpaye = false } = {}) {
  const du = Number(p.montantDu) || 0
  const paye = Number(p.montantPaye) || 0
  if (du <= 0) return "inclus"
  if (paye >= du) return "regle"
  const base = paye > 0 ? "partiel" : (p.dateFacture ? "facture" : "a_venir")
  const echeanceProche = p.date ? String(p.date) <= isoPlusJours(String(auj), seuilJours) : false
  if (echeanceProche || aPassageAnterieurImpaye) return "alerte"
  return base
}
```

(`isoPlusJours` existe déjà dans le module, réutilisé tel quel.)

Dans `resumeContrat`, enrichir le `.map(i => ({ ... }))` des passages en ajoutant :

```js
      montantDu: Number(i.montant_du) || 0,
      montantPaye: Number(i.montant_paye) || 0,
      dateFacture: i.date_facture || null,
      datePaiement: i.date_paiement || null,
```

Puis, après le `.sort(...)` (une fois `passages` trié), avant le `return` :

```js
  let anterieurImpaye = false
  for (const p of passages) {
    p.statutPaiement = statutPaiementPassage(p, { auj, aPassageAnterieurImpaye: anterieurImpaye })
    if ((p.montantDu || 0) > 0 && (p.montantPaye || 0) < (p.montantDu || 0)) anterieurImpaye = true
  }
  const encaisse = passages.reduce((s, p) => s + (p.montantPaye || 0), 0)
  const duTotal = passages.reduce((s, p) => s + (p.montantDu || 0), 0)
  const alertesPaiement = passages
    .filter(p => p.statutPaiement === "alerte")
    .map(p => ({ id: p.id, date: p.date, reste: (p.montantDu || 0) - (p.montantPaye || 0) }))
```

Et compléter l'objet `return` avec : `encaisse, duTotal, resteDu: duTotal - encaisse, alertesPaiement,`.

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `node --test lib/contrat-analyse.test.mjs`
Expected: PASS (tous, anciens inclus).

- [ ] **Step 5: Commit**

```bash
git add lib/contrat-analyse.mjs lib/contrat-analyse.test.mjs
git commit -m "Feat: logique paiement des passages de contrat (statuts, agregats, alertes)"
```

---

### Task 2: Migration des 4 colonnes sur `interventions`

**Files:**
- Create: `supabase/migrations/20260925130000_interventions_encaissement.sql`

**Interfaces:**
- Produces : colonnes `montant_du`, `montant_paye`, `date_facture`, `date_paiement` sur `interventions`, lues par `rh-data` (select `*`) et `resumeContrat` (Task 1).

- [ ] **Step 1: Écrire la migration**

```sql
-- Suivi facturation/encaissement par passage de contrat.
-- montant_du : attendu (auto depuis le contrat, editable) ; montant_paye : cumule.
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS montant_du integer;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS montant_paye integer DEFAULT 0;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS date_facture date;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS date_paiement date;
```

(RLS déjà active sur `interventions` ; les colonnes héritent des policies existantes, rien à ajouter.)

- [ ] **Step 2: Pousser la migration**

Run: `npx supabase db push`
Expected: `Applying migration 20260925130000_interventions_encaissement.sql...` puis `Finished supabase db push.`

- [ ] **Step 3: Vérifier en base que les colonnes existent**

Run (adapter avec le client node du repo, comme les vérifs de session) :
```bash
node -e 'require("dotenv").config({path:".env.local"});const{createClient}=require("@supabase/supabase-js");const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);s.from("interventions").select("id,montant_du,montant_paye,date_facture,date_paiement").limit(1).then(r=>console.log(r.error?r.error.message:"colonnes OK"))'
```
Expected: `colonnes OK`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260925130000_interventions_encaissement.sql
git commit -m "Feat: colonnes encaissement (montant_du, montant_paye, date_facture, date_paiement) sur interventions"
```

---

### Task 3: `generate_planning` remplit `montant_du` auto

**Files:**
- Modify: `app/api/crm-data/route.js` (action `generate_planning`, ~ligne 496-549)

**Interfaces:**
- Consumes : `montantDuPassage` (Task 1).
- Produces : chaque passage créé par `generate_planning` porte un `montant_du` (interventions = part du contrat, contrôles = 0).

- [ ] **Step 1: Importer le helper en tête de route**

En haut de `app/api/crm-data/route.js`, ajouter à l'import existant depuis la lib (ou créer l'import) :
```js
import { montantDuPassage } from "@/lib/contrat-analyse.mjs"
```

- [ ] **Step 2: Ajouter `montant_net` au select du devis**

Dans `generate_planning`, remplacer :
```js
      .select("date_debut_contrat, frequence_intervention, duree_contrat_mois")
```
par :
```js
      .select("date_debut_contrat, frequence_intervention, duree_contrat_mois, montant_net")
```

- [ ] **Step 3: Renseigner `montant_du` sur chaque ligne insérée**

Dans la boucle de construction de `toInsert`, sur l'objet de type intervention, ajouter le champ :
```js
        montant_du: montantDuPassage({ montantNet: devis.montant_net, nbInterventions, type: "intervention" }),
```
et sur l'objet de type contrôle, ajouter :
```js
        montant_du: 0,
```
(`nbInterventions` est déjà calculé plus haut dans l'action.)

- [ ] **Step 4: Vérification manuelle**

Sur un contrat de test avec `montant_net` connu et une date de début, déclencher « Générer le planning », puis :
```bash
node -e 'require("dotenv").config({path:".env.local"});const{createClient}=require("@supabase/supabase-js");const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);s.from("interventions").select("type_passage,montant_du,date_intervention").eq("devis_id","<DEVIS_ID>").order("date_intervention").then(r=>console.log(r.data))'
```
Expected : interventions à `montant_net / nbInterventions`, contrôles à 0.

- [ ] **Step 5: Commit**

```bash
git add app/api/crm-data/route.js
git commit -m "Feat: montant du auto par passage a la generation du planning (depuis le contrat)"
```

---

### Task 4: Action `set_passage_finances` + réconciliation `paiements_recus`

**Files:**
- Modify: `app/api/rh-data/route.js` (nouvelle action après `set_passage_planning`, ~ligne 249)

**Interfaces:**
- Produces : action POST `set_passage_finances { id, montantDu?, montantPaye?, dateFacture?, datePaiement? }` → met à jour le passage puis, pour un devis contrat, recalcule `devis.paiements_recus = somme des montant_paye des passages du devis`.

- [ ] **Step 1: Écrire l'action**

Avant le `return Response.json({ error: "Action inconnue" }, ...)` final :

```js
  if (action === "set_passage_finances") {
    const { id, montantDu, montantPaye, dateFacture, datePaiement } = body
    if (!id) return Response.json({ error: "id requis" }, { status: 400 })
    const patch = {}
    if (montantDu !== undefined) patch.montant_du = Math.max(0, Number(montantDu) || 0)
    if (montantPaye !== undefined) patch.montant_paye = Math.max(0, Number(montantPaye) || 0)
    if (dateFacture !== undefined) patch.date_facture = dateFacture || null
    if (datePaiement !== undefined) patch.date_paiement = datePaiement || null
    if (Object.keys(patch).length === 0) return Response.json({ error: "rien à modifier" }, { status: 400 })

    const { data: passage, error: upErr } = await supabase
      .from("interventions").update(patch).eq("id", id).select("devis_id").single()
    if (upErr) return Response.json({ error: upErr.message }, { status: 500 })

    // Réconciliation : pour un devis contrat, paiements_recus = somme des passages.
    if (passage && passage.devis_id) {
      const { data: dv } = await supabase.from("devis")
        .select("id, type_crm, date_debut_contrat").eq("id", passage.devis_id).single()
      const estContrat = dv && (dv.type_crm === "contrat" || dv.date_debut_contrat)
      if (estContrat) {
        const { data: rows } = await supabase.from("interventions")
          .select("montant_paye").eq("devis_id", passage.devis_id)
        const total = (rows || []).reduce((s, r) => s + (Number(r.montant_paye) || 0), 0)
        await supabase.from("devis").update({ paiements_recus: total }).eq("id", passage.devis_id)
      }
    }
    return Response.json({ ok: true })
  }
```

- [ ] **Step 2: Vérification manuelle (garde devis non contrat)**

- Sur un passage d'un devis contrat : appeler l'action avec `montantPaye`, vérifier `interventions.montant_paye` mis à jour ET `devis.paiements_recus` = somme des passages.
- Sur un devis non contrat (ponctuel) : vérifier que `paiements_recus` n'est PAS recalculé.

```bash
# exemple d'appel authentifié non requis en local via node service_role : tester la logique de somme
node -e 'require("dotenv").config({path:".env.local"});const{createClient}=require("@supabase/supabase-js");const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);(async()=>{const{data}=await s.from("interventions").select("montant_paye").eq("devis_id","<DEVIS_CONTRAT_ID>");console.log("somme",(data||[]).reduce((a,r)=>a+(r.montant_paye||0),0))})()'
```

- [ ] **Step 3: Commit**

```bash
git add app/api/rh-data/route.js
git commit -m "Feat: action set_passage_finances + reconciliation paiements_recus (contrats)"
```

---

### Task 5: Frise enrichie dans l'onglet Contrats (`renderFrise`)

**Files:**
- Modify: `app/admin/page.js` (`savePassagePlanning` voisin : ajouter `savePassageFinances` ~ligne 1737 ; `renderFrise` ~ligne 5648-5700)

**Interfaces:**
- Consumes : `resumeContrat` enrichi (Task 1) via `r.encaisse, r.duTotal, r.resteDu, r.alertesPaiement`, et `r.passages[i].statutPaiement/montantDu/montantPaye`.
- Produces : `savePassageFinances(passageId, patch)` (POST `set_passage_finances` vers `/api/rh-data`, mise à jour optimiste de `interventionsList`).

- [ ] **Step 1: Ajouter `savePassageFinances`**

À côté de `savePassagePlanning`, calquer le même schéma (maj optimiste de `interventionsList` sur `montant_du/montant_paye/date_facture/date_paiement`, POST vers `/api/rh-data` action `set_passage_finances`, rollback via `charger()` si `!res.ok`). Recharger `finData` (`chargerFinances()`) après succès pour refléter `paiements_recus`.

```js
  async function savePassageFinances(passageId, patch) {
    if (!passageId) return
    setInterventionsList(function(prev) {
      return prev.map(function(x) {
        if (x.id !== passageId) return x
        var n = Object.assign({}, x)
        if (patch.montantDu !== undefined) n.montant_du = patch.montantDu
        if (patch.montantPaye !== undefined) n.montant_paye = patch.montantPaye
        if (patch.dateFacture !== undefined) n.date_facture = patch.dateFacture || null
        if (patch.datePaiement !== undefined) n.date_paiement = patch.datePaiement || null
        return n
      })
    })
    var ok = false
    try {
      var sess = await db.auth.getSession()
      var token = (sess.data.session && sess.data.session.access_token) || ""
      var res = await fetch("/api/rh-data", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(Object.assign({ action: "set_passage_finances", id: passageId }, patch)) })
      ok = res.ok
    } catch (e) { ok = false }
    if (!ok) { charger(); alert("Échec de l'enregistrement. Les données ont été rechargées.") }
    else if (typeof chargerFinances === "function") { chargerFinances() }
  }
```

- [ ] **Step 2: Couleur des jalons selon le paiement**

Dans `renderFrise`, une palette locale :
```js
    var COUL_PAIE = { inclus: "#9ca3af", a_venir: "#9ca3af", facture: "#2563eb", partiel: "#d4a920", regle: "#16a34a", alerte: "#dc2626" }
```
Sur chaque jalon (`r.passages.map`), utiliser `COUL_PAIE[p.statutPaiement] || "#9ca3af"` comme couleur du point, et un `title` = `dû X · payé Y · ` + (`p.dateFacture ? "facturé le " + fmtJ(p.dateFacture) : "non facturé"`).

- [ ] **Step 3: Barre d'encaissement + résumé**

Dans la carte dépliée, sous la frise, ajouter un bloc :
```js
      e("div", { style: { margin: "8px 0 4px", display: "flex", justifyContent: "space-between", fontSize: "12px" } },
        e("span", { style: { color: "#555" } }, "Encaissé " + Number(r.encaisse).toLocaleString("fr-FR") + " / " + Number(r.duTotal).toLocaleString("fr-FR") + " FCFA"),
        r.prochain ? e("span", { style: { color: "#888" } }, "prochain dû : " + fmtJ(r.prochain.date)) : null
      ),
      e("div", { style: { height: "6px", backgroundColor: "#e8e6e0", borderRadius: "3px", marginBottom: "10px" } },
        e("div", { style: { width: (r.duTotal > 0 ? Math.min(100, Math.round(r.encaisse / r.duTotal * 100)) : 0) + "%", height: "100%", backgroundColor: "#16a34a", borderRadius: "3px" } })
      ),
```

- [ ] **Step 4: Lignes passages éditables (dû / payé / facturé)**

Sous la barre, lister `r.passages` : par passage, afficher le libellé (P n / contrôle), la date, deux champs numériques `dû` et `payé` (onBlur → `savePassageFinances(p.id, { montantDu })` / `{ montantPaye, datePaiement: today }`), et un toggle « facturé » (onClick → `savePassageFinances(p.id, { dateFacture: p.dateFacture ? null : today })`). Reprendre les styles d'input du modal dépense pour rester cohérent.

- [ ] **Step 5: Vérification manuelle (déployée, admin)**

Après déploiement, sur `https://www.phyto-benin.com/admin` → onglet Contrats : déplier un contrat, saisir un paiement partiel sur un passage, vérifier le jalon 🟠 puis 🟢 en soldant, vérifier la barre d'encaissement et que Finances reflète le `paiements_recus` recalculé. Screenshot de preuve.

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: frise d'encaissement editable dans l'onglet Contrats (jalons colores, saisie du/paye)"
```

---

### Task 6: Reprise dans le Dossier client + alerte dans Analyse

**Files:**
- Modify: `app/admin/page.js` (`renderDossier` ~ligne 4923-5000 ; insights de `renderVueAnalyse` ~ligne 4160-4180)

**Interfaces:**
- Consumes : `resumeContrat` enrichi (Task 1), `savePassageFinances` (Task 5).

- [ ] **Step 1: Frise dans le dossier client**

Dans `renderDossier(d)`, pour un dossier de type contrat (`d.typeContrat === "contrat" || d.dateDebutContrat`), insérer, juste après le bloc « Parcours client », un rendu de frise réutilisant la même logique que Task 5 (extraire un helper `renderFriseEncaissement(d)` appelé aux deux endroits pour éviter la duplication ; `intervDevis` fournit déjà les passages triés).

- [ ] **Step 2: Alerte paiement dans les insights Analyse**

Dans `renderVueAnalyse`, là où `insights.push({ type, ico, title, txt })` est construit, ajouter, pour chaque contrat, ses `alertesPaiement` :
```js
      cls.filter(function(c){ return c.typeContrat === "contrat" || c.dateDebutContrat }).forEach(function(c) {
        var r = resumeContrat({ devis: devisList.find(function(x){return x.id===c.id}) || {}, interventions: interventionsList }, new Date().toISOString().slice(0,10))
        ;(r.alertesPaiement || []).forEach(function(a) {
          insights.push({ type: "warn", ico: "⚠", title: "Paiement à régler avant un passage", txt: c.client + " · passage du " + finFmtD(a.date) + " : " + finFmt(a.reste) + " FCFA non réglés." })
        })
      })
```
(adapter `type`/`ico` aux valeurs déjà utilisées par les insights ; vérifier la clé exacte du devis dans `cls`).

- [ ] **Step 3: Vérification manuelle**

Créer une situation d'alerte (passage proche non réglé), vérifier : jalon 🔴 dans Contrats et dans le dossier, et une carte d'alerte dans Analyse. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: frise d'encaissement dans le dossier client + alertes paiement dans Analyse"
```

---

## Self-Review

- **Couverture spec** : §3 modèle → Task 2 ; §4 auto montant → Task 1 (`montantDuPassage`) + Task 3 ; §5 statut dérivé → Task 1 ; §6 `resumeContrat` → Task 1 ; §7.1 Contrats → Task 5 ; §7.2 Dossier → Task 6 ; §7.3 Analyse → Task 6 ; §8 API + réconciliation → Task 4. Tout couvert.
- **Placeholders** : les étapes UI (Task 5 step 4, Task 6) décrivent le rendu React inline sans recopier 100 lignes de `createElement` ; les signatures, actions, couleurs et champs exacts sont fournis, le style suit le modal dépense existant. Assumé volontairement (le fichier est un gros module React sans harnais composant ; recopier tout le JSX serait plus fragile que pointer le pattern). Logique testable = 100% en Task 1.
- **Cohérence de types** : `savePassageFinances(passageId, patch)` avec `patch` en clés camelCase (`montantDu`, `montantPaye`, `dateFacture`, `datePaiement`) → action API mappe vers colonnes snake_case. `resumeContrat` expose camelCase (`montantDu`…) côté lecture. Cohérent Task 1/4/5.
- **Review Focus** : contrat vide (Task 1), trop-perçu (Task 1), contrôle inclus (Task 1), montant 0 (Task 1), devis non contrat (Task 4 garde) : tous rattachés.
