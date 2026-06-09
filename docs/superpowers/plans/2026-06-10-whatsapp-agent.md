# Agent WhatsApp IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un agent WhatsApp IA qui répond aux questions sur les services Phyto Bénin, collecte 7 champs (nom, téléphone, ville, nuisible, type de local, superficie, urgence) et crée un lead dans Supabase.

**Architecture:** Webhook Vercel stateless — chaque message entrant charge l'historique depuis Supabase `whatsapp_conversations`, appelle Gemini Flash avec le contexte complet, sauvegarde la réponse, et envoie via Meta Cloud API. Quand Gemini retourne un JSON `lead_complet`, le webhook appelle `/api/register-lead` et envoie une notification WhatsApp au numéro pro.

**Tech Stack:** Next.js App Router (route.js), Meta WhatsApp Cloud API v19, Google Gemini Flash REST API, Supabase (service role), crypto (Node.js natif)

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `supabase/migrations/20260610120000_whatsapp_conversations.sql` | Créer |
| `app/api/whatsapp-webhook/route.js` | Créer |

---

## Task 1 : Migration Supabase — table `whatsapp_conversations`

**Files:**
- Create: `supabase/migrations/20260610120000_whatsapp_conversations.sql`

- [ ] **Step 1 : Créer le fichier de migration**

```sql
-- supabase/migrations/20260610120000_whatsapp_conversations.sql
create table if not exists whatsapp_conversations (
  id           uuid primary key default gen_random_uuid(),
  phone        text unique not null,
  messages     jsonb not null default '[]',
  lead_created boolean not null default false,
  lead_partial jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_whatsapp_conversations_phone
  on whatsapp_conversations(phone);
```

- [ ] **Step 2 : Pousser la migration**

```bash
npx supabase db push
```

Résultat attendu : `Applying migration 20260610120000_whatsapp_conversations.sql...` sans erreur.

- [ ] **Step 3 : Vérifier dans Supabase Dashboard**

Ouvrir Supabase → Table Editor → vérifier que `whatsapp_conversations` existe avec les colonnes : `id, phone, messages, lead_created, lead_partial, created_at, updated_at`.

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260610120000_whatsapp_conversations.sql
git commit -m "Feat: migration table whatsapp_conversations"
```

---

## Task 2 : Variables d'environnement

**Files:**
- Modify: `.env.local` (dev uniquement, jamais committé)

- [ ] **Step 1 : Ajouter dans `.env.local`**

Ouvrir `.env.local` et ajouter à la fin :

```bash
WHATSAPP_TOKEN=EAAxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_ID=1234567890
WHATSAPP_VERIFY_TOKEN=phyto_benin_webhook_2026
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxx
WHATSAPP_NOTIFY_NUMBER=2290153047950
```

- [ ] **Step 2 : Obtenir les valeurs Meta**

Aller sur [developers.facebook.com](https://developers.facebook.com) → ton app → WhatsApp → API Setup :
- `WHATSAPP_PHONE_ID` = "Phone number ID" (pas le numéro de téléphone)
- `WHATSAPP_TOKEN` = token temporaire (à remplacer plus tard par un token permanent)

- [ ] **Step 3 : Obtenir la clé Gemini**

Aller sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → "Create API key" → copier dans `GEMINI_API_KEY`.

- [ ] **Step 4 : Vérifier que `.env.local` est dans `.gitignore`**

```bash
grep ".env.local" .gitignore
```

Résultat attendu : `.env.local` (ligne présente). Si absent, ajouter `.env.local` dans `.gitignore`.

---

## Task 3 : Webhook route — vérification Meta (GET)

**Files:**
- Create: `app/api/whatsapp-webhook/route.js`

- [ ] **Step 1 : Créer le fichier avec le handler GET**

```javascript
// app/api/whatsapp-webhook/route.js
export const dynamic = "force-dynamic"

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get("hub.mode")
  const token     = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response("Forbidden", { status: 403 })
}

