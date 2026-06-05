"use client"
import { useState } from "react"

// 16 groupes de 3 équipes = 48 équipes (format WC 2026 simplifié)
const GROUPES = {
  A: ["🇫🇷 France", "🇲🇦 Maroc", "🇹🇳 Tunisie"],
  B: ["🇪🇸 Espagne", "🇯🇵 Japon", "🇨🇷 Costa Rica"],
  C: ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", "🇸🇳 Sénégal", "🇵🇦 Panama"],
  D: ["🇩🇪 Allemagne", "🇳🇬 Nigeria", "🇳🇿 Nouvelle-Zélande"],
  E: ["🇵🇹 Portugal", "🇺🇾 Uruguay", "🇸🇦 Arabie Saoudite"],
  F: ["🇦🇷 Argentine", "🇦🇺 Australie", "🇯🇴 Jordanie"],
  G: ["🇧🇷 Brésil", "🇨🇮 Côte d'Ivoire", "🇦🇹 Autriche"],
  H: ["🇳🇱 Pays-Bas", "🇨🇴 Colombie", "🇶🇦 Qatar"],
  I: ["🇮🇹 Italie", "🇪🇨 Équateur", "🇭🇳 Honduras"],
  J: ["🇧🇪 Belgique", "🇮🇷 Iran", "🇨🇱 Chili"],
  K: ["🇭🇷 Croatie", "🇪🇬 Égypte", "🇻🇪 Venezuela"],
  L: ["🇩🇰 Danemark", "🇨🇲 Cameroun", "🇯🇲 Jamaïque"],
  M: ["🇺🇸 États-Unis", "🇩🇿 Algérie", "🇧🇴 Bolivie"],
  N: ["🇲🇽 Mexique", "🇨🇦 Canada", "🇸🇨 Îles Salomon"],
  O: ["🇷🇸 Serbie", "🇿🇦 Afrique du Sud", "🇵🇾 Paraguay"],
  P: ["🇨🇭 Suisse", "🇰🇷 Corée du Sud", "🇮🇶 Irak"],
}

const GROUPES_KEYS = Object.keys(GROUPES)

// Pairages R16 : 1A vs 1B, 1C vs 1D, ..., 1O vs 1P
const R16_PAIRINGS = [
  ["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"],
  ["I", "J"], ["K", "L"], ["M", "N"], ["O", "P"],
]

const QF_PAIRINGS = [[0, 1], [2, 3], [4, 5], [6, 7]] // index dans r16Winners
const SF_PAIRINGS = [[0, 1], [2, 3]]
const FINAL_PAIRING = [0, 1]

const ETAPES = [
  "Identité",
  "Groupes A–H",
  "Groupes I–P",
  "Huitièmes",
  "Quarts",
  "Demi-finales",
  "Finale",
]

