// app/api/create-payment/route.ts
// Crée une transaction FedaPay et retourne l'URL de paiement

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://physto-benin.vercel.app"

export async function POST(req: NextRequest) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { devisId, typeVersement } = body // typeVersement: '60' | '40'

  if (!devisId || !typeVersement) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
  }

  // Récupérer le devis et le client
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

  // Créer l'enregistrement paiement en base
  const { data: paiement, error: paiementError } = await supabase
    .from("paiements")
    .insert({
      devis_id: devisId,
      client_id: devis.client_id,
      type_versement: typeVersement,
      montant,
      statut: "en_cours",
    })
    .select()
    .single()

  if (paiementError || !paiement) {
    return NextResponse.json({ error: "Erreur création paiement" }, { status: 500 })
  }

  // Créer la transaction FedaPay
  const description = typeVersement === "60"
    ? `Acompte 60% — ${devis.prestation} (Devis ${devis.numero})`
    : `Solde 40% — ${devis.prestation} (Devis ${devis.numero})`

  let fedapayRes: any
  try {
    const res = await fetch("https://api.fedapay.com/v1/transactions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FEDAPAY_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        amount: montant,
        currency: { iso: "XOF" },
        callback_url: `${SITE_URL}/espace-client/paiements?status=success&devis=${devisId}`,
        cancel_url: `${SITE_URL}/espace-client/devis/${devisId}?status=cancelled`,
        customer: {
          email: client.email,
          firstname: client.prenom || "",
          lastname: client.nom,
          phone_number: client.telephone ? {
            number: client.telephone,
            country: "BJ"
          } : undefined,
        },
        metadata: {
          paiement_id: paiement.id,
          devis_id: devisId,
          type_versement: typeVersement,
        },
      }),
    })
    fedapayRes = await res.json()
  } catch (err) {
    console.error("Erreur FedaPay API:", err)
    return NextResponse.json({ error: "Erreur FedaPay" }, { status: 502 })
  }

  const transactionId = fedapayRes?.v1?.transaction?.id
  const token = fedapayRes?.v1?.token

  if (!token) {
    console.error("FedaPay response inattendue:", fedapayRes)
    return NextResponse.json({ error: "Pas de token FedaPay" }, { status: 502 })
  }

  const paymentUrl = `https://checkout.fedapay.com/${token}`

  // Sauvegarder l'URL et l'ID de transaction
  await supabase
    .from("paiements")
    .update({
      fedapay_transaction_id: String(transactionId),
      fedapay_payment_url: paymentUrl,
    })
    .eq("id", paiement.id)

  return NextResponse.json({ paymentUrl })
}
