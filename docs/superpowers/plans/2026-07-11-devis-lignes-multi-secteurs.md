# Devis à lignes multiples (multi-secteurs) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre plusieurs lignes de prestation (dont la même prestation répétée) dans un seul devis, chacune avec un secteur/zone, une surface et un prix/m².

**Architecture:** Nouvelle colonne `devis.lignes` (JSONB, source de vérité). Le formulaire de devis (`renderFormDevis` dans `app/admin/page.js`) passe d'une grille de cases à cocher indexée par nom de prestation à une liste de lignes éditables. Un helper `lignesFromDevis(d)` reconstruit les lignes des anciens devis pour rétrocompatibilité (édition + impression).

**Tech Stack:** Next.js (App Router) + React sans JSX (`React.createElement`), Supabase (Postgres + JS client via `db.from(...)`), déploiement Vercel via `git push`.

## Global Constraints

- **Pas de test-runner** dans ce projet. Le cycle de vérif de CHAQUE tâche = `npm run build` (doit finir sans erreur) + la vérif fonctionnelle décrite. QA navigateur de l'admin = uniquement en prod (`https://www.phyto-benin.com/admin`, l'utilisateur y est connecté) — jamais en local (leçon 2026-07-02).
- **Signatures documents** : client à GAUCHE, GSE à DROITE ; signataire GSE = « Le Directeur Général / Kabir YAKOUBOU » (ne rien changer à ces blocs).
- **Impression** : conserver `.filter(Boolean)` et le filtre `montant > 0` sur les lignes (leçon 2026-06-19 : pas de ligne « 0 » parasite). Le bloc MTN MoMo garde la classe `momo-block`.
- **Commits** : `Feat:` / `Fix:` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Jamais commiter `.env*`.
- **Rétrocompatibilité obligatoire** : un ancien devis sans `lignes` doit s'ouvrir et s'imprimer sans re-saisie.
- Fichier concerné unique côté app : `app/admin/page.js`, composant `SectionClientsDevis` (~ligne 1371). `PRESTATIONS` est défini ligne ~1464 dans ce composant.

---

### Task 1: Migration — colonne `lignes`

**Files:**
- Create: `supabase/migrations/20260711000000_devis_lignes.sql`

