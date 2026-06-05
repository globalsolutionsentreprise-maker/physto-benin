"use client"
import { useState } from "react"

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

export default function PronoPage() {
  const [vue, setVue] = useState("accueil")
  const [etape, setEtape] = useState(0)
  const [contact, setContact] = useState({ nom: "", whatsapp: "" })
  const [groupWinners, setGroupWinners] = useState({})
  const [r16Winners, setR16Winners] = useState(Array(8).fill(""))
  const [qfWinners, setQfWinners] = useState(Array(4).fill(""))
  const [sfWinners, setSfWinners] = useState(Array(2).fill(""))
  const [champion, setChampion] = useState("")
  const [topScorer, setTopScorer] = useState("")
  // Partage
  const [sharedPlatform, setSharedPlatform] = useState("")
  const [preuveUrl, setPreuveUrl] = useState("")
  const [confirmePartage, setConfirmePartage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function getR16Team(g) { return groupWinners[g] || `Vainqueur gr. ${g}` }
  function getR16Winner(i) { return r16Winners[i] || `Vainqueur H${i+1}` }
  function getQFWinner(i) { return qfWinners[i] || `Vainqueur Q${i+1}` }
  function getSFWinner(i) { return sfWinners[i] || `Vainqueur D${i+1}` }

  function canAdvance() {
    if (etape === 0) return contact.nom.trim() && contact.whatsapp.trim()
    if (etape === 1) return ["A","B","C","D","E","F","G","H"].every(g => groupWinners[g])
    if (etape === 2) return ["I","J","K","L","M","N","O","P"].every(g => groupWinners[g])
    if (etape === 3) return r16Winners.every(Boolean)
    if (etape === 4) return qfWinners.every(Boolean)
    if (etape === 5) return sfWinners.every(Boolean)
    if (etape === 6) return champion && topScorer.trim()
    if (etape === 7) return sharedPlatform && confirmePartage
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
    setLoading(true)
    setError("")
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
    setLoading(false)
    if (!res.ok) { setError(json.error || "Erreur serveur"); return }
    setVue("confirme")
  }

  if (vue === "confirme") return <ConfirmPage nom={contact.nom} champion={champion} platform={sharedPlatform} />
  if (vue === "accueil") return <AccueilPage onStart={() => setVue("jeu")} />

  const bg = "#0a2e1a"
  const card = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "24px 20px" }
  const inp = { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }
  const lbl = { display: "block", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6, marginTop: 16, textTransform: "uppercase" }

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Segoe UI', sans-serif", padding: "0 16px 60px" }}>
      {/* HEADER */}
      <div style={{ textAlign: "center", paddingTop: 28, paddingBottom: 4 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "8px 18px", marginBottom: 14 }}>
          <img src="/logo-gse.jpeg" alt="GSE" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>Global Solutions Entreprise</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>Agréé phytosanitaire · Bénin</div>
          </div>
        </div>
        <div style={{ background: "#dc2626", color: "#fff", display: "inline-block", borderRadius: 40, padding: "5px 18px", fontSize: 11, fontWeight: 700, letterSpacing: 3, marginBottom: 10 }}>⚽ WORLD CUP 2026 ⚽</div>
        <div style={{ color: "#fbbf24", fontSize: 44, fontWeight: 900, lineHeight: 1 }}>100 000</div>
        <div style={{ color: "#f59e0b", fontSize: 17, fontWeight: 800, letterSpacing: 4, marginBottom: 16 }}>FCFA À GAGNER</div>
      </div>

      {/* PROGRESS */}
      <div style={{ maxWidth: 480, margin: "0 auto 16px" }}>
        <div style={{ display: "flex", gap: 3 }}>
          {ETAPES.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= etape ? (i === 7 ? "linear-gradient(90deg,#4ade80,#16a34a)" : "linear-gradient(90deg,#f59e0b,#b45309)") : "rgba(255,255,255,0.1)", transition: "background .3s" }} />
          ))}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center", marginTop: 6 }}>
          Étape {etape + 1}/{ETAPES.length} — {ETAPES[etape]}
        </div>
      </div>

      {/* CARD */}
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={card}>
          {etape === 0 && <StepContact contact={contact} setContact={setContact} inp={inp} lbl={lbl} />}
          {etape === 1 && <StepGroupes groups={["A","B","C","D","E","F","G","H"]} groupWinners={groupWinners} setGroupWinners={setGroupWinners} inp={inp} lbl={lbl} />}
          {etape === 2 && <StepGroupes groups={["I","J","K","L","M","N","O","P"]} groupWinners={groupWinners} setGroupWinners={setGroupWinners} inp={inp} lbl={lbl} />}
          {etape === 3 && <StepKnockout title="Huitièmes de finale" pairings={R16_PAIRINGS.map(([a,b]) => [getR16Team(a), getR16Team(b)])} winners={r16Winners} setWinners={setR16Winners} prefix="H" inp={inp} lbl={lbl} />}
          {etape === 4 && <StepKnockout title="Quarts de finale" pairings={QF_PAIRINGS.map(([a,b]) => [getR16Winner(a), getR16Winner(b)])} winners={qfWinners} setWinners={setQfWinners} prefix="Q" inp={inp} lbl={lbl} />}
          {etape === 5 && <StepKnockout title="Demi-finales" pairings={SF_PAIRINGS.map(([a,b]) => [getQFWinner(a), getQFWinner(b)])} winners={sfWinners} setWinners={setSfWinners} prefix="D" inp={inp} lbl={lbl} />}
          {etape === 6 && <StepFinale finalist1={getSFWinner(0)} finalist2={getSFWinner(1)} champion={champion} setChampion={setChampion} topScorer={topScorer} setTopScorer={setTopScorer} inp={inp} lbl={lbl} />}
          {etape === 7 && (
            <StepPartage
              sharedPlatform={sharedPlatform}
              preuveUrl={preuveUrl}
              setPreuveUrl={setPreuveUrl}
              confirmePartage={confirmePartage}
              setConfirmePartage={setConfirmePartage}
              onShare={handleShare}
              inp={inp}
              lbl={lbl}
            />
          )}

          {error && <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 12, textAlign: "center" }}>{error}</div>}

          {etape < 7 ? (
            <button
              style={{ width: "100%", marginTop: 22, background: canAdvance() ? "linear-gradient(135deg,#f59e0b,#b45309)" : "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 800, cursor: canAdvance() ? "pointer" : "not-allowed", transition: "background .2s" }}
              disabled={!canAdvance()}
              onClick={() => canAdvance() && setEtape(e => e + 1)}
            >
              Suivant →
            </button>
          ) : (
            <button
              style={{ width: "100%", marginTop: 22, background: loading ? "rgba(255,255,255,0.1)" : canAdvance() ? "linear-gradient(135deg,#4ade80,#16a34a)" : "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 800, cursor: canAdvance() && !loading ? "pointer" : "not-allowed", transition: "background .2s" }}
              disabled={!canAdvance() || loading}
              onClick={handleSubmit}
            >
              {loading ? "Envoi en cours..." : "✅ Valider mon inscription !"}
            </button>
          )}
          {etape > 0 && (
            <button style={{ width: "100%", marginTop: 8, background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)", borderRadius: 12, padding: "11px", fontSize: 13, cursor: "pointer" }} onClick={() => setEtape(e => e - 1)}>
              ← Retour
            </button>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 28, color: "rgba(255,255,255,0.22)", fontSize: 11 }}>
        Global Solutions Entreprise · Agréé phytosanitaire<br />
        💬 WhatsApp : +229 53 04 79 50 · phyto-benin.com
      </div>
    </div>
  )
}

// ─── ÉTAPE PARTAGE ───────────────────────────────────────────────

function StepPartage({ sharedPlatform, preuveUrl, setPreuveUrl, confirmePartage, setConfirmePartage, onShare, inp, lbl }) {
  return (
    <>
      {/* Titre */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📣</div>
        <div style={{ color: "#4ade80", fontSize: 19, fontWeight: 900, marginBottom: 6 }}>Dernière étape !</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.6 }}>
          Ton bracket est prêt. Pour valider ton inscription,<br />
          <strong style={{ color: "#fff" }}>tu dois partager ce concours</strong> sur Facebook ou LinkedIn.
        </div>
      </div>

      {/* Explication */}
      <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Pourquoi partager ?</div>
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 1.7 }}>
          Le concours est ouvert et gratuit. En échange, on te demande simplement de
          <strong style={{ color: "#fff" }}> partager la page et de taguer 2 amis</strong> — c'est la seule condition pour valider ton inscription et concourir pour les 100 000 FCFA.
        </div>
      </div>

      {/* Boutons de partage */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>1. Partage sur l'une de ces plateformes</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onShare("facebook")}
            style={{ flex: 1, padding: "14px 8px", background: sharedPlatform === "facebook" ? "#1877f2" : "rgba(24,119,242,0.15)", border: "2px solid " + (sharedPlatform === "facebook" ? "#1877f2" : "rgba(24,119,242,0.4)"), borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .2s" }}
          >
            {sharedPlatform === "facebook" ? "✅ Partagé !" : "📘 Facebook"}
          </button>
          <button
            onClick={() => onShare("linkedin")}
            style={{ flex: 1, padding: "14px 8px", background: sharedPlatform === "linkedin" ? "#0a66c2" : "rgba(10,102,194,0.15)", border: "2px solid " + (sharedPlatform === "linkedin" ? "#0a66c2" : "rgba(10,102,194,0.4)"), borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .2s" }}
          >
            {sharedPlatform === "linkedin" ? "✅ Partagé !" : "💼 LinkedIn"}
          </button>
        </div>
      </div>

      {/* Champ URL preuve — apparaît après avoir cliqué partager */}
      {sharedPlatform && (
        <div style={{ marginTop: 18, animation: "fadeIn .3s" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
            2. Colle le lien de ton post (preuve)
          </div>
          <input
            style={inp}
            value={preuveUrl}
            onChange={e => setPreuveUrl(e.target.value)}
            placeholder="Ex : https://www.facebook.com/ton-post/..."
          />
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
            Après avoir publié, copie l'URL de ton post depuis ton navigateur et colle-la ici.
            Ce lien permet à GSE de vérifier ton partage.
          </div>

          {/* Checkbox confirmation */}
          <div style={{ marginTop: 20, display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }} onClick={() => setConfirmePartage(v => !v)}>
            <div style={{ width: 22, height: 22, background: confirmePartage ? "#4ade80" : "rgba(255,255,255,0.08)", border: "2px solid " + (confirmePartage ? "#4ade80" : "rgba(255,255,255,0.25)"), borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s", marginTop: 1 }}>
              {confirmePartage && <span style={{ color: "#0a2e1a", fontSize: 14, fontWeight: 900 }}>✓</span>}
            </div>
            <div style={{ color: confirmePartage ? "#4ade80" : "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.6, transition: "color .2s" }}>
              Je confirme avoir <strong>partagé la page du concours</strong> et <strong>tagué au moins 2 amis</strong> sur {sharedPlatform === "facebook" ? "Facebook" : "LinkedIn"}.
            </div>
          </div>

          {confirmePartage && !preuveUrl && (
            <div style={{ marginTop: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              💡 Le lien de ton post est optionnel mais recommandé — ça permet à GSE de vérifier et de valider ton inscription plus vite.
            </div>
          )}

          {confirmePartage && preuveUrl && (
            <div style={{ marginTop: 12, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#4ade80", textAlign: "center", fontWeight: 700 }}>
              ✅ Parfait ! Tu peux maintenant valider ton inscription.
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ─── PAGE D'ACCUEIL ───────────────────────────────────────────────

function AccueilPage({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a2e1a", fontFamily: "'Segoe UI', sans-serif", padding: "0 16px 60px" }}>
      <div style={{ textAlign: "center", paddingTop: 36 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "8px 20px", marginBottom: 20 }}>
          <img src="/logo-gse.jpeg" alt="GSE" style={{ width: 42, height: 42, borderRadius: 9, objectFit: "cover" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Global Solutions Entreprise</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>Agréé phytosanitaire · Bénin</div>
          </div>
        </div>
        <div style={{ background: "#dc2626", color: "#fff", display: "inline-block", borderRadius: 40, padding: "6px 22px", fontSize: 13, fontWeight: 700, letterSpacing: 3, marginBottom: 18 }}>⚽ WORLD CUP 2026 ⚽</div>
        <div style={{ color: "#fbbf24", fontSize: 64, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>100 000</div>
        <div style={{ color: "#f59e0b", fontSize: 24, fontWeight: 900, letterSpacing: 5, marginBottom: 6 }}>FCFA</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>à gagner pour le meilleur bracket !</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 32 }}>
          Tournoi du 11 juin au 19 juillet 2026 · USA / Canada / Mexique
        </div>
      </div>

      <div style={{ maxWidth: 460, margin: "0 auto" }}>

        <Section titre="Comment participer ?" emoji="📋">
          {[
            ["1","#f59e0b","Remplis ton bracket complet","Prédit les vainqueurs de groupes, les huitièmes, quarts, demi-finales, la finale et le champion."],
            ["2","#60a5fa","Partage sur Facebook ou LinkedIn","Publie la page du concours et tague 2 amis. C'est la condition pour valider ton inscription."],
            ["3","#4ade80","Fournis la preuve de ton partage","Colle le lien de ton post Facebook ou LinkedIn dans le formulaire — GSE vérifie chaque inscription."],
            ["4","#fbbf24","Attends les résultats","On suit les vrais matchs. À la fin du tournoi, le meilleur bracket gagne les 100 000 FCFA."],
          ].map(([n,col,titre,texte]) => (
            <div key={n} style={{ display: "flex", gap: 14, marginBottom: 18, alignItems: "flex-start" }}>
              <div style={{ width: 34, height: 34, background: col, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#0a2e1a", flexShrink: 0 }}>{n}</div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{titre}</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.5 }}>{texte}</div>
              </div>
            </div>
          ))}
        </Section>

        <Section titre="Barème des points" emoji="🎯">
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 14 }}>
            On compare ton bracket avec les vrais résultats :
          </div>
          {[
            ["🏆","Champion correct","50 pts","#fbbf24"],
            ["🥈","Finaliste correct","30 pts","#d1d5db"],
            ["🥉","Demi-finaliste correct (×2)","10 pts chacun","#f97316"],
            ["⚽","Quart-de-finaliste correct (×4)","5 pts chacun","#4ade80"],
            ["🔮","Huitième correct (×8)","2 pts chacun","#60a5fa"],
            ["👟","Meilleur buteur correct","20 pts","#a78bfa"],
          ].map(([ico,label,pts,col]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>{ico}</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{label}</span>
              </div>
              <span style={{ color: col, fontWeight: 800, fontSize: 14 }}>{pts}</span>
            </div>
          ))}
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 10, fontStyle: "italic" }}>
            En cas d'égalité, le meilleur buteur correct départage.
          </div>
        </Section>

        <Section titre="Règlement" emoji="📜">
          {[
            "1 prono par numéro WhatsApp.",
            "Le partage sur Facebook ou LinkedIn est obligatoire pour valider l'inscription.",
            "La preuve de partage (lien du post) est exigée — GSE vérifie chaque dossier.",
            "Le bracket doit être complété avant le coup d'envoi du 1er match (11 juin 2026).",
            "Le gagnant est contacté sur WhatsApp après la finale (19 juillet 2026).",
            "Le prix de 100 000 FCFA est versé en espèces ou via Mobile Money.",
            "Concours ouvert à toute personne résidant au Bénin.",
          ].map((r,i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 9 }}>
              <div style={{ width: 6, height: 6, background: "#f59e0b", borderRadius: "50%", flexShrink: 0, marginTop: 5 }} />
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.5 }}>{r}</div>
            </div>
          ))}
        </Section>

        <button
          onClick={onStart}
          style={{ width: "100%", padding: "20px", background: "linear-gradient(135deg,#f59e0b,#b45309)", color: "#fff", border: "none", borderRadius: 16, fontSize: 18, fontWeight: 900, cursor: "pointer", letterSpacing: 0.5, boxShadow: "0 8px 32px rgba(245,158,11,0.35)", marginTop: 8 }}
        >
          🏆 Je joue — c'est gratuit !
        </button>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 10 }}>
          Ça prend 3 minutes · Partage requis pour valider
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 32, color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
        Global Solutions Entreprise · Agréé phytosanitaire · Bénin<br />
        💬 +229 53 04 79 50 · phyto-benin.com
      </div>
    </div>
  )
}

function Section({ titre, emoji, children }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 18px", marginBottom: 16 }}>
      <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{emoji} {titre}</div>
      {children}
    </div>
  )
}

// ─── ÉTAPES DU BRACKET ───────────────────────────────────────────

function StepContact({ contact, setContact, inp, lbl }) {
  return (
    <>
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>Ton identité</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginBottom: 18 }}>Pour te contacter si tu gagnes les 100 000 FCFA 🏆</div>
      <label style={lbl}>Nom complet</label>
      <input style={inp} value={contact.nom} onChange={e => setContact(c => ({ ...c, nom: e.target.value }))} placeholder="Ex : Kouassi Jean-Baptiste" />
      <label style={lbl}>Numéro WhatsApp</label>
      <input style={inp} type="tel" value={contact.whatsapp} onChange={e => setContact(c => ({ ...c, whatsapp: e.target.value }))} placeholder="+229 01 XX XX XX" />
      <div style={{ marginTop: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
        🔒 Tes informations sont utilisées uniquement pour te contacter si tu gagnes.
      </div>
    </>
  )
}

function StepGroupes({ groups, groupWinners, setGroupWinners, inp, lbl }) {
  return (
    <>
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>Phase de groupes</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginBottom: 4 }}>Qui sort en tête de chaque groupe ?</div>
      <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center", marginBottom: 16 }}>Le vainqueur avance directement aux huitièmes</div>
      {groups.map(g => (
        <div key={g}>
          <label style={lbl}>Groupe {g} — {GROUPES[g].join(" · ")}</label>
          <select style={{ ...inp, appearance: "none" }} value={groupWinners[g] || ""} onChange={e => setGroupWinners(w => ({ ...w, [g]: e.target.value }))}>
            <option value="">— Vainqueur du groupe {g} ?</option>
            {GROUPES[g].map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
      ))}
    </>
  )
}

function StepKnockout({ title, pairings, winners, setWinners, prefix, inp, lbl }) {
  return (
    <>
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>{title}</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginBottom: 4 }}>Qui se qualifie pour le tour suivant ?</div>
      <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center", marginBottom: 16 }}>Les équipes viennent de tes picks précédents</div>
      {pairings.map(([t1, t2], i) => {
        const opts = [t1, t2].filter(t => !t.startsWith("Vainqueur") && !t.startsWith("gr."))
        return (
          <div key={i} style={{ marginBottom: 4 }}>
            <label style={lbl}>Match {prefix}{i + 1}</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <div style={{ flex: 1, textAlign: "center", color: "rgba(255,255,255,0.65)", fontSize: 11, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 4px", lineHeight: 1.3 }}>{t1}</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>VS</div>
              <div style={{ flex: 1, textAlign: "center", color: "rgba(255,255,255,0.65)", fontSize: 11, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 4px", lineHeight: 1.3 }}>{t2}</div>
            </div>
            <select style={{ ...inp, appearance: "none" }} value={winners[i] || ""} onChange={e => setWinners(w => { const n = [...w]; n[i] = e.target.value; return n })}>
              <option value="">— Qui se qualifie ?</option>
              {(opts.length > 0 ? opts : [t1, t2]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )
      })}
    </>
  )
}

function StepFinale({ finalist1, finalist2, champion, setChampion, topScorer, setTopScorer, inp, lbl }) {
  const opts = [finalist1, finalist2].filter(t => !t.startsWith("Vainqueur"))
  return (
    <>
      <div style={{ color: "#fbbf24", fontSize: 26, fontWeight: 900, textAlign: "center", marginBottom: 4 }}>🏆 LA GRANDE FINALE</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginBottom: 20 }}>Le match ultime — qui soulève le trophée ?</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, textAlign: "center", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "14px 8px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>FINALISTE 1</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{finalist1}</div>
        </div>
        <div style={{ color: "#fbbf24", fontWeight: 900, fontSize: 20, alignSelf: "center" }}>⚡</div>
        <div style={{ flex: 1, textAlign: "center", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "14px 8px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>FINALISTE 2</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{finalist2}</div>
        </div>
      </div>
      <label style={lbl}>🏆 Champion du monde 2026</label>
      <select style={{ ...inp, appearance: "none", border: "1px solid rgba(245,158,11,0.4)" }} value={champion} onChange={e => setChampion(e.target.value)}>
        <option value="">— Qui soulève le trophée ?</option>
        {(opts.length > 0 ? opts : [finalist1, finalist2]).map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <label style={lbl}>👟 Meilleur buteur du tournoi</label>
      <input style={inp} value={topScorer} onChange={e => setTopScorer(e.target.value)} placeholder="Ex : Mbappé, Vinicius Jr, Osimhen..." />
      <div style={{ marginTop: 14, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, textAlign: "center" }}>
        Le buteur correct rapporte 20 pts bonus — ça peut faire la différence !
      </div>
    </>
  )
}

// ─── CONFIRMATION ────────────────────────────────────────────────

function ConfirmPage({ nom, champion, platform }) {
  const link = PRONO_LINK
  const msg = `🏆 J'ai déposé mon prono WC 2026 avec GSE !\n\nMon champion : ${champion}\n\nToi aussi, tente de gagner 100 000 FCFA 👉 ${link}`
  return (
    <div style={{ minHeight: "100vh", background: "#0a2e1a", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
      <div style={{ color: "#4ade80", fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Inscription validée !</div>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, lineHeight: 1.7, marginBottom: 6 }}>
        Bravo <strong style={{ color: "#fff" }}>{nom}</strong> !<br />
        Ton bracket et ta preuve de partage ont bien été enregistrés.
      </div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 10 }}>
        Ton champion : <span style={{ color: "#fbbf24", fontWeight: 700 }}>{champion}</span>
      </div>
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 28, lineHeight: 1.7, maxWidth: 340 }}>
        GSE va vérifier ta preuve de partage.<br />
        Si tout est bon, ton inscription est définitivement confirmée.<br />
        On te contacte sur WhatsApp après la finale 🏆
      </div>
      <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 20px", marginBottom: 20, maxWidth: 360, width: "100%" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Invite encore plus d'amis</div>
        <div style={{ color: "#fbbf24", fontSize: 14, fontWeight: 700 }}>phyto-benin.com/prono</div>
      </div>
      <div style={{ display: "flex", gap: 10, maxWidth: 360, width: "100%", marginBottom: 12 }}>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer"
          style={{ flex: 1, background: "#1877f2", color: "#fff", borderRadius: 10, padding: "13px 8px", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "block" }}>Facebook</a>
        <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"
          style={{ flex: 1, background: "#25d366", color: "#fff", borderRadius: 10, padding: "13px 8px", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "block" }}>WhatsApp</a>
      </div>
      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 10 }}>Global Solutions Entreprise · phyto-benin.com</div>
    </div>
  )
}
