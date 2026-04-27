"use client"
import { useState, useEffect } from "react"

// Ce composant s'intègre dans ton admin/page.js existant
// Copier ce contenu comme un nouvel onglet "Clients & Devis"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  brouillon:            { label: "Brouillon",            color: "#92400e", bg: "#fef3c7" },
  envoye:               { label: "Envoyé",               color: "#1e40af", bg: "#dbeafe" },
  accepte:              { label: "Accepté",              color: "#065f46", bg: "#d1fae5" },
  modification_demandee:{ label: "Modif. demandée",      color: "#7c3aed", bg: "#ede9fe" },
  en_cours:             { label: "En cours",             color: "#0f766e", bg: "#ccfbf1" },
  termine:              { label: "Terminé",              color: "#1f2937", bg: "#f3f4f6" },
  annule:               { label: "Annulé",               color: "#991b1b", bg: "#fee2e2" },
}

function creerSupabase() {
  const { createClient } = require("@supabase/supabase-js")
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export default function AdminClientsDevis() {
  const [devisList, setDevisList] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevis, setSelectedDevis] = useState<any | null>(null)
  const [showNewDevis, setShowNewDevis] = useState(false)
  const [validating, setValidating] = useState<string | null>(null)
  const [filterStatut, setFilterStatut] = useState("tous")

  // Formulaire nouveau devis
  const [formDevis, setFormDevis] = useState({
    clientId: "",
    prestation: "",
    description: "",
    montantTotal: "",
  })
  const [submittingDevis, setSubmittingDevis] = useState(false)

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    const db = creerSupabase()
    const [{ data: devis }, { data: cls }] = await Promise.all([
      db.from("devis").select("*, clients(nom, prenom, entreprise, email)").order("created_at", { ascending: false }),
      db.from("clients").select("id, nom, prenom, entreprise, email").order("nom"),
    ])
    setDevisList(devis || [])
    setClients(cls || [])
    setLoading(false)
  }

  async function creerDevis() {
    if (!formDevis.clientId || !formDevis.prestation || !formDevis.montantTotal) return
    setSubmittingDevis(true)
    const db = creerSupabase()

    const { data: numData } = await db.rpc("generate_devis_numero")
    const { error } = await db.from("devis").insert({
      client_id: formDevis.clientId,
      numero: numData || `DEV-${Date.now()}`,
      prestation: formDevis.prestation,
      description: formDevis.description,
      montant_total: parseFloat(formDevis.montantTotal),
      statut: "envoye",
      date_envoi: new Date().toISOString(),
    })

    if (!error) {
      setShowNewDevis(false)
      setFormDevis({ clientId: "", prestation: "", description: "", montantTotal: "" })
      await charger()
    } else {
      alert("Erreur: " + error.message)
    }
    setSubmittingDevis(false)
  }

  async function validerLivraison(devisId: string) {
    setValidating(devisId)
    const db = creerSupabase()

    // Mettre à jour le statut (le webhook de FedaPay gérera après le paiement 40%)
    // Ici on marque que la livraison est validée par l'admin
    // Le client verra le bouton "Payer 40%" apparaître
    await db.from("devis").update({
      statut: "en_cours",
      date_livraison: new Date().toISOString(),
    }).eq("id", devisId)

    await charger()
    setValidating(null)
  }

  const devisFiltres = filterStatut === "tous"
    ? devisList
    : devisList.filter(d => d.statut === filterStatut)

  return (
    <div>
      {/* Outils devis GSE intégré */}
      <div style={{ marginBottom: "32px", backgroundColor: "#f7f7f5", border: "1px solid #e8e6e0", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", backgroundColor: "#0a2e1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#d4a920", fontWeight: "700", fontSize: "14px" }}>Générateur de devis GSE</span>
          <a href="https://globalsolutionsentreprise-maker.github.io/gse-devis/" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
            Ouvrir en plein écran ↗
          </a>
        </div>
        <iframe
          src="https://globalsolutionsentreprise-maker.github.io/gse-devis/"
          style={{ width: "100%", height: "600px", border: "none", display: "block" }}
          title="Générateur de devis GSE"
        />
      </div>

      {/* En-tête section devis */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#0a2e1a", margin: 0 }}>Devis clients</h2>
        <button
          onClick={() => setShowNewDevis(true)}
          style={{ padding: "10px 20px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
        >
          + Nouveau devis
        </button>
      </div>

      {/* Filtres statut */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {["tous", "envoye", "accepte", "modification_demandee", "en_cours", "termine"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatut(s)}
            style={{
              padding: "6px 14px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", border: "none",
              backgroundColor: filterStatut === s ? "#0a2e1a" : "#f0ede6",
              color: filterStatut === s ? "#fff" : "#444",
              fontWeight: filterStatut === s ? "600" : "400",
            }}
          >
            {s === "tous" ? "Tous" : (STATUT_LABELS[s]?.label || s)}
          </button>
        ))}
      </div>

      {/* Formulaire nouveau devis */}
      {showNewDevis && (
        <div style={{ backgroundColor: "#fff", border: "2px solid #0a2e1a", borderRadius: "10px", padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a", margin: "0 0 20px" }}>Créer et envoyer un devis</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#888", marginBottom: "6px", textTransform: "uppercase" }}>Client *</label>
              <select
                value={formDevis.clientId}
                onChange={e => setFormDevis(p => ({ ...p, clientId: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px" }}
              >
                <option value="">Choisir un client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom} {c.entreprise ? `— ${c.entreprise}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#888", marginBottom: "6px", textTransform: "uppercase" }}>Prestation *</label>
              <select
                value={formDevis.prestation}
                onChange={e => setFormDevis(p => ({ ...p, prestation: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px" }}
              >
                <option value="">Choisir</option>
                <option value="Désinsectisation">Désinsectisation</option>
                <option value="Dératisation">Dératisation</option>
                <option value="Désinfection">Désinfection</option>
                <option value="Traitement anti-termites">Traitement anti-termites</option>
                <option value="Fumigation">Fumigation</option>
                <option value="Traitement 3D (3 en 1)">Traitement 3D (3 en 1)</option>
                <option value="Accompagnement marchés publics">Accompagnement marchés publics</option>
                <option value="Recrutement & RH">Recrutement & RH</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#888", marginBottom: "6px", textTransform: "uppercase" }}>Description / Détails *</label>
            <textarea
              value={formDevis.description}
              onChange={e => setFormDevis(p => ({ ...p, description: e.target.value }))}
              rows={4}
              placeholder="Surface traitée, zones concernées, produits utilisés, délais..."
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: "20px", maxWidth: "250px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#888", marginBottom: "6px", textTransform: "uppercase" }}>Montant total (FCFA) *</label>
            <input
              type="number"
              value={formDevis.montantTotal}
              onChange={e => setFormDevis(p => ({ ...p, montantTotal: e.target.value }))}
              placeholder="150000"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={creerDevis}
              disabled={submittingDevis || !formDevis.clientId || !formDevis.prestation || !formDevis.montantTotal}
              style={{ padding: "12px 24px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", opacity: submittingDevis ? 0.7 : 1 }}
            >
              {submittingDevis ? "Création..." : "Créer et envoyer au client"}
            </button>
            <button onClick={() => setShowNewDevis(false)} style={{ padding: "12px 20px", backgroundColor: "#f0ede6", color: "#444", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste devis */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>Chargement...</div>
      ) : devisFiltres.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e8e6e0", color: "#888" }}>
          Aucun devis pour ce filtre.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {devisFiltres.map(devis => {
            const statut = STATUT_LABELS[devis.statut] || { label: devis.statut, color: "#444", bg: "#f0f0f0" }
            const clientInfo = devis.clients
            return (
              <div key={devis.id} style={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#d4a920" }}>{devis.numero}</span>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: statut.bg, color: statut.color }}>
                        {statut.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "4px" }}>{devis.prestation}</div>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      {clientInfo?.prenom} {clientInfo?.nom}
                      {clientInfo?.entreprise && ` — ${clientInfo.entreprise}`}
                      {clientInfo?.email && ` · ${clientInfo.email}`}
                    </div>
                    {devis.notes_modification && (
                      <div style={{ marginTop: "10px", padding: "10px 14px", backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "6px", fontSize: "13px", color: "#6b21a8" }}>
                        <strong>Demande de modification :</strong> {devis.notes_modification}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", marginLeft: "20px" }}>
                    <div style={{ fontSize: "18px", fontWeight: "600", color: "#0a2e1a", marginBottom: "4px" }}>
                      {Number(devis.montant_total).toLocaleString("fr-FR")} FCFA
                    </div>
                    <div style={{ fontSize: "11px", color: "#888", marginBottom: "10px" }}>
                      {new Date(devis.created_at).toLocaleDateString("fr-FR")}
                    </div>

                    {/* Action: Valider livraison */}
                    {devis.statut === "en_cours" && (
                      <button
                        onClick={() => validerLivraison(devis.id)}
                        disabled={validating === devis.id}
                        style={{ padding: "8px 16px", backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                      >
                        {validating === devis.id ? "..." : "✓ Valider la livraison → 40%"}
                      </button>
                    )}

                    {/* Note modification en attente */}
                    {devis.statut === "modification_demandee" && (
                      <div style={{ fontSize: "11px", color: "#7c3aed", backgroundColor: "#ede9fe", padding: "6px 10px", borderRadius: "6px" }}>
                        ⚠ Modifier le devis et le renvoyer
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
