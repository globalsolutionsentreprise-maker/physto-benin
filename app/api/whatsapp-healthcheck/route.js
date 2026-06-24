export const dynamic = "force-dynamic"

const TOKEN        = process.env.WHATSAPP_TOKEN
const PHONE_ID     = process.env.WHATSAPP_PHONE_ID
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const NOTIFY       = process.env.WHATSAPP_NOTIFY_NUMBER
const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL || "https://www.phyto-benin.com"

async function notify(text) {
  if (!NOTIFY || !TOKEN || !PHONE_ID) return
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: NOTIFY, type: "text", text: { body: text } }),
  })
}

export async function GET() {
  const issues = []

  // 1. Token Meta + statut numéro
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/${PHONE_ID}?fields=display_phone_number,status&access_token=${TOKEN}`
    )
    const d = await r.json()
    if (d.error) {
      issues.push(`❌ Token Meta invalide : ${d.error.message}`)
    } else if (d.status && d.status !== "CONNECTED") {
      issues.push(`⚠️ Numéro WhatsApp hors ligne : statut ${d.status}`)
    }
  } catch (e) {
    issues.push(`❌ Meta API inaccessible : ${e.message}`)
  }

  // 2. Webhook route répond correctement
  try {
    const challenge = `hc-${Date.now()}`
    const r = await fetch(
      `${SITE_URL}/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challenge}`
    )
    const body = await r.text()
    if (body !== challenge) {
      issues.push(`❌ Webhook ne répond pas (reçu : ${body?.slice(0, 60)})`)
    }
  } catch (e) {
    issues.push(`❌ Webhook inaccessible : ${e.message}`)
  }

  if (issues.length > 0) {
    const msg = [
      "🚨 *Bot WhatsApp — ALERTE*",
      ...issues,
      "",
      "→ Vérifier Meta Console : developers.facebook.com",
      "→ Logs Vercel : vercel.com/dashboard",
    ].join("\n")
    await notify(msg)
    return Response.json({ ok: false, issues }, { status: 500 })
  }

  return Response.json({ ok: true, checked_at: new Date().toISOString() })
}
