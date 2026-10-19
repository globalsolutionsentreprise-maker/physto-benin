"use client"

import { use, useEffect, useState } from "react"

// Page UNIQUE de suivi des leads pour Fabrice (un seul lien secret, pas un par
// lead). Mobile-first : il ouvre le lien, voit ses leads à rappeler, appelle ou
// écrit en 1 tap, puis note le résultat. Tout passe par /api/lead-suivi (POST),
// borné à la table leads. Le [token] de l'URL EST le secret partagé.

const VERT = "#0a2e1a"
const OR = "#d4a920"

type Lead = {
  id: string
  nom: string
  telephone: string | null
  nuisible: string | null
  ville: string | null
  message: string | null
  urgence: boolean | null
  created_at: string | null
  suivi_statut: string | null
  suivi_note: string | null
  rappel_le: string | null
  dernier_contact: string | null
}

const STATUT_LABEL: Record<string, string> = {
  a_relancer: "À relancer",
  rdv: "RDV pris",
  devis: "Devis à faire",
  perdu: "Pas intéressé",
}

function telDigits(tel: string | null) {
  return (tel || "").replace(/\D/g, "")
}
function waLink(tel: string | null) {
  const d = telDigits(tel)
  if (!d) return null
  return "https://wa.me/" + (d.startsWith("229") ? d : "229" + d)
}
function telLink(tel: string | null) {
  const d = telDigits(tel)
  return d ? "tel:+" + (d.startsWith("229") ? d : "229" + d) : null
}
function fmtDate(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function SuiviLeads({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [ouvert, setOuvert] = useState<string | null>(null)

  function charger() {
    setLoading(true)
    fetch("/api/lead-suivi?k=" + encodeURIComponent(token))
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErreur(d.error); return }
        setLeads(d.leads || [])
        setErreur(null)
      })
      .catch(() => setErreur("Connexion impossible. Réessayez."))
      .finally(() => setLoading(false))
  }
  useEffect(charger, [token])

  if (loading) return <Centre>Chargement…</Centre>
  if (erreur) return <Centre>{erreur}</Centre>

  return (
    <div style={{ minHeight: "100vh", background: "#f6f5f1", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", color: "#1c1c1c" }}>
      <header style={{ background: VERT, color: "#fff", padding: "18px 16px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: OR, fontWeight: 700 }}>GSE Phyto-Bénin · Suivi des leads</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            {leads.length === 0 ? "Aucun lead à suivre 🎉" : leads.length + " lead" + (leads.length > 1 ? "s" : "") + " à suivre"}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "16px 12px 60px" }}>
        {leads.length === 0 && (
          <div style={{ textAlign: "center", color: "#888", padding: "40px 0", fontSize: 14 }}>
            Tous les leads sont traités. Revenez après de nouveaux contacts.
          </div>
        )}
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            token={token}
            ouvert={ouvert === lead.id}
            onToggle={() => setOuvert(ouvert === lead.id ? null : lead.id)}
            onDone={() => { setOuvert(null); charger() }}
          />
        ))}
      </main>
    </div>
  )
}

function Centre({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f5f1", color: "#555", fontFamily: "-apple-system,sans-serif", fontSize: 15, padding: 24, textAlign: "center" }}>
      {children}
    </div>
  )
}

