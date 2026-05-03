import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  let payload: any
  try { payload = await req.json() } catch { return new Response("Invalid JSON", { status: 400 }) }

  const eventName = payload?.name
  const transaction = payload?.data?.object

  if (!transaction || eventName !== "transaction.approved") {
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  const metadata = transaction.metadata || {}
  const paiementId = metadata.paiement_id
  const devisId = metadata.devis_id
  const typeVersement = metadata.type_versement

  if (!paiementId || !devisId) {
    return new Response(JSON.stringify({ error: "metadata manquante" }), { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  await supabase.from("paiements").update({
    statut: "confirme",
    fedapay_transaction_id: String(transaction.id),
    confirmed_at: new Date().toISOString(),
  }).eq("id", paiementId)

  if (typeVersement === "60") {
    await supabase.from("devis").update({ statut: "en_cours" }).eq("id", devisId)

  } else if (typeVersement === "40") {
    await supabase.from("devis").update({
      statut: "termine",
      date_livraison: new Date().toISOString(),
    }).eq("id", devisId)

    // Déléguer génération attestation + envoi email à l'API Next.js
    const siteUrl = Deno.env.get("SITE_URL") || "https://phyto-benin.com"
    try {
      await fetch(`${siteUrl}/api/generate-attestation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId }),
      })
    } catch (err) {
      console.error("Erreur appel generate-attestation:", err)
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
