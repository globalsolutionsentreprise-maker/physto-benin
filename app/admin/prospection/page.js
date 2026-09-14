"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Étapes du pipeline (ordre = progression). Colonnes du kanban.
const STATUTS = [
  { key: "a_contacter", label: "À contacter", color: "#9db69d" },
  { key: "contacte", label: "Contacté", color: "#5ea0e0" },
  { key: "relance", label: "Relancé", color: "#e0b32a" },
  { key: "rdv", label: "RDV", color: "#c07be0" },
  { key: "gagne", label: "Gagné", color: "#33c06a" },
  { key: "perdu", label: "Perdu", color: "#e0685e" },
]
const LABEL = Object.fromEntries(STATUTS.map(s => [s.key, s.label]))
const COLOR = Object.fromEntries(STATUTS.map(s => [s.key, s.color]))

const SEGMENTS = ["Hôtels & Restaurants", "Cliniques & Écoles", "Supermarchés · Entrepôts · Agro", "Sièges & Entreprises"]

// Messages WhatsApp pré-remplis par segment (deep-link wa.me).
const WA = {
  "Hôtels & Restaurants": "Bonjour 👋 Kabir de Phyto-Bénin (GSE), hygiène sanitaire agréée par l'État. Nous offrons un audit anti-nuisibles gratuit (cafards, punaises, rats) aux hôtels et restaurants de Cotonou, sans engagement, avec certificat de conformité. Ça vous intéresse cette semaine ? www.phyto-benin.com",
  "Cliniques & Écoles": "Bonjour 👋 Kabir de Phyto-Bénin (GSE), hygiène sanitaire agréée par l'État. Nous offrons un audit d'hygiène gratuit aux cliniques et écoles de Cotonou : désinsectisation, dératisation, désinfection aux normes, avec certificat de conformité. Un technicien passe sans engagement. Ça vous intéresse ? www.phyto-benin.com",
  "Supermarchés · Entrepôts · Agro": "Bonjour 👋 Kabir de Phyto-Bénin (GSE), hygiène sanitaire agréée par l'État. Nous protégeons vos stocks et marchandises contre rongeurs et insectes : audit gratuit de vos zones de stockage, suivi régulier et certificat de conformité, sans engagement. On programme un passage ? www.phyto-benin.com",
  "Sièges & Entreprises": "Bonjour 👋 Kabir de Phyto-Bénin (GSE), hygiène sanitaire agréée par l'État. Nous entretenons l'hygiène de vos locaux : traitement 3D discret et régulier, contrat sur mesure, certificat de conformité. Audit gratuit pour commencer, sans engagement. Je peux passer cette semaine ? www.phyto-benin.com",
}
const WA_DEFAUT = "Bonjour 👋 Kabir de Phyto-Bénin (GSE), hygiène sanitaire agréée par l'État. Nous offrons un audit anti-nuisibles gratuit, sans engagement, avec certificat de conformité. Ça vous intéresse ? www.phyto-benin.com"

function waLink(tel, segment) {
  const num = (tel || "").replace(/\D/g, "")
  const txt = encodeURIComponent(WA[segment] || WA_DEFAUT)
  return "https://wa.me/" + num + "?text=" + txt
}
const today = () => new Date().toISOString().split("T")[0]

