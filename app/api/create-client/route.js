import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomBytes } from "crypto"
import { verifyAdminWrite } from "@/lib/verify-admin"

export const dynamic = "force-dynamic"

async function creerBrouillonDevis(supabase, clientId, description) {
  try {
    // Numéro garanti unique via crypto (le RPC generate_devis_numero renvoie parfois
    // un doublon → violation de contrainte unique → brouillon jamais créé). Voir lessons.md 2026-06-09.
    const numero = "DEV-GSE-" + new Date().getFullYear() + "-" + crypto.randomUUID().slice(0, 8).toUpperCase()
    const { error } = await supabase.from("devis").insert({
      client_id: clientId,
      numero,
      prestation: "À définir",
      description: description || null,
      montant_net: 0,
      montant_total: 0,
      statut: "brouillon",
      // crm_statut doit être renseigné : le dashboard CRM filtre les devis
      // dont crm_statut IS NULL (crm-data/route.js), sinon le devis est créé
      // mais jamais visible. "contact" = mapping brouillon (voir migration 20260527).
      crm_statut: "contact",
    })
    if (error) console.error("creerBrouillonDevis error:", error.message)
  } catch (e) {
    console.error("creerBrouillonDevis exception:", e.message)
  }
}

// Recherche EXHAUSTIVE d'un compte Auth par email : listUsers() est paginé
// (~50/page), on boucle jusqu'à une page vide. On ne présume pas que le serveur
// honore perPage → condition d'arrêt = page vide, pas « moins que perPage ».
async function findAuthUserId(supabase, email) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 200; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page })
    if (error) return { error }
    const users = data?.users || []
    const hit = users.find((u) => u.email?.toLowerCase() === target)
    if (hit) return { id: hit.id }
    if (users.length === 0) break
  }
  return { id: null }
}

