import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { construireSocleDevis, parseFrequenceClient, appliquerContraintes, blocRapport, plancherPour, montantNegocie, PASSAGES_DEFAUT, scoreCommercial, niveauContrat, verifierCoherenceOffres } from "@/lib/contrat-analyse.mjs"

export const dynamic = "force-dynamic"

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

async function callGeminiWithRetry(body, maxRetries = 3) {
  let lastErr
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) return res
    const errData = await res.json().catch(() => ({}))
    lastErr = errData
    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, attempt * 2000))
      continue
    }
    throw Object.assign(new Error("Gemini " + res.status), { data: errData })
  }
  throw Object.assign(new Error("Gemini unavailable après " + maxRetries + " tentatives"), { data: lastErr })
}

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  try {
    const body = await req.json()
    const { devisId, typeEtablissement, demandeClient, notes } = body
    const phase = body.phase === "questions" ? "questions" : "analyse"

    if (!devisId) return NextResponse.json({ error: "devisId requis" }, { status: 400 })

    // Charger le devis + client depuis Supabase
    const { data: devis, error: devisErr } = await supabase
      .from("devis")
      .select("*, clients(*)")
      .eq("id", devisId)
      .single()

    if (devisErr || !devis) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })

    const socle = construireSocleDevis(devis)

    // Historique du client. La requête lisait `montant`, colonne inexistante:
    // elle échouait en 400 et `historique` valait null, donc tout client
    // apparaissait comme nouveau et la remise fidélité ne se déclenchait jamais.
    const histRes = await supabase
      .from("devis")
      .select("id, statut, created_at, montant_net")
      .eq("client_id", devis.client_id)
      .order("created_at", { ascending: false })
    const historiqueDispo = !histRes.error
    const nbDevisAnterieurs = (histRes.data || []).filter(d => d.id !== devisId).length

    const fichesRes = await supabase
      .from("fiches_passage")
      .select("id, date_passage")
      .eq("client_id", devis.client_id)
      .order("date_passage", { ascending: false })
    const fichesDispo = !fichesRes.error
    const nbFiches = (fichesRes.data || []).length

    // Rapport de visite: le plus récent du devis fait référence. À défaut, on
    // accepte un rapport du même client sur un autre dossier (même site, même
    // infestation), en déclarant explicitement son origine.
    let rapports = []
    let rapportOrigine = "aucun"
    const rvDevis = await supabase
      .from("rapports_visite")
      .select("*")
      .eq("devis_id", devisId)
      .order("date_visite", { ascending: false })

    if (rvDevis.error) {
      rapportOrigine = "indisponible"
    } else if ((rvDevis.data || []).length > 0) {
      rapports = rvDevis.data
      rapportOrigine = "devis"
    } else {
      const rvClient = await supabase
        .from("rapports_visite")
        .select("*")
        .eq("client_id", devis.client_id)
        .order("date_visite", { ascending: false })
        .limit(1)
      if (rvClient.error) {
        // La lecture de repli a aussi échoué: l'information n'a pas pu être
        // lue, ce n'est pas la même chose qu'une absence réelle de rapport.
        rapportOrigine = "indisponible"
      } else if ((rvClient.data || []).length > 0) {
        rapports = rvClient.data
        rapportOrigine = "autre_dossier"
      }
    }
    const rapport = rapports[0] || null
    const rapportsPrecedents = rapports.slice(1)

    if (phase === "questions") {
      // La route est l'autorité sur les données: si un rapport existe déjà
      // (saisi entre-temps depuis un autre poste), ne pas mentir à l'IA en
      // affirmant "aucune visite" et ne pas produire de questions. On
      // renvoie plutôt le rapport pour que l'interface se remette à jour
      // (même forme que la phase "analyse": success + rapport + rapportOrigine).
      if (rapport) {
        return NextResponse.json({
          success: true,
          phase: "questions",
          rapportDisponible: true,
          questions: [],
          rapport: {
            numero: rapport.numero_unique,
            date: rapport.date_visite,
            niveau: rapport.niveau_infestation,
            origine: rapportOrigine,
          },
          rapportOrigine,
        })
      }

      const promptQuestions = `Tu es un conseiller technique senior de Global Solutions Entreprise (GSE), société agréée de dératisation, désinsectisation et désinfection à Cotonou, Bénin.

Aucune visite terrain n'a été réalisée pour ce dossier. Tu dois poser au commercial les questions qui te manquent pour recommander un contrat d'entretien pertinent.

DEVIS
- Prestation(s) : ${socle.prestation || "Non précisé"}
- Superficie totale : ${socle.superficie ? socle.superficie + " m²" : "Non précisée"}
- Montant : ${socle.montant ? socle.montant.toLocaleString("fr-FR") + " FCFA" : "Non précisé"}
- Type d'établissement : ${typeEtablissement || "Non précisé"}
- Demande du client : ${demandeClient || "Non précisé"}
- Notes : ${notes || "Aucune"}

RÈGLES IMPÉRATIVES
1. Maximum 5 questions.
2. Chaque question doit être répondable DEPUIS LE BUREAU par le commercial : horaires d'exploitation, accès aux locaux, historique d'infestation connu, contraintes réglementaires ou HACCP, sensibilité des zones.
3. INTERDIT : toute question exigeant un retour sur site, une mesure, une inspection ou un comptage.
4. Pas de question dont la réponse est déjà dans le devis ci-dessus.
5. Formule des questions courtes et concrètes.

Réponds UNIQUEMENT avec ce JSON, sans markdown :
{"questions":[{"id":"identifiant_court_sans_espace","question":"La question posée","pourquoi":"En quoi la réponse change la recommandation, en une phrase"}]}`

      let qRes
      try {
        // gemini-2.5-flash consomme des tokens de sortie pour son raisonnement
        // interne avant d'émettre le JSON: 2048 produisait une réponse tronquée
        // et un JSON.parse en échec. Aligné sur l'appel d'analyse ci-dessous.
        qRes = await callGeminiWithRetry({
          contents: [{ parts: [{ text: promptQuestions }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
        })
      } catch (e) {
        return NextResponse.json({ error: "Gemini indisponible, réessaie dans quelques secondes. (" + (e.message || "") + ")" }, { status: 503 })
      }

      const qData = await qRes.json()
      const qRaw = qData.candidates?.[0]?.content?.parts?.[0]?.text || ""
      const qCleaned = qRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      let questions = []
      try {
        questions = (JSON.parse(qCleaned).questions || []).slice(0, 5)
      } catch {
        return NextResponse.json({ error: "Réponse Gemini non parseable", raw: qRaw }, { status: 500 })
      }
      return NextResponse.json({ success: true, phase: "questions", questions, rapportOrigine })
    }

    const client = devis.clients
    const nomClient = [client?.prenom, client?.nom].filter(Boolean).join(" ")
    const freqClient = parseFrequenceClient(demandeClient)
    // Déclaré à l'IA en amont pour qu'elle dimensionne prix, paiement et
    // fréquence de façon cohérente dès le départ (le garde-fou serveur
    // appliquerContraintes reste le filet de sécurité si elle l'ignore).
    const plancherAnalyse = plancherPour(rapport ? rapport.niveau_infestation : null)

    // Fréquence retenue : trimestriel par défaut, sauf demande explicite du
    // client, qui reste souverain.
    const frequenceImposee = freqClient ? freqClient.freq : PASSAGES_DEFAUT
    const paiementImpose = freqClient ? freqClient.paiement : "trimestriel_avance"

    // Un prix déjà négocié avec le client prime sur toute proposition de l'IA:
    // c'est un engagement pris. Extrait dans le code, jamais laissé à l'IA.
    const negocie = montantNegocie(notes)

    // Score commercial. Il qualifie le NIVEAU DE SERVICE du dossier, jamais son
    // prix : c'est le niveau qui est transmis à l'IA, à charge pour elle de
    // construire une offre réaliste. Calculé ici pour être reproductible.
    const scoring = scoreCommercial({
      superficie: socle.superficie,
      niveauInfestation: rapport ? rapport.niveau_infestation : null,
      typeClient: typeEtablissement,
      frequence: frequenceImposee,
      clientAvecHistorique: historiqueDispo && (nbDevisAnterieurs > 0 || nbFiches > 0),
    })
    const niveau = niveauContrat(scoring.score)

    const reponsesTechniques = Object.entries(body.reponsesTechniques || {})
      .filter(([, v]) => String(v || "").trim())
      .map(([k, v]) => "- " + k + " : " + v)
      .join("\n") || null

    const prompt = `Tu es un conseiller commercial senior de Global Solutions Entreprise (GSE), société agréée de dératisation, désinsectisation et désinfection à Cotonou, Bénin.

Tu dois analyser les informations ci-dessous et produire une recommandation structurée pour la rédaction d'un contrat d'entretien annuel.

---
DEVIS DE RÉFÉRENCE
- Référence : ${devis.numero}
- Client : ${nomClient}${client?.entreprise ? " (" + client.entreprise + ")" : ""}
- Prestation(s) : ${socle.prestation || "Non précisé"}
- Superficie totale : ${socle.superficie ? socle.superficie + " m²" : "Non précisée"}
- Montant du devis : ${socle.montant ? socle.montant.toLocaleString("fr-FR") + " FCFA" : "Non précisé"}
- Remise déjà accordée sur le devis : ${socle.remise ? socle.remise.toLocaleString("fr-FR") + " FCFA" : "Aucune"}
- Statut : ${devis.statut}
${socle.lignes.length > 0 ? "- Détail des lignes :\n" + socle.lignes.map(l =>
  "  · " + (l.prestation || "?") + (l.secteur ? " / " + l.secteur : "") +
  " : " + (Number(l.superficie) || 0) + " m² à " + (Number(l.prix_m2) || 0) + " FCFA/m² = " +
  (Number(l.montant) || 0).toLocaleString("fr-FR") + " FCFA"
).join("\n") : ""}

${blocRapport(rapport, rapportsPrecedents, rapportOrigine)}

PROFIL CLIENT
- Devis antérieurs avec GSE : ${historiqueDispo ? nbDevisAnterieurs : "information indisponible"}
- Fiches de passage antérieures : ${fichesDispo ? nbFiches : "information indisponible"}
- Statut : ${!historiqueDispo || !fichesDispo ? "indéterminé (historique incomplet)" : (nbDevisAnterieurs === 0 && nbFiches === 0 ? "Nouveau client" : "Client existant")}
${reponsesTechniques ? "\nRÉPONSES TECHNIQUES FOURNIES PAR LE COMMERCIAL\n" + reponsesTechniques : ""}

CONTEXTE COMPLÉMENTAIRE
- Type d'établissement : ${typeEtablissement || "Non précisé"}
- Demande du client : ${demandeClient || "Non précisé"}
- Notes : ${notes || "Aucune"}
${freqClient ? `
⚠️ FRÉQUENCE IMPOSÉE PAR LE CLIENT : ${freqClient.freq} passage(s)/an, paiementRecommande = "${freqClient.paiement}"
Tu DOIS mettre "frequencePassages": ${freqClient.freq} et "paiementRecommande": "${freqClient.paiement}" dans ta réponse JSON. Ces deux valeurs sont NON NÉGOCIABLES. Si tu estimes la fréquence insuffisante, ajoute une note dans "pointsAttention" uniquement.
` : ""}
QUALIFICATION DU DOSSIER, ARRÊTÉE PAR GSE
Ce score est calculé par GSE, tu ne le recalcules pas et tu ne le contestes pas.
- Score commercial : ${scoring.score} / 100
- Niveau de contrat : ${niveau.libelle}
- Détail : superficie ${scoring.detail.superficie}/100, infestation ${scoring.detail.infestation}/100, type de client ${scoring.detail.typeClient}/100 (${scoring.categorieClient}), fréquence ${scoring.detail.frequence}/100, fidélisation ${scoring.detail.fidelisation}/100
- Fréquence retenue : ${frequenceImposee} passage(s) par an
- Paiement retenu : ${paiementImpose}
${negocie != null ? `- PRIX DÉJÀ NÉGOCIÉ AVEC LE CLIENT : ${negocie.toLocaleString("fr-FR")} FCFA par an. C'est un engagement pris, tu construis tes formules autour de ce montant pour l'offre 12 mois.` : ""}
${plancherAnalyse && plancherAnalyse > frequenceImposee ? `- Le constat terrain justifierait ${plancherAnalyse} passages : signale cet écart dans pointsAttention, sans changer la fréquence retenue.` : ""}

TA MISSION
Tu es le Responsable Commercial et Technique de Phyto Bénin. Tu construis une offre de maintenance comme le ferait un directeur commercial expérimenté qui vient de visiter le site, pas un tableur.

Le devis n'est qu'une RÉFÉRENCE qui te renseigne sur la taille, la complexité et la valeur du client. Tu ne recopies jamais son montant, tu ne le divises pas, tu ne le multiplies pas par le nombre de passages.

Tu proposes TROIS formules d'engagement : 3 mois, 6 mois et 12 mois, avec des montants différents et cohérents entre eux. Un engagement plus long doit coûter plus cher au total et moins cher au mois : c'est ce qui rend l'engagement attractif. Le premier passage est curatif et plus lourd, les suivants sont de l'entretien : ta tarification doit refléter cette réalité.

Tu fixes les montants selon le niveau de contrat ci-dessus, la superficie, les nuisibles constatés, le type de client et le potentiel de fidélisation, en respectant les pratiques du marché béninois. Un montant doit pouvoir être défendu devant le client.

RÈGLES DE DÉCISION :
1. Prestations : le contrat ne couvre QUE ce que le constat terrain a relevé. N'ajoute jamais une prestation absente du constat, ni dans les clauses ni comme "incluse". Si tu juges une prestation supplémentaire utile, formule-la comme une recommandation dans pointsAttention, clairement hors contrat.
2. Si le client a des passages ou des devis antérieurs avec GSE (voir PROFIL CLIENT ci-dessus), sers-t'en comme argument de fidélisation. Si l'historique est indisponible, ne conclus rien et signale-le dans pointsAttention.
3. Sois concret : appuie-toi sur le constat terrain (nuisibles, zones, observations du technicien). Évite les réponses génériques.
4. Tout montant que tu cites dans tes textes doit être l'un de ceux de tes formules.
5. Les zéros du gabarit JSON ci-dessous sont des marqueurs de FORMAT, jamais des valeurs. Tu les remplaces par les montants que TU détermines pour CE dossier. Deux dossiers de superficie, de niveau d'infestation ou de type de client différents doivent produire des montants différents : recopier un exemple serait une faute.
---

Produis une analyse en JSON avec exactement cette structure (réponds UNIQUEMENT avec le JSON, sans markdown) :

{
  "profil": "Description courte du profil client en 1-2 phrases",
  "niveauRisque": "CRITIQUE | ÉLEVÉ | MOYEN | FAIBLE",
  "justificationRisque": "Pourquoi ce niveau de risque en 1-2 phrases",
  "formuleRecommandee": "Formule Standard | Formule Intégrale",
  "justificationFormule": "Pourquoi cette formule en 1-2 phrases",
  "offres": [
    {"dureeMois": 3, "prixTotal": 0, "argumentaire": "Pourquoi cette formule convient, en une phrase"},
    {"dureeMois": 6, "prixTotal": 0, "argumentaire": "..."},
    {"dureeMois": 12, "prixTotal": 0, "argumentaire": "..."}
  ],
  "offreRecommandee": 12,
  "prixSuggere": 0,
  "prixTrimestre": 0,
  "justificationPrix": "Comment tu as construit ces montants, en 2 phrases, sans jamais citer le montant du devis",
  "remiseContrat": 0,
  "frequencePassages": ${frequenceImposee},
  "controlesMensuels": ${frequenceImposee <= 2 ? 0 : 8},
  "auditAnnuel": true,
  "clausesSpecifiques": ["clause 1", "clause 2", "clause 3"],
  "pointsAttention": ["point 1", "point 2"],
  "argumentCommercial": "L'argument principal à utiliser avec ce client en 2-3 phrases",
  "dureeContrat": 12,
  "paiementRecommande": "${freqClient ? freqClient.paiement : "trimestriel_avance"}"
}`

    let geminiRes
    try {
      geminiRes = await callGeminiWithRetry({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
      })
    } catch (e) {
      return NextResponse.json({ error: "❌ Gemini indisponible, réessaie dans quelques secondes. (" + (e.message || "") + ")" }, { status: 503 })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // Nettoyer la réponse (enlever les balises markdown si présentes)
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

    let analyse
    try {
      analyse = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: "Réponse Gemini non parseable", raw: rawText }, { status: 500 })
    }

    // Garde-fou métier appliqué après le JSON.parse: plancher d'infestation et
    // fréquence client, jamais laissés à la seule confiance du prompt.
    analyse = appliquerContraintes({
      analyse,
      freqClient,
      niveauInfestation: rapport ? rapport.niveau_infestation : null,
    })

    // Fréquence et paiement restent arrêtés par le code : ce sont des règles
    // métier, pas du jugement commercial. Les montants, eux, appartiennent à
    // l'IA (score commercial, pas formule de prix).
    analyse.frequencePassages = frequenceImposee
    analyse.paiementRecommande = paiementImpose
    analyse.scoreCommercial = scoring.score
    analyse.detailScore = scoring.detail
    analyse.niveauContrat = niveau.libelle

    // Un prix négocié est un engagement pris : il prime sur l'offre annuelle.
    if (negocie != null) {
      analyse.offres = (Array.isArray(analyse.offres) ? analyse.offres : [])
        .map(o => (Number(o.dureeMois) === 12 ? Object.assign({}, o, { prixTotal: negocie }) : o))
      analyse.justificationPrix = "Prix négocié avec le client, utilisé tel quel pour l'engagement annuel."
    }

    // Garde-fous de cohérence entre formules. Ils ne dictent aucun prix : ils
    // signalent une gamme incohérente (engagement long moins avantageux, offre
    // annuelle bradée sous le devis) pour arbitrage avant envoi.
    const alertesOffres = verifierCoherenceOffres(analyse.offres, { montantDevis: socle.montant })
    if (alertesOffres.length > 0) {
      analyse.pointsAttention = alertesOffres.concat(
        Array.isArray(analyse.pointsAttention) ? analyse.pointsAttention : []
      )
    }

    // prixSuggere et prixTrimestre alimentent la génération du contrat : on les
    // aligne sur la formule recommandée par l'IA, à défaut sur l'annuelle.
    const offres = Array.isArray(analyse.offres) ? analyse.offres : []
    const recommandee = offres.find(o => Number(o.dureeMois) === Number(analyse.offreRecommandee))
      || offres.find(o => Number(o.dureeMois) === 12)
      || offres[offres.length - 1]
    if (recommandee) {
      analyse.prixSuggere = Number(recommandee.prixTotal) || analyse.prixSuggere
      analyse.dureeContrat = Number(recommandee.dureeMois) || 12
      const passagesSurDuree = Math.max(1, Math.round(frequenceImposee * analyse.dureeContrat / 12))
      analyse.prixTrimestre = Math.round(analyse.prixSuggere / passagesSurDuree)
    }

    return NextResponse.json({
      success: true,
      devis: {
        numero: devis.numero,
        client: nomClient,
        entreprise: client?.entreprise,
        telephone: client?.telephone,
        adresse: client?.adresse,
        superficie: socle.superficie,
        prestations: socle.prestation ? [socle.prestation] : [],
        montant: socle.montant,
      },
      rapport: rapport ? {
        numero: rapport.numero_unique,
        date: rapport.date_visite,
        niveau: rapport.niveau_infestation,
        origine: rapportOrigine,
      } : null,
      rapportOrigine,
      score: scoring.score,
      niveauContrat: niveau.libelle,
      analyse
    })

  } catch (err) {
    console.error("analyze-contract error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
