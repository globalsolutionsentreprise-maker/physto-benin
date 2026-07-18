# Analyse IA de contrat enrichie: plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fonder la recommandation IA de contrat sur le dossier réel (montant et structure du devis, rapport de visite, historique client) au lieu des champs inexistants lus aujourd'hui.

**Architecture:** La logique métier pure (extraction du socle devis, plancher d'infestation, arbitrage des contraintes) sort dans `lib/contrat-analyse.mjs`, testée avec le lanceur intégré de Node. La route `analyze-contract` garde le chargement Supabase et l'appel Gemini, et gagne un paramètre `phase` qui distingue la génération de questions techniques de l'analyse.

**Tech Stack:** Next.js 16 (App Router), Supabase (service_role), Gemini 2.5 Flash, `node --test` (intégré à Node 20, aucune dépendance ajoutée).

## Global Constraints

- Toute nouvelle logique métier critique est garantie **dans le code après `JSON.parse`**, jamais confiée au prompt seul (`tasks/lessons.md`, entrées du 2026-05-29 et 2026-06-04).
- `createClient` reste **à l'intérieur du handler**, jamais au niveau module (`tasks/lessons.md`, 2026-05-28).
- `export const dynamic = "force-dynamic"` reste en tête de la route.
- Aucune requête annexe en échec ne doit produire une valeur par défaut présentée comme un fait: on écrit « indisponible ».
- Pas de tiret cadratin (`—`) ni demi-cadratin (`–`) comme ponctuation dans un texte affiché à l'utilisateur (`tasks/lessons.md`, 2026-07-13).
- Commits au format `Feat:` ou `Fix:`, terminés par `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Rétrocompatibilité: `phase` absent équivaut à `"analyse"`. Un dossier avec rapport garde le flux actuel en un clic.

---

### Task 1: Socle de données du devis (fonction pure + lanceur de tests)

Répare les trois champs inexistants lus par le prompt. Première tâche parce que tout le reste en dépend.

**Files:**
- Create: `lib/contrat-analyse.mjs`
- Create: `lib/contrat-analyse.test.mjs`
- Modify: `package.json` (bloc `scripts`)

**Interfaces:**
- Consumes: rien
- Produces: `construireSocleDevis(devis) -> { montant: number|null, prestation: string|null, lignes: Array, totalLignes: number, superficie: number|null, remise: number|null }`

- [ ] **Step 1: Ajouter le script de test**

Dans `package.json`, remplacer le bloc `scripts` par:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "node --test"
  },
```

- [ ] **Step 2: Écrire le test qui échoue**

Créer `lib/contrat-analyse.test.mjs`:

```js
import { test } from "node:test"
import assert from "node:assert/strict"
import { construireSocleDevis } from "./contrat-analyse.mjs"

test("devis à lignes multiples: montant net, superficie sommée, remise déduite", () => {
  const socle = construireSocleDevis({
    montant_net: 46286,
    montant_total: 47000,
    prestation: "Désinsectisation + Désinfection",
    superficie: null,
    lignes: [
      { prestation: "Désinsectisation", secteur: "Bloc A", superficie: 41.85, prix_m2: 200, montant: 8370 },
      { prestation: "Désinfection", secteur: "Bloc B", superficie: 215.295, prix_m2: 200, montant: 43059 },
    ],
  })
  assert.equal(socle.montant, 46286)
  assert.equal(socle.totalLignes, 51429)
  assert.equal(socle.superficie, 257.145)
  assert.equal(socle.remise, 5143)
  assert.equal(socle.prestation, "Désinsectisation + Désinfection")
})

test("devis ancien sans lignes: repli sur montant_total et superficie de la colonne", () => {
  const socle = construireSocleDevis({
    montant_net: null,
    montant_total: 39690,
    prestation: "Dératisation",
    superficie: 120,
    lignes: null,
  })
  assert.equal(socle.montant, 39690)
  assert.equal(socle.totalLignes, 0)
  assert.equal(socle.superficie, 120)
  assert.equal(socle.remise, null)
})

test("devis vide: aucune valeur inventée", () => {
  const socle = construireSocleDevis({})
  assert.equal(socle.montant, null)
  assert.equal(socle.superficie, null)
  assert.equal(socle.remise, null)
  assert.deepEqual(socle.lignes, [])
})
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

Run: `npm test`
Expected: FAIL, `Cannot find module` sur `./contrat-analyse.mjs`

- [ ] **Step 4: Écrire l'implémentation minimale**

Créer `lib/contrat-analyse.mjs`:

```js
// Logique métier pure de l'analyse de contrat.
// Volontairement sans import Next ni Supabase: testable avec `node --test`.

// Socle de données du devis.
// Répare trois lectures fausses du prompt historique: `devis.montant` et
// `devis.prestations` n'existent pas en base, et `devis.superficie` est NULL
// depuis le passage aux lignes multi-secteurs (les surfaces vivent dans `lignes`).
export function construireSocleDevis(devis) {
  const d = devis || {}
  const lignes = Array.isArray(d.lignes) ? d.lignes : []
  const totalLignes = lignes.reduce((s, l) => s + (Number(l.montant) || 0), 0)
  const superficieLignes = lignes.reduce((s, l) => s + (Number(l.superficie) || 0), 0)
  const montant = Number(d.montant_net) || Number(d.montant_total) || null
  return {
    montant,
    prestation: d.prestation || null,
    lignes,
    totalLignes,
    superficie: superficieLignes > 0 ? superficieLignes : (Number(d.superficie) || null),
    // La colonne `remise` n'est jamais persistée par creerDevis: on la déduit.
    remise: (totalLignes > 0 && montant) ? totalLignes - montant : null,
  }
}
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `npm test`
Expected: PASS, 3 tests

- [ ] **Step 6: Commit**

```bash
git add lib/contrat-analyse.mjs lib/contrat-analyse.test.mjs package.json
git commit -m "Feat: socle de données du devis pour l'analyse de contrat (fonction pure testée)

Le prompt de analyze-contract lisait devis.montant et devis.prestations, qui
n'existent pas en base, et devis.superficie qui est NULL depuis les lignes
multi-secteurs. construireSocleDevis rétablit montant_net, prestation, la
superficie sommée sur les lignes et la remise déduite.

Ajoute le lanceur de tests intégré de Node (npm test), aucune dépendance.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Plancher d'infestation et arbitrage des contraintes

Garantit dans le code ce que le prompt ne peut pas garantir.

**Files:**
- Modify: `lib/contrat-analyse.mjs`
- Modify: `lib/contrat-analyse.test.mjs`

**Interfaces:**
- Consumes: rien de la Task 1
- Produces:
  - `PLANCHER_PASSAGES: { faible: 1, moyen: 2, eleve: 4, critique: 6 }`
  - `plancherPour(niveau: string|null) -> number|null`
  - `parseFrequenceClient(texte: string|null) -> { freq: number, paiement: string }|null`
  - `appliquerContraintes({ analyse, freqClient, niveauInfestation }) -> analyse` (nouvel objet, jamais muté)

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `lib/contrat-analyse.test.mjs`:

```js
import { plancherPour, parseFrequenceClient, appliquerContraintes } from "./contrat-analyse.mjs"

test("plancherPour tolère la casse et les accents", () => {
  assert.equal(plancherPour("Élevé"), 4)
  assert.equal(plancherPour("eleve"), 4)
  assert.equal(plancherPour("ÉLEVÉ"), 4)
  assert.equal(plancherPour("Moyen"), 2)
  assert.equal(plancherPour("Critique"), 6)
  assert.equal(plancherPour("Faible"), 1)
  assert.equal(plancherPour(null), null)
  assert.equal(plancherPour("Inconnu"), null)
})

test("parseFrequenceClient reconnaît les formulations courantes", () => {
  assert.deepEqual(parseFrequenceClient("trimestriel sur un an"), { freq: 4, paiement: "trimestriel_avance" })
  assert.deepEqual(parseFrequenceClient("deux passages par an"), { freq: 2, paiement: "semestriel" })
  assert.equal(parseFrequenceClient("le client hésite"), null)
})

test("le plancher relève une proposition IA trop basse", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 2, pointsAttention: ["autre point"] },
    freqClient: null,
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 4)
  assert.deepEqual(out.pointsAttention, ["autre point"])
})

