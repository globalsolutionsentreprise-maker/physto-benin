import { test } from "node:test"
import assert from "node:assert/strict"
import { divergencePrestations, prestationsDepuisNuisibles, joursAvantControle, datesPassages, dateFinContrat, resumeContrat, passagesParAn, scoreCommercial, pointsTypeClient, niveauContrat, verifierCoherenceOffres, montantNegocie, prixContrat, construireSocleDevis, plancherPour, parseFrequenceClient, appliquerContraintes, blocRapport, offresContrat, passagesPourDuree, PLANCHER_PONCTUEL_PCT } from "./contrat-analyse.mjs"

test("devis à lignes multiples: montant net, superficie sommée, remise déduite", () => {
  const socle = construireSocleDevis({
    montant_net: 46286,
    montant_total: 47000,
    prestation: "Désinsectisation + Désinfection",
    superficie: null,
    lignes: [
      { prestation: "Désinsectisation", secteur: "Bloc A", superficie: 41.85, prix_m2: 200, montant: 8370 },
      { prestation: "Désinfection", secteur: "Bloc B", superficie: 215.295, prix_m2: 200, montant: 43059 },
    ],
  })
  assert.equal(socle.montant, 46286)
  assert.equal(socle.totalLignes, 51429)
  assert.equal(socle.superficie, 257.145)
  assert.equal(socle.remise, 5143)
  assert.equal(socle.prestation, "Désinsectisation + Désinfection")
})

test("devis ancien sans lignes: repli sur montant_total et superficie de la colonne", () => {
  const socle = construireSocleDevis({
    montant_net: null,
    montant_total: 39690,
    prestation: "Dératisation",
    superficie: 120,
    lignes: null,
  })
  assert.equal(socle.montant, 39690)
  assert.equal(socle.totalLignes, 0)
  assert.equal(socle.superficie, 120)
  assert.equal(socle.remise, null)
})

test("devis vide: aucune valeur inventée", () => {
  const socle = construireSocleDevis({})
  assert.equal(socle.montant, null)
  assert.equal(socle.superficie, null)
  assert.equal(socle.remise, null)
  assert.deepEqual(socle.lignes, [])
})

test("devis offert (montant_net à 0): la remise intégrale ne doit pas disparaître", () => {
  const socle = construireSocleDevis({
    montant_net: 0,
    montant_total: 47000,
    prestation: "Désinsectisation",
    superficie: null,
    lignes: [
      { prestation: "Désinsectisation", secteur: "Bloc A", superficie: 257.145, prix_m2: 200, montant: 51429 },
    ],
  })
  assert.equal(socle.montant, 0)
  assert.equal(socle.remise, 51429)
})

test("devis sans montant_net renseigné et montant_total à 0: montant doit valoir 0, pas null", () => {
  const socle = construireSocleDevis({
    montant_net: null,
    montant_total: 0,
    prestation: "Dératisation",
    superficie: 120,
    lignes: null,
  })
  assert.equal(socle.montant, 0)
})

test("plancherPour tolère la casse et les accents", () => {
  assert.equal(plancherPour("Élevé"), 4)
  assert.equal(plancherPour("eleve"), 4)
  assert.equal(plancherPour("ÉLEVÉ"), 4)
  assert.equal(plancherPour("Moyen"), 2)
  assert.equal(plancherPour("Critique"), 6)
  assert.equal(plancherPour("Faible"), 1)
  assert.equal(plancherPour(null), null)
  assert.equal(plancherPour("Inconnu"), null)
})

test("parseFrequenceClient reconnaît les formulations courantes", () => {
  assert.deepEqual(parseFrequenceClient("trimestriel sur un an"), { freq: 4, paiement: "trimestriel_avance" })
  assert.deepEqual(parseFrequenceClient("deux passages par an"), { freq: 2, paiement: "semestriel" })
  assert.equal(parseFrequenceClient("le client hésite"), null)
})

test("le plancher relève une proposition IA trop basse et avertit que le prix est à revalider", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 2, pointsAttention: ["autre point"] },
    freqClient: null,
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 4)
  assert.equal(out.pointsAttention.length, 2)
  assert.equal(out.pointsAttention[0], "autre point")
  assert.match(out.pointsAttention[1], /relevée de 2 à 4/)
  assert.match(out.pointsAttention[1], /revalider/)
})

