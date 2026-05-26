import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const dynamic = "force-dynamic"

function mapStatut(statut) {
  return { brouillon: "contact", envoye: "devis", accepte: "attente", modification_demandee: "relance", en_cours: "attente", termine: "converti", annule: "echec" }[statut] || "contact"
}

export async function GET() {
  const [{ data: devisList }, { data: depenses }, { data: interventions }] = await Promise.all([
    supabase.from("devis").select("*, clients(id, nom, prenom, entreprise)").order("created_at", { ascending: false }),
    supabase.from("depenses_globales").select("*").order("created_at"),
    supabase.from("interventions").select("devis_id, montant_prestataire").gt("montant_prestataire", 0),
  ])

  // Somme des coûts prestataires par devis
  const prestByDevis = {}
  for (const i of (interventions || [])) {
    if (i.devis_id) prestByDevis[i.devis_id] = (prestByDevis[i.devis_id] || 0) + (i.montant_prestataire || 0)
  }

  const clients = (devisList || []).map(d => {
    const cl = d.clients || {}
    const nom = [cl.prenom, cl.nom].filter(Boolean).join(" ") || cl.entreprise || "Client"
    return {
      id: d.id,
      client: nom,
      provenance: d.provenance || "—",
      prestation: d.prestation || "—",
      montantDevis: d.montant_net || 0,
      statut: d.crm_statut || mapStatut(d.statut),
      commentaire: d.description || "",
      dateDevis: d.date_envoi ? d.date_envoi.split("T")[0] : (d.created_at ? d.created_at.split("T")[0] : ""),
      dateFacture: d.date_facture_crm || "",
      montantFacture: d.montant_facture_crm || (d.crm_statut === "converti" ? d.montant_net : 0),
      depenses: d.depenses_client || 0,
      paiementsRecus: d.paiements_recus || 0,
      dateContact: d.date_contact || (d.created_at ? d.created_at.split("T")[0] : ""),
      typePrestation: d.prestation || "",
      categorie: d.categorie || "Particulier",
      zone: d.zone || "—",
      motifEchec: d.motif_echec || "—",
      attestation: d.attestation_crm || "non",
      typeContrat: d.type_crm || "ponctuel",
      dureeContratMois: d.duree_contrat_mois || 12,
      frequenceIntervention: d.frequence_intervention || "trimestrielle",
      dateDebutContrat: d.date_debut_contrat || "",
      depensesPrestataires: prestByDevis[d.id] || 0,
    }
  })

  const dep = (depenses || []).map(d => ({
    id: d.id,
    libelle: d.libelle,
    montant: d.montant,
    categorie: d.categorie || "autre",
    date: d.date || (d.created_at ? d.created_at.split("T")[0] : ""),
  }))

  return Response.json({ clients, depenses: dep, objectifCA: 0 })
}

export async function POST(req) {
  const body = await req.json()
  const { action } = body

  if (action === "move") {
    const updateData = { crm_statut: body.statut }
    if (body.statut === "converti") {
      const { data: row } = await supabase.from("devis").select("montant_net, montant_facture_crm").eq("id", body.id).single()
      if (row && !row.montant_facture_crm) updateData.montant_facture_crm = row.montant_net || 0
    }
    await supabase.from("devis").update(updateData).eq("id", body.id)
    return Response.json({ ok: true })
  }

  if (action === "save_client") {
    const { id, statut, provenance, zone, categorie, motifEchec, paiementsRecus, depenses, dateContact, attestation, dateFacture, montantFacture, commentaire, montantDevis, typeContrat, dureeContratMois, frequenceIntervention, dateDebutContrat } = body
    await supabase.from("devis").update({
      crm_statut: statut,
      provenance,
      zone,
      categorie,
      motif_echec: motifEchec,
      paiements_recus: paiementsRecus || 0,
      depenses_client: depenses || 0,
      date_contact: dateContact || null,
      attestation_crm: attestation,
      date_facture_crm: dateFacture || null,
      montant_facture_crm: montantFacture || 0,
      description: commentaire,
      montant_net: montantDevis || 0,
      type_crm: typeContrat || "ponctuel",
      duree_contrat_mois: dureeContratMois || 12,
      frequence_intervention: frequenceIntervention || "trimestrielle",
      date_debut_contrat: dateDebutContrat || null,
    }).eq("id", id)
    return Response.json({ ok: true })
  }

  if (action === "add_client") {
    const { client, provenance, zone, categorie, motifEchec, paiementsRecus, depenses, dateContact, attestation, dateFacture, montantFacture, commentaire, montantDevis, statut, typePrestation, typeContrat, dureeContratMois, frequenceIntervention, dateDebutContrat } = body
    // Créer un client Supabase
    const { data: newClient } = await supabase.from("clients").insert({ nom: client, prenom: null, email: null, telephone: null }).select().single()
    if (!newClient) return Response.json({ error: "Erreur création client" }, { status: 500 })

    // Générer un numéro de devis
    const { data: num } = await supabase.rpc("generate_devis_numero")

    const { data: newDevis } = await supabase.from("devis").insert({
      client_id: newClient.id,
      numero: num,
      prestation: typePrestation || "—",
      description: commentaire || "",
      montant_net: montantDevis || 0,
      montant_total: montantDevis || 0,
      statut: "brouillon",
      crm_statut: statut || "contact",
      provenance,
      zone,
      categorie,
      motif_echec: motifEchec,
      paiements_recus: paiementsRecus || 0,
      depenses_client: depenses || 0,
      date_contact: dateContact || null,
      attestation_crm: attestation || "non",
      date_facture_crm: dateFacture || null,
      montant_facture_crm: montantFacture || 0,
      type_crm: typeContrat || "ponctuel",
      duree_contrat_mois: dureeContratMois || 12,
      frequence_intervention: frequenceIntervention || "trimestrielle",
      date_debut_contrat: dateDebutContrat || null,
    }).select().single()

    return Response.json({ ok: true, id: newDevis?.id })
  }

  if (action === "del_client") {
    // Supprimer uniquement le devis (pas le client Supabase)
    await supabase.from("devis").delete().eq("id", body.id)
    return Response.json({ ok: true })
  }

  if (action === "add_depense") {
    const { libelle, montant, date, categorie } = body
    const { data: dep } = await supabase.from("depenses_globales").insert({ libelle, montant, date: date || null, categorie: categorie || "autre" }).select().single()
    return Response.json({ ok: true, dep: { id: dep.id, libelle: dep.libelle, montant: dep.montant, categorie: dep.categorie || "autre", date: dep.date || dep.created_at?.split("T")[0] || "" } })
  }

  if (action === "del_depense") {
    await supabase.from("depenses_globales").delete().eq("id", body.id)
    return Response.json({ ok: true })
  }

  return Response.json({ error: "Action inconnue" }, { status: 400 })
}
