"use client"

import { use, useEffect, useRef, useState } from "react"
import { createClient } from "@supabase/supabase-js"

// Fiche de passage terrain, remplie par le technicien sur son téléphone via un
// lien token (un par passage). Pré-remplie depuis le contrat ; photos/vidéos
// uploadées en direct vers Storage (URL signée) pour ne pas buter sur le plafond
// 4,5 Mo de Vercel. Mobile-first : gros boutons, saisie minimale.

const BUCKET = "fiches-medias"
const TYPES_PASSAGE = ["Contrôle", "Contractuel", "Occasionnel", "Essai"]
const TYPES_PRESTA = ["Désinsectisation", "Désinfection", "Dératisation", "Fumigation", "Traitement phytosanitaire espèces verts"]
const NUISIBLES = ["Insectes rampants", "Insectes volants", "Rongeurs", "Microbes"]
// Fiche de contrôle : niveaux de consommation des postes d'appâtage et niveau
// d'infestation constaté par nuisible.
const NIVEAUX_CONSO = ["Nul", "Faible", "Moyen", "Fort"]
const NIVEAUX_INFEST = ["Nul", "Faible", "Modéré", "Élevé"]
const PRODUITS_CATS = [
  { key: "insecticides", label: "Insecticides (rampants / volants)" },
  { key: "raticides", label: "Raticides (rats / souris)" },
  { key: "desinfectants", label: "Désinfectants" },
  { key: "fumigants", label: "Fumigants" },
  { key: "phytosanitaires", label: "Phytosanitaires (espèces vertes)" },
  { key: "autres", label: "Autres" },
]

const VERT = "#0a2e1a"
const OR = "#d4a920"

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

type Media = { path: string; type: string; name: string; url?: string | null; note?: string }

