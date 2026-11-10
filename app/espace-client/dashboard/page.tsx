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

const CAT_LABEL: Record<string, string> = {
  facture: "Facture", rapport_intervention: "Rapport d'intervention", fiche_technique: "Fiche technique",
  fiche_controle: "Fiche de contrôle", attestation: "Attestation", contrat: "Contrat", devis: "Devis", autre: "Document",
}

export default function Dashboard() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [devisList, setDevisList] = useState<any[]>([])
  const [attestations, setAttestations] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [docCat, setDocCat] = useState<string>("tous")
  const [docQuery, setDocQuery] = useState<string>("")
  const [docMsg, setDocMsg] = useState<string | null>(null)
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

      // Documents mis à disposition : la RLS ne renvoie que les documents PUBLIÉS
      // de cet établissement ; les filtres explicites confirment l'intention.
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("client_id", clientData.id)
        .eq("statut", "publie")
        .order("date_document", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
      setDocuments(docs || [])

      setLoading(false)
    }
    load()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push("/espace-client")
  }

  // Téléchargement sécurisé : la route vérifie propriété + statut publié, puis
  // renvoie une URL signée courte (le bucket est privé).
  async function ouvrirDocument(id: string) {
    setDocMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/client-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (session?.access_token || "") },
        body: JSON.stringify({ action: "download", documentId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) window.open(data.url, "_blank", "noopener")
      else setDocMsg("Document indisponible pour le moment. Réessayez.")
    } catch {
      setDocMsg("Erreur réseau. Réessayez.")
    }
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

        {/* Mes documents */}
        <section style={{ marginTop: "40px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #e8e6e0" }}>
            Mes documents
          </h2>
          {documents.length === 0 ? (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "40px", textAlign: "center", color: "#888", fontSize: "14px" }}>
              Aucun document disponible pour l'instant. GSE met vos documents à disposition ici au fur et à mesure.
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
                {["tous", ...Array.from(new Set(documents.map(d => d.categorie)))].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setDocCat(cat)}
                    style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", border: "1px solid " + (docCat === cat ? "#0a2e1a" : "#e0ddd6"), backgroundColor: docCat === cat ? "#0a2e1a" : "#fff", color: docCat === cat ? "#fff" : "#444", fontWeight: docCat === cat ? 600 : 400 }}
                  >
                    {cat === "tous" ? "Tous" : (CAT_LABEL[cat] || cat)}
                  </button>
                ))}
                <input
                  value={docQuery}
                  onChange={e => setDocQuery(e.target.value)}
                  placeholder="Rechercher (référence, titre)…"
                  style={{ marginLeft: "auto", padding: "8px 12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "13px", minWidth: "160px", flex: "1 1 160px", maxWidth: "260px" }}
                />
              </div>
              {docMsg && (
                <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" }}>{docMsg}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {documents
                  .filter(d => (docCat === "tous" || d.categorie === docCat)
                    && (!docQuery || (d.reference || "").toLowerCase().includes(docQuery.toLowerCase()) || (d.titre || "").toLowerCase().includes(docQuery.toLowerCase())))
                  .map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => ouvrirDocument(doc.id)}
                      style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: "12px" }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#d4a920", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>{CAT_LABEL[doc.categorie] || doc.categorie}</div>
                        <div style={{ fontSize: "15px", color: "#333", fontWeight: "500" }}>{doc.titre}</div>
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "4px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          {doc.date_document && <span>{new Date(doc.date_document).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>}
                          {doc.reference && <span>Réf. {doc.reference}</span>}
                        </div>
                      </div>
                      <span style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", backgroundColor: "#0a2e1a", color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}>Ouvrir le PDF</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