export async function POST(req) {
  return Response.json({ ok: true })
}
```

- [ ] **Step 2 : Tester le GET en local**

```bash
npm run dev
```

Dans un autre terminal :
```bash
curl "http://localhost:3000/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=phyto_benin_webhook_2026&hub.challenge=TEST123"
```

Résultat attendu : `TEST123`

- [ ] **Step 3 : Tester avec mauvais token**

```bash
curl "http://localhost:3000/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=mauvais&hub.challenge=TEST123"
```

Résultat attendu : `Forbidden` avec status 403.

- [ ] **Step 4 : Commit**

```bash
git add app/api/whatsapp-webhook/route.js
git commit -m "Feat: webhook WhatsApp — vérification Meta GET"
```

---

## Task 4 : Webhook POST — vérification signature + extraction message

**Files:**
- Modify: `app/api/whatsapp-webhook/route.js`

- [ ] **Step 1 : Remplacer le handler POST par la version complète**

```javascript
// app/api/whatsapp-webhook/route.js
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const VERIFY_TOKEN    = process.env.WHATSAPP_VERIFY_TOKEN
const WHATSAPP_TOKEN  = process.env.WHATSAPP_TOKEN
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID
const GEMINI_API_KEY  = process.env.GEMINI_API_KEY
const NOTIFY_NUMBER   = process.env.WHATSAPP_NOTIFY_NUMBER

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get("hub.mode")
  const token     = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response("Forbidden", { status: 403 })
}

export async function POST(req) {
  // 1. Vérifier la signature Meta
  const rawBody = await req.text()
  const signature = req.headers.get("x-hub-signature-256") || ""
  const expected = "sha256=" + crypto
    .createHmac("sha256", WHATSAPP_TOKEN)
    .update(rawBody)
    .digest("hex")
  if (signature !== expected) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 2. Parser le payload
  let body
  try { body = JSON.parse(rawBody) } catch { return Response.json({ ok: true }) }

  // 3. Extraire le message texte
  const entry   = body?.entry?.[0]
  const change  = entry?.changes?.[0]
  const value   = change?.value
  const msg     = value?.messages?.[0]
  if (!msg) return Response.json({ ok: true }) // statut de livraison, ignorer

  const phone   = msg.from
  const msgType = msg.type

  // Messages non-texte → réponse polie
  if (msgType !== "text") {
    await sendWhatsApp(phone, "Bonjour ! Envoyez-moi un message texte pour que je puisse vous aider. 🙏")
    return Response.json({ ok: true })
  }

  const userText = msg.text.body

  // 4. Traiter le message (fonction à compléter en Task 5+)
  await handleMessage(phone, userText)
  return Response.json({ ok: true })
}

async function handleMessage(phone, userText) {
  // placeholder — implémenté en Task 5
  console.log("Message de", phone, ":", userText)
}

async function sendWhatsApp(to, text) {
  // placeholder — implémenté en Task 6
  console.log("Envoi à", to, ":", text)
}
```

- [ ] **Step 2 : Tester la signature en local**

```bash
# Mauvaise signature → 401
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=mauvaise" \
  -d '{"entry":[]}'
```

Résultat attendu : `Unauthorized` status 401.

- [ ] **Step 3 : Commit**

```bash
git add app/api/whatsapp-webhook/route.js
git commit -m "Feat: webhook POST — vérification signature Meta + extraction message"
```

---

## Task 5 : Persistance Supabase — chargement et sauvegarde de l'historique

**Files:**
- Modify: `app/api/whatsapp-webhook/route.js`

- [ ] **Step 1 : Ajouter les fonctions Supabase dans le fichier**

Après les imports et déclarations de constantes, ajouter :

```javascript
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function loadConversation(phone) {
  const supabase = getSupabase()
  const { data } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone", phone)
    .maybeSingle()
  return data || { phone, messages: [], lead_created: false, lead_partial: null }
}

async function saveConversation(phone, messages, leadCreated, leadPartial) {
  const supabase = getSupabase()
  await supabase
    .from("whatsapp_conversations")
    .upsert({
      phone,
      messages,
      lead_created: leadCreated,
      lead_partial: leadPartial,
      updated_at: new Date().toISOString(),
    }, { onConflict: "phone" })
}
```

- [ ] **Step 2 : Mettre à jour `handleMessage` pour utiliser l'historique**

```javascript
async function handleMessage(phone, userText) {
  const conv = await loadConversation(phone)

  // Si lead déjà créé → conversation terminée
  if (conv.lead_created) {
    await sendWhatsApp(phone, "Votre demande est déjà enregistrée. Notre technicien vous contactera très bientôt. Merci de votre confiance ! 🙏")
    return
  }

  // Ajouter le message utilisateur à l'historique
  const messages = [...(conv.messages || []), { role: "user", content: userText, ts: new Date().toISOString() }]

  // Appeler Gemini (Task 6)
  const reply = await callGemini(messages)

  // Ajouter la réponse assistant
  messages.push({ role: "assistant", content: reply.text, ts: new Date().toISOString() })

  // Sauvegarder
  await saveConversation(phone, messages, reply.leadComplet, reply.leadData || conv.lead_partial)

  // Si lead complet → créer dans Supabase + notifier (Task 7)
  if (reply.leadComplet && reply.leadData) {
    await createLead(phone, reply.leadData)
    await saveConversation(phone, messages, true, reply.leadData)
  }

  // Envoyer la réponse texte au client
  await sendWhatsApp(phone, reply.text)
}