function LeadCard({ lead, token, ouvert, onToggle, onDone }: {
  lead: Lead; token: string; ouvert: boolean; onToggle: () => void; onDone: () => void
}) {
  const [statut, setStatut] = useState<string>(lead.suivi_statut || "")
  const [note, setNote] = useState<string>(lead.suivi_note || "")
  const [rappel, setRappel] = useState<string>(lead.rappel_le || "")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [localOpen, setLocalOpen] = useState(false)

  // Brouillon inperdable : ce que Fabrice tape est gardé sur CE téléphone en
  // continu. S'il quitte la page ou recharge avant d'enregistrer, il retrouve
  // tout (et la carte se rouvre automatiquement). Effacé une fois enregistré.
  const DRAFT_KEY = "suivi-draft-" + lead.id
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.statut) setStatut(d.statut)
      if (d.note) setNote(d.note)
      if (d.rappel) setRappel(d.rappel)
      setLocalOpen(true)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    try {
      if (statut || note || rappel) localStorage.setItem(DRAFT_KEY, JSON.stringify({ statut, note, rappel }))
    } catch {}
  }, [statut, note, rappel, DRAFT_KEY])

  const open = ouvert || localOpen
  const tel = telLink(lead.telephone)
  const wa = waLink(lead.telephone)

  async function enregistrer() {
    if (!statut) { setMsg("Choisissez un résultat."); return }
    if (statut === "perdu" && !confirm("Marquer « " + lead.nom + " » comme perdu ?\nIl quittera la liste de suivi.")) return
    setSaving(true); setMsg(null)
    try {
      const r = await fetch("/api/lead-suivi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: token, id: lead.id, statut, note, rappel_le: statut === "a_relancer" ? rappel : null }),
      })
      const d = await r.json()
      if (d.error) { setMsg(d.error); setSaving(false); return }
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      setLocalOpen(false)
      onDone()
    } catch {
      setMsg("Échec de l'enregistrement. Réessayez.")
      setSaving(false)
    }
  }

  const btn = (bg: string, fg: string): React.CSSProperties => ({
    flex: 1, textAlign: "center", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 15,
    textDecoration: "none", background: bg, color: fg, border: "none", cursor: "pointer", fontFamily: "inherit",
  })

  return (
    <div style={{ background: "#fff", border: "1px solid #e7e4dc", borderLeft: "4px solid " + (lead.urgence ? "#b4472e" : OR), borderRadius: 12, padding: "14px 15px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: VERT }}>
            {lead.urgence ? "⚠️ " : ""}{lead.nom}
          </div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 3 }}>
            {[lead.nuisible, lead.ville].filter(Boolean).join(" · ") || "·"}
          </div>
          {lead.created_at && <div style={{ fontSize: 11, color: "#b0885a", marginTop: 3 }}>📅 Reçu le {fmtDate(lead.created_at)}</div>}
        </div>
        {lead.suivi_statut && (
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: VERT, background: "#f1ecd9", borderRadius: 20, padding: "3px 10px" }}>
            {STATUT_LABEL[lead.suivi_statut] || lead.suivi_statut}
            {lead.rappel_le ? " · " + fmtDate(lead.rappel_le) : ""}
          </span>
        )}
      </div>

      {lead.message && <div style={{ fontSize: 13, color: "#444", marginTop: 10, background: "#faf9f5", borderRadius: 8, padding: "8px 10px" }}>💬 {lead.message}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {tel ? <a href={tel} style={btn(VERT, "#fff")}>📞 Appeler</a> : <span style={{ ...btn("#eee", "#999"), cursor: "default" }}>Pas de n°</span>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" style={btn("#25D366", "#fff")}>💬 WhatsApp</a>}
      </div>

      <button onClick={() => { setLocalOpen(false); onToggle() }} style={{ marginTop: 10, width: "100%", background: "none", border: "1px dashed #d7d2c4", color: "#8a7a4a", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        {open ? "▲ Fermer" : "✍️ Résultat de l'appel"}
      </button>

      {open && (
        <div style={{ marginTop: 12, borderTop: "1px solid #f0ede4", paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>C'est quoi la suite ?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.keys(STATUT_LABEL).map((s) => (
              <button key={s} onClick={() => setStatut(s)}
                style={{
                  padding: "11px", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  border: "1px solid " + (statut === s ? VERT : "#ddd"),
                  background: statut === s ? (s === "perdu" ? "#fdecec" : "#eef5ee") : "#fff",
                  color: statut === s ? (s === "perdu" ? "#991b1b" : VERT) : "#555",
                }}>
                {STATUT_LABEL[s]}
              </button>
            ))}
          </div>

          {statut === "a_relancer" && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Rappeler le</label>
              <input type="date" value={rappel} onChange={(e) => setRappel(e.target.value)}
                style={{ width: "100%", marginTop: 4, padding: "11px", borderRadius: 9, border: "1px solid #ddd", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          )}

          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={statut === "perdu" ? "Motif (facultatif)…" : "Note (facultatif)…"}
            rows={2}
            style={{ width: "100%", marginTop: 10, padding: "11px", borderRadius: 9, border: "1px solid #ddd", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />

          {msg && <div style={{ color: "#b4472e", fontSize: 13, marginTop: 8 }}>{msg}</div>}

          <button onClick={enregistrer} disabled={saving}
            style={{ width: "100%", marginTop: 12, background: saving ? "#999" : OR, color: VERT, border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 800, cursor: saving ? "default" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Enregistrement…" : "✓ Enregistrer"}
          </button>
          {(statut || note || rappel) && <div style={{ fontSize: 11, color: "#8a7a4a", marginTop: 7, textAlign: "center" }}>💾 Brouillon gardé sur ce téléphone, rien n'est perdu si vous quittez.</div>}
        </div>
      )}
    </div>
  )
}
