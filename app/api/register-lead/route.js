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

    const { error: insertError } = await supabase.from("leads").insert({
      nom, telephone: telephone || null, email: email || null,
      nuisible: nuisible || null, ville: ville || null,
      message: message || null, urgence: urgence || false,
      offre_bienvenue: true, traite: false,
    })
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // Notification e-mail à GSE (non bloquant — n'échoue jamais l'enregistrement du lead)
    try {
      const resendKey = process.env.RESEND_API_KEY
      const notifyTo = process.env.LEAD_NOTIFY_EMAIL || "contact@phyto-benin.com"
      if (resendKey) {
        const rows = [
          ["Nom", nom],
          ["Téléphone", telephone],
          ["Email", email],
          ["Nuisible", nuisible],
          ["Ville", ville],
          ["Message", message],
          ["Urgence", urgence ? "⚠️ Oui" : "Non"],
        ].filter((r) => r[1]).map((r) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#666;font-weight:600;white-space:nowrap;">${r[0]}</td><td style="padding:4px 0;">${String(r[1])}</td></tr>`
        ).join("")
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "GSE Phyto-Bénin <contact@phyto-benin.com>",
            to: [notifyTo],
            ...(email ? { reply_to: email } : {}),
            subject: `🌱 Nouveau lead : ${nom}${urgence ? " (URGENT)" : ""}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:520px;color:#111;">
              <h2 style="color:#0a2e1a;margin:0 0 4px;">Nouveau lead — offre de bienvenue</h2>
              <p style="color:#888;font-size:13px;margin:0 0 14px;">Reçu depuis le formulaire du site.</p>
              <table style="border-collapse:collapse;font-size:14px;">${rows}</table>
              <p style="margin-top:18px;font-size:12px;color:#888;">Back-office → CRM Pipeline → Devis → « Leads site ».</p>
            </div>`,
          }),
        })
      }
    } catch (e) {
      console.error("notify lead email error:", e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("register-lead error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
