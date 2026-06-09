import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { nom, telephone, email, nuisible, ville, message, urgence } = await req.json()
    if (!nom) return NextResponse.json({ error: "nom requis" }, { status: 400 })

    // Dédup : même téléphone dans les dernières 24h → ignorer
    if (telephone) {
      const since = new Date(Date.now() - 86400000).toISOString()
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("telephone", telephone)
        .gte("created_at", since)
        .maybeSingle()
      if (existing) return NextResponse.json({ ok: true, duplicate: true })
    }

    await supabase.from("leads").insert({
      nom, telephone: telephone || null, email: email || null,
      nuisible: nuisible || null, ville: ville || null,
      message: message || null, urgence: urgence || false,
      offre_bienvenue: true, traite: false,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
