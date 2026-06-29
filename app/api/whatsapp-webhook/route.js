import { createClient } from "@supabase/supabase-js"
import { createHmac } from "crypto"

export const dynamic = "force-dynamic"

const WHATSAPP_TOKEN    = process.env.WHATSAPP_TOKEN
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID
const VERIFY_TOKEN      = process.env.WHATSAPP_VERIFY_TOKEN
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY
const NOTIFY_NUMBER     = process.env.WHATSAPP_NOTIFY_NUMBER
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY

const SYSTEM_PROMPT = `Tu es l'assistant WhatsApp de Phyto Bénin, entreprise agréée d'hygiène sanitaire et phytosanitaire à Cotonou, Bénin.

RÈGLES :
- Tu réponds en français ou en anglais selon la langue du client
- Tu es direct, chaleureux, professionnel — jamais robotique
- Tu ne donnes jamais de prix fixes. Toujours : "diagnostic gratuit, devis ensuite"
- Tu ne génères jamais de devis
- Pour les questions sur les services : désinsectisation, dératisation, désinfection, anti-termites, reptiles/serpents, punaises de lit, contrats d'entretien

COLLECTE DU LEAD :
Après avoir répondu aux questions (max 3 échanges), guide naturellement vers la prise en charge.
Collecte un champ à la fois dans cet ordre : nom, telephone, ville, nuisible (type de problème : cafards/rats/termites/serpents/moustiques/punaises/autre), type_local (maison/restaurant/hôtel/entrepôt/bureau/autre), superficie (moins de 50m²/50-200m²/plus de 200m²), urgence (oui/non).

Quand tu as TOUS les 7 champs, renvoie UNIQUEMENT ce JSON sans aucun texte autour :
{"lead_complet":true,"nom":"...","telephone":"...","ville":"...","nuisible":"...","type_local":"...","superficie":"...","urgence":true}

Si le lead est incomplet (client coupe la conversation), continue normalement.
Ne mets jamais le JSON dans le milieu d'une phrase — soit c'est UNIQUEMENT le JSON, soit c'est UNIQUEMENT du texte.`

// ─── GET : vérification Meta ────────────────────────────────────────────────
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

// ─── POST : messages entrants ────────────────────────────────────────────────
export async function POST(req) {
  const rawBody = await req.text()

  // Vérification signature HMAC-SHA256
  const signature = req.headers.get("x-hub-signature-256") || ""
  const expected  = "sha256=" + createHmac("sha256", WHATSAPP_APP_SECRET).update(rawBody).digest("hex")
  if (signature !== expected) {
    return new Response("Unauthorized", { status: 401 })
  }

  let payload
  try { payload = JSON.parse(rawBody) } catch { return new Response("OK", { status: 200 }) }

  // Extraire le message
  const entry   = payload?.entry?.[0]
  const change  = entry?.changes?.[0]
  const value   = change?.value
  const message = value?.messages?.[0]

  if (!message) return new Response("OK", { status: 200 })

  const phone = message.from
  const type  = message.type

  // Messages non-texte : réponse polie
  if (type !== "text") {
    await sendWhatsApp(phone, "Bonjour ! Envoyez-moi un message texte pour que je puisse vous aider. 😊")
    return new Response("OK", { status: 200 })
  }

  const userText = message.text?.body?.trim() || ""
  if (!userText) return new Response("OK", { status: 200 })

  // Charger historique
  const conv = await loadConversation(phone)

  // Si un lead a déjà été créé lors d'une conversation précédente, on repart sur
  // une conversation neuve : un client qui réécrit = nouveau besoin potentiel.
  // On ne stonewalle plus avec un message de fin (sinon client perdu).
  // register-lead dédoublonne par téléphone sur 24h → pas de lead en double.
  if (conv.lead_created) {
    conv.messages     = []
    conv.lead_created = false
    conv.lead_partial = null
  }

  // Ajouter message utilisateur
  conv.messages.push({ role: "user", content: userText, ts: new Date().toISOString() })

  // Appel Gemini
  const geminiResponse = await callGemini(conv.messages)

  // Détecter si c'est un lead complet
  let leadData = null
  let replyText = geminiResponse

  const trimmed = geminiResponse.trim()
  if (trimmed.startsWith("{") && trimmed.includes('"lead_complet":true')) {
    try {
      leadData = JSON.parse(trimmed)
    } catch {
      // réponse invalide → traiter comme texte
    }
  }

  if (leadData) {
    // Créer le lead
    await createLead(leadData, phone)
    conv.lead_created = true
    replyText = `Parfait ${leadData.nom || ""}, un technicien vous rappelle sur ce numéro sous peu pour organiser votre diagnostic gratuit. Bonne journée ! 🌿`
  }

  // Sauvegarder historique + envoyer réponse en parallèle
  conv.messages.push({ role: "assistant", content: replyText, ts: new Date().toISOString() })
  await Promise.all([
    saveConversation(phone, conv),
    sendWhatsApp(phone, replyText),
  ])

  return new Response("OK", { status: 200 })
}

// ─── Supabase ────────────────────────────────────────────────────────────────
function db() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

async function loadConversation(phone) {
  const { data } = await db()
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone", phone)
    .maybeSingle()

  if (data) return data
  return { phone, messages: [], lead_created: false, lead_partial: null }
}

async function saveConversation(phone, conv) {
  await db().from("whatsapp_conversations").upsert({
    phone,
    messages:     conv.messages,
    lead_created: conv.lead_created,
    lead_partial: conv.lead_partial || null,
    updated_at:   new Date().toISOString(),
  }, { onConflict: "phone" })
}

// ─── Gemini Flash ─────────────────────────────────────────────────────────────
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"]

async function callGemini(messages) {
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      }
    )
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) return text
    // 503 = overloaded, 429 = quota, both → try next model
    if (data?.error?.code !== 503 && data?.error?.code !== 429) break
  }
  return "Je suis désolé, une erreur est survenue. Pouvez-vous réessayer ?"
}

// ─── Meta Cloud API ───────────────────────────────────────────────────────────
async function sendWhatsApp(to, text) {
  await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  })
}

// ─── Création lead ────────────────────────────────────────────────────────────
async function createLead(data, phone) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://physto-benin.vercel.app"

  const urgenceLabel = (data.urgence === true || data.urgence === "oui") ? "🔴 OUI" : "non"
  const notif = NOTIFY_NUMBER ? [
    "🔔 *Nouveau lead WhatsApp*",
    `Nom : ${data.nom || "?"}  |  Tél : ${data.telephone || phone}`,
    `Ville : ${data.ville || "?"}  |  Nuisible : ${data.nuisible || "?"}`,
    `Local : ${data.type_local || "?"}  |  Surface : ${data.superficie || "?"}`,
    `Urgence : ${urgenceLabel}`,
  ].join("\n") : null

  // Enregistrement lead + notification pro en parallèle
  await Promise.all([
    fetch(`${baseUrl}/api/register-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom:       data.nom,
        telephone: data.telephone || phone,
        ville:     data.ville,
        nuisible:  data.nuisible,
        message:   `Local: ${data.type_local || "?"} | Surface: ${data.superficie || "?"} | WhatsApp`,
        urgence:   data.urgence === true || data.urgence === "oui",
      }),
    }),
    notif ? sendWhatsApp(NOTIFY_NUMBER, notif) : Promise.resolve(),
  ])
}