export default function PronoPage() {
  const [etape, setEtape] = useState(0)
  const [contact, setContact] = useState({ nom: "", whatsapp: "" })
  const [groupWinners, setGroupWinners] = useState({})
  const [r16Winners, setR16Winners] = useState(Array(8).fill(""))
  const [qfWinners, setQfWinners] = useState(Array(4).fill(""))
  const [sfWinners, setSfWinners] = useState(Array(2).fill(""))
  const [champion, setChampion] = useState("")
  const [topScorer, setTopScorer] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // ---- helpers ----

  function getR16Team(groupKey) {
    return groupWinners[groupKey] || `Vainqueur gr. ${groupKey}`
  }

  function getR16Winner(idx) {
    return r16Winners[idx] || `Vainqueur H${idx + 1}`
  }

  function getQFWinner(idx) {
    return qfWinners[idx] || `Vainqueur Q${idx + 1}`
  }

  function getSFWinner(idx) {
    return sfWinners[idx] || `Vainqueur S${idx + 1}`
  }

  function canAdvance() {
    if (etape === 0) return contact.nom.trim() && contact.whatsapp.trim()
    if (etape === 1) return ["A","B","C","D","E","F","G","H"].every(g => groupWinners[g])
    if (etape === 2) return ["I","J","K","L","M","N","O","P"].every(g => groupWinners[g])
    if (etape === 3) return r16Winners.every(Boolean)
    if (etape === 4) return qfWinners.every(Boolean)
    if (etape === 5) return sfWinners.every(Boolean)
    if (etape === 6) return champion && topScorer.trim()
    return false
  }

  async function handleSubmit() {
    setLoading(true)
    setError("")
    const predictions = {
      groupes: groupWinners,
      r16: r16Winners,
      qf: qfWinners,
      sf: sfWinners,
      champion,
      topScorer,
    }
    const res = await fetch("/api/prono", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: contact.nom, whatsapp: contact.whatsapp, predictions }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error || "Erreur"); return }
    setSubmitted(true)
  }

  // ---- UI ----

  const bg = "#0a2e1a"
  const card = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "24px 20px", backdropFilter: "blur(10px)" }
  const input = { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }
  const label = { display: "block", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6, marginTop: 16, textTransform: "uppercase" }
  const btnPrimary = { width: "100%", marginTop: 24, background: "linear-gradient(135deg,#f59e0b,#b45309)", color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5, opacity: canAdvance() ? 1 : 0.4, transition: "opacity .2s" }
  const btnBack = { width: "100%", marginTop: 10, background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", borderRadius: 12, padding: "12px", fontSize: 13, cursor: "pointer" }

  if (submitted) return <ConfirmPage nom={contact.nom} champion={champion} />

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Segoe UI', sans-serif", padding: "0 16px 60px" }}>

      {/* HEADER */}
      <div style={{ textAlign: "center", paddingTop: 32, paddingBottom: 4 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "8px 18px", marginBottom: 16 }}>
          <img src="/logo-gse.jpeg" alt="GSE" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>Global Solutions Entreprise</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>Agréé phytosanitaire · Bénin</div>
          </div>
        </div>
        <div style={{ background: "#dc2626", color: "#fff", display: "inline-block", borderRadius: 40, padding: "5px 20px", fontSize: 12, fontWeight: 700, letterSpacing: 3, marginBottom: 12 }}>⚽ WORLD CUP 2026 ⚽</div>
        <div style={{ color: "#fbbf24", fontSize: 48, fontWeight: 900, lineHeight: 1 }}>100 000</div>
        <div style={{ color: "#f59e0b", fontSize: 18, fontWeight: 800, letterSpacing: 4, marginBottom: 2 }}>FCFA À GAGNER</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>Le meilleur bracket remporte tout !</div>
      </div>

      {/* PROGRESS */}
      <div style={{ maxWidth: 480, margin: "0 auto 20px" }}>
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {ETAPES.map((e, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= etape ? "linear-gradient(90deg,#f59e0b,#b45309)" : "rgba(255,255,255,0.1)" }} />
          ))}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center", marginTop: 6 }}>
          Étape {etape + 1}/{ETAPES.length} — {ETAPES[etape]}
        </div>
      </div>

      {/* CARD CONTENU */}
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={card}>
          {etape === 0 && <StepContact contact={contact} setContact={setContact} input={input} label={label} />}
          {etape === 1 && <StepGroupes groups={["A","B","C","D","E","F","G","H"]} groupWinners={groupWinners} setGroupWinners={setGroupWinners} input={input} label={label} />}
          {etape === 2 && <StepGroupes groups={["I","J","K","L","M","N","O","P"]} groupWinners={groupWinners} setGroupWinners={setGroupWinners} input={input} label={label} />}
          {etape === 3 && <StepKnockout title="Huitièmes de finale" pairings={R16_PAIRINGS.map(([a, b]) => [getR16Team(a), getR16Team(b)])} winners={r16Winners} setWinners={setR16Winners} prefix="H" input={input} label={label} />}
          {etape === 4 && <StepKnockout title="Quarts de finale" pairings={QF_PAIRINGS.map(([a, b]) => [getR16Winner(a), getR16Winner(b)])} winners={qfWinners} setWinners={setQfWinners} prefix="Q" input={input} label={label} />}
          {etape === 5 && <StepKnockout title="Demi-finales" pairings={SF_PAIRINGS.map(([a, b]) => [getQFWinner(a), getQFWinner(b)])} winners={sfWinners} setWinners={setSfWinners} prefix="D" input={input} label={label} />}
          {etape === 6 && <StepFinale finalist1={getSFWinner(0)} finalist2={getSFWinner(1)} champion={champion} setChampion={setChampion} topScorer={topScorer} setTopScorer={setTopScorer} input={input} label={label} />}

          {error && <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 12, textAlign: "center" }}>{error}</div>}

          {etape < 6 ? (
            <button style={btnPrimary} disabled={!canAdvance()} onClick={() => canAdvance() && setEtape(e => e + 1)}>
              Suivant →
            </button>
          ) : (
            <button style={{ ...btnPrimary, background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#4ade80,#16a34a)" }} disabled={!canAdvance() || loading} onClick={handleSubmit}>
              {loading ? "Envoi en cours..." : "🏆 Valider mon prono !"}
            </button>
          )}
          {etape > 0 && <button style={btnBack} onClick={() => setEtape(e => e - 1)}>← Retour</button>}
        </div>

        {/* RÈGLES */}
        <div style={{ marginTop: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px" }}>
          <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 700, letterSpacing: 2, textAlign: "center", marginBottom: 10 }}>COMMENT GAGNER ?</div>
          {[
            ["🏆", "Champion correct → 50 pts"],
            ["🎯", "Finaliste correct → 30 pts"],
            ["⚽", "Demi-finaliste correct → 10 pts"],
            ["🔮", "Quart correct → 5 pts"],
          ].map(([ico, txt]) => (
            <div key={txt} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{ico}</span>
              <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{txt}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 28, color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
        Global Solutions Entreprise · Agréé phytosanitaire<br />
        💬 WhatsApp : +229 53 04 79 50 · phyto-benin.com
      </div>
    </div>
  )
}

// ---- Sous-composants ----

function StepContact({ contact, setContact, input, label }) {
  return (
    <>
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>Ton identité</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginBottom: 16 }}>Pour te contacter si tu gagnes 🏆</div>
      <label style={label}>Nom complet</label>
      <input style={input} value={contact.nom} onChange={e => setContact(c => ({ ...c, nom: e.target.value }))} placeholder="Ex : Kouassi Jean-Baptiste" />
      <label style={label}>Numéro WhatsApp</label>
      <input style={input} type="tel" value={contact.whatsapp} onChange={e => setContact(c => ({ ...c, whatsapp: e.target.value }))} placeholder="+229 01 XX XX XX" />
    </>
  )
}

function StepGroupes({ groups, groupWinners, setGroupWinners, input, label }) {
  return (
    <>
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>Phase de groupes</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginBottom: 16 }}>
        Sélectionne le vainqueur de chaque groupe
      </div>
      {groups.map(g => (
        <div key={g}>
          <label style={label}>Groupe {g}</label>
          <select
            style={{ ...input, appearance: "none" }}
            value={groupWinners[g] || ""}
            onChange={e => setGroupWinners(w => ({ ...w, [g]: e.target.value }))}
          >
            <option value="">— Qui gagne le groupe {g} ?</option>
            {GROUPES[g].map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
      ))}
    </>
  )
}

