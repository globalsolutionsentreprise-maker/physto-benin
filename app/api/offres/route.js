import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Liste publique des offres d'emploi actives (lecture seule, service_role).
export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data, error } = await sb
    .from("offres_emploi")
    .select("id, titre, description, profil, contrat, lieu")
    .eq("actif", true)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ offres: data || [] })
}
