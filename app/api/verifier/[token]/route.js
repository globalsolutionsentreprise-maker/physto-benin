import { createClient } from "@supabase/supabase-js"

// Vérification PUBLIQUE d'une attestation à partir de son qr_token.
// Remplace la lecture directe de `attestations` par la clé anon dans
// app/verifier/[token]/page.tsx (lecture anon retirée par le correctif RLS :
// suppression de la policy permissive admin_all_attestations).
//
// Sécurité :
//  - service_role UNIQUEMENT, côté serveur (jamais exposé au navigateur).
//  - ne renvoie QUE les champs nécessaires à la vérification (pas de montant,
//    e-mail, téléphone, adresse, ids internes, devis_id, ifu/rccm…).
//  - ne confirme QUE les attestations statut='valide' ; tout le reste
//    (inexistant, annulé/révoqué, token mal formé) => 404 {valid:false},
//    sans distinction, pour ne pas divulguer l'existence d'un token.
//  - lecture seule : aucune écriture, aucune modification métier.

export const dynamic = "force-dynamic"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function serviceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

const NOT_VALID = { valid: false }

export async function GET(req, ctx) {
  // Next 16 : params est asynchrone.
  const { token } = await ctx.params

  // Validation d'entrée : qr_token est un gen_random_uuid()::text.
  if (!token || typeof token !== "string" || !UUID_RE.test(token)) {
    return Response.json(NOT_VALID, { status: 404 })
  }

  const sb = serviceDb()
  if (!sb) {
    // Mauvaise config serveur — ne pas divulguer de détail.
    return Response.json({ valid: false, error: "Service indisponible." }, { status: 503 })
  }

  const { data, error } = await sb
    .from("attestations")
    .select("id, numero_unique, numero, prestation, date_traitement, generated_at, lieu_intervention, statut, clients(nom, prenom, entreprise)")
    .eq("qr_token", token)
    .eq("statut", "valide")
    .maybeSingle()

  if (error) {
    // Erreur de lecture : fail-closed, pas de détail technique au public.
    return Response.json({ valid: false, error: "Vérification impossible." }, { status: 502 })
  }
  if (!data) {
    return Response.json(NOT_VALID, { status: 404 })
  }

  const c = data.clients || {}
  const beneficiaire = [c.prenom, c.nom].filter(Boolean).join(" ").trim() || null

  // Réponse minimale : uniquement ce qui sert à vérifier l'authenticité.
  return Response.json(
    {
      valid: true,
      attestation: {
        numero_unique: data.numero_unique || data.numero || null,
        prestation: data.prestation || null,
        date_traitement: data.date_traitement || null,
        generated_at: data.generated_at || null,
        lieu_intervention: data.lieu_intervention || null,
        // Partie « émise à » — déjà visible sur le document scanné, rien de neuf.
        clients: { nom: c.nom || null, prenom: c.prenom || null, entreprise: c.entreprise || null },
        beneficiaire,
        // Référence de registre purement cosmétique (8 hex, non requêtable).
        ref: typeof data.id === "string" ? data.id.slice(0, 8) : null,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  )
}
