"use client"

import { use, useEffect, useRef, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { buildFichePassageHtml, buildFicheControleHtml } from "@/lib/fiche-html"

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
  const [sigAlerte, setSigAlerte] = useState(false)
  const techSigRef = useRef<HTMLDivElement>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  // Brouillon sauvegardé sur le téléphone : si l'onglet se recharge (ex. après
  // avoir ouvert la fiche pour l'envoyer), Fabrice retrouve tout son travail.
  const DRAFT_KEY = "fiche-draft-" + token
  const draftRestored = useRef(false)

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
        // Brouillon serveur : la saisie en cours est restaurée en priorité
        // (survit à un rechargement total, au navigateur WhatsApp, à un autre tél).
        if (d.draft && typeof d.draft === "object") { applyDraft(d.draft); draftRestored.current = true }
      })
      .catch((e) => setErreur("Connexion impossible : " + e.message))
      .finally(() => setLoading(false))
  }, [token])

  // Applique un brouillon (serveur en priorité, sinon local) : la saisie en
  // cours prime sur le pré-remplissage, pour ne jamais perdre le travail.
  function applyDraft(d: any) {
    if (!d || typeof d !== "object") return
    if (d.typePassage) setTypePassage(d.typePassage)
    if (Array.isArray(d.prestations)) setPrestations(d.prestations)
    if (Array.isArray(d.nuisibles)) setNuisibles(d.nuisibles)
    if (d.produits) setProduits(d.produits)
    if (Array.isArray(d.produitsCoches)) setProduitsCoches(d.produitsCoches)
    if (d.dureeDebut) setDureeDebut(d.dureeDebut)
    if (d.dureeFin) setDureeFin(d.dureeFin)
    if (typeof d.remarques === "string") setRemarques(d.remarques)
    if (d.datePassage) setDatePassage(d.datePassage)
    if (typeof d.dateFinPassage === "string") setDateFinPassage(d.dateFinPassage)
    if (Array.isArray(d.journees) && d.journees.length) setJournees(d.journees)
    if (d.superviseurNom) setSuperviseurNom(d.superviseurNom)
    if (Array.isArray(d.mediasExistants)) setMediasExistants(d.mediasExistants)
    if (d.postes) setPostes(d.postes)
    if (d.infestation) setInfestation(d.infestation)
    if (typeof d.constat === "string") setConstat(d.constat)
    if (typeof d.recommandations === "string") setRecommandations(d.recommandations)
    if (d.prochainPassage) setProchainPassage(d.prochainPassage)
    if (typeof d.clientSignataire === "string") setClientSignataire(d.clientSignataire)
    if (d.signatureClient) setSignatureDataUrl(d.signatureClient)
    if (d.signatureTech) setSignatureTech(d.signatureTech)
  }

  // Brouillon sérialisable (sans URL blob: invalide après rechargement : la
  // photo reste sur le serveur, son chemin et sa remarque suffisent).
  function buildDraft() {
    const mediasSer = mediasExistants.map((m) => ({ path: m.path, type: m.type, name: m.name, note: m.note || "", url: (m.url && m.url.indexOf("blob:") === 0) ? null : m.url }))
    return {
      typePassage, prestations, nuisibles, produits, produitsCoches, dureeDebut, dureeFin, remarques,
      datePassage, dateFinPassage, journees, superviseurNom, mediasExistants: mediasSer,
      postes, infestation, constat, recommandations, prochainPassage,
      clientSignataire, signatureClient: signatureDataUrl, signatureTech,
    }
  }

  // Repli : si le serveur n'a pas renvoyé de brouillon, restaure celui du
  // téléphone (une fois, après chargement).
  useEffect(() => {
    if (loading || draftRestored.current) return
    draftRestored.current = true
    try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) applyDraft(JSON.parse(raw)) } catch {}
  }, [loading])

  // Sauvegarde LOCALE immédiate (secours instantané sur le téléphone).
  useEffect(() => {
    if (loading || done) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraft())) } catch {}
  }, [loading, done, typePassage, prestations, nuisibles, produits, produitsCoches, dureeDebut, dureeFin, remarques, datePassage, dateFinPassage, journees, superviseurNom, mediasExistants, postes, infestation, constat, recommandations, prochainPassage, clientSignataire, signatureDataUrl, signatureTech])

  // Sauvegarde SERVEUR (blindée) : le brouillon est poussé au bureau après une
  // courte pause de saisie. Récupérable après un rechargement total, dans le
  // navigateur WhatsApp, ou sur un autre téléphone.
  useEffect(() => {
    if (loading || done) return
    const t = setTimeout(() => {
      fetch("/api/fiche-terrain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "save_draft", draft: buildDraft() }) }).catch(() => {})
    }, 1200)
    return () => clearTimeout(t)
  }, [loading, done, typePassage, prestations, nuisibles, produits, produitsCoches, dureeDebut, dureeFin, remarques, datePassage, dateFinPassage, journees, superviseurNom, mediasExistants, postes, infestation, constat, recommandations, prochainPassage, clientSignataire, signatureDataUrl, signatureTech])

  // Upload immédiat des photos/vidéos ajoutées : elles sont sur le serveur tout
  // de suite (durables) et n'attendent plus l'envoi. En cas d'échec réseau, on
  // garde le fichier en attente (l'envoi final réessaiera) pour ne rien perdre.
  async function ajouterMedias(add: File[]) {
    if (!add.length) return
    setUploadingMedia(true); setErreur(null)
    try {
      const r = await fetch("/api/fiche-terrain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "upload-url", files: add.map((f) => ({ name: f.name, type: f.type })) }) })
      const d = await r.json()
      if (!r.ok || d.error) throw new Error(d.error || "Préparation impossible")
      const ok: Media[] = []
      for (let i = 0; i < d.uploads.length; i++) {
        const u = d.uploads[i]
        const up = await sb.storage.from(BUCKET).uploadToSignedUrl(u.path, u.token, add[i])
        if (up.error) throw new Error(up.error.message)
        ok.push({ path: u.path, type: u.type, name: u.name, note: "", url: add[i].type.startsWith("image/") ? URL.createObjectURL(add[i]) : null })
      }
      setMediasExistants((prev) => prev.concat(ok))
    } catch (e: any) {
      setFiles((prev) => prev.concat(add)); setFileNotes((prev) => prev.concat(add.map(() => "")))
      setErreur("Photo non envoyée (réseau faible). Elle partira à l'envoi de la fiche.")
    } finally { setUploadingMedia(false) }
  }

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
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
    } catch (e: any) {
      setErreur(e.message)
    } finally {
      setSaving(false); setProgress("")
    }
  }

  // Télécharge la fiche FINALISÉE (avec les signatures) depuis le téléphone de
  // Fabrice, pour l'envoyer au client. Bilingue (FR + EN dans le même PDF) si le
  // client est anglophone. On reconstruit la fiche à partir de l'état saisi, en
  // dérivant dates/horaires comme à l'enregistrement.
  function telechargerFiche() {
    const c = (info && info.client) || {}
    const bilingue = !!c.bilingue
    const jrs = journees.filter((j) => j.date || j.debut || j.fin)
    const jr0 = jrs[0] || { date: datePassage, debut: dureeDebut, fin: dureeFin }
    const dpass = jr0.date || datePassage
    const dfin = jrs.length > 1 ? jrs[jrs.length - 1].date : ""
    const numero = done || "—"
    let html: string
    if (estControle) {
      const fiche = {
        controle_data: { postes, infestation, constat, recommandations, prochainPassage, signatureDataUrl, clientSignataire },
        date_passage: dpass, date_fin_passage: dfin, lieu_prestation: (info && info.lieu) || "",
        signature_client_data_url: signatureDataUrl, client_signataire: clientSignataire,
        signature_tech_data_url: signatureTech, superviseur_nom: superviseurNom, superviseur_contact: "",
      }
      html = buildFicheControleHtml(fiche, { entreprise: c.entreprise, nom: c.nom, adresse: c.adresse }, numero, [], { bilingue })
    } else {
      const form = {
        nomClient: c.entreprise || c.nom || "", adresse: c.adresse || "", tel: c.tel || "", mob: "",
        typePassage, prestations, nuisibles, produits, produitsCoches, autresPrestation: "", autresNuisible: "",
        lieuPrestation: (info && info.lieu) || "", journees: jrs,
        dureeDebut: jr0.debut || "", dureeFin: jr0.fin || "", datePassage: dpass, dateFinPassage: dfin,
        clientSignataire, signatureClient: signatureDataUrl, signatureTech, superviseurNom, superviseurContact: "",
      }
      html = buildFichePassageHtml(form, { entreprise: c.entreprise, nom: c.nom }, numero, [], { bilingue })
    }
    // <base> : les chemins racine (logo) ne se résolvent pas dans une URL blob:.
    html = html.replace("<head>", '<head><base href="' + window.location.origin + '/">')
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }))
    window.open(url, "_blank")
  }

  if (loading) return <Shell><p style={{ padding: 24, textAlign: "center" }}>Chargement…</p></Shell>
  if (erreur && !info) return <Shell><p style={{ padding: 24, textAlign: "center", color: "#991b1b" }}>{erreur}</p></Shell>
  if (done) return (
    <Shell>
      <div style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ color: VERT, margin: "12px 0" }}>Fiche envoyée</h2>
        <p style={{ color: "#555" }}>N° {done}. Merci Fabrice, le bureau la reçoit.</p>
        <button type="button" onClick={telechargerFiche} style={{ background: VERT, color: OR, border: "none", borderRadius: 10, padding: "14px 20px", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 18 }}>
          📄 Télécharger la fiche{info && info.client && info.client.bilingue ? " (FR + EN)" : ""}
        </button>
        <p style={{ color: "#777", fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
          La fiche s'ouvre avec les signatures. Enregistrez-la en PDF (menu « Partager » / « Imprimer » du téléphone) puis envoyez-la au client.
        </p>
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

      {!estControle && (
        <div style={{ border: "2px solid " + OR, borderRadius: 10, padding: 14, marginBottom: 18, background: "#fffdf5" }}>
          <div style={{ fontWeight: 700, color: VERT, fontSize: 15, marginBottom: 4 }}>Fiche de passage à remettre au client</div>
          <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 10, lineHeight: 1.5 }}>
            Vous pouvez la sortir tout de suite (preuve de passage), sans attendre d'avoir tout rempli. ⚠️ <strong style={{ color: VERT }}>Vous devez d'abord signer votre partie</strong> — c'est votre signature qui vaut preuve de passage.
          </div>
          <button type="button"
            onClick={() => { if (!signatureTech) { setSigAlerte(true); techSigRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }) } else { telechargerFiche() } }}
            style={{ width: "100%", background: signatureTech ? VERT : "#fff", color: signatureTech ? OR : VERT, border: "2px solid " + VERT, borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            📄 Sortir la fiche de passage{c.bilingue ? " (FR + EN)" : ""}
          </button>
          {!signatureTech ? <div style={{ fontSize: 12.5, color: "#b45309", marginTop: 6, lineHeight: 1.5 }}>Signez votre partie (plus bas) pour pouvoir la sortir.</div> : null}
        </div>
      )}

      <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "8px 12px", margin: "0 0 14px", fontSize: 12.5, color: "#065f46", lineHeight: 1.5 }}>
        💾 Votre saisie est enregistrée automatiquement. Même si la page se recharge (photos, WhatsApp…), vous retrouverez tout en rouvrant ce lien.
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
      <label style={{ ...chip, display: "block", textAlign: "center", padding: "14px", border: "2px dashed " + OR, background: "#fffdf5", cursor: uploadingMedia ? "wait" : "pointer", opacity: uploadingMedia ? 0.6 : 1 }}>
        {uploadingMedia ? "⏳ Envoi en cours…" : "📷 Ajouter photos / vidéos"}
        <input type="file" accept="image/*,video/*" multiple capture="environment" disabled={uploadingMedia} style={{ display: "none" }}
          onChange={(e) => { const add = Array.from(e.target.files || []); ajouterMedias(add); (e.target as HTMLInputElement).value = "" }} />
      </label>
      <div style={{ fontSize: 12, color: "#8a8a8a", marginTop: 4 }}>Chaque photo est enregistrée aussitôt : rien n'est perdu même si la page se recharge.</div>
      {mediasExistants.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {mediasExistants.map((m, i) => (
            <div key={"ex" + i} style={{ width: 120 }}>
              {String(m.type || "").startsWith("image/") && m.url
                ? <img src={m.url} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />
                : <div style={{ width: 120, height: 120, borderRadius: 8, background: "#eef2ee", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 22, color: VERT }}>
                    {String(m.type || "").startsWith("image/") ? <><span>📷</span><span style={{ fontSize: 10, marginTop: 2 }}>enregistrée</span></> : <span>🎬</span>}
                  </div>}
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
          Signez d'abord votre partie. Si le client veut lire la fiche avant de signer, téléchargez-la et envoyez-la lui (bouton ci-dessous) : votre signature y figure déjà. Le client peut aussi signer directement au doigt ci-dessous.
        </div>

        <div ref={techSigRef} style={sigAlerte && !signatureTech ? { border: "2px solid #dc2626", borderRadius: 10, padding: 10, margin: "0 -2px" } : undefined}>
          <Lbl>Signature du technicien ({superviseurNom || "vous"})</Lbl>
          {sigAlerte && !signatureTech ? <div style={{ color: "#dc2626", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Signez ici pour pouvoir sortir la fiche de passage.</div> : null}
          <SignaturePad value={signatureTech} onChange={setSignatureTech} />
        </div>

        <button type="button" onClick={telechargerFiche} disabled={!signatureTech}
          style={{ width: "100%", background: "#fff", color: VERT, border: "2px solid " + VERT, borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: signatureTech ? "pointer" : "not-allowed", marginTop: 12, opacity: signatureTech ? 1 : 0.5 }}>
          📄 Télécharger ma fiche signée{info && info.client && info.client.bilingue ? " (FR + EN)" : ""} → envoyer au client
        </button>
        <div style={{ fontSize: 12.5, color: "#8a8a8a", marginTop: 6, lineHeight: 1.5 }}>
          {signatureTech ? "La fiche s'ouvre avec votre signature. Enregistrez-la en PDF (menu Partager / Imprimer) et envoyez-la au client pour lecture, puis signature." : "Signez votre partie ci-dessus pour activer le téléchargement."}
        </div>

        <div style={{ height: 16 }} />
        <Lbl>Nom du signataire (client)</Lbl>
        <input value={clientSignataire} onChange={(e) => setClientSignataire(e.target.value)} placeholder="Personne qui réceptionne sur site" style={inp} />
        <Lbl>Signature du client (après lecture)</Lbl>
        <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />
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
  // Valeur courante lue par le re-dimensionnement (évite une fermeture périmée).
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    function setup() {
      const el = canvasRef.current
      if (!el) return
      const w = el.offsetWidth, h = el.offsetHeight
      if (!w || !h) return // pas encore mis en page : on réessaiera au resize
      const ratio = window.devicePixelRatio || 1
      el.width = w * ratio
      el.height = h * ratio
      const ctx = el.getContext("2d")
      if (!ctx) return
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.strokeStyle = "#0a2e1a"
      if (valueRef.current) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0, w, h)
        img.src = valueRef.current
      }
    }
    setup()
    // Rotation / redimensionnement du téléphone : on reconfigure en gardant
    // la signature déjà enregistrée.
    window.addEventListener("resize", setup)
    window.addEventListener("orientationchange", setup)
    return () => {
      window.removeEventListener("resize", setup)
      window.removeEventListener("orientationchange", setup)
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
