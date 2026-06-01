import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const dynamic = "force-dynamic"

export async function GET() {
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const [{ data: users }, { data: journal }] = await Promise.all([
    db.from("admin_acces").select("*").order("created_at"),
    db.from("admin_journal").select("*").order("created_at", { ascending: false }).limit(100),
  ])
  return NextResponse.json({ users: users || [], journal: journal || [] })
}

export async function POST(req) {
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const body = await req.json()
  const { action } = body

  // Première configuration : crée le premier admin si la table est vide
  if (action === "setup_first_admin") {
    const { count } = await db.from("admin_acces").select("*", { count: "exact", head: true })
    if (count > 0) return NextResponse.json({ error: "Configuration déjà effectuée." }, { status: 400 })
    const { email, password, nom } = body
    if (!email || !password) return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 })
    const { error: authErr } = await db.auth.admin.createUser({ email, password, email_confirm: true })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })
    await db.from("admin_acces").insert({ email, nom: nom || "Administrateur", role: "admin", actif: true })
    return NextResponse.json({ ok: true })
  }

  if (action === "create_user") {
    const { email, password, nom, role } = body
    if (!email || !password || !nom) return NextResponse.json({ error: "Email, mot de passe et nom requis." }, { status: 400 })
    const { error: authErr } = await db.auth.admin.createUser({ email, password, email_confirm: true })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })
    const { error: accErr } = await db.from("admin_acces").insert({ email, nom, role: role || "lecture", actif: true })
    if (accErr) return NextResponse.json({ error: accErr.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === "update_user") {
    const { email, nom, role, actif } = body
    await db.from("admin_acces").update({ nom, role, actif }).eq("email", email)
    return NextResponse.json({ ok: true })
  }

  if (action === "change_password") {
    const { email, password } = body
    const { data: list } = await db.auth.admin.listUsers()
    const user = (list?.users || []).find(u => u.email === email)
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 })
    const { error } = await db.auth.admin.updateUserById(user.id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === "delete_user") {
    const { email } = body
    const { data: list } = await db.auth.admin.listUsers()
    const user = (list?.users || []).find(u => u.email === email)
    if (user) await db.auth.admin.deleteUser(user.id)
    await db.from("admin_acces").delete().eq("email", email)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
}
