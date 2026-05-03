"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import QRCode from "react-qr-code"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phyto-benin.com"

export default function AttestationPage() {
  const router = useRouter()
  const params = useParams()
  const attId = params.id as string

  const [att, setAtt] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/espace-client"); return }

      const { data: clientData } = await supabase
        .from("clients").select("*").eq("user_id", user.id).single()
      if (!clientData) { router.push("/espace-client"); return }
      setClient(clientData)

      const { data: attData, error } = await supabase
        .from("attestations").select("*").eq("id", attId).eq("client_id", clientData.id).single()
      if (error || !attData) { router.push("/espace-client/dashboard"); return }
      setAtt(attData)
      setLoading(false)
    }
    load()
  }, [attId, router])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#888" }}>
      Chargement…
    </div>
  )

  const numeroAtt = att.numero_unique || att.numero
  const verifyUrl = `${SITE_URL}/verifier/${att.qr_token}`

  const dateFormatee = att.date_traitement
    ? new Date(att.date_traitement).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : new Date(att.generated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

  const dateEmission = new Date(att.generated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .attestation-wrap { padding: 0 !important; background: white !important; }
          .attestation-card { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 50px 60px !important; border-radius: 0 !important; }
        }
      `}</style>

      {/* Barre de navigation (masquée à l'impression) */}
      <nav className="no-print" style={{ backgroundColor: "#0a2e1a", padding: "0 40px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "system-ui, sans-serif" }}>
        <button onClick={() => router.push("/espace-client/dashboard")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "13px", cursor: "pointer" }}>
          ← Tableau de bord
        </button>
        <button
          onClick={() => window.print()}
          style={{ padding: "8px 20px", backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
        >
          ⬇ Télécharger en PDF
        </button>
      </nav>

      <div className="attestation-wrap" style={{ backgroundColor: "#f7f7f5", minHeight: "100vh", padding: "40px 24px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <div
          className="attestation-card"
          style={{ maxWidth: "780px", margin: "0 auto", backgroundColor: "#ffffff", border: "1px solid #e8e6e0", borderRadius: "4px", padding: "60px 70px", position: "relative" }}
        >
          {/* Filets décoratifs */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", backgroundColor: "#0a2e1a", borderRadius: "4px 4px 0 0" }} />
          <div style={{ position: "absolute", top: "6px", left: 0, right: 0, height: "2px", backgroundColor: "#d4a920" }} />

          {/* === EN-TÊTE === */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
            <div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontWeight: "800", fontSize: "26px", color: "#0a2e1a", letterSpacing: "0.05em", marginBottom: "2px" }}>GSE</div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Global Solutions Entreprise</div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#999", lineHeight: "1.8" }}>
                <div>RCCM : RB/COT/24 B 38910</div>
                <div>IFU : 3202420126111</div>
                <div>Cotonou, Bénin · +229 01 53 04 79 50</div>
                <div>contact@phyto-benin.com</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "10px", color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Référence</div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontWeight: "700", fontSize: "14px", color: "#0a2e1a", border: "1.5px solid #0a2e1a", padding: "6px 14px", borderRadius: "4px", marginBottom: "10px" }}>
                {numeroAtt}
              </div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888" }}>Émis le : {dateEmission}</div>
            </div>
          </div>

          {/* === TITRE === */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "10px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>
              Document officiel — République du Bénin
            </div>
            <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: "24px", fontWeight: "700", color: "#0a2e1a", margin: "0 0 4px", letterSpacing: "0.03em", textTransform: "uppercase" }}>
              Attestation de Bonne Fin d'Exécution
            </h1>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#888", marginTop: "4px" }}>et de Service Fait</div>
            <div style={{ width: "60px", height: "2px", backgroundColor: "#d4a920", margin: "14px auto 0" }} />
          </div>

          {/* === FORMULE JURIDIQUE === */}
          <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#333", lineHeight: "1.9", marginBottom: "28px" }}>
            <p style={{ margin: "0 0 16px" }}>
              Je soussigné(e), <strong style={{ color: "#0a2e1a" }}>{att.responsable_nom || "Direction GSE"}</strong>, en qualité de <strong>{att.responsable_titre || "Directeur Général"}</strong> de <strong>Global Solutions Entreprise (GSE)</strong>, société agréée par l'État du Bénin pour l'exercice d'activités d'hygiène sanitaire et phytosanitaire,
            </p>
            <p style={{ margin: "0 0 0", color: "#444" }}>
              <strong>atteste par la présente</strong> que les prestations suivantes ont été réalisées conformément aux obligations contractuelles issues du devis N°&nbsp;<strong style={{ color: "#0a2e1a" }}>{att.numero}</strong>&nbsp;, dans les règles de l'art et selon les normes sanitaires en vigueur en République du Bénin :
            </p>
          </div>

          {/* === TABLEAU RÉCAPITULATIF === */}
          <div style={{ backgroundColor: "#f7f7f5", border: "1px solid #e8e6e0", borderRadius: "4px", padding: "24px 28px", marginBottom: "28px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui, sans-serif", fontSize: "14px" }}>
              <tbody>
                <tr>
                  <td style={{ color: "#888", paddingBottom: "10px", width: "38%", verticalAlign: "top" }}>Client bénéficiaire :</td>
                  <td style={{ fontWeight: "700", color: "#0a2e1a", paddingBottom: "10px" }}>
                    {client?.prenom} {client?.nom}
                    {client?.entreprise && <><br /><span style={{ fontWeight: "400", color: "#555" }}>{client.entreprise}</span></>}
                  </td>
                </tr>
                {client?.adresse && (
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "10px" }}>Adresse :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "10px" }}>{client.adresse}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: "#888", paddingBottom: "10px" }}>Nature de la prestation :</td>
                  <td style={{ fontWeight: "700", color: "#0a2e1a", paddingBottom: "10px" }}>{att.prestation}</td>
                </tr>
                <tr>
                  <td style={{ color: "#888", paddingBottom: "10px" }}>Lieu d'intervention :</td>
                  <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "10px" }}>{att.lieu_intervention || "Cotonou, Bénin"}</td>
                </tr>
                {att.superficie_m2 && (
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "10px" }}>Superficie traitée :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "10px" }}>{att.superficie_m2} m²</td>
                  </tr>
                )}
                {att.produits_utilises && (
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "10px" }}>Produits utilisés :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "10px" }}>{att.produits_utilises}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: "#888", paddingBottom: "10px" }}>Date du traitement :</td>
                  <td style={{ fontWeight: "700", color: "#0a2e1a", paddingBottom: "10px" }}>{dateFormatee}</td>
                </tr>
                <tr>
                  <td style={{ color: "#888" }}>Technicien responsable :</td>
                  <td style={{ fontWeight: "600", color: "#0a2e1a" }}>{att.technicien || "Équipe GSE"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* === DÉCLARATION FINALE === */}
          <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "13.5px", color: "#444", lineHeight: "1.9", marginBottom: "36px" }}>
            <p style={{ margin: "0 0 10px" }}>
              Les travaux ont été exécutés avec diligence et professionnalisme. Les produits employés sont homologués par les autorités sanitaires compétentes. La prestation a donné entière satisfaction.
            </p>
            <p style={{ margin: 0, fontStyle: "italic", color: "#666", fontSize: "13px" }}>
              Cette attestation est délivrée à la demande expresse du client et peut être présentée à toute autorité compétente, administration publique ou partenaire privé pour valoir ce que de droit.
            </p>
          </div>

          {/* === SIGNATURE + QR CODE === */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "24px", borderTop: "1px solid #e8e6e0" }}>

            {/* Signature */}
            <div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#888", marginBottom: "6px" }}>Fait à Cotonou, le {dateEmission}</div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#888", marginBottom: "16px" }}>Pour Global Solutions Entreprise (GSE)</div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "12px", fontWeight: "700", color: "#0a2e1a" }}>{att.responsable_nom || "Direction GSE"}</div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888" }}>{att.responsable_titre || "Directeur Général"}</div>
              <div style={{ width: "120px", height: "50px", borderBottom: "1.5px solid #0a2e1a", marginTop: "24px" }} />
            </div>

            {/* QR Code */}
            <div style={{ textAlign: "center" }}>
              <div style={{ padding: "10px", border: "1.5px solid #e8e6e0", borderRadius: "6px", display: "inline-block", background: "#fff", marginBottom: "6px" }}>
                <QRCode value={verifyUrl} size={90} fgColor="#0a2e1a" bgColor="#ffffff" />
              </div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "10px", color: "#888", maxWidth: "110px" }}>
                Scanner pour vérifier l'authenticité
              </div>
            </div>
          </div>

          {/* === AVERTISSEMENT LÉGAL === */}
          <div style={{ marginTop: "28px", padding: "12px 16px", background: "#f7f7f5", border: "1px solid #e8e6e0", borderRadius: "4px" }}>
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "10px", color: "#999", margin: 0, lineHeight: "1.6" }}>
              ⚠️ Document généré automatiquement et archivé dans le système sécurisé de Global Solutions Entreprise. Toute falsification, modification ou usage frauduleux de ce document est passible de poursuites judiciaires conformément au droit béninois en vigueur. Authenticité vérifiable à l'adresse : <span style={{ color: "#0a2e1a" }}>{verifyUrl}</span>
            </p>
          </div>

          {/* Filets bas */}
          <div style={{ position: "absolute", bottom: "6px", left: 0, right: 0, height: "2px", backgroundColor: "#d4a920" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", backgroundColor: "#0a2e1a", borderRadius: "0 0 4px 4px" }} />
        </div>
      </div>
    </>
  )
}
