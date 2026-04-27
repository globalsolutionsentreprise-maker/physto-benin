"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  brouillon:            { label: "Brouillon",           color: "#92400e", bg: "#fef3c7" },
  envoye:               { label: "En attente de réponse", color: "#1e40af", bg: "#dbeafe" },
  accepte:              { label: "Accepté — 60% en attente", color: "#065f46", bg: "#d1fae5" },
  modification_demandee:{ label: "Modification demandée", color: "#7c3aed", bg: "#ede9fe" },
  en_cours:             { label: "Prestation en cours", color: "#065f46", bg: "#d1fae5" },
  termine:              { label: "Terminé",             color: "#1f2937", bg: "#f3f4f6" },
  annule:               { label: "Annulé",              color: "#991b1b", bg: "#fee2e2" },
}

export default function Dashboard() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [devisList, setDevisList] = useState<any[]>([])
  const [attestations, setAttestations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/espace-client"); return }

      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (!clientData) { router.push("/espace-client"); return }
      setClient(clientData)

      const { data: devis } = await supabase
        .from("devis")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false })
      setDevisList(devis || [])

      const { data: atts } = await supabase
        .from("attestations")
        .select("*")
        .eq("client_id", clientData.id)
        .order("generated_at", { ascending: false })
      setAttestations(atts || [])

      setLoading(false)
    }
    load()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push("/espace-client")
  }

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#888" }}>Chargement...</div>
  }

  const devisActifs = devisList.filter(d => !["termine","annule"].includes(d.statut))
  const devisTermines = devisList.filter(d => d.statut === "termine")

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f7f7f5", minHeight: "100vh" }}>

      {/* Barre de navigation */}
      <nav style={{ backgroundColor: "#0a2e1a", padding: "0 40px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#d4a920", fontWeight: "700", fontSize: "16px", letterSpacing: "0.05em" }}>GSE</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Espace client</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px" }}>{client?.prenom} {client?.nom}</span>
          <button onClick={logout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Bonjour */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: "300", color: "#0a2e1a", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Bonjour, <strong style={{ fontWeight: "600" }}>{client?.prenom || client?.nom}</strong>
          </h1>
          {client?.entreprise && <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>{client.entreprise}</p>}
        </div>

        {/* Stats rapides */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "40px" }}>
          {[
            { label: "Devis actifs", value: devisActifs.length, color: "#0a2e1a" },
            { label: "Prestations terminées", value: devisTermines.length, color: "#065f46" },
            { label: "Attestations disponibles", value: attestations.length, color: "#d4a920" },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "24px" }}>
              <div style={{ fontSize: "32px", fontWeight: "300", color: stat.color, marginBottom: "6px" }}>{stat.value}</div>
              <div style={{ fontSize: "12px", color: "#888", fontWeight: "500", letterSpacing: "0.04em", textTransform: "uppercase" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Devis actifs */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #e8e6e0" }}>
            Vos devis
          </h2>

          {devisList.length === 0 ? (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "40px", textAlign: "center", color: "#888", fontSize: "14px" }}>
              Aucun devis pour l'instant. GSE vous en enverra un après votre demande.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {devisList.map(devis => {
                const statut = STATUT_LABELS[devis.statut] || { label: devis.statut, color: "#444", bg: "#f3f4f6" }
                return (
                  <div
                    key={devis.id}
                    onClick={() => router.push(`/espace-client/devis/${devis.id}`)}
                    style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#0a2e1a")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8e6e0")}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0a2e1a", marginBottom: "4px" }}>{devis.numero}</div>
                      <div style={{ fontSize: "15px", color: "#333", marginBottom: "4px" }}>{devis.prestation}</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>
                        {new Date(devis.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "18px", fontWeight: "600", color: "#0a2e1a" }}>
                          {Number(devis.montant_total).toLocaleString("fr-FR")} FCFA
                        </div>
                      </div>
                      <span style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: statut.bg, color: statut.color, whiteSpace: "nowrap" }}>
                        {statut.label}
                      </span>
                      <span style={{ color: "#ccc", fontSize: "18px" }}>→</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Attestations */}
        {attestations.length > 0 && (
          <section>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #e8e6e0" }}>
              Attestations de traitement
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {attestations.map(att => (
                <div
                  key={att.id}
                  onClick={() => router.push(`/espace-client/attestations/${att.id}`)}
                  style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#d4a920")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8e6e0")}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#d4a920", marginBottom: "4px" }}>{att.numero}</div>
                    <div style={{ fontSize: "15px", color: "#333" }}>{att.prestation}</div>
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                      Délivrée le {new Date(att.generated_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: "#d1fae5", color: "#065f46" }}>
                      ✓ Disponible
                    </span>
                    <span style={{ color: "#ccc", fontSize: "18px" }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