**Interfaces:**
- Produces: colonne `devis.lignes JSONB DEFAULT NULL`, lue/écrite par toutes les tâches suivantes.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260711000000_devis_lignes.sql` :

```sql
-- Devis à lignes multiples : chaque ligne = un objet
-- { prestation, secteur, superficie, prix_m2, montant }.
-- NULL = ancien devis (rétrocompat gérée côté app par lignesFromDevis).
ALTER TABLE devis ADD COLUMN IF NOT EXISTS lignes JSONB DEFAULT NULL;
```

- [ ] **Step 2: Appliquer la migration**

Run: `npx supabase db push`
Expected: la migration `20260711000000_devis_lignes` est appliquée sans erreur.

- [ ] **Step 3: Vérifier la colonne**

Run (script Node ponctuel avec la clé service_role de `.env.local`) :
```bash
node -e "import('@supabase/supabase-js').then(async ({createClient})=>{const fs=await import('fs');const e=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));const db=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY);const {error}=await db.from('devis').select('id,lignes').limit(1);console.log(error?('ERREUR '+error.message):'colonne lignes OK')})"
```
Expected: `colonne lignes OK`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260711000000_devis_lignes.sql
git commit -m "Feat: colonne devis.lignes (devis multi-lignes)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Helpers `lignesFromDevis`, `ligneVide`, `resumePrestations`

**Files:**
- Modify: `app/admin/page.js` (composant `SectionClientsDevis`, juste après la définition de `PRESTATIONS`, ~ligne 1464)

**Interfaces:**
- Produces (utilisés par Task 3, 4, 5, 6) :
  - `ligneVide()` → `{ prestation: "", secteur: "", superficie: "", prixM2: "" }`
  - `montantLigne(l)` → `number` (round(superficie×prixM2), 0 si incomplet)
  - `lignesFromDevis(d)` → `Array<{prestation, secteur, superficie, prixM2}>` (jamais vide : au moins `[ligneVide()]`)
  - `resumePrestations(lignes)` → `string` (types dédupliqués joints par `" + "`)

- [ ] **Step 1: Ajouter les helpers**

Juste après la ligne `const PRESTATIONS = [...]` (~1464), insérer :

```js
  function ligneVide() { return { prestation: "", secteur: "", superficie: "", prixM2: "" } }

  function montantLigne(l) {
    var s = parseFloat(l.superficie) || 0
    var p = parseFloat(l.prixM2) || 0
    return (s && p) ? Math.round(s * p) : 0
  }

  // Rétrocompat : reconstruit les lignes d'un devis. Si d.lignes existe → l'utilise ;
  // sinon reconstruit depuis l'ancien format (prestation + maps par prestation).
  function lignesFromDevis(d) {
    if (Array.isArray(d.lignes) && d.lignes.length > 0) {
      return d.lignes.map(function(l) {
        return { prestation: l.prestation || "", secteur: l.secteur || "", superficie: l.superficie != null ? String(l.superficie) : "", prixM2: l.prix_m2 != null ? String(l.prix_m2) : "" }
      })
    }
    var ppp = d.prix_par_prestation || d.prixParPrestation || {}
    var spp = d.superficie_par_prestation || d.superficieParPrestation || {}
    var types = d.prestation ? String(d.prestation).split(" + ").map(function(p) { return p.trim() }).filter(Boolean) : []
    if (types.length === 0) return [ligneVide()]
    return types.map(function(p) {
      return { prestation: p, secteur: "", superficie: spp[p] != null ? String(spp[p]) : "", prixM2: ppp[p] != null ? String(ppp[p]) : "" }
    })
  }

  function resumePrestations(lignes) {
    var seen = []
    ;(lignes || []).forEach(function(l) { if (l.prestation && seen.indexOf(l.prestation) === -1) seen.push(l.prestation) })
    return seen.join(" + ")
  }
```

- [ ] **Step 2: Ajouter `lignes` à l'état initial du formulaire**

Dans la déclaration `const [formDevis, setFormDevis] = React.useState({ ... })` (~ligne 1443), ajouter `lignes: [ligneVide()],` juste après `prestations: [],`.

Note : `ligneVide` doit être défini avant cet appel `useState`. Comme `useState` est appelé avant la ligne `const PRESTATIONS`, définir `ligneVide` de façon ho-istée : la déclarer aussi juste avant le `useState`, OU (préféré) déplacer l'insertion des helpers du Step 1 AVANT le premier `useState`. **Choix retenu : insérer les helpers du Step 1 juste avant le premier `React.useState` du composant** (après la ligne `const [vue, setVue] = ...` n'est pas assez tôt — les mettre avant `formDevis`). Les `function foo(){}` sont hoistées, donc les placer n'importe où dans le corps du composant suffit pour l'usage runtime, MAIS `PRESTATIONS` (utilisé par la version rétrocompat ? non) — `lignesFromDevis` n'utilise pas `PRESTATIONS`. Donc : garder les helpers là où le Step 1 les met (après `PRESTATIONS`), et pour l'état initial utiliser directement la valeur littérale au lieu d'appeler `ligneVide()` :

Dans `formDevis` initial, ajouter : `lignes: [{ prestation: "", secteur: "", superficie: "", prixM2: "" }],`

- [ ] **Step 3: Réinitialiser `lignes` dans les resets**

Dans les 3 objets de reset de `formDevis` (dans `creerDevis`/`viderForm` ~ligne 1685, dans le bouton Annuler ~ligne 4206, et dans le reset ~ligne 1676 si présent), ajouter `lignes: [{ prestation: "", secteur: "", superficie: "", prixM2: "" }],` au même endroit que `prestations: [],`.

Run pour les trouver : `grep -n "prestations: \[\], superficie" app/admin/page.js`
Ajouter le champ `lignes` dans CHAQUE occurrence trouvée.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build réussi, pas d'erreur de syntaxe.

- [ ] **Step 5: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: helpers lignesFromDevis + etat formDevis.lignes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `ouvrirEditionDevis` charge les lignes

**Files:**
- Modify: `app/admin/page.js` — fonction `ouvrirEditionDevis` (~ligne 1604)

**Interfaces:**
- Consumes: `lignesFromDevis` (Task 2).
- Produces: `formDevis.lignes` peuplé à l'ouverture d'un devis existant.

- [ ] **Step 1: Injecter `lignes` dans le setFormDevis d'édition**

Dans `ouvrirEditionDevis`, dans l'objet passé à `setFormDevis({...})` (~ligne 1607), ajouter après la ligne `prestations: ...` :

```js
      lignes: lignesFromDevis(d),
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 3: Vérifier la reconstruction (script ponctuel)**

