import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getDb()   { return createClient(SUPABASE_URL, SERVICE_KEY) }
function getAuth() { return createClient(SUPABASE_URL, ANON_KEY)    }

const ALLOWED_PARTAGE_HOSTS = [
  "facebook.com", "www.facebook.com", "m.facebook.com",
  "linkedin.com", "www.linkedin.com",
]

// ─── POST : inscription publique ─────────────────────────────────────────────

export async function POST(req) {
  try {
    const body = await req.json()
    const { nom, whatsapp, predictions } = body

    // Présence des champs obligatoires
    if (!nom?.trim() || !whatsapp?.trim() || !predictions) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
    }

    // Longueur maximale
    if (nom.trim().length > 120) {
      return NextResponse.json({ error: "Nom trop long (max 120 caractères)" }, { status: 400 })
    }
    if (whatsapp.trim().length > 30) {
      return NextResponse.json({ error: "Numéro WhatsApp invalide" }, { status: 400 })
    }

    // Format WhatsApp : chiffres, +, espaces, tirets
    if (!/^\+?[\d\s\-]{7,30}$/.test(whatsapp.trim())) {
      return NextResponse.json({ error: "Numéro WhatsApp invalide (ex: +229 01 23 45 67)" }, { status: 400 })
    }

    // Taille payload predictions (protection anti-flood)
    if (JSON.stringify(predictions).length > 10_000) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 })
    }

    // Validation de l'URL de preuve (sécurité : évite les URLs javascript: et hôtes non autorisés)
    const partageUrl = predictions?.partage?.url
    if (partageUrl) {
      try {
        const parsed = new URL(partageUrl)
        if (!ALLOWED_PARTAGE_HOSTS.includes(parsed.hostname)) {
          return NextResponse.json({ error: "URL de preuve invalide (Facebook ou LinkedIn uniquement)" }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: "URL de preuve invalide" }, { status: 400 })
      }
    }

    // Preuve de partage obligatoire
    if (!partageUrl?.trim() || !predictions?.partage?.confirme) {
      return NextResponse.json({ error: "La preuve de partage est obligatoire" }, { status: 400 })
    }

    const db = getDb()
    const { data, error } = await db
      .from("prono_wc2026")
      .insert({ nom: nom.trim(), whatsapp: whatsapp.trim(), predictions })
      .select("id")
      .single()

    if (error) {
      // Doublon WhatsApp (contrainte UNIQUE)
      if (error.code === "23505") {
        return NextResponse.json({ error: "Ce numéro WhatsApp a déjà participé. 1 prono par participant." }, { status: 409 })
      }
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// ─── GET : liste des participants (admin uniquement) ─────────────────────────

export async function GET(req) {
  try {
    // Vérifie le token Supabase Auth
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const auth = getAuth()
    const { data: { user }, error: authError } = await auth.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const db = getDb()
    const { data, error } = await db
      .from("prono_wc2026")
      .select("id, nom, whatsapp, created_at, predictions")
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
    return NextResponse.json({ participants: data })
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