export default function FicheTerrain({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<any>(null)
  const [done, setDone] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState("")

  const [typePassage, setTypePassage] = useState("Contrôle")
  const [prestations, setPrestations] = useState<string[]>([])
  const [nuisibles, setNuisibles] = useState<string[]>([])
  const [produits, setProduits] = useState<Record<string, string>>({})
  const [produitsCoches, setProduitsCoches] = useState<string[]>([])
  const [dureeDebut, setDureeDebut] = useState("")
  const [dureeFin, setDureeFin] = useState("")
  const [remarques, setRemarques] = useState("")
  const [datePassage, setDatePassage] = useState("")
  const [dateFinPassage, setDateFinPassage] = useState("")
  // Détail horaire par jour : une ligne par journée d'intervention.
  const [journees, setJournees] = useState<{ date: string; debut: string; fin: string }[]>([{ date: "", debut: "", fin: "" }])
  const [superviseurNom, setSuperviseurNom] = useState("Fabrice")
  const [files, setFiles] = useState<File[]>([])
  const [fileNotes, setFileNotes] = useState<string[]>([])
  const [mediasExistants, setMediasExistants] = useState<Media[]>([])

  // Mode contrôle (passage de type "controle") : rubriques spécifiques.
  const [estControle, setEstControle] = useState(false)
  const [postes, setPostes] = useState({ installes: "", actifs: "", niveau: "", remarque: "" })
  const [infestation, setInfestation] = useState<Record<string, string>>({})
  const [constat, setConstat] = useState("")
  const [recommandations, setRecommandations] = useState("")
  const [prochainPassage, setProchainPassage] = useState("")
  const [clientSignataire, setClientSignataire] = useState("")
  const [signatureDataUrl, setSignatureDataUrl] = useState("")
  const [signatureTech, setSignatureTech] = useState("")

  useEffect(() => {
    fetch("/api/fiche-terrain?token=" + encodeURIComponent(token))
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErreur(d.error); return }
        setInfo(d)
        setEstControle(!!(d.passage && d.passage.type_passage === "controle"))
        setDatePassage((d.passage && d.passage.date) || new Date().toISOString().slice(0, 10))
        // Pré-remplir : prestations du devis mappées sur les cases connues.
        // Un libellé composé ("Désinsectisation + Dératisation") est éclaté sur
        // les séparateurs pour cocher chaque prestation, pas seulement la première.
        const presta = [...new Set(
          (d.prestationsDevis || [])
            .flatMap((p: string) => String(p).split(/[+/,&]| et /i))
            .map((p: string) => TYPES_PRESTA.find((t) => t.toLowerCase().startsWith(p.trim().toLowerCase().slice(0, 6))))
            .filter(Boolean)
        )] as string[]
        const f = d.fiche
        if (f) {
          setTypePassage(f.type_passage || "Contrôle")
          setPrestations(f.prestations || presta)
          setNuisibles(f.nuisibles || [])
          setProduits(f.produits || {})
          setProduitsCoches(Object.keys(f.produits || {}))
          setDureeDebut(f.duree_debut || "")
          setDureeFin(f.duree_fin || "")
          setRemarques(f.remarques || "")
          setSuperviseurNom(f.rempli_par || "Fabrice")
          if (f.date_passage) setDatePassage(f.date_passage)
          if (f.date_fin_passage) setDateFinPassage(f.date_fin_passage)
          setJournees(
            Array.isArray(f.journees) && f.journees.length
              ? f.journees
              : [{ date: f.date_passage || "", debut: f.duree_debut || "", fin: f.duree_fin || "" }]
          )
          const cd = f.controle_data || {}
          if (cd.postes) setPostes({ installes: cd.postes.installes || "", actifs: cd.postes.actifs || "", niveau: cd.postes.niveau || "", remarque: cd.postes.remarque || "" })
          if (cd.infestation) setInfestation(cd.infestation)
          setConstat(cd.constat || "")
          setRecommandations(cd.recommandations || "")
          setProchainPassage(cd.prochainPassage || "")
          setClientSignataire(f.client_signataire || cd.clientSignataire || "")
          setSignatureDataUrl(f.signature_client_data_url || cd.signatureDataUrl || "")
          setSignatureTech(f.signature_tech_data_url || "")
        } else {
          setPrestations(presta)
          setJournees([{ date: (d.passage && d.passage.date) || new Date().toISOString().slice(0, 10), debut: "", fin: "" }])
        }
        setMediasExistants(d.medias || [])
      })
      .catch((e) => setErreur("Connexion impossible : " + e.message))
      .finally(() => setLoading(false))
  }, [token])

  function toggle(list: string[], set: (v: string[]) => void, val: string) {
    set(list.includes(val) ? list.filter((x) => x !== val) : list.concat(val))
  }

  // Saisie d'un nom de produit : coche automatiquement la catégorie (pour l'impression),
  // la décoche si le champ est vidé.
  function setProduit(key: string, val: string) {
    setProduits((p) => ({ ...p, [key]: val }))
    setProduitsCoches((c) => (val.trim() ? (c.includes(key) ? c : c.concat(key)) : c.filter((k) => k !== key)))
  }

  async function soumettre() {
    setSaving(true); setErreur(null); setProgress("")
    try {
      // 1) Upload direct des médias vers Storage via URL signée.
      let medias: Media[] = mediasExistants.map((m) => ({ path: m.path, type: m.type, name: m.name, note: m.note || "" }))
      if (files.length) {
        setProgress("Envoi des médias…")
        const r = await fetch("/api/fiche-terrain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, action: "upload-url", files: files.map((f) => ({ name: f.name, type: f.type })) }),
        })
        const d = await r.json()
        if (!r.ok || d.error) throw new Error(d.error || "Erreur préparation médias")
        for (let i = 0; i < d.uploads.length; i++) {
          const u = d.uploads[i]
          setProgress(`Envoi média ${i + 1}/${d.uploads.length}…`)
          const up = await sb.storage.from(BUCKET).uploadToSignedUrl(u.path, u.token, files[i])
          if (up.error) throw new Error("Échec envoi " + files[i].name + " : " + up.error.message)
          medias.push({ path: u.path, type: u.type, name: u.name, note: fileNotes[i] || "" })
        }
      }
      // 2) Enregistrer la fiche. Les dates et horaires dérivent des journées.
      const jrs = journees.filter((j) => j.date || j.debut || j.fin)
      const jr0 = jrs[0] || { date: datePassage, debut: dureeDebut, fin: dureeFin }
      const dpass = jr0.date || datePassage
      const dfin = jrs.length > 1 ? jrs[jrs.length - 1].date : ""
      setProgress("Enregistrement de la fiche…")
      const r2 = await fetch("/api/fiche-terrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fiche: {
            typePassage: estControle ? "Contrôle" : typePassage,
            prestations, nuisibles, produits, produitsCoches,
            dureeDebut: jr0.debut || "", dureeFin: jr0.fin || "", remarques,
            datePassage: dpass, dateFinPassage: dfin, journees: jrs,
            superviseurNom, rempliPar: superviseurNom,
            clientSignataire, signatureClient: signatureDataUrl, signatureTech,
            ...(estControle ? { controleData: { postes, infestation, constat, recommandations, prochainPassage } } : {}),
          },
          medias,
        }),
      })
      const d2 = await r2.json()
      if (!r2.ok || d2.error) throw new Error(d2.error || "Erreur enregistrement")
      setDone(d2.numero)
    } catch (e: any) {
      setErreur(e.message)
    } finally {
      setSaving(false); setProgress("")
    }
  }

  if (loading) return <Shell><p style={{ padding: 24, textAlign: "center" }}>Chargement…</p></Shell>
  if (erreur && !info) return <Shell><p style={{ padding: 24, textAlign: "center", color: "#991b1b" }}>{erreur}</p></Shell>
  if (done) return (
    <Shell>
      <div style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ color: VERT, margin: "12px 0" }}>Fiche envoyée</h2>
        <p style={{ color: "#555" }}>N° {done}. Merci Fabrice, le bureau la reçoit.</p>
        <p style={{ color: "#999", fontSize: 13, marginTop: 10 }}>Vous pouvez fermer cette page.</p>
      </div>
    </Shell>
  )

  const c = info.client || {}
  return (
    <Shell title={estControle ? "Fiche de contrôle" : "Fiche de passage"}>
      <div style={{ background: "#f5f5f0", borderRadius: 10, padding: 14, margin: "0 0 16px", fontSize: 14, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 700, color: VERT, fontSize: 16 }}>{c.entreprise || c.nom || "Client"}</div>
        {c.entreprise && c.nom ? <div style={{ color: "#555" }}>{c.nom}</div> : null}
        {info.lieu ? <div style={{ color: "#555" }}>Site : {info.lieu}</div> : null}
        {c.adresse ? <div style={{ color: "#555" }}>{c.adresse}</div> : null}
        {info.passage && info.passage.dejaRemplie ? <div style={{ color: OR, fontWeight: 700, marginTop: 6 }}>Déjà renseignée — vous pouvez corriger.</div> : null}
      </div>

      <Lbl>Journées d'intervention</Lbl>
      <div style={{ fontSize: 13, color: "#6b6b6b", margin: "-2px 0 8px", lineHeight: 1.5 }}>
        Une ligne par jour : la date, puis l'heure de début et de fin de ce jour-là. Ajoutez une journée si l'intervention s'est étalée sur plusieurs jours.
      </div>
      {journees.map((j, i) => (
        <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, marginBottom: 8, background: "#fafafa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: VERT }}>Jour {i + 1}</span>
            {journees.length > 1 ? <button type="button" onClick={() => setJournees(journees.filter((_, k) => k !== i))} style={{ background: "#fff", border: "1px solid #e5b4b4", color: "#991b1b", borderRadius: 8, padding: "2px 10px", fontSize: 12, cursor: "pointer" }}>Retirer</button> : null}
          </div>
          <input type="date" value={j.date} onChange={(e) => setJournees(journees.map((x, k) => (k === i ? { ...x, date: e.target.value } : x)))} style={inp} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1 }}><Lbl>Début</Lbl><input value={j.debut} onChange={(e) => setJournees(journees.map((x, k) => (k === i ? { ...x, debut: e.target.value } : x)))} placeholder="08h00" style={inp} /></div>
            <div style={{ flex: 1 }}><Lbl>Fin</Lbl><input value={j.fin} onChange={(e) => setJournees(journees.map((x, k) => (k === i ? { ...x, fin: e.target.value } : x)))} placeholder="17h00" style={inp} /></div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => { const last = journees[journees.length - 1]; let nd = ""; if (last && last.date) { const dd = new Date(last.date); dd.setDate(dd.getDate() + 1); nd = dd.toISOString().slice(0, 10) } setJournees(journees.concat({ date: nd, debut: "", fin: "" })) }} style={{ background: "#fff", border: "1px dashed " + OR, color: VERT, borderRadius: 10, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: 4 }}>+ Ajouter une journée</button>

      {estControle && (<>
        <Lbl>Relevé des postes d'appâtage</Lbl>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Lbl>Installés</Lbl><input type="number" inputMode="numeric" value={postes.installes} onChange={(e) => setPostes({ ...postes, installes: e.target.value })} placeholder="ex : 12" style={inp} /></div>
          <div style={{ flex: 1 }}><Lbl>Consommés / actifs</Lbl><input type="number" inputMode="numeric" value={postes.actifs} onChange={(e) => setPostes({ ...postes, actifs: e.target.value })} placeholder="ex : 4" style={inp} /></div>
        </div>
        <Lbl>Niveau de consommation</Lbl>
        <Chips items={NIVEAUX_CONSO} selected={[postes.niveau]} onToggle={(v) => setPostes({ ...postes, niveau: postes.niveau === v ? "" : v })} />
        <Lbl>Postes déplacés / rechargés</Lbl>
        <input value={postes.remarque} onChange={(e) => setPostes({ ...postes, remarque: e.target.value })} placeholder="ex : 2 postes rechargés, 1 déplacé zone stockage" style={inp} />

        <Lbl>Niveau d'infestation constaté</Lbl>
        {NUISIBLES.map((n) => (
          <div key={n} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>{n}</div>
            <Chips items={NIVEAUX_INFEST} selected={[infestation[n] || ""]} onToggle={(v) => setInfestation({ ...infestation, [n]: infestation[n] === v ? "" : v })} />
          </div>
        ))}

        <Lbl>Constat</Lbl>
        <textarea value={constat} onChange={(e) => setConstat(e.target.value)} rows={3} placeholder="Ce que le technicien observe sur site…" style={{ ...inp, resize: "vertical" }} />

        <Lbl>Recommandations / actions correctives</Lbl>
        <textarea value={recommandations} onChange={(e) => setRecommandations(e.target.value)} rows={3} placeholder="Recommandations au client, actions à prévoir…" style={{ ...inp, resize: "vertical" }} />

        <Lbl>Date du prochain passage</Lbl>
        <input type="date" value={prochainPassage} onChange={(e) => setProchainPassage(e.target.value)} style={inp} />
      </>)}

      {!estControle && (<>
      <Lbl>Type de passage</Lbl>
      <Chips items={TYPES_PASSAGE} selected={[typePassage]} onToggle={(v) => setTypePassage(v)} />

      <Lbl>Prestations réalisées</Lbl>
      <Chips items={TYPES_PRESTA} selected={prestations} onToggle={(v) => toggle(prestations, setPrestations, v)} multi />

      <Lbl>Nuisibles observés</Lbl>
      <Chips items={NUISIBLES} selected={nuisibles} onToggle={(v) => toggle(nuisibles, setNuisibles, v)} multi />

      <Lbl>Produits utilisés</Lbl>
      <div style={{ fontSize: 13, color: "#6b6b6b", margin: "-2px 0 2px", lineHeight: 1.5 }}>
        Remplissez seulement les produits réellement utilisés ce jour. Un seul champ, plusieurs, ou juste « Autre produit » : laissez vide ce qui ne s'applique pas.
      </div>

      <Lbl>Nom du produit insecticide utilisé</Lbl>
      <input value={produits.insecticides || ""} onChange={(e) => setProduit("insecticides", e.target.value)} placeholder="Ex : IMPERA 300 CS / ROCOGEL — ou laisser vide" style={inp} />

      <Lbl>Nom du raticide utilisé</Lbl>
      <input value={produits.raticides || ""} onChange={(e) => setProduit("raticides", e.target.value)} placeholder="Ex : VERTOX — ou laisser vide" style={inp} />

      <Lbl>Autres produits (cocher si utilisé)</Lbl>
      {PRODUITS_CATS.filter((cat) => !["insecticides", "raticides", "autres"].includes(cat.key)).map((cat) => {
        const on = produitsCoches.includes(cat.key)
        return (
          <div key={cat.key} style={{ marginBottom: 8 }}>
            <button type="button" onClick={() => toggle(produitsCoches, setProduitsCoches, cat.key)} style={{ ...chip, ...(on ? chipOn : {}), width: "100%", textAlign: "left" }}>
              {on ? "☑" : "☐"} {cat.label}
            </button>
            {on ? <input value={produits[cat.key] || ""} onChange={(e) => setProduit(cat.key, e.target.value)} placeholder="Nom du produit" style={{ ...inp, marginTop: 6 }} /> : null}
          </div>
        )
      })}

      <Lbl>Autre produit (à préciser)</Lbl>
      <input value={produits.autres || ""} onChange={(e) => setProduit("autres", e.target.value)} placeholder="Tout autre produit utilisé" style={inp} />


      <Lbl>Observations libres (pour le rapport)</Lbl>
      <div style={{ fontSize: 13, color: "#6b6b6b", margin: "-2px 0 2px", lineHeight: 1.5 }}>
        Écrivez librement tout ce que vous notez : constat, zones traitées, difficultés, conseils au client… Ces notes servent à rédiger le rapport d'intervention (elles ne figurent pas telles quelles sur la fiche).
      </div>
      <textarea value={remarques} onChange={(e) => setRemarques(e.target.value)} rows={4} placeholder="Écrivez ici…" style={{ ...inp, resize: "vertical" }} />
      </>)}

      <Lbl>Photos / Vidéos (pour le rapport)</Lbl>
      <div style={{ fontSize: 13, color: "#6b6b6b", margin: "-2px 0 2px", lineHeight: 1.5 }}>
        Ajoutez vos photos, puis écrivez une remarque sous chacune (ce que montre la photo). Les photos et leurs remarques servent au rapport d'intervention, pas à la fiche.
      </div>
      <label style={{ ...chip, display: "block", textAlign: "center", padding: "14px", border: "2px dashed " + OR, background: "#fffdf5", cursor: "pointer" }}>
        📷 Ajouter photos / vidéos
        <input type="file" accept="image/*,video/*" multiple capture="environment" style={{ display: "none" }}
          onChange={(e) => { const add = Array.from(e.target.files || []); setFiles(files.concat(add)); setFileNotes(fileNotes.concat(add.map(() => ""))) }} />
      </label>
      {mediasExistants.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {mediasExistants.map((m, i) => (
            <div key={"ex" + i} style={{ width: 120 }}>
              {String(m.type || "").startsWith("image/") && m.url
                ? <img src={m.url} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />
                : <div style={{ width: 120, height: 120, borderRadius: 8, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎬</div>}
              <input value={m.note || ""} onChange={(e) => setMediasExistants(mediasExistants.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder="Remarque sur cette photo…" style={{ ...inp, marginTop: 4, fontSize: 13, padding: "6px 8px" }} />
            </div>
          ))}
        </div>
      ) : null}
      {files.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} style={{ width: 120, position: "relative" }}>
              {f.type.startsWith("image/")
                ? <img src={URL.createObjectURL(f)} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />
                : <div style={{ width: 120, height: 120, borderRadius: 8, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎬</div>}
              <button type="button" onClick={() => { setFiles(files.filter((_, j) => j !== i)); setFileNotes(fileNotes.filter((_, j) => j !== i)) }} style={{ position: "absolute", top: -6, right: -6, background: "#991b1b", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer" }}>×</button>
              <input value={fileNotes[i] || ""} onChange={(e) => setFileNotes(fileNotes.map((n, j) => (j === i ? e.target.value : n)))} placeholder="Remarque sur cette photo…" style={{ ...inp, marginTop: 4, fontSize: 13, padding: "6px 8px" }} />
            </div>
          ))}
        </div>
      ) : null}

      <Lbl>Technicien</Lbl>
      <input value={superviseurNom} onChange={(e) => setSuperviseurNom(e.target.value)} style={inp} />

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "2px solid " + OR }}>
        <div style={{ fontWeight: 700, color: VERT, fontSize: 15, marginBottom: 2 }}>Signatures (sur place)</div>
        <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 10, lineHeight: 1.5 }}>
          Faites signer le client au doigt, puis signez vous-même. Les deux signatures apparaissent sur la fiche.
        </div>

        <Lbl>Nom du signataire (client)</Lbl>
        <input value={clientSignataire} onChange={(e) => setClientSignataire(e.target.value)} placeholder="Personne qui réceptionne sur site" style={inp} />
        <Lbl>Signature du client</Lbl>
        <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />

        <div style={{ height: 10 }} />
        <Lbl>Signature du technicien ({superviseurNom || "vous"})</Lbl>
        <SignaturePad value={signatureTech} onChange={setSignatureTech} />
      </div>

      {erreur ? <div style={{ color: "#991b1b", margin: "12px 0", fontSize: 14 }}>{erreur}</div> : null}
      {progress ? <div style={{ color: VERT, margin: "12px 0", fontSize: 14 }}>{progress}</div> : null}

      <button type="button" onClick={soumettre} disabled={saving}
        style={{ width: "100%", background: VERT, color: OR, border: "none", borderRadius: 10, padding: "16px", fontSize: 17, fontWeight: 700, cursor: "pointer", marginTop: 16, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Envoi…" : "✓ Envoyer la fiche"}
      </button>
      <div style={{ height: 40 }} />
    </Shell>
  )
}

