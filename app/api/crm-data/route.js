import { createClient } from "@supabase/supabase-js"
import { datesPassages } from "@/lib/contrat-analyse.mjs"

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

  if (action === "get_leads_traites") {
    const { data: leads } = await supabase
      .from("leads")
      .select("id, nom, telephone, email, nuisible, ville, created_at")
      .eq("traite", true)
      .order("created_at", { ascending: false })
      .limit(50)
    return Response.json({ leads: leads || [] })
  }

  if (action === "get_clients") {
    const { data: clients } = await supabase.from("clients").select("*").order("nom")
    return Response.json({ clients: clients || [] })
  }

  if (action === "get_encaissement_desync") {
    // Devis marqués « encaissement fait » (parcours) mais dont paiements_recus < montant facturé
    const { data: devis } = await supabase.from("devis").select("id, numero, montant_net, montant_facture_crm, paiements_recus, parcours, clients(nom, prenom, entreprise)")
    const affected = (devis || []).filter(d => {
      const enc = d.parcours && d.parcours.encaissement && d.parcours.encaissement.done
      const facture = d.montant_facture_crm || d.montant_net || 0
      return enc && facture > 0 && (d.paiements_recus || 0) < facture
    }).map(d => ({
      id: d.id, numero: d.numero,
      client: (d.clients && (d.clients.entreprise || [d.clients.prenom, d.clients.nom].filter(Boolean).join(" "))) || "Client",
      facture: d.montant_facture_crm || d.montant_net || 0, recu: d.paiements_recus || 0,
    }))
    return Response.json({ affected })
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
      superficieParPrestation: d.superficie_par_prestation || {},
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

  return Response.json({ clients, depenses: dep, membres })
}

