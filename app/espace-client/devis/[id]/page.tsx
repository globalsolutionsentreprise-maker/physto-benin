"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "En attente de votre réponse",
  accepte: "Accepté — paiement acompte requis",
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
  // Déclaration de règlement hors site (chèque / Mobile Money). Une déclaration n'est
  // JAMAIS un paiement validé : GSE vérifie puis confirme.
  const [declForm, setDeclForm] = useState<{ open: null | "60" | "40"; mode: string; reference: string; file: File | null }>({ open: null, mode: "", reference: "", file: null })

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
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/client-devis", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (session?.access_token || "") },
      body: JSON.stringify({ action: "accepter", devisId }),
    })
    if (res.ok) {
      setDevis((prev: any) => ({ ...prev, statut: "accepte" }))
      setAction("payer60")
    } else {
      const d = await res.json().catch(() => ({}))
      setMsgResult("Erreur : " + (d.error || "action impossible"))
    }
    setSubmitting(false)
  }

  async function demanderModification() {
    if (!motifModif.trim()) return
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/client-devis", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (session?.access_token || "") },
      body: JSON.stringify({ action: "demander_modification", devisId, motif: motifModif }),
    })
    if (res.ok) {
      setDevis((prev: any) => ({ ...prev, statut: "modification_demandee", notes_modification: motifModif }))
      setAction("none")
      setMsgResult("Votre demande de modification a été envoyée à GSE. Vous serez notifié dès la mise à jour.")
    } else {
      const d = await res.json().catch(() => ({}))
      setMsgResult("Erreur : " + (d.error || "action impossible"))
    }
    setSubmitting(false)
  }

  async function declarerPaiement(type: "60" | "40") {
    setSubmitting(true)
    setMsgResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const auth: Record<string, string> = session?.access_token ? { Authorization: "Bearer " + session.access_token } : {}

      // Justificatif FACULTATIF : si absent, la déclaration se fait quand même.
      let justificatifUrl: string | null = null
      if (declForm.file) {
        const fd = new FormData()
        fd.append("devisId", devisId)
        fd.append("file", declForm.file)
        const up = await fetch("/api/justificatif-upload", { method: "POST", headers: auth, body: fd })
        const upd = await up.json().catch(() => ({}))
        if (!up.ok) { setMsgResult("Justificatif refusé : " + (upd.error || "réessayez sans fichier")); setSubmitting(false); return }
        justificatifUrl = upd.path
      }

      const res = await fetch("/api/declarer-paiement", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ devisId, typeVersement: type, mode: declForm.mode, reference: declForm.reference || null, justificatifUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDeclForm({ open: null, mode: "", reference: "", file: null })
        setMsgResult("Déclaration enregistrée. GSE va vérifier votre règlement avant de le valider — ce n'est pas encore un paiement confirmé. Votre attestation sera émise une fois le paiement intégralement confirmé.")
        const { data: paies } = await supabase.from("paiements").select("*").eq("devis_id", devisId).order("created_at")
        setPaiements(paies || [])
      } else {
        setMsgResult("Erreur : " + (data.error || "déclaration impossible"))
      }
    } catch {
      setMsgResult("Erreur réseau. Réessayez.")
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#888" }}>Chargement...</div>
  )

  const pctAcompte = devis.pct_acompte || 60
  const pctSolde = 100 - pctAcompte
  const montant60 = Math.round(devis.montant_total * pctAcompte / 100)
  const montant40 = Math.round(devis.montant_total * pctSolde / 100)
  const p60 = paiements.find(p => p.type_versement === "60")
  const p40 = paiements.find(p => p.type_versement === "40")
  const paie60 = !!p60 && p60.statut === "confirme"
  const paie40 = !!p40 && p40.statut === "confirme"
  const declare60 = !!p60 && p60.statut === "declare"
  const declare40 = !!p40 && p40.statut === "declare"

  // Bloc de déclaration de règlement hors site (réutilisé pour l'acompte et le solde).
  function blocDeclaration(type: "60" | "40", montant: number, titre: string, intro: string, couleur: string) {
    const ouvert = declForm.open === type
    return (
      <div style={{ backgroundColor: "#fefce8", borderRadius: "10px", border: `2px solid ${couleur}`, padding: "24px" }}>
        <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "8px" }}>{titre}</div>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px", lineHeight: "1.6" }}>
          {intro} <strong>{montant.toLocaleString("fr-FR")} FCFA</strong>, puis déclarez-le ci-dessous. GSE vérifie chaque règlement avant validation.
        </p>
        {!ouvert ? (
          <button onClick={() => setDeclForm({ open: type, mode: "", reference: "", file: null })}
            style={{ width: "100%", padding: "14px", backgroundColor: couleur === "#d4a920" ? "#d4a920" : "#0a2e1a", color: couleur === "#d4a920" ? "#0a2e1a" : "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}>
            Déclarer mon règlement
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "4px" }}>Mode de règlement *</label>
              <select value={declForm.mode} onChange={e => setDeclForm({ ...declForm, mode: e.target.value })}
                style={{ width: "100%", padding: "12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", background: "#fff" }}>
                <option value="">— choisir —</option>
                <option value="mobile_money">Mobile Money (MTN)</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "4px" }}>Référence (facultatif)</label>
              <input value={declForm.reference} onChange={e => setDeclForm({ ...declForm, reference: e.target.value })}
                placeholder="N° transaction Mobile Money / n° de chèque"
                style={{ width: "100%", padding: "12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "4px" }}>Justificatif (facultatif)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={e => setDeclForm({ ...declForm, file: e.target.files?.[0] || null })}
                style={{ fontSize: "13px" }} />
              <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>Facultatif — capture Mobile Money ou photo du chèque (JPEG/PNG/PDF, max 4 Mo). Vous pouvez déclarer sans fichier.</div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button disabled={submitting || !declForm.mode} onClick={() => declarerPaiement(type)}
                style={{ flex: 1, padding: "14px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "700", cursor: "pointer", opacity: (!declForm.mode || submitting) ? 0.5 : 1 }}>
                {submitting ? "Envoi..." : "Envoyer ma déclaration"}
              </button>
              <button onClick={() => setDeclForm({ open: null, mode: "", reference: "", file: null })}
                style={{ padding: "14px 20px", backgroundColor: "#fff", border: "1px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function blocEnAttente(label: string) {
    return (
      <div style={{ backgroundColor: "#fffbeb", borderRadius: "10px", border: "1px solid #fcd34d", padding: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#92400e", marginBottom: "4px" }}>⏳ Déclaration enregistrée</div>
        <p style={{ fontSize: "13px", color: "#78350f", margin: 0, lineHeight: 1.6 }}>{label} GSE vérifie votre règlement. Ce n'est pas encore un paiement confirmé — vous serez notifié dès la validation.</p>
      </div>
    )
  }

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

        {/* Superficie / Prix m² */}
        {(devis.superficie || devis.prix_m2) && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "20px 24px", marginBottom: "20px", display: "flex", gap: "32px" }}>
            {devis.superficie && (
              <div>
                <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Superficie</div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#0a2e1a" }}>{Number(devis.superficie).toLocaleString("fr-FR")} m²</div>
              </div>
            )}
            {devis.prix_m2 && (
              <div>
                <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Prix au m²</div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#0a2e1a" }}>{Number(devis.prix_m2).toLocaleString("fr-FR")} FCFA/m²</div>
              </div>
            )}
          </div>
        )}

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
            { label: "À la signature du devis", pct: pctAcompte + "%", montant: montant60, confirme: !!paie60 },
            { label: "À la fin de la prestation", pct: pctSolde + "%", montant: montant40, confirme: !!paie40 },
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
          {devis.conditions_paiement && (
            <div style={{ marginTop: "12px", padding: "12px 14px", backgroundColor: "#f0fdf4", borderRadius: "8px", fontSize: "13px", color: "#065f46", lineHeight: "1.6" }}>
              {devis.conditions_paiement}
            </div>
          )}
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

        {/* Acompte (ou paiement intégral) — déclaration hors site après acceptation.
            Les pourcentages suivent la modalité du devis (pct_acompte : 100 % intégral, 50/50, 60/40). */}
        {(devis.statut === "accepte" || action === "payer60") && !paie60 && (
          declare60
            ? blocEnAttente(pctAcompte === 100 ? "Votre paiement intégral a été déclaré." : `Votre acompte (${pctAcompte} %) a été déclaré.`)
            : blocDeclaration("60", montant60,
                pctAcompte === 100 ? "Paiement intégral (100 %)" : `Acompte (${pctAcompte} %)`,
                pctAcompte === 100 ? "Votre devis est accepté. Réglez l'intégralité de" : "Votre devis est accepté. Réglez l'acompte de",
                "#d4a920")
        )}

        {/* Solde — uniquement en cas de paiement fractionné, après livraison validée par GSE */}
        {devis.statut === "en_cours" && paie60 && !paie40 && pctSolde > 0 && (
          declare40
            ? blocEnAttente(`Votre solde (${pctSolde} %) a été déclaré.`)
            : blocDeclaration("40", montant40, `Solde (${pctSolde} %)`, "GSE a validé la livraison. Réglez le solde de", "#22c55e")
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