Run :
```bash
node -e "import('@supabase/supabase-js').then(async ({createClient})=>{const fs=await import('fs');const e=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));const db=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY);const {data}=await db.from('devis').select('numero,prestation,prix_par_prestation,superficie_par_prestation,lignes').eq('numero','DEV-GSE-2026-D1004038').single();console.log('ancien devis:',JSON.stringify(data))})"
```
Expected : le devis Direction Générale a `lignes: null` et `prestation:'Dératisation'` → confirme qu'il passera par le chemin rétrocompat (reconstruction 1 ligne).

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: ouvrirEditionDevis charge lignes (rétrocompat)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Formulaire — répéteur de lignes

**Files:**
- Modify: `app/admin/page.js` — `renderFormDevis`, remplacer le bloc « Prestation(s) » (label + grille de cases + résumé sélection + IIFE détail par prestation), soit **les lignes ~4000 à ~4105** (du `React.createElement("div", { style: { marginBottom: "14px" } }, React.createElement("label", ..., "Prestation(s) * ...")` jusqu'à la fin de l'IIFE `})(),` qui précède le bloc « Prix de base FCFA »).

**Interfaces:**
- Consumes: `formDevis.lignes`, `PRESTATIONS`, `montantLigne`, `inp`, `lbl`.
- Produces: édition de `formDevis.lignes` + mise à jour de `formDevis.montantBrut` = somme des montants de lignes.

- [ ] **Step 1: Remplacer le bloc prestations par le répéteur**

Repérer le début exact :
Run: `grep -n '"Prestation(s) \* — sélectionnez' app/admin/page.js`
Repérer la fin : l'IIFE de « Superficie et prix par prestation » se termine par `      })(),` juste avant `React.createElement("div", { style: { marginBottom: "12px" } },` contenant le label `"Prix de base FCFA *"`.

Remplacer TOUT ce bloc par :

