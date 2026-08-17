"use client"
import { useState } from "react"

type Offre = { id: string; titre: string }

export default function FormCandidature({ offres }: { offres: Offre[] }) {
  const [form, setForm] = useState<any>({ offreId: "", nom: "", telephone: "", email: "", ville: "", experience: "", motivation: "", hp: "" })
  const [cvNom, setCvNom] = useState("")
  const [cvData, setCvData] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null)

  const maj = (champ: string, val: string) => setForm((p: any) => ({ ...p, [champ]: val }))

  function choisirCv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0]
    if (!f) { setCvNom(""); setCvData(null); return }
    if (f.type !== "application/pdf") { setMsg({ ok: false, texte: "Le CV doit être un PDF." }); e.target.value = ""; return }
    if (f.size > 3 * 1024 * 1024) { setMsg({ ok: false, texte: "Le CV dépasse 3 Mo." }); e.target.value = ""; return }
    const reader = new FileReader()
    reader.onload = () => { setCvData(String(reader.result)); setCvNom(f.name) }
    reader.readAsDataURL(f)
  }

  async function envoyer() {
    setMsg(null)
    if (!form.nom.trim() || !form.telephone.trim()) { setMsg({ ok: false, texte: "Le nom et le téléphone sont obligatoires." }); return }
    setEnvoi(true)
    try {
      const res = await fetch("/api/candidature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cvBase64: cvData }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setMsg({ ok: true, texte: "Votre candidature a bien été envoyée. Nous vous recontacterons." })
        setForm({ offreId: "", nom: "", telephone: "", email: "", ville: "", experience: "", motivation: "", hp: "" })
        setCvNom(""); setCvData(null)
      } else {
        setMsg({ ok: false, texte: data.error || "Erreur lors de l'envoi. Réessayez." })
      }
    } catch {
      setMsg({ ok: false, texte: "Erreur réseau. Réessayez." })
    }
    setEnvoi(false)
  }

  const label: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 700, color: "#0a2e1a", marginBottom: "6px" }
  const inp: React.CSSProperties = { width: "100%", padding: "11px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", color: "#111" }

  return (
    <div id="postuler" style={{ maxWidth: "620px", margin: "0 auto", backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "12px", padding: "32px" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0a2e1a", marginBottom: "6px" }}>Postuler</h2>
      <p style={{ fontSize: "13px", color: "#666", marginBottom: "22px" }}>Remplissez le formulaire. Le CV est facultatif.</p>

      <div style={{ display: "grid", gap: "16px" }}>
        <div>
          <label style={label}>Offre visée</label>
          <select value={form.offreId} onChange={(e) => maj("offreId", e.target.value)} style={inp}>
            <option value="">Candidature spontanée</option>
            {offres.map((o) => <option key={o.id} value={o.id}>{o.titre}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div><label style={label}>Nom complet *</label><input value={form.nom} onChange={(e) => maj("nom", e.target.value)} style={inp} /></div>
          <div>
            <label style={label}>Numéro WhatsApp *</label>
            <input value={form.telephone} onChange={(e) => maj("telephone", e.target.value)} placeholder="Ex : 01 97 00 00 00" style={inp} />
            <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>C'est par WhatsApp que nous vous recontacterons.</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div><label style={label}>Email</label><input value={form.email} onChange={(e) => maj("email", e.target.value)} style={inp} /></div>
          <div><label style={label}>Ville</label><input value={form.ville} onChange={(e) => maj("ville", e.target.value)} style={inp} /></div>
        </div>
        <div><label style={label}>Expérience (années, secteur)</label><input value={form.experience} onChange={(e) => maj("experience", e.target.value)} placeholder="Ex : 2 ans en vente terrain" style={inp} /></div>
        <div><label style={label}>Motivation</label><textarea value={form.motivation} onChange={(e) => maj("motivation", e.target.value)} rows={4} style={{ ...inp, resize: "vertical" }} /></div>
        <div>
          <label style={label}>CV (PDF, facultatif, max 3 Mo)</label>
          <input type="file" accept="application/pdf" onChange={choisirCv} style={{ fontSize: "13px", color: "#444" }} />
          {cvNom && <div style={{ fontSize: "12px", color: "#065f46", marginTop: "6px" }}>✓ {cvNom}</div>}
        </div>
        {/* honeypot anti-spam : masqué aux humains */}
        <input tabIndex={-1} autoComplete="off" value={form.hp} onChange={(e) => maj("hp", e.target.value)} style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }} aria-hidden="true" />

        {msg && (
          <div style={{ fontSize: "13px", fontWeight: 600, padding: "10px 12px", borderRadius: "8px", backgroundColor: msg.ok ? "#ecfdf5" : "#fef2f2", color: msg.ok ? "#065f46" : "#991b1b", border: "1px solid " + (msg.ok ? "#a7f3d0" : "#fecaca") }}>{msg.texte}</div>
        )}
        <button onClick={envoyer} disabled={envoi} style={{ backgroundColor: envoi ? "#9ca3af" : "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "8px", padding: "14px", fontSize: "14px", fontWeight: 700, cursor: envoi ? "default" : "pointer", fontFamily: "inherit" }}>
          {envoi ? "Envoi..." : "Envoyer ma candidature"}
        </button>
      </div>
    </div>
  )
}