// Pad de signature tactile : le client signe du doigt sur le téléphone. La
// signature est exportée en PNG (dataURL) et stockée dans controle_data, puis
// imprimée telle quelle sur la fiche de contrôle.
function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio
    c.height = c.offsetHeight * ratio
    const ctx = c.getContext("2d")
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#0a2e1a"
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight)
      img.src = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function point(e: React.PointerEvent) {
    const c = canvasRef.current as HTMLCanvasElement
    const r = c.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function down(e: React.PointerEvent) {
    drawing.current = true
    last.current = point(e)
    try { (e.target as Element).setPointerCapture(e.pointerId) } catch {}
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return
    const ctx = (canvasRef.current as HTMLCanvasElement).getContext("2d")
    if (!ctx || !last.current) return
    const p = point(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }
  function up() {
    if (!drawing.current) return
    drawing.current = false
    onChange((canvasRef.current as HTMLCanvasElement).toDataURL("image/png"))
  }
  function clear() {
    const c = canvasRef.current as HTMLCanvasElement
    const ctx = c.getContext("2d")
    if (ctx) ctx.clearRect(0, 0, c.width, c.height)
    onChange("")
  }

  return (
    <div>
      <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        style={{ width: "100%", height: 160, border: "1.5px dashed " + OR, borderRadius: 10, background: "#fffdf5", touchAction: "none", display: "block" }} />
      <button type="button" onClick={clear} style={{ marginTop: 6, fontSize: 13, background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>Effacer la signature</button>
    </div>
  )
}

function Shell({ children, title = "Fiche de passage" }: { children: React.ReactNode; title?: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", color: "#111" }}>
      <div style={{ background: VERT, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: OR, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>Global Solutions Entreprise</div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{title}</div>
        </div>
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 0" }}>{children}</div>
    </div>
  )
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: VERT, margin: "16px 0 6px" }}>{children}</div>
}

function Chips({ items, selected, onToggle, multi }: { items: string[]; selected: string[]; onToggle: (v: string) => void; multi?: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((it) => {
        const on = selected.includes(it)
        return (
          <button key={it} type="button" onClick={() => onToggle(it)} style={{ ...chip, ...(on ? chipOn : {}) }}>
            {multi ? (on ? "☑ " : "☐ ") : (on ? "● " : "○ ")}{it}
          </button>
        )
      })}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: "100%", padding: "12px", fontSize: 16, border: "1px solid #d8d5cc",
  borderRadius: 8, fontFamily: "inherit", boxSizing: "border-box", background: "#fff",
}
const chip: React.CSSProperties = {
  padding: "10px 14px", fontSize: 15, border: "1px solid #d8d5cc", borderRadius: 999,
  background: "#fff", color: "#333", cursor: "pointer", fontFamily: "inherit",
}
const chipOn: React.CSSProperties = { background: VERT, color: "#fff", borderColor: VERT }