```js
      React.createElement("div", { style: { marginBottom: "14px" } },
        React.createElement("label", { style: lbl }, "Lignes du devis * — une ligne par secteur/zone"),
        React.createElement("div", { style: { border: "1.5px solid #e0ddd6", borderRadius: "8px", overflow: "hidden" } },
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.8fr 0.9fr 1fr 32px", gap: "6px", padding: "8px 10px", backgroundColor: "#0a2e1a", fontSize: "10px", fontWeight: "700", color: "#d4a920", textTransform: "uppercase", letterSpacing: "0.06em" } },
            React.createElement("span", null, "Prestation"),
            React.createElement("span", null, "Secteur / zone"),
            React.createElement("span", { style: { textAlign: "right" } }, "Surface"),
            React.createElement("span", { style: { textAlign: "right" } }, "Prix/m²"),
            React.createElement("span", { style: { textAlign: "right" } }, "Montant"),
            React.createElement("span", null, "")
          ),
          (formDevis.lignes || []).map(function(l, idx) {
            var m = montantLigne(l)
            var setLigne = function(champ, val) {
              setFormDevis(function(prev) {
                var arr = (prev.lignes || []).map(function(x, i) { return i === idx ? Object.assign({}, x, (function(){ var o={}; o[champ]=val; return o })()) : x })
                var total = arr.reduce(function(s, x) { return s + montantLigne(x) }, 0)
                return Object.assign({}, prev, { lignes: arr, montantBrut: total > 0 ? String(total) : prev.montantBrut })
              })
            }
            return React.createElement("div", { key: idx, style: { display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.8fr 0.9fr 1fr 32px", gap: "6px", padding: "8px 10px", alignItems: "center", borderTop: "1px solid #f0ede8", backgroundColor: "#fff" } },
              React.createElement("select", { value: l.prestation || "", onChange: function(e) { setLigne("prestation", e.target.value) }, style: Object.assign({}, inp, { padding: "7px 8px" }) },
                React.createElement("option", { value: "" }, "— choisir —"),
                PRESTATIONS.map(function(p) { return React.createElement("option", { key: p, value: p }, p) })
              ),
              React.createElement("input", { type: "text", value: l.secteur || "", onChange: function(e) { setLigne("secteur", e.target.value) }, placeholder: "Ex: Bloc A", style: Object.assign({}, inp, { padding: "7px 8px" }) }),
              React.createElement("input", { type: "number", value: l.superficie || "", onChange: function(e) { setLigne("superficie", e.target.value) }, placeholder: "m²", style: Object.assign({}, inp, { padding: "7px 8px", textAlign: "right" }) }),
              React.createElement("input", { type: "number", value: l.prixM2 || "", onChange: function(e) { setLigne("prixM2", e.target.value) }, placeholder: "FCFA", style: Object.assign({}, inp, { padding: "7px 8px", textAlign: "right" }) }),
              React.createElement("span", { style: { fontSize: "12px", fontWeight: "700", color: "#0a2e1a", textAlign: "right" } }, m > 0 ? m.toLocaleString("fr-FR") : "—"),
              React.createElement("button", { type: "button", title: "Supprimer la ligne", onClick: function() {
                setFormDevis(function(prev) {
                  var arr = (prev.lignes || []).filter(function(x, i) { return i !== idx })
                  if (arr.length === 0) arr = [{ prestation: "", secteur: "", superficie: "", prixM2: "" }]
                  var total = arr.reduce(function(s, x) { return s + montantLigne(x) }, 0)
                  return Object.assign({}, prev, { lignes: arr, montantBrut: total > 0 ? String(total) : "" })
                })
              }, style: { background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "5px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "🗑")
            )
          }),
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderTop: "1px solid #e0ddd6", backgroundColor: "#f8f7f4" } },
            React.createElement("button", { type: "button", onClick: function() {
              setFormDevis(function(prev) { return Object.assign({}, prev, { lignes: (prev.lignes || []).concat([{ prestation: "", secteur: "", superficie: "", prixM2: "" }]) }) })
            }, style: { background: "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "+ Ajouter une ligne"),
            React.createElement("span", { style: { fontSize: "13px", fontWeight: "700", color: "#0a2e1a" } }, "Total brut : " + ((formDevis.lignes || []).reduce(function(s, x) { return s + montantLigne(x) }, 0)).toLocaleString("fr-FR") + " FCFA")
          )
        )
      ),
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build réussi (le bloc « Prix de base FCFA » qui suit reste inchangé et lit toujours `formDevis.montantBrut`).

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: formulaire devis en lignes (secteur + surface + prix/m2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Sauvegarde — écrire `lignes` + résumé

**Files:**
- Modify: `app/admin/page.js` — `creerDevis` (~ligne 1655), branche `if (editingDevis)` (~1688) et, si présente, la branche `else` d'insertion.

**Interfaces:**
- Consumes: `formDevis.lignes`, `montantLigne`, `resumePrestations`, `lignesFromDevis` (indirectement).
- Produces: colonne `devis.lignes` peuplée ; `prestation` = résumé ; `imprimData.lignes` transmis à l'impression.

- [ ] **Step 1: Construire lignes + résumé en tête de `creerDevis`**

Juste après la ligne `setMsg("")` au début de `creerDevis` (~1662), et AVANT le calcul de `prestationStr`, remplacer le calcul de `prestationStr` existant (~1656-1658) par une version basée sur les lignes :

Remplacer :
```js
    var prestationStr = (formDevis.prestations && formDevis.prestations.length > 0)
      ? formDevis.prestations.join(" + ")
      : formDevis.prestation
