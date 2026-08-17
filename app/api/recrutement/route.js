import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Réservé à l'admin : jeton Bearer + appartenance à admin_acces (comme rh-data).
async function verifyAdmin(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user || !user.email) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: acces, error } = await admin.from("admin_acces").select("email, actif").eq("email", user.email).maybeSingle()
  if (error || !acces || acces.actif !== true) return null
  return user
}

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function GET(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const db = sb()
  const [{ data: candidatures }, { data: offres }] = await Promise.all([
    db.from("candidatures").select("*").order("created_at", { ascending: false }),
    db.from("offres_emploi").select("*").order("created_at", { ascending: false }),
  ])
  return NextResponse.json({ candidatures: candidatures || [], offres: offres || [] })
}

export async function POST(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const db = sb()
  const body = await req.json()
  const { action } = body

  if (action === "set_candidature_statut") {
    const ok = ["nouveau", "rappeler", "entretien", "retenu", "ecarte"]
    if (!body.id || !ok.includes(body.statut)) return NextResponse.json({ error: "id et statut valides requis" }, { status: 400 })
    const { error } = await db.from("candidatures").update({ statut: body.statut }).eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === "del_candidature") {
    if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 })
    // Supprime aussi le CV du bucket si présent.
    const { data: c } = await db.from("candidatures").select("cv_path").eq("id", body.id).maybeSingle()
    if (c && c.cv_path) await db.storage.from("candidatures").remove([c.cv_path])
    const { error } = await db.from("candidatures").delete().eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === "cv_url") {
    if (!body.path) return NextResponse.json({ error: "path requis" }, { status: 400 })
    const { data, error } = await db.storage.from("candidatures").createSignedUrl(body.path, 3600)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ url: data.signedUrl })
  }

  if (action === "add_offre") {
    if (!body.titre || !String(body.titre).trim()) return NextResponse.json({ error: "titre requis" }, { status: 400 })
    const { error } = await db.from("offres_emploi").insert({
      titre: String(body.titre).trim(),
      description: body.description || null,
      profil: body.profil || null,
      contrat: body.contrat || null,
      lieu: body.lieu || null,
      actif: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === "update_offre") {
    if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 })
    const patch = {}
    for (const k of ["titre", "description", "profil", "contrat", "lieu"]) {
      if (body[k] !== undefined) patch[k] = body[k] || null
    }
    if (body.actif !== undefined) patch.actif = !!body.actif
    if (patch.titre !== undefined && !String(patch.titre).trim()) return NextResponse.json({ error: "titre requis" }, { status: 400 })
    const { error } = await db.from("offres_emploi").update(patch).eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === "toggle_offre") {
    if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 })
    const { error } = await db.from("offres_emploi").update({ actif: !!body.actif }).eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === "del_offre") {
    if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 })
    const { error } = await db.from("offres_emploi").delete().eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
}
