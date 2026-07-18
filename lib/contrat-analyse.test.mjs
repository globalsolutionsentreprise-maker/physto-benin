import { test } from "node:test"
import assert from "node:assert/strict"
import { construireSocleDevis, plancherPour, parseFrequenceClient, appliquerContraintes, blocRapport } from "./contrat-analyse.mjs"

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

test("le plancher relève une proposition IA trop basse", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 2, pointsAttention: ["autre point"] },
    freqClient: null,
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 4)
  assert.deepEqual(out.pointsAttention, ["autre point"])
})

test("le plancher ne rabaisse jamais une proposition IA plus élevée", () => {
  const out = appliquerContraintes({
    analyse: { frequencePassages: 6, pointsAttention: [] },
    freqClient: null,
    niveauInfestation: "Élevé",
  })
  assert.equal(out.frequencePassages, 6)
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