export async function POST(req) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!await verifyAdmin(req)) return Response.json({ error: "Non autorisé" }, { status: 401 })
  const body = await req.json()
  const { action } = body

  if (action === "move") {
    // Déplacement unifié : le front envoie une `etape` (source de vérité pipeline).
    // On dérive crm_statut (legacy) + un parcours cohérent. Rétrocompat : accepte
    // encore body.statut (ancien format = crm_statut direct).
    const ORDER = ["prospect", "devis", "relance", "converti", "visite", "intervention", "certificat", "encaissement", "cloture"]
    const CRM = { prospect: "contact", devis: "devis", relance: "relance", converti: "converti", visite: "converti", intervention: "converti", certificat: "converti", encaissement: "converti", cloture: "converti", perdu: "echec" }
    const etape = body.etape || body.statut
    const idx = ORDER.indexOf(etape)
    const parcours = {}
    if (idx >= 4) parcours.visite = { done: true }
    if (idx >= 5) parcours.facture = { done: true }
    if (idx >= 6) parcours.intervention = { done: true }
    if (idx >= 8) parcours.encaissement = { done: true, date: new Date().toISOString().split("T")[0] }
    const updateData = { etape, crm_statut: CRM[etape] || "contact", parcours }
    // Deal gagné (converti+) : initialiser le montant facturé ; encaissement (clôturé)
    // → paiements_recus = facturé (cohérence Finances) ; sinon 0.
    if (idx >= 3) {
      const { data: row } = await supabase.from("devis").select("montant_net, montant_facture_crm").eq("id", body.id).single()
      if (row) {
        if (!row.montant_facture_crm) updateData.montant_facture_crm = row.montant_net || 0
        updateData.paiements_recus = (idx >= 8) ? (row.montant_facture_crm || row.montant_net || 0) : 0
      }
    } else {
      updateData.paiements_recus = 0
    }
    await supabase.from("devis").update(updateData).eq("id", body.id)
    return Response.json({ ok: true })
  }

  if (action === "set_lead_traite") {
    await supabase.from("leads").update({ traite: !!body.traite }).eq("id", body.id)
    return Response.json({ ok: true })
  }

  if (action === "delete_lead") {
    await supabase.from("leads").delete().eq("id", body.id)
    return Response.json({ ok: true })
  }

  if (action === "sync_encaissements") {
    // Backfill : pour les devis encaissés (parcours) mais paiements_recus < facturé, aligner paiements_recus sur le facturé
    const { data: devis } = await supabase.from("devis").select("id, montant_net, montant_facture_crm, paiements_recus, parcours")
    let count = 0
    for (const d of (devis || [])) {
      const enc = d.parcours && d.parcours.encaissement && d.parcours.encaissement.done
      const facture = d.montant_facture_crm || d.montant_net || 0
      if (enc && facture > 0 && (d.paiements_recus || 0) < facture) {
        await supabase.from("devis").update({ paiements_recus: facture }).eq("id", d.id)
        count++
      }
    }
    return Response.json({ ok: true, count })
  }

  if (action === "save_client") {
    const { id, client, statut, provenance, zone, categorie, motifEchec, paiementsRecus, dateContact, attestation, dateFacture, montantFacture, commentaire, montantDevis, typePrestation, typeContrat, dureeContratMois, frequenceIntervention, dateDebutContrat } = body
    const devisUpdate = {
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
    }
    if (typePrestation && typePrestation !== "—") devisUpdate.prestation = typePrestation
    await supabase.from("devis").update(devisUpdate).eq("id", id)
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
    const numero = "DEV-GSE-" + new Date().getFullYear() + "-" + crypto.randomUUID().slice(0, 8).toUpperCase()
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
    if (devisErr) return Response.json({ error: "Erreur insertion devis: " + devisErr.message + " | code: " + devisErr.code }, { status: 500 })
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
    const { id, prestations, superficieParPrestation, prixParPrestation, description, montantBrut, remise, remiseType, pctAcompte, conditionsPaiement } = body
    const prestationStr = Array.isArray(prestations) ? prestations.join(", ") : (prestations || "")
    const remiseVal = remise || 0
    const remiseMontant = remiseType === "pct" ? Math.round((montantBrut || 0) * remiseVal / 100) : remiseVal
    const montantNet = (montantBrut || 0) - remiseMontant
    await supabase.from("devis").update({
      prestation: prestationStr || "—",
      superficie_par_prestation: (superficieParPrestation && Object.keys(superficieParPrestation).length > 0) ? superficieParPrestation : null,
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

  if (action === "add_devis") {
    const { clientId, prestations } = body
    if (!clientId) return Response.json({ error: "clientId manquant" }, { status: 400 })
    const prestationStr = Array.isArray(prestations) && prestations.length > 0 ? prestations.join(" + ") : (prestations || "À définir")
    // Numéro garanti unique via crypto (le RPC generate_devis_numero renvoie parfois un
    // doublon → violation contrainte unique). crm_statut requis sinon masqué du dashboard.
    const numero = "DEV-GSE-" + new Date().getFullYear() + "-" + crypto.randomUUID().slice(0, 8).toUpperCase()
    const { data: newDevis, error } = await supabase.from("devis").insert({
      client_id: clientId,
      numero,
      prestation: prestationStr,
      montant_net: 0,
      montant_total: 0,
      statut: "brouillon",
      crm_statut: "contact",
    }).select("*, clients(id, nom, prenom, entreprise, email, telephone)").single()
    if (error) return Response.json({ error: "Erreur insertion devis: " + error.message + " | code: " + error.code }, { status: 500 })
    return Response.json({ ok: true, devis: newDevis })
  }

  // Marquer un contrat comme signé et poser son planning d'interventions.
  // Le contrat signé vit sur le devis : type_crm, date de début, durée et
  // fréquence. La table contrats ne trace que les PDF générés.
  if (action === "marquer_contrat_signe") {
    const { devisId, dateDebut, dureeMois, frequence } = body
    if (!devisId || !dateDebut) return Response.json({ error: "devisId et dateDebut requis" }, { status: 400 })

    const duree = Number(dureeMois) || 12
    const freq = frequence || "trimestrielle"

    const { data: devis, error: errDevis } = await supabase
      .from("devis")
      .select("id, client_id, clients(nom)")
      .eq("id", devisId)
      .single()
    if (errDevis || !devis) return Response.json({ error: "Devis introuvable" }, { status: 404 })

    const { error: errUp } = await supabase.from("devis").update({
      type_crm: "contrat",
      date_debut_contrat: dateDebut,
      duree_contrat_mois: duree,
      frequence_intervention: freq,
    }).eq("id", devisId)
    if (errUp) return Response.json({ error: "Erreur mise à jour devis: " + errUp.message }, { status: 500 })

    // Planning : on ne recrée jamais par dessus un planning existant, sous peine
    // de dupliquer des passages déjà organisés avec les techniciens.
    const { data: dejaLa } = await supabase
      .from("interventions")
      .select("id")
      .eq("devis_id", devisId)
    const nbExistantes = (dejaLa || []).length
    let creees = 0
    if (nbExistantes === 0) {
      const passages = datesPassages({ dateDebut, dureeMois: duree, frequence: freq })
      if (passages.length > 0) {
        const lignes = passages.map(p => ({
          devis_id: devisId,
          client_nom: (devis.clients && devis.clients.nom) || "",
          date_intervention: p.date,
          type_passage: p.type,
          statut: "planifiee",
        }))
        const { error: errIns } = await supabase.from("interventions").insert(lignes)
        if (errIns) return Response.json({ error: "Contrat marqué signé, mais planning non créé: " + errIns.message }, { status: 500 })
        creees = lignes.length
      }
    }
    return Response.json({ ok: true, passagesCrees: creees, passagesExistants: nbExistantes })
  }

  return Response.json({ error: "Action inconnue" }, { status: 400 })
}
