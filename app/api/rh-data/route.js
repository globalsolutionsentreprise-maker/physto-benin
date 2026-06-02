import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const dynamic = "force-dynamic"

async function verifyAdmin(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: { user } } = await anon.auth.getUser(token)
  return user || null
}

export async function GET(req) {
  if (!await verifyAdmin(req)) return Response.json({ error: "Non autorisé" }, { status: 401 })
  const [{ data: personnel }, { data: interventions }, { data: devisList }, { data: tousDevis }] = await Promise.all([
    supabase.from("personnel").select("*").order("nom"),
    supabase.from("interventions").select("*, personnel(id,nom,prenom,poste)").order("date_intervention"),
    supabase.from("devis").select("id, type_crm, frequence_intervention, duree_contrat_mois, date_debut_contrat, montant_net, prestation, clients(nom,prenom,entreprise)").eq("type_crm", "contrat"),
    supabase.from("devis").select("id, type_crm, crm_statut, clients(nom,prenom,entreprise)").neq("crm_statut", "echec").order("created_at", { ascending: false }),
  ])

  const membres = (personnel || []).map(p => ({
    id: p.id, nom: p.nom, prenom: p.prenom, poste: p.poste,
    telephone: p.telephone, email: p.email, statut: p.statut,
    dateEmbauche: p.date_embauche,
    contratDate: p.contrat_date, contratDureeMois: p.contrat_duree_mois,
    cipNumero: p.cip_numero, cipExpiration: p.cip_expiration,
    notes: p.notes,
  }))

  const plannings = (interventions || []).map(i => ({
    id: i.id, devisId: i.devis_id, personnelId: i.personnel_id,
    dateIntervention: i.date_intervention, heureDebut: i.heure_debut?.slice(0, 5) || "08:00",
    statut: i.statut, clientNom: i.client_nom, adresse: i.adresse, notes: i.notes,
    montantPrestataire: i.montant_prestataire || 0,
    typePassage: i.type_passage || "intervention",
    personnel: i.personnel ? { id: i.personnel.id, nom: [i.personnel.prenom, i.personnel.nom].filter(Boolean).join(" "), poste: i.personnel.poste } : null,
  }))

  const contratsCRM = (devisList || []).map(d => {
    const cl = d.clients || {}
    const nom = [cl.prenom, cl.nom].filter(Boolean).join(" ") || cl.entreprise || "Client"
    return { id: d.id, clientNom: nom, typeContrat: d.type_crm, frequence: d.frequence_intervention, duree: d.duree_contrat_mois, dateDebut: d.date_debut_contrat, montant: d.montant_net, prestation: d.prestation }
  })

  // Tous les clients CRM (non-échec) pour le dropdown d'intervention
  const seen = new Set()
  const tousCRM = (tousDevis || []).reduce((acc, d) => {
    const cl = d.clients || {}
    const nom = [cl.prenom, cl.nom].filter(Boolean).join(" ") || cl.entreprise || ""
    if (nom && !seen.has(nom)) {
      seen.add(nom)
      const contrat = contratsCRM.find(c => c.clientNom === nom)
      acc.push({ nom, devisId: contrat?.id || d.id })
    }
    return acc
  }, []).sort((a, b) => a.nom.localeCompare(b.nom, "fr"))

  return Response.json({ membres, plannings, contratsCRM, tousCRM })
}

export async function POST(req) {
  if (!await verifyAdmin(req)) return Response.json({ error: "Non autorisé" }, { status: 401 })
  const body = await req.json()
  const { action } = body

  if (action === "add_personnel") {
    const { nom, prenom, poste, telephone, email, statut, dateEmbauche, contratDate, contratDureeMois, cipNumero, cipExpiration, notes } = body
    const { data } = await supabase.from("personnel").insert({
      nom, prenom, poste, telephone, email, statut: statut || "actif",
      date_embauche: dateEmbauche || null, contrat_date: contratDate || null,
      contrat_duree_mois: contratDureeMois || 0, cip_numero: cipNumero,
      cip_expiration: cipExpiration || null, notes,
    }).select().single()
    return Response.json({ ok: true, id: data?.id })
  }

  if (action === "save_personnel") {
    const { id, nom, prenom, poste, telephone, email, statut, dateEmbauche, contratDate, contratDureeMois, cipNumero, cipExpiration, notes } = body
    await supabase.from("personnel").update({
      nom, prenom, poste, telephone, email, statut: statut || "actif",
      date_embauche: dateEmbauche || null, contrat_date: contratDate || null,
      contrat_duree_mois: contratDureeMois || 0, cip_numero: cipNumero,
      cip_expiration: cipExpiration || null, notes,
    }).eq("id", id)
    return Response.json({ ok: true })
  }

  if (action === "del_personnel") {
    await supabase.from("interventions").update({ personnel_id: null }).eq("personnel_id", body.id)
    await supabase.from("personnel").delete().eq("id", body.id)
    return Response.json({ ok: true })
  }

  if (action === "add_intervention") {
    const { devisId, personnelId, dateIntervention, heureDebut, statut, clientNom, adresse, notes, montantPrestataire } = body
    const { data } = await supabase.from("interventions").insert({
      devis_id: devisId || null, personnel_id: personnelId || null,
      date_intervention: dateIntervention, heure_debut: heureDebut || "08:00",
      statut: statut || "planifiee", client_nom: clientNom, adresse, notes,
      montant_prestataire: montantPrestataire || 0,
    }).select().single()
    return Response.json({ ok: true, id: data?.id })
  }

  if (action === "save_intervention") {
    const { id, devisId, personnelId, dateIntervention, heureDebut, statut, clientNom, adresse, notes, montantPrestataire } = body
    await supabase.from("interventions").update({
      devis_id: devisId || null, personnel_id: personnelId || null,
      date_intervention: dateIntervention, heure_debut: heureDebut || "08:00",
      statut: statut || "planifiee", client_nom: clientNom, adresse, notes,
      montant_prestataire: montantPrestataire || 0,
    }).eq("id", id)
    return Response.json({ ok: true })
  }

  if (action === "del_intervention") {
    await supabase.from("interventions").delete().eq("id", body.id)
    return Response.json({ ok: true })
  }

  return Response.json({ error: "Action inconnue" }, { status: 400 })
}