test("aucun relèvement, aucun avertissement de prix, quand la fréquence IA atteint déjà le plancher", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 4, pointsAttention: [] },
    freqClient: null,
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 4)
  assert.deepEqual(out.pointsAttention, [])
})

test("la demande client remplace l'avertissement de prix par le message de conflit", () => {
  // Client demande 2, plancher 6, IA propose 1. La fréquence finale retenue est
  // 2 (demande client souveraine), donc annoncer un relèvement à 6 serait faux :
  // seul le message de conflit, qui expose l'écart à arbitrer, doit rester.
  const out = appliquerContraintes({
    analyse: { frequencePassages: 1, pointsAttention: [] },
    freqClient: { freq: 2, paiement: "semestriel" },
    niveauInfestation: "Critique",
  })
  assert.equal(out.frequencePassages, 2)
  assert.equal(out.pointsAttention.length, 1)
  assert.match(out.pointsAttention[0], /demande 2 passage/)
  assert.match(out.pointsAttention[0], /justifie 6/)
  assert.equal(out.pointsAttention.filter(p => /Fréquence relevée/.test(p)).length, 0)
})

test("le plancher ne rabaisse jamais une proposition IA plus élevée", () => {
  // Plancher 2 (Moyen), IA propose 4 : le plancher ne doit pas la ramener à 2.
  // On reste sous le plafond commercial de 4, qui est testé séparément.
  const out = appliquerContraintes({
    analyse: { frequencePassages: 4, pointsAttention: [] },
    freqClient: null,
    niveauInfestation: "Moyen",
  })
  assert.equal(out.frequencePassages, 4)
  assert.deepEqual(out.pointsAttention, [])
})

test("la demande du client l'emporte sur le plancher, et le conflit est signalé en tête", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 4, paiementRecommande: "trimestriel_avance", pointsAttention: ["autre point"] },
    freqClient: { freq: 2, paiement: "semestriel" },
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 2)
  assert.equal(out.paiementRecommande, "semestriel")
  assert.match(out.pointsAttention[0], /demande 2 passage/)
  assert.match(out.pointsAttention[0], /justifie 4/)
  assert.equal(out.pointsAttention[1], "autre point")
})

test("aucun conflit signalé quand la demande client atteint le plancher", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 4, pointsAttention: [] },
    freqClient: { freq: 4, paiement: "trimestriel_avance" },
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 4)
  assert.deepEqual(out.pointsAttention, [])
})

test("sans rapport de visite, aucun plancher ne s'applique", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 1, pointsAttention: [] },
    freqClient: null,
    niveauInfestation: null,
  })
  assert.equal(out.frequencePassages, 1)
  assert.deepEqual(out.pointsAttention, [])
})

test("appliquerContraintes ne mute pas l'analyse reçue", () => {
  const source = { frequencePassages: 2, pointsAttention: [] }
  appliquerContraintes({ analyse: source, freqClient: null, niveauInfestation: "Élevé" })
  assert.equal(source.frequencePassages, 2)
})