async function callGemini(messages) {
  // placeholder — implémenté en Task 6
  return { text: "...", leadComplet: false, leadData: null }
}

async function createLead(phone, data) {
  // placeholder — implémenté en Task 7
  console.log("Créer lead pour", phone, data)
}
```

- [ ] **Step 3 : Commit**

```bash
git add app/api/whatsapp-webhook/route.js
git commit -m "Feat: persistance historique conversation Supabase"
```

---

## Task 6 : Intégration Gemini Flash

**Files:**
- Modify: `app/api/whatsapp-webhook/route.js`

- [ ] **Step 1 : Ajouter le prompt système**

Après les déclarations de constantes, ajouter :

```javascript
const SYSTEM_PROMPT = `Tu es l'assistant WhatsApp de Phyto Bénin, entreprise agréée d'hygiène sanitaire et phytosanitaire à Cotonou, Bénin.

RÈGLES :
- Réponds en français ou en anglais selon la langue du client
- Ton direct, chaleureux, professionnel — jamais robotique
- Ne donne jamais de prix fixes. Toujours : "diagnostic gratuit, devis ensuite"
- Ne génère jamais de devis
- Services : désinsectisation (cafards, fourmis, moustiques, mouches), dératisation (rats, souris), désinfection, anti-termites, reptiles/serpents, punaises de lit, contrats d'entretien

COLLECTE DU LEAD :
Après avoir répondu aux questions (max 3 échanges FAQ), guide naturellement vers la prise en charge. Pose une seule question à la fois dans cet ordre :
1. nom complet
2. téléphone (si pas encore connu)
3. ville ou quartier
4. type de nuisible ou problème
5. type de local (maison, restaurant, hôtel, entrepôt, bureau, autre)
6. superficie approximative (moins de 50m², entre 50 et 200m², plus de 200m²)
7. urgence (oui ou non)

Quand tu as les 7 champs, renvoie UNIQUEMENT ce JSON sur une seule ligne, rien avant ni après :
{"lead_complet":true,"nom":"...","telephone":"...","ville":"...","nuisible":"...","type_local":"...","superficie":"...","urgence":true}

Si le client n'a pas encore tous les champs, continue la conversation normalement en texte.`
```

- [ ] **Step 2 : Implémenter `callGemini`**

Remplacer le placeholder `callGemini` par :

```javascript
async function callGemini(messages) {
  // Construire le contenu pour Gemini
  const contents = messages.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
      })
    }
  )

  if (!res.ok) {
    console.error("Gemini error:", await res.text())
    return { text: "Je rencontre un problème technique. Pouvez-vous rappeler le +229 01 53 04 79 50 ? Merci.", leadComplet: false, leadData: null }
  }

  const json = await res.json()
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""

  // Détecter si c'est un JSON lead_complet
  try {
    const parsed = JSON.parse(text)
    if (parsed.lead_complet === true) {
      const confirmText = `Parfait ${parsed.nom} ! Un technicien vous rappelle sur ce numéro sous peu pour organiser le diagnostic gratuit. Bonne journée ! 🙏`
      return { text: confirmText, leadComplet: true, leadData: parsed }
    }
  } catch {
    // Pas un JSON → réponse texte normale
  }

  return { text, leadComplet: false, leadData: null }
}
```

- [ ] **Step 3 : Tester Gemini en isolation**

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=VOTRE_CLE" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"role":"user","parts":[{"text":"Bonjour j ai des cafards"}]}],
    "generationConfig": {"temperature":0.7,"maxOutputTokens":512}
  }'
```

Résultat attendu : réponse JSON avec `candidates[0].content.parts[0].text` non vide.

- [ ] **Step 4 : Commit**

```bash
git add app/api/whatsapp-webhook/route.js
git commit -m "Feat: intégration Gemini Flash pour génération réponses agent"
```

---

## Task 7 : Envoi WhatsApp + création lead + notification

**Files:**
- Modify: `app/api/whatsapp-webhook/route.js`

- [ ] **Step 1 : Implémenter `sendWhatsApp`**

Remplacer le placeholder `sendWhatsApp` par :

```javascript
async function sendWhatsApp(to, text) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text }
      })
    }
  )
  if (!res.ok) console.error("sendWhatsApp error:", await res.text())
}
```

