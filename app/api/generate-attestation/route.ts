// app/api/generate-attestation/route.ts
// Génération / réémission d'une attestation. La logique est dans lib/attestation.js
// (partagée avec valider-paiement). Accès STRICTEMENT réservé à l'administrateur.

import { NextRequest, NextResponse } from "next/server"
import { verifyAdminWrite } from "@/lib/verify-admin"
import { emettreAttestation } from "@/lib/attestation"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  if (!await verifyAdminWrite(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { status, body: resBody } = await emettreAttestation(body?.devisId)
  return NextResponse.json(resBody, { status })
}
