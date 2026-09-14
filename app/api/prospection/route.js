import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Même modèle de sécurité que crm-data : un jeton Supabase valide ne suffit pas
// (les clients de l'espace client ont aussi un compte), on vérifie l'appartenance
// à admin_acces.
async function verifyAdmin(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user || !user.email) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: acces, error } = await admin
    .from("admin_acces")
    .select("email, actif")
    .eq("email", user.email)
    .maybeSingle()
  if (error || !acces || acces.actif !== true) return null
  return user
}

const STATUTS = ["a_contacter", "contacte", "relance", "rdv", "gagne", "perdu"]
const PRESTATION_DEFAUT = "Désinsectisation, Dératisation, Désinfection"

export async function GET(req) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!await verifyAdmin(req)) return Response.json({ error: "Non autorisé" }, { status: 401 })
  const url = new URL(req.url)
  const action = url.searchParams.get("action") || "list"

  if (action === "list") {
    const statut = url.searchParams.get("statut")
    const segment = url.searchParams.get("segment")
    const campagne = url.searchParams.get("campagne")
    const relances = url.searchParams.get("relances") === "1"
    const q = (url.searchParams.get("q") || "").trim()

    let query = supabase.from("prospects").select("*")
    if (statut && STATUTS.includes(statut)) query = query.eq("statut", statut)
    if (segment) query = query.eq("segment", segment)
    if (campagne) query = query.eq("campagne", campagne)
    if (relances) query = query.not("prochaine_relance", "is", null).lte("prochaine_relance", new Date().toISOString().split("T")[0])
    if (q) query = query.or(`nom.ilike.%${q}%,telephone.ilike.%${q}%,email.ilike.%${q}%`)
    query = query.order("created_at", { ascending: true })

    const { data: prospects, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Compteurs par statut (pour l'en-tête) + relances du jour, sur toute la base.
    const { data: all } = await supabase.from("prospects").select("statut, prochaine_relance")
    const counts = { total: (all || []).length, relances_du_jour: 0 }
    for (const s of STATUTS) counts[s] = 0
    const today = new Date().toISOString().split("T")[0]
    for (const p of (all || [])) {
      if (p.statut in counts) counts[p.statut]++
      if (p.prochaine_relance && p.prochaine_relance <= today) counts.relances_du_jour++
    }
    // Liste des campagnes distinctes pour le filtre.
    const { data: camps } = await supabase.from("prospects").select("campagne").not("campagne", "is", null)
    const campagnesSet = [...new Set((camps || []).map(c => c.campagne))]

    return Response.json({ prospects: prospects || [], counts, campagnes: campagnesSet })
  }

  return Response.json({ error: "Action inconnue" }, { status: 400 })
}

export async function POST(req) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const adminUser = await verifyAdmin(req)
  if (!adminUser) return Response.json({ error: "Non autorisé" }, { status: 401 })
  const body = await req.json()
  const { action } = body

  if (action === "update_statut") {
    if (!STATUTS.includes(body.statut)) return Response.json({ error: "Statut invalide" }, { status: 400 })
    const patch = { statut: body.statut }
    // Perdu : on garde le motif ; toute autre étape efface un motif résiduel.
    patch.motif_perdu = body.statut === "perdu" ? (body.motif || "Non précisé") : null
    const { error } = await supabase.from("prospects").update(patch).eq("id", body.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  if (action === "log_contact") {
    const patch = { dernier_contact: new Date().toISOString() }
    if (body.canal && ["whatsapp", "tel", "email"].includes(body.canal)) patch.canal = body.canal
    // Un premier contact passe le prospect de « à contacter » à « contacté »
    // (sans écraser un statut plus avancé).
    if (body.avance !== false) {
      const { data: cur } = await supabase.from("prospects").select("statut").eq("id", body.id).single()
      if (cur && cur.statut === "a_contacter") patch.statut = "contacte"
    }
    const { error } = await supabase.from("prospects").update(patch).eq("id", body.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  if (action === "set_relance") {
    // date attendue au format YYYY-MM-DD ; jours=N => today+N.
    let date = body.date || null
    if (!date && body.jours) {
      const d = new Date(); d.setDate(d.getDate() + Number(body.jours))
      date = d.toISOString().split("T")[0]
    }
    const patch = { prochaine_relance: date }
    // Programmer une relance implique qu'on a (re)pris contact.
    const { data: cur } = await supabase.from("prospects").select("statut").eq("id", body.id).single()
    if (cur && (cur.statut === "a_contacter" || cur.statut === "contacte")) patch.statut = "relance"
    const { error } = await supabase.from("prospects").update(patch).eq("id", body.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  if (action === "add_prospect") {
    const p = body.prospect || {}
    if (!p.nom) return Response.json({ error: "nom requis" }, { status: 400 })
    const { data, error } = await supabase.from("prospects").insert({
      nom: p.nom, categorie: p.categorie || null, segment: p.segment || null,
      telephone: p.telephone || null, email: p.email || null,
      ville: p.ville || "Cotonou", adresse: p.adresse || null,
      source: p.source || "manuel", campagne: p.campagne || null,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, prospect: data })
  }

  if (action === "bulk_import") {
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (!rows.length) return Response.json({ error: "Aucune ligne" }, { status: 400 })
    // Dédup sur téléphone déjà présent.
    const { data: existing } = await supabase.from("prospects").select("telephone")
    const seen = new Set((existing || []).map(e => (e.telephone || "").replace(/\D/g, "")))
    const toInsert = []
    for (const r of rows) {
      if (!r.nom) continue
      const digits = (r.telephone || "").replace(/\D/g, "")
      if (digits && seen.has(digits)) continue
      if (digits) seen.add(digits)
      toInsert.push({
        nom: r.nom, categorie: r.categorie || null, segment: r.segment || null,
        telephone: r.telephone || null, email: r.email || null,
        ville: r.ville || "Cotonou", adresse: r.adresse || null,
        source: r.source || "import", campagne: r.campagne || null,
      })
    }
    if (!toInsert.length) return Response.json({ ok: true, inserted: 0, skipped: rows.length })
    const { error } = await supabase.from("prospects").insert(toInsert)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, inserted: toInsert.length, skipped: rows.length - toInsert.length })
  }

  // Bascule en EXÉCUTION : un prospect gagné devient un client + un devis dans le
  // pipeline CRM (crm_statut requis sinon invisible du dashboard). Même chemin que
  // crm-data add_client. On lie le devis au prospect et on le passe « gagné ».
  if (action === "convert_to_devis") {
    const { data: prospect, error: errP } = await supabase.from("prospects").select("*").eq("id", body.id).single()
    if (errP || !prospect) return Response.json({ error: "Prospect introuvable" }, { status: 404 })
    if (prospect.devis_id) return Response.json({ ok: true, devisId: prospect.devis_id, already: true })

    const { data: newClient, error: errC } = await supabase.from("clients").insert({
      nom: prospect.nom, prenom: null, email: prospect.email || null, telephone: prospect.telephone || null,
    }).select().single()
    if (errC || !newClient) return Response.json({ error: "Erreur création client: " + (errC && errC.message) }, { status: 500 })

    // Prestation choisie à la conversion (sinon offre 3D par défaut).
    let prestation = PRESTATION_DEFAUT
    if (Array.isArray(body.prestations) && body.prestations.length) prestation = body.prestations.join(", ")
    else if (typeof body.prestation === "string" && body.prestation.trim()) prestation = body.prestation.trim()

    const numero = "DEV-GSE-" + new Date().getFullYear() + "-" + crypto.randomUUID().slice(0, 8).toUpperCase()
    const { data: newDevis, error: errD } = await supabase.from("devis").insert({
      client_id: newClient.id,
      numero,
      prestation,
      montant_net: 0,
      montant_total: 0,
      statut: "brouillon",
      crm_statut: "contact",
      provenance: "Prospection",
      categorie: prospect.categorie || "Professionnel",
      zone: prospect.ville || "Cotonou",
      description: prospect.notes || "",
    }).select().single()
    if (errD) return Response.json({ error: "Erreur création devis: " + errD.message }, { status: 500 })

    await supabase.from("prospects").update({
      statut: "gagne", devis_id: newDevis.id, dernier_contact: new Date().toISOString(),
    }).eq("id", body.id)

    // Journal : tracer la bascule en exécution.
    await supabase.from("admin_journal").insert({
      user_email: adminUser.email, user_nom: adminUser.email,
      action: "prospect_converti",
      details: prospect.nom + " : prospect converti en devis " + numero,
      devis_id: newDevis.id,
    })

    return Response.json({ ok: true, devisId: newDevis.id })
  }

  if (action === "delete") {
    const { error } = await supabase.from("prospects").delete().eq("id", body.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  return Response.json({ error: "Action inconnue" }, { status: 400 })
}