test("blocRapport déclare l'absence de constat sans l'inventer", () => {
  const txt = blocRapport(null, [], "aucun")
  assert.match(txt, /Aucune visite terrain/)
  assert.doesNotMatch(txt, /Niveau d'infestation/)
})

test("blocRapport expose le niveau et les nuisibles constatés", () => {
  const txt = blocRapport(
    {
      numero_unique: "RV-2026-0718-304",
      date_visite: "2026-07-18",
      niveau_infestation: "Élevé",
      nuisibles: ["Termites", "Rats"],
      autres_nuisible: "",
      zones_infestees: "Bloc A fortement impacté",
      recommandations: "Contrat de suivi conseillé",
      observations: "Reine mère présente",
      notes_technicien: "",
      description_site: "Immeuble R+1",
      technicien: "Fabrice",
    },
    [],
    "devis"
  )
  assert.match(txt, /Élevé/)
  assert.match(txt, /Termites, Rats/)
  assert.match(txt, /Bloc A fortement impacté/)
  assert.match(txt, /Reine mère présente/)
})

test("blocRapport signale un constat provenant d'un autre dossier", () => {
  const txt = blocRapport({ numero_unique: "RV-1", date_visite: "2026-06-02", niveau_infestation: "Moyen" }, [], "autre_dossier")
  assert.match(txt, /autre dossier/)
})

test("blocRapport résume les visites précédentes en une ligne chacune", () => {
  const txt = blocRapport(
    { numero_unique: "RV-2", date_visite: "2026-07-18", niveau_infestation: "Élevé" },
    [{ date_visite: "2026-03-01", niveau_infestation: "Moyen" }],
    "devis"
  )
  assert.match(txt, /2026-03-01/)
  assert.match(txt, /Moyen/)
})

test("blocRapport distingue une lecture impossible d'une absence de visite", () => {
  const indispo = blocRapport(null, [], "indisponible")
  const aucun = blocRapport(null, [], "aucun")
  assert.match(indispo, /indisponibles/)
  assert.match(indispo, /erreur de lecture/)
  assert.doesNotMatch(indispo, /Aucune visite terrain/)
  assert.notEqual(indispo, aucun)
})

test("la demande client écarte l'avertissement de prix du plancher", () => {
  // Client demande 2, plancher 4, IA propose 1. La fréquence finale est 2
  // (demande client souveraine), donc annoncer un relèvement à 4 serait faux.
  const out = appliquerContraintes({
    analyse: { frequencePassages: 1, pointsAttention: [] },
    freqClient: { freq: 2, paiement: "semestriel" },
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 2)
  assert.equal(out.pointsAttention.filter(p => /Fréquence relevée/.test(p)).length, 0)
  assert.match(out.pointsAttention[0], /demande 2 passage/)
})

test("prixContrat calcule depuis le brut des lignes, remise 10 pour cent une seule fois", () => {
  // Devis Folly reel : lignes 115 687 brut, net 104 118 (deja remise a 10 %).
  const p = prixContrat({ totalLignes: 115687, montantNet: 104118, passages: 4 })
  assert.equal(p.prixReference, 462748)
  assert.equal(p.prixAnnuel, 416473)
  assert.equal(p.remisePct, 10)
})

test("prixContrat est deterministe", () => {
  const a = prixContrat({ totalLignes: 115687, montantNet: 104118, passages: 4 })
  const b = prixContrat({ totalLignes: 115687, montantNet: 104118, passages: 4 })
  assert.deepEqual(a, b)
})

test("prixContrat ne remise pas deux fois un devis sans lignes", () => {
  // Sans lignes, on n'a que le net : la remise y est deja incluse.
  const p = prixContrat({ totalLignes: 0, montantNet: 39690, passages: 4 })
  assert.equal(p.prixAnnuel, 158760)
  assert.equal(p.remisePct, 0)
})

test("prixContrat retombe sur 4 passages si la frequence est absente", () => {
  const p = prixContrat({ totalLignes: 100000, montantNet: 90000 })
  assert.equal(p.prixReference, 400000)
  assert.equal(p.prixAnnuel, 360000)
})

test("passagesPourDuree: cadence 4/an sur 3, 6, 12 mois", () => {
  assert.equal(passagesPourDuree(4, 3), 1)
  assert.equal(passagesPourDuree(4, 6), 2)
  assert.equal(passagesPourDuree(4, 12), 4)
  assert.equal(passagesPourDuree(undefined, 12), 4) // défaut 4 passages/an
})

test("offresContrat: 3 formules dégressives (devis Hounsou reel)", () => {
  // Ponctuel 132 265 F, 4 passages/an, grille Prudente 100/95/90.
  const r = offresContrat({ prixPonctuel: 132265, passagesAnnuels: 4 })
  const [o3, o6, o12] = r.offres
  assert.equal(o3.dureeMois, 3)
  assert.equal(o3.passages, 1)
  assert.equal(o3.prixPassage, 132265)
  assert.equal(o3.prixTotal, 132265)
  assert.equal(o6.prixPassage, 125652) // round(132265 * 0.95)
  assert.equal(o6.prixTotal, 251304)   // 125652 * 2
  assert.equal(o12.prixPassage, 119039) // round(132265 * 0.90)
  assert.equal(o12.prixTotal, 476156)   // 119039 * 4
  // Dégressivité stricte du prix par passage avec la durée.
  assert.ok(o3.prixPassage > o6.prixPassage && o6.prixPassage > o12.prixPassage)
  // Toujours au-dessus du plancher de rentabilité (70 % du ponctuel).
  assert.equal(r.plancherPassage, Math.round(132265 * PLANCHER_PONCTUEL_PCT))
  assert.ok(o12.prixPassage > r.plancherPassage)
  // Chaque passage sous contrat coûte moins qu'une intervention ponctuelle.
  assert.ok(o12.prixPassage < r.prixPonctuel)
})

test("offresContrat: le plancher borne un ponctuel anormalement bas", () => {
  // Si le prix/passage calculé passait sous 70 % du ponctuel, le plancher tient.
  // Ici on force un cas limite via un taux implicite < plancher n'existe pas
  // dans la grille, donc on vérifie surtout que plancher = 70 % et prixPassage >= plancher.
  const r = offresContrat({ prixPonctuel: 10000, passagesAnnuels: 4 })
  for (const o of r.offres) assert.ok(o.prixPassage >= r.plancherPassage)
})

test("le bimestriel propose par l'IA est ramene au trimestriel", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 6, pointsAttention: [] },
    freqClient: null,
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 4)
  assert.match(out.pointsAttention.join(" "), /ramenée de 6 à 4/)
})

