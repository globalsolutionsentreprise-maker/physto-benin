"use client"

import { use, useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

// Fiche de passage terrain, remplie par le technicien sur son téléphone via un
// lien token (un par passage). Pré-remplie depuis le contrat ; photos/vidéos
// uploadées en direct vers Storage (URL signée) pour ne pas buter sur le plafond
// 4,5 Mo de Vercel. Mobile-first : gros boutons, saisie minimale.

const BUCKET = "fiches-medias"
const TYPES_PASSAGE = ["Contrôle", "Contractuel", "Occasionnel", "Essai"]
const TYPES_PRESTA = ["Désinsectisation", "Désinfection", "Dératisation", "Fumigation", "Traitement phytosanitaire espèces verts"]
const NUISIBLES = ["Insectes rampants", "Insectes volants", "Rongeurs", "Microbes"]
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

type Media = { path: string; type: string; name: string; url?: string | null }

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
  const [superviseurNom, setSuperviseurNom] = useState("Fabrice")
  const [files, setFiles] = useState<File[]>([])
  const [mediasExistants, setMediasExistants] = useState<Media[]>([])

  useEffect(() => {
    fetch("/api/fiche-terrain?token=" + encodeURIComponent(token))
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErreur(d.error); return }
        setInfo(d)
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
        } else {
          setPrestations(presta)
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
      let medias: Media[] = mediasExistants.map((m) => ({ path: m.path, type: m.type, name: m.name }))
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
          medias.push({ path: u.path, type: u.type, name: u.name })
        }
      }
      // 2) Enregistrer la fiche.
      setProgress("Enregistrement de la fiche…")
      const r2 = await fetch("/api/fiche-terrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fiche: {
            typePassage, prestations, nuisibles, produits, produitsCoches,
            dureeDebut, dureeFin, remarques, datePassage,
            superviseurNom, rempliPar: superviseurNom,
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
    <Shell>
      <div style={{ background: "#f5f5f0", borderRadius: 10, padding: 14, margin: "0 0 16px", fontSize: 14, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 700, color: VERT, fontSize: 16 }}>{c.entreprise || c.nom || "Client"}</div>
        {c.entreprise && c.nom ? <div style={{ color: "#555" }}>{c.nom}</div> : null}
        {info.lieu ? <div style={{ color: "#555" }}>Site : {info.lieu}</div> : null}
        {c.adresse ? <div style={{ color: "#555" }}>{c.adresse}</div> : null}
        {info.passage && info.passage.dejaRemplie ? <div style={{ color: OR, fontWeight: 700, marginTop: 6 }}>Déjà renseignée — vous pouvez corriger.</div> : null}
      </div>

      <Lbl>Date du passage</Lbl>
      <input type="date" value={datePassage} onChange={(e) => setDatePassage(e.target.value)} style={inp} />

      <Lbl>Type de passage</Lbl>
      <Chips items={TYPES_PASSAGE} selected={[typePassage]} onToggle={(v) => setTypePassage(v)} />

      <Lbl>Prestations réalisées</Lbl>
      <Chips items={TYPES_PRESTA} selected={prestations} onToggle={(v) => toggle(prestations, setPrestations, v)} multi />

      <Lbl>Nuisibles observés</Lbl>
      <Chips items={NUISIBLES} selected={nuisibles} onToggle={(v) => toggle(nuisibles, setNuisibles, v)} multi />

      <Lbl>Nom du produit insecticide utilisé</Lbl>
      <input value={produits.insecticides || ""} onChange={(e) => setProduit("insecticides", e.target.value)} placeholder="Ex : IMPERA 300 CS / ROCOGEL" style={inp} />

      <Lbl>Nom du raticide utilisé</Lbl>
      <input value={produits.raticides || ""} onChange={(e) => setProduit("raticides", e.target.value)} placeholder="Ex : VERTOX" style={inp} />

      <Lbl>Autres produits utilisés</Lbl>
      {PRODUITS_CATS.filter((cat) => cat.key !== "insecticides" && cat.key !== "raticides").map((cat) => {
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

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Lbl>Début</Lbl><input value={dureeDebut} onChange={(e) => setDureeDebut(e.target.value)} placeholder="08h00" style={inp} /></div>
        <div style={{ flex: 1 }}><Lbl>Fin</Lbl><input value={dureeFin} onChange={(e) => setDureeFin(e.target.value)} placeholder="11h30" style={inp} /></div>
      </div>

      <Lbl>Remarques</Lbl>
      <textarea value={remarques} onChange={(e) => setRemarques(e.target.value)} rows={3} placeholder="Constat, recommandations…" style={{ ...inp, resize: "vertical" }} />

      <Lbl>Photos / Vidéos</Lbl>
      <label style={{ ...chip, display: "block", textAlign: "center", padding: "14px", border: "2px dashed " + OR, background: "#fffdf5", cursor: "pointer" }}>
        📷 Ajouter photos / vidéos
        <input type="file" accept="image/*,video/*" multiple capture="environment" style={{ display: "none" }}
          onChange={(e) => setFiles(files.concat(Array.from(e.target.files || [])))} />
      </label>
      {mediasExistants.length ? <div style={{ fontSize: 13, color: "#555", marginTop: 8 }}>{mediasExistants.length} média(s) déjà envoyé(s).</div> : null}
      {files.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative" }}>
              {f.type.startsWith("image/")
                ? <img src={URL.createObjectURL(f)} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} />
                : <div style={{ width: 72, height: 72, borderRadius: 8, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎬</div>}
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ position: "absolute", top: -6, right: -6, background: "#991b1b", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      ) : null}

      <Lbl>Technicien</Lbl>
      <input value={superviseurNom} onChange={(e) => setSuperviseurNom(e.target.value)} style={inp} />

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", color: "#111" }}>
      <div style={{ background: VERT, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: OR, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>Global Solutions Entreprise</div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Fiche de passage</div>
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
