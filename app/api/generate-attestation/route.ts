// app/api/generate-attestation/route.ts
// Génère une attestation après paiement complet (40%)

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY = process.env.RESEND_API_KEY!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phyto-benin.com"

export async function POST(req: NextRequest) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const resend = new Resend(RESEND_API_KEY)

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { devisId } = body
  if (!devisId) return NextResponse.json({ error: "devisId manquant" }, { status: 400 })

  const { data: devis, error: devisError } = await supabase
    .from("devis")
    .select("*, clients(*)")
    .eq("id", devisId)
    .single()

  if (devisError || !devis) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })
  }

  // Vérifier qu'une attestation n'existe pas déjà
  const { data: existing } = await supabase
    .from("attestations")
    .select("id, numero_unique, qr_token")
    .eq("devis_id", devisId)
    .single()

  if (existing) {
    return NextResponse.json({ attestationId: existing.id, numero: existing.numero_unique, alreadyExists: true })
  }

  // Générer le numéro unique
  const { data: numeroData } = await supabase.rpc("generate_attestation_numero")
  const numero = numeroData || `ATT-GSE-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
  const client = devis.clients

  const { data: att, error: attError } = await supabase
    .from("attestations")
    .insert({
      devis_id: devisId,
      client_id: devis.client_id,
      numero: numero,
      numero_unique: numero,
      prestation: devis.prestation || devis.objet,
      montant_total: devis.montant_total,
      date_traitement: new Date().toISOString().split("T")[0],
      technicien: "Équipe GSE",
      lieu_intervention: devis.lieu_intervention || client?.adresse || "Cotonou, Bénin",
      responsable_nom: "Direction GSE",
      responsable_titre: "Directeur Général",
      statut: "valide",
    })
    .select()
    .single()

  if (attError || !att) {
    console.error("Erreur création attestation:", attError)
    return NextResponse.json({ error: "Erreur création attestation" }, { status: 500 })
  }

  await supabase.from("devis").update({ statut: "termine" }).eq("id", devisId)

  const verifyUrl = `${SITE_URL}/verifier/${att.qr_token}`
  const attUrl = `${SITE_URL}/espace-client/attestations/${att.id}`

  try {
    await resend.emails.send({
      from: "GSE Phyto Bénin <contact@phyto-benin.com>",
      to: client.email,
      subject: `✅ Attestation de traitement ${numero} — GSE Phyto Bénin`,
      html: buildEmailHtml({ att, client, numero, verifyUrl, attUrl }),
    })
    await supabase
      .from("attestations")
      .update({ email_envoye: true, email_envoye_at: new Date().toISOString() })
      .eq("id", att.id)
  } catch (emailErr) {
    console.error("Erreur envoi email attestation:", emailErr)
  }

  return NextResponse.json({ attestationId: att.id, numero, qrToken: att.qr_token })
}

function buildEmailHtml({ att, client, numero, verifyUrl, attUrl }: any) {
  const dateFormatee = new Date(att.date_traitement || att.generated_at)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:#0a2e1a;padding:24px 32px;border-radius:8px 8px 0 0;">
    <div style="color:#d4a920;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Global Solutions Entreprise</div>
    <div style="color:#fff;font-size:22px;font-weight:700;">Phyto Bénin</div>
  </div>
  <div style="background:#fff;padding:32px;border:1px solid #e8e6e0;border-top:none;">
    <div style="color:#d4a920;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">✅ Prestation terminée</div>
    <h2 style="color:#0a2e1a;margin:0 0 16px;font-size:20px;">Votre attestation est disponible</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 24px;">Bonjour <strong>${client.prenom} ${client.nom}</strong>,<br>Votre prestation <strong>${att.prestation}</strong> a été réalisée avec succès.</p>
    <div style="background:#f7f7f5;border:1px solid #e8e6e0;border-radius:6px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="color:#888;padding-bottom:8px;width:45%;">N° Attestation :</td><td style="font-weight:700;color:#0a2e1a;">${numero}</td></tr>
        <tr><td style="color:#888;padding-bottom:8px;">Date :</td><td style="font-weight:600;color:#333;">${dateFormatee}</td></tr>
        <tr><td style="color:#888;padding-bottom:8px;">Prestation :</td><td style="font-weight:600;color:#333;">${att.prestation}</td></tr>
        <tr><td style="color:#888;">Lieu :</td><td style="font-weight:600;color:#333;">${att.lieu_intervention || "Cotonou, Bénin"}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${attUrl}" style="display:inline-block;background:#0a2e1a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">📄 Consulter & Télécharger l'attestation</a>
    </div>
    <p style="color:#888;font-size:12px;margin:0 0 8px;">Ce document peut être présenté à toute autorité compétente.</p>
    <p style="color:#888;font-size:12px;margin:0;">🔒 Vérifier l'authenticité : <a href="${verifyUrl}" style="color:#0a2e1a;">${verifyUrl}</a></p>
  </div>
  <div style="background:#f0ede6;padding:16px 32px;border-radius:0 0 8px 8px;border:1px solid #e8e6e0;border-top:none;text-align:center;">
    <p style="margin:0;font-size:11px;color:#999;">Global Solutions Entreprise · Cotonou, Bénin · contact@phyto-benin.com</p>
    <p style="margin:4px 0 0;font-size:11px;color:#999;">RCCM : RB/COT/24 B 38910 · IFU : 3202420126111</p>
  </div>
</div>
</body>
</html>`
}
