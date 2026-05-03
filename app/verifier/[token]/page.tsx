"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function VerifierPage() {
  const params = useParams()
  const token = params.token as string
  const [att, setAtt] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("attestations")
        .select("*, clients(nom, prenom, entreprise)")
        .eq("qr_token", token)
        .eq("statut", "valide")
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }
      setAtt(data)
      setLoading(false)
    }
    if (token) load()
  }, [token])

  const dateFormatee = att?.date_traitement
    ? new Date(att.date_traitement).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : att?.generated_at
    ? new Date(att.generated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "—"

  const generatedAt = att?.generated_at
    ? new Date(att.generated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "—"

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f7f7f5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", color: "#888" }}>
      Vérification en cours…
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f5", fontFamily: "system-ui, sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ background: "#0a2e1a", borderRadius: "8px 8px 0 0", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#d4a920", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Global Solutions Entreprise</div>
            <div style={{ color: "#fff", fontSize: "20px", fontWeight: "700" }}>Phyto Bénin</div>
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textAlign: "right" }}>
            Portail de vérification<br />officielle
          </div>
        </div>

        {/* Statut */}
        {notFound ? (
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
            <h2 style={{ color: "#c0392b", margin: "0 0 12px", fontSize: "20px" }}>Document non trouvé</h2>
            <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.7", margin: 0 }}>
              Ce document ne figure pas dans notre registre officiel ou a été annulé.<br />
              Si vous pensez qu'il s'agit d'une erreur, contactez-nous à<br />
              <a href="mailto:contact@phyto-benin.com" style={{ color: "#0a2e1a", fontWeight: "600" }}>contact@phyto-benin.com</a>
            </p>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "32px" }}>

            {/* Badge validé */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: "8px", padding: "16px 20px", marginBottom: "28px" }}>
              <div style={{ fontSize: "28px" }}>✅</div>
              <div>
                <div style={{ color: "#1b5e20", fontWeight: "700", fontSize: "15px" }}>Document authentique et valide</div>
                <div style={{ color: "#388e3c", fontSize: "12px", marginTop: "2px" }}>Vérifié le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} dans le registre GSE</div>
              </div>
            </div>

            {/* Titre attestation */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{ color: "#d4a920", fontSize: "10px", fontWeight: "700", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>Document officiel vérifié</div>
              <h1 style={{ color: "#0a2e1a", fontSize: "20px", fontWeight: "700", margin: "0 0 4px" }}>ATTESTATION DE TRAITEMENT</h1>
              <div style={{ color: "#888", fontSize: "13px" }}>N° <strong style={{ color: "#0a2e1a" }}>{att.numero_unique || att.numero}</strong></div>
            </div>

            {/* Détails */}
            <div style={{ background: "#f7f7f5", border: "1px solid #e8e6e0", borderRadius: "6px", padding: "20px 24px", marginBottom: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "10px", width: "45%", verticalAlign: "top" }}>Client :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "10px" }}>
                      {att.clients?.prenom} {att.clients?.nom}
                      {att.clients?.entreprise && <span style={{ color: "#666", fontWeight: "400" }}> — {att.clients.entreprise}</span>}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "10px" }}>Prestation :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "10px" }}>{att.prestation}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "10px" }}>Date du traitement :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "10px" }}>{dateFormatee}</td>
                  </tr>
                  {att.lieu_intervention && (
                    <tr>
                      <td style={{ color: "#888", paddingBottom: "10px" }}>Lieu :</td>
                      <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "10px" }}>{att.lieu_intervention}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: "#888" }}>Émis le :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a" }}>{generatedAt}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Déclaration légale */}
            <div style={{ borderLeft: "3px solid #d4a920", paddingLeft: "16px", marginBottom: "24px" }}>
              <p style={{ color: "#444", fontSize: "13px", lineHeight: "1.7", margin: 0, fontStyle: "italic" }}>
                "Global Solutions Entreprise (GSE) atteste que les prestations mentionnées ci-dessus ont été réalisées conformément aux normes professionnelles en vigueur en République du Bénin, avec des produits homologués par les autorités sanitaires compétentes."
              </p>
            </div>

            {/* Prestataire */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "20px", borderTop: "1px solid #e8e6e0" }}>
              <div style={{ fontSize: "12px", color: "#888", lineHeight: "1.7" }}>
                <strong style={{ color: "#0a2e1a", display: "block", marginBottom: "2px" }}>Global Solutions Entreprise</strong>
                RCCM : RB/COT/24 B 38910<br />
                IFU : 3202420126111<br />
                Cotonou, Bénin<br />
                contact@phyto-benin.com
              </div>
              <div style={{ textAlign: "right", fontSize: "12px", color: "#888" }}>
                <div style={{ background: "#0a2e1a", color: "#fff", padding: "6px 12px", borderRadius: "4px", fontWeight: "700", marginBottom: "4px", fontSize: "11px" }}>
                  DOCUMENT VALIDE
                </div>
                <div>Registre GSE #{att.id?.slice(0, 8)}</div>
              </div>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "11px", color: "#aaa" }}>
          phyto-benin.com · Portail de vérification sécurisé · GSE © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