export default function ProspectionPage() {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState("")
  const [mode, setMode] = useState("kanban")     // kanban | liste
  const [prospects, setProspects] = useState([])
  const [counts, setCounts] = useState({})
  const [campagnes, setCampagnes] = useState([])
  const [fStatut, setFStatut] = useState("")
  const [fSegment, setFSegment] = useState("")
  const [fCampagne, setFCampagne] = useState("")
  const [fRelances, setFRelances] = useState(false)
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/admin"; return }
      setToken(session.access_token || "")
      setReady(true)
    })
  }, [])

  const charger = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams({ action: "list" })
    // En kanban, on montre toutes les colonnes : pas de filtre de statut.
    if (mode === "liste" && fStatut) params.set("statut", fStatut)
    if (fSegment) params.set("segment", fSegment)
    if (fCampagne) params.set("campagne", fCampagne)
    if (fRelances) params.set("relances", "1")
    if (q.trim()) params.set("q", q.trim())
    try {
      const res = await fetch("/api/prospection?" + params.toString(), { headers: { "Authorization": "Bearer " + token } })
      if (!res.ok) { setMsg("Erreur de chargement (" + res.status + ")"); setLoading(false); return }
      const data = await res.json()
      setProspects(data.prospects || [])
      setCounts(data.counts || {})
      setCampagnes(data.campagnes || [])
    } catch (e) { setMsg("Erreur réseau") }
    setLoading(false)
  }, [token, mode, fStatut, fSegment, fCampagne, fRelances, q])

  useEffect(() => { if (ready) charger() }, [ready, charger])

  async function post(payload) {
    const res = await fetch("/api/prospection", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(payload),
    })
    let data = {}
    try { data = await res.json() } catch (e) {}
    if (!res.ok) { setMsg(data.error || "Erreur (" + res.status + ")"); return null }
    return data
  }

  async function logContact(p, canal) { await post({ action: "log_contact", id: p.id, canal }); charger() }
  async function setStatut(p, statut) {
    if (statut === p.statut) return
    let motif = null
    if (statut === "perdu") { motif = window.prompt("Motif de la perte ?", ""); if (motif === null) return }
    // Optimiste : déplace la carte tout de suite, puis persiste.
    setProspects(prev => prev.map(x => x.id === p.id ? { ...x, statut } : x))
    await post({ action: "update_statut", id: p.id, statut, motif })
    charger()
  }
  async function relanceJ3(p) { await post({ action: "set_relance", id: p.id, jours: 3 }); setMsg("Relance J+3 programmée pour " + p.nom); charger() }
  async function convertir(p) {
    if (!window.confirm("Convertir « " + p.nom + " » en client + devis ? Il bascule en exécution dans le CRM.")) return
    const data = await post({ action: "convert_to_devis", id: p.id })
    if (data && data.ok) { setMsg("« " + p.nom + " » converti en devis. Ouvre le CRM pour continuer."); charger() }
  }
  async function supprimer(p) {
    if (!window.confirm("Supprimer « " + p.nom + " » ?")) return
    await post({ action: "delete", id: p.id }); charger()
  }

  function onDrop(colKey) {
    setOverCol(null)
    const p = prospects.find(x => x.id === dragId)
    setDragId(null)
    if (p) setStatut(p, colKey)
  }

  if (!ready) return <div style={S.wrap}><p style={{ color: "#9db69d" }}>Chargement…</p></div>

  const filtersBar = (
    <>
      <div style={S.filters}>
        <div style={S.toggle}>
          <button onClick={() => setMode("kanban")} style={toggleBtn(mode === "kanban")}>Kanban</button>
          <button onClick={() => setMode("liste")} style={toggleBtn(mode === "liste")}>Liste</button>
        </div>
        <select value={fSegment} onChange={e => setFSegment(e.target.value)} style={S.select}>
          <option value="">Tous segments</option>
          {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fCampagne} onChange={e => setFCampagne(e.target.value)} style={S.select}>
          <option value="">Toutes campagnes</option>
          {campagnes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setFRelances(v => !v)} style={chip(fRelances, "#e0b32a")}>⏰ Relances du jour ({counts.relances_du_jour || 0})</button>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" style={S.input} />
      </div>
      {mode === "liste" ? (
        <div style={S.filters}>
          <button onClick={() => setFStatut("")} style={chip(!fStatut)}>Tous ({counts.total || 0})</button>
          {STATUTS.map(s => (
            <button key={s.key} onClick={() => setFStatut(fStatut === s.key ? "" : s.key)} style={chip(fStatut === s.key, s.color)}>
              {s.label} ({counts[s.key] || 0})
            </button>
          ))}
        </div>
      ) : null}
    </>
  )

  return (
    <div style={S.wrap}>
      <div style={mode === "kanban" ? S.innerWide : S.inner}>
        <header style={S.head}>
          <div>
            <h1 style={S.h1}>Prospection</h1>
            <p style={S.sub}>{counts.total || 0} prospects · {counts.relances_du_jour || 0} relance(s) du jour</p>
          </div>
          <a href="/admin" style={S.backLink}>← Retour CRM</a>
        </header>

        {msg ? <div style={S.msg} onClick={() => setMsg("")}>{msg} <span style={{ opacity: .6 }}>(fermer)</span></div> : null}

        {filtersBar}

        {loading ? <p style={{ color: "#9db69d" }}>Chargement…</p> : null}

        {mode === "kanban" ? (
          <div style={S.board}>
            {STATUTS.map(col => {
              const items = prospects.filter(p => p.statut === col.key)
              return (
                <div key={col.key}
                  onDragOver={e => { e.preventDefault(); setOverCol(col.key) }}
                  onDragLeave={() => setOverCol(o => o === col.key ? null : o)}
                  onDrop={() => onDrop(col.key)}
                  style={{ ...S.col, outline: overCol === col.key ? "2px dashed " + col.color : "none" }}>
                  <div style={S.colHead}>
                    <span style={{ ...S.dot, background: col.color }} />
                    <span style={S.colTitle}>{col.label}</span>
                    <span style={S.colCount}>{items.length}</span>
                  </div>
                  <div style={S.colBody}>
                    {items.map(p => (
                      <div key={p.id} draggable
                        onDragStart={() => setDragId(p.id)}
                        onDragEnd={() => { setDragId(null); setOverCol(null) }}
                        style={{ ...S.kcard, opacity: dragId === p.id ? .5 : 1 }}>
                        <div style={S.kname}>{p.nom}</div>
                        <div style={S.kmeta}>
                          {p.categorie ? p.categorie : p.segment}
                          {p.telephone ? " · " + p.telephone : ""}
                        </div>
                        {p.prochaine_relance ? <div style={{ ...S.krel, color: p.prochaine_relance <= today() ? "#e0b32a" : "#9db69d" }}>⏰ {p.prochaine_relance}</div> : null}
                        <div style={S.kactions}>
                          {p.telephone ? <a href={waLink(p.telephone, p.segment)} target="_blank" rel="noreferrer" onClick={() => logContact(p, "whatsapp")} title="WhatsApp" style={{ ...S.kbtn, background: "#25d366", color: "#04310f" }}>WA</a> : null}
                          {p.telephone ? <a href={"tel:+" + p.telephone.replace(/\D/g, "")} onClick={() => logContact(p, "tel")} title="Appeler" style={{ ...S.kbtn, background: "#1f3a2a", color: "#eef3ec" }}>☎</a> : null}
                          {p.email ? <a href={"mailto:" + p.email} onClick={() => logContact(p, "email")} title="E-mail" style={{ ...S.kbtn, background: "#1f3a2a", color: "#eef3ec" }}>✉</a> : null}
                          <button onClick={() => relanceJ3(p)} title="Relance J+3" style={{ ...S.kbtn, background: "#2a2a1a", color: "#e0b32a" }}>J+3</button>
                          {p.devis_id
                            ? <a href="/admin" title="Voir dans le CRM" style={{ ...S.kbtn, background: "#33c06a", color: "#04310f" }}>CRM→</a>
                            : <button onClick={() => convertir(p)} title="Convertir en devis" style={{ ...S.kbtn, background: "#e0b32a", color: "#123420", fontWeight: 700 }}>→ Devis</button>}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 ? <div style={S.empty}>—</div> : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={S.list}>
            {!loading && prospects.length === 0 ? <p style={{ color: "#9db69d" }}>Aucun prospect pour ces filtres.</p> : null}
            {prospects.map(p => {
              const digits = (p.telephone || "").replace(/\D/g, "")
              const relanceDue = p.prochaine_relance && p.prochaine_relance <= today()
              return (
                <div key={p.id} style={S.card}>
                  <div style={S.cardTop}>
                    <div style={{ minWidth: 0 }}>
                      <div style={S.nom}>{p.nom}</div>
                      <div style={S.meta}>
                        {p.categorie ? <span>{p.categorie}</span> : null}
                        {p.telephone ? <span> · {p.telephone}</span> : null}
                        {p.email ? <span> · {p.email}</span> : null}
                        {p.adresse ? <span> · {p.adresse}</span> : null}
                      </div>
                      {p.prochaine_relance ? <div style={{ ...S.relance, color: relanceDue ? "#e0b32a" : "#9db69d" }}>⏰ Relance : {p.prochaine_relance}{relanceDue ? " (à faire)" : ""}</div> : null}
                      {p.motif_perdu ? <div style={S.motif}>Perdu : {p.motif_perdu}</div> : null}
                    </div>
                    <span style={{ ...S.badge, background: COLOR[p.statut] || "#555" }}>{LABEL[p.statut] || p.statut}</span>
                  </div>
                  <div style={S.actions}>
                    {digits ? <a href={waLink(p.telephone, p.segment)} target="_blank" rel="noreferrer" onClick={() => logContact(p, "whatsapp")} style={{ ...S.btn, background: "#25d366", color: "#04310f" }}>WhatsApp</a> : null}
                    {digits ? <a href={"tel:+" + digits} onClick={() => logContact(p, "tel")} style={{ ...S.btn, background: "#1f3a2a", color: "#eef3ec" }}>Appeler</a> : null}
                    {p.email ? <a href={"mailto:" + p.email} onClick={() => logContact(p, "email")} style={{ ...S.btn, background: "#1f3a2a", color: "#eef3ec" }}>E-mail</a> : null}
                    <button onClick={() => relanceJ3(p)} style={{ ...S.btn, background: "#2a2a1a", color: "#e0b32a" }}>Relance J+3</button>
                    <select value="" onChange={e => { if (e.target.value) setStatut(p, e.target.value) }} style={S.statutSelect}>
                      <option value="">Changer statut…</option>
                      {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    {p.devis_id
                      ? <a href="/admin" style={{ ...S.btn, background: "#33c06a", color: "#04310f" }}>Voir dans le CRM →</a>
                      : <button onClick={() => convertir(p)} style={{ ...S.btn, background: "#e0b32a", color: "#123420", fontWeight: 700 }}>Convertir en devis</button>}
                    <button onClick={() => supprimer(p)} style={{ ...S.btn, background: "transparent", color: "#8a9a8a", border: "1px solid #2a4d38" }}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function chip(active, color) {
  return {
    background: active ? (color || "#e0b32a") : "#16402755",
    color: active ? "#123420" : "#cfdccb",
    border: "1px solid " + (active ? (color || "#e0b32a") : "#2a4d38"),
    borderRadius: 999, padding: "7px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  }
}
function toggleBtn(active) {
  return { background: active ? "#e0b32a" : "transparent", color: active ? "#123420" : "#cfdccb", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }
}

const S = {
  wrap: { minHeight: "100vh", background: "linear-gradient(165deg,#164027 0%,#0f2a1a 60%,#0b2013 100%)", color: "#eef3ec", fontFamily: "system-ui, Arial, sans-serif", padding: "24px 16px 80px" },
  inner: { maxWidth: 960, margin: "0 auto" },
  innerWide: { maxWidth: 1400, margin: "0 auto" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 },
  h1: { fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-.01em" },
  sub: { color: "#9db69d", fontSize: 14, margin: "4px 0 0" },
  backLink: { color: "#e0b32a", textDecoration: "none", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" },
  msg: { background: "#2a2a1a", border: "1px solid #e0b32a", color: "#e0b32a", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 14, cursor: "pointer" },
  filters: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" },
  toggle: { display: "inline-flex", background: "#16402755", border: "1px solid #2a4d38", borderRadius: 9, padding: 3 },
  select: { background: "#16402755", color: "#eef3ec", border: "1px solid #2a4d38", borderRadius: 8, padding: "8px 12px", fontSize: 14 },
  input: { flex: 1, minWidth: 160, background: "#16402755", color: "#eef3ec", border: "1px solid #2a4d38", borderRadius: 8, padding: "8px 12px", fontSize: 14 },

  // Kanban
  board: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" },
  col: { flex: "0 0 240px", background: "#0e2a19", border: "1px solid #2a4d38", borderRadius: 12, padding: 8, minHeight: 120 },
  colHead: { display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 10px" },
  dot: { width: 10, height: 10, borderRadius: "50%", flex: "none" },
  colTitle: { fontWeight: 700, fontSize: 13 },
  colCount: { marginLeft: "auto", color: "#9db69d", fontSize: 12, background: "#16402755", borderRadius: 999, padding: "1px 8px" },
  colBody: { display: "flex", flexDirection: "column", gap: 8, minHeight: 40 },
  kcard: { background: "#12331f", border: "1px solid #2a4d38", borderRadius: 10, padding: "9px 10px", cursor: "grab" },
  kname: { fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 },
  kmeta: { color: "#9db69d", fontSize: 11.5, marginTop: 3, wordBreak: "break-word" },
  krel: { fontSize: 11.5, marginTop: 4, fontWeight: 600 },
  kactions: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 },
  kbtn: { border: "none", borderRadius: 7, padding: "5px 8px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block", lineHeight: 1 },
  empty: { color: "#3f5a48", fontSize: 12, textAlign: "center", padding: "8px 0" },

  // Liste
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#12331f", border: "1px solid #2a4d38", borderRadius: 14, padding: "14px 16px" },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  nom: { fontSize: 17, fontWeight: 700 },
  meta: { color: "#9db69d", fontSize: 13, marginTop: 3, wordBreak: "break-word" },
  relance: { fontSize: 13, marginTop: 5, fontWeight: 600 },
  motif: { fontSize: 13, marginTop: 4, color: "#e0685e" },
  badge: { flex: "none", color: "#04310f", fontWeight: 700, fontSize: 12, padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap" },
  actions: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, alignItems: "center" },
  btn: { border: "none", borderRadius: 9, padding: "8px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" },
  statutSelect: { background: "#1f3a2a", color: "#eef3ec", border: "1px solid #2a4d38", borderRadius: 9, padding: "8px 10px", fontSize: 13, cursor: "pointer" },
}
