import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// Soumission publique d'une candidature : validation + CV optionnel (bucket privé)
// + enregistrement + email d'alerte à l'admin. Tout passe par service_role ici.
export async function POST(req) {
  try {
    const body = await req.json()
    const { offreId, nom, telephone, email, ville, experience, motivation, cvBase64, hp } = body

    // Honeypot anti-spam : un bot remplit le champ caché -> on renvoie un faux succès.
    if (hp) return NextResponse.json({ ok: true })
    if (!nom || !String(nom).trim() || !telephone || !String(telephone).trim()) {
      return NextResponse.json({ error: "Nom et téléphone sont obligatoires." }, { status: 400 })
    }
    if (!cvBase64) {
      return NextResponse.json({ error: "Le CV (PDF) est obligatoire pour postuler." }, { status: 400 })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // CV optionnel (PDF en base64). Garde-fou taille : body Vercel plafonné ~4,5 Mo.
    let cv_path = null
    if (cvBase64) {
      const b64 = String(cvBase64).split(",").pop()
      const buf = Buffer.from(b64, "base64")
      if (buf.length > 3 * 1024 * 1024) {
        return NextResponse.json({ error: "Le CV dépasse 3 Mo. Compressez-le ou postulez sans CV." }, { status: 400 })
      }
      const safe = (String(nom).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) || "candidat"
      cv_path = `${safe}-${Date.now()}.pdf`
      const { error: upErr } = await sb.storage.from("candidatures").upload(cv_path, buf, { contentType: "application/pdf", upsert: false })
      if (upErr) cv_path = null // un échec d'upload ne doit pas perdre la candidature
    }

    const { error } = await sb.from("candidatures").insert({
      offre_id: offreId || null,
      nom: String(nom).trim(),
      telephone: String(telephone).trim(),
      email: email ? String(email).trim() : null,
      ville: ville ? String(ville).trim() : null,
      experience: experience ? String(experience).trim() : null,
      motivation: motivation ? String(motivation).trim() : null,
      cv_path,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Alerte email (best-effort, ne bloque pas la réponse au candidat).
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const to = process.env.RECRUTEMENT_EMAIL || "yakoubou.kabir@gmail.com"
      const html = `<h2>Nouvelle candidature</h2>
        <p><strong>${esc(nom)}</strong> vient de postuler sur phyto-benin.com.</p>
        <ul>
          <li>Téléphone : ${esc(telephone)}</li>
          <li>Email : ${esc(email || "-")}</li>
          <li>Ville : ${esc(ville || "-")}</li>
          <li>Expérience : ${esc(experience || "-")}</li>
          <li>CV joint : ${cv_path ? "oui" : "non"}</li>
        </ul>
        <p>Motivation :<br>${esc(motivation || "-")}</p>
        <p>Retrouvez la candidature dans l'admin, onglet Recrutement.</p>`
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "GSE Phyto-Bénin <contact@phyto-benin.com>",
          to: [to],
          subject: `Nouvelle candidature : ${nom}`,
          html,
        }),
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur. Réessayez." }, { status: 500 })
  }
}
