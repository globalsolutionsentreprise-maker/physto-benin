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

// Champs éditables d'une annonce (whitelist). Ne prend que les clés fournies.
const OFFRE_TXT = ["titre", "description", "profil", "contrat", "lieu", "pourquoi_postuler", "futur_employeur", "avantages", "deplacements", "temps_travail", "stage_duree", "stage_profil", "salaire_devise", "salaire_periode"]
const OFFRE_NUM = ["salaire_min", "salaire_max", "stage_montant"]
const OFFRE_BOOL = ["salaire_visible", "est_stage", "stage_gratifie", "actif"]
function champsOffre(body) {
  const o = {}
  for (const k of OFFRE_TXT) if (body[k] !== undefined) o[k] = (body[k] == null || body[k] === "") ? null : String(body[k])
  for (const k of OFFRE_NUM) if (body[k] !== undefined) { const n = parseInt(body[k], 10); o[k] = Number.isFinite(n) ? n : null }
  for (const k of OFFRE_BOOL) if (body[k] !== undefined) o[k] = !!body[k]
  return o
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
    const o = champsOffre(body)
    if (!o.titre || !o.titre.trim()) return NextResponse.json({ error: "titre requis" }, { status: 400 })
    o.actif = true
    const { error } = await db.from("offres_emploi").insert(o)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === "update_offre") {
    if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 })
    const patch = champsOffre(body)
    if (patch.titre !== undefined && (!patch.titre || !patch.titre.trim())) return NextResponse.json({ error: "titre requis" }, { status: 400 })
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