test("le plancher ne rabaisse jamais une proposition IA plus élevée", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 6, pointsAttention: [] },
    freqClient: null,
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 6)
})

test("la demande du client l'emporte sur le plancher, et le conflit est signalé en tête", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 4, paiementRecommande: "trimestriel_avance", pointsAttention: ["autre point"] },
    freqClient: { freq: 2, paiement: "semestriel" },
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 2)
  assert.equal(out.paiementRecommande, "semestriel")
  assert.match(out.pointsAttention[0], /demande 2 passage/)
  assert.match(out.pointsAttention[0], /justifie 4/)
  assert.equal(out.pointsAttention[1], "autre point")
})

test("aucun conflit signalé quand la demande client atteint le plancher", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 4, pointsAttention: [] },
    freqClient: { freq: 4, paiement: "trimestriel_avance" },
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 4)
  assert.deepEqual(out.pointsAttention, [])
})

test("sans rapport de visite, aucun plancher ne s'applique", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 1, pointsAttention: [] },
    freqClient: null,
    niveauInfestation: null,
  })
  assert.equal(out.frequencePassages, 1)
  assert.deepEqual(out.pointsAttention, [])
})

test("appliquerContraintes ne mute pas l'analyse reçue", () => {
  const source = { frequencePassages: 2, pointsAttention: [] }
  appliquerContraintes({ analyse: source, freqClient: null, niveauInfestation: "Élevé" })
  assert.equal(source.frequencePassages, 2)
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL, `plancherPour is not a function` (export absent)

- [ ] **Step 3: Écrire l'implémentation**

Ajouter à la fin de `lib/contrat-analyse.mjs`:

```js
function normaliser(v) {
  return String(v == null ? "" : v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

// Nombre de passages annuels minimum justifié par le constat terrain.
export const PLANCHER_PASSAGES = { faible: 1, moyen: 2, eleve: 4, critique: 6 }

export function plancherPour(niveau) {
  const cle = normaliser(niveau)
  return Object.prototype.hasOwnProperty.call(PLANCHER_PASSAGES, cle) ? PLANCHER_PASSAGES[cle] : null
}

// Fréquence demandée par le client, extraite de façon déterministe.
// Déplacée depuis la route pour être testable.
export function parseFrequenceClient(texte) {
  const t = (texte || "").toLowerCase()
  if (/\b1\s*passage|\bune?\s*fois|\bannuel|\b1\s*fois/.test(t)) return { freq: 1, paiement: "annuel" }
  if (/\b2\s*passages?|\bsemestriel|\bdeux\s*fois|\bdeux\s*passages?|\b2\s*fois/.test(t)) return { freq: 2, paiement: "semestriel" }
  if (/\b4\s*passages?|\btrimestriel|\bquatre\s*fois|\bquatre\s*passages?|\b4\s*fois/.test(t)) return { freq: 4, paiement: "trimestriel_avance" }
  if (/\b6\s*passages?|\bbimestriel|\bsix\s*fois/.test(t)) return { freq: 6, paiement: "trimestriel_avance" }
  if (/\b12\s*passages?|\bmensuel|\bchaque\s*mois|\btous\s*les\s*mois/.test(t)) return { freq: 12, paiement: "mensuel" }
  return null
}

// Arbitrage, du plus fort au plus faible:
//   1. demande explicite du client (souveraine, c'est ce qui est vendu)
//   2. plancher d'infestation (relève la proposition IA, ne la rabaisse jamais)
//   3. proposition de l'IA
// Un écart entre 1 et 2 n'est jamais tranché en silence: il remonte en tête
// de pointsAttention pour arbitrage commercial.
export function appliquerContraintes({ analyse, freqClient, niveauInfestation }) {
  const out = Object.assign({}, analyse)
  const points = Array.isArray(out.pointsAttention) ? out.pointsAttention.slice() : []
  const plancher = plancherPour(niveauInfestation)

  if (plancher && Number(out.frequencePassages || 0) < plancher) {
    out.frequencePassages = plancher
  }

  if (freqClient) {
    if (plancher && freqClient.freq < plancher) {
      points.unshift(
        "Le client demande " + freqClient.freq + " passage(s), le constat terrain (" +
        niveauInfestation + ") en justifie " + plancher + ". Écart à arbitrer avant signature."
      )
    }
    out.frequencePassages = freqClient.freq
    out.paiementRecommande = freqClient.paiement
  }

  out.pointsAttention = points
  return out
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test`
Expected: PASS, 11 tests

- [ ] **Step 5: Commit**

```bash
git add lib/contrat-analyse.mjs lib/contrat-analyse.test.mjs
git commit -m "Feat: plancher d'infestation et arbitrage des contraintes de contrat

Le niveau d'infestation constaté impose un nombre de passages minimum, garanti
dans le code et non par le prompt: le journal documente deux cas d'IA ignorant
une contrainte métier posée en texte.

Priorité: demande client, puis plancher, puis proposition IA. Un écart entre la
demande du client et le constat terrain remonte en tête de pointsAttention au
lieu d'être tranché en silence.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Chargement du dossier dans la route

Répare la requête d'historique et récupère le rapport de visite.

**Files:**
- Modify: `app/api/analyze-contract/route.js` (corps du `POST`, entre la lecture du body et la construction du prompt)

**Interfaces:**
- Consumes: `construireSocleDevis` (Task 1)
- Produits pour les tâches suivantes, disponibles dans le scope du handler:
  - `socle` (objet de la Task 1)
  - `rapport: object|null` (ligne `rapports_visite` la plus récente)
  - `rapportsPrecedents: Array` (les autres, plus anciens)
  - `rapportOrigine: "devis" | "autre_dossier" | "aucun" | "indisponible"`
  - `historiqueDispo: boolean`, `nbDevisAnterieurs: number`
  - `fichesDispo: boolean`, `nbFiches: number`

- [ ] **Step 1: Importer le socle**

En tête de `app/api/analyze-contract/route.js`, après les imports existants:

```js
import { construireSocleDevis, parseFrequenceClient, appliquerContraintes } from "@/lib/contrat-analyse.mjs"
```

- [ ] **Step 2: Remplacer le bloc de chargement**

Remplacer tout le bloc allant de `// Historique du client` jusqu'à la ligne `const freqClient = parseFrequenceClient(demandeClient)` incluse (ce qui supprime la définition locale de `parseFrequenceClient`, désormais importée) par:

```js
    const socle = construireSocleDevis(devis)

    // Historique du client. La requête lisait `montant`, colonne inexistante:
    // elle échouait en 400 et `historique` valait null, donc tout client
    // apparaissait comme nouveau et la remise fidélité ne se déclenchait jamais.
    const histRes = await supabase
      .from("devis")
      .select("id, statut, created_at, montant_net")
      .eq("client_id", devis.client_id)
      .order("created_at", { ascending: false })
    const historiqueDispo = !histRes.error
    const nbDevisAnterieurs = (histRes.data || []).filter(d => d.id !== devisId).length

    const fichesRes = await supabase
      .from("fiches_passage")
      .select("id, date_passage")
      .eq("client_id", devis.client_id)
      .order("date_passage", { ascending: false })
    const fichesDispo = !fichesRes.error
    const nbFiches = (fichesRes.data || []).length

    // Rapport de visite: le plus récent du devis fait référence. À défaut, on
    // accepte un rapport du même client sur un autre dossier (même site, même
    // infestation), en déclarant explicitement son origine.
    let rapports = []
    let rapportOrigine = "aucun"
    const rvDevis = await supabase
      .from("rapports_visite")
      .select("*")
      .eq("devis_id", devisId)
      .order("date_visite", { ascending: false })

    if (rvDevis.error) {
      rapportOrigine = "indisponible"
    } else if ((rvDevis.data || []).length > 0) {
      rapports = rvDevis.data
      rapportOrigine = "devis"
    } else {
      const rvClient = await supabase
        .from("rapports_visite")
        .select("*")
        .eq("client_id", devis.client_id)
        .order("date_visite", { ascending: false })
        .limit(1)
      if (!rvClient.error && (rvClient.data || []).length > 0) {
        rapports = rvClient.data
        rapportOrigine = "autre_dossier"
      }
    }
    const rapport = rapports[0] || null
    const rapportsPrecedents = rapports.slice(1)

    const client = devis.clients
    const nomClient = [client?.prenom, client?.nom].filter(Boolean).join(" ")
    const freqClient = parseFrequenceClient(demandeClient)
```

Supprimer les anciennes déclarations de `client`, `nomClient`, `nbDevisAntérieurs` et `nbFiches` restées plus bas, elles font maintenant doublon.

- [ ] **Step 3: Vérifier que le projet compile**

Run: `npx next build 2>&1 | grep -iE "error|Compiled"`
Expected: `✓ Compiled successfully`

Si l'alias `@/lib/...` ne résout pas, remplacer l'import par le chemin relatif `../../../lib/contrat-analyse.mjs` et relancer.

- [ ] **Step 4: Vérifier les requêtes sur données réelles**

Créer un fichier temporaire `/tmp/verif-chargement.mjs`:

```js
import "dotenv/config"
const u = process.env.NEXT_PUBLIC_SUPABASE_URL, k = process.env.SUPABASE_SERVICE_ROLE_KEY
const h = { apikey: k, Authorization: "Bearer " + k }
const q = async (p) => { const r = await fetch(u + "/rest/v1/" + p, { headers: h }); return [r.status, await r.json()] }
const [sHist] = await q("devis?select=id,statut,created_at,montant_net&limit=1")
const [sFiches] = await q("fiches_passage?select=id,date_passage&limit=1")
const [sRv] = await q("rapports_visite?select=*&limit=1")
console.log("historique", sHist, "fiches", sFiches, "rapports", sRv)
```

Run: `node --env-file=.env.local /tmp/verif-chargement.mjs`
Expected: `historique 200 fiches 200 rapports 200`

- [ ] **Step 5: Commit**

```bash
git add app/api/analyze-contract/route.js
git commit -m "Fix: chargement du dossier dans analyze-contract (historique en 400, rapport ignoré)

La requête d'historique sélectionnait la colonne montant, inexistante: elle
échouait en 400, historique valait null et tout client apparaissait comme
nouveau. La remise fidélité de 5 à 10 pour cent ne s'est jamais déclenchée.

Ajoute le rapport de visite du devis, avec repli sur un rapport du même client
sur un autre dossier, et déclare l'origine du constat.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Prompt d'analyse enrichi

**Files:**
- Modify: `app/api/analyze-contract/route.js` (construction du `prompt`, application des contraintes, réponse)
- Modify: `lib/contrat-analyse.mjs` (ajout de `blocRapport`)
- Modify: `lib/contrat-analyse.test.mjs`

**Interfaces:**
- Consumes: `socle`, `rapport`, `rapportsPrecedents`, `rapportOrigine`, `historiqueDispo`, `nbDevisAnterieurs`, `fichesDispo`, `nbFiches`, `freqClient` (Task 3); `appliquerContraintes` (Task 2)
- Produces: `blocRapport(rapport, precedents, origine) -> string` (section texte prête à insérer dans le prompt)

- [ ] **Step 1: Écrire les tests de blocRapport**

Ajouter à `lib/contrat-analyse.test.mjs`:

```js
import { blocRapport } from "./contrat-analyse.mjs"

test("blocRapport déclare l'absence de constat sans l'inventer", () => {
  const txt = blocRapport(null, [], "aucun")
  assert.match(txt, /Aucune visite terrain/)
  assert.doesNotMatch(txt, /Niveau d'infestation/)
})

test("blocRapport expose le niveau et les nuisibles constatés", () => {
  const txt = blocRapport(
    {
      numero_unique: "RV-2026-0718-304",
      date_visite: "2026-07-18",
      niveau_infestation: "Élevé",
      nuisibles: ["Termites", "Rats"],
      autres_nuisible: "",
      zones_infestees: "Bloc A fortement impacté",
      recommandations: "Contrat de suivi conseillé",
      observations: "Reine mère présente",
      notes_technicien: "",
      description_site: "Immeuble R+1",
      technicien: "Fabrice",
    },
    [],
    "devis"
  )
  assert.match(txt, /Élevé/)
  assert.match(txt, /Termites, Rats/)
  assert.match(txt, /Bloc A fortement impacté/)
  assert.match(txt, /Reine mère présente/)
})

test("blocRapport signale un constat provenant d'un autre dossier", () => {
  const txt = blocRapport({ numero_unique: "RV-1", date_visite: "2026-06-02", niveau_infestation: "Moyen" }, [], "autre_dossier")
  assert.match(txt, /autre dossier/)
})

test("blocRapport résume les visites précédentes en une ligne chacune", () => {
  const txt = blocRapport(
    { numero_unique: "RV-2", date_visite: "2026-07-18", niveau_infestation: "Élevé" },
    [{ date_visite: "2026-03-01", niveau_infestation: "Moyen" }],
    "devis"
  )
  assert.match(txt, /2026-03-01/)
  assert.match(txt, /Moyen/)
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL, `blocRapport is not a function`

- [ ] **Step 3: Implémenter blocRapport**

Ajouter à `lib/contrat-analyse.mjs`:

```js
// Section « constat terrain » du prompt. Une absence de rapport est déclarée
// telle quelle: l'IA ne doit jamais confondre « pas de visite » et « rien vu ».
export function blocRapport(rapport, precedents, origine) {
  if (origine === "indisponible") {
    return "CONSTAT TERRAIN\n- Rapports de visite indisponibles (erreur de lecture). Ne rien supposer sur l'état du site."
  }
  if (!rapport) {
    return "CONSTAT TERRAIN\n- Aucune visite terrain réalisée pour ce dossier. Fonde-toi sur le devis et les réponses techniques fournies, et signale cette absence dans pointsAttention."
  }

  const nuisibles = []
    .concat(Array.isArray(rapport.nuisibles) ? rapport.nuisibles : [])
    .concat(rapport.autres_nuisible ? [rapport.autres_nuisible] : [])
    .filter(Boolean)
    .join(", ")

  const lignes = [
    "CONSTAT TERRAIN" + (origine === "autre_dossier" ? " (rapport issu d'un autre dossier du même client, même site)" : ""),
    "- Rapport : " + (rapport.numero_unique || "sans référence") + " du " + (rapport.date_visite || "date inconnue"),
    "- Technicien : " + (rapport.technicien || "non précisé"),
    "- Niveau d'infestation constaté : " + (rapport.niveau_infestation || "non précisé"),
    "- Nuisibles identifiés : " + (nuisibles || "non précisés"),
    "- Description du site : " + (rapport.description_site || "non précisée"),
    "- Zones infestées : " + (rapport.zones_infestees || "non précisées"),
    "- Recommandations du technicien : " + (rapport.recommandations || "aucune"),
    "- Observations : " + (rapport.observations || "aucune"),
  ]
  if (rapport.notes_technicien) lignes.push("- Notes complémentaires : " + rapport.notes_technicien)

  if ((precedents || []).length > 0) {
    lignes.push("- Visites antérieures :")
    precedents.forEach(p => {
      lignes.push("  · " + (p.date_visite || "date inconnue") + " : niveau " + (p.niveau_infestation || "non précisé"))
    })
  }
  return lignes.join("\n")
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test`
Expected: PASS, 15 tests

- [ ] **Step 5: Brancher le prompt sur les vraies données**

Dans `app/api/analyze-contract/route.js`, remplacer les sections `DEVIS DE RÉFÉRENCE` et `PROFIL CLIENT` du `prompt` par:

```
---
DEVIS DE RÉFÉRENCE
- Référence : ${devis.numero}
- Client : ${nomClient}${client?.entreprise ? " (" + client.entreprise + ")" : ""}
- Prestation(s) : ${socle.prestation || "Non précisé"}
- Superficie totale : ${socle.superficie ? socle.superficie + " m²" : "Non précisée"}
- Montant du devis : ${socle.montant ? socle.montant.toLocaleString("fr-FR") + " FCFA" : "Non précisé"}
- Remise déjà accordée sur le devis : ${socle.remise ? socle.remise.toLocaleString("fr-FR") + " FCFA" : "Aucune"}
- Statut : ${devis.statut}
${socle.lignes.length > 0 ? "- Détail des lignes :\n" + socle.lignes.map(l =>
  "  · " + (l.prestation || "?") + (l.secteur ? " / " + l.secteur : "") +
  " : " + (Number(l.superficie) || 0) + " m² à " + (Number(l.prix_m2) || 0) + " FCFA/m² = " +
  (Number(l.montant) || 0).toLocaleString("fr-FR") + " FCFA"
).join("\n") : ""}

${blocRapport(rapport, rapportsPrecedents, rapportOrigine)}

PROFIL CLIENT
- Devis antérieurs avec GSE : ${historiqueDispo ? nbDevisAnterieurs : "information indisponible"}
- Fiches de passage antérieures : ${fichesDispo ? nbFiches : "information indisponible"}
- Statut : ${!historiqueDispo || !fichesDispo ? "indéterminé (historique incomplet)" : (nbDevisAnterieurs === 0 && nbFiches === 0 ? "Nouveau client" : "Client existant")}
${reponsesTechniques ? "\nRÉPONSES TECHNIQUES FOURNIES PAR LE COMMERCIAL\n" + reponsesTechniques : ""}
```

**Puis, dans le même prompt, corriger le bloc `RÈGLES DE DÉCISION`.** Il interpole
encore `${nbDevisAntérieurs}` et `${nbFiches}`, or la Task 3 a supprimé
`nbDevisAntérieurs` (accentué) au profit de `nbDevisAnterieurs`. Laisser la règle en
l'état provoquerait une `ReferenceError` à la première requête. Remplacer la règle 2 par:

```
2. Si le client a des passages ou des devis antérieurs avec GSE (voir PROFIL CLIENT ci-dessus), c'est un client fidèle : applique une remise supplémentaire de 5 à 10 % sur le prix de référence marché. Si l'historique est indisponible, n'applique aucune remise fidélité et signale-le dans pointsAttention.
```

La règle ne dépend plus d'un compte interpolé: le profil client est déjà dans le prompt,
et la formulation couvre explicitement le cas « historique indisponible ».

Vérifier ensuite qu'aucune interpolation orpheline ne subsiste:

```bash
grep -n 'nbDevisAntérieurs\|devis\.montant\b\|devis\.prestations' app/api/analyze-contract/route.js
```

Expected: aucune sortie.

Ajouter `blocRapport` à l'import de la Task 3. Déclarer juste avant le prompt:

```js
    const reponsesTechniques = Object.entries(body.reponsesTechniques || {})
      .filter(([, v]) => String(v || "").trim())
      .map(([k, v]) => "- " + k + " : " + v)
      .join("\n") || null
```

et remplacer la destructuration du body en tête du `try` par:

```js
    const body = await req.json()
    const { devisId, typeEtablissement, demandeClient, notes } = body
    const phase = body.phase === "questions" ? "questions" : "analyse"
```

- [ ] **Step 6: Remplacer la garantie de fréquence par l'arbitrage complet**

Remplacer le bloc:

```js
    if (freqClient) {
      analyse.frequencePassages = freqClient.freq
      analyse.paiementRecommande = freqClient.paiement
    }
```

par:

```js
    analyse = appliquerContraintes({
      analyse,
      freqClient,
      niveauInfestation: rapport ? rapport.niveau_infestation : null,
    })
```

Changer `let analyse` si la variable est déclarée en `const`.

- [ ] **Step 7: Enrichir la réponse de la route**

Remplacer le `return NextResponse.json({ success: true, devis: {...}, analyse })` final par:

```js
    return NextResponse.json({
      success: true,
      devis: {
        numero: devis.numero,
        client: nomClient,
        entreprise: client?.entreprise,
        telephone: client?.telephone,
        adresse: client?.adresse,
        superficie: socle.superficie,
        prestations: socle.prestation ? [socle.prestation] : [],
        montant: socle.montant,
      },
      rapport: rapport ? {
        numero: rapport.numero_unique,
        date: rapport.date_visite,
        niveau: rapport.niveau_infestation,
        origine: rapportOrigine,
      } : null,
      rapportOrigine,
      analyse
    })
```

- [ ] **Step 8: Vérifier la compilation et les tests**

Run: `npx next build 2>&1 | grep -iE "error|Compiled" && npm test`
Expected: `✓ Compiled successfully` puis 15 tests PASS

- [ ] **Step 9: Commit**

```bash
git add app/api/analyze-contract/route.js lib/contrat-analyse.mjs lib/contrat-analyse.test.mjs
git commit -m "Feat: prompt d'analyse de contrat fondé sur le devis réel et le constat terrain

Le prompt reçoit désormais le montant net, la superficie sommée sur les lignes,
le détail par secteur, la remise déduite, et la section constat terrain issue du
rapport de visite (niveau, nuisibles, zones, recommandations du technicien).

Une information indisponible est déclarée comme telle, jamais remplacée par une
valeur par défaut. Le plancher d'infestation est appliqué après le JSON.parse.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Phase questions dans la route

**Files:**
- Modify: `app/api/analyze-contract/route.js`

**Interfaces:**
- Consumes: `phase`, `socle`, `rapport`, `rapportOrigine` (Tasks 3 et 4)
- Produces: réponse `{ success: true, phase: "questions", questions: [{ id, question, pourquoi }], rapportOrigine }`

- [ ] **Step 1: Insérer la branche questions**

Juste après le calcul de `rapportOrigine` et avant la construction du prompt d'analyse, insérer:

```js
    if (phase === "questions") {
      const promptQuestions = `Tu es un conseiller technique senior de Global Solutions Entreprise (GSE), société agréée de dératisation, désinsectisation et désinfection à Cotonou, Bénin.

Aucune visite terrain n'a été réalisée pour ce dossier. Tu dois poser au commercial les questions qui te manquent pour recommander un contrat d'entretien pertinent.

DEVIS
- Prestation(s) : ${socle.prestation || "Non précisé"}
- Superficie totale : ${socle.superficie ? socle.superficie + " m²" : "Non précisée"}
- Montant : ${socle.montant ? socle.montant.toLocaleString("fr-FR") + " FCFA" : "Non précisé"}
- Type d'établissement : ${typeEtablissement || "Non précisé"}
- Demande du client : ${demandeClient || "Non précisé"}
- Notes : ${notes || "Aucune"}

RÈGLES IMPÉRATIVES
1. Maximum 5 questions.
2. Chaque question doit être répondable DEPUIS LE BUREAU par le commercial : horaires d'exploitation, accès aux locaux, historique d'infestation connu, contraintes réglementaires ou HACCP, sensibilité des zones.
3. INTERDIT : toute question exigeant un retour sur site, une mesure, une inspection ou un comptage.
4. Pas de question dont la réponse est déjà dans le devis ci-dessus.
5. Formule des questions courtes et concrètes.

Réponds UNIQUEMENT avec ce JSON, sans markdown :
{"questions":[{"id":"identifiant_court_sans_espace","question":"La question posée","pourquoi":"En quoi la réponse change la recommandation, en une phrase"}]}`

      let qRes
      try {
        qRes = await callGeminiWithRetry({
          contents: [{ parts: [{ text: promptQuestions }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
        })
      } catch (e) {
        return NextResponse.json({ error: "Gemini indisponible, réessaie dans quelques secondes. (" + (e.message || "") + ")" }, { status: 503 })
      }

      const qData = await qRes.json()
      const qRaw = qData.candidates?.[0]?.content?.parts?.[0]?.text || ""
      const qCleaned = qRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      let questions = []
      try {
        questions = (JSON.parse(qCleaned).questions || []).slice(0, 5)
      } catch {
        return NextResponse.json({ error: "Réponse Gemini non parseable", raw: qRaw }, { status: 500 })
      }
      return NextResponse.json({ success: true, phase: "questions", questions, rapportOrigine })
    }
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx next build 2>&1 | grep -iE "error|Compiled"`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Vérifier la phase questions en local**

Lancer `npm run dev` dans un terminal. Dans un autre, récupérer l'identifiant d'un devis
sans rapport de visite avec le script de la Task 8 étape 2, puis:

```bash
curl -s -X POST http://localhost:3000/api/analyze-contract \
  -H "Content-Type: application/json" \
  -d '{"devisId":"<ID_DEVIS_SANS_RAPPORT>","phase":"questions","typeEtablissement":"boulangerie","demandeClient":"trimestriel sur un an"}' | head -40
```

Expected: `"success":true`, `"phase":"questions"`, entre 1 et 5 questions, aucune n'exigeant un retour sur site.

- [ ] **Step 4: Commit**

```bash
git add app/api/analyze-contract/route.js
git commit -m "Feat: phase questions techniques quand aucun rapport de visite n'existe

11 devis sur 22 n'ont pas de rapport de visite. Plutôt que de produire une
recommandation dégradée en silence, l'IA pose jusqu'à 5 questions répondables
depuis le bureau, dont les réponses alimentent l'analyse.

Le paramètre phase vaut analyse par défaut: les dossiers avec rapport gardent
le flux en un clic.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Bandeau de provenance dans le modal

**Files:**
- Modify: `app/admin/page.js` (états du composant `SectionClientsDevis`, `lancerAnalyseContrat`, `renderContratModal`)

**Interfaces:**
- Consumes: champs `rapport` et `rapportOrigine` de la réponse (Task 4)
- Produces: état `contratRapport`, alimenté par les deux phases

- [ ] **Step 1: Ajouter l'état**

Après `const [contratAnalyse, setContratAnalyse] = React.useState(null)`:

```js
  const [contratRapport, setContratRapport] = React.useState(null)
  const [contratQuestions, setContratQuestions] = React.useState(null)
  const [contratReponses, setContratReponses] = React.useState({})
```

- [ ] **Step 2: Réinitialiser à l'ouverture et à la fermeture**

Aux trois endroits qui font déjà `setContratAnalyse(null); setContratErreur(null)` (ouverture depuis le pipeline, ouverture depuis le dossier client, bouton de fermeture du modal), ajouter à la suite:

```js
setContratRapport(null); setContratQuestions(null); setContratReponses({})
```

- [ ] **Step 3: Mémoriser la provenance après analyse**

Dans `lancerAnalyseContrat`, remplacer:

```js
      if (data.success) {
        setContratAnalyse(data.analyse)
```

par:

```js
      if (data.success) {
        setContratAnalyse(data.analyse)
        setContratRapport(data.rapport || { origine: data.rapportOrigine })
```

- [ ] **Step 4: Afficher le bandeau**

Dans `renderContratModal`, juste après le bloc d'entête (celui qui contient le bouton `×`), insérer:

```js
        contratRapport ? (function() {
          var org = contratRapport.origine
          var absent = !contratRapport.numero
          var texte = absent
            ? "Aucun rapport de visite. Analyse fondée sur le devis et vos réponses."
            : "Rapport " + contratRapport.numero + " du " + contratRapport.date + ", niveau " + contratRapport.niveau +
              (org === "autre_dossier" ? " (relevé sur un autre dossier du même client)" : "")
          return React.createElement("div", {
            style: {
              display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px",
              padding: "9px 13px", borderRadius: "8px", fontSize: "12px",
              backgroundColor: absent ? "#fffbeb" : "#f0fdf4",
              border: "1px solid " + (absent ? "#fde68a" : "#bbf7d0"),
              color: absent ? "#92400e" : "#065f46"
            }
          }, React.createElement("span", null, absent ? "⚠️" : "📋"), React.createElement("span", null, texte))
        })() : null,
```

- [ ] **Step 5: Vérifier la compilation**

Run: `npx next build 2>&1 | grep -iE "error|Compiled"`
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: le modal contrat déclare ce que l'IA a réellement vu

Bandeau indiquant le rapport de visite utilisé (référence, date, niveau), son
éventuelle provenance d'un autre dossier du même client, ou son absence. Sans
cette information, impossible de distinguer une recommandation fondée sur un
constat terrain d'une recommandation fondée sur le seul devis.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Étape questions dans le modal

**Files:**
- Modify: `app/admin/page.js` (`lancerAnalyseContrat`, `renderContratModal`)

**Interfaces:**
- Consumes: `contratQuestions`, `contratReponses` (Task 6); réponse de la phase questions (Task 5)
- Produces: `demanderQuestionsContrat()`, et `lancerAnalyseContrat()` transmettant `reponsesTechniques`

- [ ] **Step 1: Ajouter la fonction de demande de questions**

Juste avant `async function lancerAnalyseContrat()`:

```js
  // Sur un dossier sans rapport de visite, on demande d'abord à l'IA ce qui lui
  // manque. Les réponses sont facultatives: l'analyse reste lançable sans elles.
  async function demanderQuestionsContrat() {
    if (!contratModal) return
    setAnalysingContrat(true)
    setContratErreur(null)
    try {
      var res = await fetch("/api/analyze-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devisId: contratModal.id,
          phase: "questions",
          typeEtablissement: contratForm.typeEtablissement,
          demandeClient: contratForm.demandeClient,
          notes: contratForm.notes
        })
      })
      var data = await res.json()
      if (data.success) {
        setContratQuestions(data.questions || [])
        setContratRapport({ origine: data.rapportOrigine })
      } else {
        setContratErreur("Erreur : " + (data.error || "inconnue"))
      }
    } catch (e) {
      setContratErreur("Erreur réseau : " + e.message)
    }
    setAnalysingContrat(false)
  }
```

- [ ] **Step 2: Transmettre les réponses à l'analyse**

Dans `lancerAnalyseContrat`, remplacer le `body: JSON.stringify({...})` par:

```js
        body: JSON.stringify({
          devisId: contratModal.id,
          phase: "analyse",
          typeEtablissement: contratForm.typeEtablissement,
          demandeClient: contratForm.demandeClient,
          notes: contratForm.notes,
          reponsesTechniques: contratReponses
        })
```

- [ ] **Step 3: Afficher le bloc questions**

Dans `renderContratModal`, juste avant le bouton `Analyser avec l'IA`, insérer:

```js
          contratQuestions && contratQuestions.length > 0 ? React.createElement("div", {
            style: { marginBottom: "16px", padding: "14px 16px", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px" }
          },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" } },
              "Questions techniques (réponses facultatives)"),
            contratQuestions.map(function(q) {
              return React.createElement("div", { key: q.id, style: { marginBottom: "12px" } },
                React.createElement("label", { style: { display: "block", fontSize: "13px", color: "#1c1917", marginBottom: "3px", fontWeight: "600" } }, q.question),
                q.pourquoi ? React.createElement("div", { style: { fontSize: "11px", color: "#a16207", marginBottom: "5px", fontStyle: "italic" } }, q.pourquoi) : null,
                React.createElement("input", {
                  value: contratReponses[q.id] || "",
                  onChange: function(e) {
                    var v = e.target.value
                    setContratReponses(function(prev) { var o = Object.assign({}, prev); o[q.id] = v; return o })
                  },
                  placeholder: "Laisser vide si vous ne savez pas",
                  style: { width: "100%", padding: "8px 11px", border: "1.5px solid #fde68a", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }
                })
              )
            })
          ) : null,
```

- [ ] **Step 4: Ajouter le bouton de demande de questions**

Juste avant le bouton `Analyser avec l'IA`, insérer:

```js
          (!contratQuestions && contratRapport && !contratRapport.numero) ? React.createElement("button", {
            onClick: demanderQuestionsContrat,
            disabled: analysingContrat,
            style: { width: "100%", marginBottom: "8px", background: "#fff", color: "#92400e", border: "1px solid #fde68a", borderRadius: "8px", padding: "11px", fontSize: "13px", fontWeight: "700", cursor: analysingContrat ? "wait" : "pointer", fontFamily: "inherit" }
          }, analysingContrat ? "…" : "Ce dossier n'a pas de rapport de visite : demander les questions techniques") : null,
```

- [ ] **Step 5: Vérifier la compilation**

Run: `npx next build 2>&1 | grep -iE "error|Compiled"`
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: étape questions techniques dans le modal contrat

Sur un dossier sans rapport de visite, l'IA pose ses questions avant l'analyse
et les réponses sont transmises à la phase analyse. Réponses facultatives:
l'analyse reste lançable sans en remplir aucune.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Vérification bout en bout sur données réelles

Aucun code produit ici. Cette tâche existe parce que les tests unitaires ne couvrent pas le prompt réellement envoyé à Gemini.

**Files:**
- Modify: `tasks/lessons.md`

- [ ] **Step 1: Vérifier le cas avec rapport (Jean Folly)**

Lancer `npm run dev`, puis:

```bash
curl -s -X POST http://localhost:3000/api/analyze-contract \
  -H "Content-Type: application/json" \
  -d '{"devisId":"f4d1db4a-b6a7-43ee-9092-7a96e8515d48","typeEtablissement":"immeuble","demandeClient":"deux passages par an"}' \
  | python3 -m json.tool | head -60
```

Attendu, à vérifier point par point:
- `rapport.numero` vaut `RV-2026-0718-304`, `rapport.niveau` vaut `Élevé`
- `analyse.frequencePassages` vaut **2** (la demande du client l'emporte)
- `analyse.pointsAttention[0]` mentionne l'écart entre 2 passages demandés et 4 justifiés
- `analyse.clausesSpecifiques` ou `argumentCommercial` mentionne les termites
- Aucune phase questions déclenchée

- [ ] **Step 2: Vérifier le cas sans rapport**

Récupérer l'identifiant d'un devis sans rapport:

```bash
node --env-file=.env.local -e '
const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY,h={apikey:k,Authorization:"Bearer "+k};
const g=async p=>(await fetch(u+"/rest/v1/"+p,{headers:h})).json();
const d=await g("devis?select=id,numero"), r=await g("rapports_visite?select=devis_id");
const avec=new Set(r.map(x=>x.devis_id));
console.log(d.filter(x=>!avec.has(x.id)).slice(0,3));
'
```

Puis appeler la phase `questions` sur cet identifiant. Attendu: entre 1 et 5 questions, **aucune** n'exigeant un retour sur site, une mesure ou un comptage. Relire les questions une par une: c'est le seul contrôle de la règle 3 du prompt.

- [ ] **Step 3: Contrôle de non-régression**

Sur un dossier **avec** rapport, vérifier dans le navigateur que le modal affiche le bandeau vert et le bouton `Analyser avec l'IA` directement, sans étape intermédiaire.

- [ ] **Step 4: Consigner la leçon**

Ajouter à `tasks/lessons.md`:

```
[2026-07-19] | Le prompt de analyze-contract lisait trois champs inexistants (devis.montant, devis.prestations, et une requête d'historique sur montant qui échouait en 400). L'IA proposait donc un prix de contrat sans connaître le montant du devis, et tout client apparaissait comme nouveau, si bien que la règle de remise fidélité n'a jamais servi. Aucune erreur visible: les requêtes en échec produisaient des valeurs par défaut (« Non précisé », « 0 devis antérieurs ») indiscernables de faits. | Un prompt qui interpole des champs de base de données doit être vérifié champ par champ contre le schéma réel, comme du code. Et toute requête annexe en échec doit écrire « indisponible » dans le prompt, jamais une valeur par défaut: une absence d'information présentée comme un fait produit une recommandation fausse sans jamais lever d'erreur.
```

- [ ] **Step 5: Commit**

```bash
git add tasks/lessons.md
git commit -m "Docs: leçon sur les champs de prompt jamais vérifiés contre le schéma

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Couverture du spec

| Section du spec | Tâche |
|---|---|
| 1. Socle de données (montant, prestation, superficie, remise, lignes) | Task 1, Task 4 étape 5 |
| 1. Requête historique corrigée | Task 3 |
| 1. Règle sur les échecs de requête | Task 3, Task 4 étape 5 |
| 2. Rapport de visite, le plus récent en référence | Task 3, Task 4 |
| 2. Résumé des visites précédentes | Task 4 (`blocRapport`) |
| 2. Repli inter-dossiers | Task 3, Task 4 |
| 2. Photos non transmises | Aucune tâche: rien à implémenter |
| 3. Plancher d'infestation | Task 2 |
| 3. Ordre de priorité et conflit explicite | Task 2 |
| 3. Plancher appliqué au repli inter-dossiers | Task 4 étape 6 (`rapport.niveau_infestation` quelle que soit l'origine) |
| 4. Phase questions, 5 maximum, répondables du bureau | Task 5 |
| 4. Réponses facultatives, rétrocompatibilité | Task 5, Task 7 |
| 5. Bandeau de provenance | Task 6 |
| 5. Étape questions intercalée | Task 7 |
| 6. Vérification sur les deux cas réels | Task 8 |
