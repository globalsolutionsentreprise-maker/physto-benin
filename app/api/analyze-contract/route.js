import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { construireSocleDevis, parseFrequenceClient, appliquerContraintes, blocRapport } from "@/lib/contrat-analyse.mjs"

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
      if (!rvClient.error && (rvClient.data || []).length > 0) {
        rapports = rvClient.data
        rapportOrigine = "autre_dossier"
      }
    }
    const rapport = rapports[0] || null
    const rapportsPrecedents = rapports.slice(1)

    if (phase === "questions") {
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
        qRes = await callGeminiWithRetry({
          contents: [{ parts: [{ text: promptQuestions }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
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
RÈGLES DE DÉCISION (à appliquer dans l'ordre) :

1. Si les notes mentionnent un montant déjà négocié ou un prix convenu (ex : "150 000 FCFA", "négocié à 200k", "prix accordé 180000", "accepté pour 250000"), extrais ce montant et utilise-le EXACTEMENT pour prixSuggere. Calcule prixTrimestre = Math.round(prixSuggere / ${freqClient ? freqClient.freq : 4}). Dans ce cas, justificationPrix = "Prix négocié, utilisé tel quel sans modification."
2. Si le client a des passages ou des devis antérieurs avec GSE (voir PROFIL CLIENT ci-dessus), c'est un client fidèle : applique une remise supplémentaire de 5 à 10 % sur le prix de référence marché. Si l'historique est indisponible, n'applique aucune remise fidélité et signale-le dans pointsAttention.
3. Sinon, propose un prix adapté au profil de risque, à la superficie et au type d'établissement.
4. Sois agile : si le contexte donne assez d'informations, propose une recommandation directe et concrète. Évite les réponses génériques.
---

Produis une analyse en JSON avec exactement cette structure (réponds UNIQUEMENT avec le JSON, sans markdown) :

{
  "profil": "Description courte du profil client en 1-2 phrases",
  "niveauRisque": "CRITIQUE | ÉLEVÉ | MOYEN | FAIBLE",
  "justificationRisque": "Pourquoi ce niveau de risque en 1-2 phrases",
  "formuleRecommandee": "Formule Standard | Formule Intégrale",
  "justificationFormule": "Pourquoi cette formule en 1-2 phrases",
  "prixSuggere": 200000,
  "prixTrimestre": 50000,
  "justificationPrix": "Explication du prix proposé par rapport au devis",
  "remiseContrat": 20,
  "frequencePassages": ${freqClient ? freqClient.freq : 4},
  "controlesMensuels": ${freqClient && freqClient.freq <= 2 ? 0 : 8},
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
      analyse
    })

  } catch (err) {
    console.error("analyze-contract error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