test("une demande client au dela de 4 passages reste souveraine", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 4, pointsAttention: [] },
    freqClient: { freq: 12, paiement: "mensuel" },
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 12)
  assert.equal(out.pointsAttention.filter(p => /ramenée/.test(p)).length, 0)
})

test("montantNegocie extrait un prix convenu des notes libres", () => {
  assert.equal(montantNegocie("client negocie a 200000 FCFA"), 200000)
  assert.equal(montantNegocie("accepte pour 250 000"), 250000)
  assert.equal(montantNegocie("prix accorde 180.000 FCFA"), 180000)
  assert.equal(montantNegocie("negocie a 200k"), 200000)
})

test("montantNegocie ne confond pas une note ordinaire avec un prix", () => {
  assert.equal(montantNegocie(""), null)
  assert.equal(montantNegocie(null), null)
  assert.equal(montantNegocie("infestation active signalee, client presse"), null)
  assert.equal(montantNegocie("4 passages par an"), null)
  assert.equal(montantNegocie("batiment de 250 m2"), null)
})

test("scoreCommercial reproduit le calcul pondere sur le dossier Folly", () => {
  const r = scoreCommercial({
    superficie: 578.433,
    niveauInfestation: "Élevé",
    typeClient: "immeuble",
    frequence: 4,
    clientAvecHistorique: false,
  })
  assert.deepEqual(r.detail, { superficie: 60, infestation: 75, typeClient: 40, frequence: 75, fidelisation: 50 })
  assert.equal(r.score, 62)
  assert.equal(r.categorieClient, "bureau ou commerce")
})

test("scoreCommercial est deterministe", () => {
  const args = { superficie: 578.433, niveauInfestation: "Élevé", typeClient: "immeuble", frequence: 4, clientAvecHistorique: false }
  assert.deepEqual(scoreCommercial(args), scoreCommercial(args))
})

test("pointsTypeClient classe les etablissements et se replie sans echouer", () => {
  assert.equal(pointsTypeClient("Hôtel Ibis").points, 80)
  assert.equal(pointsTypeClient("boulangerie").points, 70)
  assert.equal(pointsTypeClient("usine agro-alimentaire").points, 100)
  assert.equal(pointsTypeClient("clinique").points, 90)
  assert.equal(pointsTypeClient("villa particulier").points, 20)
  assert.equal(pointsTypeClient("").points, 40)
  assert.equal(pointsTypeClient("truc inconnu").categorie, "non classe")
})

