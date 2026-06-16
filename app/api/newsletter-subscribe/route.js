import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: normalizedEmail })

    if (insertError) {
      // Code 23505 = violation de contrainte unique (email déjà inscrit) → succès idempotent
      if (insertError.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("newsletter-subscribe error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
