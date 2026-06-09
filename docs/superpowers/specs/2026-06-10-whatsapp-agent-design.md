# Agent WhatsApp IA — Phyto Bénin

**Date :** 2026-06-10
**Statut :** Validé, prêt pour implémentation

---

## Contexte

Phyto Bénin (GSE) a besoin d'un agent conversationnel WhatsApp qui qualifie les prospects 24h/24, répond à leurs questions sur les services, collecte leurs informations et crée automatiquement un lead dans le CRM Supabase existant. L'agent s'arrête à la création du lead — pas de génération de devis. Un technicien humain prend le relais.

---

## Architecture

```
Client WhatsApp
      ↓ message
Meta Cloud API
      ↓ POST
/api/whatsapp-webhook  (Vercel)
      ↓ charge historique
Supabase — table whatsapp_conversations
      ↓ prompt + historique
Gemini Flash  (Google AI, gratuit)
      ↓ réponse générée
      ├─ si lead complet → /api/register-lead (existant)
      │                  → notif WhatsApp sur numéro pro
      └─ réponse texte → Meta Cloud API → Client WhatsApp
```

### Stack

| Brique | Solution | Coût |
|--------|----------|------|
| WhatsApp API | Meta Cloud API | Gratuit (1 000 conv/mois) |
| IA | Google Gemini Flash | Gratuit (1M tokens/jour) |
| Webhook | Vercel (existant) | Gratuit |
| BDD | Supabase (existant) | Gratuit |

---

## Variables d'environnement

| Variable | Description | Source |
|----------|-------------|--------|
| `WHATSAPP_TOKEN` | Token d'accès permanent Meta | Meta Business Manager |
| `WHATSAPP_PHONE_ID` | ID du numéro WhatsApp Business | Meta Developer Console |
| `WHATSAPP_VERIFY_TOKEN` | Token de vérification webhook (chaîne libre) | Défini par l'utilisateur |
| `GEMINI_API_KEY` | Clé API Google AI Studio | aistudio.google.com |
| `WHATSAPP_NOTIFY_NUMBER` | Numéro pour recevoir les notifs lead | Ex: 2290153047950 |

---

## Flow de conversation

### Phase 1 — FAQ (max 3 échanges)
L'agent répond librement aux questions sur les services, zones d'intervention, délais. Il ne donne jamais de prix fixes ("devis gratuit après diagnostic gratuit").

### Phase 2 — Collecte (7 champs, un par un)
1. Nom complet
2. Téléphone (pré-rempli si présent dans le message)
3. Ville / quartier
4. Type de nuisible (cafards, rats, termites, serpents, moustiques, punaises, autre)
5. Type de local (maison, restaurant, hôtel, entrepôt, bureau, autre)
6. Superficie approximative (moins de 50m², 50–200m², plus de 200m²)
7. Urgence (oui / non)

### Phase 3 — Confirmation
> "Parfait [Nom], un technicien vous rappelle sur ce numéro sous peu pour organiser le diagnostic gratuit. Bonne journée !"

### Actions silencieuses après confirmation
- POST `/api/register-lead` → lead dans table `leads` Supabase
- Message WhatsApp de notification sur le numéro pro :
  ```
  🔔 Nouveau lead WhatsApp
  Nom : ...  |  Tél : ...
  Ville : ...  |  Nuisible : ...
  Local : ...  |  Surface : ...
  Urgence : oui/non
  ```

---

## Schéma Supabase

### Nouvelle table : `whatsapp_conversations`

```sql
CREATE TABLE whatsapp_conversations (
  id           uuid primary key default gen_random_uuid(),
  phone        text unique not null,
  messages     jsonb not null default '[]',
  lead_created boolean not null default false,
  lead_partial jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

`messages` : tableau JSONB `[{role: "user"|"assistant", content: "...", ts: "..."}]`
`lead_partial` : champs collectés jusqu'ici si conversation incomplète

---

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `app/api/whatsapp-webhook/route.js` | Créer — cœur du système |
| `supabase/migrations/YYYYMMDD_whatsapp_conversations.sql` | Créer — migration |

---

## Logique du webhook (`route.js`)

```
GET  → vérification Meta (compare hub.verify_token + renvoie hub.challenge)
POST → 
  1. Vérifier signature X-Hub-Signature-256
  2. Extraire phone + texte du payload Meta
  3. Ignorer si message non-texte (image, audio, etc.) — réponse polie
  4. Charger historique whatsapp_conversations depuis Supabase
  5. Construire prompt : système + historique + nouveau message
  6. Appeler Gemini Flash (generateContent)
  7. Parser réponse :
     - Si JSON {lead_complet: true, ...} → register-lead + notif
     - Sinon → réponse texte normale
  8. Sauvegarder messages dans whatsapp_conversations
  9. Envoyer réponse via Meta Cloud API (messages endpoint)
```

---

## Prompt système Gemini

```
Tu es l'assistant WhatsApp de Phyto Bénin, entreprise agréée d'hygiène 
sanitaire et phytosanitaire à Cotonou, Bénin.

RÈGLES :
- Tu réponds en français ou en anglais selon la langue du client
- Tu es direct, chaleureux, professionnel — jamais robotique
- Tu ne donnes jamais de prix fixes. Toujours : "diagnostic gratuit, devis ensuite"
- Tu ne génères jamais de devis
- Pour les questions sur les services : désinsectisation, dératisation, 
  désinfection, anti-termites, reptiles/serpents, punaises de lit, contrats

COLLECTE DU LEAD :
Après avoir répondu aux questions (max 3 échanges), guide naturellement 
vers la prise en charge. Collecte un champ à la fois :
nom, telephone, ville, nuisible, type_local, superficie, urgence

Quand tu as tous les champs, renvoie UNIQUEMENT ce JSON (pas de texte autour) :
{"lead_complet":true,"nom":"...","telephone":"...","ville":"...","nuisible":"...","type_local":"...","superficie":"...","urgence":true/false}

Si lead incomplet (client coupe) : continue la conversation normalement.
```

---

## Règles métier

- **Doublon** : si même téléphone < 24h → confirmer poliment sans recréer de lead (géré par `/api/register-lead` existant)
- **Lead partiel** : si le client part avant de tout donner → sauvegarder `lead_partial` dans `whatsapp_conversations` + créer quand même un lead avec les champs disponibles si on a au moins nom + téléphone
- **Messages non-texte** : répondre "Bonjour ! Envoyez-moi un message texte pour que je puisse vous aider."
- **Hors service** : l'agent ne prend pas de RDV, ne donne pas d'ETA précis, ne promet pas de délai

---

## Sécurité

- Vérification `X-Hub-Signature-256` sur chaque POST entrant (HMAC-SHA256 avec `WHATSAPP_TOKEN`)
- Toutes les clés en variables d'environnement Vercel, jamais dans le code
- `SUPABASE_SERVICE_ROLE_KEY` utilisé côté serveur uniquement
