"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

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

  function imprimer() {
    window.print()
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#888" }}>Chargement...</div>
  )

  const dateFormatee = att.date_traitement
    ? new Date(att.date_traitement).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : new Date(att.generated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .attestation-card { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 40px !important; }
        }
      `}</style>

      {/* Nav (masquée à l'impression) */}
      <nav className="no-print" style={{ backgroundColor: "#0a2e1a", padding: "0 40px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={() => router.push("/espace-client/dashboard")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "13px", cursor: "pointer" }}>← Tableau de bord</button>
        </div>
        <button
          onClick={imprimer}
          style={{ padding: "8px 20px", backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
        >
          Télécharger en PDF
        </button>
      </nav>

      {/* Attestation */}
      <div style={{ backgroundColor: "#f7f7f5", minHeight: "100vh", padding: "40px 24px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <div
          className="attestation-card"
          style={{ maxWidth: "760px", margin: "0 auto", backgroundColor: "#ffffff", border: "1px solid #e8e6e0", borderRadius: "4px", padding: "60px 70px", position: "relative" }}
        >
          {/* Filet décoratif haut */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", backgroundColor: "#0a2e1a" }} />
          <div style={{ position: "absolute", top: "6px", left: 0, right: 0, height: "2px", backgroundColor: "#d4a920" }} />

          {/* En-tête */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
            <div>
              {/* Logo textuel (remplacer par <img> si logo disponible) */}
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: "800", fontSize: "24px", color: "#0a2e1a", letterSpacing: "0.05em" }}>GSE</span>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888", display: "block", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>Global Solutions Entreprise</span>
              </div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888", lineHeight: "1.7" }}>
                <div>RCCM : RB/COT/24 B 38910</div>
                <div>IFU : 3202420126111</div>
                <div>Cotonou, Bénin · +229 01 53 04 79 50</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>N° Agrément</div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontWeight: "700", fontSize: "13px", color: "#0a2e1a", border: "1.5px solid #0a2e1a", padding: "6px 12px", borderRadius: "4px" }}>
                N° AGREMENT-BENIN-XXXXX
              </div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888", marginTop: "8px" }}>Réf. : {att.numero}</div>
            </div>
          </div>

          {/* Titre */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "10px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>
              Document officiel
            </div>
            <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: "22px", fontWeight: "700", color: "#0a2e1a", margin: "0 0 6px", letterSpacing: "0.02em" }}>
              ATTESTATION DE TRAITEMENT
            </h1>
            <div style={{ width: "60px", height: "2px", backgroundColor: "#d4a920", margin: "12px auto 0" }} />
          </div>

          {/* Corps */}
          <div style={{ fontSize: "15px", color: "#333", lineHeight: "2", marginBottom: "32px" }}>
            <p style={{ margin: "0 0 16px" }}>
              Global Solutions Entreprise (GSE), société agréée par l'État du Bénin,
              atteste avoir réalisé la prestation suivante au bénéfice de :
            </p>

            {/* Bloc client */}
            <div style={{ backgroundColor: "#f7f7f5", border: "1px solid #e8e6e0", borderRadius: "4px", padding: "20px 24px", marginBottom: "24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "8px", width: "40%" }}>Client :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "8px" }}>
                      {client?.prenom} {client?.nom}
                      {client?.entreprise && ` — ${client.entreprise}`}
                    </td>
                  </tr>
                  {client?.adresse && (
                    <tr>
                      <td style={{ color: "#888", paddingBottom: "8px" }}>Adresse :</td>
                      <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "8px" }}>{client.adresse}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "8px" }}>Prestation :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "8px" }}>{att.prestation}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "8px" }}>Date du traitement :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "8px" }}>{dateFormatee}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#888" }}>Technicien responsable :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a" }}>{att.technicien}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p style={{ margin: "0 0 12px" }}>
              Le traitement a été réalisé conformément aux normes professionnelles en vigueur,
              avec des produits homologués par les autorités sanitaires compétentes.
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
              Cette attestation est délivrée à la demande du client et peut être présentée
              à toute autorité compétente.
            </p>
          </div>

          {/* Pied */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #e8e6e0" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Fait à Cotonou, le {dateFormatee}</div>
              <div style={{ fontSize: "12px", color: "#888" }}>Pour Global Solutions Entreprise</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "120px", height: "60px", border: "1px dashed #ccc", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "11px", color: "#ccc" }}>Cachet GSE</span>
              </div>
              <div style={{ fontSize: "11px", color: "#888", marginTop: "6px" }}>Signature autorisée</div>
            </div>
          </div>

          {/* Filet bas */}
          <div style={{ position: "absolute", bottom: "6px", left: 0, right: 0, height: "2px", backgroundColor: "#d4a920" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", backgroundColor: "#0a2e1a" }} />
        </div>
      </div>
    </>
  )
}
