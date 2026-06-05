"use client"
import { useState, useRef } from "react"

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

const R16_PAIRINGS = [["A","B"],["C","D"],["E","F"],["G","H"],["I","J"],["K","L"],["M","N"],["O","P"]]
const QF_PAIRINGS = [[0,1],[2,3],[4,5],[6,7]]
const SF_PAIRINGS = [[0,1],[2,3]]
const ETAPES = ["Identité","Groupes A–H","Groupes I–P","Huitièmes","Quarts","Demi-finales","Finale","Partage"]
const PRONO_LINK = "https://phyto-benin.com/prono"

const PREMIUM_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&display=swap');

  @keyframes shimmer {
    0%   { background-position: -400% center; }
    100% { background-position:  400% center; }
  }
  @keyframes pulse-glow {
    0%,100% { box-shadow: 0 0 28px rgba(255,179,0,.45), 0 0 60px rgba(255,179,0,.15); }
    50%      { box-shadow: 0 0 50px rgba(255,179,0,.65), 0 0 90px rgba(255,179,0,.25); }
  }
  @keyframes float-trophy {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-7px); }
  }
  @keyframes fadeInUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes confetti-pop {
    0%   { transform:scale(.6) rotate(-8deg); opacity:0; }
    60%  { transform:scale(1.1) rotate(4deg);  opacity:1; }
    100% { transform:scale(1)   rotate(0);     opacity:1; }
  }

  .pn-shimmer {
    background: linear-gradient(90deg,#FF8C00 0%,#FFD740 25%,#FFF3A0 50%,#FFD740 75%,#FF8C00 100%);
    background-size: 400% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }
  .pn-cta-pulse { animation: pulse-glow 2.4s ease-in-out infinite; }
  .pn-trophy    { animation: float-trophy 3s ease-in-out infinite; display:inline-block; }
  .pn-fade-up   { animation: fadeInUp .4s ease-out both; }
  .pn-confetti  { animation: confetti-pop .55s cubic-bezier(.175,.885,.32,1.275) both; }
  .pn-inp:focus {
    border-color: #FFB300 !important;
    box-shadow: 0 0 0 3px rgba(255,179,0,.18) !important;
    outline: none;
  }
  .pn-team-btn { cursor:pointer; transition: all .15s; }
  .pn-team-btn:hover { transform: translateY(-2px); }
  .pn-team-btn:active { transform: scale(.97); }
`

function parseTeam(str) {
  if (!str || str.startsWith("Vainqueur")) return { flag: "❓", name: str || "—" }
  const i = str.indexOf(" ")
  return i === -1 ? { flag: str, name: "" } : { flag: str.slice(0, i), name: str.slice(i + 1) }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

export default function PronoPage() {
  const [vue, setVue]                   = useState("accueil")
  const [etape, setEtape]               = useState(0)
  const [contact, setContact]           = useState({ nom: "", whatsapp: "" })
  const [groupWinners, setGroupWinners] = useState({})
  const [r16Winners, setR16Winners]     = useState(Array(8).fill(""))
  const [qfWinners, setQfWinners]       = useState(Array(4).fill(""))
  const [sfWinners, setSfWinners]       = useState(Array(2).fill(""))
  const [champion, setChampion]         = useState("")
  const [topScorer, setTopScorer]       = useState("")
  const [sharedPlatform, setSharedPlatform] = useState("")
  const [preuveUrl, setPreuveUrl]       = useState("")
  const [confirmePartage, setConfirmePartage] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState("")
  const submittingRef                   = useRef(false)

  const getR16Team  = g => groupWinners[g] || `Vainqueur gr. ${g}`
  const getR16Winner = i => r16Winners[i] || `Vainqueur H${i+1}`
  const getQFWinner  = i => qfWinners[i]  || `Vainqueur Q${i+1}`
  const getSFWinner  = i => sfWinners[i]  || `Vainqueur D${i+1}`

  function canAdvance() {
    if (etape === 0) return contact.nom.trim() && contact.whatsapp.trim()
    if (etape === 1) return ["A","B","C","D","E","F","G","H"].every(g => groupWinners[g])
    if (etape === 2) return ["I","J","K","L","M","N","O","P"].every(g => groupWinners[g])
    if (etape === 3) return r16Winners.every(Boolean)
    if (etape === 4) return qfWinners.every(Boolean)
    if (etape === 5) return sfWinners.every(Boolean)
    if (etape === 6) return champion && topScorer.trim()
    if (etape === 7) return sharedPlatform && confirmePartage && preuveUrl.trim()
    return false
  }

  function handleShare(platform) {
    const msg = encodeURIComponent(`🏆 Je participe au GSE Prono World Cup 2026 — 100 000 FCFA à gagner !\n\nFais ton pronostic ici 👉 ${PRONO_LINK}\n\n#WorldCup2026 #GSEBenin #Prono`)
    if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(PRONO_LINK)}&quote=${msg}`, "_blank")
    } else {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(PRONO_LINK)}`, "_blank")
    }
    setSharedPlatform(platform)
  }

  async function handleSubmit() {
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true); setError("")
    try {
      const predictions = {
        groupes: groupWinners, r16: r16Winners, qf: qfWinners,
        sf: sfWinners, champion, topScorer,
        partage: { plateforme: sharedPlatform, url: preuveUrl.trim(), confirme: confirmePartage },
      }
      const res = await fetch("/api/prono", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: contact.nom, whatsapp: contact.whatsapp, predictions }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || "Erreur serveur"); return }
      setVue("confirme")
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  if (vue === "confirme") return <ConfirmPage nom={contact.nom} champion={champion} platform={sharedPlatform} />
  if (vue === "accueil")  return <AccueilPage onStart={() => setVue("jeu")} />

  const ok = canAdvance()

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PREMIUM_CSS }} />
      <div style={{ minHeight: "100vh", background: "#060D1F", fontFamily: "'Inter', 'Segoe UI', sans-serif", paddingBottom: 80 }}>

        {/* ── HEADER ─────────────────────────────── */}
        <div style={{
          background: "radial-gradient(ellipse 120% 60% at 50% -10%, rgba(255,179,0,.12) 0%, transparent 65%), #060D1F",
          textAlign: "center", padding: "24px 16px 20px",
        }}>
          <LogoPill />
          <div style={{ marginBottom: 6 }}>
            <span style={{ background: "#DC2626", color: "#fff", borderRadius: 40, padding: "4px 16px", fontSize: 11, fontWeight: 800, letterSpacing: 3 }}>
              ⚽ WORLD CUP 2026 ⚽
            </span>
          </div>
          <div className="pn-shimmer" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, letterSpacing: 2, lineHeight: 1, marginTop: 8 }}>
            100 000 FCFA
          </div>
          <div style={{ color: "rgba(255,255,255,.45)", fontSize: 12, marginTop: 2 }}>à gagner pour le meilleur bracket</div>
        </div>

        {/* ── PROGRESS ───────────────────────────── */}
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 20px 0" }}>
          <ProgressBar etape={etape} />
          <div style={{ textAlign: "center", color: "rgba(255,255,255,.35)", fontSize: 11, marginTop: 8, letterSpacing: .5 }}>
            Étape {etape + 1}/{ETAPES.length} — <span style={{ color: "rgba(255,255,255,.6)" }}>{ETAPES[etape]}</span>
          </div>
        </div>

        {/* ── STEP CARD ─────────────────────────── */}
        <div style={{ maxWidth: 480, margin: "14px auto 0", padding: "0 16px" }}>
          <div style={{
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 24,
            padding: "24px 20px",
            backdropFilter: "blur(12px)",
          }}>
            {etape === 0 && <StepContact contact={contact} setContact={setContact} />}
            {etape === 1 && <StepGroupes groups={["A","B","C","D","E","F","G","H"]} groupWinners={groupWinners} setGroupWinners={setGroupWinners} />}
            {etape === 2 && <StepGroupes groups={["I","J","K","L","M","N","O","P"]}  groupWinners={groupWinners} setGroupWinners={setGroupWinners} />}
            {etape === 3 && (
              <StepKnockout
                title="Huitièmes de finale"
                subtitle="8 matchs · qui se qualifie ?"
                pairings={R16_PAIRINGS.map(([a,b]) => [getR16Team(a), getR16Team(b)])}
                winners={r16Winners} setWinners={setR16Winners} prefix="H"
              />
            )}
            {etape === 4 && (
              <StepKnockout
                title="Quarts de finale"
                subtitle="4 matchs · les 8 qualifiés s'affrontent"
                pairings={QF_PAIRINGS.map(([a,b]) => [getR16Winner(a), getR16Winner(b)])}
                winners={qfWinners} setWinners={setQfWinners} prefix="Q"
              />
            )}
            {etape === 5 && (
              <StepKnockout
                title="Demi-finales"
                subtitle="2 matchs · qui joue la finale ?"
                pairings={SF_PAIRINGS.map(([a,b]) => [getQFWinner(a), getQFWinner(b)])}
                winners={sfWinners} setWinners={setSfWinners} prefix="D"
              />
            )}
            {etape === 6 && (
              <StepFinale
                finalist1={getSFWinner(0)} finalist2={getSFWinner(1)}
                champion={champion} setChampion={setChampion}
                topScorer={topScorer} setTopScorer={setTopScorer}
              />
            )}
            {etape === 7 && (
              <StepPartage
                sharedPlatform={sharedPlatform}
                preuveUrl={preuveUrl} setPreuveUrl={setPreuveUrl}
                confirmePartage={confirmePartage} setConfirmePartage={setConfirmePartage}
                onShare={handleShare}
              />
            )}

            {error && (
              <div style={{ color: "#FCA5A5", fontSize: 12, marginTop: 14, textAlign: "center",
                background: "rgba(239,68,68,.1)", borderRadius: 10, padding: "10px" }}>
                {error}
              </div>
            )}

            {/* ── NAVIGATION ── */}
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8 }}>
              {etape < 7 ? (
                <button
                  disabled={!ok}
                  onClick={() => ok && setEtape(e => e + 1)}
                  className={ok ? "pn-cta-pulse" : ""}
                  style={{
                    width: "100%",
                    background: ok
                      ? "linear-gradient(135deg, #FFB300, #FF6D00)"
                      : "rgba(255,255,255,.07)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    padding: "16px",
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: ok ? "pointer" : "not-allowed",
                    letterSpacing: .5,
                    transition: "background .2s",
                  }}
                >
                  Suivant →
                </button>
              ) : (
                <button
                  disabled={!ok || loading}
                  onClick={handleSubmit}
                  className={ok && !loading ? "pn-cta-pulse" : ""}
                  style={{
                    width: "100%",
                    background: loading ? "rgba(255,255,255,.1)" : ok
                      ? "linear-gradient(135deg, #00C851, #00897B)"
                      : "rgba(255,255,255,.07)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    padding: "16px",
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: ok && !loading ? "pointer" : "not-allowed",
                    letterSpacing: .5,
                  }}
                >
                  {loading ? "Envoi en cours…" : "✅ Valider mon inscription !"}
                </button>
              )}

              {etape > 0 && (
                <button
                  onClick={() => setEtape(e => e - 1)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "1px solid rgba(255,255,255,.12)",
                    color: "rgba(255,255,255,.4)",
                    borderRadius: 14,
                    padding: "12px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ← Retour
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 32, color: "rgba(255,255,255,.18)", fontSize: 11 }}>
          Global Solutions Entreprise · Agréé phytosanitaire · Bénin<br />
          💬 +229 53 04 79 50 · phyto-benin.com
        </div>
      </div>
    </>
  )
}

