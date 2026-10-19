import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Destinataires du suivi commercial hebdomadaire (Fabrice).
const EQUIPE_COMMERCIALE = ["adossoub1@gmail.com"]

const esc = (v) =>
  String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const dateFr = (iso) => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

// Statut lisible d'un lead : non traité = à contacter ; traité = perdu (si motif) ou traité.
function statutLead(l) {
  if (!l.traite) return { label: "À contacter", color: "#633806", bg: "#FAEEDA" }
  if (l.motif) return { label: "Perdu", color: "#72243E", bg: "#FBEAF0" }
  return { label: "Traité", color: "#0C447C", bg: "#E6F1FB" }
}

export async function GET(req) {
  // Déclenché par le cron Vercel (Authorization: Bearer CRON_SECRET). En prod,
  // CRON_SECRET doit être défini : toute requête sans le bon secret est rejetée.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization") || ""
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Tous les leads (à contacter ET traités/perdus), à contacter d'abord,
  // urgents ensuite, puis du plus récent au plus ancien.
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, nom, telephone, email, nuisible, ville, message, urgence, traite, motif, created_at")
    .order("traite", { ascending: true })
    .order("urgence", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = leads || []
  const aContacter = list.filter((l) => !l.traite).length

  const lignes = list
    .map((l) => {
      const st = statutLead(l)
      const besoin = [l.nuisible, l.urgence ? "⚠️ URGENT" : ""].filter(Boolean).join(" · ")
      const note = l.traite && l.motif ? l.motif : l.message || ""
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600;">${esc(l.nom)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;white-space:nowrap;">${esc(l.telephone || "—")}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">${esc(besoin || "—")}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">${esc(l.ville || "—")}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;white-space:nowrap;"><span style="background:${st.bg};color:${st.color};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">${esc(st.label)}</span></td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;white-space:nowrap;">${dateFr(l.created_at)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#666;font-size:12px;">${esc(note || "—")}</td>
      </tr>`
    })
    .join("")

  const semaine = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
  // Bouton unique vers la page de suivi de Fabrice (lien secret, pas un par lead).
  const suiviSecret = process.env.SUIVI_SECRET
  const suiviUrl = suiviSecret ? `https://www.phyto-benin.com/suivi/${suiviSecret}` : null
  const boutonSuivi = suiviUrl
    ? `<p style="margin:0 0 16px;"><a href="${suiviUrl}" style="display:inline-block;background:#0a2e1a;color:#d4a920;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:8px;">▶ Faire le suivi des leads</a></p>`
    : ""
  const html = `<div style="font-family:Arial,sans-serif;max-width:720px;color:#111;">
    <h2 style="color:#0a2e1a;margin:0 0 4px;">Suivi commercial — prospects</h2>
    <p style="color:#888;font-size:13px;margin:0 0 14px;">Semaine du ${semaine} · ${list.length} prospect(s), dont <b>${aContacter} à contacter</b>.</p>
    ${boutonSuivi}
    <table style="border-collapse:collapse;font-size:13px;width:100%;">
      <thead>
        <tr style="background:#0a2e1a;color:#d4a920;text-align:left;">
          <th style="padding:8px 10px;">Nom</th>
          <th style="padding:8px 10px;">Téléphone</th>
          <th style="padding:8px 10px;">Besoin</th>
          <th style="padding:8px 10px;">Ville</th>
          <th style="padding:8px 10px;">Statut</th>
          <th style="padding:8px 10px;">Reçu le</th>
          <th style="padding:8px 10px;">Note / motif</th>
        </tr>
      </thead>
      <tbody>${lignes || `<tr><td colspan="7" style="padding:14px;color:#888;">Aucun prospect enregistré.</td></tr>`}</tbody>
    </table>
    <p style="margin-top:18px;font-size:12px;color:#888;">Appelle en priorité les « À contacter ».${suiviUrl ? ` Après chaque appel, note le résultat (relance, RDV, devis, perdu) directement ici : <a href="${suiviUrl}" style="color:#0a2e1a;font-weight:600;">faire le suivi</a>.` : ""}</p>
  </div>`

  // Envoi via Resend (non bloquant pour le retour cron, mais remonté dans la réponse).
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ ok: true, sent: false, reason: "RESEND_API_KEY absent", count: list.length })

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: "GSE Phyto-Bénin <contact@phyto-benin.com>",
      to: EQUIPE_COMMERCIALE,
      subject: `📋 Prospects à suivre — ${aContacter} à contacter (semaine du ${semaine})`,
      html,
    }),
  })
  const ok = res.ok
  const detail = ok ? null : await res.text().catch(() => null)
  return NextResponse.json({ ok, sent: ok, count: list.length, aContacter, detail })
}
