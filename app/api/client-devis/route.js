import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Remplace les UPDATE directs de l'espace-client sur `devis`. La policy RLS
// devis_own_update autorisait un client à modifier N'IMPORTE QUELLE colonne de
// son devis (dont montant_total/net → il pouvait baisser son prix avant de
// payer, cf. create-payment qui lit montant_total). Ici on vérifie que le devis
// appartient bien au client (via son JWT) et on n'écrit que des champs non
// financiers whitelistés. La policy est supprimée par la migration rls_hardening.
export async function POST(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { action, devisId, motif } = await req.json()
    if (!devisId) return NextResponse.json({ error: "devisId requis" }, { status: 400 })

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: { user } } = await anon.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "Session invalide" }, { status: 401 })

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Le devis doit appartenir à un client lié à cet utilisateur.
    const { data: devis, error: eDev } = await admin
      .from("devis").select("id, client_id").eq("id", devisId).maybeSingle()
    if (eDev) return NextResponse.json({ error: "Lecture du devis impossible" }, { status: 500 })
    if (!devis) return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    const { data: client, error: eCli } = await admin
      .from("clients").select("user_id").eq("id", devis.client_id).maybeSingle()
    if (eCli) return NextResponse.json({ error: "Lecture du client impossible" }, { status: 500 })
    if (!client || client.user_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    let patch
    if (action === "accepter") {
      patch = { statut: "accepte", date_acceptation: new Date().toISOString() }
    } else if (action === "demander_modification") {
      if (!motif || !motif.trim()) return NextResponse.json({ error: "Motif requis" }, { status: 400 })
      patch = { statut: "modification_demandee", notes_modification: motif.trim() }
    } else {
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
    }

    const { error } = await admin.from("devis").update(patch).eq("id", devisId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