export async function POST(req) {
  if (!await verifyAdminWrite(req)) return NextResponse.json({ error: "Droits insuffisants (admin requis)." }, { status: 403 })
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    let { nom, prenom, email, telephone, entreprise, adresse, ifu, rccm, leadDescription } = await req.json()
    // Normaliser l'email (Supabase Auth stocke en minuscules) → match fiable en
    // .eq() et pas de doublon de fiche par simple différence de casse/espaces.
    email = email ? String(email).trim().toLowerCase() : email

    if (!nom) {
      return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 })
    }

    let userId = null
    let motDePasse = null
    let accountExisted = false
    // Id du compte Auth CRÉÉ pendant CETTE requête (reste null si le compte existait déjà).
    // Seul ce compte est éligible au rollback compensatoire si la fiche client échoue.
    let createdUserId = null

    // Créer un compte Auth uniquement si un email est fourni
    if (email) {
      // Mot de passe initial = aléatoire CRYPTOGRAPHIQUE jamais divulgué (ni email, ni
      // réponse, ni log). Le client définit SON mot de passe via le lien d'activation
      // Supabase (recovery) envoyé plus bas. On ne génère jamais un credential avec
      // Math.random (prévisible). base64url : URL-safe, ~144 bits.
      motDePasse = randomBytes(18).toString("base64url") + "Aa1!"

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: motDePasse,
        email_confirm: true,
      })

      if (authError) {
        if (authError.message.includes("already been registered")) {
          // Compte déjà inscrit : NE PAS réinitialiser son mot de passe, NE PAS envoyer
          // d'identifiants bidon. On récupère son vrai id pour PRÉSERVER le lien fiche ↔ compte
          // (sinon l'update ci-dessous écrivait user_id=null et détachait le client de ses devis RLS).
          accountExisted = true
          motDePasse = null
          const found = await findAuthUserId(supabase, email)
          if (found.error) return NextResponse.json({ error: "Erreur Auth: " + found.error.message }, { status: 500 })
          userId = found.id || null
        } else {
          return NextResponse.json({ error: "Erreur Auth: " + authError.message }, { status: 500 })
        }
      } else {
        userId = authData?.user?.id || null
        createdUserId = userId   // compte neuf : seul candidat au rollback
      }
    }

    // Compensation (rollback best-effort) : Supabase Auth et Postgres ne partagent PAS de
    // transaction. Si la fiche `clients` échoue APRÈS la création d'un compte Auth NEUF dans
    // cette requête, on supprime ce compte pour ne pas laisser d'orphelin Auth. On ne supprime
    // JAMAIS un compte préexistant (createdUserId reste null dans la branche accountExisted),
    // ni un compte retrouvé par email, ni celui d'un autre client. Aucun email/lien n'est émis
    // sur ce chemin (on sort avant le bloc d'activation). Secret jamais divulgué (l'id reste
    // dans les logs serveur, pas dans la réponse).
    async function echecFiche(msg) {
      if (createdUserId) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(createdUserId)
        if (delErr) {
          console.error(`create-client: ROLLBACK ÉCHOUÉ, compte Auth orphelin possible (id=${createdUserId}):`, delErr.message)
          return NextResponse.json({ error: "Erreur client: " + msg, orphanAuthUser: true }, { status: 500 })
        }
        console.error(`create-client: fiche KO → compte Auth créé supprimé par compensation (id=${createdUserId})`)
      }
      return NextResponse.json({ error: "Erreur client: " + msg }, { status: 500 })
    }

    // Créer ou mettre à jour le client dans la table clients
    let clientId
    if (email) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id, user_id")
        .eq("email", email)
        .maybeSingle()

      if (existingClient) {
        // Ne jamais écraser user_id par null : garder le lien existant si on n'a pas
        // (re)trouvé d'id Auth. On ne met user_id que si on a un id valide.
        const fields = { nom, prenom, telephone, entreprise, adresse, ifu: ifu || null, rccm: rccm || null }
        const linkId = userId || existingClient.user_id || null
        if (linkId) fields.user_id = linkId
        const { error: updErr } = await supabase.from("clients").update(fields).eq("email", email)
        if (updErr) return await echecFiche(updErr.message)
        clientId = existingClient.id
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({ user_id: userId, nom, prenom, email, telephone, entreprise, adresse, ifu: ifu || null, rccm: rccm || null })
          .select()
          .single()
        if (clientError) return await echecFiche(clientError.message)
        clientId = newClient.id
      }
    } else {
      // Pas d'email : insertion directe sans compte Auth
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({ user_id: null, nom, prenom, email: null, telephone, entreprise, adresse, ifu: ifu || null, rccm: rccm || null })
        .select()
        .single()
      if (clientError) return NextResponse.json({ error: "Erreur client: " + clientError.message }, { status: 500 })
      clientId = newClient.id

      // Plus de devis brouillon auto : un nouveau client n'a plus de devis fantôme
      // « À définir / 0 FCFA ». Le devis se crée explicitement depuis la fiche client.
      return NextResponse.json({
        success: true,
        clientId,
        emailEnvoye: false,
        message: "Client créé (sans email — devis envoyable par WhatsApp)"
      })
    }

    // Compte déjà inscrit : mot de passe inchangé → ne JAMAIS envoyer d'identifiants
    // (on n'a pas le vrai mot de passe et on ne le réinitialise pas).
    if (accountExisted) {
      return NextResponse.json({
        success: true,
        clientId,
        emailEnvoye: false,
        accountExisted: true,
        message: "Fiche client mise à jour. Le compte existait déjà : mot de passe inchangé, aucun email d'accès envoyé."
      })
    }

    // Email de bienvenue = LIEN D'ACTIVATION (jamais le mot de passe). Le client définit
    // lui-même son mot de passe via le lien de récupération officiel Supabase, qui redirige
    // vers /espace-client/reset-password. Aucun credential n'est transmis en clair.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://phyto-benin.com"
    const nomComplet = [prenom, nom].filter(Boolean).join(" ")

    // Lien d'activation officiel Supabase (généré, PAS envoyé par Supabase : on l'envoie via
    // Resend, comme les autres emails GSE). redirectTo doit être autorisé dans le Dashboard
    // Supabase (Auth → URL Configuration → Redirect URLs).
    let activationLink = null
    try {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${siteUrl}/espace-client/reset-password` },
      })
      if (linkErr) console.error("generateLink error:", linkErr.message)
      else activationLink = linkData?.properties?.action_link || null
    } catch (e) {
      console.error("generateLink exception:", e.message)
    }

    // Bloc d'action : lien direct si disponible, sinon repli explicite « Mot de passe oublié ».
    const actionBlock = activationLink
      ? `<div style="text-align:center;margin:32px 0;">
      <a href="${activationLink}" style="display:inline-block;background:#0a2e1a;color:#d4a920;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:14px;font-weight:700;">
        Activer mon espace et définir mon mot de passe →
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;">Ce lien est à usage unique et expire après un court délai. S'il a expiré, utilisez « Mot de passe oublié ? » sur la page de connexion.</p>`
      : `<div style="text-align:center;margin:32px 0;">
      <a href="${siteUrl}/espace-client" style="display:inline-block;background:#0a2e1a;color:#d4a920;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:14px;font-weight:700;">
        Accéder à mon espace client →
      </a>
    </div>
    <p style="color:#555;font-size:13px;text-align:center;">Pour définir votre mot de passe, cliquez sur « <b>Mot de passe oublié ?</b> » sur la page de connexion avec cette adresse email.</p>`

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
      Votre espace client GSE a été créé. Pour y accéder, définissez votre mot de passe personnel en cliquant sur le bouton ci-dessous. Vous pourrez ensuite consulter vos devis, suivre vos prestations et effectuer vos paiements en ligne.
    </p>

    <div style="background:#f8f7f4;border:1px solid #e8e6e0;border-left:4px solid #d4a920;border-radius:6px;padding:20px 24px;margin:24px 0;">
      <div style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Votre identifiant</div>
      <div style="font-size:14px;color:#333;font-weight:600;">${email}</div>
    </div>

    ${actionBlock}

    <p style="color:#999;font-size:12px;border-top:1px solid #f0ede6;padding-top:20px;">
      Besoin d'aide ? Contactez-nous à <a href="mailto:direction@phyto-benin.com" style="color:#0a2e1a;">direction@phyto-benin.com</a>
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
        from: "GSE Phyto-Bénin <direction@phyto-benin.com>",
        to: [email],
        subject: "Activez votre espace client GSE",
        html,
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) {
      console.error("Resend error:", resendData)
    }

    // Plus de devis brouillon auto (voir plus haut) : le devis se crée à la demande.
    return NextResponse.json({
      success: true,
      clientId,
      emailEnvoye: resendRes.ok,
      activationLinkGenerated: !!activationLink,
      message: resendRes.ok
        ? "Client créé et email d'activation envoyé à " + email
        : "Client créé mais email non envoyé (vérifiez RESEND_API_KEY)"
    })

  } catch (err) {
    console.error("create-client error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
