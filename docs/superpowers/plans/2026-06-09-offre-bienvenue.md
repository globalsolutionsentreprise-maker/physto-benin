# Offre de bienvenue — Remise automatique 10% — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher une offre de bienvenue -10% sur le site public, enregistrer les leads entrants dans Supabase, et pré-appliquer automatiquement la remise dans le CRM admin lors de la création d'un devis.

**Architecture:** Le formulaire de contact envoie en parallèle à Formspree (inchangé) ET à `/api/register-lead` qui stocke le lead dans une table `leads` avec `offre_bienvenue: true`. Dans le CRM (`app/admin/page.js`), un panneau "Leads site web" liste les leads non traités ; l'admin crée le devis depuis ce panneau, ce qui auto-applique `remise_bienvenue = 10` sur le devis. Lors de la génération du contrat, ce champ sert de fallback pour le paramètre `remise`.

**Tech Stack:** Next.js App Router, Supabase (service role), React (createElement style dans admin/page.js), inline styles CSS existants.

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| Supabase migration | Créer table `leads` + colonne `remise_bienvenue` sur `devis` |
| `app/api/register-lead/route.js` | Créer |
| `app/contact/ContactForm.js` | Modifier — appel parallèle + badge |
| `app/layout.tsx` | Modifier — bannière offre |
| `app/page.tsx` | Modifier — section offre |
| `app/api/crm-data/route.js` | Modifier — GET `get_leads` + GET mapping + POST `add_client` |
| `app/admin/page.js` | Modifier — panneau leads + badge + generate-contract remise |

---

## Task 1: Migrations Supabase

**Files:**
- Modify: Supabase via MCP `apply_migration`

- [ ] **Step 1: Appliquer la migration `leads` + `remise_bienvenue`**

SQL à appliquer :
```sql
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  nuisible TEXT,
  ville TEXT,
  message TEXT,
  urgence BOOLEAN DEFAULT false,
  offre_bienvenue BOOLEAN DEFAULT true,
  traite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE devis ADD COLUMN IF NOT EXISTS remise_bienvenue INTEGER DEFAULT 0;
```

- [ ] **Step 2: Vérifier les colonnes**

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'devis' AND column_name = 'remise_bienvenue';
SELECT table_name FROM information_schema.tables WHERE table_name = 'leads';
```

Résultat attendu : 1 ligne pour chaque requête.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Feat: migration Supabase — table leads + colonne remise_bienvenue"
```

---

## Task 2: API `/api/register-lead/route.js`

**Files:**
- Create: `app/api/register-lead/route.js`

- [ ] **Step 1: Créer le fichier**

```js
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { nom, telephone, email, nuisible, ville, message, urgence } = await req.json()
    if (!nom) return NextResponse.json({ error: "nom requis" }, { status: 400 })

    // Dédup : même téléphone dans les dernières 24h → ignorer
    if (telephone) {
      const since = new Date(Date.now() - 86400000).toISOString()
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("telephone", telephone)
        .gte("created_at", since)
        .maybeSingle()
      if (existing) return NextResponse.json({ ok: true, duplicate: true })
    }

    await supabase.from("leads").insert({
      nom, telephone: telephone || null, email: email || null,
      nuisible: nuisible || null, ville: ville || null,
      message: message || null, urgence: urgence || false,
      offre_bienvenue: true, traite: false,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Tester manuellement**

```bash
curl -X POST http://localhost:3000/api/register-lead \
  -H "Content-Type: application/json" \
  -d '{"nom":"Test Client","telephone":"0600000000","email":"test@test.com","nuisible":"Cafards","ville":"Cotonou"}'
```

Résultat attendu : `{"ok":true}`

Vérifier dans Supabase → table `leads` : 1 ligne avec `offre_bienvenue = true`, `traite = false`.

- [ ] **Step 3: Commit**

```bash
git add app/api/register-lead/route.js
git commit -m "Feat: route /api/register-lead — enregistrement leads site web"
```

---

## Task 3: ContactForm.js — appel parallèle + badge

**Files:**
- Modify: `app/contact/ContactForm.js`

- [ ] **Step 1: Ajouter l'appel fire-and-forget dans `handleSubmit`**

Trouver ce bloc (autour de la ligne 33) :
```js
      if (res.ok) {
        setStatut("succes")
        setFormulaire({ nom: "", telephone: "", email: "", nuisible: "", ville: "", message: "", urgence: false })
      } else { setStatut("erreur") }