test("un dossier absent ne gonfle pas le score", () => {
  // Surface inconnue et niveau absent : positionnement median, pas de bonus.
  const r = scoreCommercial({ superficie: 0, niveauInfestation: null, typeClient: "", frequence: 0, clientAvecHistorique: false })
  assert.equal(r.detail.superficie, 40)
  assert.equal(r.detail.infestation, 50)
  // 40x0,25 + 50x0,25 + 40x0,20 + 25x0,20 + 50x0,10 = 40,5 arrondi a 41
  assert.equal(r.score, 41)
  assert.equal(niveauContrat(r.score).cle, "classique")
})

test("niveauContrat mappe le score sur les quatre paliers", () => {
  assert.equal(niveauContrat(0).cle, "leger")
  assert.equal(niveauContrat(30).cle, "leger")
  assert.equal(niveauContrat(31).cle, "classique")
  assert.equal(niveauContrat(50).cle, "classique")
  assert.equal(niveauContrat(62).cle, "premium")
  assert.equal(niveauContrat(70).cle, "premium")
  assert.equal(niveauContrat(71).cle, "haute_protection")
  assert.equal(niveauContrat(100).cle, "haute_protection")
})

test("verifierCoherenceOffres accepte une gamme correctement construite", () => {
  const a = verifierCoherenceOffres(
    [{ dureeMois: 3, prixTotal: 145000 }, { dureeMois: 6, prixTotal: 270000 }, { dureeMois: 12, prixTotal: 495000 }],
    { montantDevis: 104118 }
  )
  assert.deepEqual(a, [])
})

test("verifierCoherenceOffres detecte un engagement long moins avantageux au mois", () => {
  // 12 mois a 600 000 revient a 50 000/mois, contre 45 000/mois sur 6 mois.
  const a = verifierCoherenceOffres(
    [{ dureeMois: 6, prixTotal: 270000 }, { dureeMois: 12, prixTotal: 600000 }],
    { montantDevis: 104118 }
  )
  assert.equal(a.length, 1)
  assert.match(a[0], /coût mensuel/)
})

test("verifierCoherenceOffres detecte une offre annuelle bradee sous le devis", () => {
  const a = verifierCoherenceOffres([{ dureeMois: 12, prixTotal: 90000 }], { montantDevis: 104118 })
  assert.equal(a.length, 1)
  assert.match(a[0], /inférieure au montant du devis/)
})

test("datesPassages reproduit exactement le planning reel de La Manne Doree", () => {
  // Motif releve en base : intervention tous les 92 jours, controle 45 jours apres.
  const p = datesPassages({ dateDebut: "2026-05-30", dureeMois: 12, frequence: "trimestrielle" })
  assert.deepEqual(p.map(x => x.date), [
    "2026-05-30", "2026-07-14", "2026-08-30", "2026-10-14",
    "2026-11-30", "2027-01-14", "2027-03-02", "2027-04-16",
  ])
  assert.deepEqual(p.map(x => x.type), [
    "intervention", "controle", "intervention", "controle",
    "intervention", "controle", "intervention", "controle",
  ])
})

test("datesPassages n'insere pas de controle quand l'intervalle est trop court", () => {
  // Mensuel : 31 jours entre deux passages, un controle a J+45 chevaucherait.
  const p = datesPassages({ dateDebut: "2026-01-01", dureeMois: 12, frequence: "mensuelle" })
  assert.equal(p.length, 12)
  assert.ok(p.every(x => x.type === "intervention"))
})

test("datesPassages sans date de debut ne fabrique rien", () => {
  assert.deepEqual(datesPassages({ dateDebut: null, dureeMois: 12, frequence: "trimestrielle" }), [])
})

test("dateFinContrat ajoute la duree en mois", () => {
  assert.equal(dateFinContrat("2026-05-30", 12), "2027-05-30")
  assert.equal(dateFinContrat("2026-05-30", 6), "2026-11-30")
  assert.equal(dateFinContrat(null, 12), null)
})

