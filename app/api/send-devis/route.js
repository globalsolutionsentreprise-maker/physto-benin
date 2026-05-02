import { NextResponse } from "next/server"

export async function POST(req) {
  try {
    const { clientEmail, clientNom, clientPrenom, devisNumero, prestation, montant, description } = await req.json()
    const montantFormate = Number(montant).toLocaleString("fr-FR")
    const nom = [clientPrenom, clientNom].filter(Boolean).join(" ")
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://phyto-benin.com"

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Georgia,serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <div style="background:#0a2e1a;padding:32px 40px;text-align:center;">
    <div style="color:#d4a920;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:10px;">Global Solutions Entreprise</div>
    <div style="color:#fff;font-size:24px;font-weight:300;">Votre devis est prêt</div>
  </div>
  <div style="padding:40px;">
    <p style="color:#333;font-size:15px;line-height:1.7;margin-top:0;">Bonjour ${nom},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;">Voici le récapitulatif de votre devis :</p>
    <div style="background:#f8f7f4;border:1px solid #e8e6e0;border-left:4px solid #d4a920;border-radius:6px;padding:24px;margin:24px 0;">
      <div style="font-size:11px;color:#d4a920;font-weight:700;text-transform:uppercase;">Référence</div>
      <div style="font-size:18px;font-weight:700;color:#0a2e1a;margin-bottom:16px;">${devisNumero}</div>
      <div style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Prestation</div>
      <div style="font-size:15px;color:#333;margin-bottom:12px;">${prestation}</div>
      ${description ? `<div style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Détails</div><div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:12px;">${description}</div>` : ""}
      <div style="border-top:1px solid #e0ddd6;padding-top:16px;margin-top:4px;">
        <div style="font-size:12px;color:#888;margin-bottom:4px;">Montant total TTC</div>
        <div style="font-size:24px;font-weight:700;color:#0a2e1a;">${montantFormate} FCFA</div>
      </div>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${siteUrl}/espace-client" style="display:inline-block;background:#0a2e1a;color:#d4a920;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:14px;font-weight:700;">
        Accéder à mon espace client →
      </a>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px;font-size:12px;color:#92400e;">
      Ce devis est valable 30 jours · <a href="mailto:contact@phyto-benin.com" style="color:#0a2e1a;">contact@phyto-benin.com</a>
    </div>
  </div>
  <div style="background:#0a2e1a;padding:20px 40px;text-align:center;">
    <div style="color:#d4a920;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Global Solutions Entreprise · Cotonou, Bénin</div>
  </div>
</div>
</body>
</html>`

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY manquant dans les variables d'environnement" }, { status: 500 })
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "GSE Phyto-Bénin <contact@phyto-benin.com>",
        to: [clientEmail],
        subject: `Votre devis ${devisNumero} — Global Solutions Entreprise`,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.message || "Erreur Resend" }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
