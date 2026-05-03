// app/api/create-payment/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import https from "https"

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phyto-benin.com"
const FEDAPAY_BASE = "https://api.fedapay.com/v1"

export async function POST(req: NextRequest) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { devisId, typeVersement } = body

  if (!devisId || !typeVersement) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
  }

  // 1. Récupérer le devis et le client
  const { data: devis, error: devisError } = await supabase
    .from("devis")
    .select("*, clients(*)")
    .eq("id", devisId)
    .single()

  if (devisError || !devis) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })
  }

  const client = devis.clients
  const montant = typeVersement === "60"
    ? Math.round(devis.montant_total * 0.6)
    : Math.round(devis.montant_total * 0.4)

  const description = typeVersement === "60"
    ? `Acompte 60% — ${devis.prestation} (${devis.numero})`
    : `Solde 40% — ${devis.prestation} (${devis.numero})`

  // 2. Créer l'enregistrement paiement en base
  const { data: paiement, error: paiementError } = await supabase
    .from("paiements")
    .insert({
      devis_id: devisId,
      client_id: devis.client_id,
      type_versement: typeVersement,
      montant,
      statut: "en_attente",
    })
    .select()
    .single()

  if (paiementError || !paiement) {
    return NextResponse.json({ error: "Erreur création paiement: " + paiementError?.message }, { status: 500 })
  }

  const headers = {
    "Authorization": `Bearer ${FEDAPAY_SECRET}`,
    "Content-Type": "application/json",
  }

  // 3. Créer la transaction FedaPay
  let transactionId: string
  try {
    const txRes = await fetch(`${FEDAPAY_BASE}/transactions`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(20000),
      // @ts-ignore
      agent: httpsAgent,
      body: JSON.stringify({
        description,
        amount: montant,
        currency: { iso: "XOF" },
        callback_url: `${SITE_URL}/espace-client/dashboard?paiement=success&devis=${devisId}`,
        cancel_url: `${SITE_URL}/espace-client/devis/${devisId}?status=cancelled`,
        customer: {
          email: client.email,
          firstname: client.prenom || "",
          lastname: client.nom,
          ...(client.telephone ? { phone_number: { number: client.telephone, country: "BJ" } } : {}),
        },
        metadata: {
          paiement_id: paiement.id,
          devis_id: devisId,
          type_versement: typeVersement,
        },
      }),
    })

    const txData = await txRes.json()
    console.log("FedaPay create transaction response:", JSON.stringify(txData))

    // FedaPay retourne { "v1/transaction": { id: ..., payment_url: ... } }
    const tx = txData?.["v1/transaction"] || txData?.v1?.transaction || txData?.transaction
    transactionId = tx?.id
    const directPaymentUrl = tx?.payment_url

    if (!transactionId) {
      return NextResponse.json({
        error: "Transaction FedaPay non créée",
        detail: txData
      }, { status: 502 })
    }

    // L'URL de paiement est directement dans la réponse
    if (directPaymentUrl) {
      await supabase.from("paiements").update({ fedapay_id: String(transactionId) }).eq("id", paiement.id)
      return NextResponse.json({ paymentUrl: directPaymentUrl })
    }
  } catch (err: any) {
    console.error("FedaPay fetch error:", err)
    return NextResponse.json({ error: "Erreur appel FedaPay: " + err.message, cause: err.cause?.toString() }, { status: 502 })
  }

  // 4. Si pas d'URL directe, générer le token séparément
  let paymentUrl: string
  try {
    const tokenRes = await fetch(`${FEDAPAY_BASE}/transactions/${transactionId}/token`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(20000),
      // @ts-ignore
      agent: httpsAgent,
    })
    const tokenData = await tokenRes.json()
    const token = tokenData?.v1?.token || tokenData?.token
    if (!token) {
      return NextResponse.json({ error: "Token FedaPay non généré", detail: tokenData }, { status: 502 })
    }
    paymentUrl = `https://checkout.fedapay.com/${token}`
  } catch (err: any) {
    return NextResponse.json({ error: "Erreur token FedaPay: " + err.message }, { status: 502 })
  }

  // 5. Sauvegarder l'ID transaction
  await supabase
    .from("paiements")
    .update({ fedapay_id: String(transactionId) })
    .eq("id", paiement.id)

  return NextResponse.json({ paymentUrl })
}
