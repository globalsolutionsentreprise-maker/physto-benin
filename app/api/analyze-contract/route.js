import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
    const { devisId, typeEtablissement, demandeClient, notes } = await req.json()

    if (!devisId) return NextResponse.json({ error: "devisId requis" }, { status: 400 })

    // Charger le devis + client depuis Supabase
    const { data: devis, error: devisErr } = await supabase
      .from("devis")
      .select("*, clients(*)")
      .eq("id", devisId)
      .single()

    if (devisErr || !devis) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })

    // Historique du client
    const { data: historique } = await supabase
      .from("devis")
      .select("id, statut, created_at, montant")
      .eq("client_id", devis.client_id)
      .order("created_at", { ascending: false })

    const { data: fiches } = await supabase
      .from("fiches_passage")
      .select("id, date_passage, type_passage")
      .eq("client_id", devis.client_id)
      .order("date_passage", { ascending: false })

    const client = devis.clients
    const nomClient = [client?.prenom, client?.nom].filter(Boolean).join(" ")
    const nbDevisAntérieurs = (historique || []).filter(d => d.id !== devisId).length
    const nbFiches = (fiches || []).length

    // Extraire la fréquence depuis la demande client (déterministe, pas laissé à l'IA)
    function parseFrequenceClient(texte) {
      const t = (texte || "").toLowerCase()
      if (/\b1\s*passage|\bune?\s*fois|\bannuel|\b1\s*fois/.test(t)) return { freq: 1, paiement: "annuel" }
      if (/\b2\s*passages?|\bsemestriel|\bdeux\s*fois|\bdeux\s*passages?|\b2\s*fois/.test(t)) return { freq: 2, paiement: "semestriel" }
      if (/\b4\s*passages?|\btrimestriel|\bquatre\s*fois|\bquatre\s*passages?|\b4\s*fois/.test(t)) return { freq: 4, paiement: "trimestriel_avance" }
      if (/\b6\s*passages?|\bbimestriel|\bsix\s*fois/.test(t)) return { freq: 6, paiement: "trimestriel_avance" }
      if (/\b12\s*passages?|\bmensuel|\bchaque\s*mois|\btous\s*les\s*mois/.test(t)) return { freq: 12, paiement: "mensuel" }
      return null
    }

    const freqClient = parseFrequenceClient(demandeClient)

    const prompt = `Tu es un conseiller commercial senior de Global Solutions Entreprise (GSE), société agréée de dératisation, désinsectisation et désinfection à Cotonou, Bénin.

Tu dois analyser les informations ci-dessous et produire une recommandation structurée pour la rédaction d'un contrat d'entretien annuel.

---
DEVIS DE RÉFÉRENCE
- Référence : ${devis.numero}
- Client : ${nomClient}${client?.entreprise ? " — " + client.entreprise : ""}
- Prestation(s) : ${Array.isArray(devis.prestations) ? devis.prestations.join(" + ") : devis.prestation || "Non précisé"}
- Superficie : ${devis.superficie ? devis.superficie + " m²" : "Non précisée"}
- Montant devis : ${devis.montant ? devis.montant.toLocaleString("fr-FR") + " FCFA" : "Non précisé"}
- Remise accordée : ${devis.remise ? devis.remise + "%" : "Aucune"}
- Statut devis : ${devis.statut}

PROFIL CLIENT
- Nombre de devis antérieurs avec GSE : ${nbDevisAntérieurs}
- Nombre de fiches de passage antérieures : ${nbFiches}
- Statut : ${nbDevisAntérieurs === 0 && nbFiches === 0 ? "Nouveau client" : "Client existant"}

CONTEXTE COMPLÉMENTAIRE
- Type d'établissement : ${typeEtablissement || "Non précisé"}
- Demande du client : ${demandeClient || "Non précisé"}
- Notes : ${notes || "Aucune"}
${freqClient ? `
⚠️ FRÉQUENCE IMPOSÉE PAR LE CLIENT : ${freqClient.freq} passage(s)/an — paiementRecommande = "${freqClient.paiement}"
Tu DOIS mettre "frequencePassages": ${freqClient.freq} et "paiementRecommande": "${freqClient.paiement}" dans ta réponse JSON. Ces deux valeurs sont NON NÉGOCIABLES. Si tu estimes la fréquence insuffisante, ajoute une note dans "pointsAttention" uniquement.
` : ""}
RÈGLES DE DÉCISION (à appliquer dans l'ordre) :

1. Si les notes mentionnent un montant déjà négocié ou un prix convenu (ex : "150 000 FCFA", "négocié à 200k", "prix accordé 180000", "accepté pour 250000"), extrais ce montant et utilise-le EXACTEMENT pour prixSuggere. Calcule prixTrimestre = Math.round(prixSuggere / ${freqClient ? freqClient.freq : 4}). Dans ce cas, justificationPrix = "Prix négocié — utilisé tel quel sans modification."
2. Si le client a ${nbFiches} fiches de passage ou ${nbDevisAntérieurs} devis antérieurs, c'est un client fidèle : applique une remise supplémentaire de 5 à 10 % sur le prix de référence marché.
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
      return NextResponse.json({ error: "❌ Gemini indisponible — réessaie dans quelques secondes. (" + (e.message || "") + ")" }, { status: 503 })
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

    // Garantie finale : si la fréquence client a été parsée, on l'impose quelle que soit la réponse de l'IA
    if (freqClient) {
      analyse.frequencePassages = freqClient.freq
      analyse.paiementRecommande = freqClient.paiement
    }

    return NextResponse.json({
      success: true,
      devis: {
        numero: devis.numero,
        client: nomClient,
        entreprise: client?.entreprise,
        telephone: client?.telephone,
        adresse: client?.adresse,
        superficie: devis.superficie,
        prestations: Array.isArray(devis.prestations) ? devis.prestations : [devis.prestation].filter(Boolean),
        montant: devis.montant,
      },
      analyse
    })

  } catch (err) {
    console.error("analyze-contract error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
