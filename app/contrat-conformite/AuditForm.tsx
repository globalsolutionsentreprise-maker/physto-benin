"use client"
import { useState } from "react"

const TYPES = [
  "Hôtel / Resort",
  "Restaurant / Bar",
  "Agro-industrie / Entrepôt",
  "Clinique / Établissement de santé",
  "Banque / Bureau",
  "Autre",
]

export default function AuditForm() {
  const [nom, setNom] = useState("")
  const [telephone, setTelephone] = useState("")
  const [ville, setVille] = useState("")
  const [type, setType] = useState(TYPES[0])
  const [etat, setEtat] = useState<"idle" | "envoi" | "ok" | "erreur">("idle")
  const [erreur, setErreur] = useState("")

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim() || !telephone.trim()) {
      setErreur("Nom et téléphone sont requis.")
      setEtat("erreur")
      return
    }
    setEtat("envoi")
    setErreur("")
    try {
      const res = await fetch("/api/register-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          telephone: telephone.trim(),
          ville: ville.trim() || null,
          nuisible: "Audit conformité 3D",
          message: `Demande d'audit de conformité gratuit, Établissement : ${type}`,
          urgence: false,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Échec de l'envoi")
      }
      setEtat("ok")
    } catch (err: any) {
      setErreur(err.message || "Une erreur est survenue.")
      setEtat("erreur")
    }
  }

  if (etat === "ok") {
    return (
      <div style={{ backgroundColor: "#0a2e1a", border: "2px solid #d4a920", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
        <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#d4a920", marginBottom: "12px" }}>
          Demande reçue, merci !
        </h3>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: "1.7" }}>
          Notre équipe vous rappelle sous 24 h pour planifier votre audit gratuit sur site.
        </p>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    fontSize: "14px",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  }
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.55)",
    marginBottom: "6px",
    textTransform: "uppercase",
  }

  return (
    <form onSubmit={envoyer} style={{ backgroundColor: "#0a2e1a", border: "2px solid #d4a920", borderRadius: "12px", padding: "32px" }}>
      <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>
        Réserver mon audit gratuit
      </h3>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", marginBottom: "24px", lineHeight: "1.6" }}>
        Un technicien passe sur site, inspecte, et vous remet un rapport photo des points critiques. Sans engagement.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle} htmlFor="af-nom">Nom du responsable *</label>
        <input id="af-nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. M. Koné" style={inputStyle} />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle} htmlFor="af-tel">Téléphone</label>
        <input id="af-tel" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Ex. +229 01 23 45 67 89" style={inputStyle} />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle} htmlFor="af-ville">Ville</label>
        <input id="af-ville" type="text" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex. Cotonou" style={inputStyle} />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={labelStyle} htmlFor="af-type">Type d'établissement</label>
        <select id="af-type" value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
          {TYPES.map((t) => (
            <option key={t} value={t} style={{ color: "#0a0a0a" }}>{t}</option>
          ))}
        </select>
      </div>

      {etat === "erreur" && (
        <div style={{ fontSize: "13px", color: "#ffb4b4", marginBottom: "16px" }}>{erreur}</div>
      )}

      <button
        type="submit"
        disabled={etat === "envoi"}
        style={{
          width: "100%",
          backgroundColor: "#d4a920",
          color: "#0a2e1a",
          fontWeight: "700",
          fontSize: "15px",
          padding: "15px",
          borderRadius: "8px",
          border: "none",
          cursor: etat === "envoi" ? "wait" : "pointer",
          opacity: etat === "envoi" ? 0.7 : 1,
        }}
      >
        {etat === "envoi" ? "Envoi…" : "Réserver mon audit gratuit"}
      </button>
    </form>
  )
}
