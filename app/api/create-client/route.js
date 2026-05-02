import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { nom, prenom, email, telephone, entreprise } = await req.json()

    if (!nom || !email) {
      return NextResponse.json({ error: "Nom et email obligatoires" }, { status: 400 })
    }

    // Générer un mot de passe temporaire
    const motDePasse = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + "!"

    // 1. Créer le compte Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: motDePasse,
      email_confirm: true,
    })

    if (authError) {
      // Si l'utilisateur existe déjà dans Auth, on continue
      if (!authError.message.includes("already been registered")) {
        return NextResponse.json({ error: "Erreur Auth: " + authError.message }, { status: 500 })
      }
    }

    const userId = authData?.user?.id || null

    // 2. Créer ou mettre à jour le client dans la table clients
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .single()

    let clientId
    if (existingClient) {
      // Mettre à jour le user_id si le client existe déjà
      await supabase.from("clients").update({ user_id: userId, nom, prenom, telephone, entreprise }).eq("email", email)
      clientId = existingClient.id
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({ user_id: userId, nom, prenom, email, telephone, entreprise })
        .select()
        .single()
      if (clientError) return NextResponse.json({ error: "Erreur client: " + clientError.message }, { status: 500 })
      clientId = newClient.id
    }

    // 3. Envoyer l'email de bienvenue avec les identifiants
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://phyto-benin.com"
    const nomComplet = [prenom, nom].filter(Boolean).join(" ")

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Georgia,serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <div style="background:#0a2e1a;padding:32px 40px;text-align:center;">
    <div style="color:#d4a920;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:10px;">Global Solutions Entreprise</div>
    <div style="color:#fff;font-size:22px;font-weight:300;">Bienvenue dans votre espace client</div>
  </div>
  <div style="padding:40px;">
    <p style="color:#333;font-size:15px;line-height:1.7;margin-top:0;">Bonjour ${nomComplet},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;">
      Votre espace client GSE a été créé. Vous pouvez dès maintenant consulter vos devis, suivre vos prestations et effectuer vos paiements en ligne.
    </p>

    <div style="background:#f8f7f4;border:1px solid #e8e6e0;border-left:4px solid #d4a920;border-radius:6px;padding:24px;margin:24px 0;">
      <div style="font-size:13px;font-weight:700;color:#0a2e1a;margin-bottom:16px;">Vos identifiants de connexion</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;padding-bottom:4px;width:40%;">Email</td>
          <td style="font-size:14px;color:#333;font-weight:600;">${email}</td>
        </tr>
        <tr><td colspan="2" style="padding:8px 0;"></td></tr>
        <tr>
          <td style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;padding-bottom:4px;">Mot de passe</td>
          <td style="font-size:16px;color:#0a2e1a;font-weight:700;font-family:monospace;letter-spacing:0.1em;">${motDePasse}</td>
        </tr>
      </table>
    </div>

    <p style="color:#e65c00;font-size:13px;background:#fff7ed;border:1px solid #fed7aa;padding:12px 16px;border-radius:6px;">
      ⚠️ Pensez à changer votre mot de passe après votre première connexion.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${siteUrl}/espace-client" style="display:inline-block;background:#0a2e1a;color:#d4a920;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:14px;font-weight:700;">
        Accéder à mon espace client →
      </a>
    </div>

    <p style="color:#999;font-size:12px;border-top:1px solid #f0ede6;padding-top:20px;">
      Besoin d'aide ? Contactez-nous à <a href="mailto:contact@phyto-benin.com" style="color:#0a2e1a;">contact@phyto-benin.com</a>
    </p>
  </div>
  <div style="background:#0a2e1a;padding:20px 40px;text-align:center;">
    <div style="color:#d4a920;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Global Solutions Entreprise · Cotonou, Bénin</div>
  </div>
</div>
</body>
</html>`

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "GSE Phyto-Bénin <contact@phyto-benin.com>",
        to: [email],
        subject: "Vos accès à l'espace client GSE",
        html,
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) {
      console.error("Resend error:", resendData)
      // On ne bloque pas — le client est créé même si l'email échoue
    }

    return NextResponse.json({
      success: true,
      clientId,
      emailEnvoye: resendRes.ok,
      message: resendRes.ok
        ? "Client créé et email de bienvenue envoyé à " + email
        : "Client créé mais email non envoyé (vérifiez RESEND_API_KEY)"
    })

  } catch (err) {
    console.error("create-client error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
