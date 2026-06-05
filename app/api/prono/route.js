import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(req) {
  try {
    const { nom, whatsapp, predictions } = await req.json()
    if (!nom?.trim() || !whatsapp?.trim() || !predictions) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
    }
    const db = getDb()
    const { data, error } = await db
      .from("prono_wc2026")
      .insert({ nom: nom.trim(), whatsapp: whatsapp.trim(), predictions })
      .select("id")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = getDb()
    const { data, error } = await db
      .from("prono_wc2026")
      .select("id, nom, created_at, predictions")
      .order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ participants: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
