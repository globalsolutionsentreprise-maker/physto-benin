import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

async function verifyAdmin(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: { user } } = await anon.auth.getUser(token)
  return user || null
}

function mapStatut(statut) {
  return { brouillon: "contact", envoye: "devis", accepte: "attente", modification_demandee: "relance", en_cours: "attente", termine: "converti", annule: "echec" }[statut] || "contact"
}

export async function GET(req) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!await verifyAdmin(req)) return Response.json({ error: "Non autorisé" }, { status: 401 })
  const url = new URL(req.url)
  const action = url.searchParams.get("action")

  if (action === "get_leads") {
    const { data: leads } = await supabase
      .from("leads")
      .select("id, nom, telephone, email, nuisible, ville, message, urgence, created_at")
      .eq("traite", false)
      .order("created_at", { ascending: false })
      .limit(20)
    return Response.json({ leads: leads || [] })
  }

  const [{ data: devisList }, { data: depenses }, { data: interventions }, { data: depDevis }, { data: personnelList }] = await Promise.all([
    supabase.from("devis").select("*, clients(id, nom, prenom, entreprise, email, telephone, ifu, rccm)").order("created_at", { ascending: false }),
    supabase.from("depenses_globales").select("*").order("created_at"),
    supabase.from("interventions").select("devis_id, montant_prestataire").gt("montant_prestataire", 0),
    supabase.from("depenses_devis").select("*").order("created_at"),
    supabase.from("personnel").select("id, nom, prenom, poste").order("nom"),
  ])

  // Somme des coûts prestataires par devis
  const prestByDevis = {}
  for (const i of (interventions || [])) {
    if (i.devis_id) prestByDevis[i.devis_id] = (prestByDevis[i.devis_id] || 0) + (i.montant_prestataire || 0)
  }

  // Dépenses détaillées par devis
  const depItemsByDevis = {}
  for (const d of (depDevis || [])) {
    if (!depItemsByDevis[d.devis_id]) depItemsByDevis[d.devis_id] = []
    depItemsByDevis[d.devis_id].push({
      id: d.id, libelle: d.libelle, montant: d.montant || 0,
      categorie: d.categorie || "autre",
      date: d.date || (d.created_at ? d.created_at.split("T")[0] : ""),
    })
  }

  const clients = (devisList || []).filter(d => d.crm_statut !== null).map(d => {
    const cl = d.clients || {}
    const nom = [cl.prenom, cl.nom].filter(Boolean).join(" ") || cl.entreprise || "Client"
    const items = depItemsByDevis[d.id] || []
    const depensesItemsTotal = items.reduce((s, i) => s + (i.montant || 0), 0)
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
      depenses: depensesItemsTotal || d.depenses_client || 0,
      depensesItems: items,
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
      ifu: cl.ifu || "",
      rccm: cl.rccm || "",
      numero: d.numero || "",
      email: cl.email || "",
      telephone: cl.telephone || "",
      entreprise: cl.entreprise || "",
      superficie: d.superficie || "",
      prixM2: d.prix_m2 || "",
      prixParPrestation: d.prix_par_prestation || {},
      montantBrut: d.montant_brut || 0,
      remise: d.remise || 0,
      remiseType: d.remise_type || "pct",
      remiseBienvenue: d.remise_bienvenue || 0,
      pctAcompte: d.pct_acompte || 60,
      conditionsPaiement: d.conditions_paiement || "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention.",
    }
  })

  const dep = (depenses || []).map(d => ({
    id: d.id,
    libelle: d.libelle,
    montant: d.montant,
    categorie: d.categorie || "autre",
    date: d.date || (d.created_at ? d.created_at.split("T")[0] : ""),
  }))

  const membres = (personnelList || []).map(p => ({
    id: p.id,
    nom: [p.prenom, p.nom].filter(Boolean).join(" "),
    poste: p.poste || "",
  }))

  return Response.json({ clients, depenses: dep, objectifCA: 0, membres })
}