function StepKnockout({ title, pairings, winners, setWinners, prefix, input, label }) {
  return (
    <>
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>{title}</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginBottom: 16 }}>
        Qui passe au tour suivant ?
      </div>
      {pairings.map(([t1, t2], i) => (
        <div key={i}>
          <label style={label}>Match {prefix}{i + 1}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <div style={{ flex: 1, textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 12, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 6px" }}>{t1}</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, fontWeight: 700 }}>VS</div>
            <div style={{ flex: 1, textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 12, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 6px" }}>{t2}</div>
          </div>
          <select
            style={{ ...input, appearance: "none", marginTop: 2 }}
            value={winners[i] || ""}
            onChange={e => setWinners(w => { const n = [...w]; n[i] = e.target.value; return n })}
          >
            <option value="">— Qui se qualifie ?</option>
            {[t1, t2].filter(t => !t.startsWith("Vainqueur")).map(t => <option key={t} value={t}>{t}</option>)}
            {[t1, t2].some(t => t.startsWith("Vainqueur")) && <option value={t1}>{t1}</option>}
            {[t1, t2].some(t => t.startsWith("Vainqueur")) && t2.startsWith("Vainqueur") && <option value={t2}>{t2}</option>}
          </select>
        </div>
      ))}
    </>
  )
}

function StepFinale({ finalist1, finalist2, champion, setChampion, topScorer, setTopScorer, input, label }) {
  return (
    <>
      <div style={{ color: "#fbbf24", fontSize: 24, fontWeight: 900, textAlign: "center", marginBottom: 4 }}>🏆 LA FINALE</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginBottom: 20 }}>Le moment de vérité !</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <div style={{ flex: 1, textAlign: "center", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "14px 8px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>FINALISTE 1</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{finalist1}</div>
        </div>
        <div style={{ color: "#fbbf24", fontWeight: 900, fontSize: 18 }}>⚡</div>
        <div style={{ flex: 1, textAlign: "center", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "14px 8px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>FINALISTE 2</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{finalist2}</div>
        </div>
      </div>
      <label style={label}>🏆 Champion du monde</label>
      <select
        style={{ appearance: "none", width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
        value={champion}
        onChange={e => setChampion(e.target.value)}
      >
        <option value="">— Qui soulève le trophée ?</option>
        {[finalist1, finalist2].filter(t => !t.startsWith("Vainqueur")).map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <label style={label}>👟 Meilleur buteur du tournoi</label>
      <input style={input} value={topScorer} onChange={e => setTopScorer(e.target.value)} placeholder="Ex : Mbappé, Vinicius Jr, Osimhen..." />
    </>
  )
}

function ConfirmPage({ nom, champion }) {
  const link = "https://phyto-benin.com/prono"
  const msg = `🏆 J'ai déposé mon prono pour la Coupe du Monde 2026 avec GSE !\n\nMon champion : ${champion}\n\nParticipe et tente de gagner 100 000 FCFA ! 👉 ${link}`
  return (
    <div style={{ minHeight: "100vh", background: "#0a2e1a", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
      <div style={{ color: "#4ade80", fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Prono enregistré !</div>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
        Bravo <strong style={{ color: "#fff" }}>{nom}</strong> !<br />
        Ton bracket est sauvegardé.
      </div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 28 }}>
        Ton champion : <span style={{ color: "#fbbf24", fontWeight: 700 }}>{champion}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 18px", marginBottom: 20, maxWidth: 360, width: "100%" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Partage à tes amis</div>
        <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 700 }}>phyto-benin.com/prono</div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 360, width: "100%" }}>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
          target="_blank" rel="noreferrer"
          style={{ flex: 1, minWidth: 130, background: "#1877f2", color: "#fff", border: "none", borderRadius: 10, padding: "12px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "block" }}
        >
          Partager sur Facebook
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
          target="_blank" rel="noreferrer"
          style={{ flex: 1, minWidth: 130, background: "#25d366", color: "#fff", border: "none", borderRadius: 10, padding: "12px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "block" }}
        >
          Partager sur WhatsApp
        </a>
      </div>
      <div style={{ marginTop: 24, color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
        Global Solutions Entreprise · phyto-benin.com
      </div>
    </div>
  )
}