- [ ] **Step 2 : Implémenter `createLead`**

Remplacer le placeholder `createLead` par :

```javascript
async function createLead(phone, data) {
  // Appeler l'API register-lead existante
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://physto-benin.vercel.app"
  await fetch(`${baseUrl}/api/register-lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nom: data.nom || "Client WhatsApp",
      telephone: data.telephone || phone,
      ville: data.ville || null,
      nuisible: data.nuisible || null,
      message: `Type local: ${data.type_local || "—"} | Superficie: ${data.superficie || "—"} | Urgence: ${data.urgence ? "oui" : "non"}`,
      urgence: data.urgence === true,
      email: null,
    })
  })

  // Notifier le numéro pro
  if (NOTIFY_NUMBER) {
    const notif = [
      "🔔 *Nouveau lead WhatsApp*",
      `Nom : ${data.nom}`,
      `Tél : ${data.telephone || phone}`,
      `Ville : ${data.ville || "—"}`,
      `Nuisible : ${data.nuisible || "—"}`,
      `Local : ${data.type_local || "—"}`,
      `Surface : ${data.superficie || "—"}`,
      `Urgence : ${data.urgence ? "✅ oui" : "non"}`,
    ].join("\n")
    await sendWhatsApp(NOTIFY_NUMBER, notif)
  }
}
```

- [ ] **Step 3 : Ajouter `NEXT_PUBLIC_SITE_URL` dans `.env.local`**

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Et sur Vercel, ajouter :
```
NEXT_PUBLIC_SITE_URL=https://physto-benin.vercel.app
```

- [ ] **Step 4 : Commit**

```bash
git add app/api/whatsapp-webhook/route.js
git commit -m "Feat: envoi WhatsApp + création lead + notification pro"
```

---

## Task 8 : Déploiement et configuration webhook Meta

**Files:**
- Aucun fichier modifié — configuration externe

- [ ] **Step 1 : Ajouter les variables d'environnement sur Vercel**

```bash
vercel env add WHATSAPP_TOKEN
vercel env add WHATSAPP_PHONE_ID
vercel env add WHATSAPP_VERIFY_TOKEN
vercel env add GEMINI_API_KEY
vercel env add WHATSAPP_NOTIFY_NUMBER
vercel env add NEXT_PUBLIC_SITE_URL
```

Pour chaque commande : saisir la valeur quand demandé, choisir `Production`.

- [ ] **Step 2 : Déployer sur Vercel**

```bash
git push origin main
```

Attendre le build Vercel (~90s). Vérifier :
```bash
curl "https://physto-benin.vercel.app/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=phyto_benin_webhook_2026&hub.challenge=TEST"
```

Résultat attendu : `TEST`

- [ ] **Step 3 : Configurer le webhook dans Meta Developer Console**

1. Aller sur [developers.facebook.com](https://developers.facebook.com) → ton app → WhatsApp → Configuration
2. Cliquer "Edit" sur Webhook
3. **Callback URL :** `https://physto-benin.vercel.app/api/whatsapp-webhook`
4. **Verify token :** `phyto_benin_webhook_2026`
5. Cliquer "Verify and save"
6. S'abonner aux champs : cocher `messages`

- [ ] **Step 4 : Test end-to-end**

Envoyer "Bonjour" depuis ton téléphone personnel vers le numéro WhatsApp Business. Résultat attendu : l'agent répond en moins de 5 secondes.

- [ ] **Step 5 : Commit final**

```bash
git add .
git commit -m "Feat: agent WhatsApp IA Phyto Bénin — déploiement production"
```

---

## Récapitulatif des fichiers

```
app/api/whatsapp-webhook/route.js          ← nouveau
supabase/migrations/20260610120000_whatsapp_conversations.sql  ← nouveau
.env.local                                 ← modifié (jamais committé)
```

## Variables d'environnement complètes

| Variable | Où obtenir |
|----------|-----------|
| `WHATSAPP_TOKEN` | Meta Developer Console → WhatsApp → API Setup → Temporary token (puis permanent) |
| `WHATSAPP_PHONE_ID` | Meta Developer Console → WhatsApp → API Setup → Phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Chaîne libre, ex: `phyto_benin_webhook_2026` |
| `GEMINI_API_KEY` | aistudio.google.com/apikey |
| `WHATSAPP_NOTIFY_NUMBER` | Ton numéro au format international sans + : `2290153047950` |
| `NEXT_PUBLIC_SITE_URL` | `https://physto-benin.vercel.app` |