```
par :
```js
    var lignesClean = (formDevis.lignes || [])
      .filter(function(l) { return l.prestation })
      .map(function(l) { return { prestation: l.prestation, secteur: (l.secteur || "").trim(), superficie: parseFloat(l.superficie) || 0, prix_m2: parseFloat(l.prixM2) || 0, montant: montantLigne(l) } })
    var prestationStr = resumePrestations(lignesClean)
```

- [ ] **Step 2: Adapter la validation**

La validation existante (~1659) `if ((!formDevis.clientId && !formDevis.nom) || !prestationStr || !formDevis.montantBrut)` reste valable (prestationStr vide si aucune ligne). Ajouter une vérif qu'au moins une ligne est chiffrée : juste après ce `if`, ajouter :
```js
    if (lignesClean.filter(function(l) { return l.montant > 0 }).length === 0) { setMsg("Ajoutez au moins une ligne avec surface et prix."); return }
```

- [ ] **Step 3: Écrire `lignes` dans l'update**

Dans l'objet `db.from("devis").update({...})` (~1690), ajouter :
```js
        lignes: lignesClean,
```
et remplacer les deux lignes `prix_par_prestation: ...` et `superficie_par_prestation: ...` par `null` (les nouveaux devis n'utilisent plus les maps) :
```js
        prix_par_prestation: null,
        superficie_par_prestation: null,
```

- [ ] **Step 4: Transmettre `lignes` à l'impression**

Dans l'objet `imprimData` (~1713), remplacer `superficieParPrestation: formDevis.superficieParPrestation || {}, prixParPrestation: formDevis.prixParPrestation || {},` par :
```js
        lignes: lignesClean,
```

- [ ] **Step 5: Répliquer sur la branche d'insertion (si présente)**

Run: `grep -n "db.from(\"devis\").insert" app/admin/page.js`
Si `creerDevis` a une branche `else` qui fait un `insert` : y ajouter `lignes: lignesClean,`, `prestation: prestationStr`, et `prix_par_prestation: null, superficie_par_prestation: null` de la même façon. Si aucune branche insert dans `creerDevis` (le formulaire tourne toujours en mode édition), ignorer ce step.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 7: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: creerDevis enregistre lignes + resume prestation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Impression — colonne Secteur

**Files:**
- Modify: `app/admin/page.js` — `imprimerDevis` (~ligne 3024), l'IIFE qui construit le tableau des prestations (~3074-3110).

**Interfaces:**
- Consumes: `lignesFromDevis`, `montantLigne`, données `d` passées par `imprimData` (qui contient maintenant `d.lignes`).

- [ ] **Step 1: Remplacer l'IIFE de construction du tableau**

Repérer le début :
Run: `grep -n 'var prestList = d.prestation ? d.prestation.split' app/admin/page.js`
Cette IIFE commence à `(function() {` (~3074) et se termine par `})() +` après le `</table></div>` de retour. Remplacer tout le corps interne (le calcul `prestList/ppp/spp/hasMulti` et la génération des `<tr>`) pour itérer sur les lignes, avec une colonne **Secteur**. Remplacer depuis `var prestList = ...` jusqu'au `return "<div class=\"pbox\" ...` et son contenu par :