// ─── COMPOSANTS COMMUNS ────────────────────────────────────────────────────────

function LogoPill() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.12)",
      borderRadius: 40, padding: "6px 16px 6px 8px",
      marginBottom: 14,
    }}>
      <img src="/logo-gse.jpeg" alt="GSE" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
      <div style={{ textAlign: "left" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 12 }}>Global Solutions Entreprise</div>
        <div style={{ color: "rgba(255,255,255,.35)", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>Agréé phytosanitaire · Bénin</div>
      </div>
    </div>
  )
}

function ProgressBar({ etape }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {ETAPES.map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < ETAPES.length - 1 ? "1" : "0 0 auto" }}>
          <div style={{
            width:  i === etape ? 28 : 22,
            height: i === etape ? 28 : 22,
            borderRadius: "50%",
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: i === etape ? 12 : 10,
            fontWeight: 800,
            transition: "all .3s",
            background: i < etape
              ? "linear-gradient(135deg,#FFB300,#FF6D00)"
              : i === etape
                ? "linear-gradient(135deg,#FFB300,#FF6D00)"
                : "rgba(255,255,255,.08)",
            color: i <= etape ? "#060D1F" : "rgba(255,255,255,.3)",
            boxShadow: i === etape ? "0 0 14px rgba(255,179,0,.55)" : "none",
            border: i === etape ? "2px solid rgba(255,255,255,.3)" : "none",
          }}>
            {i < etape ? "✓" : i + 1}
          </div>
          {i < ETAPES.length - 1 && (
            <div style={{
              flex: 1, height: 2,
              background: i < etape
                ? "linear-gradient(90deg,#FFB300,#FF6D00)"
                : "rgba(255,255,255,.08)",
              transition: "background .3s",
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── ÉTAPE 0 : IDENTITÉ ────────────────────────────────────────────────────────

function StepContact({ contact, setContact }) {
  const inp = {
    width: "100%", background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)", borderRadius: 12,
    padding: "14px 16px", color: "#fff", fontSize: 14,
    fontFamily: "inherit", transition: "border-color .2s",
  }
  return (
    <>
      <StepHeader
        title="Ton identité"
        sub="Pour te contacter si tu gagnes les 100 000 FCFA 🏆"
      />
      <label style={LBL}>Nom complet</label>
      <input
        className="pn-inp" style={inp}
        value={contact.nom}
        onChange={e => setContact(c => ({ ...c, nom: e.target.value }))}
        placeholder="Ex : Kouassi Jean-Baptiste"
      />
      <label style={LBL}>Numéro WhatsApp</label>
      <input
        className="pn-inp" style={inp} type="tel"
        value={contact.whatsapp}
        onChange={e => setContact(c => ({ ...c, whatsapp: e.target.value }))}
        placeholder="+229 01 XX XX XX"
      />
      <div style={{
        marginTop: 16, background: "rgba(255,179,0,.07)",
        border: "1px solid rgba(255,179,0,.2)", borderRadius: 12,
        padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,.5)",
        lineHeight: 1.6, display: "flex", gap: 8, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
        Tes informations sont utilisées uniquement pour te contacter si tu gagnes.
      </div>
    </>
  )
}

// ─── ÉTAPE 1-2 : GROUPES ──────────────────────────────────────────────────────

function StepGroupes({ groups, groupWinners, setGroupWinners }) {
  return (
    <>
      <StepHeader
        title="Phase de groupes"
        sub="Qui sort en tête de chaque groupe ?"
        note="Le vainqueur avance aux huitièmes de finale"
      />
      {groups.map(g => {
        const teams = GROUPES[g]
        const selected = groupWinners[g] || ""
        return (
          <div key={g} style={{ marginBottom: 10 }}>
            <div style={{ ...LBL, marginTop: 12 }}>
              Groupe {g}
              <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400, textTransform: "none", fontSize: 10, letterSpacing: 0, marginLeft: 6 }}>
                {teams.join(" · ")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {teams.map(eq => {
                const { flag, name } = parseTeam(eq)
                const isSel = selected === eq
                return (
                  <button
                    key={eq}
                    className="pn-team-btn"
                    onClick={() => setGroupWinners(w => ({ ...w, [g]: eq }))}
                    style={{
                      flex: 1, border: "none",
                      minHeight: 78,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      padding: "10px 4px",
                      borderRadius: 14,
                      background: isSel
                        ? "linear-gradient(135deg, rgba(255,179,0,.25), rgba(255,107,0,.15))"
                        : "rgba(255,255,255,.05)",
                      outline: isSel ? "2px solid #FFB300" : "2px solid transparent",
                      boxShadow: isSel ? "0 0 20px rgba(255,179,0,.28)" : "none",
                      opacity: selected && !isSel ? .55 : 1,
                      transition: "all .2s",
                    }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1, marginBottom: 4 }}>{flag}</span>
                    <span style={{
                      color: isSel ? "#FFD740" : "rgba(255,255,255,.75)",
                      fontSize: 10, fontWeight: 700,
                      lineHeight: 1.25, textAlign: "center",
                      maxWidth: "100%", wordBreak: "break-word",
                    }}>
                      {name}
                    </span>
                    {isSel && (
                      <span style={{
                        marginTop: 5, background: "#FFB300",
                        color: "#060D1F", borderRadius: 20,
                        padding: "1px 6px", fontSize: 8, fontWeight: 900, letterSpacing: .8,
                      }}>✓ CHOIX</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

// ─── ÉTAPES 3-5 : KNOCKOUT ────────────────────────────────────────────────────

function StepKnockout({ title, subtitle, pairings, winners, setWinners, prefix }) {
  return (
    <>
      <StepHeader title={title} sub={subtitle} />
      {pairings.map(([t1, t2], i) => {
        const sel = winners[i] || ""
        const pick = team => setWinners(w => { const n = [...w]; n[i] = team; return n })
        const { flag: f1, name: n1 } = parseTeam(t1)
        const { flag: f2, name: n2 } = parseTeam(t2)
        return (
          <div key={i} style={{
            marginBottom: 10,
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 16, padding: "12px 14px",
          }}>
            <div style={{ color: "rgba(255,255,255,.35)", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" }}>
              Match {prefix}{i + 1}
              {sel && <span style={{ color: "#00C851", marginLeft: 8, letterSpacing: 0, fontWeight: 600 }}>· Qualifié : {sel.split(" ").slice(1).join(" ") || sel}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Team 1 */}
              <button
                className="pn-team-btn"
                onClick={() => pick(t1)}
                style={{
                  flex: 1, border: "none",
                  minHeight: 72,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  padding: "10px 6px", borderRadius: 12,
                  background: sel === t1
                    ? "linear-gradient(135deg, rgba(255,179,0,.28), rgba(255,107,0,.18))"
                    : "rgba(255,255,255,.05)",
                  outline: sel === t1 ? "2px solid #FFB300" : "2px solid transparent",
                  boxShadow: sel === t1 ? "0 0 18px rgba(255,179,0,.32)" : "none",
                  opacity: sel && sel !== t1 ? .4 : 1,
                  transition: "all .18s",
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1, marginBottom: 4 }}>{f1}</span>
                <span style={{ color: sel === t1 ? "#FFD740" : "rgba(255,255,255,.75)", fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>{n1}</span>
                {sel === t1 && <span style={{ marginTop: 5, background: "#FFB300", color: "#060D1F", borderRadius: 20, padding: "1px 6px", fontSize: 8, fontWeight: 900, letterSpacing: .8 }}>✓ QUALIFIÉ</span>}
              </button>

              {/* VS */}
              <div style={{
                flexShrink: 0, width: 30, height: 30,
                borderRadius: "50%",
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,.5)", fontSize: 10, fontWeight: 800, letterSpacing: .5,
              }}>VS</div>

              {/* Team 2 */}
              <button
                className="pn-team-btn"
                onClick={() => pick(t2)}
                style={{
                  flex: 1, border: "none",
                  minHeight: 72,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  padding: "10px 6px", borderRadius: 12,
                  background: sel === t2
                    ? "linear-gradient(135deg, rgba(255,179,0,.28), rgba(255,107,0,.18))"
                    : "rgba(255,255,255,.05)",
                  outline: sel === t2 ? "2px solid #FFB300" : "2px solid transparent",
                  boxShadow: sel === t2 ? "0 0 18px rgba(255,179,0,.32)" : "none",
                  opacity: sel && sel !== t2 ? .4 : 1,
                  transition: "all .18s",
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1, marginBottom: 4 }}>{f2}</span>
                <span style={{ color: sel === t2 ? "#FFD740" : "rgba(255,255,255,.75)", fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>{n2}</span>
                {sel === t2 && <span style={{ marginTop: 5, background: "#FFB300", color: "#060D1F", borderRadius: 20, padding: "1px 6px", fontSize: 8, fontWeight: 900, letterSpacing: .8 }}>✓ QUALIFIÉ</span>}
              </button>
            </div>
          </div>
        )
      })}
    </>
  )
}

// ─── ÉTAPE 6 : FINALE ─────────────────────────────────────────────────────────

function StepFinale({ finalist1, finalist2, champion, setChampion, topScorer, setTopScorer }) {
  const { flag: f1, name: n1 } = parseTeam(finalist1)
  const { flag: f2, name: n2 } = parseTeam(finalist2)
  const inp = {
    width: "100%", background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)", borderRadius: 12,
    padding: "14px 16px", color: "#fff", fontSize: 14,
    fontFamily: "inherit",
  }
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div className="pn-trophy" style={{ fontSize: 44, marginBottom: 6 }}>🏆</div>
        <div className="pn-shimmer" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 2 }}>
          LA GRANDE FINALE
        </div>
        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, marginTop: 4 }}>
          Le match ultime — qui soulève le trophée ?
        </div>
      </div>

      {/* Finalists cards */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ ...LBL, marginTop: 0 }}>🏆 Champion du monde 2026 · Clique pour choisir</div>
        <div style={{ display: "flex", gap: 10 }}>
          {[{flag:f1,name:n1,team:finalist1},{flag:f2,name:n2,team:finalist2}].map(({ flag, name, team }) => {
            const isSel = champion === team
            return (
              <button
                key={team}
                className="pn-team-btn"
                onClick={() => setChampion(team)}
                style={{
                  flex: 1, border: "none",
                  minHeight: 100,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  padding: "16px 8px", borderRadius: 16,
                  background: isSel
                    ? "linear-gradient(135deg, rgba(255,179,0,.32), rgba(255,107,0,.22))"
                    : "rgba(255,255,255,.05)",
                  outline: isSel ? "2.5px solid #FFB300" : "2px solid rgba(255,255,255,.10)",
                  boxShadow: isSel ? "0 0 30px rgba(255,179,0,.4), inset 0 0 20px rgba(255,179,0,.08)" : "none",
                  opacity: champion && !isSel ? .45 : 1,
                  transition: "all .2s",
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1, marginBottom: 6 }}>{flag}</span>
                <span style={{ color: isSel ? "#FFD740" : "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 800, textAlign: "center", lineHeight: 1.3 }}>{name}</span>
                {isSel && (
                  <span style={{
                    marginTop: 8, background: "#FFB300",
                    color: "#060D1F", borderRadius: 20,
                    padding: "3px 10px", fontSize: 9, fontWeight: 900, letterSpacing: 1,
                  }}>🏆 CHAMPION !</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Top scorer */}
      <label style={{ ...LBL, marginTop: 20 }}>👟 Meilleur buteur du tournoi</label>
      <input
        className="pn-inp" style={inp}
        value={topScorer}
        onChange={e => setTopScorer(e.target.value)}
        placeholder="Ex : Mbappé, Vinicius Jr, Osimhen…"
      />
      <div style={{
        marginTop: 10, background: "rgba(255,179,0,.06)",
        border: "1px solid rgba(255,179,0,.15)", borderRadius: 10,
        padding: "9px 14px", fontSize: 11, color: "rgba(255,255,255,.4)",
        lineHeight: 1.6, textAlign: "center",
      }}>
        Le buteur correct rapporte <strong style={{ color: "#FFB300" }}>20 pts bonus</strong> — ça peut faire la différence !
      </div>
    </>
  )
}

// ─── ÉTAPE 7 : PARTAGE ────────────────────────────────────────────────────────

function StepPartage({ sharedPlatform, preuveUrl, setPreuveUrl, confirmePartage, setConfirmePartage, onShare }) {
  const inp = {
    width: "100%", background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)", borderRadius: 12,
    padding: "14px 16px", color: "#fff", fontSize: 14,
    fontFamily: "inherit",
  }
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 38, marginBottom: 6 }}>📣</div>
        <div style={{ color: "#00C851", fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Dernière étape !</div>
        <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13, lineHeight: 1.65 }}>
          Ton bracket est prêt. Pour valider ton inscription,<br />
          <strong style={{ color: "#fff" }}>partage ce concours</strong> sur Facebook ou LinkedIn.
        </div>
      </div>

      <div style={{ background: "rgba(255,179,0,.07)", border: "1px solid rgba(255,179,0,.22)", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
        <div style={{ color: "#FFD740", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Pourquoi partager ?</div>
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12, lineHeight: 1.7 }}>
          Le concours est gratuit. En échange, on te demande simplement de
          <strong style={{ color: "#fff" }}> partager la page et taguer 2 amis</strong> — c'est la seule condition pour concourir pour les 100 000 FCFA.
        </div>
      </div>

      <div style={{ ...LBL, marginTop: 0 }}>1. Partage sur l'une de ces plateformes</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
        <button
          onClick={() => onShare("facebook")}
          style={{
            flex: 1, padding: "14px 8px", borderRadius: 14,
            background: sharedPlatform === "facebook" ? "#1877F2" : "rgba(24,119,242,.12)",
            border: `2px solid ${sharedPlatform === "facebook" ? "#1877F2" : "rgba(24,119,242,.4)"}`,
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
            transition: "all .2s",
            boxShadow: sharedPlatform === "facebook" ? "0 0 20px rgba(24,119,242,.4)" : "none",
          }}
        >
          {sharedPlatform === "facebook" ? "✅ Partagé !" : "📘 Facebook"}
        </button>
        <button
          onClick={() => onShare("linkedin")}
          style={{
            flex: 1, padding: "14px 8px", borderRadius: 14,
            background: sharedPlatform === "linkedin" ? "#0A66C2" : "rgba(10,102,194,.12)",
            border: `2px solid ${sharedPlatform === "linkedin" ? "#0A66C2" : "rgba(10,102,194,.4)"}`,
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
            transition: "all .2s",
            boxShadow: sharedPlatform === "linkedin" ? "0 0 20px rgba(10,102,194,.4)" : "none",
          }}
        >
          {sharedPlatform === "linkedin" ? "✅ Partagé !" : "💼 LinkedIn"}
        </button>
      </div>

      {sharedPlatform && (
        <div style={{ animation: "fadeIn .3s ease-out" }}>
          <div style={{ ...LBL, marginTop: 18 }}>2. Colle le lien de ton post (preuve)</div>
          <input
            className="pn-inp" style={inp}
            value={preuveUrl}
            onChange={e => setPreuveUrl(e.target.value)}
            placeholder="Ex : https://www.facebook.com/ton-post/…"
          />
          <div style={{ color: "rgba(255,255,255,.3)", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
            Copie l'URL de ton post depuis ton navigateur et colle-la ici. GSE vérifie chaque partage.
          </div>

          <div
            style={{
              marginTop: 18, display: "flex", alignItems: "flex-start",
              gap: 12, cursor: "pointer",
            }}
            onClick={() => setConfirmePartage(v => !v)}
          >
            <div style={{
              width: 24, height: 24,
              background: confirmePartage ? "#00C851" : "rgba(255,255,255,.08)",
              border: `2px solid ${confirmePartage ? "#00C851" : "rgba(255,255,255,.25)"}`,
              borderRadius: 7, flexShrink: 0, marginTop: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .2s",
              boxShadow: confirmePartage ? "0 0 12px rgba(0,200,81,.4)" : "none",
            }}>
              {confirmePartage && <span style={{ color: "#060D1F", fontSize: 14, fontWeight: 900 }}>✓</span>}
            </div>
            <div style={{ color: confirmePartage ? "#00C851" : "rgba(255,255,255,.6)", fontSize: 13, lineHeight: 1.6, transition: "color .2s" }}>
              Je confirme avoir <strong>partagé la page du concours</strong> et <strong>tagué au moins 2 amis</strong> sur {sharedPlatform === "facebook" ? "Facebook" : "LinkedIn"}.
            </div>
          </div>

          {confirmePartage && (
            <div style={{
              marginTop: 12, background: "rgba(0,200,81,.08)",
              border: "1px solid rgba(0,200,81,.25)", borderRadius: 12,
              padding: "10px 14px", fontSize: 12, color: "#00C851",
              textAlign: "center", fontWeight: 700, animation: "fadeIn .3s",
            }}>
              ✅ Parfait ! Tu peux maintenant valider ton inscription.
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ─── PAGE D'ACCUEIL ───────────────────────────────────────────────────────────

function AccueilPage({ onStart }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PREMIUM_CSS }} />
      <div style={{ minHeight: "100vh", background: "#060D1F", fontFamily: "'Inter', 'Segoe UI', sans-serif", paddingBottom: 60 }}>

        {/* ── HERO ─────── */}
        <div style={{
          background: `
            radial-gradient(ellipse 140% 70% at 50% -5%, rgba(255,179,0,.14) 0%, transparent 62%),
            radial-gradient(ellipse 80% 40% at 50% 100%, rgba(0,100,40,.2) 0%, transparent 60%),
            #060D1F
          `,
          textAlign: "center",
          padding: "40px 20px 36px",
        }}>
          <LogoPill />

          <div style={{ marginBottom: 14 }}>
            <span style={{
              background: "linear-gradient(135deg, #DC2626, #991B1B)",
              color: "#fff", borderRadius: 40,
              padding: "5px 20px", fontSize: 12, fontWeight: 800, letterSpacing: 3,
              boxShadow: "0 4px 16px rgba(220,38,38,.35)",
            }}>
              ⚽ WORLD CUP 2026 ⚽
            </span>
          </div>

          <div style={{ marginBottom: 4, lineHeight: 1 }}>
            <span className="pn-shimmer" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 76, letterSpacing: 2 }}>
              100 000
            </span>
          </div>
          <div style={{ color: "#FFB300", fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 4, marginBottom: 6 }}>
            FCFA
          </div>
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            à gagner pour le meilleur bracket !
          </div>
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13, marginBottom: 36 }}>
            🗓️ 11 juin – 19 juillet 2026 · USA / Canada / Mexique
          </div>

          <button
            onClick={onStart}
            className="pn-cta-pulse"
            style={{
              background: "linear-gradient(135deg, #FFB300, #FF6D00)",
              color: "#fff", border: "none", borderRadius: 18,
              padding: "20px 40px", fontSize: 18, fontWeight: 900,
              cursor: "pointer", letterSpacing: .5,
              width: "100%", maxWidth: 400,
            }}
          >
            🏆 Je joue — c'est gratuit !
          </button>
          <div style={{ color: "rgba(255,255,255,.3)", fontSize: 12, marginTop: 10 }}>
            Ça prend 3 minutes · Partage requis pour valider
          </div>
        </div>

        {/* ── SECTIONS ─── */}
        <div style={{ maxWidth: 460, margin: "0 auto", padding: "0 16px" }}>

          <InfoSection titre="Comment participer ?" emoji="📋">
            {[
              ["1","#FFB300","Remplis ton bracket complet","Prédit les vainqueurs de groupes, les huitièmes, quarts, demi-finales, la finale et le champion."],
              ["2","#60A5FA","Partage sur Facebook ou LinkedIn","Publie la page du concours et tague 2 amis — c'est la condition pour valider ton inscription."],
              ["3","#00C851","Fournis la preuve de partage","Colle le lien de ton post Facebook ou LinkedIn dans le formulaire. GSE vérifie chaque inscription."],
              ["4","#C084FC","Attends les résultats","On suit les vrais matchs. À la fin du tournoi, le meilleur bracket gagne les 100 000 FCFA."],
            ].map(([n, col, titre, texte]) => (
              <div key={n} style={{ display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" }}>
                <div style={{
                  width: 34, height: 34, background: col, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 900, color: "#060D1F", flexShrink: 0,
                }}>{n}</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{titre}</div>
                  <div style={{ color: "rgba(255,255,255,.5)", fontSize: 13, lineHeight: 1.55 }}>{texte}</div>
                </div>
              </div>
            ))}
          </InfoSection>

          <InfoSection titre="Barème des points" emoji="🎯">
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, marginBottom: 12 }}>
              On compare ton bracket avec les vrais résultats :
            </div>
            {[
              ["🏆","Champion correct","50 pts","#FFD740"],
              ["🥈","Finaliste correct","30 pts","#D1D5DB"],
              ["🥉","Demi-finaliste correct (×2)","10 pts chacun","#FB923C"],
              ["⚽","Quart-de-finaliste correct (×4)","5 pts chacun","#4ADE80"],
              ["🔮","Huitième de finale correct (×8)","2 pts chacun","#60A5FA"],
              ["👟","Meilleur buteur correct","20 pts","#C084FC"],
            ].map(([ico, label, pts, col]) => (
              <div key={label} style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                background: "rgba(255,255,255,.04)",
                borderRadius: 10, marginBottom: 6,
                border: "1px solid rgba(255,255,255,.06)",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 18 }}>{ico}</span>
                  <span style={{ color: "rgba(255,255,255,.7)", fontSize: 13 }}>{label}</span>
                </div>
                <span style={{ color: col, fontWeight: 800, fontSize: 14 }}>{pts}</span>
              </div>
            ))}
            <div style={{ color: "rgba(255,255,255,.3)", fontSize: 11, marginTop: 10, fontStyle: "italic" }}>
              En cas d'égalité, le meilleur buteur correct départage.
            </div>
          </InfoSection>

          <InfoSection titre="Règlement" emoji="📜">
            {[
              "1 prono par numéro WhatsApp.",
              "Le partage sur Facebook ou LinkedIn est obligatoire pour valider l'inscription.",
              "La preuve de partage (lien du post) est exigée — GSE vérifie chaque dossier.",
              "Le bracket doit être complété avant le coup d'envoi du 1er match (11 juin 2026).",
              "Le gagnant est contacté sur WhatsApp après la finale (19 juillet 2026).",
              "Le prix de 100 000 FCFA est versé en espèces ou via Mobile Money.",
              "Concours ouvert à toute personne résidant au Bénin.",
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 9 }}>
                <div style={{ width: 6, height: 6, background: "#FFB300", borderRadius: "50%", flexShrink: 0, marginTop: 5 }} />
                <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13, lineHeight: 1.5 }}>{r}</div>
              </div>
            ))}
          </InfoSection>

          <button
            onClick={onStart}
            className="pn-cta-pulse"
            style={{
              width: "100%", padding: "20px",
              background: "linear-gradient(135deg, #FFB300, #FF6D00)",
              color: "#fff", border: "none", borderRadius: 18,
              fontSize: 18, fontWeight: 900, cursor: "pointer", letterSpacing: .5,
              marginTop: 8,
            }}
          >
            🏆 Je joue — c'est gratuit !
          </button>
          <div style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 12, marginTop: 10 }}>
            Ça prend 3 minutes · Partage requis pour valider
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 36, color: "rgba(255,255,255,.18)", fontSize: 11 }}>
          Global Solutions Entreprise · Agréé phytosanitaire · Bénin<br />
          💬 +229 53 04 79 50 · phyto-benin.com
        </div>
      </div>
    </>
  )
}

function InfoSection({ titre, emoji, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.04)",
      border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 20, padding: "20px 18px", marginBottom: 14,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 16 }}>
        {emoji} {titre}
      </div>
      {children}
    </div>
  )
}

// ─── CONFIRMATION ─────────────────────────────────────────────────────────────

function ConfirmPage({ nom, champion, platform }) {
  const link = PRONO_LINK
  const msg  = `🏆 J'ai déposé mon prono WC 2026 avec GSE !\n\nMon champion : ${champion}\n\nToi aussi, tente de gagner 100 000 FCFA 👉 ${link}`
  const { flag, name } = parseTeam(champion)
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PREMIUM_CSS }} />
      <div style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse 120% 60% at 50% 0%, rgba(0,200,81,.12) 0%, transparent 55%), #060D1F`,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 20px", textAlign: "center",
      }}>
        <div className="pn-confetti" style={{ fontSize: 72, marginBottom: 10, lineHeight: 1 }}>🎉</div>
        <div style={{ color: "#00C851", fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
          Inscription validée !
        </div>
        <div style={{ color: "rgba(255,255,255,.6)", fontSize: 15, lineHeight: 1.7, marginBottom: 6 }}>
          Bravo <strong style={{ color: "#fff" }}>{nom}</strong> !<br />
          Ton bracket et ta preuve de partage ont bien été enregistrés.
        </div>
        {champion && (
          <div style={{
            background: "linear-gradient(135deg, rgba(255,179,0,.15), rgba(255,107,0,.08))",
            border: "1.5px solid rgba(255,179,0,.35)",
            borderRadius: 16, padding: "14px 24px",
            marginBottom: 10, marginTop: 6,
            display: "inline-flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 32 }}>{flag}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ color: "rgba(255,255,255,.45)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>Mon champion</div>
              <div style={{ color: "#FFD740", fontWeight: 800, fontSize: 16 }}>{name || champion}</div>
            </div>
          </div>
        )}
        <div style={{ color: "rgba(255,255,255,.3)", fontSize: 12, marginBottom: 28, lineHeight: 1.8, maxWidth: 340 }}>
          GSE va vérifier ta preuve de partage.<br />
          On te contacte sur WhatsApp après la finale 🏆
        </div>

        <div style={{
          background: "rgba(255,255,255,.05)",
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 16, padding: "14px 24px",
          marginBottom: 20, maxWidth: 360, width: "100%",
        }}>
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
            Invite encore plus d'amis
          </div>
          <div className="pn-shimmer" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2 }}>
            phyto-benin.com/prono
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, maxWidth: 360, width: "100%", marginBottom: 12 }}>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
            target="_blank" rel="noreferrer"
            style={{
              flex: 1, background: "#1877F2", color: "#fff",
              borderRadius: 12, padding: "13px 8px",
              fontSize: 13, fontWeight: 800, textDecoration: "none",
              display: "block", textAlign: "center",
            }}
          >
            📘 Facebook
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
            target="_blank" rel="noreferrer"
            style={{
              flex: 1, background: "#25D366", color: "#fff",
              borderRadius: 12, padding: "13px 8px",
              fontSize: 13, fontWeight: 800, textDecoration: "none",
              display: "block", textAlign: "center",
            }}
          >
            💬 WhatsApp
          </a>
        </div>

        <div style={{ color: "rgba(255,255,255,.18)", fontSize: 11, marginTop: 8 }}>
          Global Solutions Entreprise · phyto-benin.com
        </div>
      </div>
    </>
  )
}

// ─── UTILS INTERNES ───────────────────────────────────────────────────────────

function StepHeader({ title, sub, note }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      <div style={{ color: "#fff", fontSize: 19, fontWeight: 800, marginBottom: 4 }}>{title}</div>
      {sub  && <div style={{ color: "rgba(255,255,255,.45)", fontSize: 12, marginBottom: note ? 2 : 0 }}>{sub}</div>}
      {note && <div style={{ color: "rgba(255,255,255,.25)", fontSize: 11 }}>{note}</div>}
    </div>
  )
}

const LBL = {
  display: "block",
  color: "rgba(255,255,255,.4)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.2,
  marginBottom: 7,
  marginTop: 14,
  textTransform: "uppercase",
}
