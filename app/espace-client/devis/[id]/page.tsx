"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "En attente de votre réponse",
  accepte: "Accepté — paiement 60% requis",
  modification_demandee: "Modification en cours",
  en_cours: "Prestation en cours",
  termine: "Terminé",
  annule: "Annulé",
}

export default function DevisPage() {
  const router = useRouter()
  const params = useParams()
  const devisId = params.id as string

  const [devis, setDevis] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [paiements, setPaiements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<"none" | "modifier" | "payer60" | "payer40">("none")
  const [motifModif, setMotifModif] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [msgResult, setMsgResult] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/espace-client"); return }

      const { data: clientData } = await supabase
        .from("clients").select("*").eq("user_id", user.id).single()
      if (!clientData) { router.push("/espace-client"); return }
      setClient(clientData)

      const { data: devisData, error } = await supabase
        .from("devis").select("*").eq("id", devisId).eq("client_id", clientData.id).single()
      if (error || !devisData) { router.push("/espace-client/dashboard"); return }
      setDevis(devisData)

      const { data: paies } = await supabase
        .from("paiements").select("*").eq("devis_id", devisId).order("created_at")
      setPaiements(paies || [])

      setLoading(false)
    }
    load()
  }, [devisId, router])

  async function accepterDevis() {
    setSubmitting(true)
    await supabase.from("devis").update({
      statut: "accepte",
      date_acceptation: new Date().toISOString(),
    }).eq("id", devisId)
    setDevis((prev: any) => ({ ...prev, statut: "accepte" }))
    setAction("payer60")
    setSubmitting(false)
  }

  async function demanderModification() {
    if (!motifModif.trim()) return
    setSubmitting(true)
    await supabase.from("devis").update({
      statut: "modification_demandee",
      notes_modification: motifModif,
    }).eq("id", devisId)
    setDevis((prev: any) => ({ ...prev, statut: "modification_demandee", notes_modification: motifModif }))
    setAction("none")
    setMsgResult("Votre demande de modification a été envoyée à GSE. Vous serez notifié dès la mise à jour.")
    setSubmitting(false)
  }

  async function lancerPaiement(type: "60" | "40") {
    setSubmitting(true)
    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId, typeVersement: type }),
      })
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        setMsgResult("Erreur lors de la création du paiement. Contactez GSE.")
      }
    } catch {
      setMsgResult("Erreur réseau. Réessayez.")
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#888" }}>Chargement...</div>
  )

  const montant60 = Math.round(devis.montant_total * 0.6)
  const montant40 = Math.round(devis.montant_total * 0.4)
  const paie60 = paiements.find(p => p.type_versement === "60" && p.statut === "confirme")
  const paie40 = paiements.find(p => p.type_versement === "40" && p.statut === "confirme")

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f7f7f5", minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{ backgroundColor: "#0a2e1a", padding: "0 40px", height: "60px", display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={() => router.push("/espace-client/dashboard")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "13px", cursor: "pointer" }}>← Tableau de bord</button>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
        <span style={{ color: "#d4a920", fontWeight: "600", fontSize: "13px" }}>{devis.numero}</span>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>

        {/* En-tête devis */}
        <div style={{ backgroundColor: "#0a2e1a", borderRadius: "12px", padding: "32px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "8px" }}>DEVIS</div>
            <h1 style={{ fontSize: "22px", fontWeight: "300", color: "#ffffff", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              {devis.prestation}
            </h1>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{devis.numero}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "28px", fontWeight: "300", color: "#d4a920" }}>
              {Number(devis.montant_total).toLocaleString("fr-FR")}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>FCFA TTC</div>
          </div>
        </div>

        {/* Statut */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "20px 24px", marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Statut du dossier</div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a" }}>{STATUT_LABELS[devis.statut] || devis.statut}</div>
          {devis.notes_modification && (
            <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f0f4ff", borderRadius: "8px", fontSize: "13px", color: "#444" }}>
              <strong>Votre demande de modification :</strong> {devis.notes_modification}
            </div>
          )}
        </div>

        {/* Description */}
        {devis.description && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "24px", marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Détails de la prestation</div>
            <p style={{ fontSize: "15px", color: "#333", lineHeight: "1.7", margin: 0, whiteSpace: "pre-wrap" }}>{devis.description}</p>
          </div>
        )}

        {/* Plan de paiement */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "24px", marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plan de paiement</div>
          {[
            { label: "À la signature du devis", pct: "60%", montant: montant60, confirme: !!paie60 },
            { label: "À la fin de la prestation", pct: "40%", montant: montant40, confirme: !!paie40 },
          ].map(v => (
            <div key={v.pct} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f0ede6" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{v.pct}</div>
                <div style={{ fontSize: "12px", color: "#888" }}>{v.label}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a" }}>{v.montant.toLocaleString("fr-FR")} FCFA</div>
                {v.confirme
                  ? <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", backgroundColor: "#d1fae5", color: "#065f46" }}>✓ Payé</span>
                  : <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", backgroundColor: "#fef3c7", color: "#92400e" }}>En attente</span>
                }
              </div>
            </div>
          ))}
        </div>

        {/* Message résultat */}
        {msgResult && (
          <div style={{ padding: "16px 20px", borderRadius: "10px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#065f46", fontSize: "14px", marginBottom: "20px" }}>
            {msgResult}
          </div>
        )}

        {/* Actions selon statut */}
        {devis.statut === "envoye" && action === "none" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={accepterDevis}
              disabled={submitting}
              style={{ padding: "16px", backgroundColor: "#0a2e1a", color: "#ffffff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
            >
              ✓ Accepter ce devis et procéder au paiement
            </button>
            <button
              onClick={() => setAction("modifier")}
              style={{ padding: "16px", backgroundColor: "#ffffff", color: "#0a2e1a", border: "2px solid #0a2e1a", borderRadius: "10px", fontSize: "14px", cursor: "pointer" }}
            >
              Demander une modification
            </button>
          </div>
        )}

        {action === "modifier" && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "24px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "8px" }}>Votre demande de modification</div>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>Expliquez ce que vous souhaitez modifier et pourquoi. GSE vous renverra un devis mis à jour.</p>
            <textarea
              value={motifModif}
              onChange={e => setMotifModif(e.target.value)}
              rows={5}
              placeholder="Ex : Je souhaite que la prestation inclut également la réserve alimentaire, et que le délai d'intervention soit raccourci à 48h..."
              style={{ width: "100%", padding: "14px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", resize: "vertical", boxSizing: "border-box", lineHeight: "1.6" }}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                onClick={demanderModification}
                disabled={submitting || !motifModif.trim()}
                style={{ flex: 1, padding: "14px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", opacity: !motifModif.trim() ? 0.5 : 1 }}
              >
                {submitting ? "Envoi..." : "Envoyer ma demande"}
              </button>
              <button
                onClick={() => setAction("none")}
                style={{ padding: "14px 20px", backgroundColor: "#fff", border: "1px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Payer 60% après acceptation */}
        {(devis.statut === "accepte" || action === "payer60") && !paie60 && (
          <div style={{ backgroundColor: "#fefce8", borderRadius: "10px", border: "2px solid #d4a920", padding: "24px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "8px" }}>
              Paiement du premier versement (60%)
            </div>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "20px", lineHeight: "1.6" }}>
              Votre devis est accepté. Pour démarrer la prestation, effectuez le paiement du premier versement de <strong>{montant60.toLocaleString("fr-FR")} FCFA</strong> via Feday Pay.
            </p>
            <button
              onClick={() => lancerPaiement("60")}
              disabled={submitting}
              style={{ width: "100%", padding: "16px", backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
            >
              {submitting ? "Redirection..." : `Payer ${montant60.toLocaleString("fr-FR")} FCFA via Feday Pay`}
            </button>
          </div>
        )}

        {/* Payer 40% (déclenché par admin) */}
        {devis.statut === "en_cours" && paie60 && !paie40 && (
          <div style={{ backgroundColor: "#f0fdf4", borderRadius: "10px", border: "2px solid #22c55e", padding: "24px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "8px" }}>
              Prestation terminée — Solde final (40%)
            </div>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "20px", lineHeight: "1.6" }}>
              GSE a validé la livraison de votre prestation. Réglez le solde de <strong>{montant40.toLocaleString("fr-FR")} FCFA</strong> pour recevoir votre attestation de traitement.
            </p>
            <button
              onClick={() => lancerPaiement("40")}
              disabled={submitting}
              style={{ width: "100%", padding: "16px", backgroundColor: "#0a2e1a", color: "#ffffff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
            >
              {submitting ? "Redirection..." : `Payer le solde — ${montant40.toLocaleString("fr-FR")} FCFA`}
            </button>
          </div>
        )}

        {/* Attestation disponible */}
        {devis.statut === "termine" && paie40 && (
          <div style={{ backgroundColor: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>✅</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#065f46", marginBottom: "6px" }}>Dossier complet</div>
            <p style={{ fontSize: "13px", color: "#444", marginBottom: "16px" }}>Votre attestation de traitement est disponible dans votre espace client.</p>
            <button
              onClick={() => router.push("/espace-client/dashboard")}
              style={{ padding: "12px 24px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}
            >
              Voir mes attestations
            </button>
          </div>
        )}

        {/* Lien PDF devis */}
        {devis.pdf_url && (
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <a href={devis.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: "#888", textDecoration: "underline" }}>
              Télécharger le PDF du devis
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