test("resumeContrat compte les passages faits, le prochain et les non affectes", () => {
  const devis = { id: "d1", date_debut_contrat: "2026-05-30", duree_contrat_mois: 12, frequence_intervention: "trimestrielle" }
  const interventions = [
    { devis_id: "d1", date_intervention: "2026-05-30", type_passage: "intervention", statut: "terminee", personnel: { nom: "SOSSOU" } },
    { devis_id: "d1", date_intervention: "2026-07-14", type_passage: "controle", statut: "planifiee", personnel: null },
    { devis_id: "d1", date_intervention: "2026-08-30", type_passage: "intervention", statut: "planifiee", personnel: null },
    { devis_id: "AUTRE", date_intervention: "2026-06-01", type_passage: "intervention", statut: "planifiee", personnel: null },
  ]
  const r = resumeContrat({ devis, interventions }, "2026-07-20")
  assert.equal(r.debut, "2026-05-30")
  assert.equal(r.fin, "2027-05-30")
  assert.equal(r.statut, "actif")
  assert.equal(r.total, 3)          // l'intervention d'un autre devis est exclue
  assert.equal(r.faits, 1)
  assert.equal(r.sansTechnicien, 2)
  assert.equal(r.prochain.date, "2026-08-30")
  assert.equal(r.passagesAttendus, 8)
})

test("resumeContrat distingue a venir, a renouveler et termine", () => {
  const base = { id: "d1", duree_contrat_mois: 12, frequence_intervention: "trimestrielle" }
  const sansIv = []
  assert.equal(resumeContrat({ devis: Object.assign({}, base, { date_debut_contrat: "2026-09-01" }), interventions: sansIv }, "2026-07-20").statut, "a_venir")
  assert.equal(resumeContrat({ devis: Object.assign({}, base, { date_debut_contrat: "2024-01-01" }), interventions: sansIv }, "2026-07-20").statut, "termine")
  // fin au 2026-08-15, on est a moins de 60 jours
  assert.equal(resumeContrat({ devis: Object.assign({}, base, { date_debut_contrat: "2025-08-15" }), interventions: sansIv }, "2026-07-20").statut, "a_renouveler")
  assert.equal(resumeContrat({ devis: Object.assign({}, base, { date_debut_contrat: null }), interventions: sansIv }, "2026-07-20").statut, "sans_date")
})

test("resumeContrat remonte les passages depasses et non pointes", () => {
  const devis = { id: "d1", date_debut_contrat: "2026-05-30", duree_contrat_mois: 12, frequence_intervention: "trimestrielle" }
  const interventions = [
    { devis_id: "d1", date_intervention: "2026-05-30", type_passage: "intervention", statut: "planifiee", personnel: null },
    { devis_id: "d1", date_intervention: "2026-07-14", type_passage: "controle", statut: "planifiee", personnel: null },
    { devis_id: "d1", date_intervention: "2026-08-30", type_passage: "intervention", statut: "planifiee", personnel: null },
  ]
  const r = resumeContrat({ devis, interventions }, "2026-07-20")
  assert.equal(r.enRetard.length, 2)
  assert.deepEqual(r.enRetard.map(p => p.date), ["2026-05-30", "2026-07-14"])
  assert.equal(r.prochain.date, "2026-08-30")
})

test("un passage passe mais pointe termine n'est pas en retard", () => {
  const devis = { id: "d1", date_debut_contrat: "2026-05-30", duree_contrat_mois: 12, frequence_intervention: "trimestrielle" }
  const interventions = [
    { devis_id: "d1", date_intervention: "2026-05-30", type_passage: "intervention", statut: "terminee", personnel: { nom: "SOSSOU" } },
  ]
  const r = resumeContrat({ devis, interventions }, "2026-07-20")
  assert.equal(r.enRetard.length, 0)
})

test("le controle intermediaire depend de la frequence, ce n'est pas une recurrence fixe", () => {
  // Semestriel : intervalle de 183 jours, controle a mi-parcours (90 j).
  const sem = datesPassages({ dateDebut: "2026-01-01", dureeMois: 12, frequence: "semestrielle" })
  assert.deepEqual(sem.map(x => x.date + " " + x.type), [
    "2026-01-01 intervention", "2026-04-01 controle",
    "2026-07-03 intervention", "2026-10-01 controle",
  ])
})