```js
        var lignes = lignesFromDevis(d).filter(function(l) { return montantLigne(l) > 0 })
        if (lignes.length === 0) {
          return "<div class=\"pbox\"><div class=\"pname\">" + (d.prestation || "Prestation") + "</div>" + (d.description ? "<div class=\"pdesc\">" + d.description + "</div>" : "") + "</div>"
        }
        var rows = lignes.map(function(l) {
          var pm2 = parseFloat(l.prixM2) || 0
          var sup = parseFloat(l.superficie) || 0
          var montP = montantLigne(l)
          return "<tr>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:13px;color:#0a2e1a;font-weight:600\">" + (l.prestation || "") + "</td>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#555\">" + (l.secteur ? l.secteur : "—") + "</td>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#888;text-align:center\">" + (sup ? sup.toLocaleString("fr-FR") + " m²" : "—") + "</td>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#888;text-align:right\">" + pm2.toLocaleString("fr-FR") + " FCFA/m²</td>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:13px;font-weight:700;color:#0a2e1a;text-align:right\">" + montP.toLocaleString("fr-FR") + " FCFA</td>" +
            "</tr>"
        }).join("")
        return "<div class=\"pbox\" style=\"padding:0;overflow:hidden\">" +
          "<table style=\"width:100%;border-collapse:collapse\">" +
          "<thead><tr style=\"background:#0a2e1a\">" +
          "<th style=\"padding:8px 10px;text-align:left;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Prestation</th>" +
          "<th style=\"padding:8px 10px;text-align:left;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Secteur</th>" +
          "<th style=\"padding:8px 10px;text-align:center;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Surface</th>" +
          "<th style=\"padding:8px 10px;text-align:right;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Prix/m²</th>" +
          "<th style=\"padding:8px 10px;text-align:right;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Montant</th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table>" +
          (d.description ? "<div style=\"padding:10px 12px;font-size:12px;color:#555;border-top:1px solid #e8e6e0\">" + d.description + "</div>" : "") +
          "</div>"
```

**IMPORTANT :** vérifier avec `grep` la structure exacte de l'ancienne IIFE avant de remplacer (elle peut contenir un `<thead>` à 4 colonnes déjà écrit après le `return "<div class=\"pbox\"...`). Remplacer l'intégralité du contenu de l'IIFE (de `var prestList` jusqu'au dernier `"</div>"` avant `})()`), en conservant le `(function() {` d'ouverture et le `})() +` de fermeture.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 3: Vérif visuelle du HTML généré (script ponctuel, sans navigateur)**

Ce step est manuel après déploiement (l'impression s'ouvre dans une fenêtre navigateur). Vérifier plutôt à l'œil que le HTML contient bien 5 `<th>` dont « Secteur ».

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: impression devis avec colonne Secteur (lignes multiples)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Déploiement + QA prod

**Files:** aucun (déploiement).

- [ ] **Step 1: Push (déclenche Vercel)**

```bash
git push origin main
```

- [ ] **Step 2: Vérifier la prod**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.phyto-benin.com/admin
```
Expected: `200`

- [ ] **Step 3: QA manuelle (utilisateur, sur sa session prod)**

Demander à l'utilisateur de vérifier sur `https://www.phyto-benin.com/admin` (Ctrl+Shift+R) :
1. Ouvrir le tableau de bord de **BIA GROUPE Bohicon** → **Modifier devis**.
2. Le bloc « Lignes du devis » s'affiche ; ajouter 2 lignes Désinsectisation (Bloc A 120×500, Cuisine 40×700) → Total brut 88 000 F.
3. Enregistrer (mode non-email → impression) → le devis imprimé montre 2 lignes avec colonne **Secteur** + total.
4. Rouvrir le devis → les 2 lignes réapparaissent.
5. Ouvrir un **ancien** devis (Direction Générale, Dératisation) → 1 ligne reconstruite, secteur « — », édition + impression OK.

- [ ] **Step 4: Journal des leçons (si une correction utilisateur survient pendant la QA)**

Ajouter une entrée à `tasks/lessons.md` au format `[YYYY-MM-DD] | problème | règle`. Commit + push.

---

## Notes de dépendances entre tâches

- Task 1 (migration) doit être appliquée avant que Task 5 écrive `lignes` en prod, mais le code des Tasks 2–6 peut être développé en parallèle du push migration. Ordre recommandé : 1 → 2 → 3 → 4 → 5 → 6 → 7.
- Tasks 2–6 modifient toutes `app/admin/page.js` : les exécuter séquentiellement (pas en parallèle) pour éviter les conflits d'édition.
