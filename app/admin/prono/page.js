"use client"
import React, { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminProno() {
  const [connecte, setConnecte] = useState(false)
  const [email, setEmail] = useState("")
  const [mdp, setMdp] = useState("")
  const [erreur, setErreur] = useState("")
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [filtre, setFiltre] = useState("")

  useEffect(function () {
    supabase.auth.getSession().then(function ({ data: { session } }) {
      if (session) { setConnecte(true); charger() }
    })
  }, [])

  async function login(e) {
    e.preventDefault()
    setErreur("")
    const { error } = await supabase.auth.signInWithPassword({ email, password: mdp })
    if (error) { setErreur("Email ou mot de passe incorrect"); return }
    setConnecte(true)
    charger()
  }

  async function charger() {
    setLoading(true)
    const res = await fetch("/api/prono")
    const json = await res.json()
    setLoading(false)
    if (json.participants) setParticipants(json.participants)
  }

  function exportCSV() {
    const rows = [["Nom", "WhatsApp", "Champion", "Buteur", "Date"]]
    participants.forEach(function (p) {
      rows.push([
        p.nom,
        p.predictions?.champion || "",
        p.predictions?.topScorer || "",
        new Date(p.created_at).toLocaleDateString("fr-FR"),
      ])
    })
    const csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"' }).join(",") }).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "prono-wc2026.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = participants.filter(function (p) {
    if (!filtre) return true
    const q = filtre.toLowerCase()
    return p.nom.toLowerCase().includes(q) ||
      (p.predictions?.champion || "").toLowerCase().includes(q) ||
      (p.predictions?.topScorer || "").toLowerCase().includes(q)
  })

  const champions = {}
  participants.forEach(function (p) {
    const c = p.predictions?.champion || "Non précisé"
    champions[c] = (champions[c] || 0) + 1
  })
  const palmares = Object.entries(champions).sort(function (a, b) { return b[1] - a[1] }).slice(0, 5)

  if (!connecte) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", padding: 16 }}>
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <img src="/logo-gse.jpeg" alt="GSE" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", marginBottom: 12 }} />
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Admin · GSE Prono</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>Tableau de bord participants</div>
          </div>
          <form onSubmit={login}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Email</label>
            <input value={email} onChange={function (e) { setEmail(e.target.value) }} type="email" placeholder="admin@gse.bj" style={inp} />
            <label style={{ display: "block", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6, marginTop: 14, textTransform: "uppercase" }}>Mot de passe</label>
            <input value={mdp} onChange={function (e) { setMdp(e.target.value) }} type="password" placeholder="••••••••" style={inp} />
            {erreur && <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 10, textAlign: "center" }}>{erreur}</div>}
            <button type="submit" style={{ width: "100%", marginTop: 20, background: "linear-gradient(135deg,#f59e0b,#b45309)", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              Se connecter
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "'Segoe UI', sans-serif", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo-gse.jpeg" alt="GSE" style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover" }} />
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>GSE Prono WC 2026</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Tableau de bord participants</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={charger} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
              🔄 Actualiser
            </button>
            <button onClick={exportCSV} style={{ background: "linear-gradient(135deg,#f59e0b,#b45309)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ⬇ Export CSV
            </button>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          <StatCard label="Participants" value={participants.length} color="#fbbf24" />
          <StatCard label="Aujourd'hui" value={participants.filter(function (p) { return new Date(p.created_at).toDateString() === new Date().toDateString() }).length} color="#4ade80" />
          <StatCard label="Champions différents" value={Object.keys(champions).length} color="#60a5fa" />
        </div>

        {/* TOP CHAMPIONS */}
        {palmares.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🏆 Champions les plus choisis</div>
            {palmares.map(function ([team, count], i) {
              return (
                React.createElement("div", { key: team, style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < palmares.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" } },
                  React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                    React.createElement("div", { style: { width: 22, height: 22, background: i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#f97316" : "rgba(255,255,255,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#0f172a", flexShrink: 0 } }, i + 1),
                    React.createElement("span", { style: { color: "#fff", fontSize: 13 } }, team)
                  ),
                  React.createElement("span", { style: { color: "rgba(255,255,255,0.5)", fontSize: 13 } }, count + " participant" + (count > 1 ? "s" : ""))
                )
              )
            })}
          </div>
        )}

        {/* RECHERCHE */}
        <input
          value={filtre}
          onChange={function (e) { setFiltre(e.target.value) }}
          placeholder="🔍 Rechercher par nom, champion..."
          style={{ ...inp, marginBottom: 14, maxWidth: "100%" }}
        />

        {/* LISTE */}
        {loading && <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 40 }}>Chargement...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40, fontSize: 14 }}>
            {filtre ? "Aucun résultat pour cette recherche." : "Aucun participant pour l'instant."}
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(function (p, i) {
              return (
                React.createElement("div", {
                  key: p.id,
                  onClick: function () { setDetail(detail?.id === p.id ? null : p) },
                  style: { background: detail?.id === p.id ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)", border: "1px solid " + (detail?.id === p.id ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"), borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all .15s" }
                },
                  React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 } },
                    React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
                      React.createElement("div", { style: { width: 32, height: 32, background: "linear-gradient(135deg,#f59e0b,#b45309)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 } }, i + 1),
                      React.createElement("div", null,
                        React.createElement("div", { style: { color: "#fff", fontWeight: 700, fontSize: 14 } }, p.nom),
                        React.createElement("div", { style: { color: "rgba(255,255,255,0.4)", fontSize: 11 } }, new Date(p.created_at).toLocaleString("fr-FR"))
                      )
                    ),
                    React.createElement("div", { style: { textAlign: "right" } },
                      React.createElement("div", { style: { color: "#fbbf24", fontWeight: 700, fontSize: 13 } }, p.predictions?.champion || "—"),
                      React.createElement("div", { style: { color: "rgba(255,255,255,0.35)", fontSize: 11 } }, "Buteur : " + (p.predictions?.topScorer || "—"))
                    )
                  ),
                  detail?.id === p.id && React.createElement(DetailPanel, { p: p })
                )
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return React.createElement("div", {
    style: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px", textAlign: "center" }
  },
    React.createElement("div", { style: { color: color, fontSize: 36, fontWeight: 900, lineHeight: 1 } }, value),
    React.createElement("div", { style: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 4 } }, label)
  )
}

function DetailPanel({ p }) {
  const pred = p.predictions || {}
  const groupes = pred.groupes || {}
  return React.createElement("div", {
    style: { marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }
  },
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6, marginBottom: 10 } },
      Object.entries(groupes).map(function ([g, winner]) {
        return React.createElement("div", { key: g, style: { background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 8px" } },
          React.createElement("div", { style: { color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: 1 } }, "GR. " + g),
          React.createElement("div", { style: { color: "#fff", fontSize: 11, fontWeight: 600, marginTop: 2 } }, winner)
        )
      })
    ),
    React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
      React.createElement("div", { style: { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "6px 10px", fontSize: 11 } },
        React.createElement("span", { style: { color: "rgba(255,255,255,0.4)" } }, "🏆 Champion : "),
        React.createElement("span", { style: { color: "#fbbf24", fontWeight: 700 } }, pred.champion || "—")
      ),
      React.createElement("div", { style: { background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 8, padding: "6px 10px", fontSize: 11 } },
        React.createElement("span", { style: { color: "rgba(255,255,255,0.4)" } }, "👟 Buteur : "),
        React.createElement("span", { style: { color: "#60a5fa", fontWeight: 700 } }, pred.topScorer || "—")
      ),
      React.createElement("div", { style: { background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 10px", fontSize: 11 } },
        React.createElement("span", { style: { color: "rgba(255,255,255,0.4)" } }, "📱 WhatsApp : "),
        React.createElement("a", { href: "https://wa.me/" + p.whatsapp?.replace(/[^0-9]/g, ""), target: "_blank", rel: "noreferrer", style: { color: "#4ade80", fontWeight: 700, textDecoration: "none" } }, p.whatsapp)
      )
    )
  )
}

const inp = {
  width: "100%",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#fff",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
}
