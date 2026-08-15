import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

// Matières actives par défaut sur le certificat brouillon (ajustables ensuite).
const MATIERES_DEFAUT = { desinsect: "IMPERA 300 CS", derat: "VERTOX" }
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
function dateFr(iso) {
  if (!iso) return ""
  const [a, m, j] = String(iso).slice(0, 10).split("-")
  if (!a || !m || !j) return ""
  return `${Number(j)} ${MOIS_FR[Number(m) - 1] || ""} ${a}`.trim()
}

// Prépare (jamais n'envoie) le(s) certificat(s) brouillon quand une INTERVENTION
// est marquée terminée. Un certificat par volet vendu (derat / desinsect).
// Idempotent : rien si un certificat existe déjà pour ce passage et ce type.
// Best-effort : une erreur ici ne doit pas bloquer le pointage du passage.
async function preparerCertificats(supabase, interventionId) {
  const { data: interv } = await supabase
    .from("interventions")
    .select("id, devis_id, type_passage, date_intervention, client_nom")
    .eq("id", interventionId)
    .single()
  if (!interv || interv.type_passage === "controle" || !interv.devis_id) return

  const { data: devis } = await supabase
    .from("devis")
    .select("id, client_id, prestation, clients(nom, entreprise, adresse)")
    .eq("id", interv.devis_id)
    .single()
  if (!devis) return

  const prestNorm = String(devis.prestation || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  const types = []
  if (/deratis|rongeur|raticide/.test(prestNorm)) types.push("derat")
  if (/desinsect|insecticide/.test(prestNorm)) types.push("desinsect")
  if (types.length === 0) return

  const cl = devis.clients || {}
  const dateExec = dateFr(interv.date_intervention)
  const auj = new Date()
  for (const type of types) {
    const { data: deja } = await supabase
      .from("certificats")
      .select("id")
      .eq("intervention_id", interventionId)
      .eq("type", type)
      .maybeSingle()
    if (deja) continue
    const form_data = {
      client: cl.nom || interv.client_nom || "",
      entreprise: cl.entreprise || "",
      adresse: cl.adresse || "",
      dateDebut: dateExec,
      dateFin: dateExec,
      dateJour: String(auj.getDate()),
      dateMois: String(auj.getMonth() + 1).padStart(2, "0"),
      matieres: type === "desinsect" ? MATIERES_DEFAUT.desinsect : "",
      matieresDerat: type === "derat" ? MATIERES_DEFAUT.derat : "",
    }
    await supabase.from("certificats").insert({
      numero_unique: `CERT-${type.toUpperCase()}-${auj.getFullYear()}-${randomUUID().slice(0, 8)}`,
      devis_id: devis.id,
      client_id: devis.client_id,
      intervention_id: interventionId,
      type,
      form_data,
    })
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const dynamic = "force-dynamic"

// Un jeton Supabase valide ne suffit PAS : les clients de l'espace client ont
// eux aussi un compte Supabase. Sans le contrôle sur admin_acces ci-dessous,
// n'importe lequel d'entre eux pouvait lire tout le CRM et toute la RH avec le
// jeton de sa propre session. Le contrôle existait uniquement côté navigateur,
// donc il ne protégeait rien.
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
  // En cas d'erreur de lecture, on refuse : une panne ne doit jamais ouvrir
  // l'accès, elle doit le fermer.
  if (error || !acces || acces.actif !== true) return null
  return user
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

  // Pointer un passage de contrat fait / pas fait depuis la frise CRM.
  if (action === "set_passage_statut") {
    const { id, statut } = body
    if (!id || (statut !== "planifiee" && statut !== "terminee")) {
      return Response.json({ error: "id et statut (planifiee|terminee) requis" }, { status: 400 })
    }
    const { error } = await supabase.from("interventions").update({ statut }).eq("id", id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    // Marqué terminé → préparer le(s) certificat(s) brouillon (best-effort).
    if (statut === "terminee") {
      try { await preparerCertificats(supabase, id) }
      catch (e) { console.error("preparerCertificats:", e?.message) }
    }
    return Response.json({ ok: true })
  }

  // Modifier date et/ou technicien(s) d'un passage depuis la frise contrat.
  // Patch partiel : ne touche QUE les champs fournis (jamais les autres,
  // contrairement à save_intervention qui réécrit toute la ligne).
  // personnel_id reste le technicien PRINCIPAL (planning RH) = 1er de la liste.
  if (action === "set_passage_planning") {
    const { id, date, personnelId, personnelIds } = body
    if (!id) return Response.json({ error: "id requis" }, { status: 400 })
    const patch = {}
    if (date !== undefined) patch.date_intervention = date || null
    if (Array.isArray(personnelIds)) {
      patch.personnel_ids = personnelIds
      patch.personnel_id = personnelIds[0] || null
    } else if (personnelId !== undefined) {
      patch.personnel_id = personnelId || null
    }
    if (Object.keys(patch).length === 0) return Response.json({ error: "rien à modifier" }, { status: 400 })
    const { error } = await supabase.from("interventions").update(patch).eq("id", id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  return Response.json({ error: "Action inconnue" }, { status: 400 })
}