export async function POST(req) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!await verifyAdmin(req)) return Response.json({ error: "Non autorisé" }, { status: 401 })
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
    const { id, client, statut, provenance, zone, categorie, motifEchec, paiementsRecus, dateContact, attestation, dateFacture, montantFacture, commentaire, montantDevis, typeContrat, dureeContratMois, frequenceIntervention, dateDebutContrat } = body
    await supabase.from("devis").update({
      crm_statut: statut,
      provenance,
      zone,
      categorie,
      motif_echec: motifEchec,
      paiements_recus: paiementsRecus || 0,
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
    const { data: devisRow } = await supabase.from("devis").select("client_id").eq("id", id).single()
    if (devisRow?.client_id) {
      const clientUpdate = { ifu: body.ifu ?? null, rccm: body.rccm ?? null }
      if (client) clientUpdate.nom = client
      await supabase.from("clients").update(clientUpdate).eq("id", devisRow.client_id)
    }
    return Response.json({ ok: true })
  }

  if (action === "add_client") {
    const { client, provenance, zone, categorie, motifEchec, paiementsRecus, dateContact, attestation, dateFacture, montantFacture, commentaire, montantDevis, statut, typePrestation, typeContrat, dureeContratMois, frequenceIntervention, dateDebutContrat, offreBienvenue, leadId } = body
    const { data: newClient } = await supabase.from("clients").insert({ nom: client, prenom: null, email: null, telephone: null, ifu: body.ifu || null, rccm: body.rccm || null }).select().single()
    if (!newClient) return Response.json({ error: "Erreur création client" }, { status: 500 })
    const { data: num } = await supabase.rpc("generate_devis_numero")
    const numero = num || ("DEV-GSE-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6))
    const { data: newDevis, error: devisErr } = await supabase.from("devis").insert({
      client_id: newClient.id,
      numero,
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
      date_contact: dateContact || null,
      attestation_crm: attestation || "non",
      date_facture_crm: dateFacture || null,
      montant_facture_crm: montantFacture || 0,
      type_crm: typeContrat || "ponctuel",
      duree_contrat_mois: dureeContratMois || 12,
      frequence_intervention: frequenceIntervention || "trimestrielle",
      date_debut_contrat: dateDebutContrat || null,
    }).select().single()
    if (devisErr) console.error("add_client devis insert error:", devisErr.message, "numero:", numero)
    if (offreBienvenue && newDevis?.id) {
      const { error: discountErr } = await supabase.from("devis").update({ remise_bienvenue: 10 }).eq("id", newDevis.id)
      if (discountErr) return Response.json({ error: "Erreur application remise bienvenue", detail: discountErr.message }, { status: 500 })
      if (leadId) {
        await supabase.from("leads").update({ traite: true }).eq("id", leadId)
      }
    }
    return Response.json({ ok: true, id: newDevis?.id })
  }

  if (action === "save_devis_fields") {
    const { id, prestations, superficie, prixM2, prixParPrestation, description, montantBrut, remise, remiseType, pctAcompte, conditionsPaiement } = body
    const prestationStr = Array.isArray(prestations) ? prestations.join(", ") : (prestations || "")
    const remiseVal = remise || 0
    const remiseMontant = remiseType === "pct" ? Math.round((montantBrut || 0) * remiseVal / 100) : remiseVal
    const montantNet = (montantBrut || 0) - remiseMontant
    await supabase.from("devis").update({
      prestation: prestationStr || "—",
      superficie: superficie || null,
      prix_m2: prixM2 || null,
      prix_par_prestation: (prixParPrestation && Object.keys(prixParPrestation).length > 0) ? prixParPrestation : null,
      description: description || "",
      montant_brut: montantBrut || 0,
      remise: remiseVal,
      remise_type: remiseType || "pct",
      montant_net: montantNet,
      montant_total: montantNet,
      pct_acompte: pctAcompte || 60,
      conditions_paiement: conditionsPaiement || "",
    }).eq("id", id)
    return Response.json({ ok: true, montantNet })
  }

  if (action === "del_client") {
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

  if (action === "add_dep_client") {
    const { devisId, libelle, montant, categorie, date } = body
    const { data: dep } = await supabase.from("depenses_devis").insert({
      devis_id: devisId, libelle, montant: montant || 0, categorie: categorie || "autre", date: date || null,
    }).select().single()
    return Response.json({ ok: true, dep: { id: dep.id, libelle: dep.libelle, montant: dep.montant, categorie: dep.categorie || "autre", date: dep.date || dep.created_at?.split("T")[0] || "" } })
  }

  if (action === "del_dep_client") {
    await supabase.from("depenses_devis").delete().eq("id", body.id)
    return Response.json({ ok: true })
  }

  if (action === "generate_planning") {
    const { devisId, clientNom, adresse } = body
    const { data: devis } = await supabase.from("devis")
      .select("date_debut_contrat, frequence_intervention, duree_contrat_mois")
      .eq("id", devisId).single()

    if (!devis?.date_debut_contrat)
      return Response.json({ error: "Renseignez une date de début de contrat avant de générer le planning." }, { status: 400 })

    // Supprimer les anciennes dates planifiées pour ce contrat
    await supabase.from("interventions").delete().eq("devis_id", devisId).eq("statut", "planifiee")

    const freqMap = { mensuelle: 1, bimestrielle: 2, trimestrielle: 3, semestrielle: 6, annuelle: 12 }
    const intervalMois = freqMap[devis.frequence_intervention] || 3
    const duree = devis.duree_contrat_mois || 12
    const nbInterventions = Math.floor(duree / intervalMois)
    const toInsert = []

    for (let i = 0; i < nbInterventions; i++) {
      const iDate = new Date(devis.date_debut_contrat + "T00:00:00")
      iDate.setMonth(iDate.getMonth() + i * intervalMois)
      toInsert.push({
        devis_id: devisId,
        date_intervention: iDate.toISOString().split("T")[0],
        statut: "planifiee",
        client_nom: clientNom || "",
        adresse: adresse || "",
        notes: `Intervention ${i + 1}/${nbInterventions}`,
        type_passage: "intervention",
      })
      // Contrôle au point médian (si intervalle >= 2 mois)
      if (intervalMois >= 2) {
        const cDate = new Date(iDate)
        cDate.setDate(cDate.getDate() + Math.floor(intervalMois * 15))
        const contractEnd = new Date(devis.date_debut_contrat + "T00:00:00")
        contractEnd.setMonth(contractEnd.getMonth() + duree)
        if (cDate < contractEnd) {
          toInsert.push({
            devis_id: devisId,
            date_intervention: cDate.toISOString().split("T")[0],
            statut: "planifiee",
            client_nom: clientNom || "",
            adresse: adresse || "",
            notes: `Contrôle ${i + 1}/${nbInterventions} — vérif. état & boîtes`,
            type_passage: "controle",
          })
        }
      }
    }

    const { data: inserted, error } = await supabase.from("interventions").insert(toInsert).select()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, count: inserted.length })
  }

  return Response.json({ error: "Action inconnue" }, { status: 400 })
}
