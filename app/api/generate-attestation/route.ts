// app/api/generate-attestation/route.ts
// Émission d'attestation. La LOGIQUE est dans lib/attestation.js (partagée avec
// valider-paiement). Cette route ne garde que l'autorisation.

import { NextRequest, NextResponse } from "next/server"
import { verifyAdminWrite } from "@/lib/verify-admin"
import { emettreAttestation } from "@/lib/attestation"

export const dynamic = "force-dynamic"

// Appel interne de confiance (webhook server-to-server). Secret DÉDIÉ et OBLIGATOIRE :
// aucun repli service-role. Comparaison à temps constant. (Sera retiré au Lot C avec le webhook.)
function appelInterneValide(req: NextRequest): boolean {
  const s = req.headers.get("x-internal-secret")
  const expected = process.env.ATTESTATION_INTERNAL_SECRET
  if (!s || !expected || s.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export async function POST(req: NextRequest) {
  // Émission autorisée à GSE (rôle admin) OU au webhook interne (secret) — jamais ouverte.
  if (!appelInterneValide(req) && !await verifyAdminWrite(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { status, body: resBody } = await emettreAttestation(body?.devisId)
  return NextResponse.json(resBody, { status })
}