test("aucun controle quand les interventions sont deja rapprochees", () => {
  // Mensuel : 31 jours entre passages, un controle n'apporterait rien.
  const men = datesPassages({ dateDebut: "2026-01-01", dureeMois: 12, frequence: "mensuelle" })
  assert.equal(men.length, 12)
  assert.ok(men.every(x => x.type === "intervention"))
  // Bimestriel : meme raison.
  const bim = datesPassages({ dateDebut: "2026-01-01", dureeMois: 12, frequence: "bimestrielle" })
  assert.equal(bim.length, 6)
  assert.ok(bim.every(x => x.type === "intervention"))
})

test("annuel : une intervention et un controle a mi-parcours", () => {
  const an = datesPassages({ dateDebut: "2026-01-01", dureeMois: 12, frequence: "annuelle" })
  assert.deepEqual(an.map(x => x.type), ["intervention", "controle"])
  assert.equal(an[1].date, "2026-06-30")
})

test("un contrat court ne pose pas de controle au dela de son echeance", () => {
  // Contrat de 3 mois en trimestriel : une seule intervention, et le controle
  // a J+45 tombe bien dans les 3 mois.
  const court = datesPassages({ dateDebut: "2026-01-01", dureeMois: 3, frequence: "trimestrielle" })
  assert.equal(court.length, 2)
  assert.equal(court[0].date, "2026-01-01")
  assert.equal(court[1].date, "2026-02-15")
  // Annuel sur 3 mois : le controle a J+180 depasserait l'echeance, il est ecarte.
  const long = datesPassages({ dateDebut: "2026-01-01", dureeMois: 3, frequence: "annuelle" })
  assert.equal(long.length, 1)
  assert.equal(long[0].type, "intervention")
})

test("joursAvantControle se replie sur le trimestriel pour une frequence inconnue", () => {
  assert.equal(joursAvantControle("trimestrielle"), 45)
  assert.equal(joursAvantControle("Semestrielle"), 90)
  assert.equal(joursAvantControle("truc"), 45)
})

test("divergencePrestations reproduit le cas reel du devis Folly", () => {
  // Constat : termites et rats. Devis : desinsectisation, desinfection, deratisation.
  // La desinfection ne repose sur aucun constat, c'etait une erreur de saisie.
  const d = divergencePrestations({
    prestationDevis: "Désinsectisation + Désinfection + Dératisation",
    rapport: { nuisibles: ["Termites", "Rats"], autres_nuisible: "" },
  })
  assert.equal(d.verifiable, true)
  assert.deepEqual(d.attendues, ["Désinsectisation", "Dératisation"])
  assert.deepEqual(d.enTrop, ["Désinfection"])
})

test("aucune divergence quand le devis colle au constat", () => {
  const d = divergencePrestations({
    prestationDevis: "Désinsectisation + Dératisation",
    rapport: { nuisibles: ["Termites", "Rats"], autres_nuisible: "" },
  })
  assert.deepEqual(d.enTrop, [])
})

test("sans rapport, aucune divergence n'est affirmee", () => {
  const d = divergencePrestations({ prestationDevis: "Désinsectisation", rapport: null })
  assert.equal(d.verifiable, false)
  assert.deepEqual(d.enTrop, [])
})

test("un constat sans nuisible exploitable ne declenche aucune accusation", () => {
  const d = divergencePrestations({
    prestationDevis: "Désinsectisation",
    rapport: { nuisibles: [], autres_nuisible: "" },
  })
  assert.equal(d.verifiable, false)
  assert.deepEqual(d.enTrop, [])
})

test("prestationsDepuisNuisibles couvre les libelles courants", () => {
  assert.deepEqual(prestationsDepuisNuisibles(["Cafards"], ""), ["Désinsectisation"])
  assert.deepEqual(prestationsDepuisNuisibles(["Souris"], ""), ["Dératisation"])
  assert.deepEqual(prestationsDepuisNuisibles([], "punaises de lit"), ["Désinsectisation"])
  assert.deepEqual(prestationsDepuisNuisibles(["Rats", "Termites"], ""), ["Dératisation", "Désinsectisation"])
})