```

Le remplacer par :
```js
      if (res.ok) {
        setStatut("succes")
        // Fire-and-forget : enregistre le lead dans Supabase pour l'offre bienvenue
        fetch("/api/register-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formulaire),
        }).catch(function() {})
        setFormulaire({ nom: "", telephone: "", email: "", nuisible: "", ville: "", message: "", urgence: false })
      } else { setStatut("erreur") }
```

- [ ] **Step 2: Ajouter le badge offre bienvenue au-dessus du bouton d'envoi**

Trouver ce bloc (autour de la ligne 154) :
```jsx
          <button type="submit" disabled={statut === "envoi"} style={{
```

Insérer AVANT ce bouton :
```jsx
          <div style={{ backgroundColor: "rgba(26,107,56,0.15)", border: "1px solid rgba(26,107,56,0.4)", borderRadius: "6px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "12px", fontWeight: "800", padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>−10%</span>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: "1.4" }}>
              Votre remise de 10% est automatiquement incluse — valable pour toute première demande.
            </span>
          </div>
```

- [ ] **Step 3: Vérifier visuellement**

Lancer `npm run dev`, ouvrir `/contact`. Vérifier :
- Le badge vert/doré "-10%" est visible juste au-dessus du bouton "Envoyer ma demande"
- Soumettre le formulaire → vérifier dans Supabase que la table `leads` reçoit une ligne

- [ ] **Step 4: Commit**

```bash
git add app/contact/ContactForm.js
git commit -m "Feat: formulaire contact — badge offre bienvenue + enregistrement lead Supabase"
```

---

## Task 4: layout.tsx — bannière offre de bienvenue

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Ajouter la bannière entre la navbar et le bandeau urgence**

Dans `app/layout.tsx`, trouver le commentaire `{/* BANDEAU URGENCE */}` (autour de la ligne 241).

Insérer AVANT ce bloc :
```tsx
        {/* OFFRE DE BIENVENUE */}
        <div style={{ backgroundColor: "#1a6b38", padding: "9px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "10px", fontWeight: "800", padding: "3px 9px", borderRadius: "20px", letterSpacing: "0.06em", flexShrink: 0 }}>−10%</span>
            <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "400" }}>
              Offre de bienvenue — <strong>10% de remise</strong> sur votre premier traitement · Pour toute première demande
            </span>
          </div>
          <a href="/contact" style={{ color: "#d4a920", fontSize: "11px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap", letterSpacing: "0.04em", flexShrink: 0 }}>
            En profiter →
          </a>
        </div>
```

- [ ] **Step 2: Vérifier visuellement**

Lancer `npm run dev`, ouvrir n'importe quelle page. Vérifier :
- Bannière verte `-10%` apparaît entre la navbar et le bandeau rouge urgence
- Sur mobile (redimensionner à < 768px) : la bannière doit rester lisible
- Le lien "En profiter →" pointe vers `/contact`

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "Feat: bannière offre de bienvenue -10% dans le layout global"
```

---

## Task 5: page.tsx — section offre de bienvenue

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Localiser l'insertion dans page.tsx**

Dans `app/page.tsx`, chercher la section des témoignages (`temoignages` ou `TÉMOIGNAGES`). La nouvelle section s'insère JUSTE AVANT le début du bloc témoignages.

- [ ] **Step 2: Ajouter la section**

Insérer ce bloc React JSX à l'endroit trouvé :
```tsx
      {/* OFFRE DE BIENVENUE */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "64px 40px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }} className="grid-2">
          <div>
            <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px", textTransform: "uppercase" }}>Offre de bienvenue</div>
            <h2 style={{ fontSize: "32px", fontWeight: "300", color: "#ffffff", lineHeight: "1.2", letterSpacing: "-0.01em", marginBottom: "16px" }}>
              Votre premier traitement à{" "}
              <strong style={{ fontWeight: "700", color: "#d4a920" }}>-10%</strong>
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: "1.7", marginBottom: "32px" }}>
              Chaque nouveau client bénéficie automatiquement d'une remise de 10% sur son premier devis. Valable pour toute première demande, sans condition ni code promo.
            </p>
            <a href="/contact" style={{ display: "inline-block", backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "13px", fontWeight: "700", padding: "14px 28px", textDecoration: "none", letterSpacing: "0.04em" }}>
              Demander un devis gratuit →
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { titre: "Remise automatique", desc: "Aucun code promo à saisir. La remise s'applique d'elle-même sur votre premier devis." },
              { titre: "Valable sur tous nos services", desc: "Désinsectisation, dératisation, désinfection, anti-termites — tous nos traitements sont concernés." },
              { titre: "Remise portée sur le contrat", desc: "Si votre devis débouche sur un contrat annuel, la remise de 10% est conservée." },
            ].map(function(item) {
              return (
                <div key={item.titre} style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#d4a920", flexShrink: 0, marginTop: "6px" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>{item.titre}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: "1.5" }}>{item.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
```

- [ ] **Step 3: Vérifier visuellement**

Ouvrir `/` dans le navigateur. Vérifier :
- La section verte sombre avec le badge `-10%` apparaît entre les chiffres-clés et les témoignages
- Sur mobile : les deux colonnes passent en 1 colonne (la classe `grid-2` gère ça via le media query du layout)

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "Feat: section offre de bienvenue -10% sur la page d'accueil"
```

---

## Task 6: crm-data/route.js — GET mapping + action get_leads

**Files:**
- Modify: `app/api/crm-data/route.js`

- [ ] **Step 1: Exposer `remiseBienvenue` dans le mapping GET**

À la ligne 89-90 de `crm-data/route.js` :
```js
      remise: d.remise || 0,
      remiseType: d.remise_type || "pct",
```

Remplacer par :
```js
      remise: d.remise || 0,
      remiseType: d.remise_type || "pct",
      remiseBienvenue: d.remise_bienvenue || 0,
```

- [ ] **Step 2: Ajouter l'action `get_leads` dans le handler GET**

Dans le handler GET de `crm-data/route.js`, trouver le premier `if (action === ...)` du GET et insérer AVANT :
```js
  if (action === "get_leads") {
    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .eq("traite", false)
      .order("created_at", { ascending: false })
      .limit(20)
    return Response.json({ leads: leads || [] })
  }
```

- [ ] **Step 3: Vérifier**

```bash
curl "http://localhost:3000/api/crm-data?action=get_leads" \
  -H "Authorization: Bearer <token_admin>"
```

Résultat attendu : `{"leads":[...]}` (liste des leads non traités).

- [ ] **Step 4: Commit**

```bash
git add app/api/crm-data/route.js
git commit -m "Feat: crm-data — expose remiseBienvenue + action get_leads"
```

---

## Task 7: crm-data/route.js — add_client avec offreBienvenue

**Files:**
- Modify: `app/api/crm-data/route.js`

- [ ] **Step 1: Modifier l'action `add_client`**

Trouver la ligne 158 :
```js
  if (action === "add_client") {
    const { client, provenance, zone, categorie, motifEchec, paiementsRecus, dateContact, attestation, dateFacture, montantFacture, commentaire, montantDevis, statut, typePrestation, typeContrat, dureeContratMois, frequenceIntervention, dateDebutContrat } = body
```

Remplacer par :
```js
  if (action === "add_client") {
    const { client, provenance, zone, categorie, motifEchec, paiementsRecus, dateContact, attestation, dateFacture, montantFacture, commentaire, montantDevis, statut, typePrestation, typeContrat, dureeContratMois, frequenceIntervention, dateDebutContrat, offreBienvenue, leadId } = body
```

- [ ] **Step 2: Appliquer remise_bienvenue après l'insert du devis**

Trouver la ligne 185 :
```js
    return Response.json({ ok: true, id: newDevis?.id })
```

Remplacer par :
```js
    if (offreBienvenue && newDevis?.id) {
      await supabase.from("devis").update({ remise_bienvenue: 10 }).eq("id", newDevis.id)
      if (leadId) {
        await supabase.from("leads").update({ traite: true }).eq("id", leadId)
      }
    }
    return Response.json({ ok: true, id: newDevis?.id })
```

- [ ] **Step 3: Vérifier**

Créer un lead dans la table `leads` manuellement via Supabase dashboard. Puis appeler `add_client` avec `offreBienvenue: true` et `leadId: <uuid_du_lead>`. Vérifier :
- Le devis créé a `remise_bienvenue = 10`
- Le lead a `traite = true`

- [ ] **Step 4: Commit**

```bash
git add app/api/crm-data/route.js
git commit -m "Feat: crm-data add_client — remise_bienvenue automatique depuis lead site web"
```

---

## Task 8: admin/page.js — panneau leads + pré-remplissage remise + generate-contract

**Files:**
- Modify: `app/admin/page.js`

**Contexte architecture :**
- `admin/page.js` lit les devis directement depuis Supabase — les objets devis ont des champs snake_case (`d.remise_bienvenue`)
- `admin/page.js` crée les clients via `/api/create-client` (ligne 1504)
- `admin/page.js` édite les devis via `db.from("devis").update(...)` (pas via crm-data)
- `ouvrirEditionDevis` (ligne 1530) ouvre le formulaire d'édition — c'est ici qu'on pré-remplit la remise

### Partie A — Charger les leads au démarrage

- [ ] **Step 1: Ajouter l'état et le chargement des leads**

Chercher `const [` ou `var [` groupés au début du composant principal (chercher `React.useState` vers les premières lignes du composant). Ajouter :
```js
var [leads, setLeads] = React.useState([])
```

Chercher la fonction `charger` (ou `chargerDonnees`) qui charge les données initiales. Trouver l'endroit où elle lance ses fetches et ajouter :
```js
// Charger les leads site web non traités
fetch("/api/crm-data?action=get_leads", {
  headers: { "Authorization": "Bearer " + (localStorage.getItem("gse_admin_token") || "") }
}).then(function(r) { return r.json() })
  .then(function(data) { if (data.leads) setLeads(data.leads) })
  .catch(function() {})
```

### Partie B — Panneau leads en haut de l'interface

- [ ] **Step 2: Localiser le point d'insertion**

Chercher dans `admin/page.js` le rendu principal (grep `"Devis en cours"\|"Tableau de bord"\|renderVue\|vue ===`). Identifier où commence le contenu principal après la navbar admin. Insérer le panneau leads JUSTE AVANT le premier bloc de contenu, conditionnel à `leads.length > 0`.

- [ ] **Step 3: Insérer le panneau**

```js
leads.length > 0 && React.createElement("div", {
  style: { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "20px 24px", marginBottom: "24px" }
},
  React.createElement("div", {
    style: { fontSize: "11px", color: "#166534", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "14px" }
  }, "DEMANDES SITE WEB — " + leads.length + " en attente"),
  leads.map(function(lead) {
    return React.createElement("div", {
      key: lead.id,
      style: { display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", border: "1px solid #dcfce7", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px", gap: "12px", flexWrap: "wrap" }
    },
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", { style: { fontWeight: "700", fontSize: "14px", color: "#0a2e1a" } }, lead.nom),
        React.createElement("div", { style: { fontSize: "12px", color: "#666", marginTop: "2px" } },
          [lead.nuisible, lead.ville, lead.telephone, lead.email].filter(Boolean).join(" · ")
        ),
        lead.message && React.createElement("div", { style: { fontSize: "11px", color: "#999", marginTop: "3px", fontStyle: "italic" } }, lead.message.slice(0, 80) + (lead.message.length > 80 ? "…" : ""))
      ),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 } },
        React.createElement("span", {
          style: { backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "20px" }
        }, "−10% offre bienvenue"),
        React.createElement("button", {
          onClick: function() {
            // Crée le client+devis via crm-data add_client avec offreBienvenue=true
            fetch("/api/crm-data", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + (localStorage.getItem("gse_admin_token") || "")
              },
              body: JSON.stringify({
                action: "add_client",
                client: lead.nom,
                provenance: "Site web",
                zone: lead.ville || "",
                categorie: lead.nuisible || "",
                statut: "contact",
                dateContact: new Date().toISOString().split("T")[0],
                offreBienvenue: true,
                leadId: lead.id
              })
            }).then(function(r) { return r.json() })
              .then(function(data) {
                if (data.ok) {
                  setLeads(function(prev) { return prev.filter(function(l) { return l.id !== lead.id }) })
                  setMsg("✓ Client créé avec remise bienvenue −10% (ID devis: " + data.id + ")")
                } else {
                  setMsg("Erreur: " + (data.error || "Échec"))
                }
              })
              .catch(function() { setMsg("Erreur réseau") })
          },
          style: { backgroundColor: "#0a2e1a", color: "#d4a920", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }
        }, "Créer devis →")
      )
    )
  })
)
```

### Partie C — Pré-remplir remise dans ouvrirEditionDevis

- [ ] **Step 4: Modifier `ouvrirEditionDevis` pour pré-remplir la remise (ligne 1547)**

Trouver à la ligne **1547** dans `ouvrirEditionDevis` :
```js
      remise: "",
```

Remplacer par :
```js
      remise: d.remise_bienvenue ? String(d.remise_bienvenue) : "",
```

### Partie D — Badge remise bienvenue dans la liste des devis

- [ ] **Step 5: Afficher le badge**

Chercher dans `admin/page.js` l'endroit où un numéro de devis est affiché (grep `d.numero\|editingDevis.numero`). À proximité du numéro de devis dans le rendu liste, ajouter conditionnellement :
```js
d.remise_bienvenue > 0 && React.createElement("span", {
  style: { backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "20px", marginLeft: "6px", verticalAlign: "middle" }
}, "−10%")
```

### Partie E — generate-contract : remise fallback depuis remise_bienvenue

- [ ] **Step 6: "Générer directement" — ligne 3649**

Trouver le bloc `var params = new URLSearchParams({` pour le bouton "Générer directement" (autour de la ligne 3649). Ajouter `remise` dans les params :

```js
var params = new URLSearchParams({
  devisId: d.id,
  prixAnnuel: prixAn,
  prixTrimestre: Math.round(prixAn / freq.passages),
  formule: "Formule Intégrale",
  passages: freq.passages,
  controles: freq.controles,
  duree: 12,
  paiement: freq.paiement,
  typeEtablissement: contratForm.typeEtablissement,
  remise: d.remise_bienvenue || 0,
  sansNoteDevis: contratForm.inclureNoteDevis ? "0" : "1"
})
```

- [ ] **Step 7: "Générer le contrat" IA — ligne 3748**

Trouver `remise: a.remiseContrat || 0` (ligne ~3748). Remplacer par :
```js
remise: a.remiseContrat || d.remise_bienvenue || 0,
```

- [ ] **Step 8: Vérifier le flux complet**

1. Soumettre formulaire `/contact` → vérifier lead créé dans Supabase (`traite = false`)
2. Ouvrir admin → panneau "Demandes site web" visible avec le lead
3. Cliquer "Créer devis →" → vérifier :
   - devis créé avec `remise_bienvenue = 10` dans Supabase
   - lead marqué `traite = true`
   - message "✓ Client créé avec remise bienvenue −10%" affiché
4. Trouver le devis dans la liste → badge "−10%" visible
5. Ouvrir édition du devis → champ remise pré-rempli à "10"
6. Générer le contrat → URL contient `remise=10`
7. PDF contrat : ligne "Remise contrat annuel (10%)" visible

- [ ] **Step 9: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: admin — panneau leads site web + badge + remise bienvenue auto dans contrats"
```

---

## Checklist de recette finale

- [ ] Bannière `-10%` visible sur toutes les pages (layout)
- [ ] Section offre visible sur la homepage entre chiffres et témoignages
- [ ] Badge `-10%` visible dans le formulaire de contact au-dessus du bouton
- [ ] Soumission formulaire → lead créé dans Supabase (`offre_bienvenue=true`, `traite=false`)
- [ ] Dedup : soumettre deux fois le même téléphone → 1 seul lead créé
- [ ] CRM → panneau "Demandes site web" liste les leads non traités
- [ ] "Créer devis →" depuis le panneau → devis avec `remise_bienvenue=10` + lead marqué `traite=true`
- [ ] Badge "Offre bienvenue −10%" visible sur le devis dans le CRM
- [ ] Génération contrat depuis ce devis → paramètre `remise=10` dans l'URL
- [ ] PDF contrat : remise 10% affichée correctement
