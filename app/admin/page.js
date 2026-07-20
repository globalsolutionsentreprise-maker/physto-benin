"use client"
import React, { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { resumeContrat, dateFinContrat } from "@/lib/contrat-analyse.mjs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CHIFFRES_DEFAUT = [
  { id: 1, valeur: "+50", label: "Clients proteges", ordre: 1 },
  { id: 2, valeur: "2h", label: "Delai intervention", ordre: 2 },
  { id: 4, valeur: "24h/24", label: "Disponibilite urgence", ordre: 4 },
]

var AUDIO_MAX_FILES = 5
var AUDIO_MAX_BYTES = 3 * 1024 * 1024
var AUDIO_MAX_TOTAL_B64 = 4300000
function mimeAudioDepuisNom(file) {
  if (file.type) return file.type
  var n = (file.name || '').toLowerCase()
  if (n.endsWith('.opus') || n.endsWith('.ogg')) return 'audio/ogg'
  if (n.endsWith('.m4a') || n.endsWith('.mp4')) return 'audio/mp4'
  if (n.endsWith('.mp3')) return 'audio/mpeg'
  if (n.endsWith('.wav')) return 'audio/wav'
  if (n.endsWith('.aac')) return 'audio/aac'
  if (n.endsWith('.flac')) return 'audio/flac'
  return 'audio/ogg'
}
function lireAudioBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader()
    reader.onload = function() {
      var res = reader.result || ''
      var base64 = String(res).split(',')[1] || ''
      resolve({ name: file.name || 'note-vocale', mimeType: mimeAudioDepuisNom(file), data: base64 })
    }
    reader.onerror = function() { reject(reader.error) }
    reader.readAsDataURL(file)
  })
}

export default function Admin() {
  const [connecte, setConnecte] = useState(false)
  const [emailLogin, setEmailLogin] = useState("")
  const [mdp, setMdp] = useState("")
  const [erreurMdp, setErreurMdp] = useState(false)
  const [setupMode, setSetupMode] = useState(false)
  const [setupNom, setSetupNom] = useState("")
  const [currentUser, setCurrentUser] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [formAcces, setFormAcces] = useState({ email: "", nom: "", role: "lecture", password: "" })
  const [accesSaving, setAccesSaving] = useState(false)
  const [accesSaveMsg, setAccesSaveMsg] = useState("")
  const [onglet, setOnglet] = useState("chiffres")
  const [sousTexte, setSousTexte] = useState("accueil")
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState("")
  const [erreurDB, setErreurDB] = useState("")

  const [parametres, setParametres] = useState({})
  const [chiffres, setChiffres] = useState(CHIFFRES_DEFAUT)
  const [contenus, setContenus] = useState({})
  const [temoignages, setTemoignages] = useState([])
  const [articles, setArticles] = useState([])
  const [equipe, setEquipe] = useState([])
  const [services, setServices] = useState([])
  const [nouveauService, setNouveauService] = useState({ ico: "", titre: "", accroche: "", description: "", tag: "" })
  const [realisations, setRealisations] = useState([])
  const [uploadEnCours, setUploadEnCours] = useState(false)
  const [stockProduits, setStockProduits] = React.useState([])
  const [stockMouvements, setStockMouvements] = React.useState([])
  const [stockModal, setStockModal] = React.useState(null)
  const [stockForm, setStockForm] = React.useState({})
  const [stockSaving, setStockSaving] = React.useState(false)
  const [clientsStock, setClientsStock] = React.useState([])

  const [nouveauTemoignage, setNouveauTemoignage] = useState({ init: "", nom: "", role: "", texte: "" })
  const [nouvelArticle, setNouvelArticle] = useState({ categorie: "", titre: "", resume: "", contenu: "", date: "", lecture: "5 min", vedette: false })
  const [nouveauMembre, setNouveauMembre] = useState({ init: "", nom: "", role: "", description: "", ordre: 0 })
  const [sujetArticle, setSujetArticle] = useState("")
  const [generatingArticle, setGeneratingArticle] = useState(false)
  const [articleGenMsg, setArticleGenMsg] = useState("")

  useEffect(function() {
    supabase.auth.getSession().then(async function({ data: { session } }) {
      if (session?.user) {
        try {
          const { data: acces } = await supabase.from("admin_acces").select("nom, role, actif").eq("email", session.user.email).maybeSingle()
          if (acces?.actif) {
            setCurrentUser({ email: session.user.email, nom: acces.nom, role: acces.role })
            setConnecte(true)
            chargerTout()
            return
          }
        } catch(e) {}
        await supabase.auth.signOut()
      }
    })
  }, [])

  async function chargerTout() {
    setChargement(true)
    setErreurDB("")
    try {
      const [p, c, co, t, a, e] = await Promise.all([
        supabase.from("parametres").select("*"),
        supabase.from("chiffres").select("*").order("ordre"),
        supabase.from("contenus").select("*"),
        supabase.from("temoignages").select("*").order("id"),
        supabase.from("articles").select("*").order("id"),
        supabase.from("equipe").select("*").order("ordre"),
        supabase.from("services").select("*").order("ordre"),
      ])

      if (p.error) setErreurDB("Erreur table parametres: " + p.error.message)
      if (p.data) {
        const obj = {}
        p.data.forEach(function(r) { obj[r.cle] = r.valeur })
        setParametres(obj)
      }

      // Chiffres : si vide on garde les valeurs par defaut
      if (c.error) {
        setErreurDB("Erreur table chiffres: " + c.error.message)
      } else if (c.data && c.data.length > 0) {
        setChiffres(c.data)
      } else {
        // Table vide : on insere les valeurs par defaut
        await initialiserChiffres()
      }

      if (co.data) {
        const obj = {}
        co.data.forEach(function(r) { obj[r.cle] = r.valeur })
        setContenus(obj)
      }
      if (t.data) setTemoignages(t.data)
      if (a.data) setArticles(a.data)
      if (e.data) setEquipe(e.data)
      const sv = await supabase.from("services").select("*").order("ordre")
      if (sv.data) setServices(sv.data)
      const r = await supabase.from("realisations").select("*").order("id")
      if (r.data) setRealisations(r.data)

      const [stRes, mvRes, clRes] = await Promise.all([
        supabase.from('stock_produits').select('*').order('nom'),
        supabase.from('stock_mouvements').select('*, clients(id, nom, prenom, entreprise)').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, nom, prenom, entreprise').order('nom'),
      ])
      if (stRes.data) setStockProduits(stRes.data)
      if (mvRes.data) setStockMouvements(mvRes.data)
      if (clRes.data) setClientsStock(clRes.data)

    } catch(err) {
      setErreurDB("Erreur de connexion: " + err.message)
    }
    setChargement(false)
  }

  async function initialiserChiffres() {
    const { data, error } = await supabase.from("chiffres").insert(
      CHIFFRES_DEFAUT.map(function(c) {
        return { valeur: c.valeur, label: c.label, ordre: c.ordre }
      })
    ).select()
    if (!error && data) setChiffres(data)
  }

  async function seConnecter(e) {
    e.preventDefault()
    setErreurMdp(false)

    // Mode première configuration
    if (setupMode) {
      if (!emailLogin || !mdp || !setupNom) { setErreurMdp(true); return }
      try {
        const res = await fetch("/api/admin-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setup_first_admin", email: emailLogin, password: mdp, nom: setupNom }) })
        const r = await res.json()
        if (!r.ok) { setErreurMdp(true); return }
        // Connexion automatique après setup
      } catch(e) { setErreurMdp(true); return }
    }

    // Connexion via Supabase Auth
    if (emailLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailLogin, password: mdp })
      if (!error && data?.user) {
        const { data: acces } = await supabase.from("admin_acces").select("nom, role, actif").eq("email", data.user.email).maybeSingle()
        if (acces?.actif) {
          setCurrentUser({ email: data.user.email, nom: acces.nom, role: acces.role })
          setConnecte(true)
          chargerTout()
          return
        }
        await supabase.auth.signOut()
        setErreurMdp(true)
        return
      }
      // Vérifier si première configuration nécessaire
      try {
        const chk = await fetch("/api/admin-auth")
        const d = await chk.json()
        if (d.users?.length === 0) { setSetupMode(true); return }
      } catch(e) {}
      setErreurMdp(true)
      return
    }

    setErreurMdp(true)
  }

  async function seDeconnecter() {
    await supabase.auth.signOut()
    setConnecte(false)
    setCurrentUser(null)
  }

  function afficherMessage(msg) {
    setMessage(msg)
    setTimeout(function() { setMessage("") }, 3000)
  }

  async function logAction(action, details) {
    if (!currentUser?.email) return
    try {
      await supabase.from("admin_journal").insert({ user_email: currentUser.email, user_nom: currentUser.nom || currentUser.email, action, details: details || null })
    } catch(e) {}
  }

  async function chargerAdminData() {
    try {
      const res = await fetch("/api/admin-auth")
      const d = await res.json()
      setAdminUsers(d.users || [])
      setJournalEntries(d.journal || [])
    } catch(e) {}
  }

  React.useEffect(function() {
    if ((onglet === "acces" || onglet === "journal") && currentUser?.role === "admin") {
      chargerAdminData()
    }
  }, [onglet])

  async function sauvegarderParametre(cle) {
    const valeur = parametres[cle]
    if (valeur === undefined) return
    const { error } = await supabase.from("parametres").upsert({ cle: cle, valeur: valeur }, { onConflict: "cle" })
    if (!error) afficherMessage("Sauvegarde reussie")
    else afficherMessage("Erreur: " + error.message)
  }

  function modifierParametre(cle, val) {
    setParametres(function(prev) {
      const n = Object.assign({}, prev)
      n[cle] = val
      return n
    })
  }

  function modifierChiffre(id, champ, val) {
    setChiffres(function(prev) {
      return prev.map(function(c) {
        if (c.id === id) return Object.assign({}, c, { [champ]: val })
        return c
      })
    })
  }

  async function sauvegarderChiffre(id) {
    const chiffre = chiffres.find(function(item) { return item.id === id })
    if (!chiffre) return
    const { error } = await supabase
      .from("chiffres")
      .update({ valeur: chiffre.valeur, label: chiffre.label })
      .eq("id", id)
    if (!error) afficherMessage("Chiffre sauvegarde")
    else afficherMessage("Erreur: " + error.message)
  }

  function modifierContenu(cle, val) {
    setContenus(function(prev) {
      const n = Object.assign({}, prev)
      n[cle] = val
      return n
    })
  }

  async function sauvegarderContenu(cle) {
    const valeur = contenus[cle]
    if (valeur === undefined) return
    const { error } = await supabase.from("contenus").update({ valeur: valeur }).eq("cle", cle)
    if (!error) afficherMessage("Texte sauvegarde")
    else afficherMessage("Erreur: " + error.message)
  }

  function modifierTemoignage(id, champ, val) {
    setTemoignages(function(prev) {
      return prev.map(function(t) {
        if (t.id === id) return Object.assign({}, t, { [champ]: val })
        return t
      })
    })
  }

  async function sauvegarderTemoignage(id) {
    const t = temoignages.find(function(item) { return item.id === id })
    if (!t) return
    const { error } = await supabase.from("temoignages").update({
      init: t.init,
      nom: t.nom,
      role: t.role,
      texte: t.texte
    }).eq("id", id)
    if (!error) afficherMessage("Temoignage sauvegarde")
    else afficherMessage("Erreur: " + error.message)
  }

  async function supprimerTemoignage(id) {
    const { error } = await supabase.from("temoignages").delete().eq("id", id)
    if (!error) {
      setTemoignages(function(prev) { return prev.filter(function(t) { return t.id !== id }) })
      afficherMessage("Temoignage supprime")
    }
  }

  async function ajouterTemoignage() {
    if (!nouveauTemoignage.nom || !nouveauTemoignage.texte) return
    const { error } = await supabase.from("temoignages").insert([nouveauTemoignage])
    if (!error) {
      setNouveauTemoignage({ init: "", nom: "", role: "", texte: "" })
      chargerTout()
      afficherMessage("Temoignage ajoute")
    }
  }

  function modifierArticle(id, champ, val) {
    setArticles(function(prev) {
      return prev.map(function(a) {
        if (a.id === id) return Object.assign({}, a, { [champ]: val })
        return a
      })
    })
  }

  async function sauvegarderArticle(id) {
    const a = articles.find(function(item) { return item.id === id })
    if (!a) return
    const { error } = await supabase.from("articles").update(a).eq("id", id)
    if (!error) afficherMessage("Article sauvegarde")
    else afficherMessage("Erreur: " + error.message)
  }

  async function supprimerArticle(id) {
    const { error } = await supabase.from("articles").delete().eq("id", id)
    if (!error) {
      setArticles(function(prev) { return prev.filter(function(a) { return a.id !== id }) })
      afficherMessage("Article supprime")
    }
  }

  async function ajouterArticle() {
    if (!nouvelArticle.titre) return
    const { error } = await supabase.from("articles").insert([nouvelArticle])
    if (!error) {
      setNouvelArticle({ categorie: "", titre: "", resume: "", contenu: "", date: "", lecture: "5 min", vedette: false })
      chargerTout()
      afficherMessage("Article ajoute")
    }
  }

  function modifierMembre(id, champ, val) {
    setEquipe(function(prev) {
      return prev.map(function(m) {
        if (m.id === id) return Object.assign({}, m, { [champ]: val })
        return m
      })
    })
  }

  async function sauvegarderMembre(id) {
    const m = equipe.find(function(item) { return item.id === id })
    if (!m) return
    const { error } = await supabase.from("equipe").update({
      init: m.init,
      nom: m.nom,
      role: m.role,
      description: m.description,
      ordre: m.ordre
    }).eq("id", id)
    if (!error) afficherMessage("Membre sauvegarde")
    else afficherMessage("Erreur: " + error.message)
  }

  async function supprimerMembre(id) {
    const { error } = await supabase.from("equipe").delete().eq("id", id)
    if (!error) {
      setEquipe(function(prev) { return prev.filter(function(m) { return m.id !== id }) })
      afficherMessage("Membre supprime")
    }
  }

  async function ajouterMembre() {
    if (!nouveauMembre.nom) return
    const { error } = await supabase.from("equipe").insert([nouveauMembre])
    if (!error) {
      setNouveauMembre({ init: "", nom: "", role: "", description: "", ordre: 0 })
      chargerTout()
      afficherMessage("Membre ajoute")
    }
  }


  function modifierService(id, champ, val) {
    setServices(function(prev) {
      return prev.map(function(s) { if (s.id === id) return Object.assign({}, s, { [champ]: val }); return s })
    })
  }
  async function sauvegarderService(id) {
    const s = services.find(function(item) { return item.id === id })
    if (!s) return
    // Envoyer uniquement les champs modifiables - pas id, pas actif
    const { error } = await supabase.from("services").update({
      ico: s.ico,
      titre: s.titre,
      accroche: s.accroche,
      description: s.description,
      tag: s.tag,
      ordre: s.ordre
    }).eq("id", id)
    if (!error) afficherMessage("Service sauvegarde")
    else afficherMessage("Erreur lors de la sauvegarde")
  }
  async function supprimerService(id) {
    const { error } = await supabase.from("services").delete().eq("id", id)
    if (!error) { setServices(function(prev) { return prev.filter(function(s) { return s.id !== id }) }); afficherMessage("Service supprime") }
  }
  async function ajouterService() {
    if (!nouveauService.titre || !nouveauService.description) return
    const { error } = await supabase.from("services").insert([{
      ico: nouveauService.ico || "🔧",
      titre: nouveauService.titre,
      accroche: nouveauService.accroche || "",
      description: nouveauService.description,
      tag: nouveauService.tag || "",
      ordre: services.length + 1,
      actif: true
    }])
    if (!error) { setNouveauService({ ico: "", titre: "", accroche: "", description: "", tag: "" }); chargerTout(); afficherMessage("Service ajoute") }
  }


  async function uploaderFichier(fichier, dossier) {
    const ext = fichier.name.split('.').pop()
    const nom = dossier + '_' + Date.now() + '.' + ext
    const { data, error } = await supabase.storage.from('realisations').upload(nom, fichier, { upsert: true })
    if (error) { afficherMessage('Erreur upload: ' + error.message); return null }
    const { data: urlData } = supabase.storage.from('realisations').getPublicUrl(nom)
    return urlData.publicUrl
  }

  async function sauvegarderRealisation(id) {
    const r = realisations.find(function(item) { return item.id === id })
    if (!r) return
    const { error } = await supabase.from('realisations').update({
      secteur: r.secteur,
      probleme: r.probleme,
      resultat: r.resultat,
      photo_avant: r.photo_avant,
      photo_apres: r.photo_apres,
      video: r.video,
      actif: r.actif
    }).eq('id', id)
    if (!error) afficherMessage('Realisation sauvegardee')
    else afficherMessage('Erreur: ' + error.message)
  }

  function modifierRealisation(id, champ, val) {
    setRealisations(function(prev) {
      return prev.map(function(r) { if (r.id === id) return Object.assign({}, r, { [champ]: val }); return r })
    })
  }

  async function uploaderPhotoAvant(id, fichier) {
    setUploadEnCours(true)
    const url = await uploaderFichier(fichier, 'avant')
    if (url) { modifierRealisation(id, 'photo_avant', url); afficherMessage('Photo avant uploadee') }
    setUploadEnCours(false)
  }

  async function uploaderPhotoApres(id, fichier) {
    setUploadEnCours(true)
    const url = await uploaderFichier(fichier, 'apres')
    if (url) { modifierRealisation(id, 'photo_apres', url); afficherMessage('Photo apres uploadee') }
    setUploadEnCours(false)
  }

  async function uploaderVideo(id, fichier) {
    setUploadEnCours(true)
    const url = await uploaderFichier(fichier, 'video')
    if (url) { modifierRealisation(id, 'video', url); afficherMessage('Video uploadee') }
    setUploadEnCours(false)
  }

  const inp = { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e0e0e0", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", backgroundColor: "#fff" }
  const lbl = { fontSize: "10px", color: "#888", fontWeight: "700", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }
  const card = { backgroundColor: "#fff", border: "1px solid #f0f0f0", borderRadius: "10px", padding: "20px", marginBottom: "12px" }
  const cardVert = Object.assign({}, card, { borderLeft: "3px solid #1a6b38" })
  const cardOr = Object.assign({}, card, { borderLeft: "3px solid #d4a920", backgroundColor: "#fffdf5" })
  const btnSuppr = { fontSize: "11px", color: "#991b1b", background: "none", border: "1px solid #991b1b", padding: "6px 12px", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit" }
  const btnSave = { fontSize: "11px", color: "#1a6b38", background: "none", border: "1px solid #1a6b38", padding: "6px 12px", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", marginRight: "8px" }
  const btnAjouter = { backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "700", fontSize: "13px", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontFamily: "inherit" }
  const btnSauvegarder = { backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "700", fontSize: "12px", padding: "10px 16px", borderRadius: "6px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }

  const menuGroupes = [
    { titre: "Site web", items: [
      { id: "chiffres", label: "Chiffres cles" },
      { id: "parametres", label: "Coordonnees" },
      { id: "textes", label: "Textes du site" },
      { id: "temoignages", label: "Temoignages" },
      { id: "articles", label: "Articles Blog" },
      { id: "services", label: "Nos Services" },
      { id: "realisations", label: "Realisations" },
      { id: "equipe", label: "Équipe (site web)" },
    ] },
    { titre: "Gestion", items: [
      { id: "crm", label: "📊 CRM Pipeline" },
      { id: "rh", label: "👥 Planning & RH" },
      { id: "stock", label: "📦 Stock produits" },
    ] },
    ...(currentUser?.role === "admin" ? [
      { titre: "Admin", items: [
        { id: "acces", label: "🔐 Accès utilisateurs" },
        { id: "journal", label: "📋 Journal activité" },
      ] },
    ] : []),
  ]

  // ── STOCK (Admin scope) ───────────────────────────────────────────────────
  async function rechargerStock() {
    const [stRes, mvRes, clRes] = await Promise.all([
      supabase.from('stock_produits').select('*').order('nom'),
      supabase.from('stock_mouvements').select('*, clients(id, nom, prenom, entreprise)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, nom, prenom, entreprise').order('nom'),
    ])
    if (stRes.data) setStockProduits(stRes.data)
    if (mvRes.data) setStockMouvements(mvRes.data)
    if (clRes.data) setClientsStock(clRes.data)
  }
  function ouvrirAjoutStock() {
    setStockForm({ nom: '', unite: 'litre', seuil_alerte: '' })
    setStockModal({ mode: 'form', produit: null })
  }
  function ouvrirEditStock(p) {
    setStockForm({ nom: p.nom, unite: p.unite, seuil_alerte: p.seuil_alerte })
    setStockModal({ mode: 'form', produit: p })
  }
  function ouvrirMouvementStock(p, sens) {
    setStockForm({ qte: '', clientId: '', note: '' })
    setStockModal({ mode: sens, produit: p })
  }
  async function sauvegarderFormStock() {
    if (!stockForm.nom || !stockForm.nom.trim()) return
    setStockSaving(true)
    var data = { nom: stockForm.nom.trim(), unite: stockForm.unite || 'unité', seuil_alerte: parseFloat(stockForm.seuil_alerte) || 0, updated_at: new Date().toISOString() }
    if (stockModal.produit) {
      await supabase.from('stock_produits').update(data).eq('id', stockModal.produit.id)
    } else {
      await supabase.from('stock_produits').insert(Object.assign({}, data, { quantite: 0 }))
    }
    setStockModal(null)
    await rechargerStock()
    setStockSaving(false)
  }
  async function appliquerMouvementStock() {
    var delta = parseFloat(stockForm.qte) || 0
    if (!delta) return
    setStockSaving(true)
    var p = stockModal.produit
    var isSortie = stockModal.mode === 'sortie'
    var newQte = parseFloat(p.quantite) + (isSortie ? -delta : delta)
    if (newQte < 0) newQte = 0
    await Promise.all([
      supabase.from('stock_mouvements').insert({
        produit_id: p.id, type: stockModal.mode, quantite: delta,
        client_id: (isSortie && stockForm.clientId) ? stockForm.clientId : null,
        note: stockForm.note || null,
      }),
      supabase.from('stock_produits').update({ quantite: newQte, updated_at: new Date().toISOString() }).eq('id', p.id),
    ])
    setStockModal(null)
    await rechargerStock()
    setStockSaving(false)
  }
  async function supprimerStockProduit(id) {
    if (!window.confirm('Supprimer ce produit du stock ?')) return
    await supabase.from('stock_produits').delete().eq('id', id)
    await rechargerStock()
  }
  function renderStockModal() {
    if (!stockModal) return null
    var m = stockModal
    var inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e0ddd6', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
    var lbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '5px', textTransform: 'uppercase' }
    var isForm = m.mode === 'form'
    var isEntree = m.mode === 'entree'
    var titre = isForm ? (m.produit ? '✏️ Modifier ' + m.produit.nom : '📦 Nouveau produit') : (isEntree ? '➕ Entrée stock — ' + m.produit.nom : '➖ Sortie stock — ' + m.produit.nom)
    var couleur = isEntree ? '#1a6b38' : '#991b1b'
    return React.createElement('div', {
      style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
      onClick: function(e) { if (e.target === e.currentTarget) setStockModal(null) }
    },
      React.createElement('div', { style: { backgroundColor: '#fff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px' } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
          React.createElement('div', { style: { fontSize: '16px', fontWeight: '700', color: '#0a2e1a' } }, titre),
          React.createElement('button', { onClick: function() { setStockModal(null) }, style: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' } }, '×')
        ),
        isForm
          ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
              React.createElement('div', null,
                React.createElement('label', { style: lbl }, 'Nom du produit'),
                React.createElement('input', { value: stockForm.nom || '', onChange: function(e) { setStockForm(function(prev) { return Object.assign({}, prev, { nom: e.target.value }) }) }, placeholder: 'Ex: IMPERA 300 CS', style: inp })
              ),
              React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
                React.createElement('div', null,
                  React.createElement('label', { style: lbl }, 'Unité'),
                  React.createElement('input', { value: stockForm.unite || '', onChange: function(e) { setStockForm(function(prev) { return Object.assign({}, prev, { unite: e.target.value }) }) }, placeholder: 'litre, kg, boîte…', style: inp })
                ),
                React.createElement('div', null,
                  React.createElement('label', { style: lbl }, "Seuil d'alerte"),
                  React.createElement('input', { type: 'number', min: '0', step: '0.1', value: stockForm.seuil_alerte || '', onChange: function(e) { setStockForm(function(prev) { return Object.assign({}, prev, { seuil_alerte: e.target.value }) }) }, placeholder: '2', style: inp })
                )
              ),
              React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' } },
                React.createElement('button', { onClick: function() { setStockModal(null) }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, 'Annuler'),
                React.createElement('button', { onClick: sauvegarderFormStock, disabled: stockSaving, style: { backgroundColor: '#0a2e1a', color: '#d4a920', border: 'none', borderRadius: '6px', padding: '10px 22px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' } }, stockSaving ? '...' : '💾 Enregistrer')
              )
            )
          : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
              React.createElement('div', { style: { backgroundColor: '#f8f7f4', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#555' } },
                'Stock actuel : ', React.createElement('strong', null, parseFloat(m.produit.quantite) + ' ' + m.produit.unite)
              ),
              React.createElement('div', null,
                React.createElement('label', { style: lbl }, 'Quantité ' + (isEntree ? 'achetée / reçue' : 'déposée / utilisée') + ' (' + m.produit.unite + ')'),
                React.createElement('input', { type: 'number', min: '0', step: '0.1', value: stockForm.qte || '', onChange: function(e) { setStockForm(function(prev) { return Object.assign({}, prev, { qte: e.target.value }) }) }, placeholder: '0', autoFocus: true, style: Object.assign({}, inp, { fontSize: '20px', textAlign: 'center', fontWeight: '700', color: couleur }) })
              ),
              !isEntree && React.createElement('div', null,
                React.createElement('label', { style: lbl }, 'Client concerné (optionnel)'),
                React.createElement('select', {
                  value: stockForm.clientId || '',
                  onChange: function(e) { setStockForm(function(prev) { return Object.assign({}, prev, { clientId: e.target.value }) }) },
                  style: inp
                },
                  React.createElement('option', { value: '' }, '— Sortie générale (pas chez un client) —'),
                  clientsStock.slice().sort(function(a,b){ return (a.nom||'').localeCompare(b.nom||'') }).map(function(c) {
                    var nom = [c.prenom, c.nom].filter(Boolean).join(' ') || c.entreprise || 'Client'
                    return React.createElement('option', { key: c.id, value: c.id }, nom + (c.entreprise ? ' — ' + c.entreprise : ''))
                  })
                )
              ),
              React.createElement('div', null,
                React.createElement('label', { style: lbl }, 'Note (optionnel)'),
                React.createElement('input', { value: stockForm.note || '', onChange: function(e) { setStockForm(function(prev) { return Object.assign({}, prev, { note: e.target.value }) }) }, placeholder: isEntree ? 'Ex: Livraison du 01/06' : 'Ex: Posé lors de l\'intervention', style: inp })
              ),
              React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end' } },
                React.createElement('button', { onClick: function() { setStockModal(null) }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, 'Annuler'),
                React.createElement('button', { onClick: appliquerMouvementStock, disabled: stockSaving, style: { backgroundColor: couleur, color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 22px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' } }, stockSaving ? '...' : (isEntree ? '➕ Ajouter au stock' : '➖ Retirer du stock'))
              )
            )
      )
    )
  }
  // ── FIN STOCK (Admin scope) ───────────────────────────────────────────────

  if (!connecte) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "48px 40px", width: "100%", maxWidth: "380px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <img src="/logo-gse.jpeg" alt="Logo" className="logo-anime" style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "10px", marginBottom: "16px" }} />
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "4px" }}>{setupMode ? "Première configuration" : "Back Office"}</h1>
            <p style={{ fontSize: "13px", color: "#888" }}>{setupMode ? "Créez votre compte administrateur" : "Phyto Bénin"}</p>
          </div>
          <form onSubmit={seConnecter} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {setupMode && (
              <div>
                <label style={lbl}>VOTRE NOM</label>
                <input type="text" value={setupNom} onChange={function(e) { setSetupNom(e.target.value) }} placeholder="Ex: Yakoubou Kabir" style={inp} required />
              </div>
            )}
            <div>
              <label style={lbl}>ADRESSE EMAIL</label>
              <input type="email" value={emailLogin} onChange={function(e) { setEmailLogin(e.target.value) }} placeholder="votre@email.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>{setupMode ? "CRÉER UN MOT DE PASSE" : "MOT DE PASSE"}</label>
              <input type="password" value={mdp} onChange={function(e) { setMdp(e.target.value) }} placeholder="Mot de passe" style={Object.assign({}, inp, erreurMdp ? { borderColor: "#991b1b" } : {})} />
              {erreurMdp && <p style={{ fontSize: "12px", color: "#991b1b", marginTop: "5px" }}>{setupMode ? "Erreur lors de la configuration" : "Identifiants incorrects ou accès non autorisé"}</p>}
            </div>
            <button type="submit" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "700", fontSize: "14px", padding: "13px", borderRadius: "6px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {setupMode ? "Créer mon compte" : "Se connecter"}
            </button>
            {setupMode && (
              <button type="button" onClick={function() { setSetupMode(false) }} style={{ background: "none", border: "none", color: "#888", fontSize: "12px", cursor: "pointer" }}>← Retour à la connexion</button>
            )}
          </form>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {stockModal ? renderStockModal() : null}

      <div style={{ backgroundColor: "#0a2e1a", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo-gse.jpeg" alt="Logo" className="logo-anime" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px" }} />
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#d4a920" }}>Back Office Phyto Bénin</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>
              {chargement ? "Chargement..." : "Connecte a Supabase — Modifications en temps reel"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {message && <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", backgroundColor: "rgba(74,222,128,0.1)", padding: "6px 12px", borderRadius: "5px" }}>{message}</span>}
          {erreurDB && <span style={{ fontSize: "11px", color: "#fca5a5", maxWidth: "300px" }}>{erreurDB}</span>}
          {currentUser && <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: "20px" }}>👤 {currentUser.nom} {currentUser.role === "lecture" ? "· lecture" : ""}</span>}
          <button onClick={chargerTout} style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", background: "none", border: "1px solid rgba(255,255,255,0.2)", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit" }}>Recharger</button>
          <a href="/" style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Voir le site</a>
          <button onClick={seDeconnecter} style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Déconnexion</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "calc(100vh - 64px)" }}>

        <div style={{ backgroundColor: "#fff", borderRight: "1px solid #f0f0f0", padding: "20px 0" }}>
          {menuGroupes.map(function(groupe) {
            return (
              <div key={groupe.titre} style={{ marginBottom: "18px" }}>
                <div style={{ padding: "0 20px 6px", fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#b0aca3" }}>{groupe.titre}</div>
                {groupe.items.map(function(item) {
                  return (
                    <button key={item.id} onClick={function() { setOnglet(item.id) }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 20px", fontSize: "12px", fontWeight: onglet === item.id ? "700" : "400", color: onglet === item.id ? "#0a2e1a" : "#666", backgroundColor: onglet === item.id ? "#f0f8f3" : "transparent", borderLeft: onglet === item.id ? "3px solid #1a6b38" : "3px solid transparent", borderTop: "none", borderRight: "none", borderBottom: "none", cursor: "pointer", fontFamily: "inherit" }}>
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{ padding: "32px", overflowY: "auto" }}>

          {onglet === "chiffres" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Chiffres cles</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "28px" }}>Ces 4 chiffres apparaissent dans le hero de la page d accueil. Modifiez puis cliquez Sauvegarder.</p>

              {chiffres.length === 0 ? (
                <div style={{ backgroundColor: "#fff3cd", border: "1px solid #ffc107", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
                  <p style={{ fontSize: "13px", color: "#856404", marginBottom: "12px" }}>Aucun chiffre trouve dans la base de donnees.</p>
                  <button onClick={initialiserChiffres} style={btnAjouter}>Initialiser les chiffres par defaut</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {chiffres.map(function(c) {
                    return (
                      <div key={c.id} style={cardVert}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", padding: "12px", backgroundColor: "#f0f8f3", borderRadius: "6px" }}>
                          <div style={{ width: "52px", height: "52px", borderRadius: "10px", backgroundColor: "#0a2e1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#d4a920", fontSize: "13px", fontWeight: "700", flexShrink: 0 }}>
                            {c.valeur}
                          </div>
                          <div style={{ fontSize: "12px", color: "#555" }}>{c.label}</div>
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                          <label style={lbl}>VALEUR AFFICHEE</label>
                          <input type="text" value={c.valeur} onChange={function(e) { modifierChiffre(c.id, "valeur", e.target.value) }} placeholder="Ex: +50, 2h, 100%..." style={inp} />
                        </div>
                        <div style={{ marginBottom: "16px" }}>
                          <label style={lbl}>LIBELLE</label>
                          <input type="text" value={c.label} onChange={function(e) { modifierChiffre(c.id, "label", e.target.value) }} placeholder="Ex: Clients proteges" style={inp} />
                        </div>
                        <button onClick={function() { sauvegarderChiffre(c.id) }} style={btnSauvegarder}>
                          Sauvegarder ce chiffre
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {onglet === "parametres" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Coordonnees de contact</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "28px" }}>Ces informations apparaissent dans la navbar, le footer et la page contact.</p>
              {[
                { cle: "agrement", label: "NUMERO D AGREMENT OFFICIEL", placeholder: "N AGREMENT-BENIN-XXXXX" },
                { cle: "telephone", label: "TELEPHONE", placeholder: "+229 XX XX XX XX" },
                { cle: "whatsapp", label: "NUMERO WHATSAPP (sans +)", placeholder: "22901234567" },
                { cle: "email", label: "EMAIL", placeholder: "contact@phyto-benin.com" },
                { cle: "adresse", label: "ADRESSE", placeholder: "Cotonou, Benin" },
              ].map(function(p) {
                return (
                  <div key={p.cle} style={card}>
                    <label style={lbl}>{p.label}</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="text" value={parametres[p.cle] || ""} onChange={function(e) { modifierParametre(p.cle, e.target.value) }} placeholder={p.placeholder} style={inp} />
                      <button onClick={function() { sauvegarderParametre(p.cle) }} style={btnSauvegarder}>Sauvegarder</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {onglet === "textes" && (() => {
            const groupesTextes = {
              accueil: {
                titre: "Textes de la page d accueil",
                sousTitre: "Modifiez chaque texte puis cliquez Sauvegarder.",
                champs: [
                  { cle: "hero_badge", label: "BADGE HERO", type: "input" },
                  { cle: "hero_titre_1", label: "HERO TITRE LIGNE 1", type: "input" },
                  { cle: "hero_titre_2", label: "HERO TITRE LIGNE 2 (en or)", type: "input" },
                  { cle: "hero_titre_3", label: "HERO TITRE LIGNE 3", type: "input" },
                  { cle: "hero_description", label: "HERO DESCRIPTION", type: "textarea" },
                  { cle: "intro_titre", label: "SECTION ENGAGEMENT TITRE", type: "input" },
                  { cle: "intro_texte_1", label: "SECTION ENGAGEMENT PARAGRAPHE 1", type: "textarea" },
                  { cle: "intro_texte_2", label: "SECTION ENGAGEMENT PARAGRAPHE 2", type: "textarea" },
                  { cle: "cta_titre", label: "BANDEAU FINAL TITRE", type: "input" },
                  { cle: "cta_description", label: "BANDEAU FINAL DESCRIPTION", type: "textarea" },
                ],
              },
              mission: {
                titre: "Textes Qui sommes-nous",
                sousTitre: "Modifiez les textes de la page Qui sommes-nous.",
                champs: [
                  { cle: "mission_texte_1", label: "NOTRE MISSION PARAGRAPHE 1", type: "textarea" },
                  { cle: "mission_texte_2", label: "NOTRE MISSION PARAGRAPHE 2", type: "textarea" },
                ],
              },
              garanties: {
                titre: "Textes des garanties",
                sousTitre: "Ces textes apparaissent dans la section Nos engagements.",
                champs: [
                  { cle: "garantie_agrement_desc", label: "AGREMENT DESCRIPTION", type: "textarea" },
                  { cle: "garantie_produits_desc", label: "PRODUITS HOMOLOGUES DESCRIPTION", type: "textarea" },
                  { cle: "garantie_resultats_desc", label: "RESULTATS GARANTIS DESCRIPTION", type: "textarea" },
                ],
              },
            }
            const sousOnglets = [
              { id: "accueil", label: "Accueil" },
              { id: "mission", label: "Qui sommes-nous" },
              { id: "garanties", label: "Garanties" },
            ]
            const actif = groupesTextes[sousTexte] || groupesTextes.accueil
            return (
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Textes du site</h2>
                <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>{actif.sousTitre}</p>
                <div style={{ display: "flex", gap: "6px", marginBottom: "24px", borderBottom: "1px solid #eceae4" }}>
                  {sousOnglets.map(function(s) {
                    return (
                      <button key={s.id} onClick={function() { setSousTexte(s.id) }} style={{ padding: "8px 16px", fontSize: "13px", fontWeight: sousTexte === s.id ? "700" : "500", color: sousTexte === s.id ? "#0a2e1a" : "#888", backgroundColor: "transparent", border: "none", borderBottom: sousTexte === s.id ? "2px solid #1a6b38" : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", marginBottom: "-1px" }}>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
                {actif.champs.map(function(t) {
                  return (
                    <div key={t.cle} style={card}>
                      <label style={lbl}>{t.label}</label>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        {t.type === "input" ? (
                          <input type="text" value={contenus[t.cle] || ""} onChange={function(e) { modifierContenu(t.cle, e.target.value) }} style={inp} />
                        ) : (
                          <textarea rows={3} value={contenus[t.cle] || ""} onChange={function(e) { modifierContenu(t.cle, e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                        )}
                        <button onClick={function() { sauvegarderContenu(t.cle) }} style={btnSauvegarder}>Sauvegarder</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {onglet === "temoignages" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>Temoignages clients</h2>
              {temoignages.map(function(t) {
                return (
                  <div key={t.id} style={cardVert}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <div><label style={lbl}>INITIALES</label><input type="text" value={t.init || ""} onChange={function(e) { modifierTemoignage(t.id, "init", e.target.value) }} style={inp} /></div>
                      <div><label style={lbl}>NOM</label><input type="text" value={t.nom || ""} onChange={function(e) { modifierTemoignage(t.id, "nom", e.target.value) }} style={inp} /></div>
                    </div>
                    <div style={{ marginBottom: "10px" }}><label style={lbl}>ROLE ET VILLE</label><input type="text" value={t.role || ""} onChange={function(e) { modifierTemoignage(t.id, "role", e.target.value) }} style={inp} /></div>
                    <div style={{ marginBottom: "14px" }}><label style={lbl}>TEMOIGNAGE</label><textarea rows={3} value={t.texte || ""} onChange={function(e) { modifierTemoignage(t.id, "texte", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                    <button onClick={function() { sauvegarderTemoignage(t.id) }} style={btnSave}>Sauvegarder</button>
                    <button onClick={function() { supprimerTemoignage(t.id) }} style={btnSuppr}>Supprimer</button>
                  </div>
                )
              })}
              <div style={cardOr}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "14px" }}>Ajouter un temoignage</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div><label style={lbl}>INITIALES</label><input type="text" value={nouveauTemoignage.init} onChange={function(e) { setNouveauTemoignage(function(p) { return Object.assign({}, p, { init: e.target.value }) }) }} placeholder="Ex: A.K" style={inp} /></div>
                  <div><label style={lbl}>NOM</label><input type="text" value={nouveauTemoignage.nom} onChange={function(e) { setNouveauTemoignage(function(p) { return Object.assign({}, p, { nom: e.target.value }) }) }} placeholder="Ex: A. Kone" style={inp} /></div>
                </div>
                <div style={{ marginBottom: "10px" }}><label style={lbl}>ROLE ET VILLE</label><input type="text" value={nouveauTemoignage.role} onChange={function(e) { setNouveauTemoignage(function(p) { return Object.assign({}, p, { role: e.target.value }) }) }} placeholder="Ex: Directeur, Cotonou" style={inp} /></div>
                <div style={{ marginBottom: "14px" }}><label style={lbl}>TEMOIGNAGE</label><textarea rows={3} value={nouveauTemoignage.texte} onChange={function(e) { setNouveauTemoignage(function(p) { return Object.assign({}, p, { texte: e.target.value }) }) }} placeholder="Ecrivez le temoignage..." style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                <button onClick={ajouterTemoignage} style={btnAjouter}>Ajouter ce temoignage</button>
              </div>
            </div>
          )}

          {onglet === "articles" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>Articles du blog</h2>
              {articles.map(function(a) {
                return (
                  <div key={a.id} style={cardVert}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <div><label style={lbl}>CATEGORIE</label><input type="text" value={a.categorie || ""} onChange={function(e) { modifierArticle(a.id, "categorie", e.target.value) }} style={inp} /></div>
                      <div><label style={lbl}>DATE</label><input type="text" value={a.date || ""} onChange={function(e) { modifierArticle(a.id, "date", e.target.value) }} style={inp} /></div>
                    </div>
                    <div style={{ marginBottom: "10px" }}><label style={lbl}>TITRE</label><input type="text" value={a.titre || ""} onChange={function(e) { modifierArticle(a.id, "titre", e.target.value) }} style={inp} /></div>
                    <div style={{ marginBottom: "10px" }}><label style={lbl}>RESUME</label><textarea rows={2} value={a.resume || ""} onChange={function(e) { modifierArticle(a.id, "resume", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                    <div style={{ marginBottom: "10px" }}><label style={lbl}>CONTENU COMPLET</label><textarea rows={8} value={a.contenu || ""} onChange={function(e) { modifierArticle(a.id, "contenu", e.target.value) }} placeholder="Redigez le contenu complet de l article ici..." style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", cursor: "pointer" }}>
                      <input type="checkbox" checked={a.vedette || false} onChange={function(e) { modifierArticle(a.id, "vedette", e.target.checked) }} style={{ accentColor: "#d4a920" }} />
                      <span style={{ fontSize: "12px", color: "#555" }}>Article a la une</span>
                    </label>
                    <button onClick={function() { sauvegarderArticle(a.id) }} style={btnSave}>Sauvegarder</button>
                    <button onClick={function() { supprimerArticle(a.id) }} style={btnSuppr}>Supprimer</button>
                  </div>
                )
              })}
              <div style={cardOr}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "6px" }}>Générer un article avec l'IA</h3>
                <p style={{ fontSize: "12px", color: "#888", marginBottom: "14px" }}>Donnez un sujet, l'IA rédige un article SEO complet optimisé pour Cotonou / Bénin.</p>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  <input
                    type="text"
                    value={sujetArticle}
                    onChange={function(e) { setSujetArticle(e.target.value) }}
                    onKeyDown={async function(e) { if (e.key === "Enter") e.preventDefault() }}
                    placeholder="Ex: comment prévenir les punaises de lit dans un hôtel"
                    style={Object.assign({}, inp, { flex: 1 })}
                  />
                  <button
                    onClick={async function() {
                      if (!sujetArticle.trim()) return
                      setGeneratingArticle(true)
                      setArticleGenMsg("")
                      try {
                        const res = await fetch("/api/generate-article", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sujet: sujetArticle }) })
                        const d = await res.json()
                        if (!d.ok) { setArticleGenMsg("❌ " + (d.error || "Erreur IA")); return }
                        const a = d.article
                        const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                        setNouvelArticle({ categorie: a.categorie || "", titre: a.titre || "", resume: a.resume || "", contenu: a.contenu || "", date: today, lecture: a.lecture || "5 min", vedette: false })
                        setSujetArticle("")
                        setArticleGenMsg("✅ Article généré — vérifiez et cliquez Publier")
                      } catch(e) { setArticleGenMsg("❌ Erreur réseau") }
                      setGeneratingArticle(false)
                    }}
                    disabled={generatingArticle || !sujetArticle.trim()}
                    style={{ backgroundColor: "#1a6b38", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", fontWeight: "700", cursor: generatingArticle ? "wait" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: (!sujetArticle.trim() || generatingArticle) ? 0.6 : 1 }}
                  >
                    {generatingArticle ? "⏳ Génération..." : "✨ Générer"}
                  </button>
                </div>
                {articleGenMsg && <p style={{ fontSize: "12px", color: articleGenMsg.startsWith("✅") ? "#1a6b38" : "#991b1b", marginBottom: "10px", fontWeight: "600" }}>{articleGenMsg}</p>}

                <div style={{ borderTop: "1px solid #e8e6e0", paddingTop: "14px", marginTop: "4px" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#555", marginBottom: "12px" }}>ou rédiger manuellement</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div><label style={lbl}>CATEGORIE</label><input type="text" value={nouvelArticle.categorie} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { categorie: e.target.value }) }) }} placeholder="Ex: DESINSECTISATION" style={inp} /></div>
                    <div><label style={lbl}>DATE</label><input type="text" value={nouvelArticle.date} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { date: e.target.value }) }) }} placeholder="Ex: 15 Avril 2025" style={inp} /></div>
                  </div>
                  <div style={{ marginBottom: "10px" }}><label style={lbl}>TITRE</label><input type="text" value={nouvelArticle.titre} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { titre: e.target.value }) }) }} placeholder="Titre de l article..." style={inp} /></div>
                  <div style={{ marginBottom: "10px" }}><label style={lbl}>RESUME</label><textarea rows={2} value={nouvelArticle.resume} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { resume: e.target.value }) }) }} style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                  <div style={{ marginBottom: "14px" }}><label style={lbl}>CONTENU COMPLET</label><textarea rows={6} value={nouvelArticle.contenu} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { contenu: e.target.value }) }) }} placeholder="Redigez le contenu complet..." style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                  <button onClick={ajouterArticle} style={btnAjouter}>Publier l'article</button>
                </div>
              </div>
            </div>
          )}

                              {onglet === "realisations" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Realisations</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "28px" }}>Modifiez le cas client, uploadez les photos avant/apres et la video. Activez ou desactivez l affichage sur le site.</p>
              {realisations.map(function(r) {
                return (
                  <div key={r.id} style={cardVert}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111" }}>Cas client #{r.id}</h3>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                        <input type="checkbox" checked={r.actif || false} onChange={function(e) { modifierRealisation(r.id, "actif", e.target.checked) }} />
                        Afficher sur le site
                      </label>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={lbl}>SECTEUR (ex: Hotel - Cotonou)</label>
                      <input type="text" value={r.secteur || ""} onChange={function(e) { modifierRealisation(r.id, "secteur", e.target.value) }} style={inp} />
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={lbl}>LE PROBLEME</label>
                      <textarea rows={3} value={r.probleme || ""} onChange={function(e) { modifierRealisation(r.id, "probleme", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label style={lbl}>LE RESULTAT</label>
                      <textarea rows={3} value={r.resultat || ""} onChange={function(e) { modifierRealisation(r.id, "resultat", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                      <div>
                        <label style={lbl}>PHOTO AVANT</label>
                        {r.photo_avant && <img src={r.photo_avant} style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "4px", marginBottom: "6px" }} />}
                        <input type="file" accept="image/*" onChange={function(e) { if (e.target.files[0]) uploaderPhotoAvant(r.id, e.target.files[0]) }} style={{ fontSize: "11px", width: "100%" }} />
                      </div>
                      <div>
                        <label style={lbl}>PHOTO APRES</label>
                        {r.photo_apres && <img src={r.photo_apres} style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "4px", marginBottom: "6px" }} />}
                        <input type="file" accept="image/*" onChange={function(e) { if (e.target.files[0]) uploaderPhotoApres(r.id, e.target.files[0]) }} style={{ fontSize: "11px", width: "100%" }} />
                      </div>
                      <div>
                        <label style={lbl}>VIDEO</label>
                        {r.video && <video src={r.video} style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "4px", marginBottom: "6px" }} controls />}
                        <input type="file" accept="video/*" onChange={function(e) { if (e.target.files[0]) uploaderVideo(r.id, e.target.files[0]) }} style={{ fontSize: "11px", width: "100%" }} />
                      </div>
                    </div>
                    {uploadEnCours && <p style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>Upload en cours...</p>}
                    <button onClick={function() { sauvegarderRealisation(r.id) }} style={btnSave}>Sauvegarder</button>
                  </div>
                )
              })}
            </div>
          )}

{onglet === "services" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Nos Services</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "28px" }}>Modifiez chaque service puis cliquez Sauvegarder.</p>
              {services.map(function(s) {
                return (
                  <div key={s.id} style={cardVert}>
                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <div><label style={lbl}>ICONE</label><input type="text" value={s.ico || ""} onChange={function(e) { modifierService(s.id, "ico", e.target.value) }} style={inp} /></div>
                      <div><label style={lbl}>NOM DU SERVICE</label><input type="text" value={s.titre || ""} onChange={function(e) { modifierService(s.id, "titre", e.target.value) }} style={inp} /></div>
                      <div><label style={lbl}>ETIQUETTE</label><input type="text" value={s.tag || ""} onChange={function(e) { modifierService(s.id, "tag", e.target.value) }} style={inp} /></div>
                    </div>
                    <div style={{ marginBottom: "10px" }}><label style={lbl}>ACCROCHE</label><input type="text" value={s.accroche || ""} onChange={function(e) { modifierService(s.id, "accroche", e.target.value) }} style={inp} /></div>
                    <div style={{ marginBottom: "14px" }}><label style={lbl}>DESCRIPTION</label><textarea rows={3} value={s.description || ""} onChange={function(e) { modifierService(s.id, "description", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                    <button onClick={function() { sauvegarderService(s.id) }} style={btnSave}>Sauvegarder</button>
                    <button onClick={function() { supprimerService(s.id) }} style={btnSuppr}>Supprimer</button>
                  </div>
                )
              })}
              <div style={cardOr}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "14px" }}>Ajouter un service</h3>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div><label style={lbl}>ICONE</label><input type="text" value={nouveauService.ico} onChange={function(e) { setNouveauService(function(p) { return Object.assign({}, p, { ico: e.target.value }) }) }} placeholder="🔧" style={inp} /></div>
                  <div><label style={lbl}>NOM</label><input type="text" value={nouveauService.titre} onChange={function(e) { setNouveauService(function(p) { return Object.assign({}, p, { titre: e.target.value }) }) }} placeholder="Ex: Desinsectisation" style={inp} /></div>
                  <div><label style={lbl}>ETIQUETTE</label><input type="text" value={nouveauService.tag} onChange={function(e) { setNouveauService(function(p) { return Object.assign({}, p, { tag: e.target.value }) }) }} placeholder="Ex: Devis gratuit 24h" style={inp} /></div>
                </div>
                <div style={{ marginBottom: "10px" }}><label style={lbl}>ACCROCHE</label><input type="text" value={nouveauService.accroche} onChange={function(e) { setNouveauService(function(p) { return Object.assign({}, p, { accroche: e.target.value }) }) }} placeholder="Ex: Cafards · Fourmis" style={inp} /></div>
                <div style={{ marginBottom: "14px" }}><label style={lbl}>DESCRIPTION</label><textarea rows={3} value={nouveauService.description} onChange={function(e) { setNouveauService(function(p) { return Object.assign({}, p, { description: e.target.value }) }) }} style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                <button onClick={ajouterService} style={btnAjouter}>Ajouter ce service</button>
              </div>
            </div>
          )}

{onglet === "equipe" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>Notre equipe</h2>
              {equipe.map(function(m) {
                return (
                  <div key={m.id} style={cardVert}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <div><label style={lbl}>INITIALES</label><input type="text" value={m.init || ""} onChange={function(e) { modifierMembre(m.id, "init", e.target.value) }} style={inp} /></div>
                      <div><label style={lbl}>NOM COMPLET</label><input type="text" value={m.nom || ""} onChange={function(e) { modifierMembre(m.id, "nom", e.target.value) }} style={inp} /></div>
                    </div>
                    <div style={{ marginBottom: "10px" }}><label style={lbl}>POSTE</label><input type="text" value={m.role || ""} onChange={function(e) { modifierMembre(m.id, "role", e.target.value) }} style={inp} /></div>
                    <div style={{ marginBottom: "14px" }}><label style={lbl}>DESCRIPTION</label><textarea rows={3} value={m.description || ""} onChange={function(e) { modifierMembre(m.id, "description", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                    <button onClick={function() { sauvegarderMembre(m.id) }} style={btnSave}>Sauvegarder</button>
                    <button onClick={function() { supprimerMembre(m.id) }} style={btnSuppr}>Supprimer</button>
                  </div>
                )
              })}
              <div style={cardOr}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "14px" }}>Ajouter un membre</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div><label style={lbl}>INITIALES</label><input type="text" value={nouveauMembre.init} onChange={function(e) { setNouveauMembre(function(p) { return Object.assign({}, p, { init: e.target.value }) }) }} placeholder="Ex: YK" style={inp} /></div>
                  <div><label style={lbl}>NOM COMPLET</label><input type="text" value={nouveauMembre.nom} onChange={function(e) { setNouveauMembre(function(p) { return Object.assign({}, p, { nom: e.target.value }) }) }} placeholder="Ex: Yakoubou Kabir" style={inp} /></div>
                </div>
                <div style={{ marginBottom: "10px" }}><label style={lbl}>POSTE</label><input type="text" value={nouveauMembre.role} onChange={function(e) { setNouveauMembre(function(p) { return Object.assign({}, p, { role: e.target.value }) }) }} placeholder="Ex: Directeur General" style={inp} /></div>
                <div style={{ marginBottom: "14px" }}><label style={lbl}>DESCRIPTION</label><textarea rows={3} value={nouveauMembre.description} onChange={function(e) { setNouveauMembre(function(p) { return Object.assign({}, p, { description: e.target.value }) }) }} style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                <button onClick={ajouterMembre} style={btnAjouter}>Ajouter ce membre</button>
              </div>
            </div>
          )}

          {onglet === "crm" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>CRM — Clients & Devis</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "28px" }}>Pipeline commercial, devis, clients, finances et paiements FedaPay.</p>
              <SectionClientsDevis db={supabase} agrement={parametres.agrement || ""} vueInitiale="devis" />
            </div>
          )}

          {onglet === "rh" && (
            <div style={{ margin: "-32px" }}>
              <iframe
                src="/api/rh-frame"
                title="Équipe & Planning GSE"
                style={{ width: "100%", height: "calc(100vh - 64px)", border: "none", display: "block" }}
              />
            </div>
          )}

          {onglet === "acces" && currentUser?.role === "admin" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "4px" }}>🔐 Accès utilisateurs</h2>
                  <p style={{ fontSize: "13px", color: "#888" }}>Gérez les comptes autorisés à se connecter au back-office.</p>
                </div>
                <button onClick={chargerAdminData} style={{ background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>↻ Actualiser</button>
              </div>

              {/* Liste des utilisateurs */}
              <div style={{ marginBottom: "32px" }}>
                {adminUsers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px", backgroundColor: "#f8f7f4", borderRadius: "12px", color: "#888", fontSize: "13px" }}>Aucun utilisateur trouvé.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {adminUsers.map(function(u) {
                      return (
                        <div key={u.id} style={{ backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "2px" }}>{u.nom}</div>
                            <div style={{ fontSize: "12px", color: "#888" }}>{u.email}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", backgroundColor: u.role === "admin" ? "#f0fdf4" : "#f8f7f4", color: u.role === "admin" ? "#1a6b38" : "#666", border: "1px solid " + (u.role === "admin" ? "#bbf7d0" : "#e0ddd6"), borderRadius: "20px", padding: "3px 10px" }}>
                              {u.role === "admin" ? "Admin" : "Lecture"}
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: "700", backgroundColor: u.actif ? "#fff" : "#fef2f2", color: u.actif ? "#1a6b38" : "#991b1b", border: "1px solid " + (u.actif ? "#bbf7d0" : "#fecaca"), borderRadius: "20px", padding: "3px 10px" }}>
                              {u.actif ? "Actif" : "Désactivé"}
                            </span>
                            {u.email !== currentUser?.email && (
                              <button onClick={async function() {
                                if (!confirm("Désactiver / réactiver cet utilisateur ?")) return
                                await fetch("/api/admin-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_user", email: u.email, nom: u.nom, role: u.role, actif: !u.actif }) })
                                chargerAdminData()
                              }} style={{ background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                                {u.actif ? "Désactiver" : "Réactiver"}
                              </button>
                            )}
                            {u.email !== currentUser?.email && (
                              <button onClick={async function() {
                                if (!confirm("Supprimer définitivement " + u.nom + " ?")) return
                                await fetch("/api/admin-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_user", email: u.email }) })
                                chargerAdminData()
                              }} style={{ background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                                🗑
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Formulaire ajout utilisateur */}
              <div style={{ backgroundColor: "#f8f7f4", border: "1px solid #e8e6e0", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Ajouter un utilisateur</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={lbl}>NOM COMPLET</label>
                    <input type="text" value={formAcces.nom} onChange={function(e) { setFormAcces(function(p) { return Object.assign({}, p, { nom: e.target.value }) }) }} placeholder="Ex: Marie Dupont" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>ADRESSE EMAIL</label>
                    <input type="email" value={formAcces.email} onChange={function(e) { setFormAcces(function(p) { return Object.assign({}, p, { email: e.target.value }) }) }} placeholder="marie@gse.bj" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>MOT DE PASSE TEMPORAIRE</label>
                    <input type="password" value={formAcces.password} onChange={function(e) { setFormAcces(function(p) { return Object.assign({}, p, { password: e.target.value }) }) }} placeholder="Min. 6 caractères" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>RÔLE</label>
                    <select value={formAcces.role} onChange={function(e) { setFormAcces(function(p) { return Object.assign({}, p, { role: e.target.value }) }) }} style={Object.assign({}, inp, { cursor: "pointer" })}>
                      <option value="lecture">Lecture seule</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                </div>
                {accesSaveMsg && <p style={{ fontSize: "12px", color: accesSaveMsg.includes("ajouté") ? "#1a6b38" : "#991b1b", marginBottom: "10px" }}>{accesSaveMsg}</p>}
                <button onClick={async function() {
                  if (!formAcces.email || !formAcces.nom || !formAcces.password) { setAccesSaveMsg("Tous les champs sont requis."); return }
                  setAccesSaving(true); setAccesSaveMsg("")
                  try {
                    const res = await fetch("/api/admin-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_user", email: formAcces.email, nom: formAcces.nom, password: formAcces.password, role: formAcces.role }) })
                    const d = await res.json()
                    if (d.ok) {
                      setAccesSaveMsg("Utilisateur ajouté avec succès.")
                      setFormAcces({ email: "", nom: "", role: "lecture", password: "" })
                      chargerAdminData()
                    } else {
                      setAccesSaveMsg(d.error || "Erreur lors de la création.")
                    }
                  } catch(e) { setAccesSaveMsg("Erreur réseau.") }
                  setAccesSaving(false)
                }} disabled={accesSaving} style={{ backgroundColor: "#0a2e1a", color: "#d4a920", border: "none", borderRadius: "6px", padding: "10px 20px", fontSize: "13px", fontWeight: "700", cursor: accesSaving ? "wait" : "pointer", fontFamily: "inherit", opacity: accesSaving ? 0.7 : 1 }}>
                  {accesSaving ? "Création..." : "Créer l'utilisateur"}
                </button>
              </div>
            </div>
          )}

          {onglet === "journal" && currentUser?.role === "admin" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "4px" }}>📋 Journal d'activité</h2>
                  <p style={{ fontSize: "13px", color: "#888" }}>Historique des 100 dernières actions effectuées dans le back-office.</p>
                </div>
                <button onClick={chargerAdminData} style={{ background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>↻ Actualiser</button>
              </div>

              {journalEntries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", backgroundColor: "#f8f7f4", borderRadius: "12px", color: "#888" }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>📋</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Aucune activité enregistrée</div>
                  <div style={{ fontSize: "13px" }}>Les actions des administrateurs apparaîtront ici.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {journalEntries.map(function(entry) {
                    var date = new Date(entry.created_at)
                    var dateStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
                    var heureStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                    return (
                      <div key={entry.id} style={{ backgroundColor: "#fff", border: "1px solid #f0ede6", borderRadius: "8px", padding: "12px 16px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <div style={{ flexShrink: 0, textAlign: "right", minWidth: "80px" }}>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: "#555" }}>{dateStr}</div>
                          <div style={{ fontSize: "11px", color: "#aaa" }}>{heureStr}</div>
                        </div>
                        <div style={{ flex: 1, borderLeft: "2px solid #e8e6e0", paddingLeft: "14px" }}>
                          <div style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "2px" }}>{entry.action}</div>
                          {entry.details && <div style={{ fontSize: "12px", color: "#666" }}>{entry.details}</div>}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <span style={{ fontSize: "11px", backgroundColor: "#f0f8f3", color: "#1a6b38", border: "1px solid #bbf7d0", borderRadius: "20px", padding: "2px 8px" }}>{entry.user_nom || entry.user_email}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {onglet === "stock" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "4px" }}>📦 Stock produits</h2>
                  <p style={{ fontSize: "13px", color: "#888" }}>Suivi des niveaux de stock. Les achats continuent de s'enregistrer dans les dépenses comme avant.</p>
                </div>
                <button onClick={ouvrirAjoutStock} style={{ backgroundColor: "#0a2e1a", color: "#d4a920", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>+ Nouveau produit</button>
              </div>

              {stockProduits.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", backgroundColor: "#f8f7f4", borderRadius: "12px", color: "#888" }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>📦</div>
                  <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>Aucun produit en stock</div>
                  <div style={{ fontSize: "13px" }}>Cliquez sur "+ Nouveau produit" pour commencer</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {stockProduits.map(function(p) {
                    var qte = parseFloat(p.quantite) || 0
                    var seuil = parseFloat(p.seuil_alerte) || 0
                    var statut = qte === 0 ? "rupture" : (seuil > 0 && qte <= seuil ? "bas" : "ok")
                    var couleurStatut = statut === "ok" ? "#1a6b38" : statut === "bas" ? "#b45309" : "#991b1b"
                    var bgStatut = statut === "ok" ? "#f0fdf4" : statut === "bas" ? "#fffbeb" : "#fef2f2"
                    var borderStatut = statut === "ok" ? "#bbf7d0" : statut === "bas" ? "#fde68a" : "#fecaca"
                    var labelStatut = statut === "ok" ? "✅ Stock OK" : statut === "bas" ? "⚠️ Stock bas" : "🚨 Rupture"

                    // Placements chez clients : regrouper les sorties par client
                    var placementsMap = {}
                    stockMouvements.filter(function(mv) {
                      return mv.produit_id === p.id && mv.type === 'sortie' && mv.client_id && mv.clients
                    }).forEach(function(mv) {
                      var cid = mv.client_id
                      var nom = [mv.clients.prenom, mv.clients.nom].filter(Boolean).join(' ') || mv.clients.entreprise || 'Client'
                      if (!placementsMap[cid]) placementsMap[cid] = { nom: nom, qte: 0 }
                      placementsMap[cid].qte += parseFloat(mv.quantite) || 0
                    })
                    var placements = Object.values(placementsMap).filter(function(pl) { return pl.qte > 0 }).sort(function(a,b){ return b.qte - a.qte })

                    return (
                      <div key={p.id} style={{ backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                          <div style={{ fontSize: "15px", fontWeight: "700", color: "#0a2e1a" }}>{p.nom}</div>
                          <span style={{ fontSize: "10px", fontWeight: "700", backgroundColor: bgStatut, color: couleurStatut, border: "1px solid " + borderStatut, borderRadius: "20px", padding: "3px 9px" }}>{labelStatut}</span>
                        </div>

                        <div style={{ textAlign: "center", padding: "16px 0", borderTop: "1px solid #f0ede6", borderBottom: "1px solid #f0ede6", marginBottom: "16px" }}>
                          <div style={{ fontSize: "36px", fontWeight: "800", color: couleurStatut, lineHeight: 1 }}>{qte % 1 === 0 ? qte : qte.toFixed(2)}</div>
                          <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{p.unite}</div>
                          {seuil > 0 && <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>seuil : {seuil} {p.unite}</div>}
                        </div>

                        {placements.length > 0 && (
                          <div style={{ backgroundColor: "#f8f7f4", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px" }}>
                            <div style={{ fontSize: "10px", fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: "8px" }}>📍 Chez les clients</div>
                            {placements.map(function(pl, idx) {
                              return (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#444", marginBottom: idx < placements.length - 1 ? "5px" : 0 }}>
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{pl.nom}</span>
                                  <span style={{ fontWeight: "700", color: "#0a2e1a", whiteSpace: "nowrap" }}>{pl.qte % 1 === 0 ? pl.qte : pl.qte.toFixed(2)} {p.unite}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                          <button onClick={function() { ouvrirMouvementStock(p, "entree") }} style={{ flex: 1, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#1a6b38", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>➕ Entrée</button>
                          <button onClick={function() { ouvrirMouvementStock(p, "sortie") }} style={{ flex: 1, backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>➖ Sortie</button>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={function() { ouvrirEditStock(p) }} style={{ flex: 1, background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "7px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>✏️ Modifier</button>
                          <button onClick={function() { supprimerStockProduit(p.id) }} style={{ background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "7px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}

// ══════════════════════════════════════════════════
// COMPOSANT SECTION CLIENTS & DEVIS — VERSION COMPLÈTE
// ══════════════════════════════════════════════════
function SectionClientsDevis({ db, agrement, vueInitiale }) {
  const COMMISSION_FEDAPAY = 0.0185
  const [vue, setVue] = React.useState(vueInitiale || "devis")
  const [devisList, setDevisList] = React.useState([])
  const [clients, setClients] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [msg, setMsg] = React.useState("")
  const [filtre, setFiltre] = React.useState("tous")

  const [validating, setValidating] = React.useState(null)
  const [certModal, setCertModal] = React.useState(null)
  const [certForm, setCertForm] = React.useState({})
  const [certSaving, setCertSaving] = React.useState(false)
  const [ficheModal, setFicheModal] = React.useState(null)
  const [ficheForm, setFicheForm] = React.useState({})
  const [savingFiche, setSavingFiche] = React.useState(false)
  const [certsList, setCertsList] = React.useState([])
  const [fichesList, setFichesList] = React.useState([])
  const [contratsList, setContratsList] = React.useState([])
  const [rapportsVisite, setRapportsVisite] = React.useState([])
  const [rapportsInterv, setRapportsInterv] = React.useState([])
  const [rapportVisiteModal, setRapportVisiteModal] = React.useState(null)
  const [rapportVisiteForm, setRapportVisiteForm] = React.useState({})
  const [savingRapportVisite, setSavingRapportVisite] = React.useState(false)
  const [uploadingPhotoVisite, setUploadingPhotoVisite] = React.useState(false)
  const [audiosVisite, setAudiosVisite] = React.useState([])
  const [uploadingAudioVisite, setUploadingAudioVisite] = React.useState(false)
  const [rapportIntervModal, setRapportIntervModal] = React.useState(null)
  const [rapportIntervForm, setRapportIntervForm] = React.useState({})
  const [savingRapportInterv, setSavingRapportInterv] = React.useState(false)
  const [uploadingPhotoInterv, setUploadingPhotoInterv] = React.useState(false)
  const [audiosInterv, setAudiosInterv] = React.useState([])
  const [uploadingAudioInterv, setUploadingAudioInterv] = React.useState(false)
  const [extractingFramesVisite, setExtractingFramesVisite] = React.useState(null)
  const [extractingFramesInterv, setExtractingFramesInterv] = React.useState(null)
  const [generatingRapportVisite, setGeneratingRapportVisite] = React.useState(false)
  const [rapportVisitePhase, setRapportVisitePhase] = React.useState('saisie')
  const [rapportVisiteErreurIA, setRapportVisiteErreurIA] = React.useState(null)
  const [generatingRapportInterv, setGeneratingRapportInterv] = React.useState(false)
  const [rapportIntervPhase, setRapportIntervPhase] = React.useState('saisie')
  const [rapportIntervErreurIA, setRapportIntervErreurIA] = React.useState(null)
  const [interventionsList, setInterventionsList] = React.useState([])
  const [personnelAdmin, setPersonnelAdmin] = React.useState([])
  const [meteoData, setMeteoData] = React.useState(null)
  const [loadingMeteo, setLoadingMeteo] = React.useState(false)
  const [filtreDoc, setFiltreDoc] = React.useState("tous")
  const [contratModal, setContratModal] = React.useState(null)
  const [contratForm, setContratForm] = React.useState({ typeEtablissement: "", demandeClient: "trimestriel sur un an", notes: "" })
  const [contratAnalyse, setContratAnalyse] = React.useState(null)
  const [contratRapport, setContratRapport] = React.useState(null)
  const [offreChoisie, setOffreChoisie] = React.useState(null)
  const [signForm, setSignForm] = React.useState({})
  const [signEnCours, setSignEnCours] = React.useState(null)
  const [contratQuestions, setContratQuestions] = React.useState(null)
  const [contratReponses, setContratReponses] = React.useState({})
  const [finData, setFinData] = React.useState(null)
  const [finLoading, setFinLoading] = React.useState(false)
  const [depModal, setDepModal] = React.useState(false)
  const [depForm, setDepForm] = React.useState({ categorie: "autre", libelle: "", montant: "", date: "" })
  const [depSaving, setDepSaving] = React.useState(false)
  const [objectifCA, setObjectifCA] = React.useState(0)
  const [objModal, setObjModal] = React.useState(false)
  const [objInput, setObjInput] = React.useState("")
  const [objSaving, setObjSaving] = React.useState(false)
  React.useEffect(function() {
    if ((vue === "finances" || vue === "analyse" || vue === "pipeline") && !finData && !finLoading) chargerFinances()
  }, [vue])
  React.useEffect(function() {
    db.from("parametres").select("valeur").eq("cle", "objectif_ca").maybeSingle().then(function(res) {
      if (res && res.data && res.data.valeur) setObjectifCA(parseFloat(res.data.valeur) || 0)
    }).catch(function() {})
  }, [])
  const [analysingContrat, setAnalysingContrat] = React.useState(false)
  const [contratErreur, setContratErreur] = React.useState(null)
  const [editingDevis, setEditingDevis] = React.useState(null)
  const [showNouveauDevis, setShowNouveauDevis] = React.useState(false)
  const [nouveauDevisPresta, setNouveauDevisPresta] = React.useState([])
  const COND_PAIEMENT_DEFAUT = "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention."
  const [formDevis, setFormDevis] = React.useState({ clientId: "", prenom: "", nom: "", email: "", telephone: "", entreprise: "", prestation: "", prestations: [], lignes: [{ prestation: "", secteur: "", superficie: "", prixM2: "" }], superficie: "", prixM2: "", prixParPrestation: {}, superficieParPrestation: {}, description: "", montantBrut: "", remise: "", remiseType: "pct", modeTransmission: "email", pctAcompte: "60", conditionsPaiement: "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention." })
  const [showFormClient, setShowFormClient] = React.useState(false)
  const [editingClient, setEditingClient] = React.useState(null)
  const [submittingClient, setSubmittingClient] = React.useState(false)
  const [clientDetail, setClientDetail] = React.useState(null)
  const [formClient, setFormClient] = React.useState({ prenom: "", nom: "", email: "", telephone: "", entreprise: "", adresse: "" })
  const [pipelineExpanded, setPipelineExpanded] = React.useState(null)
  const [leads, setLeads] = React.useState([])
  const [leadsTraites, setLeadsTraites] = React.useState([])
  const [showTraites, setShowTraites] = React.useState(false)
  const [leadEnConversion, setLeadEnConversion] = React.useState(null)

  const STATUTS = {
    brouillon: { label: "Brouillon", c: "#92400e", bg: "#fef3c7" },
    envoye: { label: "Envoyé", c: "#1e40af", bg: "#dbeafe" },
    accepte: { label: "Accepté", c: "#065f46", bg: "#d1fae5" },
    modification_demandee: { label: "Modif. demandée", c: "#7c3aed", bg: "#ede9fe" },
    en_cours: { label: "En cours", c: "#0f766e", bg: "#ccfbf1" },
    termine: { label: "Terminé", c: "#1f2937", bg: "#f3f4f6" },
    annule: { label: "Annulé", c: "#991b1b", bg: "#fee2e2" }
  }
  const PRESTATIONS = ["Désinsectisation", "Dératisation", "Désinfection", "Anti-termites", "Anti-moustiques", "Punaises de lit", "Reptiles et Serpents", "Contrat d'entretien"]

  function ligneVide() { return { prestation: "", secteur: "", superficie: "", prixM2: "" } }

  function montantLigne(l) {
    var s = parseFloat(l.superficie) || 0
    var p = parseFloat(l.prixM2) || 0
    return (s && p) ? Math.round(s * p) : 0
  }

  // Rétrocompat : reconstruit les lignes d'un devis. Si d.lignes existe → l'utilise ;
  // sinon reconstruit depuis l'ancien format (prestation + maps par prestation).
  function lignesFromDevis(d) {
    if (Array.isArray(d.lignes) && d.lignes.length > 0) {
      return d.lignes.map(function(l) {
        return { prestation: l.prestation || "", secteur: l.secteur || "", superficie: l.superficie != null ? String(l.superficie) : "", prixM2: l.prix_m2 != null ? String(l.prix_m2) : "" }
      })
    }
    var ppp = d.prix_par_prestation || d.prixParPrestation || {}
    var spp = d.superficie_par_prestation || d.superficieParPrestation || {}
    var types = d.prestation ? String(d.prestation).split(" + ").map(function(p) { return p.trim() }).filter(Boolean) : []
    if (types.length === 0) return [ligneVide()]
    return types.map(function(p) {
      return { prestation: p, secteur: "", superficie: spp[p] != null ? String(spp[p]) : "", prixM2: ppp[p] != null ? String(ppp[p]) : "" }
    })
  }

  function resumePrestations(lignes) {
    var seen = []
    ;(lignes || []).forEach(function(l) { if (l.prestation && seen.indexOf(l.prestation) === -1) seen.push(l.prestation) })
    return seen.join(" + ")
  }

  function totalLignes(lignes) {
    return (lignes || []).reduce(function(s, x) { return s + montantLigne(x) }, 0)
  }

  // Prix de base d'un devis. Dès qu'il y a des lignes chiffrées, ELLES font foi :
  // `montantBrut` n'est qu'une saisie manuelle de secours (aucune ligne chiffrée).
  // Sans cette règle, `montantBrut` pouvait rester figé sur une ancienne valeur
  // (ex. le montant net d'une version précédente du devis, chargé par
  // ouvrirEditionDevis) pendant que les lignes affichaient un autre total : le
  // client était facturé sur l'ancien montant, plus bas que les prestations.
  function baseDevis(form) {
    var t = totalLignes(form.lignes)
    return t > 0 ? t : (parseFloat(form.montantBrut) || 0)
  }

  // ── Pipeline : parcours client piloté par le champ `devis.etape` ───────────
  var ETAPES = [
    { id: "prospect",     label: "📞 Prospect",     lane: "commercial" },
    { id: "devis",        label: "📄 Devis envoyé", lane: "commercial" },
    { id: "relance",      label: "🔔 Relance",      lane: "commercial" },
    { id: "converti",     label: "✅ Converti",      lane: "commercial" },
    { id: "visite",       label: "🔍 Visite",       lane: "execution" },
    { id: "intervention", label: "🔧 Intervention", lane: "execution" },
    { id: "certificat",   label: "📋 Certificat",   lane: "execution" },
    { id: "encaissement", label: "💳 Encaissement", lane: "execution" },
    { id: "cloture",      label: "🏁 Clôturé",      lane: "execution" }
  ]
  var ETAPE_IDS = ETAPES.map(function(x) { return x.id })
  var ETAPE_PERDU = { id: "perdu", label: "❌ Perdu" }
  var ETAPE_LABEL = {}
  ETAPES.concat([ETAPE_PERDU]).forEach(function(e) { ETAPE_LABEL[e.id] = e.label })
  var ETAPE_CRM = { prospect: "contact", devis: "devis", relance: "relance", converti: "converti", visite: "converti", intervention: "converti", certificat: "converti", encaissement: "converti", cloture: "converti", perdu: "echec" }
  var PROCHAINE_ETAPE = { prospect: "devis", devis: "converti", relance: "converti", converti: "visite", visite: "intervention", intervention: "certificat", certificat: "encaissement", encaissement: "cloture" }

  // Filet : étape par défaut d'un devis sans `etape` stocké (rétrocompat).
  function etapeParDefaut(crmStatut) {
    if (crmStatut === "echec") return "perdu"
    if (crmStatut === "devis") return "devis"
    if (crmStatut === "attente" || crmStatut === "relance") return "relance"
    if (crmStatut === "converti" || crmStatut === "termine") return "converti"
    return "prospect"
  }

  // Étape déduite d'un parcours d'exécution (utilisée par saveParcours).
  // Le mapping suit l'ancienne logique colUnifiee (facture.done → intervention).
  function etapeFromParcours(parcours) {
    var p = parcours || {}
    if (p.encaissement && p.encaissement.done) return "cloture"
    if (p.intervention && p.intervention.done) return "certificat"
    if (p.facture && p.facture.done) return "intervention"
    if (p.visite && p.visite.done) return "visite"
    return null
  }

  // Parcours cumulé cohérent pour une étape d'exécution (déplacement manuel).
  // Seul `encaissement.done` (= payé) est critique : lu par les Finances.
  function parcoursForEtape(etape) {
    var idx = ETAPE_IDS.indexOf(etape)
    var p = {}
    if (idx >= 4) p.visite = { done: true }
    if (idx >= 5) p.facture = { done: true }
    if (idx >= 6) p.intervention = { done: true }
    if (idx >= 8) p.encaissement = { done: true, date: new Date().toISOString().split("T")[0] }
    return p
  }

  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "6px", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box" }
  const lbl = { display: "block", fontSize: "11px", fontWeight: "700", color: "#888", marginBottom: "6px", textTransform: "uppercase" }

  React.useEffect(function() { charger() }, [])

  async function charger() {
    setLoading(true)
    const [{ data: devis }, { data: cls }, { data: certs }, { data: fiches }, { data: rVisite }, { data: rInterv }, { data: intervs }, { data: contrats }, { data: perso }] = await Promise.all([
      db.from("devis").select("*, clients(id, nom, prenom, entreprise, email, telephone)").order("created_at", { ascending: false }),
      Promise.resolve({ data: [] }),
      db.from("certificats").select("*").order("created_at", { ascending: false }),
      db.from("fiches_passage").select("*").order("created_at", { ascending: false }),
      db.from("rapports_visite").select("*").order("created_at", { ascending: false }),
      db.from("rapports_intervention").select("*").order("created_at", { ascending: false }),
      db.from("interventions").select("*, personnel(id,nom,prenom)").order("date_intervention"),
      db.from("contrats").select("*").order("created_at", { ascending: false }),
      db.from("personnel").select("id, nom, prenom, poste").order("nom"),
    ])
    setDevisList(devis || [])
    setClients(cls || [])
    setCertsList(certs || [])
    setFichesList(fiches || [])
    setRapportsVisite(rVisite || [])
    setRapportsInterv(rInterv || [])
    setInterventionsList(intervs || [])
    setContratsList(contrats || [])
    setPersonnelAdmin((perso || []).map(function(p) { return { id: p.id, nom: [p.prenom, p.nom].filter(Boolean).join(' '), poste: p.poste || '' } }))
    setLoading(false)
    db.auth.getSession().then(function(res) {
      var token = (res.data.session && res.data.session.access_token) || ''
      return Promise.all([
        fetch("/api/crm-data?action=get_leads", { headers: { "Authorization": "Bearer " + token } }).then(function(r) { return r.json() }),
        fetch("/api/crm-data?action=get_clients", { headers: { "Authorization": "Bearer " + token } }).then(function(r) { return r.json() }),
      ])
    }).then(function(results) {
      setLeads(results[0].leads || [])
      setClients(results[1].clients || [])
    }).catch(function() {})
  }

  async function saveParcours(devisId, newParcours) {
    // Si l'étape « Encaissement » vient de basculer, refléter le paiement dans les Finances :
    // encaissement fait → paiements_recus = montant facturé ; annulé → 0.
    var d = devisList.find(function(x) { return x.id === devisId }) || {}
    var wasEncaisse = !!(d.parcours && d.parcours.encaissement && d.parcours.encaissement.done)
    var nowEncaisse = !!(newParcours.encaissement && newParcours.encaissement.done)
    // Avancement d'exécution → l'étape suit le parcours (source de vérité pipeline).
    // Parcours vidé en contexte Dossier = retour à « converti » (exécution démarrée).
    var etapeDerivee = etapeFromParcours(newParcours) || "converti"
    var update = { parcours: newParcours, etape: etapeDerivee }
    var paiementChange
    if (nowEncaisse !== wasEncaisse) {
      paiementChange = nowEncaisse ? (d.montant_facture_crm || d.montant_net || 0) : 0
      update.paiements_recus = paiementChange
    }
    await db.from('devis').update(update).eq('id', devisId)
    setDevisList(function(prev) {
      return prev.map(function(x) { return x.id === devisId ? Object.assign({}, x, { parcours: newParcours, etape: etapeDerivee }, paiementChange !== undefined ? { paiements_recus: paiementChange } : {}) : x })
    })
    // Reflet immédiat de l'encaissement dans les données Finances/Analyse (aplati), sans rechargement
    if (paiementChange !== undefined) {
      setFinData(function(prev) {
        if (!prev) return prev
        return Object.assign({}, prev, { clients: (prev.clients || []).map(function(x) { return x.id === devisId ? Object.assign({}, x, { paiementsRecus: paiementChange }) : x }) })
      })
    }
  }

  // Avance l'étape d'un devis SEULEMENT vers l'avant (jamais reculer), en
  // fusionnant le parcours. Appelé quand un vrai document est créé (certificat,
  // fiche) pour que le pipeline reflète le travail réalisé.
  async function avancerEtapeMin(devisId, cibleEtape) {
    var d = devisList.find(function(x) { return x.id === devisId })
    if (!d) return
    var actuelle = d.etape || "prospect"
    if (ETAPE_IDS.indexOf(cibleEtape) <= ETAPE_IDS.indexOf(actuelle)) return
    var parcours = Object.assign({}, d.parcours || {}, parcoursForEtape(cibleEtape))
    await db.from("devis").update({ etape: cibleEtape, parcours: parcours, crm_statut: ETAPE_CRM[cibleEtape] || "converti" }).eq("id", devisId)
    setDevisList(function(prev) { return prev.map(function(x) { return x.id === devisId ? Object.assign({}, x, { etape: cibleEtape, parcours: parcours }) : x }) })
  }

  function ouvrirAjoutClient() {
    setEditingClient(null)
    setLeadEnConversion(null)
    setFormClient({ prenom: "", nom: "", email: "", telephone: "", entreprise: "", adresse: "" })
    setShowFormClient(true)
    setMsg("")
  }

  function ouvrirEditionClient(c) {
    setEditingClient(c)
    setFormClient({ prenom: c.prenom || "", nom: c.nom || "", email: c.email || "", telephone: c.telephone || "", entreprise: c.entreprise || "", adresse: c.adresse || "" })
    setShowFormClient(true)
    setMsg("")
  }

  async function sauvegarderClient() {
    if (!formClient.nom) { setMsg("Le nom est obligatoire."); return }
    setSubmittingClient(true); setMsg("")
    // Évite le "doublon" d'affichage : si l'entreprise est identique au nom, on la
    // vide — sinon le rendu « nom — entreprise » affiche deux fois la même valeur.
    var entRedondante = (formClient.entreprise || "").trim().toLowerCase() === (formClient.nom || "").trim().toLowerCase()
    var formClientNorm = Object.assign({}, formClient, { entreprise: entRedondante ? "" : formClient.entreprise })
    if (editingClient) {
      const { error } = await db.from("clients").update(formClientNorm).eq("id", editingClient.id)
      if (error) { setMsg("Erreur: " + error.message); setSubmittingClient(false); return }
      setMsg("✓ Client mis à jour")
      setShowFormClient(false); setEditingClient(null)
      var editedId = editingClient.id
      await charger()
      if (clientDetail && clientDetail.id === editedId) {
        setClientDetail(function(prev) { return Object.assign({}, prev, formClientNorm) })
      }
      setSubmittingClient(false)
    } else {
      try {
        var leadDescription = null
        if (leadEnConversion) {
          var parts = []
          if (leadEnConversion.nuisible) parts.push("Nuisible : " + leadEnConversion.nuisible)
          if (leadEnConversion.message) parts.push(leadEnConversion.message)
          leadDescription = parts.join("\n") || null
        }
        const res = await fetch("/api/create-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.assign({}, formClientNorm, { leadDescription: leadDescription }))
        })
        const data = await res.json()
        if (!res.ok) { setMsg("Erreur: " + (data.error || "Échec")); setSubmittingClient(false); return }
        setMsg("✓ " + data.message)
        setShowFormClient(false)
        if (leadEnConversion) {
          var convLead = leadEnConversion
          try {
            var s2 = await db.auth.getSession()
            var tok2 = (s2.data.session && s2.data.session.access_token) || ""
            await fetch("/api/crm-data", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + tok2 }, body: JSON.stringify({ action: "set_lead_traite", id: convLead.id, traite: true }) })
          } catch(e2) {}
          setLeads(function(prev) { return prev.filter(function(l) { return l.id !== convLead.id }) })
          setLeadEnConversion(null)
        }
        await charger(); setSubmittingClient(false)
      } catch(e) { setMsg("Erreur réseau: " + e.message); setSubmittingClient(false) }
    }
  }

  async function supprimerClient(c) {
    var nbDevis = devisList.filter(function(d) { return d.client_id === c.id }).length
    var msgConfirm = nbDevis > 0 ? "Ce client a " + nbDevis + " devis. Supprimer quand même ?" : "Supprimer " + (c.prenom || "") + " " + c.nom + " ?"
    if (!window.confirm(msgConfirm)) return
    await db.from("devis").delete().eq("client_id", c.id)
    await db.from("clients").delete().eq("id", c.id)
    setMsg("✓ Client supprimé")
    await charger()
  }

  function voirDevisClient(c) { setClientDetail(c); setVue("devis-client") }

  function ouvrirEditionDevis(d) {
    var cl = clients.find(function(c) { return c.id === d.client_id })
    // Le prix de base repart des lignes du devis. Reprendre `montant_net` (montant
    // APRÈS remise de la version précédente) comme base rendait la remise cumulative
    // à chaque réouverture, en plus de désynchroniser la base du total des lignes.
    var lignesD = lignesFromDevis(d)
    var baseD = totalLignes(lignesD)
    setEditingDevis(d)
    // Le formulaire d'édition n'est rendu que dans la vue "devis" (renderFormDevis
    // n'est appelé que par renderVueDevis). Sans ce setVue, un clic sur « Modifier
    // devis » depuis le tableau de bord client (vue "devis-client") ne montrait rien.
    setVue("devis")
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    setFormDevis({
      clientId: d.client_id || "",
      prenom: cl ? (cl.prenom || "") : "",
      nom: cl ? cl.nom : "",
      email: cl ? cl.email : "",
      telephone: cl ? (cl.telephone || "") : "",
      entreprise: cl ? (cl.entreprise || "") : "",
      prestation: d.prestation || "",
      prestations: d.prestation ? d.prestation.split(" + ").map(function(p) { return p.trim() }).filter(function(p) { return PRESTATIONS.includes(p) }) : [],
      lignes: lignesD,
      superficie: d.superficie ? String(d.superficie) : "",
      prixM2: d.prix_m2 ? String(d.prix_m2) : "",
      prixParPrestation: d.prix_par_prestation || {},
      superficieParPrestation: d.superficie_par_prestation || {},
      description: d.description || "",
      montantBrut: baseD > 0 ? String(baseD) : (d.montant_net || d.montant_total || ""),
      remise: d.remise_bienvenue ? String(d.remise_bienvenue) : "",
      remiseType: "pct",
      modeTransmission: "email",
      pctAcompte: d.pct_acompte ? String(d.pct_acompte) : "60",
      conditionsPaiement: d.conditions_paiement || "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention."
    })
    setMsg("")
  }

  async function creerNouveauDevisClient(cl) {
    if (nouveauDevisPresta.length === 0) { setMsg("Sélectionnez au moins une prestation."); return }
    // Création via l'API (service_role) : l'insert direct côté client sur devis (table RLS)
    // échouait silencieusement. Standard projet : toute écriture Supabase passe par l'API.
    try {
      var sess = await db.auth.getSession()
      var token = (sess.data.session && sess.data.session.access_token) || ""
      var res = await fetch("/api/crm-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ action: "add_devis", clientId: cl.id, prestations: nouveauDevisPresta })
      })
      var data = await res.json()
      if (!res.ok || !data.ok) { setMsg("Erreur : " + (data.error || "création du devis impossible")); return }
      setShowNouveauDevis(false)
      setNouveauDevisPresta([])
      await charger()
      ouvrirEditionDevis(data.devis)
      setVue("devis")
    } catch (e) {
      setMsg("Erreur réseau : " + e.message)
    }
  }

  async function creerDevis() {
    var lignesClean = (formDevis.lignes || [])
      .filter(function(l) { return l.prestation })
      .map(function(l) { return { prestation: l.prestation, secteur: (l.secteur || "").trim(), superficie: parseFloat(l.superficie) || 0, prix_m2: parseFloat(l.prixM2) || 0, montant: montantLigne(l) } })
    var prestationStr = resumePrestations(lignesClean)
    if ((!formDevis.clientId && !formDevis.nom) || !prestationStr || !formDevis.montantBrut) {
      setMsg("Remplissez tous les champs obligatoires."); return
    }
    if (lignesClean.filter(function(l) { return l.montant > 0 }).length === 0) { setMsg("Ajoutez au moins une ligne avec surface et prix."); return }
    setMsg("")

    var brut = baseDevis(formDevis)
    var remiseVal = formDevis.remise ? parseFloat(formDevis.remise) : 0
    var remiseMontant = formDevis.remiseType === "pct"
      ? Math.round(brut * remiseVal / 100)
      : Math.round(remiseVal)
    var montantNet = Math.max(0, brut - remiseMontant)
    var enLigne = formDevis.modeTransmission === "email"
    var montantClient = enLigne ? Math.round(montantNet * (1 + COMMISSION_FEDAPAY)) : Math.round(montantNet)
    var superficieVal = formDevis.superficie ? parseFloat(formDevis.superficie) : null
    var prixM2Val = formDevis.prixM2 ? parseFloat(formDevis.prixM2) : null

    // Le formulaire d'édition est très haut : une fois démonté (setEditingDevis(null)),
    // la page raccourcit brutalement et le navigateur garde le scroll → l'utilisateur
    // reste dans le vide sous le contenu (« page blanche »), sans voir le message de
    // confirmation ni la liste. On remonte donc en haut après chaque sauvegarde.
    var remonterEnHaut = function() {
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    }

    var viderForm = function() {
      setFormDevis({ clientId: "", prenom: "", nom: "", email: "", telephone: "", entreprise: "", prestation: "", prestations: [], lignes: [{ prestation: "", secteur: "", superficie: "", prixM2: "" }], superficie: "", prixM2: "", prixParPrestation: {}, superficieParPrestation: {}, description: "", montantBrut: "", remise: "", remiseType: "pct", modeTransmission: "email", pctAcompte: "60", conditionsPaiement: "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention." })
    }

    if (editingDevis) {
      var cl = clients.find(function(c) { return c.id === editingDevis.client_id })
      var { error } = await db.from("devis").update({
        prestation: prestationStr,
        description: formDevis.description,
        montant_total: montantClient,
        montant_net: montantNet,
        statut: "envoye",
        notes_modification: null,
        date_envoi: new Date().toISOString(),
        pct_acompte: parseInt(formDevis.pctAcompte) || 60,
        conditions_paiement: formDevis.conditionsPaiement || null,
        superficie: superficieVal,
        prix_m2: prixM2Val,
        lignes: lignesClean,
        prix_par_prestation: null,
        superficie_par_prestation: null,
        // Enregistrer/renvoyer un devis = étape « Devis envoyé », sans jamais faire
        // reculer une carte déjà convertie/en exécution.
        etape: (!editingDevis.etape || editingDevis.etape === "prospect") ? "devis" : editingDevis.etape
      }).eq("id", editingDevis.id)
      if (error) { setMsg("Erreur: " + error.message); return }
      if (enLigne && cl && cl.email) {
        try {
          await fetch("/api/send-devis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientEmail: cl.email, clientNom: cl.nom, clientPrenom: cl.prenom || "", devisNumero: editingDevis.numero, prestation: prestationStr, montant: montantClient, description: formDevis.description }) })
          setMsg("✓ Devis modifié et renvoyé à " + cl.email)
        } catch(e) { setMsg("✓ Devis modifié (email non envoyé)") }
      } else if (!enLigne) {
        setMsg("✓ Devis modifié")
        var imprimData = { numero: editingDevis.numero, clientNom: cl ? cl.nom : "", clientPrenom: cl ? (cl.prenom || "") : "", clientEmail: cl ? cl.email : "", clientTelephone: cl ? (cl.telephone || "") : "", clientEntreprise: cl ? (cl.entreprise || "") : "", prestation: prestationStr, lignes: lignesClean, description: formDevis.description, montantBrut: brut, remiseMontant: remiseMontant, remiseLabel: formDevis.remiseType === "pct" ? (remiseVal + "%") : (remiseMontant.toLocaleString("fr-FR") + " FCFA"), montantNet: montantNet, pctAcompte: parseInt(formDevis.pctAcompte) || 60, conditionsPaiement: formDevis.conditionsPaiement, agrement: agrement }
        imprimerDevis(imprimData)
      } else { setMsg("✓ Devis modifié") }
      setEditingDevis(null)
      viderForm()
      remonterEnHaut()
      await charger()
      return
    }
  }

  async function validerLivraison(id) {
    setValidating(id)
    await db.from("devis").update({ statut: "en_cours" }).eq("id", id)
    setMsg("✓ Livraison validée — le client peut payer le solde")
    await charger(); setValidating(null)
  }

  async function renvoyerEmail(d) {
    var cl = d.clients || clients.find(function(c) { return c.id === d.client_id })
    if (!cl || !cl.email) { setMsg("Ce client n'a pas d'email."); return }
    try {
      var res = await fetch("/api/send-devis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientEmail: cl.email, clientNom: cl.nom, clientPrenom: cl.prenom || "", devisNumero: d.numero, prestation: d.prestation, montant: d.montant_total, description: d.description || "" }) })
      var data = await res.json()
      if (data.success) { setMsg("✓ Email renvoyé à " + cl.email) }
      else { setMsg("Erreur: " + (data.error || "Échec envoi")) }
    } catch(e) { setMsg("Erreur réseau: " + e.message) }
  }

  async function supprimerDevis(id, numero) {
    if (!window.confirm("Supprimer le devis " + numero + " ?")) return
    await db.from("devis").delete().eq("id", id)
    setMsg("✓ Devis supprimé")
    await charger()
  }

  function openCertModal(type, d) {
    var cl = d.clients || clients.find(function(c) { return c.id === d.client_id })
    var now = new Date()
    var jour = String(now.getDate()).padStart(2, '0')
    var mois = String(now.getMonth() + 1).padStart(2, '0')
    setCertForm({
      ref: type === 'desinsect' ? '001/26' : type === 'double' ? '001-002/26' : '002/26',
      dateJour: jour,
      dateMois: mois,
      entreprise: (cl && cl.entreprise) ? cl.entreprise : [(cl && cl.prenom) || '', (cl && cl.nom) || ''].filter(Boolean).join(' '),
      ifu: '',
      rccm: '',
      locaux: d.description || '',
      situation: (d.lieu_intervention) || (cl && cl.adresse) || '',
      dateDebut: '',
      dateFin: '',
      matieres: (type === 'desinsect' || type === 'double') ? 'IMPERA 300 CS\nROCOGEL' : 'VERTOX',
      matieresDerat: type === 'double' ? 'VERTOX' : '',
    })
    setCertModal({ type: type, devis: d, cl: cl })
  }

  async function saveCertificat() {
    setCertSaving(true)
    var type = certModal.type
    var devisId = certModal.devis.id
    var clientId = certModal.devis.client_id
    var editingId = certModal.editingId || null
    var existingNumero = certModal.existingNumero || null
    var savedForm = Object.assign({}, certForm)
    try {
      if (editingId) {
        var { error: upErr } = await db.from('certificats').update({ form_data: savedForm }).eq('id', editingId)
        if (upErr) { setMsg('Erreur: ' + upErr.message); setCertSaving(false); return }
        setMsg('✓ Certificat ' + existingNumero + ' mis à jour')
      } else {
        var { data: numero } = await db.rpc('generate_certificat_numero', { cert_type: type })
        var certNumero = numero || ('CERT-' + type.toUpperCase() + '-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4))
        var { data: inserted, error: insErr } = await db.from('certificats').insert({ numero_unique: certNumero, devis_id: devisId, client_id: clientId, type: type, form_data: savedForm }).select().single()
        if (insErr) { setMsg('Erreur: ' + insErr.message); setCertSaving(false); return }
        setCertModal(function(prev) { return Object.assign({}, prev, { editingId: inserted.id, existingNumero: certNumero }) })
        setMsg('✓ Certificat ' + certNumero + ' sauvegardé')
        await avancerEtapeMin(devisId, 'certificat')
      }
      await charger()
    } catch(e) { setMsg('Erreur: ' + e.message) }
    setCertSaving(false)
  }

  function imprimerCertificat() {
    var html = buildCertificatHtml(certModal.type, certForm)
    ouvrirDocImprimable(html, 920, 1050)
  }

  async function genererCertificat() {
    await saveCertificat()
    imprimerCertificat()
  }

  function rouvrirCertModal(cert, devis, client) {
    var form = cert.form_data || {}
    setCertForm({
      ref: form.ref || '',
      dateJour: form.dateJour || '',
      dateMois: form.dateMois || '',
      entreprise: form.entreprise || (client && client.entreprise) || '',
      ifu: form.ifu || '',
      rccm: form.rccm || '',
      locaux: form.locaux || '',
      situation: form.situation || '',
      dateDebut: form.dateDebut || '',
      dateFin: form.dateFin || '',
      matieres: form.matieres || [form.matiere1, form.matiere2, form.matiere3].filter(Boolean).join('\n') || '',
      matieresDerat: form.matieresDerat || '',
    })
    setCertModal({ type: cert.type, devis: devis || { id: cert.devis_id, client_id: cert.client_id }, cl: client, editingId: cert.id, existingNumero: cert.numero_unique })
  }

  function renderCertModal() {
    if (!certModal) return null
    var type = certModal.type
    var title = type === 'desinsect' ? 'Certificat de Désinsectisation' : type === 'double' ? 'Certificat de Désinsectisation & Dératisation' : 'Certificat de Dératisation'
    var updateForm = function(field, val) {
      setCertForm(function(prev) { return Object.assign({}, prev, { [field]: val }) })
    }
    var inp2 = { width: '100%', padding: '8px 10px', border: '1.5px solid #e0ddd6', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
    var lbl2 = { display: 'block', fontSize: '10px', fontWeight: '700', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }
    return React.createElement('div', {
      style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px' },
      onClick: function(e) { if (e.target === e.currentTarget) setCertModal(null) }
    },
      React.createElement('div', { style: { backgroundColor: '#fff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '700px', marginTop: '20px' } },

        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
          React.createElement('div', null,
            React.createElement('h3', { style: { fontSize: '16px', fontWeight: '700', color: '#0a2e1a', margin: '0 0 4px' } }, '📋 ' + title),
            certModal.existingNumero && React.createElement('div', { style: { fontSize: '11px', color: '#065f46', backgroundColor: '#f0fdf4', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' } }, '✓ Sauvegardé : ' + certModal.existingNumero)
          ),
          React.createElement('button', { onClick: function() { setCertModal(null) }, style: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888', lineHeight: 1 } }, '×')
        ),

        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' } },
          React.createElement('div', null, React.createElement('label', { style: lbl2 }, 'Référence'), React.createElement('input', { value: certForm.ref || '', onChange: function(e) { updateForm('ref', e.target.value) }, style: inp2 })),
          React.createElement('div', null, React.createElement('label', { style: lbl2 }, 'Jour (certif.)'), React.createElement('input', { value: certForm.dateJour || '', onChange: function(e) { updateForm('dateJour', e.target.value) }, placeholder: '24', style: inp2 })),
          React.createElement('div', null, React.createElement('label', { style: lbl2 }, 'Mois (certif.)'), React.createElement('input', { value: certForm.dateMois || '', onChange: function(e) { updateForm('dateMois', e.target.value) }, placeholder: '05', style: inp2 }))
        ),

        React.createElement('div', { style: { backgroundColor: '#f8f7f4', borderRadius: '8px', padding: '16px', marginBottom: '16px' } },
          React.createElement('div', { style: { fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '12px', textTransform: 'uppercase' } }, 'Informations bénéficiaire'),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
            React.createElement('div', { style: { gridColumn: '1/-1' } }, React.createElement('label', { style: lbl2 }, 'Entreprise bénéficiaire'), React.createElement('input', { value: certForm.entreprise || '', onChange: function(e) { updateForm('entreprise', e.target.value) }, style: inp2 })),
            React.createElement('div', null, React.createElement('label', { style: lbl2 }, 'N° IFU'), React.createElement('input', { value: certForm.ifu || '', onChange: function(e) { updateForm('ifu', e.target.value) }, style: inp2 })),
            React.createElement('div', null, React.createElement('label', { style: lbl2 }, 'RCCM'), React.createElement('input', { value: certForm.rccm || '', onChange: function(e) { updateForm('rccm', e.target.value) }, style: inp2 })),
            React.createElement('div', { style: { gridColumn: '1/-1' } }, React.createElement('label', { style: lbl2 }, 'Magasin / Locaux'), React.createElement('input', { value: certForm.locaux || '', onChange: function(e) { updateForm('locaux', e.target.value) }, style: inp2 })),
            React.createElement('div', { style: { gridColumn: '1/-1' } }, React.createElement('label', { style: lbl2 }, 'Situation Géographique'), React.createElement('input', { value: certForm.situation || '', onChange: function(e) { updateForm('situation', e.target.value) }, style: inp2 }))
          )
        ),

        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' } },
          React.createElement('div', null, React.createElement('label', { style: lbl2 }, "Date début d'exécution"), React.createElement('input', { value: certForm.dateDebut || '', onChange: function(e) { updateForm('dateDebut', e.target.value) }, placeholder: 'Ex: 20 mai', style: inp2 })),
          React.createElement('div', null, React.createElement('label', { style: lbl2 }, "Date fin d'exécution"), React.createElement('input', { value: certForm.dateFin || '', onChange: function(e) { updateForm('dateFin', e.target.value) }, placeholder: 'Ex: 22 mai', style: inp2 }))
        ),

        React.createElement('div', { style: { backgroundColor: '#f8f7f4', borderRadius: '8px', padding: '16px', marginBottom: '16px' } },
          React.createElement('label', { style: lbl2 }, type === 'double' ? 'Matières actives — Désinsectisation' : 'Matières actives utilisées'),
          React.createElement('textarea', { value: certForm.matieres || '', onChange: function(e) { updateForm('matieres', e.target.value) }, placeholder: 'Ex: IMPERA 300 CS\nROCOGEL', style: Object.assign({}, inp2, { minHeight: '80px', resize: 'vertical' }) }),
          type === 'double' && React.createElement('div', { style: { marginTop: '12px' } },
            React.createElement('label', { style: lbl2 }, 'Matières actives — Dératisation'),
            React.createElement('textarea', { value: certForm.matieresDerat || '', onChange: function(e) { updateForm('matieresDerat', e.target.value) }, placeholder: 'Ex: VERTOX', style: Object.assign({}, inp2, { minHeight: '80px', resize: 'vertical' }) })
          )
        ),

        React.createElement('div', { style: { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '11px', color: '#065f46' } },
          '✅ Observations fixes sur le certificat : Agrément APA/26-025/CNGP-BEN'
        ),

        React.createElement('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
          React.createElement('button', {
            onClick: saveCertificat,
            disabled: certSaving,
            style: { backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: certSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: certSaving ? 0.7 : 1 }
          }, certSaving ? '...' : '💾 Sauvegarder'),
          React.createElement('button', {
            onClick: imprimerCertificat,
            style: { backgroundColor: '#0a2e1a', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }
          }, '🖨️ Imprimer / PDF'),
          React.createElement('button', { onClick: function() { setCertModal(null) }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '12px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, 'Fermer')
        )
      )
    )
  }

  async function toggleCertEnvoye(cert) {
    var newVal = !cert.envoye
    await db.from('certificats').update({ envoye: newVal, envoye_at: newVal ? new Date().toISOString() : null }).eq('id', cert.id)
    await charger()
  }

  async function toggleFicheEnvoye(fiche) {
    var newVal = !fiche.envoye
    await db.from('fiches_passage').update({ envoye: newVal, envoye_at: newVal ? new Date().toISOString() : null }).eq('id', fiche.id)
    await charger()
  }

  async function supprimerCertificat(id) {
    if (!window.confirm('Supprimer ce certificat ?')) return
    var { error } = await db.from('certificats').delete().eq('id', id)
    if (error) { setMsg('Erreur suppression : ' + error.message); return }
    setMsg('✓ Certificat supprimé')
    await charger()
  }

  function apercuCert(cert) {
    var form = cert.form_data || {}
    var html = buildCertificatHtml(cert.type, form)
    ouvrirDocImprimable(html, 920, 1050)
  }

  function apercuFiche(fiche, client) {
    var form = {
      nomClient: [(client && client.prenom) || '', (client && client.nom) || ''].filter(Boolean).join(' '),
      adresse: (client && client.adresse) || '',
      tel: (client && client.telephone) || '',
      mob: '',
      typePassage: fiche.type_passage || '',
      prestations: fiche.prestations || [],
      autresPrestation: fiche.autres_prestation || '',
      lieuPrestation: fiche.lieu_prestation || '',
      nuisibles: fiche.nuisibles || [],
      autresNuisible: fiche.autres_nuisible || '',
      produits: fiche.produits || {},
      produitsCoches: fiche.produits ? Object.keys(fiche.produits).filter(function(k) { return !!fiche.produits[k] }) : [],
      dureeDebut: fiche.duree_debut || '',
      dureeFin: fiche.duree_fin || '',
      remarques: fiche.remarques || '',
      datePassage: fiche.date_passage || '',
      superviseurNom: fiche.superviseur_nom || '',
      superviseurContact: fiche.superviseur_contact || '',
    }
    var html = buildFichePassageHtml(form, client || {}, fiche.numero_unique)
    ouvrirDocImprimable(html, 920, 1100)
  }

  async function supprimerFiche(id) {
    if (!window.confirm('Supprimer cette fiche ?')) return
    await db.from('fiches_passage').delete().eq('id', id)
    await charger()
  }

  function ouvrirNouveauRapportVisite(devis, client) {
    setRapportVisiteModal({ devis, client, editingId: null })
    setRapportVisiteForm({
      dateVisite: new Date().toISOString().split('T')[0],
      adresseSite: client.adresse || devis.zone || '',
      descriptionSite: devis.prestation || '',
      nuisibles: [],
      autresNuisible: '',
      zonesInfestees: '',
      niveauInfestation: 'Moyen',
      recommandations: '',
      observations: '',
      technicien: personnelAdmin.length === 1 ? personnelAdmin[0].nom : '',
      notesTechnicien: '',
      photos: [],
      datesProposees: [],
    })
    setRapportVisitePhase('saisie')
    setRapportVisiteErreurIA(null)
    setMeteoData(null)
  }

  function ouvrirRapportVisite(rapport, devis, client) {
    setRapportVisiteModal({ devis, client, editingId: rapport.id })
    setRapportVisiteForm({
      dateVisite: rapport.date_visite || '',
      adresseSite: rapport.adresse_site || '',
      descriptionSite: rapport.description_site || '',
      nuisibles: rapport.nuisibles || [],
      autresNuisible: rapport.autres_nuisible || '',
      zonesInfestees: rapport.zones_infestees || '',
      niveauInfestation: rapport.niveau_infestation || 'Moyen',
      recommandations: rapport.recommandations || '',
      observations: rapport.observations || '',
      technicien: rapport.technicien || '',
      notesTechnicien: rapport.notes_technicien || '',
      photos: rapport.photos || [],
      datesProposees: rapport.dates_proposees || [],
    })
    setRapportVisitePhase('genere')
    setRapportVisiteErreurIA(null)
    setMeteoData(null)
  }

  async function uploaderPhotoRapport(file, setUploading, formSetter) {
    setUploading(true)
    var ext = file.name.split('.').pop()
    var nom = 'rapports/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext
    var { error } = await db.storage.from('realisations').upload(nom, file, { upsert: false })
    if (error) { setUploading(false); return }
    var { data: urlData } = db.storage.from('realisations').getPublicUrl(nom)
    formSetter(function(prev) { return Object.assign({}, prev, { photos: (prev.photos || []).concat(urlData.publicUrl) }) })
    setUploading(false)
  }

  function supprimerPhotoRapport(url, formSetter) {
    formSetter(function(prev) { return Object.assign({}, prev, { photos: (prev.photos || []).filter(function(u) { return u !== url }) }) })
  }

  async function ajouterAudios(files, existants, setAudios, setUploading) {
    setUploading(true)
    try {
      var restants = AUDIO_MAX_FILES - existants.length
      if (restants <= 0) { setMsg('Maximum ' + AUDIO_MAX_FILES + ' notes vocales'); return }
      var aTraiter = Array.from(files).slice(0, restants)
      var lus = []
      for (var i = 0; i < aTraiter.length; i++) {
        var f = aTraiter[i]
        if (f.size > AUDIO_MAX_BYTES) { setMsg('Fichier trop volumineux (max 3 Mo) : ' + f.name); continue }
        lus.push(await lireAudioBase64(f))
      }
      if (lus.length) setAudios(function(prev) { return prev.concat(lus) })
    } catch (e) {
      setMsg('Erreur lecture audio : ' + (e && e.message ? e.message : 'inconnue'))
    } finally {
      setUploading(false)
    }
  }

  async function extraireFramesVideo(file, formSetter, setExtracting) {
    var objectUrl = URL.createObjectURL(file)
    var video = document.createElement('video')
    video.src = objectUrl
    video.muted = true
    video.playsInline = true
    try {
      await new Promise(function(resolve, reject) {
        video.onloadedmetadata = resolve
        video.onerror = reject
        setTimeout(reject, 15000)
      })
      var duration = video.duration
      if (!duration || !isFinite(duration) || duration === 0) return
      var timestamps = [0.2, 0.4, 0.6, 0.8].map(function(p) { return p * duration })
      for (var ti = 0; ti < timestamps.length; ti++) {
        setExtracting('⏳ Frames ' + (ti + 1) + '/4 — ' + file.name)
        video.currentTime = timestamps[ti]
        await new Promise(function(resolve) {
          video.onseeked = resolve
          setTimeout(resolve, 3000)
        })
        var canvas = document.createElement('canvas')
        canvas.width = Math.min(video.videoWidth, 1280)
        canvas.height = Math.round(video.videoHeight * (canvas.width / video.videoWidth))
        var ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        var blob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.8) })
        if (!blob) continue
        var frameFile = new File([blob], 'frame-' + Math.round(timestamps[ti]) + 's.jpg', { type: 'image/jpeg' })
        await uploaderPhotoRapport(frameFile, function() {}, formSetter)
      }
    } catch (e) {
      // skip failed video silently
    } finally {
      URL.revokeObjectURL(objectUrl)
      setExtracting(null)
    }
  }

  async function genererRapportVisiteIA() {
    if (!rapportVisiteModal) return
    setGeneratingRapportVisite(true)
    setRapportVisiteErreurIA(null)
    var { devis, client } = rapportVisiteModal
    var clientNom = [(client.prenom || ''), client.nom].filter(Boolean).join(' ') + (client.entreprise ? ' — ' + client.entreprise : '')
    try {
      var totalB64V = (audiosVisite || []).reduce(function(s, a) { return s + (a.data ? a.data.length : 0) }, 0)
      if (totalB64V > AUDIO_MAX_TOTAL_B64) {
        setRapportVisiteErreurIA('Notes vocales trop volumineuses au total (~' + Math.round(totalB64V / 1024 / 1024) + ' Mo). Réduisez la durée ou le nombre de notes (limite ~4 Mo au total).')
        setGeneratingRapportVisite(false)
        return
      }
      var res = await fetch('/api/analyze-rapport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'visite',
          notes: rapportVisiteForm.notesTechnicien,
          photos: rapportVisiteForm.photos || [],
          audios: audiosVisite.map(function(a) { return { mimeType: a.mimeType, data: a.data } }),
          context: { clientNom, adresse: rapportVisiteForm.adresseSite, date: rapportVisiteForm.dateVisite, technicien: rapportVisiteForm.technicien, prestation: devis.prestation, audiosCount: audiosVisite.length },
        })
      })
      var data = null
      try { data = await res.json() } catch (_) { data = null }
      if (!res.ok || !data || !data.success) {
        setRapportVisiteErreurIA((data && data.error) || ('Erreur serveur (' + res.status + ') — notes vocales trop volumineuses ?'))
      } else {
        var r = data.rapport
        setRapportVisiteForm(function(prev) {
          return Object.assign({}, prev, {
            descriptionSite: r.descriptionSite || prev.descriptionSite || '',
            nuisibles: Array.isArray(r.nuisibles) ? r.nuisibles.filter(function(n) { return ['Cafards','Rats','Souris','Moustiques','Mouches','Fourmis','Termites','Punaises de lit','Serpents'].includes(n) }) : prev.nuisibles || [],
            zonesInfestees: r.zonesInfestees || prev.zonesInfestees || '',
            niveauInfestation: r.niveauInfestation || prev.niveauInfestation || 'Moyen',
            observations: r.observations || prev.observations || '',
            recommandations: r.recommandations || prev.recommandations || '',
          })
        })
        setRapportVisitePhase('genere')
        setAudiosVisite([])
      }
    } catch(e) { setRapportVisiteErreurIA(e.message) }
    setGeneratingRapportVisite(false)
  }

  function imprimerRapportVisite() {
    if (!rapportVisiteModal) return
    var { client, devis } = rapportVisiteModal
    var html = buildRapportVisiteHtml(rapportVisiteForm, client, devis)
    ouvrirDocImprimable(html, 920, 1100)
  }

  async function sauvegarderRapportVisite() {
    if (!rapportVisiteModal) return
    setSavingRapportVisite(true)
    var { devis, client, editingId } = rapportVisiteModal
    var data = {
      devis_id: devis.id,
      client_id: client.id,
      date_visite: rapportVisiteForm.dateVisite || null,
      adresse_site: rapportVisiteForm.adresseSite,
      description_site: rapportVisiteForm.descriptionSite,
      nuisibles: rapportVisiteForm.nuisibles,
      autres_nuisible: rapportVisiteForm.autresNuisible,
      zones_infestees: rapportVisiteForm.zonesInfestees,
      niveau_infestation: rapportVisiteForm.niveauInfestation,
      recommandations: rapportVisiteForm.recommandations,
      observations: rapportVisiteForm.observations,
      technicien: rapportVisiteForm.technicien,
      notes_technicien: rapportVisiteForm.notesTechnicien || null,
      photos: rapportVisiteForm.photos || [],
      dates_proposees: rapportVisiteForm.datesProposees || [],
    }
    if (editingId) {
      await db.from('rapports_visite').update(data).eq('id', editingId)
    } else {
      var now = new Date()
      var num = 'RV-' + now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0')
      data.numero_unique = num
      await db.from('rapports_visite').insert(data)
      // Créer automatiquement la mission dans le planning si technicien + date renseignés
      if (rapportVisiteForm.technicien && rapportVisiteForm.dateVisite) {
        var dejaPlanning = interventionsList.some(function(i) { return i.devis_id === devis.id })
        if (!dejaPlanning) {
          var techNom = rapportVisiteForm.technicien.split(',')[0].trim()
          var techPers = personnelAdmin.find(function(p) { return p.nom === techNom })
          var clientNomStr = [(client.prenom || ''), client.nom].filter(Boolean).join(' ') + (client.entreprise ? ' — ' + client.entreprise : '')
          var { data: { session: sess } } = await db.auth.getSession()
          await fetch('/api/rh-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (sess?.access_token || '') },
            body: JSON.stringify({
              action: 'add_intervention',
              devisId: devis.id,
              personnelId: techPers ? techPers.id : null,
              dateIntervention: rapportVisiteForm.dateVisite,
              heureDebut: '08:00',
              statut: 'planifiee',
              clientNom: clientNomStr,
              adresse: rapportVisiteForm.adresseSite || '',
              notes: 'Rapport de visite — ' + (devis.prestation || ''),
              montantPrestataire: 0
            })
          })
        }
      }
    }
    await charger()
    setSavingRapportVisite(false)
    setMsg('✓ Rapport de visite enregistré — mission ajoutée au planning')
  }

  async function supprimerRapportVisite(id) {
    if (!window.confirm('Supprimer ce rapport de visite ?')) return
    await db.from('rapports_visite').delete().eq('id', id)
    await charger()
  }

  function renderRapportVisiteModal() {
    if (!rapportVisiteModal) return null
    var { client, devis } = rapportVisiteModal
    var upd = function(k, v) { setRapportVisiteForm(function(prev) { return Object.assign({}, prev, { [k]: v }) }) }
    var toggleNuisible = function(n) {
      setRapportVisiteForm(function(prev) {
        var arr = prev.nuisibles || []
        return Object.assign({}, prev, { nuisibles: arr.includes(n) ? arr.filter(function(x) { return x !== n }) : arr.concat(n) })
      })
    }
    var NUISIBLES = ['Cafards', 'Rats', 'Souris', 'Moustiques', 'Mouches', 'Fourmis', 'Termites', 'Punaises de lit', 'Serpents']
    var NIVEAUX = ['Faible', 'Moyen', 'Élevé']
    var inp2 = { width: '100%', padding: '8px 10px', border: '1.5px solid #e0ddd6', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
    var lbl2 = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '5px', textTransform: 'uppercase' }
    var section = { marginBottom: '16px' }
    return React.createElement('div', { style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px' } },
      React.createElement('div', { style: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '680px', padding: '28px' } },

        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '17px', fontWeight: '700', color: '#0a2e1a' } }, '🔍 Rapport de visite'),
            React.createElement('div', { style: { fontSize: '12px', color: '#888', marginTop: '2px' } }, [(client.prenom || ''), client.nom].filter(Boolean).join(' ') + (client.entreprise ? ' — ' + client.entreprise : '') + ' · ' + devis.prestation)
          ),
          React.createElement('button', { onClick: function() { setRapportVisiteModal(null) }, style: { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#888' } }, '×')
        ),

        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' } },
          React.createElement('div', null,
            React.createElement('label', { style: lbl2 }, 'Date de visite'),
            React.createElement('input', { type: 'date', value: rapportVisiteForm.dateVisite || '', onChange: function(e) { upd('dateVisite', e.target.value) }, style: inp2 })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: lbl2 }, 'Technicien'),
            personnelAdmin.length > 0
              ? React.createElement('select', {
                  value: rapportVisiteForm.technicien || '',
                  onChange: function(e) { upd('technicien', e.target.value) },
                  style: inp2
                },
                React.createElement('option', { value: '' }, '— Choisir un technicien —'),
                personnelAdmin.map(function(m) {
                  return React.createElement('option', { key: m.id, value: m.nom }, m.nom + (m.poste ? ' · ' + m.poste : ''))
                })
              )
              : React.createElement('input', { value: rapportVisiteForm.technicien || '', onChange: function(e) { upd('technicien', e.target.value) }, placeholder: 'Nom du technicien', style: inp2 })
          )
        ),

        React.createElement('div', { style: section },
          React.createElement('label', { style: lbl2 }, 'Adresse du site'),
          React.createElement('input', { value: rapportVisiteForm.adresseSite || '', onChange: function(e) { upd('adresseSite', e.target.value) }, placeholder: 'Adresse complète', style: inp2 })
        ),

        rapportVisitePhase === 'saisie' ? React.createElement(React.Fragment, null,

          React.createElement('div', { style: Object.assign({}, section, { backgroundColor: '#fffbeb', border: '2px solid #fcd34d', borderRadius: '10px', padding: '16px' }) },
            React.createElement('label', { style: Object.assign({}, lbl2, { color: '#92400e', fontSize: '12px' }) }, '📝 Notes brutes du technicien'),
            React.createElement('p', { style: { fontSize: '12px', color: '#78350f', marginBottom: '10px', lineHeight: '1.5' } }, 'Colle ici ce que le technicien t\'a envoyé. L\'IA va rédiger le rapport professionnel à partir de ces notes et des photos.'),
            React.createElement('textarea', { value: rapportVisiteForm.notesTechnicien || '', onChange: function(e) { upd('notesTechnicien', e.target.value) }, rows: 7, placeholder: 'Ex : "Appart 3ème étage, plein de cafards dans la cuisine surtout sous l\'évier et derrière le frigo, aussi quelques-uns dans les WC. Pas de rats mais des traces. Client dit que ça dure depuis 2 semaines..."', style: Object.assign({}, inp2, { resize: 'vertical', backgroundColor: '#fff', borderColor: '#fcd34d', fontSize: '13px', lineHeight: '1.6' }) })
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, '📷 Photos du terrain'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' } },
              (rapportVisiteForm.photos || []).map(function(url, i) {
                return React.createElement('div', { key: i, style: { position: 'relative' } },
                  React.createElement('img', { src: url, alt: 'Photo ' + (i+1), style: { width: '90px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e0ddd6' } }),
                  React.createElement('button', { onClick: function() { supprimerPhotoRapport(url, setRapportVisiteForm) }, style: { position: 'absolute', top: '-6px', right: '-6px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 } }, '×')
                )
              })
            ),
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bae6fd', backgroundColor: '#f0f9ff', cursor: uploadingPhotoVisite ? 'wait' : 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' }, onChange: function(e) { Array.from(e.target.files).forEach(function(f) { uploaderPhotoRapport(f, setUploadingPhotoVisite, setRapportVisiteForm) }) }, disabled: uploadingPhotoVisite }),
              uploadingPhotoVisite ? '⏳ Envoi...' : '+ Ajouter des photos'
            ),
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bae6fd', backgroundColor: '#f0f9ff', cursor: uploadingAudioVisite ? 'wait' : 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '600', marginLeft: '8px' } },
              React.createElement('input', { type: 'file', accept: 'audio/*', multiple: true, style: { display: 'none' }, onChange: function(e) { ajouterAudios(e.target.files, audiosVisite, setAudiosVisite, setUploadingAudioVisite); e.target.value = '' }, disabled: uploadingAudioVisite }),
              uploadingAudioVisite ? '⏳ Lecture…' : '+ Ajouter note vocale'
            ),
            audiosVisite.length > 0 && React.createElement('div', { style: { marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' } },
              audiosVisite.map(function(a, i) {
                return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0369a1' } },
                  React.createElement('span', null, '🎤 ' + (a.name || ('Note vocale ' + (i + 1)))),
                  React.createElement('button', { type: 'button', onClick: function() { setAudiosVisite(function(prev) { return prev.filter(function(_, j) { return j !== i }) }) }, style: { border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px', padding: 0 } }, '✕')
                )
              })
            ),
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bbf7d0', backgroundColor: '#f0fdf4', cursor: extractingFramesVisite ? 'wait' : 'pointer', fontSize: '12px', color: '#166534', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'video/*', multiple: true, style: { display: 'none' }, onChange: function(e) {
                var files = Array.from(e.target.files).slice(0, 3)
                files.reduce(function(p, f) { return p.then(function() { return extraireFramesVideo(f, setRapportVisiteForm, setExtractingFramesVisite) }) }, Promise.resolve())
                e.target.value = ''
              }, disabled: !!extractingFramesVisite }),
              extractingFramesVisite || '🎥 Ajouter des vidéos'
            )
          ),

          rapportVisiteErreurIA ? React.createElement('div', { style: { backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', color: '#991b1b', marginBottom: '14px' } }, '❌ ' + rapportVisiteErreurIA) : null,

          React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f0ede8' } },
            React.createElement('button', { onClick: function() { setRapportVisiteModal(null) }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, 'Annuler'),
            React.createElement('button', {
              onClick: genererRapportVisiteIA,
              disabled: generatingRapportVisite || uploadingPhotoVisite || uploadingAudioVisite || !!extractingFramesVisite || (!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length && !audiosVisite.length),
              style: { backgroundColor: '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (generatingRapportVisite || uploadingPhotoVisite || uploadingAudioVisite || !!extractingFramesVisite || (!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length && !audiosVisite.length)) ? 0.5 : 1 }
            }, generatingRapportVisite ? '🤖 Analyse en cours...' : '🤖 Générer le rapport avec l\'IA')
          )

        ) : React.createElement(React.Fragment, null,

          React.createElement('div', { style: { backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#166534', fontWeight: '600' } },
            '✅ Rapport généré par l\'IA — vérifiez et modifiez si nécessaire avant d\'enregistrer'
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Description du site'),
            React.createElement('textarea', { value: rapportVisiteForm.descriptionSite || '', onChange: function(e) { upd('descriptionSite', e.target.value) }, rows: 2, style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Nuisibles observés'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
              NUISIBLES.map(function(n) {
                var checked = (rapportVisiteForm.nuisibles || []).includes(n)
                return React.createElement('label', { key: n, style: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', padding: '5px 10px', borderRadius: '20px', border: '1px solid ' + (checked ? '#0a2e1a' : '#e0ddd6'), backgroundColor: checked ? '#f0fdf4' : '#fff', fontWeight: checked ? '600' : '400' } },
                  React.createElement('input', { type: 'checkbox', checked: checked, onChange: function() { toggleNuisible(n) }, style: { display: 'none' } }),
                  n
                )
              }),
              React.createElement('input', { value: rapportVisiteForm.autresNuisible || '', onChange: function(e) { upd('autresNuisible', e.target.value) }, placeholder: 'Autres...', style: Object.assign({}, inp2, { width: '140px', padding: '5px 8px' }) })
            )
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, "Niveau d'infestation"),
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
              NIVEAUX.map(function(n) {
                var sel = rapportVisiteForm.niveauInfestation === n
                var color = n === 'Faible' ? '#16a34a' : n === 'Moyen' ? '#d97706' : '#dc2626'
                return React.createElement('button', { key: n, onClick: function() { upd('niveauInfestation', n) }, style: { padding: '7px 18px', borderRadius: '6px', border: '1.5px solid ' + (sel ? color : '#e0ddd6'), backgroundColor: sel ? color : '#fff', color: sel ? '#fff' : '#666', fontSize: '12px', fontWeight: sel ? '700' : '400', cursor: 'pointer', fontFamily: 'inherit' } }, n)
              })
            )
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Zones infestées'),
            React.createElement('textarea', { value: rapportVisiteForm.zonesInfestees || '', onChange: function(e) { upd('zonesInfestees', e.target.value) }, rows: 2, style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Observations techniques'),
            React.createElement('textarea', { value: rapportVisiteForm.observations || '', onChange: function(e) { upd('observations', e.target.value) }, rows: 3, style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Recommandations'),
            React.createElement('textarea', { value: rapportVisiteForm.recommandations || '', onChange: function(e) { upd('recommandations', e.target.value) }, rows: 3, style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          React.createElement('div', { style: { backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '14px', marginBottom: '16px' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
              React.createElement('label', { style: Object.assign({}, lbl2, { color: '#0369a1', margin: 0 }) }, '📅 Dates d\'intervention proposées (météo)'),
              React.createElement('button', {
                onClick: function() {
                  setLoadingMeteo(true)
                  fetch('/api/meteo-cotonou')
                    .then(function(r) { return r.json() })
                    .then(function(d) { setMeteoData(d); setLoadingMeteo(false) })
                    .catch(function() { setLoadingMeteo(false) })
                },
                disabled: loadingMeteo,
                style: { background: '#0369a1', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '11px', fontWeight: '700', cursor: loadingMeteo ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: loadingMeteo ? 0.6 : 1 }
              }, loadingMeteo ? '⏳ Chargement...' : '🌤 Consulter météo 14 j')
            ),
            (rapportVisiteForm.datesProposees || []).length > 0
              ? React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' } },
                  (rapportVisiteForm.datesProposees || []).map(function(d) {
                    return React.createElement('span', { key: d, style: { display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#0369a1', color: '#fff', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600' } },
                      d,
                      React.createElement('button', { onClick: function() { upd('datesProposees', (rapportVisiteForm.datesProposees || []).filter(function(x) { return x !== d })) }, style: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 0 0 4px', fontSize: '14px', lineHeight: 1 } }, '×')
                    )
                  })
                )
              : React.createElement('p', { style: { fontSize: '12px', color: '#64748b', marginBottom: '8px' } }, 'Aucune date sélectionnée. Cliquez sur « Consulter météo » puis choisissez les créneaux favorables.'),
            meteoData && meteoData.days
              ? React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                  meteoData.days.map(function(d) {
                    var selected = (rapportVisiteForm.datesProposees || []).includes(d.dateFr)
                    var bg = selected ? '#0369a1' : d.suitable ? '#f0fdf4' : '#fef2f2'
                    var color = selected ? '#fff' : d.suitable ? '#065f46' : '#991b1b'
                    var border = selected ? '#0369a1' : d.suitable ? '#bbf7d0' : '#fecaca'
                    return React.createElement('button', {
                      key: d.date,
                      onClick: function() {
                        var dates = rapportVisiteForm.datesProposees || []
                        upd('datesProposees', selected ? dates.filter(function(x) { return x !== d.dateFr }) : dates.concat(d.dateFr))
                      },
                      title: d.label + ' — ' + d.rain + 'mm · ' + d.tempMax + '°C',
                      style: { background: bg, color: color, border: '1px solid ' + border, borderRadius: '8px', padding: '6px 8px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', minWidth: '82px', lineHeight: '1.4' }
                    },
                      React.createElement('div', { style: { fontWeight: '700' } }, d.icon + ' ' + d.dateFr),
                      React.createElement('div', { style: { fontSize: '9px', opacity: 0.85 } }, d.rain + 'mm · ' + d.tempMax + '°C')
                    )
                  })
                )
              : null
          ),

          (rapportVisiteForm.photos || []).length > 0 ? React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, '📷 Photos (' + (rapportVisiteForm.photos || []).length + ')'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
              (rapportVisiteForm.photos || []).map(function(url, i) {
                return React.createElement('img', { key: i, src: url, alt: 'Photo ' + (i+1), style: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e0ddd6' } })
              })
            )
          ) : null,

          React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f0ede8', flexWrap: 'wrap' } },
            React.createElement('button', { onClick: function() { setRapportVisitePhase('saisie') }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, '◀ Modifier les notes'),
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
              React.createElement('button', { onClick: imprimerRapportVisite, style: { background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '6px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' } }, '🖨️ Aperçu & Imprimer'),
              React.createElement('button', { onClick: sauvegarderRapportVisite, disabled: savingRapportVisite, style: { backgroundColor: '#0a2e1a', color: '#d4a920', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' } }, savingRapportVisite ? '⏳ Enregistrement...' : '💾 Enregistrer')
            )
          )
        )
      )
    )
  }

  var PRODUITS_DEFAUT_INTERV = 'Insecticide : IMPERA 300 CS — traitement des insectes rampants et volants par pulvérisation sur les surfaces, plinthes et zones d\'ombre.\nGel : ROCOGEL — application en points de gel dans les zones d\'infestation (cuisines, sanitaires, fissures et recoins).\nRaticide : VERTOX — mise en place de boîtes d\'appâts sécurisées dans les zones de passage et terriers des rongeurs.'

  function ouvrirNouveauRapportInterv(devis, client) {
    var technicienStr = ''
    var techNoms = interventionsList
      .filter(function(i) { return i.devis_id === devis.id && i.personnel })
      .map(function(i) { return [i.personnel.prenom, i.personnel.nom].filter(Boolean).join(' ') })
    var unique = techNoms.filter(function(n, idx, arr) { return arr.indexOf(n) === idx })
    technicienStr = unique.join(', ')
    setRapportIntervModal({ devis, client, editingId: null })
    setRapportIntervForm({
      dateIntervention: new Date().toISOString().split('T')[0],
      technicien: technicienStr,
      zonesTraitees: '',
      produitsUtilises: PRODUITS_DEFAUT_INTERV,
      methodeApplication: '',
      dureeIntervention: '',
      resultats: '',
      observations: '',
      recommandations: '',
      notesTechnicien: '',
      photos: [],
    })
    setRapportIntervPhase('saisie')
    setRapportIntervErreurIA(null)
  }

  function ouvrirRapportInterv(rapport, devis, client) {
    setRapportIntervModal({ devis, client, editingId: rapport.id })
    setRapportIntervForm({
      dateIntervention: rapport.date_intervention || '',
      technicien: rapport.technicien || '',
      zonesTraitees: rapport.zones_traitees || '',
      produitsUtilises: rapport.produits_utilises || PRODUITS_DEFAUT_INTERV,
      methodeApplication: rapport.methode_application || '',
      dureeIntervention: rapport.duree_intervention || '',
      resultats: rapport.resultats || '',
      observations: rapport.observations || '',
      recommandations: rapport.recommandations || '',
      notesTechnicien: rapport.notes_technicien || '',
      photos: rapport.photos || [],
    })
    setRapportIntervPhase('genere')
    setRapportIntervErreurIA(null)
  }

  async function genererRapportIntervIA() {
    if (!rapportIntervModal) return
    setGeneratingRapportInterv(true)
    setRapportIntervErreurIA(null)
    var { devis, client } = rapportIntervModal
    var clientNom = [(client.prenom || ''), client.nom].filter(Boolean).join(' ') + (client.entreprise ? ' — ' + client.entreprise : '')
    try {
      var totalB64I = (audiosInterv || []).reduce(function(s, a) { return s + (a.data ? a.data.length : 0) }, 0)
      if (totalB64I > AUDIO_MAX_TOTAL_B64) {
        setRapportIntervErreurIA('Notes vocales trop volumineuses au total (~' + Math.round(totalB64I / 1024 / 1024) + ' Mo). Réduisez la durée ou le nombre de notes (limite ~4 Mo au total).')
        setGeneratingRapportInterv(false)
        return
      }
      var res = await fetch('/api/analyze-rapport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'intervention',
          notes: rapportIntervForm.notesTechnicien,
          photos: rapportIntervForm.photos || [],
          audios: audiosInterv.map(function(a) { return { mimeType: a.mimeType, data: a.data } }),
          context: { clientNom, date: rapportIntervForm.dateIntervention, technicien: rapportIntervForm.technicien, prestation: devis.prestation, audiosCount: audiosInterv.length },
        })
      })
      var data = null
      try { data = await res.json() } catch (_) { data = null }
      if (!res.ok || !data || !data.success) {
        setRapportIntervErreurIA((data && data.error) || ('Erreur serveur (' + res.status + ') — notes vocales trop volumineuses ?'))
      } else {
        var r = data.rapport
        setRapportIntervForm(function(prev) {
          return Object.assign({}, prev, {
            zonesTraitees: r.zonesTraitees || prev.zonesTraitees || '',
            produitsUtilises: prev.produitsUtilises || '',
            methodeApplication: r.methodeApplication || prev.methodeApplication || '',
            dureeIntervention: r.dureeIntervention || prev.dureeIntervention || '',
            resultats: r.resultats || prev.resultats || '',
            observations: r.observations || prev.observations || '',
            recommandations: r.recommandations || prev.recommandations || '',
          })
        })
        setRapportIntervPhase('genere')
        setAudiosInterv([])
      }
    } catch(e) { setRapportIntervErreurIA(e.message) }
    setGeneratingRapportInterv(false)
  }

  function imprimerRapportInterv() {
    if (!rapportIntervModal) return
    var { client, devis } = rapportIntervModal
    var html = buildRapportIntervHtml(rapportIntervForm, client, devis)
    ouvrirDocImprimable(html, 920, 1100)
  }

  async function supprimerRapportInterv() {
    var editingId = rapportIntervModal?.editingId
    if (!editingId) return
    if (!window.confirm('Supprimer ce rapport d\'intervention définitivement ?')) return
    await db.from('rapports_intervention').delete().eq('id', editingId)
    setRapportIntervModal(null)
    await charger()
  }

  async function supprimerRapportIntervById(id) {
    if (!window.confirm('Supprimer ce rapport d\'intervention ?')) return
    await db.from('rapports_intervention').delete().eq('id', id)
    await charger()
  }

  async function sauvegarderRapportInterv() {
    if (!rapportIntervModal) return
    setSavingRapportInterv(true)
    var { devis, client, editingId } = rapportIntervModal
    var data = {
      devis_id: devis.id,
      client_id: client.id,
      date_intervention: rapportIntervForm.dateIntervention || null,
      technicien: rapportIntervForm.technicien,
      zones_traitees: rapportIntervForm.zonesTraitees,
      produits_utilises: rapportIntervForm.produitsUtilises,
      methode_application: rapportIntervForm.methodeApplication,
      duree_intervention: rapportIntervForm.dureeIntervention,
      resultats: rapportIntervForm.resultats,
      observations: rapportIntervForm.observations,
      recommandations: rapportIntervForm.recommandations,
      notes_technicien: rapportIntervForm.notesTechnicien || null,
      photos: rapportIntervForm.photos || [],
    }
    if (editingId) {
      await db.from('rapports_intervention').update(data).eq('id', editingId)
    } else {
      var now = new Date()
      var num = 'RI-' + now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0')
      data.numero_unique = num
      await db.from('rapports_intervention').insert(data)
    }
    await charger()
    setSavingRapportInterv(false)
    setMsg("✓ Rapport d'intervention enregistré")
  }

  function renderRapportIntervModal() {
    if (!rapportIntervModal) return null
    var { client, devis } = rapportIntervModal
    var upd = function(k, v) { setRapportIntervForm(function(prev) { return Object.assign({}, prev, { [k]: v }) }) }
    var inp2 = { width: '100%', padding: '8px 10px', border: '1.5px solid #e0ddd6', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
    var lbl2 = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '5px', textTransform: 'uppercase' }
    var section = { marginBottom: '16px' }
    return React.createElement('div', { style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px' } },
      React.createElement('div', { style: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '680px', padding: '28px' } },

        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '17px', fontWeight: '700', color: '#0a2e1a' } }, "📊 Rapport d'intervention"),
            React.createElement('div', { style: { fontSize: '12px', color: '#888', marginTop: '2px' } }, [(client.prenom || ''), client.nom].filter(Boolean).join(' ') + (client.entreprise ? ' — ' + client.entreprise : '') + ' · ' + devis.prestation)
          ),
          React.createElement('button', { onClick: function() { setRapportIntervModal(null) }, style: { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#888' } }, '×')
        ),

        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' } },
          React.createElement('div', null,
            React.createElement('label', { style: lbl2 }, "Date d'intervention"),
            React.createElement('input', { type: 'date', value: rapportIntervForm.dateIntervention || '', onChange: function(e) { upd('dateIntervention', e.target.value) }, style: inp2 })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: lbl2 }, 'Technicien(s)'),
            personnelAdmin.length > 0 && React.createElement('select', {
              value: '',
              onChange: function(e) {
                if (!e.target.value) return
                var current = (rapportIntervForm.technicien || '').trim()
                upd('technicien', current ? current + ', ' + e.target.value : e.target.value)
                e.target.value = ''
              },
              style: Object.assign({}, inp2, { marginBottom: '6px', color: '#555' })
            },
              React.createElement('option', { value: '' }, '+ Ajouter depuis l\'équipe'),
              personnelAdmin.map(function(m) {
                return React.createElement('option', { key: m.id, value: m.nom }, m.nom + (m.poste ? ' · ' + m.poste : ''))
              })
            ),
            React.createElement('input', { value: rapportIntervForm.technicien || '', onChange: function(e) { upd('technicien', e.target.value) }, placeholder: 'Noms des techniciens', style: inp2 })
          )
        ),

        rapportIntervPhase === 'saisie' ? React.createElement(React.Fragment, null,

          React.createElement('div', { style: Object.assign({}, section, { backgroundColor: '#fff7ed', border: '2px solid #fed7aa', borderRadius: '10px', padding: '16px' }) },
            React.createElement('label', { style: Object.assign({}, lbl2, { color: '#7c2d12', fontSize: '12px' }) }, '📝 Notes brutes du technicien'),
            React.createElement('p', { style: { fontSize: '12px', color: '#9a3412', marginBottom: '10px', lineHeight: '1.5' } }, 'Colle ici le retour du technicien. L\'IA va rédiger le rapport professionnel d\'intervention à partir de ces notes et des photos.'),
            React.createElement('textarea', { value: rapportIntervForm.notesTechnicien || '', onChange: function(e) { upd('notesTechnicien', e.target.value) }, rows: 7, placeholder: 'Ex : "Zone cuisine traitée avec IMPERA 300 CS, rats dans la réserve on a posé 4 boîtes VERTOX, quelques cafards dans les WC traités au ROCOGEL. Durée 2h. Client pas là au retour mais il faut revenir vérifier dans 15j..."', style: Object.assign({}, inp2, { resize: 'vertical', backgroundColor: '#fff', borderColor: '#fed7aa', fontSize: '13px', lineHeight: '1.6' }) })
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, '📷 Photos du terrain'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' } },
              (rapportIntervForm.photos || []).map(function(url, i) {
                return React.createElement('div', { key: i, style: { position: 'relative' } },
                  React.createElement('img', { src: url, alt: 'Photo ' + (i+1), style: { width: '90px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e0ddd6' } }),
                  React.createElement('button', { onClick: function() { supprimerPhotoRapport(url, setRapportIntervForm) }, style: { position: 'absolute', top: '-6px', right: '-6px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 } }, '×')
                )
              })
            ),
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #fed7aa', backgroundColor: '#fff7ed', cursor: uploadingPhotoInterv ? 'wait' : 'pointer', fontSize: '12px', color: '#c2410c', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' }, onChange: function(e) { Array.from(e.target.files).forEach(function(f) { uploaderPhotoRapport(f, setUploadingPhotoInterv, setRapportIntervForm) }) }, disabled: uploadingPhotoInterv }),
              uploadingPhotoInterv ? '⏳ Envoi...' : '+ Ajouter des photos'
            ),
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bae6fd', backgroundColor: '#f0f9ff', cursor: uploadingAudioInterv ? 'wait' : 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '600', marginLeft: '8px' } },
              React.createElement('input', { type: 'file', accept: 'audio/*', multiple: true, style: { display: 'none' }, onChange: function(e) { ajouterAudios(e.target.files, audiosInterv, setAudiosInterv, setUploadingAudioInterv); e.target.value = '' }, disabled: uploadingAudioInterv }),
              uploadingAudioInterv ? '⏳ Lecture…' : '+ Ajouter note vocale'
            ),
            audiosInterv.length > 0 && React.createElement('div', { style: { marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' } },
              audiosInterv.map(function(a, i) {
                return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0369a1' } },
                  React.createElement('span', null, '🎤 ' + (a.name || ('Note vocale ' + (i + 1)))),
                  React.createElement('button', { type: 'button', onClick: function() { setAudiosInterv(function(prev) { return prev.filter(function(_, j) { return j !== i }) }) }, style: { border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px', padding: 0 } }, '✕')
                )
              })
            ),
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bbf7d0', backgroundColor: '#f0fdf4', cursor: extractingFramesInterv ? 'wait' : 'pointer', fontSize: '12px', color: '#166534', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'video/*', multiple: true, style: { display: 'none' }, onChange: function(e) {
                var files = Array.from(e.target.files).slice(0, 3)
                files.reduce(function(p, f) { return p.then(function() { return extraireFramesVideo(f, setRapportIntervForm, setExtractingFramesInterv) }) }, Promise.resolve())
                e.target.value = ''
              }, disabled: !!extractingFramesInterv }),
              extractingFramesInterv || '🎥 Ajouter des vidéos'
            )
          ),

          React.createElement('div', { style: Object.assign({}, section, { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px' }) },
            React.createElement('label', { style: Object.assign({}, lbl2, { color: '#166534' }) }, '🧪 Produits utilisés'),
            React.createElement('p', { style: { fontSize: '11px', color: '#166534', marginBottom: '8px' } }, 'Pré-rempli avec vos produits homologués — modifiable si besoin.'),
            React.createElement('textarea', { value: rapportIntervForm.produitsUtilises || '', onChange: function(e) { upd('produitsUtilises', e.target.value) }, rows: 5, style: Object.assign({}, inp2, { resize: 'vertical', backgroundColor: '#fff' }) })
          ),

          rapportIntervErreurIA ? React.createElement('div', { style: { backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', color: '#991b1b', marginBottom: '14px' } }, '❌ ' + rapportIntervErreurIA) : null,

          React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f0ede8' } },
            React.createElement('button', { onClick: function() { setRapportIntervModal(null) }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, 'Annuler'),
            React.createElement('button', {
              onClick: genererRapportIntervIA,
              disabled: generatingRapportInterv || uploadingPhotoInterv || uploadingAudioInterv || !!extractingFramesInterv || (!rapportIntervForm.notesTechnicien && !(rapportIntervForm.photos || []).length && !audiosInterv.length),
              style: { backgroundColor: '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (generatingRapportInterv || uploadingPhotoInterv || uploadingAudioInterv || !!extractingFramesInterv || (!rapportIntervForm.notesTechnicien && !(rapportIntervForm.photos || []).length && !audiosInterv.length)) ? 0.5 : 1 }
            }, generatingRapportInterv ? '🤖 Analyse en cours...' : '🤖 Générer le rapport avec l\'IA')
          )

        ) : React.createElement(React.Fragment, null,

          React.createElement('div', { style: { backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#166534', fontWeight: '600' } },
            '✅ Rapport généré par l\'IA — vérifiez et modifiez si nécessaire avant d\'enregistrer'
          ),

          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' } },
            React.createElement('div', null,
              React.createElement('label', { style: lbl2 }, "Méthode d'application"),
              React.createElement('input', { value: rapportIntervForm.methodeApplication || '', onChange: function(e) { upd('methodeApplication', e.target.value) }, style: inp2 })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: lbl2 }, "Durée de l'intervention"),
              React.createElement('input', { value: rapportIntervForm.dureeIntervention || '', onChange: function(e) { upd('dureeIntervention', e.target.value) }, style: inp2 })
            )
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Zones traitées'),
            React.createElement('textarea', { value: rapportIntervForm.zonesTraitees || '', onChange: function(e) { upd('zonesTraitees', e.target.value) }, rows: 2, style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Produits utilisés'),
            React.createElement('textarea', { value: rapportIntervForm.produitsUtilises || '', onChange: function(e) { upd('produitsUtilises', e.target.value) }, rows: 5, placeholder: 'Ex: IMPERA 300 CS, ROCOGEL, VERTOX', style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Résultats obtenus'),
            React.createElement('textarea', { value: rapportIntervForm.resultats || '', onChange: function(e) { upd('resultats', e.target.value) }, rows: 2, style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Observations'),
            React.createElement('textarea', { value: rapportIntervForm.observations || '', onChange: function(e) { upd('observations', e.target.value) }, rows: 2, style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, 'Recommandations / suivi'),
            React.createElement('textarea', { value: rapportIntervForm.recommandations || '', onChange: function(e) { upd('recommandations', e.target.value) }, rows: 2, style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          (rapportIntervForm.photos || []).length > 0 ? React.createElement('div', { style: section },
            React.createElement('label', { style: lbl2 }, '📷 Photos (' + (rapportIntervForm.photos || []).length + ')'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
              (rapportIntervForm.photos || []).map(function(url, i) {
                return React.createElement('img', { key: i, src: url, alt: 'Photo ' + (i+1), style: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e0ddd6' } })
              })
            )
          ) : null,

          React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f0ede8', flexWrap: 'wrap' } },
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
              React.createElement('button', { onClick: function() { setRapportIntervPhase('saisie') }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, '◀ Modifier les notes'),
              rapportIntervModal?.editingId && React.createElement('button', { onClick: supprimerRapportInterv, style: { background: 'none', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, '🗑 Supprimer')
            ),
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
              React.createElement('button', { onClick: imprimerRapportInterv, style: { background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: '6px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' } }, '🖨️ Aperçu & Imprimer'),
              React.createElement('button', { onClick: sauvegarderRapportInterv, disabled: savingRapportInterv, style: { backgroundColor: '#0a2e1a', color: '#d4a920', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' } }, savingRapportInterv ? '⏳ Enregistrement...' : '💾 Enregistrer')
            )
          )
        )
      )
    )
  }

  function reouvrirFicheModal(f, client) {
    setFicheForm({
      nomClient: [(client && client.prenom) || '', (client && client.nom) || ''].filter(Boolean).join(' '),
      adresse: (client && client.adresse) || '',
      tel: (client && client.telephone) || '',
      mob: '',
      typePassage: f.type_passage || '',
      prestations: f.prestations || [],
      autresPrestation: f.autres_prestation || '',
      lieuPrestation: f.lieu_prestation || '',
      nuisibles: f.nuisibles || [],
      autresNuisible: f.autres_nuisible || '',
      produits: f.produits || { insecticides: '', raticides: '', desinfectants: '', fumigants: '', phytosanitaires: '', autres: '' },
      produitsCoches: f.produits ? Object.keys(f.produits).filter(function(k) { return !!f.produits[k] }) : [],
      dureeDebut: f.duree_debut || '',
      dureeFin: f.duree_fin || '',
      remarques: f.remarques || '',
      datePassage: f.date_passage || '',
      superviseurNom: f.superviseur_nom || '',
      superviseurContact: f.superviseur_contact || '',
    })
    setFicheModal({ client: client || {}, editingId: f.id, existingNumero: f.numero_unique })
  }

  // ── FICHES DE PASSAGE ──────────────────────────────
  function ouvrirFicheModal(c, devis) {
    var now = new Date()
    var yyyy = now.getFullYear()
    var mm = String(now.getMonth() + 1).padStart(2, '0')
    var dd = String(now.getDate()).padStart(2, '0')
    setFicheForm({
      nomClient: [(c.prenom || ''), c.nom].filter(Boolean).join(' '),
      adresse: c.adresse || '',
      tel: c.telephone || '',
      mob: '',
      typePassage: '',
      prestations: [],
      autresPrestation: devis ? (devis.prestation || '') : '',
      lieuPrestation: '',
      nuisibles: [],
      autresNuisible: '',
      produits: { insecticides: 'IMPERA 300 CS / ROCOGEL', raticides: 'VERTOX', desinfectants: '', fumigants: '', phytosanitaires: '', autres: '' },
      produitsCoches: [],
      dureeDebut: '',
      dureeFin: '',
      remarques: '',
      datePassage: yyyy + '-' + mm + '-' + dd,
      superviseurNom: '',
      superviseurContact: '',
    })
    setFicheModal({ client: c, devis: devis || null })
  }

  async function saveFichePassage() {
    setSavingFiche(true); setMsg('')
    try {
      var ficheData = {
        type_passage: ficheForm.typePassage,
        prestations: ficheForm.prestations,
        autres_prestation: ficheForm.autresPrestation,
        lieu_prestation: ficheForm.lieuPrestation,
        nuisibles: ficheForm.nuisibles,
        autres_nuisible: ficheForm.autresNuisible,
        produits: ficheForm.produits,
        duree_debut: ficheForm.dureeDebut,
        duree_fin: ficheForm.dureeFin,
        remarques: ficheForm.remarques,
        date_passage: ficheForm.datePassage,
        superviseur_nom: ficheForm.superviseurNom,
        superviseur_contact: ficheForm.superviseurContact,
      }
      var ficheNumero
      var isEditing = !!ficheModal.editingId
      var opErr
      if (isEditing) {
        ficheNumero = ficheModal.existingNumero
        var upd = await db.from('fiches_passage').update(ficheData).eq('id', ficheModal.editingId)
        opErr = upd.error
      } else {
        var { data: numero } = await db.rpc('generate_fiche_numero')
        ficheNumero = numero || ('FP-GSE-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4))
        ficheData.numero_unique = ficheNumero
        ficheData.client_id = ficheModal.client.id
        if (ficheModal.devis) ficheData.devis_id = ficheModal.devis.id
        var ins = await db.from('fiches_passage').insert(ficheData).select().single()
        opErr = ins.error
      }
      if (opErr) { setMsg('Erreur: ' + opErr.message); setSavingFiche(false); return }
      if (!isEditing && ficheModal.devis) await avancerEtapeMin(ficheModal.devis.id, 'certificat')
      var html = buildFichePassageHtml(ficheForm, ficheModal.client, ficheNumero)
      ouvrirDocImprimable(html, 920, 1100)
      setFicheModal(null)
      setMsg(isEditing ? '✓ Fiche mise à jour — imprimez en PDF' : '✓ Fiche ' + ficheNumero + ' créée — imprimez en PDF')
    } catch(e) { setMsg('Erreur: ' + e.message) }
    setSavingFiche(false)
  }

  function renderFicheModal() {
    if (!ficheModal) return null
    var c = ficheModal.client
    var upd = function(field, val) { setFicheForm(function(prev) { return Object.assign({}, prev, { [field]: val }) }) }
    var updProd = function(key, val) { setFicheForm(function(prev) { return Object.assign({}, prev, { produits: Object.assign({}, prev.produits, { [key]: val }) }) }) }
    var toggleArr = function(field, val) { setFicheForm(function(prev) { var arr = prev[field] || []; var next = arr.includes(val) ? arr.filter(function(x) { return x !== val }) : arr.concat(val); return Object.assign({}, prev, { [field]: next }) }) }
    var inp2 = { width: '100%', padding: '7px 10px', border: '1.5px solid #e0ddd6', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
    var lbl2 = { display: 'block', fontSize: '10px', fontWeight: '700', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }
    var chkLbl = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#333', cursor: 'pointer', marginRight: '14px' }
    var chkStyle = { width: '14px', height: '14px', accentColor: '#0a2e1a', cursor: 'pointer' }

    var TYPES_PASSAGE = ['Contractuel', 'Occasionnel', 'Essai', 'Contrôle']
    var TYPES_PRESTA = ['Désinsectisation', 'Désinfection', 'Dératisation', 'Fumigation', 'Traitement phytosanitaire espèces verts']
    var NUISIBLES = ['Insectes rampants', 'Insectes volants', 'Rongeurs', 'Microbes']
    var PRODUITS_CATS = [
      { key: 'insecticides', label: 'Insecticides (Rampants / Volants)' },
      { key: 'raticides', label: 'Raticides (Rats / Souris)' },
      { key: 'desinfectants', label: 'Désinfectants (Bactéries, virus, champignons)' },
      { key: 'fumigants', label: 'Fumigants' },
      { key: 'phytosanitaires', label: 'Phytosanitaires (espèces vertes)' },
      { key: 'autres', label: 'Autres (à préciser)' },
    ]

    return React.createElement('div', {
      style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px' },
      onClick: function(e) { if (e.target === e.currentTarget) setFicheModal(null) }
    },
      React.createElement('div', { style: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '720px', marginTop: '20px', overflow: 'hidden' } },

        // Header
        React.createElement('div', { style: { background: '#0a2e1a', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          React.createElement('div', null,
            React.createElement('div', { style: { color: '#d4a920', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px' } }, 'Global Solutions Entreprise'),
            React.createElement('div', { style: { color: '#fff', fontSize: '16px', fontWeight: '700' } }, '📋 Nouvelle fiche de passage')
          ),
          React.createElement('button', { onClick: function() { setFicheModal(null) }, style: { background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' } }, '×')
        ),

        React.createElement('div', { style: { padding: '24px' } },

          // Client pré-rempli (lecture seule)
          React.createElement('div', { style: { background: '#f7f7f5', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#444' } },
            React.createElement('span', { style: { fontWeight: '700', color: '#0a2e1a' } }, 'Client : '),
            (c.prenom || '') + ' ' + c.nom + (c.entreprise ? ' — ' + c.entreprise : '') + (c.telephone ? ' · ' + c.telephone : '')
          ),

          // Adresse / Tel / Mob
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' } },
            React.createElement('div', { style: { gridColumn: '1/-1' } },
              React.createElement('label', { style: lbl2 }, 'Adresse'),
              React.createElement('input', { value: ficheForm.adresse || '', onChange: function(e) { upd('adresse', e.target.value) }, style: inp2 })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: lbl2 }, 'Téléphone'),
              React.createElement('input', { value: ficheForm.tel || '', onChange: function(e) { upd('tel', e.target.value) }, style: inp2 })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: lbl2 }, 'Mobile'),
              React.createElement('input', { value: ficheForm.mob || '', onChange: function(e) { upd('mob', e.target.value) }, style: inp2 })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: lbl2 }, 'Date de passage'),
              React.createElement('input', { type: 'date', value: ficheForm.datePassage || '', onChange: function(e) { upd('datePassage', e.target.value) }, style: inp2 })
            )
          ),

          // Type de passage
          React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('label', { style: lbl2 }, 'Type de passage'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' } },
              TYPES_PASSAGE.map(function(t) {
                return React.createElement('label', { key: t, style: chkLbl },
                  React.createElement('input', { type: 'radio', name: 'typePassage', value: t, checked: ficheForm.typePassage === t, onChange: function() { upd('typePassage', t) }, style: chkStyle }),
                  t
                )
              })
            )
          ),

          // Type de prestation
          React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('label', { style: lbl2 }, 'Type de prestation'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' } },
              TYPES_PRESTA.map(function(t) {
                return React.createElement('div', { key: t, style: Object.assign({}, chkLbl, { userSelect: 'none' }), onClick: function() { toggleArr('prestations', t) } },
                  React.createElement('input', { type: 'checkbox', checked: (ficheForm.prestations || []).includes(t), onChange: function() {}, style: chkStyle }),
                  t
                )
              })
            ),
            React.createElement('div', { style: { marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' } },
              React.createElement('span', { style: { fontSize: '12px', color: '#666' } }, 'Autres :'),
              React.createElement('input', { value: ficheForm.autresPrestation || '', onChange: function(e) { upd('autresPrestation', e.target.value) }, placeholder: 'préciser', style: Object.assign({}, inp2, { flex: 1 }) })
            )
          ),

          // Lieu
          React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('label', { style: lbl2 }, 'Lieu de prestation'),
            React.createElement('input', { value: ficheForm.lieuPrestation || '', onChange: function(e) { upd('lieuPrestation', e.target.value) }, style: inp2 })
          ),

          // Nuisibles
          React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('label', { style: lbl2 }, 'Nuisibles présents'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' } },
              NUISIBLES.map(function(n) {
                return React.createElement('div', { key: n, style: Object.assign({}, chkLbl, { userSelect: 'none' }), onClick: function() { toggleArr('nuisibles', n) } },
                  React.createElement('input', { type: 'checkbox', checked: (ficheForm.nuisibles || []).includes(n), onChange: function() {}, style: chkStyle }),
                  n
                )
              })
            ),
            React.createElement('div', { style: { marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' } },
              React.createElement('span', { style: { fontSize: '12px', color: '#666' } }, 'Autres :'),
              React.createElement('input', { value: ficheForm.autresNuisible || '', onChange: function(e) { upd('autresNuisible', e.target.value) }, placeholder: 'préciser', style: Object.assign({}, inp2, { flex: 1 }) })
            )
          ),

          // Produits phytopharmaceutiques
          React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('label', { style: lbl2 }, 'Produits phytopharmaceutiques appliqués'),
            React.createElement('div', { style: { background: '#f7f7f5', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '12px', marginTop: '6px' } },
              PRODUITS_CATS.map(function(cat) {
                var coched = (ficheForm.produitsCoches || []).includes(cat.key)
                return React.createElement('div', { key: cat.key, style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
                  React.createElement('input', { type: 'checkbox', checked: coched, onChange: function() { toggleArr('produitsCoches', cat.key) }, style: chkStyle }),
                  React.createElement('span', { style: { fontSize: '12px', color: '#444', minWidth: '260px' } }, cat.label),
                  React.createElement('input', { value: (ficheForm.produits || {})[cat.key] || '', onChange: function(e) { updProd(cat.key, e.target.value) }, placeholder: 'Nom du produit utilisé', style: Object.assign({}, inp2, { flex: 1, fontSize: '12px', padding: '5px 8px' }) })
                )
              })
            )
          ),

          // Durée
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' } },
            React.createElement('div', null,
              React.createElement('label', { style: lbl2 }, "Durée — début"),
              React.createElement('input', { value: ficheForm.dureeDebut || '', onChange: function(e) { upd('dureeDebut', e.target.value) }, placeholder: 'Ex: 08h00', style: inp2 })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: lbl2 }, 'Fin'),
              React.createElement('input', { value: ficheForm.dureeFin || '', onChange: function(e) { upd('dureeFin', e.target.value) }, placeholder: 'Ex: 11h30', style: inp2 })
            )
          ),

          // Remarques
          React.createElement('div', { style: { marginBottom: '20px' } },
            React.createElement('label', { style: lbl2 }, 'Remarques'),
            React.createElement('textarea', { value: ficheForm.remarques || '', onChange: function(e) { upd('remarques', e.target.value) }, rows: 3, style: Object.assign({}, inp2, { resize: 'vertical' }) })
          ),

          // Superviseur
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' } },
            React.createElement('div', null,
              React.createElement('label', { style: lbl2 }, 'Superviseur GSE — Nom & Prénom'),
              React.createElement('input', { value: ficheForm.superviseurNom || '', onChange: function(e) { upd('superviseurNom', e.target.value) }, style: inp2 })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: lbl2 }, 'Contact superviseur'),
              React.createElement('input', { value: ficheForm.superviseurContact || '', onChange: function(e) { upd('superviseurContact', e.target.value) }, style: inp2 })
            )
          ),

          // Boutons
          React.createElement('div', { style: { display: 'flex', gap: '10px' } },
            React.createElement('button', {
              onClick: saveFichePassage,
              disabled: savingFiche,
              style: { flex: 1, background: '#0a2e1a', color: '#fff', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '700', cursor: savingFiche ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: savingFiche ? 0.7 : 1 }
            }, savingFiche ? 'Enregistrement…' : '🖨️ Enregistrer & Imprimer la fiche'),
            React.createElement('button', { onClick: function() { setFicheModal(null) }, style: { background: '#fff', color: '#0a2e1a', border: '1px solid #0a2e1a', borderRadius: '8px', padding: '13px 20px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' } }, 'Annuler')
          )
        )
      )
    )
  }
  // ── FIN FICHES DE PASSAGE ──────────────────────────

  function imprimerDevis(d) {
    var nomClient = [d.clientPrenom, d.clientNom].filter(Boolean).join(" ")
    var dateStr = new Date().toLocaleDateString("fr-FR")
    var validiteDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString("fr-FR")
    var html = "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"><title>" + nomFichierDoc("Devis", d.numero, nomClient) + "</title><style>" +
      "* { box-sizing: border-box; margin: 0; padding: 0; }" +
      "body { font-family: Georgia, serif; background: #f5f5f0; }" +
      ".page { max-width: 780px; margin: 0 auto; background: #fff; }" +
      ".hdr { background: #0a2e1a; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; }" +
      ".hdr-left .sub { color: #d4a920; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 4px; }" +
      ".hdr-left .name { color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 0.03em; }" +
      ".hdr-right { text-align: right; }" +
      ".hdr-right .title { color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }" +
      ".hdr-right .ref { color: #d4a920; font-size: 12px; margin-top: 4px; }" +
      ".agr { background: #d4a920; padding: 5px 12px; font-size: 10px; color: #0a2e1a; font-weight: 700; letter-spacing: 0.06em; }" +
      ".body { padding: 36px 40px; }" +
      ".meta { display: flex; justify-content: space-between; margin-bottom: 28px; gap: 20px; }" +
      ".ml { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }" +
      ".mv { font-size: 14px; color: #0a2e1a; font-weight: 700; }" +
      ".ms { font-size: 12px; color: #666; margin-top: 2px; }" +
      ".sec { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #e8e6e0; padding-bottom: 6px; margin-bottom: 14px; }" +
      ".pbox { background: #f8f7f4; border: 1px solid #e8e6e0; border-left: 4px solid #d4a920; border-radius: 6px; padding: 18px 20px; margin-bottom: 24px; }" +
      ".pname { font-size: 17px; font-weight: 700; color: #0a2e1a; margin-bottom: 6px; }" +
      ".pdesc { font-size: 13px; color: #555; line-height: 1.6; }" +
      ".calc { margin-bottom: 24px; }" +
      ".cr { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #f0ede8; font-size: 13px; color: #444; }" +
      ".cr.remise { color: #065f46; }" +
      ".cr.total { border-top: 2px solid #0a2e1a; border-bottom: none; padding-top: 12px; margin-top: 4px; font-size: 17px; font-weight: 700; color: #0a2e1a; }" +
      ".valid { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; font-size: 12px; color: #92400e; margin-bottom: 28px; }" +
      ".sig-zone { border: 1px solid #ccc; border-radius: 6px; padding: 12px; min-height: 80px; }" +
      ".sig-title { font-size: 10px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }" +
      ".gse-footer { background: #f0ede6; border-top: 1px solid #e0ddd6; padding: 8px 28px; text-align: center; font-size: 10px; color: #888; line-height: 1.6; }" +
      ".noprint { text-align: center; padding: 16px; background: #f0fdf4; border-bottom: 1px solid #bbf7d0; }" +
      ".noprint button { background: #0a2e1a; color: #d4a920; border: none; border-radius: 6px; padding: 10px 28px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; margin: 4px; }" +
      ".noprint button.sec-btn { background: #fff; color: #0a2e1a; border: 1px solid #0a2e1a; }" +
      "@media print { .noprint { display: none; } .momo-block { display: none !important; } body { background: #fff; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { size: A4 portrait; margin: 7mm 10mm; } .page { max-width: 100%; } .hdr { padding: 8px 16px; } .hdr-left .name { font-size: 14px; } .agr { padding: 3px 8px; font-size: 8px; } .body { padding: 12px 18px; } .meta { margin-bottom: 12px; } .sec { margin-bottom: 8px; padding-bottom: 4px; } .pbox { padding: 10px 14px; margin-bottom: 12px; } .pname { font-size: 14px; } .pdesc { font-size: 11px; } .calc { margin-bottom: 12px; } .cr { padding: 5px 0; font-size: 11px; } .cr.total { font-size: 14px; } .valid { padding: 6px 10px; margin-bottom: 12px; font-size: 10px; } .sig-zone { min-height: 44px; padding: 6px; } .sig-title { font-size: 8px; } .gse-footer { padding: 4px 16px; font-size: 8px; } }" +
      "</style></head><body>" +
      "<div class=\"noprint\"><button onclick=\"window.print()\">🖨️ Imprimer</button><button class=\"sec-btn\" onclick=\"window.close()\">Fermer</button></div>" +
      "<div class=\"page\">" +
      gseHeader('DEVIS', 'Réf. ' + d.numero) +
      "<div class=\"body\">" +
      "<div class=\"meta\">" +
      "<div><div class=\"ml\">Client</div><div class=\"mv\">" + nomClient + "</div>" +
      (d.clientEntreprise ? "<div class=\"ms\">" + d.clientEntreprise + "</div>" : "") +
      (d.clientEmail ? "<div class=\"ms\">" + d.clientEmail + "</div>" : "") +
      (d.clientTelephone ? "<div class=\"ms\">" + d.clientTelephone + "</div>" : "") +
      "</div>" +
      "<div style=\"text-align:right\"><div class=\"ml\">Date d'émission</div><div class=\"mv\">" + dateStr + "</div><div class=\"ms\">Valide jusqu'au " + validiteDate + "</div></div>" +
      "</div>" +
      "<div class=\"sec\">Prestation(s)</div>" +
      (function() {
        var lignes = lignesFromDevis(d).filter(function(l) { return montantLigne(l) > 0 })
        if (lignes.length === 0) {
          return "<div class=\"pbox\"><div class=\"pname\">" + (d.prestation || "Prestation") + "</div>" + (d.description ? "<div class=\"pdesc\">" + d.description + "</div>" : "") + "</div>"
        }
        var rows = lignes.map(function(l) {
          var pm2 = parseFloat(l.prixM2) || 0
          var sup = parseFloat(l.superficie) || 0
          var montP = montantLigne(l)
          return "<tr>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:13px;color:#0a2e1a;font-weight:600\">" + (l.prestation || "") + "</td>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#555\">" + (l.secteur ? l.secteur : "—") + "</td>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#888;text-align:center\">" + (sup ? sup.toLocaleString("fr-FR") + " m²" : "—") + "</td>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#888;text-align:right\">" + pm2.toLocaleString("fr-FR") + " FCFA/m²</td>" +
            "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:13px;font-weight:700;color:#0a2e1a;text-align:right\">" + montP.toLocaleString("fr-FR") + " FCFA</td>" +
            "</tr>"
        }).join("")
        return "<div class=\"pbox\" style=\"padding:0;overflow:hidden\">" +
          "<table style=\"width:100%;border-collapse:collapse\">" +
          "<thead><tr style=\"background:#0a2e1a\">" +
          "<th style=\"padding:8px 10px;text-align:left;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Prestation</th>" +
          "<th style=\"padding:8px 10px;text-align:left;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Secteur</th>" +
          "<th style=\"padding:8px 10px;text-align:center;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Surface</th>" +
          "<th style=\"padding:8px 10px;text-align:right;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Prix/m²</th>" +
          "<th style=\"padding:8px 10px;text-align:right;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.06em\">Montant</th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table>" +
          (d.description ? "<div style=\"padding:10px 12px;font-size:12px;color:#555;border-top:1px solid #e8e6e0\">" + d.description + "</div>" : "") +
          "</div>"
      })() +
      "<div class=\"sec\">Détail financier</div>" +
      "<div class=\"calc\">" +
      "<div class=\"cr\"><span>Prix de base</span><span>" + Number(d.montantBrut).toLocaleString("fr-FR") + " FCFA</span></div>" +
      (d.remiseMontant > 0 ? "<div class=\"cr remise\"><span>Remise accordée (" + d.remiseLabel + ")</span><span>- " + d.remiseMontant.toLocaleString("fr-FR") + " FCFA</span></div>" : "") +
      "<div class=\"cr total\"><span>Montant total</span><span>" + Number(d.montantNet).toLocaleString("fr-FR") + " FCFA</span></div>" +
      "</div>" +
      (function() {
        var pA = d.pctAcompte || 60; var pS = 100 - pA
        var mA = Math.round(Number(d.montantNet) * pA / 100); var mS = Math.round(Number(d.montantNet) * pS / 100)
        return "<div class=\"sec\" style=\"margin-top:20px\">Modalités de paiement</div>" +
          "<div style=\"background:#f0fdf4;border:1px solid #d1fae5;border-radius:6px;padding:14px 18px;margin-bottom:18px;font-size:13px;color:#065f46\">" +
          "<div style=\"display:flex;justify-content:space-between;margin-bottom:8px\"><span><strong>" + pA + "% à la signature</strong> — acompte</span><span style=\"font-weight:700\">" + mA.toLocaleString("fr-FR") + " FCFA</span></div>" +
          "<div style=\"display:flex;justify-content:space-between\"><span><strong>" + pS + "% après prestation</strong> — solde</span><span style=\"font-weight:700\">" + mS.toLocaleString("fr-FR") + " FCFA</span></div>" +
          (d.conditionsPaiement ? "<div style=\"margin-top:10px;font-size:12px;color:#374151;border-top:1px solid #d1fae5;padding-top:10px\">" + d.conditionsPaiement + "</div>" : "") +
          "</div>"
      })() +
      (function() {
        var pA2 = d.pctAcompte || 60
        var mA2 = Math.round(Number(d.montantNet) * pA2 / 100)
        return "<div class=\"momo-block\" style=\"background:#fff8e1;border:1.5px solid #fde68a;border-radius:8px;padding:18px 20px;margin-bottom:18px;\">" +
          "<div style=\"font-size:10px;color:#b45309;font-weight:700;letter-spacing:0.12em;margin-bottom:12px;\">PAIEMENT PAR MOBILE MONEY</div>" +
          "<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:12px;\">" +
          "<div style=\"width:40px;height:40px;background:#ffcc00;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;\">📱</div>" +
          "<div><div style=\"font-size:14px;font-weight:700;color:#111;\">MTN MoMo Pay</div>" +
          "<div style=\"font-size:12px;color:#888;\">Réglez votre acompte de <strong>" + mA2.toLocaleString("fr-FR") + " FCFA</strong> instantanément depuis votre téléphone MTN</div></div></div>" +
          "<div style=\"background:#fff;border:1.5px solid #ffe082;border-radius:6px;padding:12px 14px;margin-bottom:8px;\">" +
          "<div style=\"font-size:10px;color:#b45309;font-weight:700;letter-spacing:0.1em;margin-bottom:6px;\">CODE USSD — COMPOSEZ :</div>" +
          "<div style=\"font-size:18px;font-weight:700;color:#111;letter-spacing:0.04em;font-family:monospace;\">*880*41*893118*<span style=\"color:#b45309;\">" + mA2.toLocaleString("fr-FR") + "</span>#</div></div>" +
          "<div style=\"font-size:11px;color:#888;line-height:1.6;\">Composez ce code depuis votre téléphone MTN, validez le paiement, puis envoyez la capture à GSE pour confirmation.</div>" +
          "</div>"
      })() +
      "<div class=\"valid\">Ce devis est valable 30 jours · Global Solutions Entreprise · contact@phyto-benin.com</div>" +
      gseSigs() +
      "</div>" +
      gseFooter() +
      "</div></body></html>"
    ouvrirDocImprimable(html, 820, 900)
  }

  function renduDevis(d) {
    var st = STATUTS[d.statut] || { label: d.statut, c: "#444", bg: "#f0f0f0" }
    var cl = d.clients
    var clientObj = cl || clients.find(function(c) { return c.id === d.client_id })
    return React.createElement("div", { key: d.id, style: { backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", padding: "16px 20px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" } },
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" } },
          React.createElement("span", { style: { fontSize: "11px", fontWeight: "700", color: "#d4a920" } }, d.numero),
          React.createElement("span", { style: { padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "600", backgroundColor: st.bg, color: st.c } }, st.label),
          d.remise_bienvenue > 0 && React.createElement("span", { style: { backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "20px" } }, "−10%")
        ),
        React.createElement("div", { style: { fontSize: "14px", fontWeight: "600", color: "#0a2e1a", marginBottom: "2px" } }, d.prestation),
        cl && React.createElement("div", { style: { fontSize: "12px", color: "#888" } }, [(cl.prenom || ""), cl.nom].filter(Boolean).join(" ") + (cl.entreprise ? " — " + cl.entreprise : "")),
        d.statut === "modification_demandee" && React.createElement("div", { style: { marginTop: "6px", padding: "6px 10px", backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "6px", fontSize: "11px", color: "#6b21a8" } },
          React.createElement("strong", null, "⚠ Modification : "), d.notes_modification
        )
      ),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", marginLeft: "20px" } },
        React.createElement("div", { style: { fontSize: "16px", fontWeight: "700", color: "#0a2e1a" } }, Number(d.montant_total).toLocaleString("fr-FR") + " FCFA"),
        React.createElement("div", { style: { fontSize: "11px", color: "#bbb" } }, new Date(d.created_at).toLocaleDateString("fr-FR")),
        React.createElement("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" } },
          clientObj && React.createElement("button", { onClick: function() { voirDevisClient(clientObj) }, style: { backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "📊 Dashboard"),
          d.statut === "en_cours" && React.createElement("button", { onClick: function() { validerLivraison(d.id) }, disabled: validating === d.id, style: { backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, validating === d.id ? "..." : "✓ Valider"),
          d.statut === "modification_demandee"
            ? React.createElement("button", { onClick: function() { ouvrirEditionDevis(d) }, style: { backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "✏️ Modifier")
            : React.createElement("button", { onClick: function() { ouvrirEditionDevis(d) }, style: { background: "none", border: "1px solid #d1d5db", color: "#374151", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "✏️"),
          cl && cl.email && React.createElement("button", { onClick: function() { renvoyerEmail(d) }, style: { background: "none", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "✉"),
          React.createElement("button", { onClick: function() { supprimerDevis(d.id, d.numero) }, style: { background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "🗑")
        )
      )
    )
  }

  var filtresDevis = vue === "devis-client"
    ? devisList.filter(function(d) { return d.client_id === (clientDetail && clientDetail.id) })
    : devisList.filter(function(d) { return filtre === "tous" || d.statut === filtre })

  function renderCompteurs() {
    return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "24px" } },
      [["Clients", clients.length, "#0a2e1a"], ["Envoyés", devisList.filter(function(d) { return d.statut === "envoye" }).length, "#1e40af"], ["En cours", devisList.filter(function(d) { return d.statut === "en_cours" }).length, "#0f766e"], ["Terminés", devisList.filter(function(d) { return d.statut === "termine" }).length, "#555"]].map(function(s) {
        return React.createElement("div", { key: s[0], style: { backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", padding: "18px", borderTop: "3px solid " + s[2] } },
          React.createElement("div", { style: { fontSize: "28px", fontWeight: "300", color: s[2] } }, s[1]),
          React.createElement("div", { style: { fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "4px" } }, s[0])
        )
      })
    )
  }

  // Export CSV du pipeline — récupère le tableau aplati depuis le GET par défaut de
  // /api/crm-data (calculs centralisés côté serveur, aucune duplication de logique).
  async function exporterCSV() {
    try {
      setMsg("")
      var sess = await db.auth.getSession()
      var token = (sess.data.session && sess.data.session.access_token) || ""
      var r = await fetch("/api/crm-data", { headers: { "Authorization": "Bearer " + token } })
      if (!r.ok) { setMsg("Erreur export CSV"); return }
      var data = await r.json()
      var rows = data.clients || []
      var stLabels = { contact: "Premier contact", devis: "Devis envoyé", attente: "En attente", relance: "Relance", converti: "Converti / Facturé", echec: "Échec / Perdu" }
      var hdrs = ["N°", "Client", "Provenance", "Type prestation", "Catégorie", "Zone", "Date contact", "Date devis", "Montant devis", "Statut", "Motif échec", "Attestation", "Date facture", "Montant facturé", "Paiements reçus", "Dépenses liées", "Commentaire"]
      var lignes = rows.map(function(c, i) {
        return [i + 1, c.client, c.provenance, c.typePrestation || "", c.categorie || "", c.zone || "", c.dateContact || "", c.dateDevis, c.montantDevis, (stLabels[c.statut] || c.statut || ""), c.motifEchec || "", c.attestation === "envoye" ? "Envoyé" : "Non", c.dateFacture, c.montantFacture, c.paiementsRecus, c.depenses, c.commentaire]
      })
      var csv = [hdrs].concat(lignes).map(function(row) {
        return row.map(function(v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"' }).join(",")
      }).join("\n")
      var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
      var url = URL.createObjectURL(blob)
      var a = document.createElement("a")
      a.href = url
      a.download = "GSE_Pipeline_" + new Date().toISOString().slice(0, 10) + ".csv"
      a.click()
      URL.revokeObjectURL(url)
      setMsg("Export CSV téléchargé")
    } catch (e) { setMsg("Erreur export CSV") }
  }

  // ── G2 : Vue Finances + dépenses ───────────────────────────────────────────
  var DEP_CATS = [
    { key: "prestataire", label: "🧑‍🔧 Prestataire" },
    { key: "transport", label: "🚗 Transport" },
    { key: "produits", label: "🧪 Produits" },
    { key: "materiels", label: "🔧 Matériels" },
    { key: "autre", label: "📌 Autre" },
  ]
  var ST_META = {
    contact: { label: "Premier contact", bg: "#FAEEDA", tc: "#633806" },
    devis: { label: "Devis envoyé", bg: "#E6F1FB", tc: "#0C447C" },
    attente: { label: "En attente", bg: "#FFF0C4", tc: "#412402" },
    relance: { label: "Relance", bg: "#FBEAF0", tc: "#72243E" },
    converti: { label: "Converti / Facturé", bg: "#E1F5EE", tc: "#04342C" },
    echec: { label: "Échec / Perdu", bg: "#F1EFE8", tc: "#2C2C2A" },
  }
  var FREQ_MOIS = { mensuelle: 1, bimestrielle: 2, trimestrielle: 3, semestrielle: 6, annuelle: 12 }
  var FREQ_LABEL = { mensuelle: "Mensuelle", bimestrielle: "Bimestrielle", trimestrielle: "Trimestrielle", semestrielle: "Semestrielle", annuelle: "Annuelle" }
  function finFmt(n) { return Math.round(n || 0).toLocaleString("fr-FR") }
  function finFmtD(d) { return d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" }) : "—" }
  function finFreqMois(k) { return FREQ_MOIS[k] || 3 }
  function finInterventionDates(c) {
    if (c.typeContrat !== "contrat" || !c.dateDebutContrat) return []
    var start = new Date(c.dateDebutContrat + "T00:00:00")
    var duree = c.dureeContratMois || 12
    var freq = finFreqMois(c.frequenceIntervention)
    var dates = []
    for (var i = 0; i < duree; i += freq) {
      var d = new Date(start)
      d.setMonth(d.getMonth() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }
  function finNextIntervention(c) {
    var today = new Date(); today.setHours(0, 0, 0, 0)
    return finInterventionDates(c).find(function(d) { return new Date(d + "T00:00:00") >= today }) || null
  }
  function finMontantParInter(c) {
    var freq = finFreqMois(c.frequenceIntervention)
    var nb = (c.dureeContratMois || 12) / freq
    return Math.round((c.montantDevis || 0) / nb)
  }

  async function chargerFinances() {
    setFinLoading(true)
    try {
      var sess = await db.auth.getSession()
      var token = (sess.data.session && sess.data.session.access_token) || ""
      var r = await fetch("/api/crm-data", { headers: { "Authorization": "Bearer " + token } })
      var data = await r.json()
      setFinData({ clients: data.clients || [], depenses: data.depenses || [] })
    } catch (e) { setFinData({ clients: [], depenses: [] }) }
    setFinLoading(false)
  }
  function openDepModal() {
    setDepForm({ categorie: "autre", libelle: "", montant: "", date: new Date().toISOString().slice(0, 10) })
    setDepModal(true)
  }
  async function ajouterDepense() {
    var libelle = (depForm.libelle || "").trim()
    var montant = parseFloat(depForm.montant) || 0
    if (!libelle || !montant) { setMsg("Erreur : libellé et montant requis."); return }
    setDepSaving(true)
    try {
      var sess = await db.auth.getSession()
      var token = (sess.data.session && sess.data.session.access_token) || ""
      await fetch("/api/crm-data", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify({ action: "add_depense", libelle: libelle, montant: montant, date: depForm.date || null, categorie: depForm.categorie || "autre" }) })
      setDepModal(false)
      await chargerFinances()
      setMsg("Dépense enregistrée")
    } catch (e) { setMsg("Erreur enregistrement dépense") }
    setDepSaving(false)
  }
  async function supprimerDepense(id) {
    if (!confirm("Supprimer cette dépense ?")) return
    try {
      var sess = await db.auth.getSession()
      var token = (sess.data.session && sess.data.session.access_token) || ""
      await fetch("/api/crm-data", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify({ action: "del_depense", id: id }) })
      await chargerFinances()
      setMsg("Dépense supprimée")
    } catch (e) { setMsg("Erreur suppression") }
  }

  // ── Déplacement unifié : une carte = une `etape` (source de vérité) ────────
  // Écrit `etape` + parcours cohérent (voir action "move" API). Avancer pose les
  // coches d'exécution ; reculer les retire → plus de déplacement « sans effet ».
  async function deplacerCarte(devisId, newEtape) {
    if (!newEtape) return
    var idx = ETAPE_IDS.indexOf(newEtape)
    var crm = ETAPE_CRM[newEtape] || "contact"
    var parcours = idx >= 0 ? parcoursForEtape(newEtape) : {}
    // Optimiste : colUnifiee lit devisMap[c.id].etape → MAJ devisList d'abord.
    setDevisList(function(prev) { return (prev || []).map(function(d) { return d.id === devisId ? Object.assign({}, d, { etape: newEtape, parcours: parcours }) : d }) })
    setFinData(function(prev) {
      if (!prev) return prev
      return Object.assign({}, prev, { clients: (prev.clients || []).map(function(c) {
        if (c.id !== devisId) return c
        var pr = idx >= 8 ? (c.montantFacture || c.montantDevis || 0) : (idx >= 3 ? c.paiementsRecus : 0)
        return Object.assign({}, c, { statut: crm, paiementsRecus: pr })
      }) })
    })
    setMsg("Déplacé : " + (ETAPE_LABEL[newEtape] || newEtape))
    try {
      var sess = await db.auth.getSession()
      var token = (sess.data.session && sess.data.session.access_token) || ""
      await fetch("/api/crm-data", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify({ action: "move", id: devisId, etape: newEtape }) })
    } catch (e) { setMsg("Erreur déplacement") }
  }
  function ouvrirDossierCommercial(devisId) {
    var d = devisList.find(function(x) { return x.id === devisId })
    if (!d) { setVue("devis"); return }
    var cl = d.clients || clients.find(function(c) { return c.id === d.client_id })
    if (cl) { setClientDetail(cl); setVue("devis-client") } else { setVue("devis") }
  }

  function openObjModal() {
    setObjInput(objectifCA ? String(objectifCA) : "")
    setObjModal(true)
  }
  async function enregistrerObjectif() {
    var val = parseFloat(objInput) || 0
    setObjSaving(true)
    try {
      await db.from("parametres").upsert({ cle: "objectif_ca", valeur: String(val) }, { onConflict: "cle" })
      setObjectifCA(val)
      setObjModal(false)
      setMsg("Objectif CA enregistré")
    } catch (e) { setMsg("Erreur enregistrement objectif") }
    setObjSaving(false)
  }
  function renderObjModal() {
    if (!objModal) return null
    var e = React.createElement
    var inpS = { width: "100%", padding: "9px 11px", border: "1px solid #d8d5cc", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }
    return e("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }, onClick: function() { setObjModal(false) } },
      e("div", { onClick: function(ev) { ev.stopPropagation() }, style: { background: "#fff", borderRadius: "12px", padding: "24px", width: "420px", maxWidth: "92vw" } },
        e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" } },
          e("h3", { style: { margin: 0, fontSize: "16px", fontWeight: "700", color: "#111" } }, "Objectif CA annuel"),
          e("button", { onClick: function() { setObjModal(false) }, style: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" } }, "×")
        ),
        e("label", { style: { display: "block", fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "5px" } }, "Objectif de chiffre d'affaires annuel (FCFA)"),
        e("input", { type: "number", min: "0", value: objInput, placeholder: "Ex: 2000000", onChange: function(ev) { setObjInput(ev.target.value) }, style: inpS }),
        e("p", { style: { fontSize: "11px", color: "#999", margin: "6px 0 20px" } }, "Utilisé pour afficher votre taux de progression."),
        e("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px" } },
          e("button", { onClick: function() { setObjModal(false) }, style: { padding: "9px 16px", border: "1px solid #e0ddd6", background: "none", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", color: "#555" } }, "Annuler"),
          e("button", { onClick: enregistrerObjectif, disabled: objSaving, style: { padding: "9px 18px", border: "none", background: "#0a2e1a", color: "#d4a920", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: objSaving ? "wait" : "pointer", fontFamily: "inherit" } }, objSaving ? "Enregistrement…" : "Enregistrer")
        )
      )
    )
  }

  function renderDepModal() {
    if (!depModal) return null
    var e = React.createElement
    var inpS = { width: "100%", padding: "9px 11px", border: "1px solid #d8d5cc", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }
    var lblS = { display: "block", fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "5px" }
    return e("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }, onClick: function() { setDepModal(false) } },
      e("div", { onClick: function(ev) { ev.stopPropagation() }, style: { background: "#fff", borderRadius: "12px", padding: "24px", width: "440px", maxWidth: "92vw" } },
        e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" } },
          e("h3", { style: { margin: 0, fontSize: "16px", fontWeight: "700", color: "#111" } }, "Nouvelle dépense générale"),
          e("button", { onClick: function() { setDepModal(false) }, style: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" } }, "×")
        ),
        e("div", { style: { marginBottom: "12px" } },
          e("label", { style: lblS }, "Catégorie"),
          e("select", { value: depForm.categorie, onChange: function(ev) { var v = ev.target.value; setDepForm(function(p) { return Object.assign({}, p, { categorie: v }) }) }, style: Object.assign({}, inpS, { cursor: "pointer" }) },
            DEP_CATS.map(function(c) { return e("option", { key: c.key, value: c.key }, c.label) })
          )
        ),
        e("div", { style: { marginBottom: "12px" } },
          e("label", { style: lblS }, "Libellé"),
          e("input", { type: "text", value: depForm.libelle, placeholder: "Ex: Carburant Cotonou, Perméthrine 5L…", onChange: function(ev) { var v = ev.target.value; setDepForm(function(p) { return Object.assign({}, p, { libelle: v }) }) }, style: inpS })
        ),
        e("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" } },
          e("div", null,
            e("label", { style: lblS }, "Montant (FCFA)"),
            e("input", { type: "number", min: "0", value: depForm.montant, onChange: function(ev) { var v = ev.target.value; setDepForm(function(p) { return Object.assign({}, p, { montant: v }) }) }, style: inpS })
          ),
          e("div", null,
            e("label", { style: lblS }, "Date"),
            e("input", { type: "date", value: depForm.date, onChange: function(ev) { var v = ev.target.value; setDepForm(function(p) { return Object.assign({}, p, { date: v }) }) }, style: inpS })
          )
        ),
        e("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px" } },
          e("button", { onClick: function() { setDepModal(false) }, style: { padding: "9px 16px", border: "1px solid #e0ddd6", background: "none", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", color: "#555" } }, "Annuler"),
          e("button", { onClick: ajouterDepense, disabled: depSaving, style: { padding: "9px 18px", border: "none", background: "#0a2e1a", color: "#d4a920", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: depSaving ? "wait" : "pointer", fontFamily: "inherit" } }, depSaving ? "Enregistrement…" : "Enregistrer")
        )
      )
    )
  }

  function renderVueFinances() {
    var e = React.createElement
    if (finLoading || !finData) return e("div", { style: { padding: "40px", textAlign: "center", color: "#888", fontSize: "13px" } }, "Chargement des finances…")
    var cls = finData.clients || []
    var depGlob = finData.depenses || []
    var tp = cls.reduce(function(s, c) { return s + (c.paiementsRecus || 0) }, 0)
    var tdc = cls.reduce(function(s, c) { return s + (c.depenses || 0) }, 0)
    var tdp = cls.reduce(function(s, c) { return s + (c.depensesPrestataires || 0) }, 0)
    var tdg = depGlob.reduce(function(s, d) { return s + (d.montant || 0) }, 0)
    var td = tdc + tdp + tdg
    var tf = cls.reduce(function(s, c) { return s + (c.montantDevis || 0) }, 0)
    var tfa = cls.reduce(function(s, c) { return s + (c.montantFacture || 0) }, 0)
    var r = tp - td // Résultat net = encaissé (réellement reçu) − dépenses, pour que les 3 KPIs se réconcilient (facturé ≠ encaissé)

    var thS = { textAlign: "left", padding: "8px 10px", fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e8e6e0", whiteSpace: "nowrap" }
    var tdS = { padding: "8px 10px", fontSize: "12px", borderBottom: "1px solid #f0efe9", whiteSpace: "nowrap" }
    var secS = { fontSize: "13px", fontWeight: "700", color: "#0a2e1a", margin: "0 0 12px" }
    function kpiCard(lbl, val, color) {
      return e("div", { style: { flex: 1, background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "16px" } },
        e("div", { style: { fontSize: "11px", color: "#888", marginBottom: "6px" } }, lbl),
        e("div", { style: { fontSize: "22px", fontWeight: "700", color: color } }, val)
      )
    }

    var maxV = Math.max(tf, tfa, tp, td, 1)
    var barsData = [["Devis total", tf, "#85B7EB"], ["Facturé", tfa, "#5DCAA5"], ["Encaissé", tp, "#1D9E75"], ["Dépenses", td, "#E24B4A"]]

    var contrats = cls.filter(function(c) { return c.typeContrat === "contrat" && c.statut !== "echec" })
    var recurringBlock
    if (!contrats.length) {
      recurringBlock = e("div", { style: { padding: "18px", background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", color: "#888", textAlign: "center", fontSize: "13px" } }, "Aucun contrat récurrent — ouvrez une fiche client et choisissez « Contrat récurrent ».")
    } else {
      var today = new Date()
      var months = []
      for (var mi = 0; mi < 12; mi++) { var dm = new Date(today.getFullYear(), today.getMonth() + mi, 1); months.push({ ym: dm.toISOString().slice(0, 7), label: dm.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }) }) }
      var mCA = months.map(function(m) { return contrats.reduce(function(s, c) { var mpi = finMontantParInter(c); var hit = finInterventionDates(c).some(function(d) { return d.slice(0, 7) === m.ym }); return s + (hit ? mpi : 0) }, 0) })
      var totalCA = mCA.reduce(function(a, b) { return a + b }, 0)
      var caAn = contrats.reduce(function(s, c) { return s + (c.montantDevis || 0) }, 0)
      recurringBlock = e("div", null,
        e("div", { style: { display: "flex", gap: "24px", flexWrap: "wrap", background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "16px", marginBottom: "14px" } },
          e("div", null, e("div", { style: { fontSize: "11px", color: "#888" } }, "CA récurrent total"), e("div", { style: { fontSize: "18px", fontWeight: "700", color: "#1a6b38" } }, finFmt(caAn) + " FCFA")),
          e("div", null, e("div", { style: { fontSize: "11px", color: "#888" } }, "Projection 12 mois"), e("div", { style: { fontSize: "18px", fontWeight: "700", color: "#185FA5" } }, finFmt(totalCA) + " FCFA")),
          e("div", null, e("div", { style: { fontSize: "11px", color: "#888" } }, "Contrats actifs"), e("div", { style: { fontSize: "18px", fontWeight: "700" } }, contrats.length))
        ),
        e("div", { style: { overflowX: "auto", background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px" } },
          e("table", { style: { width: "100%", borderCollapse: "collapse" } },
            e("thead", null, e("tr", null,
              e("th", { style: thS }, "Client"), e("th", { style: thS }, "Fréquence"), e("th", { style: thS }, "Montant/inter."),
              months.map(function(m) { return e("th", { key: m.ym, style: Object.assign({}, thS, { textAlign: "center", minWidth: "52px" }) }, m.label) })
            )),
            e("tbody", null,
              contrats.map(function(c) {
                var mpi = finMontantParInter(c); var ni = finNextIntervention(c)
                return e("tr", { key: c.id || c.client },
                  e("td", { style: Object.assign({}, tdS, { fontWeight: "600" }) }, c.client, ni ? e("div", { style: { fontSize: "10px", color: "#999", fontWeight: "400" } }, "Prochain : " + finFmtD(ni)) : null),
                  e("td", { style: Object.assign({}, tdS, { fontSize: "12px" }) }, FREQ_LABEL[c.frequenceIntervention] || "Trimestrielle"),
                  e("td", { style: Object.assign({}, tdS, { color: "#1a6b38", fontWeight: "500" }) }, finFmt(mpi)),
                  months.map(function(m) {
                    var hit = finInterventionDates(c).some(function(d) { return d.slice(0, 7) === m.ym })
                    return e("td", { key: m.ym, style: Object.assign({}, tdS, { textAlign: "center", background: hit ? "rgba(29,158,117,0.09)" : "transparent", color: hit ? "#1a6b38" : "#ccc", fontWeight: hit ? "600" : "400" }) }, hit ? finFmt(mpi) : "·")
                  })
                )
              }),
              e("tr", { style: { fontWeight: "600", borderTop: "2px solid #e0ddd6" } },
                e("td", { style: Object.assign({}, tdS, { color: "#555" }), colSpan: 3 }, "CA récurrent mensuel"),
                mCA.map(function(v, idx) { return e("td", { key: idx, style: Object.assign({}, tdS, { textAlign: "center", color: v > 0 ? "#1a6b38" : "#ccc" }) }, v > 0 ? finFmt(v) : "—") })
              )
            )
          )
        )
      )
    }

    var objPct = objectifCA > 0 ? Math.round(tfa / objectifCA * 100) : 0
    var objCard = objectifCA > 0
      ? e("div", { style: { background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "16px 18px", marginBottom: "24px" } },
          e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
            e("div", null,
              e("span", { style: { fontSize: "12px", color: "#888" } }, "Objectif CA annuel : "),
              e("span", { style: { fontSize: "15px", fontWeight: "700", color: "#0a2e1a" } }, finFmt(objectifCA) + " FCFA")
            ),
            e("button", { onClick: openObjModal, style: { background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "Modifier")
          ),
          e("div", { style: { background: "#f0efe9", borderRadius: "5px", height: "18px", overflow: "hidden", marginBottom: "6px" } },
            e("div", { style: { width: Math.min(objPct, 100) + "%", background: objPct >= 100 ? "#1D9E75" : "#185FA5", height: "100%" } })
          ),
          e("div", { style: { fontSize: "12px", color: "#555" } }, "Facturé " + finFmt(tfa) + " FCFA — atteint à ", e("b", { style: { color: objPct >= 100 ? "#1D9E75" : "#185FA5" } }, objPct + "%"))
        )
      : e("div", { style: { background: "#fafaf8", border: "1px dashed #d8d5cc", borderRadius: "10px", padding: "14px 18px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" } },
          e("span", { style: { fontSize: "12px", color: "#888" } }, "Aucun objectif de chiffre d'affaires défini."),
          e("button", { onClick: openObjModal, style: { background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "🎯 Définir un objectif CA")
        )

    return e("div", null,
      renderDepModal(),
      renderObjModal(),
      e("div", { style: { display: "flex", gap: "12px", marginBottom: "24px" } },
        kpiCard("Encaissements clients", finFmt(tp) + " FCFA", "#1D9E75"),
        kpiCard("Total dépenses", finFmt(td) + " FCFA", "#E24B4A"),
        kpiCard("Résultat net", (r >= 0 ? "+" : "") + finFmt(r) + " FCFA", r >= 0 ? "#1D9E75" : "#E24B4A")
      ),
      objCard,
      e("div", { style: secS }, "Suivi financier par client"),
      e("div", { style: { overflowX: "auto", background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", marginBottom: "24px" } },
        e("table", { style: { width: "100%", borderCollapse: "collapse" } },
          e("thead", null, e("tr", null, ["Client", "Statut", "Devis", "Facturé", "Reçu", "Dépenses", "Résultat"].map(function(hh) { return e("th", { key: hh, style: thS }, hh) }))),
          e("tbody", null, cls.map(function(c) {
            var meta = ST_META[c.statut] || ST_META.contact
            var depTotal = (c.depenses || 0) + (c.depensesPrestataires || 0)
            var res = (c.paiementsRecus || 0) - depTotal
            return e("tr", { key: c.id || c.client },
              e("td", { style: Object.assign({}, tdS, { fontWeight: "500" }) }, c.client),
              e("td", { style: tdS }, e("span", { style: { background: meta.bg, color: meta.tc, borderRadius: "20px", padding: "2px 8px", fontSize: "11px", fontWeight: "600" } }, meta.label)),
              e("td", { style: tdS }, finFmt(c.montantDevis)),
              e("td", { style: Object.assign({}, tdS, { color: c.montantFacture ? "#1D9E75" : "#bbb" }) }, c.montantFacture ? finFmt(c.montantFacture) : "—"),
              e("td", { style: Object.assign({}, tdS, { color: c.paiementsRecus ? "#1D9E75" : "#bbb" }) }, c.paiementsRecus ? finFmt(c.paiementsRecus) : "—"),
              e("td", { style: Object.assign({}, tdS, { color: depTotal ? "#E24B4A" : "#bbb" }) }, depTotal ? finFmt(depTotal) : "—"),
              e("td", { style: Object.assign({}, tdS, { fontWeight: "500", color: res > 0 ? "#1D9E75" : res < 0 ? "#E24B4A" : "#bbb" }) }, res === 0 ? "—" : (res > 0 ? "+" : "") + finFmt(res))
            )
          }))
        )
      ),
      e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
        e("div", { style: Object.assign({}, secS, { margin: 0 }) }, "Dépenses générales"),
        e("button", { onClick: openDepModal, style: { background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "+ Ajouter")
      ),
      e("div", { style: { overflowX: "auto", background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", marginBottom: "24px" } },
        e("table", { style: { width: "100%", borderCollapse: "collapse" } },
          e("thead", null, e("tr", null, ["Catégorie", "Libellé", "Date", "Montant", ""].map(function(hh, i) { return e("th", { key: i, style: thS }, hh) }))),
          e("tbody", null,
            depGlob.map(function(d) {
              var cat = DEP_CATS.find(function(x) { return x.key === d.categorie }) || DEP_CATS[4]
              return e("tr", { key: d.id },
                e("td", { style: tdS }, cat.label),
                e("td", { style: Object.assign({}, tdS, { whiteSpace: "normal" }) }, d.libelle),
                e("td", { style: tdS }, finFmtD(d.date)),
                e("td", { style: Object.assign({}, tdS, { color: "#E24B4A", fontWeight: "500" }) }, finFmt(d.montant) + " FCFA"),
                e("td", { style: tdS }, e("button", { onClick: function() { supprimerDepense(d.id) }, style: { background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "🗑"))
              )
            }),
            depGlob.length === 0 ? e("tr", null, e("td", { style: Object.assign({}, tdS, { color: "#999", textAlign: "center" }), colSpan: 5 }, "Aucune dépense générale.")) : null,
            e("tr", { style: { fontWeight: "600" } }, e("td", { style: Object.assign({}, tdS, { fontWeight: "600" }), colSpan: 3 }, "Total"), e("td", { style: Object.assign({}, tdS, { color: "#E24B4A", fontWeight: "600" }) }, finFmt(tdg) + " FCFA"), e("td", { style: tdS }, ""))
          )
        )
      ),
      e("div", { style: secS }, "Vue d'ensemble"),
      e("div", { style: { background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "18px", marginBottom: "24px" } },
        barsData.map(function(b) {
          return e("div", { key: b[0], style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" } },
            e("div", { style: { width: "110px", fontSize: "12px", color: "#555" } }, b[0]),
            e("div", { style: { flex: 1, background: "#f0efe9", borderRadius: "5px", height: "22px", overflow: "hidden" } }, e("div", { style: { width: Math.round(b[1] / maxV * 100) + "%", background: b[2], height: "100%" } })),
            e("div", { style: { width: "140px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#333" } }, finFmt(b[1]) + " FCFA")
          )
        })
      ),
      e("div", { style: secS }, "Contrats récurrents"),
      recurringBlock
    )
  }

  // ── G1a : Vue Analyse — KPIs analytiques + insights (hors graphes) ──────────
  function renderVueAnalyse() {
    var e = React.createElement
    if (finLoading || !finData) return e("div", { style: { padding: "40px", textAlign: "center", color: "#888", fontSize: "13px" } }, "Chargement de l'analyse…")
    var cls = finData.clients || []
    var depGlob = finData.depenses || []
    var total = cls.length
    var conv = cls.filter(function(c) { return c.statut === "converti" })
    var echecs = cls.filter(function(c) { return c.statut === "echec" })
    var actifs = cls.filter(function(c) { return c.statut !== "converti" && c.statut !== "echec" })
    var txConv = total ? Math.round(conv.length / total * 100) : 0
    var txEchec = total ? Math.round(echecs.length / total * 100) : 0
    var totalDevis = cls.reduce(function(s, c) { return s + (c.montantDevis || 0) }, 0)
    var totalFacture = cls.reduce(function(s, c) { return s + (c.montantFacture || 0) }, 0)
    var totalEncaisse = cls.reduce(function(s, c) { return s + (c.paiementsRecus || 0) }, 0)
    var txRecouvr = totalFacture ? Math.round(totalEncaisse / totalFacture * 100) : 100
    var wt = { contact: 0.10, devis: 0.30, attente: 0.40, relance: 0.20, converti: 1, echec: 0 }
    var pipeW = cls.reduce(function(s, c) { return s + (c.montantDevis || 0) * (wt[c.statut] || 0) }, 0)
    var convF = conv.filter(function(c) { return c.dateDevis && c.dateFacture })
    var delaiDF = convF.length ? Math.round(convF.reduce(function(s, c) { return s + (new Date(c.dateFacture) - new Date(c.dateDevis)) / 864e5 }, 0) / convF.length) : null
    var delaiAll = cls.filter(function(c) { return c.dateContact && c.dateDevis })
    var delaiMoyenContact = delaiAll.length ? Math.round(delaiAll.reduce(function(s, c) { return s + (new Date(c.dateDevis) - new Date(c.dateContact)) / 864e5 }, 0) / delaiAll.length) : null
    var bySrc = {}
    cls.forEach(function(c) { var k = c.provenance || "—"; if (!bySrc[k]) bySrc[k] = { count: 0, montant: 0, conv: 0 }; bySrc[k].count++; bySrc[k].montant += (c.montantDevis || 0); if (c.statut === "converti") bySrc[k].conv++ })
    var srcList = Object.entries(bySrc).sort(function(a, b) { return b[1].montant - a[1].montant })
    var maxSrcMontant = Math.max.apply(null, srcList.map(function(s) { return s[1].montant }).concat([1]))
    var byPrest = {}
    cls.forEach(function(c) { var k = c.typePrestation || "Non renseigné"; if (!byPrest[k]) byPrest[k] = { count: 0, montant: 0 }; byPrest[k].count++; byPrest[k].montant += (c.montantDevis || 0) })
    var byCat = {}
    cls.forEach(function(c) { var k = c.categorie || "Non renseigné"; if (!byCat[k]) byCat[k] = { count: 0, montant: 0 }; byCat[k].count++; byCat[k].montant += (c.montantDevis || 0) })
    var seg = { petit: 0, moyen: 0, grand: 0 }, segM = { petit: 0, moyen: 0, grand: 0 }
    cls.forEach(function(c) { var m = c.montantDevis || 0; if (m < 50000) { seg.petit++; segM.petit += m } else if (m < 200000) { seg.moyen++; segM.moyen += m } else { seg.grand++; segM.grand += m } })
    var sorted = cls.slice().sort(function(a, b) { return (b.montantDevis || 0) - (a.montantDevis || 0) })
    var top2 = sorted.slice(0, 2).reduce(function(s, c) { return s + (c.montantDevis || 0) }, 0)
    var concPct = totalDevis ? Math.round(top2 / totalDevis * 100) : 0
    var progPct = objectifCA ? Math.min(Math.round(totalEncaisse / objectifCA * 100), 100) : 0
    var stOrder = ["contact", "devis", "attente", "relance", "converti", "echec"]
    var stCounts = stOrder.map(function(k) { var meta = ST_META[k] || {}; var arr = cls.filter(function(c) { return c.statut === k }); return { key: k, label: meta.label, bg: meta.bg, tc: meta.tc, count: arr.length, montant: arr.reduce(function(s, c) { return s + (c.montantDevis || 0) }, 0) } })
    var maxCount = Math.max.apply(null, stCounts.map(function(s) { return s.count }).concat([1]))
    var byMotif = {}
    echecs.forEach(function(c) { var k = c.motifEchec || "—"; if (!byMotif[k]) byMotif[k] = 0; byMotif[k]++ })
    var depCatTotals = { transport: 0, produits: 0, materiels: 0, autre: 0 }
    cls.forEach(function(c) { (c.depensesItems || []).forEach(function(i) { var k = i.categorie || "autre"; if (depCatTotals[k] !== undefined) depCatTotals[k] += i.montant || 0 }) })
    depGlob.forEach(function(d) { var k = d.categorie || "autre"; if (depCatTotals[k] !== undefined) depCatTotals[k] += d.montant || 0 })
    var totalDepCat = Object.values(depCatTotals).reduce(function(s, v) { return s + v }, 0)
    var depPrestaTotal = cls.reduce(function(s, c) { return s + (c.depensesPrestataires || 0) }, 0)
    var PALETTE = ["#1D9E75", "#185FA5", "#BA7517", "#993556", "#5F5E5A", "#854F0B"]

    var insights = []
    if (txConv < 20) insights.push({ type: "warn", ico: "⚠️", title: "Taux de conversion : " + txConv + "%", txt: "Seulement " + conv.length + " client" + (conv.length > 1 ? "s" : "") + " converti" + (conv.length > 1 ? "s" : "") + " sur " + total + ". Un taux < 20 % indique des leviers à activer : relances, révision tarifaire ou ciblage." })
    else insights.push({ type: "good", ico: "✅", title: "Bon taux de conversion : " + txConv + "%", txt: conv.length + " client" + (conv.length > 1 ? "s" : "") + " converti" + (conv.length > 1 ? "s" : "") + " sur " + total + ". Capitalisez sur les canaux et profils qui fonctionnent." })
    if (concPct >= 60) insights.push({ type: "warn", ico: "⚡", title: "Concentration élevée : " + concPct + "% sur 2 clients", txt: "Les 2 plus gros dossiers représentent " + concPct + "% de votre pipeline. Un risque de dépendance — diversifier le portefeuille." })
    var bestSrc = srcList[0]
    if (bestSrc) insights.push({ type: "info", ico: "📡", title: "Meilleur canal : " + bestSrc[0], txt: "Source la plus productive avec " + finFmt(bestSrc[1].montant) + " FCFA en devis et " + bestSrc[1].count + " prospect" + (bestSrc[1].count > 1 ? "s" : "") + ". Renforcer les actions sur ce canal." })
    if (actifs.length >= 4) insights.push({ type: "info", ico: "🔄", title: actifs.length + " dossiers actifs en cours", txt: "Pipeline en cours estimé à " + finFmt(pipeW) + " FCFA (valeur pondérée). Prioriser les relances sur les dossiers \"En attente\"." })
    if (delaiDF !== null) insights.push({ type: "good", ico: "⏱️", title: "Délai devis → facture : " + delaiDF + " jour" + (delaiDF > 1 ? "s" : ""), txt: "Cycle court sur les clients convertis. Objectif : maintenir sous 7 jours pour optimiser la trésorerie." })
    if (objectifCA && progPct < 50) insights.push({ type: "warn", ico: "🎯", title: "Progression objectif : " + progPct + "%", txt: finFmt(totalEncaisse) + " FCFA encaissés sur un objectif de " + finFmt(objectifCA) + " FCFA. Il reste " + finFmt(objectifCA - totalEncaisse) + " FCFA à atteindre." })
    else if (objectifCA && progPct >= 50) insights.push({ type: "good", ico: "🎯", title: "Mi-objectif atteint : " + progPct + "%", txt: finFmt(totalEncaisse) + " FCFA sur " + finFmt(objectifCA) + " FCFA — bonne trajectoire." })

    var thS = { textAlign: "left", padding: "8px 10px", fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e8e6e0", whiteSpace: "nowrap" }
    var tdS = { padding: "8px 10px", fontSize: "12px", borderBottom: "1px solid #f0efe9", whiteSpace: "nowrap" }
    var secLblS = { fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px" }
    function anCard(title, children) { return e("div", { style: { background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "16px" } }, e("div", { style: { fontSize: "12px", fontWeight: "700", color: "#0a2e1a", marginBottom: "14px" } }, title), children) }
    function grid2(a, b) { return e("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" } }, a, b) }
    function anKpi(val, lbl, sub, color) { return e("div", { style: { flex: "1", minWidth: "150px", background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "14px 16px" } }, e("div", { style: { fontSize: "22px", fontWeight: "700", color: color } }, val), e("div", { style: { fontSize: "11px", color: "#555", marginTop: "4px", fontWeight: "600" } }, lbl), e("div", { style: { fontSize: "10px", color: "#999", marginTop: "2px" } }, sub)) }
    function barRow(label, right, pct, color, sub) {
      return e("div", { style: { marginBottom: "14px" } },
        e("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "4px" } }, e("span", { style: { fontSize: "12px", fontWeight: "500" } }, label), e("span", { style: { fontSize: "11px", color: "#777" } }, right)),
        e("div", { style: { height: "8px", background: "#f0efe9", borderRadius: "99px", overflow: "hidden" } }, e("div", { style: { width: Math.max(pct, 2) + "%", height: "100%", background: color, borderRadius: "99px" } })),
        sub ? e("div", { style: { fontSize: "11px", color: "#777", marginTop: "3px" } }, sub) : null
      )
    }

    // G1b : graphes recharts
    var donutStData = stCounts.filter(function(s) { return s.montant > 0 }).map(function(s) { return { name: s.label, value: s.montant } })
    var prestDonutData = Object.entries(byPrest).sort(function(a, b) { return b[1].montant - a[1].montant }).map(function(entry) { return { name: entry[0], value: entry[1].montant } })
    var segBarData = [{ name: "< 50 000", value: seg.petit }, { name: "50k–200k", value: seg.moyen }, { name: "> 200 000", value: seg.grand }]
    var segColors = ["#5DCAA5", "#185FA5", "#BA7517"]
    function chartDonut(data) {
      if (!data.length) return null
      return e("div", { style: { height: "200px", marginBottom: "12px" } },
        e(ResponsiveContainer, { width: "100%", height: "100%" },
          e(PieChart, null,
            e(Pie, { data: data, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", innerRadius: 45, outerRadius: 78, paddingAngle: 2, stroke: "#fff", strokeWidth: 2 },
              data.map(function(d, i) { return e(Cell, { key: i, fill: PALETTE[i % PALETTE.length] }) })
            ),
            e(Tooltip, { formatter: function(v) { return finFmt(v) + " FCFA" } })
          )
        )
      )
    }
    function chartSegBar() {
      return e("div", { style: { height: "180px", marginBottom: "12px" } },
        e(ResponsiveContainer, { width: "100%", height: "100%" },
          e(BarChart, { data: segBarData, margin: { top: 8, right: 8, left: -18, bottom: 0 } },
            e(XAxis, { dataKey: "name", tick: { fontSize: 11 }, axisLine: false, tickLine: false }),
            e(YAxis, { allowDecimals: false, tick: { fontSize: 11 }, axisLine: false, tickLine: false }),
            e(Tooltip, { cursor: { fill: "rgba(0,0,0,0.04)" } }),
            e(Bar, { dataKey: "value", radius: [6, 6, 0, 0] }, segBarData.map(function(d, i) { return e(Cell, { key: i, fill: segColors[i % segColors.length] }) }))
          )
        )
      )
    }

    var dash = Math.PI * 80
    var gauge = objectifCA
      ? e("div", { style: { display: "flex", flexDirection: "column", alignItems: "center" } },
          e("svg", { viewBox: "0 0 200 110", style: { width: "100%", maxWidth: "220px" } },
            e("path", { d: "M20,100 A80,80 0 0,1 180,100", fill: "none", stroke: "#f0efe9", strokeWidth: "18", strokeLinecap: "round" }),
            e("path", { d: "M20,100 A80,80 0 0,1 180,100", fill: "none", stroke: "#1D9E75", strokeWidth: "18", strokeLinecap: "round", strokeDasharray: dash, strokeDashoffset: dash * (1 - progPct / 100) }),
            e("text", { x: "100", y: "88", textAnchor: "middle", fontSize: "22", fontWeight: "700", fill: "#111" }, progPct + "%"),
            e("text", { x: "100", y: "104", textAnchor: "middle", fontSize: "10", fill: "#777" }, "de l'objectif atteint")
          ),
          e("div", { style: { display: "flex", justifyContent: "space-between", width: "100%", fontSize: "11px", color: "#777", marginTop: "6px" } }, e("span", null, "Encaissé : ", e("b", { style: { color: "#1D9E75" } }, finFmt(totalEncaisse) + " F")), e("span", null, "Objectif : ", e("b", null, finFmt(objectifCA) + " F"))),
          e("div", { style: { marginTop: "8px", fontSize: "11px", color: "#999" } }, "Reste à atteindre : ", e("b", { style: { color: "#111" } }, finFmt(Math.max(objectifCA - totalEncaisse, 0)) + " FCFA"))
        )
      : e("div", { style: { padding: "24px 0", textAlign: "center", color: "#999", fontSize: "12px" } }, "🎯 Aucun objectif défini. Définissez-le dans l'onglet Finances.")

    return e("div", null,
      // KPIs
      e("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" } },
        anKpi(txConv + "%", "Taux de conversion", conv.length + "/" + total + " clients", "#1D9E75"),
        anKpi(finFmt(pipeW), "Pipeline pondéré (FCFA)", "Probabilité réelle", "#185FA5"),
        anKpi(txRecouvr + "%", "Taux de recouvrement", finFmt(totalEncaisse) + " / " + finFmt(totalFacture) + " FCFA", txRecouvr >= 100 ? "#1D9E75" : "#BA7517"),
        anKpi(delaiDF !== null ? delaiDF + "j" : "—", "Délai devis → facture", delaiMoyenContact !== null ? "Contact→devis : " + delaiMoyenContact + "j" : "Sur clients convertis", delaiDF === null ? "#999" : "#1D9E75"),
        anKpi(txEchec + "%", "Taux d'échec", echecs.length + " dossier" + (echecs.length > 1 ? "s" : "") + " perdu" + (echecs.length > 1 ? "s" : ""), "#E24B4A")
      ),
      // Insights
      e("div", { style: secLblS }, "Insights automatiques"),
      e("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" } },
        insights.map(function(it, i) {
          var bg = it.type === "good" ? "#E1F5EE" : it.type === "warn" ? "#FFF0C4" : "#E6F1FB"
          return e("div", { key: i, style: { background: bg, borderRadius: "10px", padding: "14px", display: "flex", gap: "10px" } },
            e("div", { style: { fontSize: "18px", flexShrink: 0 } }, it.ico),
            e("div", { style: { fontSize: "12px", color: "#333", lineHeight: "1.4" } }, e("strong", { style: { display: "block", marginBottom: "2px" } }, it.title), it.txt)
          )
        })
      ),
      // Funnel + Objectif
      grid2(
        anCard("Funnel pipeline", e("div", null, stCounts.map(function(s) {
          return e("div", { key: s.key, style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" } },
            e("div", { style: { width: "110px", fontSize: "11px", color: "#555", flexShrink: 0 } }, s.label),
            e("div", { style: { flex: 1 } }, e("div", { style: { background: s.bg, color: s.tc, width: Math.max(s.count / maxCount * 100, 8) + "%", borderRadius: "5px", padding: "3px 8px", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap" } }, s.count + " · " + finFmt(s.montant) + " F"))
          )
        }))),
        anCard("Objectif CA annuel", gauge)
      ),
      // Canal + Répartition pipeline (légende)
      grid2(
        anCard("Performance par canal d'acquisition", e("div", null, srcList.map(function(entry) {
          var src = entry[0], d = entry[1]
          var tx = d.count ? Math.round(d.conv / d.count * 100) : 0
          var pct = maxSrcMontant ? Math.round(d.montant / maxSrcMontant * 100) : 0
          return e("div", { key: src }, barRow(src, d.count + " prospect" + (d.count > 1 ? "s" : "") + " · tx conv. " + tx + "%", pct, "#1a6b38", finFmt(d.montant) + " FCFA · " + finFmt(d.montant / d.count) + " FCFA moy."))
        }))),
        anCard("Répartition pipeline par montant", e("div", null, chartDonut(donutStData), stCounts.filter(function(s) { return s.montant > 0 }).map(function(s, i) {
          var pct = totalDevis ? Math.round(s.montant / totalDevis * 100) : 0
          return e("div", { key: s.key, style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
            e("div", { style: { width: "10px", height: "10px", borderRadius: "3px", background: PALETTE[i % PALETTE.length], flexShrink: 0 } }),
            e("div", { style: { flex: 1, fontSize: "12px" } }, s.label),
            e("div", { style: { fontSize: "12px", fontWeight: "600" } }, finFmt(s.montant) + " F · " + pct + "%")
          )
        })))
      ),
      // Segmentation + Prestation
      grid2(
        anCard("Segmentation par taille de devis", e("div", null,
          chartSegBar(),
          [{ lbl: "Petits (< 50 000 F)", n: seg.petit, m: segM.petit, c: "#5DCAA5" }, { lbl: "Moyens (50k–200k F)", n: seg.moyen, m: segM.moyen, c: "#185FA5" }, { lbl: "Grands (> 200 000 F)", n: seg.grand, m: segM.grand, c: "#BA7517" }].map(function(s, i) {
            return e("div", { key: i, style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" } },
              e("div", { style: { fontSize: "11px", width: "130px", flexShrink: 0 } }, s.lbl),
              e("div", { style: { fontSize: "13px", fontWeight: "700", width: "24px" } }, s.n),
              e("div", { style: { flex: 1, height: "8px", background: "#f0efe9", borderRadius: "99px", overflow: "hidden" } }, e("div", { style: { width: (total ? Math.round(s.n / total * 100) : 0) + "%", height: "100%", background: s.c, borderRadius: "99px" } })),
              e("div", { style: { fontSize: "11px", fontWeight: "600", width: "90px", textAlign: "right" } }, finFmt(s.m) + " F")
            )
          })
        )),
        anCard("Répartition par type de prestation", e("div", null,
          chartDonut(prestDonutData),
          Object.entries(byPrest).sort(function(a, b) { return b[1].montant - a[1].montant }).map(function(entry, i) {
            return e("div", { key: entry[0], style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" } },
              e("div", { style: { width: "10px", height: "10px", borderRadius: "3px", background: PALETTE[i % PALETTE.length], flexShrink: 0 } }),
              e("div", { style: { flex: 1, fontSize: "11px" } }, entry[0]),
              e("div", { style: { fontSize: "11px", fontWeight: "500" } }, entry[1].count + " · " + finFmt(entry[1].montant) + " F")
            )
          })
        ))
      ),
      // Catégories + Motifs
      grid2(
        anCard("Catégories clients", e("div", null, Object.entries(byCat).sort(function(a, b) { return b[1].montant - a[1].montant }).map(function(entry, i) {
          var v = entry[1]; var pct = total ? Math.round(v.count / total * 100) : 0
          return e("div", { key: entry[0] }, barRow(entry[0], v.count + " client" + (v.count > 1 ? "s" : "") + " · " + pct + "%", pct, PALETTE[i % PALETTE.length], finFmt(v.montant) + " FCFA de devis"))
        }))),
        anCard("Analyse des échecs & motifs", echecs.length === 0
          ? e("div", { style: { color: "#999", fontSize: "12px", textAlign: "center", padding: "24px 0" } }, "🙂 Aucun dossier perdu à ce jour.")
          : e("div", null,
              e("div", { style: { marginBottom: "12px" } }, Object.entries(byMotif).map(function(entry) { return e("div", { key: entry[0], style: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0efe9" } }, e("span", { style: { fontSize: "12px" } }, entry[0]), e("span", { style: { fontSize: "12px", fontWeight: "600", color: "#E24B4A" } }, entry[1] + " cas")) })),
              e("div", { style: { borderTop: "1px solid #e8e6e0", paddingTop: "10px" } }, echecs.map(function(c) { return e("div", { key: c.id || c.client, style: { display: "flex", justifyContent: "space-between", padding: "4px 0" } }, e("span", { style: { fontSize: "12px", fontWeight: "500" } }, c.client), e("span", { style: { fontSize: "11px", color: "#777" } }, finFmt(c.montantDevis) + " FCFA · " + finFmtD(c.dateDevis))) }))
            )
        )
      ),
      // Dépenses par catégorie
      e("div", { style: secLblS }, "Répartition des dépenses par catégorie"),
      e("div", { style: { background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "16px", marginBottom: "24px" } },
        (totalDepCat === 0 && depPrestaTotal === 0)
          ? e("div", { style: { color: "#999", fontSize: "12px", textAlign: "center", padding: "24px 0" } }, "Aucune dépense détaillée renseignée.")
          : e("div", null,
              [{ key: "transport", label: "🚗 Transport", color: "#185FA5" }, { key: "produits", label: "🧪 Produits", color: "#1D9E75" }, { key: "materiels", label: "🔧 Matériels", color: "#BA7517" }, { key: "autre", label: "📌 Autre", color: "#6366F1" }].map(function(cat) {
                var v = depCatTotals[cat.key] || 0; var denom = totalDepCat + depPrestaTotal; var pct = denom ? Math.round(v / denom * 100) : 0
                return e("div", { key: cat.key, style: { marginBottom: "10px" } },
                  e("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" } }, e("span", null, cat.label), e("span", { style: { fontWeight: "600" } }, finFmt(v) + " FCFA (" + pct + "%)")),
                  e("div", { style: { height: "6px", borderRadius: "3px", background: "#f0efe9", overflow: "hidden" } }, e("div", { style: { height: "100%", width: pct + "%", background: cat.color, borderRadius: "3px" } }))
                )
              }),
              depPrestaTotal > 0 ? (function() { var denom = totalDepCat + depPrestaTotal; var pct = denom ? Math.round(depPrestaTotal / denom * 100) : 0; return e("div", { style: { marginBottom: "10px" } }, e("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" } }, e("span", null, "👷 Prestataires"), e("span", { style: { fontWeight: "600" } }, finFmt(depPrestaTotal) + " FCFA (" + pct + "%)")), e("div", { style: { height: "6px", borderRadius: "3px", background: "#f0efe9", overflow: "hidden" } }, e("div", { style: { height: "100%", width: pct + "%", background: "#8B5CF6", borderRadius: "3px" } }))) })() : null,
              e("div", { style: { borderTop: "1px solid #e8e6e0", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600" } }, e("span", null, "Total dépenses"), e("span", { style: { color: "#E24B4A" } }, finFmt(totalDepCat + depPrestaTotal) + " FCFA"))
            )
      ),
      // Classement clients
      e("div", { style: secLblS }, "Classement clients par valeur de devis"),
      e("div", { style: { overflowX: "auto", background: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", marginBottom: "24px" } },
        e("table", { style: { width: "100%", borderCollapse: "collapse" } },
          e("thead", null, e("tr", null, ["#", "Client", "Zone", "Catégorie", "Canal", "Prestation", "Devis", "Statut", "Cycle (j)", "Résultat"].map(function(h, i) { return e("th", { key: i, style: thS }, h) }))),
          e("tbody", null, sorted.map(function(c, i) {
            var meta = ST_META[c.statut] || ST_META.contact
            var cycleJ = c.dateContact && c.dateDevis ? Math.round((new Date(c.dateDevis) - new Date(c.dateContact)) / 864e5) : null
            var res = (c.paiementsRecus || 0) - (c.depenses || 0)
            return e("tr", { key: c.id || i },
              e("td", { style: Object.assign({}, tdS, { color: "#999", fontWeight: "600" }) }, i + 1),
              e("td", { style: Object.assign({}, tdS, { fontWeight: "500" }) }, c.client),
              e("td", { style: Object.assign({}, tdS, { color: "#777" }) }, c.zone || "—"),
              e("td", { style: tdS }, c.categorie || "—"),
              e("td", { style: tdS }, c.provenance),
              e("td", { style: Object.assign({}, tdS, { color: "#777", fontSize: "11px" }) }, c.typePrestation || "—"),
              e("td", { style: Object.assign({}, tdS, { fontWeight: "600" }) }, finFmt(c.montantDevis)),
              e("td", { style: tdS }, e("span", { style: { background: meta.bg, color: meta.tc, borderRadius: "20px", padding: "2px 8px", fontSize: "11px", fontWeight: "600" } }, meta.label)),
              e("td", { style: Object.assign({}, tdS, { textAlign: "center", color: "#999" }) }, cycleJ !== null ? cycleJ + "j" : "—"),
              e("td", { style: Object.assign({}, tdS, { fontWeight: "500", color: res > 0 ? "#1D9E75" : res < 0 ? "#E24B4A" : "#999" }) }, res === 0 ? "—" : (res > 0 ? "+" : "") + finFmt(res))
            )
          }))
        )
      )
    )
  }

  // ── Pipeline UNIFIÉ (vente + exécution en un seul kanban) ───────────────────
  function renderVuePipelineUnifie() {
    var e = React.createElement
    if (finLoading || !finData) return e("div", { style: { padding: "40px", textAlign: "center", color: "#888", fontSize: "13px" } }, "Chargement du pipeline…")
    var cls = finData.clients || []
    var devisMap = {}
    devisList.forEach(function(d) { devisMap[d.id] = d })

    var COLS = [
      { id: "prospect",     label: "📞 Prospect",     bg: "#FAEEDA", tc: "#633806" },
      { id: "devis",        label: "📄 Devis envoyé", bg: "#E6F1FB", tc: "#0C447C" },
      { id: "relance",      label: "🔔 Relance",      bg: "#FBEAF0", tc: "#72243E" },
      { id: "converti",     label: "✅ Converti",      bg: "#E1F5EE", tc: "#04342C" },
      { id: "visite",       label: "🔍 Visite",       bg: "#F3E8FF", tc: "#6b21a8" },
      { id: "intervention", label: "🔧 Intervention", bg: "#E0E7FF", tc: "#3730a3" },
      { id: "certificat",   label: "📋 Certificat",   bg: "#FEF3C7", tc: "#92400e" },
      { id: "encaissement", label: "💳 Encaissement", bg: "#DCFCE7", tc: "#166534" },
      { id: "cloture",      label: "🏁 Clôturé",      bg: "#D1FAE5", tc: "#065f46" },
      { id: "perdu",        label: "❌ Perdu",        bg: "#F1EFE8", tc: "#2C2C2A" },
    ]
    // Source de vérité unique : le champ `etape` du devis. Filet `etapeParDefaut`
    // pour un devis ancien sans etape (le backfill l'a normalement rempli).
    function colUnifiee(c) {
      var rd = devisMap[c.id] || {}
      return rd.etape || etapeParDefaut(c.statut)
    }

    function marquerEncaisse(c) {
      var rd = devisMap[c.id]
      if (!rd) return
      var p = Object.assign({}, rd.parcours || {})
      p.encaissement = { done: true, date: new Date().toISOString().split("T")[0] }
      saveParcours(c.id, p)
      setMsg("✓ Encaissement enregistré — reflété dans les Finances")
    }

    var byCol = {}
    COLS.forEach(function(col) { byCol[col.id] = [] })
    cls.forEach(function(c) { var k = colUnifiee(c); if (byCol[k]) byCol[k].push(c) })

    function renderCard(c, colId) {
      var ni = finNextIntervention(c)
      var niSoon = ni && (new Date(ni + "T00:00:00") - new Date()) < 30 * 864e5
      var etapeIdx = ETAPE_IDS.indexOf(colId)
      var estPerdu = colId === "perdu"
      var prochaine = PROCHAINE_ETAPE[colId]
      // Contrat d'entretien : la question se pose dès que l'affaire est convertie.
      // Le modal existait déjà mais n'était accessible que depuis le tableau de bord
      // client (renderVueDevisClient), une vue qu'on ne traverse pas en travaillant
      // dans le pipeline — donc introuvable en pratique. Affiché à partir de
      // « Converti » (et non uniquement dessus) : un devis déjà passé en Visite ou
      // en Intervention doit rester éligible.
      var devisCarte = devisMap[c.id]
      var contratCarte = contratsList.find(function(ct) { return ct.devis_id === c.id })
      var boutonContrat = (!estPerdu && devisCarte && etapeIdx >= ETAPE_IDS.indexOf("converti"))
        ? e("button", {
            onClick: function() {
              if (contratCarte) { ouvrirContratExistant(contratCarte); return }
              setContratModal(devisCarte)
              setContratAnalyse(null)
              setContratErreur(null)
              setContratRapport(null); setContratQuestions(null); setContratReponses({}); setOffreChoisie(null)
              setContratForm({ typeEtablissement: "", demandeClient: "trimestriel sur un an", notes: "", prixNegocie: "", inclureNoteDevis: false })
            },
            title: contratCarte ? "Réimprimer le contrat " + contratCarte.reference : "Préparer un contrat d'entretien à partir de ce devis",
            style: { width: "100%", marginTop: "6px", background: "#faf5ff", border: "1px solid #e9d5ff", color: "#6b21a8", borderRadius: "6px", padding: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }
          }, contratCarte ? "🖨️ Réimprimer le contrat" : "📄 Proposer un contrat")
        : null
      // Mini-stepper : où en est le client dans le parcours (barres = étapes).
      var stepper = estPerdu
        ? e("div", { style: { fontSize: "10px", color: "#991b1b", fontWeight: "700", marginBottom: "6px" } }, "❌ Perdu")
        : e("div", { style: { display: "flex", gap: "2px", marginBottom: "7px" }, title: "Étape : " + (ETAPE_LABEL[colId] || colId) },
            ETAPE_IDS.map(function(id, i) {
              var bg = i < etapeIdx ? "#0a2e1a" : (i === etapeIdx ? "#d4a920" : "#e6e3dc")
              return e("div", { key: id, style: { flex: 1, height: "4px", borderRadius: "2px", background: bg } })
            })
          )
      return e("div", { key: c.id, style: { background: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", padding: "10px", marginBottom: "8px" } },
        stepper,
        e("div", { style: { fontWeight: "600", fontSize: "13px", marginBottom: "3px" } }, c.client),
        e("div", { style: { fontSize: "11px", color: "#888", marginBottom: "4px" } }, "📍 " + c.provenance + " · " + finFmtD(c.dateDevis)),
        e("div", { style: { fontSize: "13px", fontWeight: "700", color: "#0a2e1a" } }, finFmt(c.montantDevis) + " FCFA" + (c.typeContrat === "contrat" ? " / " + (c.dureeContratMois || 12) + "m" : "")),
        c.typeContrat === "contrat" ? e("div", { style: { display: "inline-block", background: "#f0f8f3", color: "#1a6b38", borderRadius: "5px", padding: "2px 7px", fontSize: "11px", marginTop: "4px", fontWeight: "500" } }, "🔁 Contrat · " + (FREQ_LABEL[c.frequenceIntervention] || "Trimestrielle")) : null,
        ni ? e("div", { style: { fontSize: "11px", marginTop: "4px", color: niSoon ? "#BA7517" : "#888" } }, (niSoon ? "⚠ " : "") + "Intervention : " + finFmtD(ni)) : null,
        c.commentaire ? e("div", { style: { fontSize: "11px", color: "#777", marginTop: "4px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: c.commentaire }, c.commentaire) : null,
        prochaine ? e("button", { onClick: function() { deplacerCarte(c.id, prochaine) }, style: { width: "100%", marginTop: "8px", background: "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "Avancer → " + (ETAPE_LABEL[prochaine] || prochaine)) : null,
        boutonContrat,
        e("div", { style: { display: "flex", gap: "6px", marginTop: "8px", alignItems: "center" } },
          e("select", { value: "", onChange: function(ev) { deplacerCarte(c.id, ev.target.value) }, style: { flex: 1, fontSize: "11px", padding: "5px 6px", border: "1px solid #e0ddd6", borderRadius: "6px", fontFamily: "inherit", cursor: "pointer", background: "#fff" } },
            [e("option", { key: "_", value: "" }, "Déplacer vers…")].concat(ETAPES.concat([ETAPE_PERDU]).map(function(m) { return e("option", { key: m.id, value: m.id }, m.label) }))
          ),
          e("button", { onClick: function() { ouvrirDossierCommercial(c.id) }, title: "Ouvrir le dossier (documents, rapports)", style: { flexShrink: 0, background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "5px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "📁 Dossier")
        )
      )
    }

    function renderColonne(col) {
      var cards = byCol[col.id] || []
      var tot = cards.reduce(function(s, c) { return s + (c.montantDevis || 0) }, 0)
      var colLeads = col.id === "prospect" ? leads : []
      var leadEls = colLeads.map(function(lead) {
        return e("div", { key: "lead-" + lead.id, style: { background: "#fffdf7", border: "1px dashed #d4a920", borderRadius: "8px", padding: "10px", marginBottom: "8px" } },
          e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px", gap: "6px" } },
            e("div", { style: { fontWeight: "600", fontSize: "13px" } }, lead.nom),
            e("span", { style: { fontSize: "9px", fontWeight: "700", background: "#fdf6e3", color: "#8a6d1a", border: "1px solid #ecd9a0", borderRadius: "10px", padding: "1px 6px", flexShrink: 0, whiteSpace: "nowrap" } }, "🌱 LEAD")
          ),
          e("div", { style: { fontSize: "11px", color: "#888", marginBottom: "2px" } }, [lead.telephone, lead.nuisible, lead.ville].filter(Boolean).join(" · ")),
          lead.created_at ? e("div", { style: { fontSize: "10px", color: "#b0885a", marginBottom: "6px" } }, "📅 " + finFmtD(lead.created_at.split("T")[0])) : null,
          e("button", { onClick: function() { convertirLead(lead) }, style: { width: "100%", background: "#0a2e1a", color: "#d4a920", border: "none", borderRadius: "6px", padding: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "Convertir →")
        )
      })
      return e("div", { key: col.id, style: { minWidth: "225px", width: "225px", flexShrink: 0, background: "#faf9f6", borderRadius: "10px", padding: "8px" } },
        e("div", { style: { background: col.bg, color: col.tc, borderRadius: "6px", padding: "6px 10px", fontSize: "12px", fontWeight: "700", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } }, e("span", null, col.label), e("span", { style: { background: "rgba(255,255,255,0.5)", borderRadius: "10px", padding: "0 7px", fontSize: "11px" } }, cards.length + colLeads.length)),
        tot > 0 ? e("div", { style: { fontSize: "11px", color: col.tc, fontWeight: "600", marginBottom: "8px", paddingLeft: "2px" } }, finFmt(tot) + " FCFA") : null,
        leadEls,
        (cards.length === 0 && colLeads.length === 0) ? e("div", { style: { textAlign: "center", color: "#bbb", fontSize: "11px", padding: "18px 0" } }, "—") : cards.map(function(c) { return renderCard(c, col.id) })
      )
    }

    var laneRow = { display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }
    var laneTitle = { fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "4px 0 8px" }
    function colsDe(ids) { return COLS.filter(function(x) { return ids.indexOf(x.id) > -1 }) }
    var colsCommercial = colsDe(["prospect", "devis", "relance", "converti"])
    var colsExecution = colsDe(["visite", "intervention", "certificat", "encaissement", "cloture"])
    var colsPerdu = colsDe(["perdu"])

    return e("div", null,
      e("div", { style: { fontSize: "12px", color: "#888", marginBottom: "16px" } }, "Parcours client de gauche à droite. « Avancer → » passe à l'étape suivante ; « Déplacer vers » permet un saut ; le Dossier gère documents et rapports."),
      e("div", { style: laneTitle }, "◆ Commercial"),
      e("div", { style: laneRow }, colsCommercial.map(renderColonne)),
      e("div", { style: Object.assign({}, laneTitle, { marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "14px" }) }, "◆ Exécution"),
      e("div", { style: laneRow }, colsExecution.map(renderColonne)),
      e("div", { style: Object.assign({}, laneTitle, { marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "14px" }) }, "◆ Perdu"),
      e("div", { style: laneRow }, colsPerdu.map(renderColonne))
    )
  }

  // ── G5 : Vue Commercial — kanban par statut (remplacé par le pipeline unifié) ─
  function renderVueCommercial() {
    var e = React.createElement
    if (finLoading || !finData) return e("div", { style: { padding: "40px", textAlign: "center", color: "#888", fontSize: "13px" } }, "Chargement du pipeline commercial…")
    var cls = finData.clients || []
    var cols = ["contact", "devis", "attente", "relance", "converti", "echec"]
    var nbContrats = cls.filter(function(c) { return c.typeContrat === "contrat" && c.statut !== "echec" }).length
    var nbPonctuels = cls.filter(function(c) { return c.typeContrat !== "contrat" && c.statut !== "echec" }).length
    var totMission = (nbContrats + nbPonctuels) || 1
    var pctC = Math.round(nbContrats / totMission * 100)
    var pctP = 100 - pctC

    function renderCard(c) {
      var meta = ST_META[c.statut] || ST_META.contact
      var ni = finNextIntervention(c)
      var niSoon = ni && (new Date(ni + "T00:00:00") - new Date()) < 30 * 864e5
      return e("div", { key: c.id, style: { background: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", padding: "10px", marginBottom: "8px" } },
        e("div", { style: { fontWeight: "600", fontSize: "13px", marginBottom: "3px" } }, c.client),
        e("div", { style: { fontSize: "11px", color: "#888", marginBottom: "4px" } }, "📍 " + c.provenance + " · " + finFmtD(c.dateDevis)),
        e("div", { style: { fontSize: "13px", fontWeight: "700", color: meta.tc } }, finFmt(c.montantDevis) + " FCFA" + (c.typeContrat === "contrat" ? " / " + (c.dureeContratMois || 12) + "m" : "")),
        c.typeContrat === "contrat" ? e("div", { style: { display: "inline-block", background: "#f0f8f3", color: "#1a6b38", borderRadius: "5px", padding: "2px 7px", fontSize: "11px", marginTop: "4px", fontWeight: "500" } }, "🔁 Contrat · " + (FREQ_LABEL[c.frequenceIntervention] || "Trimestrielle")) : null,
        ni ? e("div", { style: { fontSize: "11px", marginTop: "4px", color: niSoon ? "#BA7517" : "#888" } }, (niSoon ? "⚠ " : "") + "Intervention : " + finFmtD(ni)) : null,
        c.commentaire ? e("div", { style: { fontSize: "11px", color: "#777", marginTop: "4px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: c.commentaire }, c.commentaire) : null,
        e("div", { style: { display: "flex", gap: "6px", marginTop: "8px", alignItems: "center" } },
          e("select", { value: "", onChange: function(ev) { deplacerCarte(c.id, ev.target.value) }, style: { flex: 1, fontSize: "11px", padding: "5px 6px", border: "1px solid #e0ddd6", borderRadius: "6px", fontFamily: "inherit", cursor: "pointer", background: "#fff" } },
            [e("option", { key: "_", value: "" }, "Déplacer vers…")].concat(cols.filter(function(k) { return k !== c.statut }).map(function(k) { return e("option", { key: k, value: k }, (ST_META[k] || {}).label) }))
          ),
          e("button", { onClick: function() { ouvrirDossierCommercial(c.id) }, title: "Ouvrir le dossier", style: { flexShrink: 0, background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "5px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "📁 Dossier")
        )
      )
    }

    return e("div", null,
      e("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", flexWrap: "wrap" } },
        e("span", { style: { fontSize: "11px", color: "#888" } }, "Type de mission :"),
        e("span", { style: { background: "#EEF2FF", color: "#4338CA", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: "600" } }, "🔁 " + nbContrats + " contrat" + (nbContrats > 1 ? "s" : "") + " (" + pctC + "%)"),
        e("span", { style: { color: "#ccc" } }, "·"),
        e("span", { style: { background: "#F0FDF4", color: "#166534", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: "600" } }, "⚡ " + nbPonctuels + " ponctuel" + (nbPonctuels > 1 ? "s" : "") + " (" + pctP + "%)")
      ),
      e("div", { style: { display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" } },
        cols.map(function(key) {
          var meta = ST_META[key] || {}
          var cards = cls.filter(function(c) { return c.statut === key })
          var tot = cards.reduce(function(s, c) { return s + (c.montantDevis || 0) }, 0)
          var colLeads = key === "contact" ? leads : []
          var leadEls = colLeads.map(function(lead) {
            return e("div", { key: "lead-" + lead.id, style: { background: "#fffdf7", border: "1px dashed #d4a920", borderRadius: "8px", padding: "10px", marginBottom: "8px" } },
              e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px", gap: "6px" } },
                e("div", { style: { fontWeight: "600", fontSize: "13px" } }, lead.nom),
                e("span", { style: { fontSize: "9px", fontWeight: "700", background: "#fdf6e3", color: "#8a6d1a", border: "1px solid #ecd9a0", borderRadius: "10px", padding: "1px 6px", flexShrink: 0, whiteSpace: "nowrap" } }, "🌱 LEAD")
              ),
              e("div", { style: { fontSize: "11px", color: "#888", marginBottom: "2px" } }, [lead.telephone, lead.nuisible, lead.ville].filter(Boolean).join(" · ")),
              lead.created_at ? e("div", { style: { fontSize: "10px", color: "#b0885a", marginBottom: "6px" } }, "📅 " + finFmtD(lead.created_at.split("T")[0])) : null,
              e("button", { onClick: function() { convertirLead(lead) }, style: { width: "100%", background: "#0a2e1a", color: "#d4a920", border: "none", borderRadius: "6px", padding: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "Convertir →")
            )
          })
          return e("div", { key: key, style: { minWidth: "230px", width: "230px", flexShrink: 0, background: "#faf9f6", borderRadius: "10px", padding: "8px" } },
            e("div", { style: { background: meta.bg, color: meta.tc, borderRadius: "6px", padding: "6px 10px", fontSize: "12px", fontWeight: "700", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } }, e("span", null, meta.label), e("span", { style: { background: "rgba(255,255,255,0.5)", borderRadius: "10px", padding: "0 7px", fontSize: "11px" } }, cards.length + colLeads.length)),
            tot > 0 ? e("div", { style: { fontSize: "11px", color: meta.tc, fontWeight: "600", marginBottom: "8px", paddingLeft: "2px" } }, finFmt(tot) + " FCFA") : null,
            leadEls,
            (cards.length === 0 && colLeads.length === 0) ? e("div", { style: { textAlign: "center", color: "#bbb", fontSize: "11px", padding: "18px 0" } }, "Aucun") : cards.map(renderCard)
          )
        })
      )
    )
  }

  function renderOnglets() {
    var docsEnAttente = certsList.filter(function(c) { return !c.envoye }).length + fichesList.filter(function(f) { return !f.envoye }).length
    return React.createElement("div", { style: { display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "2px solid #e8e6e0", paddingBottom: "0" } },
      [["devis", "Devis"], ["clients", "Clients"], ["pipeline", "Pipeline"], ["finances", "Finances"], ["contrats", "Contrats"], ["analyse", "Analyse"], ["documents", "Documents"]].map(function(t) {
        var active = vue === t[0] || (vue === "devis-client" && t[0] === "clients")
        var badge = t[0] === "documents" && docsEnAttente > 0
          ? React.createElement("span", { style: { marginLeft: "6px", background: "#e65c00", color: "#fff", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: "700" } }, docsEnAttente)
          : null
        return React.createElement("button", { key: t[0], onClick: function() { setVue(t[0]); setClientDetail(null); setMsg("") }, style: { padding: "10px 20px", border: "none", borderBottom: active ? "2px solid #0a2e1a" : "2px solid transparent", marginBottom: "-2px", background: "none", fontSize: "13px", fontWeight: active ? "700" : "400", color: active ? "#0a2e1a" : "#888", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center" } },
          t[1], badge
        )
      }),
      React.createElement("button", { key: "export-csv", onClick: exporterCSV, title: "Exporter le pipeline en CSV", style: { marginLeft: "auto", marginBottom: "6px", background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", alignSelf: "center" } }, "⬇ Export CSV")
    )
  }

  function renderFormDevis() {
    if (!editingDevis) return null
    return React.createElement("div", { style: { backgroundColor: "#fafaf8", border: "2px solid #0a2e1a", borderRadius: "10px", padding: "24px", marginBottom: "24px" } },
      React.createElement("h4", { style: { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#0a2e1a" } }, "Modifier " + editingDevis.numero),
      React.createElement("div", { style: { marginBottom: "14px" } },
        React.createElement("label", { style: lbl }, "Lignes du devis * — une ligne par secteur/zone"),
        React.createElement("div", { style: { border: "1.5px solid #e0ddd6", borderRadius: "8px", overflow: "hidden" } },
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.8fr 0.9fr 1fr 32px", gap: "6px", padding: "8px 10px", backgroundColor: "#0a2e1a", fontSize: "10px", fontWeight: "700", color: "#d4a920", textTransform: "uppercase", letterSpacing: "0.06em" } },
            React.createElement("span", null, "Prestation"),
            React.createElement("span", null, "Secteur / zone"),
            React.createElement("span", { style: { textAlign: "right" } }, "Surface"),
            React.createElement("span", { style: { textAlign: "right" } }, "Prix/m²"),
            React.createElement("span", { style: { textAlign: "right" } }, "Montant"),
            React.createElement("span", null, "")
          ),
          (formDevis.lignes || []).map(function(l, idx) {
            var m = montantLigne(l)
            var setLigne = function(champ, val) {
              setFormDevis(function(prev) {
                var arr = (prev.lignes || []).map(function(x, i) { return i === idx ? Object.assign({}, x, (function(){ var o={}; o[champ]=val; return o })()) : x })
                var total = arr.reduce(function(s, x) { return s + montantLigne(x) }, 0)
                return Object.assign({}, prev, { lignes: arr, montantBrut: total > 0 ? String(total) : prev.montantBrut })
              })
            }
            return React.createElement("div", { key: idx, style: { display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.8fr 0.9fr 1fr 32px", gap: "6px", padding: "8px 10px", alignItems: "center", borderTop: "1px solid #f0ede8", backgroundColor: "#fff" } },
              React.createElement("select", { value: l.prestation || "", onChange: function(e) { setLigne("prestation", e.target.value) }, style: Object.assign({}, inp, { padding: "7px 8px" }) },
                React.createElement("option", { value: "" }, "— choisir —"),
                PRESTATIONS.map(function(p) { return React.createElement("option", { key: p, value: p }, p) })
              ),
              React.createElement("input", { type: "text", value: l.secteur || "", onChange: function(e) { setLigne("secteur", e.target.value) }, placeholder: "Ex: Bloc A", style: Object.assign({}, inp, { padding: "7px 8px" }) }),
              React.createElement("input", { type: "number", value: l.superficie || "", onChange: function(e) { setLigne("superficie", e.target.value) }, placeholder: "m²", style: Object.assign({}, inp, { padding: "7px 8px", textAlign: "right" }) }),
              React.createElement("input", { type: "number", value: l.prixM2 || "", onChange: function(e) { setLigne("prixM2", e.target.value) }, placeholder: "FCFA", style: Object.assign({}, inp, { padding: "7px 8px", textAlign: "right" }) }),
              React.createElement("span", { style: { fontSize: "12px", fontWeight: "700", color: "#0a2e1a", textAlign: "right" } }, m > 0 ? m.toLocaleString("fr-FR") : "—"),
              React.createElement("button", { type: "button", title: "Supprimer la ligne", onClick: function() {
                setFormDevis(function(prev) {
                  var arr = (prev.lignes || []).filter(function(x, i) { return i !== idx })
                  if (arr.length === 0) arr = [{ prestation: "", secteur: "", superficie: "", prixM2: "" }]
                  var total = arr.reduce(function(s, x) { return s + montantLigne(x) }, 0)
                  return Object.assign({}, prev, { lignes: arr, montantBrut: total > 0 ? String(total) : "" })
                })
              }, style: { background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "5px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "🗑")
            )
          }),
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderTop: "1px solid #e0ddd6", backgroundColor: "#f8f7f4" } },
            React.createElement("button", { type: "button", onClick: function() {
              setFormDevis(function(prev) { return Object.assign({}, prev, { lignes: (prev.lignes || []).concat([{ prestation: "", secteur: "", superficie: "", prixM2: "" }]) }) })
            }, style: { background: "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "+ Ajouter une ligne"),
            React.createElement("span", { style: { fontSize: "13px", fontWeight: "700", color: "#0a2e1a" } }, "Total brut : " + ((formDevis.lignes || []).reduce(function(s, x) { return s + montantLigne(x) }, 0)).toLocaleString("fr-FR") + " FCFA")
          )
        )
      ),
      ((formDevis.lignes || []).reduce(function(s, x) { return s + montantLigne(x) }, 0) === 0) && React.createElement("div", { style: { marginBottom: "12px" } },
        React.createElement("label", { style: lbl }, "Prix de base FCFA * — saisie manuelle (aucune ligne chiffrée)"),
        React.createElement("input", { type: "number", value: formDevis.montantBrut, onChange: function(e) { var v = e.target.value; setFormDevis(function(prev) { return Object.assign({}, prev, { montantBrut: v }) }) }, placeholder: "200000", style: inp })
      ),
      React.createElement("div", { style: { marginBottom: "12px" } },
        React.createElement("label", { style: lbl }, "Remise accordée (optionnel)"),
        React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "stretch" } },
          React.createElement("div", { style: { display: "flex", borderRadius: "6px", overflow: "hidden", border: "1.5px solid #e0ddd6", flexShrink: 0 } },
            React.createElement("button", { type: "button", onClick: function() { setFormDevis(function(prev) { return Object.assign({}, prev, { remiseType: "pct" }) }) }, style: { padding: "8px 14px", border: "none", backgroundColor: formDevis.remiseType === "pct" ? "#0a2e1a" : "#fff", color: formDevis.remiseType === "pct" ? "#fff" : "#666", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", fontWeight: "700" } }, "%"),
            React.createElement("button", { type: "button", onClick: function() { setFormDevis(function(prev) { return Object.assign({}, prev, { remiseType: "fixe" }) }) }, style: { padding: "8px 14px", border: "none", backgroundColor: formDevis.remiseType === "fixe" ? "#0a2e1a" : "#fff", color: formDevis.remiseType === "fixe" ? "#fff" : "#666", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", fontWeight: "700" } }, "FCFA")
          ),
          React.createElement("input", { type: "number", value: formDevis.remise, onChange: function(e) { var v = e.target.value; setFormDevis(function(prev) { return Object.assign({}, prev, { remise: v }) }) }, placeholder: formDevis.remiseType === "pct" ? "Ex: 10  (= 10%)" : "Ex: 5000", style: Object.assign({}, inp, { flex: 1 }) })
        )
      ),
      (function() {
        var brut = baseDevis(formDevis)
        var remiseVal = formDevis.remise ? parseFloat(formDevis.remise) : 0
        var remiseMontant = formDevis.remiseType === "pct" ? Math.round(brut * remiseVal / 100) : Math.round(remiseVal)
        var montantNetCalc = Math.max(0, brut - remiseMontant)
        var enLigne = formDevis.modeTransmission === "email"
        var fraisFeda = enLigne ? Math.round(montantNetCalc * COMMISSION_FEDAPAY) : 0
        var montantTotalCalc = montantNetCalc + fraisFeda
        if (!brut) return null
        return React.createElement("div", { style: { marginBottom: "14px", padding: "16px", backgroundColor: "#f8f7f4", border: "1px solid #e0ddd6", borderRadius: "8px" } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555", marginBottom: "4px" } }, React.createElement("span", null, "Prix de base"), React.createElement("span", null, brut.toLocaleString("fr-FR") + " FCFA")),
          remiseMontant > 0 && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#065f46", marginBottom: "4px" } },
            React.createElement("span", null, "Remise (" + (formDevis.remiseType === "pct" ? remiseVal + "%" : remiseMontant.toLocaleString("fr-FR") + " FCFA") + ")"),
            React.createElement("span", null, "− " + remiseMontant.toLocaleString("fr-FR") + " FCFA")
          ),
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555", marginBottom: "4px", borderTop: "1px solid #e0ddd6", paddingTop: "8px", marginTop: "4px" } }, React.createElement("span", null, "Montant net (GSE reçoit)"), React.createElement("span", { style: { fontWeight: "700" } }, montantNetCalc.toLocaleString("fr-FR") + " FCFA")),
          enLigne && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555", marginBottom: "4px" } }, React.createElement("span", null, "Frais FedaPay (1.85%)"), React.createElement("span", null, "+ " + fraisFeda.toLocaleString("fr-FR") + " FCFA")),
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "700", color: "#0a2e1a", borderTop: "1px solid #e0ddd6", paddingTop: "8px", marginTop: "8px" } }, React.createElement("span", null, "Total client"), React.createElement("span", null, montantTotalCalc.toLocaleString("fr-FR") + " FCFA")),
          enLigne && (function() {
            var pctA = Math.min(100, Math.max(1, parseInt(formDevis.pctAcompte) || 60))
            var pctS = 100 - pctA
            return React.createElement("div", { style: { display: "flex", gap: "12px", marginTop: "6px", fontSize: "12px", color: "#888" } },
              React.createElement("span", null, pctA + "% acompte = " + Math.round(montantTotalCalc * pctA / 100).toLocaleString("fr-FR") + " FCFA"),
              React.createElement("span", null, pctS + "% solde = " + Math.round(montantTotalCalc * pctS / 100).toLocaleString("fr-FR") + " FCFA")
            )
          })()
        )
      })(),
      React.createElement("div", { style: { marginBottom: "16px" } },
        React.createElement("label", { style: lbl }, "Mode de remise au client"),
        React.createElement("div", { style: { display: "flex", gap: "10px" } },
          React.createElement("button", { type: "button", onClick: function() { setFormDevis(function(prev) { return Object.assign({}, prev, { modeTransmission: "email" }) }) }, style: { flex: 1, padding: "12px 14px", borderRadius: "6px", border: formDevis.modeTransmission === "email" ? "2px solid #0a2e1a" : "2px solid #e0ddd6", backgroundColor: formDevis.modeTransmission === "email" ? "#f0fdf4" : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" } },
            React.createElement("div", { style: { fontSize: "13px", fontWeight: "700", color: formDevis.modeTransmission === "email" ? "#0a2e1a" : "#555" } }, "✉ Envoyer par email"),
            React.createElement("div", { style: { fontSize: "11px", color: "#888", marginTop: "2px" } }, "Paiement en ligne via FedaPay")
          ),
          React.createElement("button", { type: "button", onClick: function() { setFormDevis(function(prev) { return Object.assign({}, prev, { modeTransmission: "impression" }) }) }, style: { flex: 1, padding: "12px 14px", borderRadius: "6px", border: formDevis.modeTransmission === "impression" ? "2px solid #0a2e1a" : "2px solid #e0ddd6", backgroundColor: formDevis.modeTransmission === "impression" ? "#f0fdf4" : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" } },
            React.createElement("div", { style: { fontSize: "13px", fontWeight: "700", color: formDevis.modeTransmission === "impression" ? "#0a2e1a" : "#555" } }, "🖨️ Imprimer le devis"),
            React.createElement("div", { style: { fontSize: "11px", color: "#888", marginTop: "2px" } }, "Remise en main — paiement libre")
          )
        )
      ),
      React.createElement("div", { style: { marginBottom: "18px", padding: "16px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" } },
        React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#065f46", letterSpacing: "0.08em", marginBottom: "12px" } }, "MODALITÉS DE PAIEMENT"),
        React.createElement("div", { style: { marginBottom: "12px" } },
          React.createElement("label", { style: lbl }, "Répartition acompte / solde"),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { fontSize: "11px", color: "#065f46", marginBottom: "4px", fontWeight: "600" } }, "Acompte à la signature"),
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
                React.createElement("input", {
                  type: "number", min: "0", max: "100",
                  value: formDevis.pctAcompte || "60",
                  onChange: function(e) {
                    var v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                    setFormDevis(function(prev) { return Object.assign({}, prev, { pctAcompte: String(v) }) })
                  },
                  style: Object.assign({}, inp, { width: "70px", textAlign: "center", fontSize: "20px", fontWeight: "700", color: "#0a2e1a", padding: "8px" })
                }),
                React.createElement("span", { style: { fontSize: "18px", color: "#065f46", fontWeight: "700" } }, "%")
              )
            ),
            React.createElement("div", { style: { fontSize: "22px", color: "#aaa", padding: "16px 4px 0" } }, "+"),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { fontSize: "11px", color: "#065f46", marginBottom: "4px", fontWeight: "600" } }, "Solde après prestation"),
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
                React.createElement("div", { style: Object.assign({}, inp, { width: "70px", textAlign: "center", fontSize: "20px", fontWeight: "700", color: "#0a2e1a", padding: "8px", backgroundColor: "#e8f5e9", cursor: "default" }) },
                  100 - (parseInt(formDevis.pctAcompte) || 60)
                ),
                React.createElement("span", { style: { fontSize: "18px", color: "#065f46", fontWeight: "700" } }, "%")
              )
            )
          )
        ),
        React.createElement("div", null,
          React.createElement("label", { style: lbl }, "Conditions de paiement (affiché sur le devis)"),
          React.createElement("textarea", { value: formDevis.conditionsPaiement, rows: 2, onChange: function(e) { var v = e.target.value; setFormDevis(function(prev) { return Object.assign({}, prev, { conditionsPaiement: v }) }) }, placeholder: "Ex: Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention.", style: Object.assign({}, inp, { resize: "vertical", fontSize: "13px" }) })
        )
      ),
      React.createElement("div", { style: { marginBottom: "18px" } },
        React.createElement("label", { style: lbl }, "Description"),
        React.createElement("textarea", { value: formDevis.description, rows: 3, onChange: function(e) { var v = e.target.value; setFormDevis(function(prev) { return Object.assign({}, prev, { description: v }) }) }, placeholder: "Surface, zones, délais...", style: Object.assign({}, inp, { resize: "vertical" }) })
      ),
      React.createElement("div", { style: { display: "flex", gap: "10px" } },
        React.createElement("button", { onClick: creerDevis, style: { backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 22px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } },
          formDevis.modeTransmission === "email" ? "✏️ Modifier et renvoyer" : "✏️ Modifier et imprimer"
        ),
        React.createElement("button", { onClick: function() { setEditingDevis(null); setFormDevis({ clientId: "", prenom: "", nom: "", email: "", telephone: "", entreprise: "", prestation: "", prestations: [], lignes: [{ prestation: "", secteur: "", superficie: "", prixM2: "" }], superficie: "", prixM2: "", prixParPrestation: {}, superficieParPrestation: {}, description: "", montantBrut: "", remise: "", remiseType: "pct", modeTransmission: "email", pctAcompte: "60", conditionsPaiement: "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention." }); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }) }, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" } }, "Annuler")
      )
    )
  }

  function renderVueClients() {
    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" } },
        React.createElement("strong", { style: { fontSize: "15px", color: "#111" } }, clients.length + " client(s)"),
        React.createElement("div", { style: { display: "flex", gap: "8px" } },
          React.createElement("button", { onClick: charger, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "↺"),
          React.createElement("button", { onClick: ouvrirAjoutClient, style: { backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "+ Nouveau client")
        )
      ),
      showFormClient && React.createElement("div", { style: { backgroundColor: "#fafaf8", border: "2px solid #0a2e1a", borderRadius: "10px", padding: "24px", marginBottom: "20px" } },
        React.createElement("h4", { style: { margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: "#0a2e1a" } }, editingClient ? "Modifier le client" : (leadEnConversion ? "Convertir le lead en client" : "Ajouter un client")),
        leadEnConversion ? React.createElement("p", { style: { margin: "0 0 16px", fontSize: "12px", color: "#b0885a" } }, "🌱 Lead « " + leadEnConversion.nom + " » — il sera archivé automatiquement après enregistrement.") : React.createElement("div", { style: { height: "12px" } }),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" } },
          React.createElement("div", null, React.createElement("label", { style: lbl }, "Prénom"), React.createElement("input", { value: formClient.prenom, onChange: function(e) { setFormClient(Object.assign({}, formClient, { prenom: e.target.value })) }, placeholder: "Jean", style: inp })),
          React.createElement("div", null, React.createElement("label", { style: lbl }, "Nom *"), React.createElement("input", { value: formClient.nom, onChange: function(e) { setFormClient(Object.assign({}, formClient, { nom: e.target.value })) }, placeholder: "Dupont", style: inp })),
          React.createElement("div", null, React.createElement("label", { style: lbl }, "Email"), React.createElement("input", { type: "email", value: formClient.email, onChange: function(e) { setFormClient(Object.assign({}, formClient, { email: e.target.value })) }, placeholder: "jean@email.com (optionnel)", style: inp })),
          React.createElement("div", null, React.createElement("label", { style: lbl }, "Téléphone"), React.createElement("input", { value: formClient.telephone, onChange: function(e) { setFormClient(Object.assign({}, formClient, { telephone: e.target.value })) }, placeholder: "+229 01...", style: inp })),
          React.createElement("div", { style: { gridColumn: "1/-1" } }, React.createElement("label", { style: lbl }, "Entreprise"), React.createElement("input", { value: formClient.entreprise, onChange: function(e) { setFormClient(Object.assign({}, formClient, { entreprise: e.target.value })) }, placeholder: "Nom entreprise (optionnel)", style: inp })),
          React.createElement("div", { style: { gridColumn: "1/-1" } }, React.createElement("label", { style: lbl }, "Adresse"), React.createElement("input", { value: formClient.adresse, onChange: function(e) { setFormClient(Object.assign({}, formClient, { adresse: e.target.value })) }, placeholder: "Ex: Cadjehoun, Cotonou", style: inp }))
        ),
        React.createElement("div", { style: { display: "flex", gap: "10px" } },
          React.createElement("button", { onClick: sauvegarderClient, disabled: submittingClient, style: { backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 22px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, submittingClient ? "..." : (editingClient ? "Mettre à jour" : "Ajouter")),
          React.createElement("button", { onClick: function() { setShowFormClient(false); setEditingClient(null); setLeadEnConversion(null) }, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" } }, "Annuler")
        )
      ),
      loading
        ? React.createElement("div", { style: { textAlign: "center", padding: "40px", color: "#888" } }, "Chargement...")
        : clients.length === 0
          ? React.createElement("div", { style: { textAlign: "center", padding: "40px", backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", color: "#888" } }, "Aucun client.")
          : React.createElement("div", null, clients.map(function(c) {
              var nbDevis = devisList.filter(function(d) { return d.client_id === c.id }).length
              var nbDocs = certsList.filter(function(cert) { return cert.client_id === c.id }).length + fichesList.filter(function(f) { return f.client_id === c.id }).length
              return React.createElement("div", { key: c.id, style: { backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", padding: "14px 20px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" } },
                React.createElement("div", null,
                  React.createElement("div", { style: { fontWeight: "600", color: "#0a2e1a", fontSize: "15px", marginBottom: "3px" } }, [(c.prenom || ""), c.nom].filter(Boolean).join(" ") + (c.entreprise ? " — " + c.entreprise : "")),
                  React.createElement("div", { style: { fontSize: "12px", color: "#888", display: "flex", gap: "12px", flexWrap: "wrap" } },
                    c.email ? React.createElement("span", null, c.email) : null,
                    c.telephone ? React.createElement("span", null, c.telephone) : null,
                    React.createElement("span", { style: { color: "#0a2e1a", fontWeight: "600" } }, nbDevis + " devis · " + nbDocs + " docs")
                  )
                ),
                React.createElement("div", { style: { display: "flex", gap: "6px" } },
                  React.createElement("button", { onClick: function() { voirDevisClient(c) }, style: { backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "📊 Tableau de bord"),
                  React.createElement("button", { onClick: function() { ouvrirEditionClient(c) }, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "7px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "✏️"),
                  React.createElement("button", { onClick: function() { supprimerClient(c) }, style: { background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "7px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "🗑")
                )
              )
            }))
    )
  }

  function renderVueDevisClient() {
    if (!clientDetail) return null
    var cl = clientDetail
    var devisClient = devisList.filter(function(d) { return d.client_id === cl.id })

    var ETAPES_DB = [
      { id: 'contact',              label: 'Contact',              icon: '📞', auto: true },
      { id: 'visite',               label: 'Visite de site',       icon: '🔍', auto: false },
      { id: 'rapport_visite',       label: 'Rapport synthèse',     icon: '📝', auto: true },
      { id: 'devis',                label: 'Devis',                icon: '📄', auto: true },
      { id: 'facture',              label: 'Facture',              icon: '💰', auto: false },
      { id: 'intervention',         label: 'Intervention',         icon: '🔧', auto: false },
      { id: 'fiche',                label: 'Fiche de passage',     icon: '📋', auto: true },
      { id: 'rapport_intervention', label: "Rapport d'interv.",    icon: '📊', auto: true },
      { id: 'certificat',           label: 'Certificat GSE',       icon: '🏆', auto: true },
      { id: 'encaissement',         label: 'Encaissement',         icon: '💳', auto: false },
    ]

    function etapeDone(d, etapeId) {
      var p = d.parcours || {}
      if (p[etapeId] && p[etapeId].override !== undefined) return p[etapeId].override
      if (etapeId === 'contact' || etapeId === 'devis') return true
      if (etapeId === 'fiche') return fichesList.some(function(f) { return f.devis_id === d.id })
      if (etapeId === 'certificat') return certsList.some(function(c) { return c.devis_id === d.id })
      if (etapeId === 'rapport_visite') return rapportsVisite.some(function(r) { return r.devis_id === d.id })
      if (etapeId === 'rapport_intervention') return rapportsInterv.some(function(r) { return r.devis_id === d.id })
      return !!(p[etapeId] && p[etapeId].done)
    }

    function progressDossier(d) {
      return Math.round(ETAPES_DB.filter(function(e) { return etapeDone(d, e.id) }).length / ETAPES_DB.length * 100)
    }

    function toggleDB(d, etapeId) {
      var currentDone = etapeDone(d, etapeId)
      var p = Object.assign({}, d.parcours || {})
      var isAuto = ETAPES_DB.find(function(e) { return e.id === etapeId && e.auto })
      if (isAuto) {
        p[etapeId] = { override: !currentDone, date: !currentDone ? new Date().toISOString().split('T')[0] : null }
      } else {
        p[etapeId] = { done: !currentDone, date: !currentDone ? new Date().toISOString().split('T')[0] : null }
      }
      saveParcours(d.id, p)
    }

    function renderDossier(d) {
      var st = STATUTS[d.statut] || { label: d.statut, c: '#444', bg: '#f0f0f0' }
      var progress = progressDossier(d)
      var certsDevis    = certsList.filter(function(c) { return c.devis_id === d.id })
      var fichesDevis   = fichesList.filter(function(f) { return f.devis_id === d.id })
      var contratDevis  = contratsList.find(function(ct) { return ct.devis_id === d.id })
      var rapVisiteDevis = rapportsVisite.filter(function(r) { return r.devis_id === d.id })
      var rapIntervDevis = rapportsInterv.filter(function(r) { return r.devis_id === d.id })
      var p = d.parcours || {}

      return React.createElement('div', { key: d.id, style: { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '10px', marginBottom: '16px', overflow: 'hidden' } },

        React.createElement('div', { style: { backgroundColor: '#f8f7f4', padding: '14px 20px', borderBottom: '1px solid #e8e6e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          React.createElement('div', null,
            React.createElement('span', { style: { fontSize: '11px', fontWeight: '700', color: '#d4a920' } }, d.numero),
            React.createElement('span', { style: { marginLeft: '8px', padding: '2px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', backgroundColor: st.bg, color: st.c } }, st.label),
            React.createElement('div', { style: { fontSize: '14px', fontWeight: '600', color: '#0a2e1a', marginTop: '4px' } }, d.prestation)
          ),
          React.createElement('div', { style: { textAlign: 'right' } },
            React.createElement('div', { style: { fontSize: '18px', fontWeight: '700', color: '#0a2e1a' } }, Number(d.montant_total).toLocaleString('fr-FR') + ' FCFA'),
            React.createElement('div', { style: { fontSize: '11px', color: '#aaa' } }, new Date(d.created_at).toLocaleDateString('fr-FR'))
          )
        ),

        React.createElement('div', { style: { padding: '16px 20px' } },

          React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' } },
              React.createElement('span', { style: { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Progression'),
              React.createElement('span', { style: { fontSize: '12px', fontWeight: '700', color: progress === 100 ? '#16a34a' : '#0a2e1a' } }, progress + '%')
            ),
            React.createElement('div', { style: { height: '5px', backgroundColor: '#e8e6e0', borderRadius: '3px' } },
              React.createElement('div', { style: { width: progress + '%', height: '100%', backgroundColor: progress === 100 ? '#16a34a' : '#0a2e1a', borderRadius: '3px', transition: 'width 0.4s' } })
            )
          ),

          React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('div', { style: { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' } }, 'Parcours client'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' } },
              ETAPES_DB.map(function(etape) {
                var done = etapeDone(d, etape.id)
                var isManualOverride = etape.auto && p[etape.id] && p[etape.id].override !== undefined
                var date = p[etape.id] && p[etape.id].date ? p[etape.id].date : null
                return React.createElement('div', { key: etape.id,
                  onClick: function() { toggleDB(d, etape.id) },
                  title: done ? 'Cliquer pour annuler' : 'Cliquer pour valider',
                  style: { backgroundColor: done ? '#f0fdf4' : '#f8f7f4', border: '1px solid ' + (done ? '#bbf7d0' : '#e8e6e0'), borderRadius: '8px', padding: '8px 4px', textAlign: 'center', cursor: 'pointer' }
                },
                  React.createElement('div', { style: { fontSize: '15px', marginBottom: '3px' } }, done ? '✅' : '⬜'),
                  React.createElement('div', { style: { fontSize: '9px', color: done ? '#065f46' : '#888', fontWeight: done ? '700' : '400', lineHeight: 1.3 } }, etape.label),
                  date ? React.createElement('div', { style: { fontSize: '8px', color: '#aaa', marginTop: '2px' } }, date) : null,
                  etape.auto && !isManualOverride ? React.createElement('div', { style: { fontSize: '8px', color: '#bbb', marginTop: '2px' } }, 'auto') : null,
                  isManualOverride ? React.createElement('div', { style: { fontSize: '8px', color: '#d4a920', marginTop: '2px', fontWeight: '700' } }, 'manuel') : null
                )
              })
            )
          ),

          (certsDevis.length > 0 || fichesDevis.length > 0 || rapVisiteDevis.length > 0 || rapIntervDevis.length > 0) && React.createElement('div', { style: { marginBottom: '14px' } },
            React.createElement('div', { style: { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, 'Documents'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
              rapVisiteDevis.map(function(r) {
                return React.createElement('div', { key: r.id, style: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #bae6fd', backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '8px 12px' } },
                  React.createElement('span', null, '🔍'),
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontWeight: '600', color: '#0a2e1a', fontSize: '11px' } }, r.numero_unique || 'Rapport visite'),
                    React.createElement('div', { style: { fontSize: '10px', color: '#888' } }, r.date_visite ? new Date(r.date_visite).toLocaleDateString('fr-FR') : 'Rapport de visite')
                  ),
                  React.createElement('button', { onClick: function() { ouvrirRapportVisite(r, d, cl) }, style: { background: 'none', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '👁 Voir'),
                  React.createElement('button', { onClick: function() { supprimerRapportVisite(r.id) }, style: { background: 'none', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '🗑')
                )
              }),
              rapIntervDevis.map(function(r) {
                return React.createElement('div', { key: r.id, style: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', borderRadius: '8px', padding: '8px 12px' } },
                  React.createElement('span', null, '📊'),
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontWeight: '600', color: '#0a2e1a', fontSize: '11px' } }, r.numero_unique || "Rapport intervention"),
                    React.createElement('div', { style: { fontSize: '10px', color: '#888' } }, r.date_intervention ? new Date(r.date_intervention).toLocaleDateString('fr-FR') : "Rapport d'intervention")
                  ),
                  React.createElement('button', { onClick: function() { ouvrirRapportInterv(r, d, cl) }, style: { background: 'none', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '👁 Voir'),
                  React.createElement('button', { onClick: function() { supprimerRapportIntervById(r.id) }, style: { background: 'none', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '🗑')
                )
              }),
              certsDevis.map(function(cert) {
                return React.createElement('div', { key: cert.id, style: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid ' + (cert.envoye ? '#bbf7d0' : '#e0ddd6'), backgroundColor: cert.envoye ? '#f0fdf4' : '#fafaf8', borderRadius: '8px', padding: '8px 12px' } },
                  React.createElement('span', null, cert.type === 'desinsect' ? '🪲' : cert.type === 'double' ? '🪲🐭' : '🐭'),
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontWeight: '600', color: '#0a2e1a', fontSize: '11px' } }, cert.numero_unique),
                    React.createElement('div', { style: { fontSize: '10px', color: '#888' } }, cert.type === 'desinsect' ? 'Certificat désinsect.' : cert.type === 'double' ? 'Certificat combiné' : 'Certificat dératisation')
                  ),
                  React.createElement('button', { onClick: function() { toggleCertEnvoye(cert) }, style: { background: cert.envoye ? '#0a2e1a' : '#fff', color: cert.envoye ? '#fff' : '#999', border: '1px solid ' + (cert.envoye ? '#0a2e1a' : '#ccc'), borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700' } }, cert.envoye ? '✓ Envoyé' : 'Marquer envoyé'),
                  React.createElement('button', { onClick: function() { rouvrirCertModal(cert, d, cl) }, style: { background: 'none', border: '1px solid #e0ddd6', color: '#555', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '👁 Voir'),
                  React.createElement('button', { onClick: function() { supprimerCertificat(cert.id) }, style: { background: 'none', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '🗑')
                )
              }),
              fichesDevis.map(function(fiche) {
                return React.createElement('div', { key: fiche.id, style: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid ' + (fiche.envoye ? '#bbf7d0' : '#e0ddd6'), backgroundColor: fiche.envoye ? '#f0fdf4' : '#fafaf8', borderRadius: '8px', padding: '8px 12px' } },
                  React.createElement('span', null, '📋'),
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontWeight: '600', color: '#0a2e1a', fontSize: '11px' } }, fiche.numero_unique),
                    React.createElement('div', { style: { fontSize: '10px', color: '#888' } }, 'Fiche de passage')
                  ),
                  React.createElement('button', { onClick: function() { toggleFicheEnvoye(fiche) }, style: { background: fiche.envoye ? '#0a2e1a' : '#fff', color: fiche.envoye ? '#fff' : '#999', border: '1px solid ' + (fiche.envoye ? '#0a2e1a' : '#ccc'), borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700' } }, fiche.envoye ? '✓ Remis' : 'Marquer remis'),
                  React.createElement('button', { onClick: function() { reouvrirFicheModal(fiche, cl) }, style: { background: 'none', border: '1px solid #e0ddd6', color: '#555', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '👁 Voir'),
                  React.createElement('button', { onClick: function() { supprimerFiche(fiche.id) }, style: { background: 'none', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '🗑')
                )
              }),
              contratDevis && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e9d5ff', backgroundColor: '#faf5ff', borderRadius: '8px', padding: '8px 12px' } },
                React.createElement('span', null, '📄'),
                React.createElement('div', { style: { flex: 1 } },
                  React.createElement('div', { style: { fontWeight: '600', color: '#6b21a8', fontSize: '11px' } }, contratDevis.reference),
                  React.createElement('div', { style: { fontSize: '10px', color: '#888' } }, 'Contrat d\'entretien · ' + (contratDevis.date_generation ? new Date(contratDevis.date_generation).toLocaleDateString('fr-FR') : '—'))
                ),
                React.createElement('button', { onClick: function() { ouvrirContratExistant(contratDevis) }, style: { background: '#fff', border: '1px solid #e9d5ff', color: '#6b21a8', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' } }, '🖨️ Réimprimer')
              )
            )
          ),

          React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '12px', borderTop: '1px solid #f0ede8' } },
            d.statut === 'en_cours' && React.createElement('button', { onClick: function() { validerLivraison(d.id) }, disabled: validating === d.id, style: { backgroundColor: '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' } }, validating === d.id ? '...' : '✓ Valider livraison'),
            React.createElement('button', { onClick: function() { ouvrirEditionDevis(d) }, style: { background: 'none', border: '1px solid #d1d5db', color: '#374151', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' } }, '✏️ Modifier devis'),
            cl.email && React.createElement('button', { onClick: function() { renvoyerEmail(d) }, style: { background: 'none', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' } }, '✉ Renvoyer devis'),
            React.createElement('button', { onClick: function() { ouvrirNouveauRapportVisite(d, cl) }, style: { background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' } }, '🔍 Rapport visite'),
            React.createElement('button', { onClick: function() { ouvrirNouveauRapportInterv(d, cl) }, style: { background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' } }, '📊 Rapport interv.'),
            React.createElement('button', { onClick: function() { ouvrirFicheModal(cl, d) }, style: { background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#5b21b6', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' } }, '📋 Fiche de passage'),
            d.statut !== 'annule' && React.createElement('button', { onClick: function() { openCertModal('desinsect', d) }, style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#065f46', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' } }, '🪲 Certificat désinsect.'),
            d.statut !== 'annule' && React.createElement('button', { onClick: function() { openCertModal('derat', d) }, style: { background: '#fefce8', border: '1px solid #fde68a', color: '#92400e', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' } }, '🐭 Certificat dératis.'),
            d.statut !== 'annule' && React.createElement('button', { onClick: function() { openCertModal('double', d) }, style: { background: '#f0fdf4', border: '1px solid #6ee7b7', color: '#064e3b', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' } }, '🪲🐭 Désinsect. + Dératis.'),
            React.createElement('button', { onClick: function() { setContratModal(d); setContratAnalyse(null); setContratErreur(null); setContratRapport(null); setContratQuestions(null); setContratReponses({}); setOffreChoisie(null); setContratForm({ typeEtablissement: '', demandeClient: 'trimestriel sur un an', notes: '', prixNegocie: '', inclureNoteDevis: false }) }, style: { background: '#faf5ff', border: '1px solid #e9d5ff', color: '#6b21a8', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' } }, '📄 Contrat'),
            React.createElement('button', { onClick: function() { supprimerDevis(d.id, d.numero) }, style: { background: 'none', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' } }, '🗑 Supprimer')
          )
        )
      )
    }

    return React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' } },
        React.createElement('button', { onClick: function() { setVue('clients'); setClientDetail(null) }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginTop: '4px' } }, '← Retour'),
        React.createElement('div', { style: { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '10px', padding: '16px 20px', flex: 1 } },
          React.createElement('div', { style: { fontSize: '18px', fontWeight: '700', color: '#0a2e1a', marginBottom: '4px' } }, [(cl.prenom || ''), cl.nom].filter(Boolean).join(' ') + (cl.entreprise ? ' — ' + cl.entreprise : '')),
          React.createElement('div', { style: { fontSize: '12px', color: '#666', display: 'flex', gap: '16px', flexWrap: 'wrap' } },
            cl.email ? React.createElement('span', null, '✉ ' + cl.email) : null,
            cl.telephone ? React.createElement('span', null, '📱 ' + cl.telephone) : null,
            cl.adresse ? React.createElement('span', null, '📍 ' + cl.adresse) : null
          )
        )
      ),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
        React.createElement('div', { style: { fontSize: '13px', fontWeight: '700', color: '#0a2e1a' } }, devisClient.length + ' dossier(s)'),
        React.createElement('button', {
          onClick: function() { setShowNouveauDevis(function(v) { return !v }); setNouveauDevisPresta([]) },
          style: { backgroundColor: '#0a2e1a', color: '#d4a920', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }
        }, showNouveauDevis ? '× Annuler' : '+ Nouveau devis')
      ),
      showNouveauDevis && React.createElement('div', { style: { backgroundColor: '#f0fdf4', border: '2px solid #0a2e1a', borderRadius: '10px', padding: '20px', marginBottom: '20px' } },
        React.createElement('div', { style: { fontSize: '13px', fontWeight: '700', color: '#0a2e1a', marginBottom: '12px' } }, 'Sélectionnez les prestations pour ce devis'),
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' } },
          PRESTATIONS.map(function(p) {
            var checked = nouveauDevisPresta.includes(p)
            return React.createElement('div', {
              key: p,
              onClick: function() { setNouveauDevisPresta(function(prev) { return prev.includes(p) ? prev.filter(function(x) { return x !== p }) : prev.concat([p]) }) },
              style: { display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', userSelect: 'none', backgroundColor: checked ? '#0a2e1a' : '#fff', border: '1.5px solid ' + (checked ? '#0a2e1a' : '#d1d5db'), color: checked ? '#d4a920' : '#374151', fontSize: '13px', fontWeight: checked ? '700' : '400', transition: 'all 0.12s' }
            },
              React.createElement('span', { style: { fontSize: '15px' } }, checked ? '☑' : '☐'),
              p
            )
          })
        ),
        nouveauDevisPresta.length > 0 && React.createElement('div', { style: { fontSize: '12px', color: '#065f46', marginBottom: '12px', fontWeight: '600' } },
          'Sélectionnées : ' + nouveauDevisPresta.join(' + ')
        ),
        React.createElement('button', {
          onClick: function() { creerNouveauDevisClient(cl) },
          disabled: nouveauDevisPresta.length === 0,
          style: { backgroundColor: nouveauDevisPresta.length === 0 ? '#ccc' : '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '10px 24px', fontSize: '13px', fontWeight: '700', cursor: nouveauDevisPresta.length === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }
        }, 'Créer le devis →')
      ),
      devisClient.length === 0 && !showNouveauDevis
        ? React.createElement('div', { style: { textAlign: 'center', padding: '40px', backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', color: '#888' } }, 'Aucun devis pour ce client.')
        : devisClient.map(function(d) { return renderDossier(d) })
    )
  }

  // Sur un dossier sans rapport de visite, on demande d'abord à l'IA ce qui lui
  // manque. Les réponses sont facultatives: l'analyse reste lançable sans elles.
  async function demanderQuestionsContrat() {
    if (!contratModal) return
    setAnalysingContrat(true)
    setContratErreur(null)
    try {
      var res = await fetch("/api/analyze-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devisId: contratModal.id,
          phase: "questions",
          typeEtablissement: contratForm.typeEtablissement,
          demandeClient: contratForm.demandeClient,
          notes: contratForm.notes
        })
      })
      var data = await res.json()
      if (data.success) {
        setContratQuestions(data.questions || [])
        // Ne pas jeter numero/date/niveau déjà connus localement : la route
        // renvoie parfois seulement l'origine (rapport absent ou illisible),
        // et contratRapport prime ensuite sur la source locale pour toute
        // la session du modal. data.rapport (rapport trouvé côté serveur)
        // reste prioritaire quand il est fourni.
        setContratRapport(data.rapport || Object.assign({}, rapportLocalPourDevis(contratModal), { origine: data.rapportOrigine }))
      } else {
        setContratErreur("Erreur : " + (data.error || "inconnue"))
      }
    } catch (e) {
      setContratErreur("Erreur réseau : " + e.message)
    }
    setAnalysingContrat(false)
  }

  async function lancerAnalyseContrat() {
    if (!contratModal) return
    setAnalysingContrat(true)
    setContratAnalyse(null)
    setContratErreur(null)
    try {
      var res = await fetch("/api/analyze-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devisId: contratModal.id,
          phase: "analyse",
          typeEtablissement: contratForm.typeEtablissement,
          demandeClient: contratForm.demandeClient,
          notes: contratForm.notes,
          reponsesTechniques: contratReponses
        })
      })
      var data = await res.json()
      if (data.success) {
        setContratAnalyse(data.analyse)
        setContratRapport(data.rapport || { origine: data.rapportOrigine })
      } else {
        var errMsg = data.error || "Erreur inconnue"
        if (errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          setContratErreur("Limite API atteinte — réessaie dans 30 secondes.")
        } else {
          setContratErreur("Erreur : " + errMsg)
        }
      }
    } catch(e) {
      setContratErreur("Erreur réseau : " + e.message)
    }
    setAnalysingContrat(false)
  }

  // Source locale du rapport de visite pour un devis, disponible dès l'ouverture
  // du modal (avant tout appel API). Reproduit la logique de
  // /api/analyze-contract (lignes 71 à 99) : le rapport le plus récent du devis
  // fait référence ; à défaut, le plus récent du même client sur un autre
  // dossier ; à défaut, aucun rapport. Une fois l'analyse IA effectuée, la
  // réponse de l'API (contratRapport) prime sur cette source locale.
  function rapportLocalPourDevis(dv) {
    var parDateDesc = function(a, b) { return new Date(b.date_visite || 0) - new Date(a.date_visite || 0) }
    var rvDevis = rapportsVisite.filter(function(r) { return r.devis_id === dv.id }).sort(parDateDesc)
    if (rvDevis.length > 0) {
      var r = rvDevis[0]
      return { numero: r.numero_unique, date: r.date_visite, niveau: r.niveau_infestation, origine: "devis" }
    }
    var rvClient = rapportsVisite.filter(function(r) { return r.client_id === dv.client_id }).sort(parDateDesc)
    if (rvClient.length > 0) {
      var rc = rvClient[0]
      return { numero: rc.numero_unique, date: rc.date_visite, niveau: rc.niveau_infestation, origine: "autre_dossier" }
    }
    return { origine: "aucun" }
  }

  function renderContratModal() {
    if (!contratModal) return null
    var d = contratModal
    var cl = d.clients
    var nomClient = [(cl && cl.prenom) || "", (cl && cl.nom) || ""].filter(Boolean).join(" ")
    var a = contratAnalyse

    // Formules d'engagement proposées par l'IA. La sélection de l'utilisateur
    // prime sur la recommandation, et c'est elle qui alimente la génération du
    // contrat : sans ça, choisir une formule à l'écran n'aurait aucun effet sur
    // le document produit.
    var offresContrat = (a && Array.isArray(a.offres)) ? a.offres.filter(function(o) { return Number(o.prixTotal) > 0 }) : []
    var dureeSelectionnee = offreChoisie || (a && a.offreRecommandee) || (a && a.dureeContrat) || 12
    var offreSelectionnee = offresContrat.filter(function(o) { return Number(o.dureeMois) === Number(dureeSelectionnee) })[0] || null
    var prixRetenu = offreSelectionnee ? Number(offreSelectionnee.prixTotal) : Number(a && a.prixSuggere) || 0
    var passagesSurDuree = Math.max(1, Math.round((Number(a && a.frequencePassages) || 4) * Number(dureeSelectionnee) / 12))
    var prixParPeriode = Math.round(prixRetenu / passagesSurDuree)
    // La réponse de l'API (après analyse) fait autorité ; avant tout appel, on
    // retombe sur la source locale calculée depuis rapportsVisite (déjà chargé).
    var rapportAffiche = contratRapport || rapportLocalPourDevis(d)

    var niveauColor = { "CRITIQUE": "#991b1b", "ÉLEVÉ": "#92400e", "MOYEN": "#1e40af", "FAIBLE": "#065f46" }
    var niveauBg    = { "CRITIQUE": "#fee2e2", "ÉLEVÉ": "#fef3c7", "MOYEN": "#dbeafe", "FAIBLE": "#d1fae5" }

    return React.createElement("div", { style: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 20px" } },
      React.createElement("div", { style: { backgroundColor: "#fff", borderRadius: "12px", padding: "32px", width: "100%", maxWidth: "680px", position: "relative" } },

        // Entête modal
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: "11px", color: "#d4a920", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" } }, "Préparer un contrat"),
            React.createElement("div", { style: { fontSize: "17px", fontWeight: "700", color: "#0a2e1a" } }, d.numero + " — " + nomClient),
            React.createElement("div", { style: { fontSize: "12px", color: "#888", marginTop: "2px" } }, Number(d.montant_total).toLocaleString("fr-FR") + " FCFA · " + (d.prestation || ""))
          ),
          React.createElement("button", { onClick: function() { setContratModal(null); setContratAnalyse(null); setContratErreur(null); setContratRapport(null); setContratQuestions(null); setContratReponses({}); setOffreChoisie(null) }, style: { background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 } }, "×")
        ),

        rapportAffiche ? (function() {
          var org = rapportAffiche.origine
          // "indisponible" (erreur de lecture) n'est pas la même chose que
          // "aucun rapport" (visite réellement jamais faite) : afficher un
          // texte propre à chaque cas plutôt que de les confondre.
          var indisponible = org === "indisponible"
          var absent = !rapportAffiche.numero && !indisponible
          var degrade = absent || indisponible
          var texte = indisponible
            ? "Le constat terrain n'a pas pu être lu (erreur de lecture) : ne rien en conclure sur l'état du site."
            : absent
              ? "Aucun rapport de visite. Analyse fondée sur le devis et vos réponses."
              : "Rapport " + rapportAffiche.numero + " du " + (rapportAffiche.date ? new Date(rapportAffiche.date).toLocaleDateString("fr-FR") : "date inconnue") + ", niveau " + rapportAffiche.niveau +
                (org === "autre_dossier" ? " (relevé sur un autre dossier du même client)" : "")
          return React.createElement("div", {
            style: {
              display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px",
              padding: "9px 13px", borderRadius: "8px", fontSize: "12px",
              backgroundColor: degrade ? "#fffbeb" : "#f0fdf4",
              border: "1px solid " + (degrade ? "#fde68a" : "#bbf7d0"),
              color: degrade ? "#92400e" : "#065f46"
            }
          }, React.createElement("span", null, degrade ? "⚠️" : "📋"), React.createElement("span", null, texte))
        })() : null,

        // Formulaire contexte
        !a && React.createElement("div", null,
          React.createElement("div", { style: { fontSize: "12px", fontWeight: "700", color: "#0a2e1a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" } }, "Contexte complémentaire"),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" } },
            React.createElement("div", null,
              React.createElement("label", { style: { display: "block", fontSize: "11px", fontWeight: "700", color: "#888", marginBottom: "6px", textTransform: "uppercase" } }, "Type d'établissement"),
              React.createElement("input", { value: contratForm.typeEtablissement, onChange: function(e) { setContratForm(Object.assign({}, contratForm, { typeEtablissement: e.target.value })) }, placeholder: "Ex : boulangerie, bureau, hôtel…", style: { width: "100%", padding: "9px 12px", border: "1.5px solid #e0ddd6", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" } })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: { display: "block", fontSize: "11px", fontWeight: "700", color: "#888", marginBottom: "6px", textTransform: "uppercase" } }, "Demande du client"),
              React.createElement("input", { value: contratForm.demandeClient, onChange: function(e) { setContratForm(Object.assign({}, contratForm, { demandeClient: e.target.value })) }, placeholder: "Ex : trimestriel sur un an", style: { width: "100%", padding: "9px 12px", border: "1.5px solid #e0ddd6", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" } })
            )
          ),
          React.createElement("div", { style: { marginBottom: "12px" } },
            React.createElement("label", { style: { display: "block", fontSize: "11px", fontWeight: "700", color: "#888", marginBottom: "6px", textTransform: "uppercase" } }, "Notes libres"),
            React.createElement("textarea", { value: contratForm.notes, onChange: function(e) { setContratForm(Object.assign({}, contratForm, { notes: e.target.value })) }, placeholder: "Ex : infestation active signalée, client négocie, production alimentaire à haut risque…", rows: 3, style: { width: "100%", padding: "9px 12px", border: "1.5px solid #e0ddd6", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" } })
          ),
          React.createElement("div", { style: { marginBottom: "20px", backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "12px 14px", border: "1px solid #bbf7d0" } },
            React.createElement("label", { style: { display: "block", fontSize: "11px", fontWeight: "700", color: "#065f46", marginBottom: "6px", textTransform: "uppercase" } }, "Prix déjà négocié (FCFA/an) — optionnel"),
            React.createElement("input", { value: contratForm.prixNegocie, onChange: function(e) { setContratForm(Object.assign({}, contratForm, { prixNegocie: e.target.value })) }, placeholder: "Ex : 200000 — laisser vide pour laisser l'IA proposer", type: "number", style: { width: "100%", padding: "9px 12px", border: "1.5px solid #bbf7d0", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" } }),
            React.createElement("div", { style: { fontSize: "11px", color: "#065f46", marginTop: "5px" } }, "Si renseigné, un bouton de génération directe apparaîtra — sans passer par l'IA.")
          ),
          React.createElement("div", { style: { marginBottom: "16px" } },
            React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#555", cursor: "pointer" } },
              React.createElement("input", { type: "checkbox", checked: !!contratForm.inclureNoteDevis, onChange: function(e) { setContratForm(Object.assign({}, contratForm, { inclureNoteDevis: e.target.checked })) }, style: { width: "15px", height: "15px", cursor: "pointer" } }),
              "Inclure la note sur le devis initial (montant facturé séparément)"
            )
          ),
          contratErreur && React.createElement("div", { style: { backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "12px 14px", marginBottom: "12px", fontSize: "13px", color: "#92400e", display: "flex", justifyContent: "space-between", alignItems: "center" } },
            contratErreur,
            React.createElement("span", { onClick: function() { setContratErreur(null) }, style: { cursor: "pointer", opacity: 0.5, marginLeft: "8px" } }, "×")
          ),
          contratForm.prixNegocie && parseInt(contratForm.prixNegocie) > 0 && React.createElement("button", {
            onClick: function() {
              var prixAn = parseInt(contratForm.prixNegocie)
              var t = (contratForm.demandeClient || '').toLowerCase()
              var freq = { passages: 4, paiement: 'trimestriel_avance', controles: 8 }
              if (/\b1\s*passage|\bune?\s*fois|\bannuel|\b1\s*fois/.test(t)) freq = { passages: 1, paiement: 'annuel', controles: 0 }
              else if (/\b2\s*passages?|\bsemestriel|\bdeux\s*fois|\bdeux\s*passages?|\b2\s*fois/.test(t)) freq = { passages: 2, paiement: 'semestriel', controles: 0 }
              else if (/\b4\s*passages?|\btrimestriel|\bquatre\s*fois|\b4\s*fois/.test(t)) freq = { passages: 4, paiement: 'trimestriel_avance', controles: 8 }
              else if (/\b12\s*passages?|\bmensuel|\bchaque\s*mois|\btous\s*les\s*mois/.test(t)) freq = { passages: 12, paiement: 'mensuel', controles: 0 }
              var params = new URLSearchParams({
                devisId: d.id,
                prixAnnuel: prixAn,
                prixTrimestre: Math.round(prixAn / freq.passages),
                formule: "Formule Intégrale",
                passages: freq.passages,
                controles: freq.controles,
                duree: 12,
                paiement: freq.paiement,
                typeEtablissement: contratForm.typeEtablissement,
                remise: d.remise_bienvenue || 0,
                sansNoteDevis: contratForm.inclureNoteDevis ? "0" : "1"
              })
              window.open("/api/generate-contract?" + params.toString(), "_blank")
            },
            style: { width: "100%", backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "8px", padding: "14px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", marginBottom: "10px" }
          }, "⚡ Générer directement — " + parseInt(contratForm.prixNegocie || 0).toLocaleString("fr-FR") + " FCFA/an"),
          contratQuestions && contratQuestions.length > 0 ? React.createElement("div", {
            style: { marginBottom: "16px", padding: "14px 16px", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px" }
          },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" } },
              "Questions techniques (réponses facultatives)"),
            contratQuestions.map(function(q) {
              return React.createElement("div", { key: q.id, style: { marginBottom: "12px" } },
                React.createElement("label", { style: { display: "block", fontSize: "13px", color: "#1c1917", marginBottom: "3px", fontWeight: "600" } }, q.question),
                q.pourquoi ? React.createElement("div", { style: { fontSize: "11px", color: "#a16207", marginBottom: "5px", fontStyle: "italic" } }, q.pourquoi) : null,
                React.createElement("input", {
                  value: contratReponses[q.id] || "",
                  onChange: function(e) {
                    var v = e.target.value
                    setContratReponses(function(prev) { var o = Object.assign({}, prev); o[q.id] = v; return o })
                  },
                  placeholder: "Laisser vide si vous ne savez pas",
                  style: { width: "100%", padding: "8px 11px", border: "1.5px solid #fde68a", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }
                })
              )
            })
          ) : null,
          (!contratQuestions && !rapportAffiche.numero) ? React.createElement("button", {
            onClick: demanderQuestionsContrat,
            disabled: analysingContrat,
            style: { width: "100%", marginBottom: "8px", background: "#fff", color: "#92400e", border: "1px solid #fde68a", borderRadius: "8px", padding: "11px", fontSize: "13px", fontWeight: "700", cursor: analysingContrat ? "wait" : "pointer", fontFamily: "inherit" }
          }, analysingContrat ? "…" : "Ce dossier n'a pas de rapport de visite : demander les questions techniques") : null,
          React.createElement("button", { onClick: lancerAnalyseContrat, disabled: analysingContrat, style: { width: "100%", backgroundColor: "#0a2e1a", color: "#d4a920", border: "none", borderRadius: "8px", padding: "14px", fontSize: "14px", fontWeight: "700", cursor: analysingContrat ? "wait" : "pointer", fontFamily: "inherit" } },
            analysingContrat ? "Analyse en cours par l'IA…" : "Analyser avec l'IA"
          )
        ),

        // Résultat analyse
        a && React.createElement("div", null,
          // Badge niveau de risque
          React.createElement("div", { style: { display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" } },
            React.createElement("span", { style: { padding: "4px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", backgroundColor: niveauBg[a.niveauRisque] || "#f0ede6", color: niveauColor[a.niveauRisque] || "#444" } }, "Risque " + a.niveauRisque),
            React.createElement("span", { style: { padding: "4px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", backgroundColor: "#f0fdf4", color: "#065f46" } }, a.formuleRecommandee),
            React.createElement("button", { onClick: function() { setContratAnalyse(null) }, style: { marginLeft: "auto", background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", color: "#888" } }, "↺ Modifier le contexte")
          ),

          // Profil + justification
          React.createElement("div", { style: { backgroundColor: "#f8f7f4", borderRadius: "8px", padding: "16px", marginBottom: "16px", borderLeft: "4px solid #0a2e1a" } },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: "6px" } }, "Profil client"),
            React.createElement("div", { style: { fontSize: "13px", color: "#333" } }, a.profil),
            React.createElement("div", { style: { fontSize: "12px", color: "#666", marginTop: "6px", fontStyle: "italic" } }, a.justificationRisque)
          ),

          // Score commercial et niveau de contrat, arrêtés par le code
          (a.scoreCommercial != null) && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", padding: "10px 14px", backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "8px" } },
            React.createElement("div", { style: { fontSize: "20px", fontWeight: "700", color: "#6b21a8" } }, a.scoreCommercial + "/100"),
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: "13px", fontWeight: "700", color: "#6b21a8" } }, a.niveauContrat || ""),
              a.detailScore ? React.createElement("div", { style: { fontSize: "10px", color: "#7e5aa2", marginTop: "2px" } },
                "surface " + a.detailScore.superficie + " · infestation " + a.detailScore.infestation + " · client " + a.detailScore.typeClient + " · fréquence " + a.detailScore.frequence + " · fidélisation " + a.detailScore.fidelisation) : null
            )
          ),

          // Les trois formules d'engagement, sélectionnables
          offresContrat.length > 0 && React.createElement("div", { style: { marginBottom: "16px" } },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: "8px" } }, "Formules d'engagement"),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(" + offresContrat.length + ",1fr)", gap: "8px" } },
              offresContrat.map(function(o) {
                var actif = Number(o.dureeMois) === Number(dureeSelectionnee)
                return React.createElement("div", {
                  key: o.dureeMois,
                  onClick: function() { setOffreChoisie(Number(o.dureeMois)) },
                  style: { cursor: "pointer", borderRadius: "8px", padding: "12px", textAlign: "center", border: "2px solid " + (actif ? "#0a2e1a" : "#e8e6e0"), backgroundColor: actif ? "#0a2e1a" : "#fff" }
                },
                  React.createElement("div", { style: { fontSize: "10px", textTransform: "uppercase", color: actif ? "#d4a920" : "#888", fontWeight: "700" } }, o.dureeMois + " mois"),
                  React.createElement("div", { style: { fontSize: "17px", fontWeight: "300", color: actif ? "#fff" : "#0a2e1a", marginTop: "4px" } }, Number(o.prixTotal).toLocaleString("fr-FR")),
                  React.createElement("div", { style: { fontSize: "10px", color: actif ? "#aaa" : "#999", marginTop: "2px" } }, Math.round(Number(o.prixTotal) / Number(o.dureeMois)).toLocaleString("fr-FR") + " / mois")
                )
              })
            ),
            offreSelectionnee && offreSelectionnee.argumentaire ? React.createElement("div", { style: { fontSize: "12px", color: "#555", marginTop: "8px", fontStyle: "italic" } }, offreSelectionnee.argumentaire) : null
          ),

          // Grille prix / structure
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" } },
            React.createElement("div", { style: { backgroundColor: "#0a2e1a", borderRadius: "8px", padding: "14px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: "22px", fontWeight: "300", color: "#d4a920" } }, Number(prixRetenu).toLocaleString("fr-FR")),
              React.createElement("div", { style: { fontSize: "9px", color: "#aaa", textTransform: "uppercase", marginTop: "4px" } }, "FCFA / " + dureeSelectionnee + " mois")
            ),
            React.createElement("div", { style: { backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "14px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: "22px", fontWeight: "300", color: "#065f46" } }, Number(prixParPeriode).toLocaleString("fr-FR")),
              React.createElement("div", { style: { fontSize: "9px", color: "#888", textTransform: "uppercase", marginTop: "4px" } }, "FCFA / " + (a.paiementRecommande === "semestriel" ? "semestre" : a.paiementRecommande === "mensuel" ? "mois" : a.paiementRecommande === "annuel" ? "an" : "trimestre"))
            ),
            React.createElement("div", { style: { backgroundColor: "#fef9ee", borderRadius: "8px", padding: "14px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: "22px", fontWeight: "300", color: "#92400e" } }, passagesSurDuree),
              React.createElement("div", { style: { fontSize: "9px", color: "#888", textTransform: "uppercase", marginTop: "4px" } }, passagesSurDuree > 1 ? "passages inclus" : "passage inclus")
            )
          ),

          // Prestations incluses
          React.createElement("div", { style: { backgroundColor: "#f8f7f4", borderRadius: "8px", padding: "14px", marginBottom: "14px" } },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: "8px" } }, "Structure recommandée"),
            React.createElement("div", { style: { fontSize: "12px", color: "#333", display: "flex", gap: "16px", flexWrap: "wrap" } },
              React.createElement("span", null, "× " + a.frequencePassages + " passages D+D / an"),
              a.controlesMensuels > 0 && React.createElement("span", null, "× " + a.controlesMensuels + " contrôles mensuels"),
              a.auditAnnuel && React.createElement("span", null, "✓ Audit annuel")
            ),
            React.createElement("div", { style: { fontSize: "12px", color: "#555", marginTop: "6px", fontStyle: "italic" } }, a.justificationFormule)
          ),

          // Clauses spécifiques
          a.clausesSpecifiques && a.clausesSpecifiques.length > 0 && React.createElement("div", { style: { marginBottom: "14px" } },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: "8px" } }, "Clauses spécifiques recommandées"),
            a.clausesSpecifiques.map(function(c, i) {
              return React.createElement("div", { key: i, style: { fontSize: "12px", color: "#333", padding: "4px 0", borderBottom: "1px solid #f0ede6" } }, "→ " + c)
            })
          ),

          // Points d'attention
          a.pointsAttention && a.pointsAttention.length > 0 && React.createElement("div", { style: { backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "12px 14px", marginBottom: "14px" } },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", marginBottom: "6px" } }, "Points d'attention"),
            a.pointsAttention.map(function(p, i) {
              return React.createElement("div", { key: i, style: { fontSize: "12px", color: "#92400e", padding: "2px 0" } }, "⚠ " + p)
            })
          ),

          // Argument commercial
          React.createElement("div", { style: { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 14px", marginBottom: "20px" } },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#065f46", textTransform: "uppercase", marginBottom: "6px" } }, "Argument commercial"),
            React.createElement("div", { style: { fontSize: "12px", color: "#065f46", fontStyle: "italic" } }, a.argumentCommercial)
          ),

          // Bouton générer
          React.createElement("button", {
            onClick: function() {
              var params = new URLSearchParams({
                devisId: d.id,
                prixAnnuel: prixRetenu,
                prixTrimestre: prixParPeriode,
                formule: a.formuleRecommandee,
                passages: a.frequencePassages,
                controles: a.controlesMensuels || 0,
                duree: dureeSelectionnee,
                paiement: a.paiementRecommande || "trimestriel_avance",
                typeEtablissement: contratForm.typeEtablissement,
                remise: a.remiseContrat || d.remise_bienvenue || 0,
                sansNoteDevis: contratForm.inclureNoteDevis ? "0" : "1"
              })
              window.open("/api/generate-contract?" + params.toString(), "_blank")
            },
            style: { width: "100%", backgroundColor: "#0a2e1a", color: "#d4a920", border: "none", borderRadius: "8px", padding: "14px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }
          }, "📄 Générer le contrat")
        )
      )
    )
  }

  function renderVuePipeline() {
    var COLONNES = [
      { id: 'contact',      label: '📞 Contact',        color: '#0ea5e9' },
      { id: 'visite',       label: '🔍 Visite',        color: '#7c3aed' },
      { id: 'facture',      label: '💰 Facture',        color: '#0f766e' },
      { id: 'intervention', label: '🔧 Intervention',   color: '#1e40af' },
      { id: 'certificat',   label: '📋 Certificat',     color: '#b45309' },
      { id: 'encaissement', label: '💳 Encaissement',   color: '#0a2e1a' },
      { id: 'cloture',      label: '✅ Clôturé',        color: '#16a34a' },
    ]

    var ETAPES = [
      { id: 'contact',             label: 'Contact initial',       auto: true },
      { id: 'visite',              label: 'Visite de site',        auto: false },
      { id: 'rapport_visite',      label: 'Rapport de synthèse',   auto: false },
      { id: 'devis',               label: 'Devis',                 auto: true },
      { id: 'facture',             label: 'Facture',               auto: false },
      { id: 'intervention',        label: 'Intervention',          auto: false },
      { id: 'fiche',               label: 'Fiche de passage',      auto: true },
      { id: 'rapport_intervention',label: "Rapport d'intervention", auto: false },
      { id: 'certificat',          label: 'Certificat GSE',        auto: true },
      { id: 'encaissement',        label: 'Encaissement vérifié',  auto: false },
    ]

    function isEtapeDone(d, etapeId) {
      var p = d.parcours || {}
      if (p[etapeId] && p[etapeId].override !== undefined) return p[etapeId].override
      var hasFiche = fichesList.some(function(f) { return f.devis_id === d.id })
      var hasCert = certsList.some(function(c) { return c.devis_id === d.id })
      if (etapeId === 'contact') return true
      if (etapeId === 'devis') return true
      if (etapeId === 'fiche') return hasFiche
      if (etapeId === 'certificat') return hasCert
      return !!(p[etapeId] && p[etapeId].done)
    }

    function getColonne(d) {
      var p = d.parcours || {}
      var hasFiche = fichesList.some(function(f) { return f.devis_id === d.id })
      var hasCert = certsList.some(function(c) { return c.devis_id === d.id })
      if (hasCert && p.encaissement && p.encaissement.done) return 'cloture'
      if (hasCert) return 'encaissement'
      if ((p.intervention && p.intervention.done) || hasFiche) return 'certificat'
      if (p.facture && p.facture.done) return 'intervention'
      if (p.visite && p.visite.done) return 'facture'
      if (d.statut === 'brouillon') return 'contact'
      return 'visite'
    }

    function getProgress(d) {
      var done = ETAPES.filter(function(e) { return isEtapeDone(d, e.id) }).length
      return Math.round((done / ETAPES.length) * 100)
    }

    function toggleEtape(d, etapeId, currentDone) {
      var p = Object.assign({}, d.parcours || {})
      var isAuto = ETAPES.find(function(e) { return e.id === etapeId && e.auto })
      if (isAuto) {
        p[etapeId] = { override: !currentDone, date: !currentDone ? new Date().toISOString().split('T')[0] : null }
      } else {
        p[etapeId] = { done: !currentDone, date: !currentDone ? new Date().toISOString().split('T')[0] : null }
      }
      saveParcours(d.id, p)
    }

    function getNomClient(d) {
      var cl = d.clients || clients.find(function(c) { return c.id === d.client_id })
      if (!cl) return 'Client inconnu'
      return cl.entreprise || [cl.prenom, cl.nom].filter(Boolean).join(' ')
    }

    function renderChecklist(d) {
      return React.createElement('div', { style: { backgroundColor: '#f8f7f4', borderRadius: '6px', padding: '10px', marginTop: '10px' } },
        React.createElement('div', { style: { fontSize: '10px', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' } }, 'Parcours complet'),
        ETAPES.map(function(etape) {
          var done = isEtapeDone(d, etape.id)
          var p = d.parcours || {}
          var isManualOverride = etape.auto && p[etape.id] && p[etape.id].override !== undefined
          var date = p[etape.id] && p[etape.id].date ? p[etape.id].date : null
          return React.createElement('div', { key: etape.id, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: '1px solid #eee' } },
            React.createElement('button', {
              onClick: function() { toggleEtape(d, etape.id, done) },
              title: done ? 'Marquer non fait' : 'Marquer fait',
              style: { background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', padding: 0, flexShrink: 0 }
            }, done ? '✅' : '⬜'),
            React.createElement('span', { style: { fontSize: '11px', color: done ? '#0a2e1a' : '#888', flex: 1, fontWeight: done ? '600' : '400' } }, etape.label),
            isManualOverride
              ? React.createElement('span', { style: { fontSize: '9px', color: '#d4a920', fontWeight: '700', backgroundColor: '#fffbeb', borderRadius: '3px', padding: '1px 4px' } }, 'manuel')
              : etape.auto
                ? React.createElement('span', { style: { fontSize: '9px', color: '#bbb', backgroundColor: '#e8e6e0', borderRadius: '3px', padding: '1px 4px' } }, 'auto')
                : date ? React.createElement('span', { style: { fontSize: '9px', color: '#aaa' } }, date) : null
          )
        })
      )
    }

    function renderCard(d) {
      var progress = getProgress(d)
      var nomClient = getNomClient(d)
      var montant = d.montant_total ? Number(d.montant_total).toLocaleString('fr-FR') + ' F' : ''
      var clientObj = d.clients || clients.find(function(c) { return c.id === d.client_id })
      return React.createElement('div', { key: d.id,
        onClick: function() { if (clientObj) { setClientDetail(clientObj); setVue('devis-client') } },
        title: 'Ouvrir le tableau de bord',
        style: { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }
      },
        React.createElement('div', { style: { fontSize: '12px', fontWeight: '700', color: '#0a2e1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' } }, nomClient),
        d.numero ? React.createElement('div', { style: { fontSize: '10px', color: '#aaa', marginBottom: '4px' } }, d.numero) : null,
        montant ? React.createElement('div', { style: { fontSize: '11px', color: '#1e40af', fontWeight: '600', marginBottom: '6px' } }, montant) : null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
          React.createElement('div', { style: { flex: 1, height: '3px', backgroundColor: '#e8e6e0', borderRadius: '2px' } },
            React.createElement('div', { style: { width: progress + '%', height: '100%', backgroundColor: progress === 100 ? '#16a34a' : '#0a2e1a', borderRadius: '2px' } })
          ),
          React.createElement('span', { style: { fontSize: '10px', color: progress === 100 ? '#16a34a' : '#888', fontWeight: '700', flexShrink: 0 } }, progress + '%')
        )
      )
    }

    return React.createElement('div', null,
      React.createElement('div', { style: { fontSize: '13px', color: '#888', marginBottom: '20px' } }, 'Suivi du parcours client — de la visite jusqu\'à l\'encaissement.'),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(190px, 1fr))', gap: '10px', overflowX: 'auto', paddingBottom: '12px' } },
        COLONNES.map(function(col) {
          var devisColonne = devisList.filter(function(d) { return getColonne(d) === col.id })
          return React.createElement('div', { key: col.id },
            React.createElement('div', { style: { backgroundColor: col.color, color: '#fff', borderRadius: '8px 8px 0 0', padding: '10px 12px', fontSize: '12px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              col.label,
              React.createElement('span', { style: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '10px', padding: '1px 8px', fontSize: '11px' } }, devisColonne.length)
            ),
            React.createElement('div', { style: { backgroundColor: '#f2f0ec', borderRadius: '0 0 8px 8px', padding: '8px', minHeight: '180px' } },
              devisColonne.length === 0
                ? React.createElement('div', { style: { textAlign: 'center', color: '#ccc', fontSize: '11px', paddingTop: '24px' } }, '—')
                : devisColonne.map(function(d) { return renderCard(d) })
            )
          )
        })
      )
    )
  }

  function ouvrirContratExistant(contrat) {
    if (!contrat.params) return
    var p = contrat.params
    var params = new URLSearchParams({
      devisId:           contrat.devis_id,
      prixAnnuel:        p.prixAnnuel || 200000,
      prixTrimestre:     p.prixTrim   || 50000,
      formule:           p.formule    || "Formule Intégrale",
      passages:          p.passages   || 4,
      controles:         p.controles  || 0,
      duree:             p.duree      || 12,
      paiement:          p.paiement   || "trimestriel_avance",
      typeEtablissement: p.typeEtablissement || "",
      remise:            p.remisePassed || 0,
      sansNoteDevis:     p.sansNoteDevis ? "1" : "0"
    })
    window.open("/api/generate-contract?" + params.toString(), "_blank")
  }

  // ── Onglet Contrats : suivi des engagements signés ────────────────────────
  // Le contrat signé vit sur le devis (type_crm, date_debut_contrat, durée,
  // fréquence). La table contrats ne trace que les PDF générés : un PDF généré
  // ne veut pas dire signé, d'où les deux sections distinctes.
  async function marquerContratSigne(devisId) {
    var f = signForm[devisId] || {}
    if (!f.dateDebut) { setMsg("Erreur : indiquez la date de début du contrat."); return }
    setSignEnCours(devisId)
    try {
      var sess = await db.auth.getSession()
      var token = (sess.data.session && sess.data.session.access_token) || ""
      var res = await fetch("/api/crm-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({
          action: "marquer_contrat_signe",
          devisId: devisId,
          dateDebut: f.dateDebut,
          dureeMois: parseInt(f.dureeMois) || 12,
          frequence: f.frequence || "trimestrielle"
        })
      })
      var data = await res.json()
      if (!res.ok || !data.ok) { setMsg("Erreur : " + (data.error || "signature impossible")) }
      else if (data.passagesExistants > 0) { setMsg("✓ Contrat marqué signé. Planning conservé : " + data.passagesExistants + " passages déjà en place.") }
      else { setMsg("✓ Contrat marqué signé, " + data.passagesCrees + " passages planifiés.") }
      await charger()
    } catch (e) { setMsg("Erreur réseau : " + e.message) }
    setSignEnCours(null)
  }

  function renderVueContrats() {
    var e = React.createElement
    var auj = new Date().toISOString().slice(0, 10)
    var signes = devisList.filter(function(d) { return d.type_crm === "contrat" || d.date_debut_contrat })
    // PDF générés dont le devis n'est pas marqué signé : ils ne sont pas des contrats.
    var idsSignes = {}
    signes.forEach(function(d) { idsSignes[d.id] = true })
    var aSigner = (contratsList || []).filter(function(c) { return !idsSignes[c.devis_id] })

    var ST_CONTRAT = {
      actif:        { libelle: "Actif",         bg: "#f0fdf4", tc: "#065f46", bord: "#bbf7d0" },
      a_renouveler: { libelle: "À renouveler",  bg: "#fffbeb", tc: "#92400e", bord: "#fde68a" },
      a_venir:      { libelle: "À venir",       bg: "#eff6ff", tc: "#1e40af", bord: "#bfdbfe" },
      termine:      { libelle: "Terminé",       bg: "#f5f5f4", tc: "#57534e", bord: "#e7e5e4" },
      sans_date:    { libelle: "Sans date",     bg: "#fef2f2", tc: "#991b1b", bord: "#fecaca" },
    }
    var fmtJ = function(iso) { return iso ? new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" }) : "—" }

    function renderFrise(d) {
      var cl = d.clients || clients.find(function(c) { return c.id === d.client_id })
      var r = resumeContrat({ devis: d, interventions: interventionsList }, auj)
      var st = ST_CONTRAT[r.statut] || ST_CONTRAT.actif
      var t0 = r.debut ? new Date(r.debut + "T00:00:00").getTime() : null
      var t1 = r.fin ? new Date(r.fin + "T00:00:00").getTime() : null
      var span = (t0 && t1 && t1 > t0) ? (t1 - t0) : null
      var pctAuj = span ? Math.min(100, Math.max(0, (new Date(auj + "T00:00:00").getTime() - t0) / span * 100)) : null

      return e("div", { key: d.id, style: { backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "18px 20px", marginBottom: "14px" } },
        e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "4px" } },
          e("div", null,
            e("div", { style: { fontSize: "15px", fontWeight: "700", color: "#0a2e1a" } }, (cl && cl.nom) || "Client inconnu"),
            e("div", { style: { fontSize: "12px", color: "#888", marginTop: "2px" } },
              d.numero + " · " + (d.frequence_intervention || "trimestrielle") + " · " + Number(d.montant_net || 0).toLocaleString("fr-FR") + " FCFA")
          ),
          e("span", { style: { flexShrink: 0, backgroundColor: st.bg, color: st.tc, border: "1px solid " + st.bord, borderRadius: "20px", padding: "3px 12px", fontSize: "11px", fontWeight: "700" } }, st.libelle)
        ),
        e("div", { style: { fontSize: "12px", color: "#555", marginBottom: "14px" } }, d.prestation || ""),

        // Frise : barre de durée + jalons de passage
        span ? e("div", { style: { position: "relative", height: "38px", marginBottom: "10px" } },
          e("div", { style: { position: "absolute", top: "16px", left: 0, right: 0, height: "4px", backgroundColor: "#e8e6e0", borderRadius: "2px" } }),
          pctAuj != null ? e("div", { style: { position: "absolute", top: "16px", left: 0, width: pctAuj + "%", height: "4px", backgroundColor: "#0a2e1a", borderRadius: "2px" } }) : null,
          r.passages.map(function(p, i) {
            var pct = Math.min(100, Math.max(0, (new Date(p.date + "T00:00:00").getTime() - t0) / span * 100))
            var fait = p.statut === "terminee"
            var ctrl = p.type === "controle"
            var retard = !fait && p.date < auj
            return e("div", {
              key: i,
              title: fmtJ(p.date) + " · " + (ctrl ? "contrôle" : "intervention") + " · " + (fait ? "terminé" : (retard ? "EN RETARD" : "prévu")) + (p.technicien ? " · " + p.technicien : " · aucun technicien"),
              style: {
                position: "absolute", top: ctrl ? "12px" : "10px", left: "calc(" + pct + "% - 6px)",
                width: ctrl ? "10px" : "14px", height: ctrl ? "10px" : "14px", borderRadius: "50%",
                backgroundColor: fait ? "#0a2e1a" : (retard ? "#fee2e2" : "#fff"),
                border: "2px solid " + (fait ? "#0a2e1a" : (retard ? "#991b1b" : (ctrl ? "#bbb" : "#0a2e1a"))),
                boxSizing: "border-box", cursor: "help"
              }
            })
          })
        ) : null,

        e("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888", marginBottom: "10px" } },
          e("span", null, r.debut ? fmtJ(r.debut) : "début non renseigné"),
          e("span", null, r.fin ? "→ " + fmtJ(r.fin) : "")
        ),

        e("div", { style: { display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px", alignItems: "center" } },
          e("span", { style: { color: "#555" } }, "● intervention   ○ contrôle"),
          e("span", { style: { color: "#0a2e1a", fontWeight: "600" } }, r.faits + " / " + r.total + " passages faits"),
          (r.enRetard && r.enRetard.length > 0) ? e("span", { style: { color: "#991b1b", fontWeight: "700" } },
            "⚠ " + r.enRetard.length + " passage(s) en retard, depuis le " + fmtJ(r.enRetard[0].date)) : null,
          r.prochain ? e("span", { style: { color: "#1e40af" } }, "→ prochain : " + fmtJ(r.prochain.date) + " " + (r.prochain.type === "controle" ? "contrôle" : "intervention")) : null,
          r.sansTechnicien > 0 ? e("span", { style: { color: "#92400e", fontWeight: "600" } }, "⚠ " + r.sansTechnicien + " passage(s) sans technicien") : null,
          (r.total === 0 && r.passagesAttendus > 0) ? e("span", { style: { color: "#991b1b", fontWeight: "600" } }, "⚠ aucun passage planifié, " + r.passagesAttendus + " attendus") : null
        ),
        e("div", { style: { marginTop: "12px" } },
          e("button", { onClick: function() { voirDevisClient(cl) }, style: { background: "none", border: "1px solid #e0ddd6", color: "#555", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "📊 Ouvrir le dossier")
        )
      )
    }

    function renderASigner(c) {
      var d = devisList.find(function(x) { return x.id === c.devis_id })
      var cl = (d && d.clients) || clients.find(function(x) { return x.id === c.client_id })
      var f = signForm[c.devis_id] || {}
      var maj = function(champ, val) {
        setSignForm(function(prev) {
          var o = Object.assign({}, prev)
          o[c.devis_id] = Object.assign({}, o[c.devis_id] || {}, (function() { var q = {}; q[champ] = val; return q })())
          return o
        })
      }
      var inp2 = { padding: "7px 9px", border: "1.5px solid #e0ddd6", borderRadius: "6px", fontSize: "12px", fontFamily: "inherit", boxSizing: "border-box" }
      return e("div", { key: c.id, style: { backgroundColor: "#fff", border: "1px solid #e9d5ff", borderRadius: "10px", padding: "14px 16px", marginBottom: "10px" } },
        e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" } },
          e("div", null,
            e("div", { style: { fontSize: "13px", fontWeight: "700", color: "#6b21a8" } }, (cl && cl.nom) || "Client inconnu"),
            e("div", { style: { fontSize: "11px", color: "#888", marginTop: "2px" } }, c.reference + " · PDF généré le " + fmtJ(c.date_generation ? String(c.date_generation).slice(0, 10) : null))
          ),
          e("div", { style: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" } },
            e("input", { type: "date", value: f.dateDebut || "", onChange: function(ev) { maj("dateDebut", ev.target.value) }, title: "Date de début du contrat", style: inp2 }),
            e("select", { value: f.dureeMois || "12", onChange: function(ev) { maj("dureeMois", ev.target.value) }, style: inp2 },
              ["3", "6", "12", "24"].map(function(m) { return e("option", { key: m, value: m }, m + " mois") })
            ),
            e("select", { value: f.frequence || "trimestrielle", onChange: function(ev) { maj("frequence", ev.target.value) }, style: inp2 },
              ["mensuelle", "bimestrielle", "trimestrielle", "semestrielle", "annuelle"].map(function(x) { return e("option", { key: x, value: x }, x) })
            ),
            e("button", {
              onClick: function() { marquerContratSigne(c.devis_id) },
              disabled: signEnCours === c.devis_id,
              style: { backgroundColor: "#0a2e1a", color: "#d4a920", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }
            }, signEnCours === c.devis_id ? "..." : "Marquer signé")
          )
        )
      )
    }

    var actifs = signes.filter(function(d) {
      var st = resumeContrat({ devis: d, interventions: interventionsList }, auj).statut
      return st === "actif" || st === "a_renouveler" || st === "a_venir"
    })
    var totalActif = actifs.reduce(function(s, d) { return s + Number(d.montant_net || 0) }, 0)

    return e("div", null,
      e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" } },
        e("strong", { style: { fontSize: "15px", color: "#111" } }, "Contrats signés"),
        e("span", { style: { fontSize: "12px", color: "#888" } },
          actifs.length + " en cours · " + totalActif.toLocaleString("fr-FR") + " FCFA")
      ),
      signes.length === 0
        ? e("div", { style: { textAlign: "center", padding: "36px", backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", color: "#888", fontSize: "13px" } },
            "Aucun contrat signé. Marquez un contrat généré comme signé ci-dessous pour le suivre ici.")
        : e("div", null, signes.map(renderFrise)),

      aSigner.length > 0 ? e("div", { style: { marginTop: "26px" } },
        e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
          e("strong", { style: { fontSize: "13px", color: "#6b21a8" } }, "Contrats générés, non marqués signés"),
          e("span", { style: { fontSize: "12px", color: "#888" } }, aSigner.length)
        ),
        e("div", { style: { fontSize: "11px", color: "#888", marginBottom: "10px" } },
          "Un PDF généré ne vaut pas signature. Renseignez la date de début pour lancer le suivi et planifier les passages."),
        aSigner.map(renderASigner)
      ) : null
    )
  }

  function renderVueDocuments() {
    var docs = []
    certsList.forEach(function(c) {
      var client = clients.find(function(cl) { return cl.id === c.client_id })
      docs.push({ _type: "cert", _id: c.id, _devisId: c.devis_id, _rawCert: c, numero: c.numero_unique, client: client, date: c.created_at, envoye: c.envoye, envoye_at: c.envoye_at, sousType: c.type })
    })
    fichesList.forEach(function(f) {
      var client = clients.find(function(cl) { return cl.id === f.client_id })
      docs.push({ _type: "fiche", _id: f.id, _raw: f, numero: f.numero_unique, client: client, date: f.created_at, envoye: f.envoye, envoye_at: f.envoye_at })
    })
    contratsList.forEach(function(ct) {
      var client = clients.find(function(cl) { return cl.id === ct.client_id })
      docs.push({ _type: "contrat", _id: ct.id, _raw: ct, numero: ct.reference, client: client, date: ct.created_at, envoye: false })
    })
    rapportsVisite.forEach(function(r) {
      var client = clients.find(function(cl) { return cl.id === r.client_id })
      docs.push({ _type: "rapport_visite", _id: r.id, _devisId: r.devis_id, _rawRV: r, numero: r.numero_unique, client: client, date: r.created_at })
    })
    rapportsInterv.forEach(function(r) {
      var client = clients.find(function(cl) { return cl.id === r.client_id })
      docs.push({ _type: "rapport_interv", _id: r.id, _devisId: r.devis_id, _rawRI: r, numero: r.numero_unique, client: client, date: r.created_at })
    })
    docs.sort(function(a, b) { return new Date(b.date) - new Date(a.date) })

    var docsFiltres = filtreDoc === "contrats"
      ? docs.filter(function(d) { return d._type === "contrat" })
      : filtreDoc === "envoyes"
        ? docs.filter(function(d) { return d.envoye })
        : filtreDoc === "attente"
          ? docs.filter(function(d) { return !d.envoye && d._type !== "contrat" })
          : docs

    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" } },
        React.createElement("strong", { style: { fontSize: "15px", color: "#111" } }, "Documents"),
        React.createElement("button", { onClick: charger, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "↺")
      ),
      React.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" } },
        [
          ["tous",     "Tous (" + docs.length + ")"],
          ["contrats", "Contrats (" + contratsList.length + ")"],
          ["envoyes",  "Envoyés (" + docs.filter(function(d) { return d.envoye }).length + ")"],
          ["attente",  "En attente (" + docs.filter(function(d) { return !d.envoye && d._type !== "contrat" }).length + ")"]
        ].map(function(f) {
          return React.createElement("button", { key: f[0], onClick: function() { setFiltreDoc(f[0]) }, style: { padding: "5px 14px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", border: "none", fontFamily: "inherit", backgroundColor: filtreDoc === f[0] ? "#0a2e1a" : "#f0ede6", color: filtreDoc === f[0] ? "#fff" : "#444", fontWeight: filtreDoc === f[0] ? "700" : "400" } }, f[1])
        })
      ),
      docsFiltres.length === 0
        ? React.createElement("div", { style: { textAlign: "center", padding: "40px", backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", color: "#888" } }, "Aucun document.")
        : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } },
            docsFiltres.map(function(doc) {
              var isContrat = doc._type === "contrat"
              var isCert    = doc._type === "cert"
              var isRV      = doc._type === "rapport_visite"
              var isRI      = doc._type === "rapport_interv"
              var icon = isContrat ? "📄" : isRV ? "🔍" : isRI ? "📊" : isCert ? (doc.sousType === "desinsect" ? "🪲" : doc.sousType === "double" ? "🪲🐭" : "🐭") : "📋"
              var typeLabel = isContrat ? "Contrat d'entretien" : isRV ? "Rapport de visite" : isRI ? "Rapport d'intervention" : isCert ? (doc.sousType === "desinsect" ? "Certificat Désinsect." : doc.sousType === "double" ? "Certificat Combiné" : "Certificat Dératisation") : "Fiche de passage"
              var clientNom = doc.client ? ([doc.client.prenom, doc.client.nom].filter(Boolean).join(" ") + (doc.client.entreprise ? " — " + doc.client.entreprise : "")) : "Client inconnu"
              var dateStr = doc.date ? new Date(doc.date).toLocaleDateString("fr-FR") : "—"
              var borderColor = isContrat ? "#e9d5ff" : isRV ? "#bae6fd" : isRI ? "#fed7aa" : "#e8e6e0"
              var bgColor     = isContrat ? "#faf5ff" : isRV ? "#f0f9ff" : isRI ? "#fff7ed" : "#fff"
              return React.createElement("div", { key: doc._type + doc._id, style: { backgroundColor: bgColor, border: "1px solid " + borderColor, borderRadius: "8px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px" } },
                React.createElement("span", { style: { fontSize: "22px", flexShrink: 0 } }, icon),
                React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                  React.createElement("div", { style: { fontSize: "13px", fontWeight: "700", color: "#0a2e1a" } }, doc.numero || "—"),
                  React.createElement("div", { style: { fontSize: "12px", color: "#555", marginTop: "2px" } }, typeLabel + " · " + clientNom),
                  React.createElement("div", { style: { fontSize: "11px", color: "#999", marginTop: "2px" } }, dateStr)
                ),
                React.createElement("div", { style: { display: "flex", gap: "6px", alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" } },
                  isContrat
                    ? React.createElement("button", {
                        onClick: function() { ouvrirContratExistant(doc._raw) },
                        style: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" }
                      }, "🖨️ Réimprimer")
                    : isRV
                      ? React.createElement("button", {
                          onClick: function() { var d = devisList.find(function(x) { return x.id === doc._devisId }); ouvrirRapportVisite(doc._rawRV, d || { id: doc._devisId }, doc.client || {}) },
                          style: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" }
                        }, "👁 Voir / Modifier")
                      : isRI
                        ? React.createElement("button", {
                            onClick: function() { var d = devisList.find(function(x) { return x.id === doc._devisId }); ouvrirRapportInterv(doc._rawRI, d || { id: doc._devisId }, doc.client || {}) },
                            style: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" }
                          }, "👁 Voir / Modifier")
                        : React.createElement("button", {
                            onClick: function() { isCert ? apercuCert(doc._rawCert) : apercuFiche(doc._raw, doc.client) },
                            style: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" }
                          }, "👁 Aperçu"),
                  !isContrat && !isRV && !isRI && React.createElement("button", {
                    onClick: function() { isCert ? toggleCertEnvoye({ id: doc._id, envoye: doc.envoye, envoye_at: doc.envoye_at }) : toggleFicheEnvoye({ id: doc._id, envoye: doc.envoye, envoye_at: doc.envoye_at }) },
                    title: doc.envoye ? ("Envoyé le " + new Date(doc.envoye_at).toLocaleDateString("fr-FR")) : "Marquer comme envoyé",
                    style: { background: doc.envoye ? "#0a2e1a" : "#fff", color: doc.envoye ? "#fff" : "#999", border: "1px solid " + (doc.envoye ? "#0a2e1a" : "#ccc"), borderRadius: "20px", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "700" }
                  }, doc.envoye ? "✓ " + (isCert ? "Envoyé" : "Remis") : (isCert ? "Envoyé ?" : "Remis ?")),
                  !isContrat && !isRV && !isRI && (isCert
                    ? React.createElement("button", {
                        onClick: function() { var d = devisList.find(function(x) { return x.id === doc._devisId }); rouvrirCertModal(doc._rawCert, d, doc.client) },
                        style: { background: "#fff", color: "#0a2e1a", border: "1px solid #0a2e1a", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }
                      }, "✏️ Modifier")
                    : React.createElement("button", {
                        onClick: function() { reouvrirFicheModal(doc._raw, doc.client) },
                        style: { background: "#fff", color: "#0a2e1a", border: "1px solid #0a2e1a", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }
                      }, "✏️ Modifier")),
                  React.createElement("button", {
                    onClick: function() { isContrat ? (window.confirm("Supprimer ce contrat ?") && db.from("contrats").delete().eq("id", doc._id).then(charger)) : isRV ? supprimerRapportVisite(doc._id) : isRI ? supprimerRapportIntervById(doc._id) : isCert ? supprimerCertificat(doc._id) : supprimerFiche(doc._id) },
                    style: { background: "#fff", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }
                  }, "🗑")
                )
              )
            })
          )
    )
  }

  async function chargerLeadsTraites() {
    var sess = await db.auth.getSession()
    var token = (sess.data.session && sess.data.session.access_token) || ""
    var res = await fetch("/api/crm-data?action=get_leads_traites", { headers: { "Authorization": "Bearer " + token } })
    var data = await res.json()
    setLeadsTraites(data.leads || [])
  }
  async function restaurerLead(lead) {
    var sess = await db.auth.getSession()
    var token = (sess.data.session && sess.data.session.access_token) || ""
    await fetch("/api/crm-data", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify({ action: "set_lead_traite", id: lead.id, traite: false }) })
    setLeadsTraites(function(prev) { return prev.filter(function(l) { return l.id !== lead.id }) })
    setLeads(function(prev) { return [lead].concat(prev) })
  }
  async function supprimerLead(lead) {
    if (!confirm("Supprimer définitivement le lead « " + lead.nom + " » ?\n\nCette action est irréversible.")) return
    var sess = await db.auth.getSession()
    var token = (sess.data.session && sess.data.session.access_token) || ""
    await fetch("/api/crm-data", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify({ action: "delete_lead", id: lead.id }) })
    setLeads(function(prev) { return prev.filter(function(l) { return l.id !== lead.id }) })
    setLeadsTraites(function(prev) { return prev.filter(function(l) { return l.id !== lead.id }) })
  }
  // Convertit un lead : pré-remplit la fiche Nouveau client et bascule sur l'onglet Clients.
  // Le lead sera archivé (traité) automatiquement après création du client (voir sauvegarderClient).
  function convertirLead(lead) {
    setEditingClient(null)
    setFormClient({ prenom: "", nom: lead.nom || "", email: lead.email || "", telephone: lead.telephone || "", entreprise: "", adresse: lead.ville || "" })
    setLeadEnConversion(lead)
    setShowFormClient(true)
    setVue("clients")
    setMsg("Complétez la fiche client puis enregistrez — le lead sera archivé automatiquement.")
  }

  function renderVueDevis() {
    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" } },
        React.createElement("strong", { style: { fontSize: "15px", color: "#111" } }, "Tous les devis"),
        React.createElement("div", { style: { display: "flex", gap: "8px" } },
          React.createElement("button", { onClick: charger, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "↺")
        )
      ),
      renderFormDevis(),
      leads.length > 0 && React.createElement("div", { style: { backgroundColor: "#fff8e1", border: "1px solid #d4a920", borderRadius: "8px", padding: "14px 16px", marginBottom: "20px" } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" } },
          React.createElement("strong", { style: { fontSize: "13px", color: "#0a2e1a" } }, "Leads site — offre de bienvenue"),
          React.createElement("span", { style: { backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "9px", fontWeight: "800", padding: "2px 8px", borderRadius: "20px" } }, leads.length + " en attente")
        ),
        leads.map(function(lead) {
          return React.createElement("div", { key: lead.id, style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #f0e8c8" } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: "13px", fontWeight: "700", color: "#0a2e1a" } }, lead.nom),
              React.createElement("div", { style: { fontSize: "11px", color: "#666", marginTop: "2px" } }, [lead.telephone, lead.email, lead.nuisible, lead.ville].filter(Boolean).join(" · ")),
              lead.created_at ? React.createElement("div", { style: { fontSize: "10px", color: "#b0885a", marginTop: "3px", fontWeight: "600" } }, "📅 Reçu le " + finFmtD(lead.created_at.split("T")[0])) : null
            ),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "10px" } },
              React.createElement("button", {
                onClick: async function() {
                  if (!confirm("Marquer « " + lead.nom + " » comme traité ?\n\nIl quittera la liste d'attente (récupérable via « Voir les leads traités »).")) return
                  var sess = await db.auth.getSession()
                  var token = (sess.data.session && sess.data.session.access_token) || ""
                  await fetch("/api/crm-data", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify({ action: "set_lead_traite", id: lead.id, traite: true }) })
                  setLeads(function(prev) { return prev.filter(function(l) { return l.id !== lead.id }) })
                },
                style: { backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }
              }, "Traiter →"),
              React.createElement("button", { onClick: function() { supprimerLead(lead) }, title: "Supprimer ce lead", style: { background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "5px 9px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "🗑")
            )
          )
        })
      ),
      React.createElement("div", { style: { marginBottom: "16px" } },
        React.createElement("button", {
          onClick: function() { var next = !showTraites; setShowTraites(next); if (next) chargerLeadsTraites() },
          style: { background: "none", border: "1px solid #e0ddd6", color: "#888", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }
        }, showTraites ? "▲ Masquer les leads traités" : "▼ Voir les leads traités"),
        showTraites && React.createElement("div", { style: { marginTop: "10px", backgroundColor: "#f8f7f4", border: "1px solid #e8e6e0", borderRadius: "8px", padding: "12px 16px" } },
          leadsTraites.length === 0
            ? React.createElement("div", { style: { fontSize: "12px", color: "#999", textAlign: "center", padding: "8px" } }, "Aucun lead traité.")
            : leadsTraites.map(function(lead) {
                return React.createElement("div", { key: lead.id, style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #eceae4" } },
                  React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: "13px", fontWeight: "600", color: "#555" } }, lead.nom),
                    React.createElement("div", { style: { fontSize: "11px", color: "#999", marginTop: "2px" } }, [lead.telephone, lead.email, lead.nuisible, lead.ville].filter(Boolean).join(" · ")),
                    lead.created_at ? React.createElement("div", { style: { fontSize: "10px", color: "#b0aca3", marginTop: "3px", fontWeight: "600" } }, "📅 Reçu le " + finFmtD(lead.created_at.split("T")[0])) : null
                  ),
                  React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "10px" } },
                    React.createElement("button", {
                      onClick: function() { restaurerLead(lead) },
                      style: { background: "none", border: "1px solid #bbf7d0", color: "#1a6b38", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }
                    }, "↩ Remettre"),
                    React.createElement("button", { onClick: function() { supprimerLead(lead) }, title: "Supprimer ce lead", style: { background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "5px 9px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "🗑")
                  )
                )
              })
        )
      ),
      React.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" } },
        ["tous", "envoye", "accepte", "modification_demandee", "en_cours", "termine", "annule"].map(function(st) {
          var count = st === "tous" ? devisList.length : devisList.filter(function(d) { return d.statut === st }).length
          return React.createElement("button", { key: st, onClick: function() { setFiltre(st) }, style: { padding: "5px 12px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", border: "none", fontFamily: "inherit", backgroundColor: filtre === st ? "#0a2e1a" : "#f0ede6", color: filtre === st ? "#fff" : "#444", fontWeight: filtre === st ? "700" : "400" } },
            (st === "tous" ? "Tous" : (STATUTS[st] ? STATUTS[st].label : st)) + " (" + count + ")"
          )
        })
      ),
      loading
        ? React.createElement("div", { style: { textAlign: "center", padding: "40px", color: "#888" } }, "Chargement...")
        : filtresDevis.length === 0
          ? React.createElement("div", { style: { textAlign: "center", padding: "40px", backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", color: "#888" } }, "Aucun devis.")
          : React.createElement("div", null, filtresDevis.map(function(d) { return renduDevis(d) }))
    )
  }

  return React.createElement("div", null,
    certModal ? renderCertModal() : null,
    ficheModal ? renderFicheModal() : null,
    rapportVisiteModal ? renderRapportVisiteModal() : null,
    rapportIntervModal ? renderRapportIntervModal() : null,
    contratModal ? renderContratModal() : null,
    renderCompteurs(),
    msg ? React.createElement("div", { style: { padding: "12px 16px", backgroundColor: msg.startsWith("Erreur") ? "#fef2f2" : "#f0fdf4", border: "1px solid " + (msg.startsWith("Erreur") ? "#fecaca" : "#bbf7d0"), borderRadius: "6px", color: msg.startsWith("Erreur") ? "#991b1b" : "#065f46", fontSize: "13px", marginBottom: "18px", display: "flex", justifyContent: "space-between" } },
      msg,
      React.createElement("span", { onClick: function() { setMsg("") }, style: { cursor: "pointer", opacity: 0.5 } }, "×")
    ) : null,
    renderOnglets(),
    vue === "clients" ? renderVueClients() : null,
    vue === "devis-client" ? renderVueDevisClient() : null,
    vue === "devis" ? renderVueDevis() : null,
    vue === "pipeline" ? renderVuePipelineUnifie() : null,
    vue === "finances" ? renderVueFinances() : null,
    vue === "analyse" ? renderVueAnalyse() : null,
    vue === "contrats" ? renderVueContrats() : null,
    vue === "documents" ? renderVueDocuments() : null
  )
}

var GSE_DOC_STYLES = '<style>' +
  '* { box-sizing: border-box; margin: 0; padding: 0; }' +
  'body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; background: #f5f5f0; }' +
  '.noprint { text-align: center; padding: 12px; background: #f0fdf4; border-bottom: 1px solid #bbf7d0; }' +
  '.noprint button { background: #0a2e1a; color: #d4a920; border: none; border-radius: 6px; padding: 9px 24px; font-size: 13px; font-weight: 700; cursor: pointer; margin: 4px; font-family: inherit; }' +
  '.noprint button.sec { background: #fff; color: #0a2e1a; border: 1px solid #0a2e1a; }' +
  '.page { max-width: 780px; margin: 0 auto; background: #fff; }' +
  '.hdr { background: #0a2e1a; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; }' +
  '.hdr-left .sub { color: #d4a920; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 4px; }' +
  '.hdr-left .name { color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 0.03em; }' +
  '.hdr-right { text-align: right; }' +
  '.hdr-right .title { color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }' +
  '.hdr-right .ref { color: #d4a920; font-size: 12px; margin-top: 4px; }' +
  '.agr { background: #d4a920; padding: 5px 12px; font-size: 10px; color: #0a2e1a; font-weight: 700; letter-spacing: 0.06em; }' +
  '.body { padding: 22px 28px; }' +
  '.section { margin-bottom: 14px; }' +
  '.section-title { font-size: 10px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid #0a2e1a; padding-bottom: 4px; margin-bottom: 8px; }' +
  '.value-box { border: 1px solid #e0ddd6; border-radius: 4px; padding: 8px 12px; min-height: 28px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }' +
  '.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }' +
  '.badge { display: inline-block; padding: 3px 10px; border-radius: 4px; color: #fff; font-weight: 700; font-size: 12px; }' +
  '.sig-zone { border: 1px solid #ccc; border-radius: 6px; padding: 12px; min-height: 80px; }' +
  '.sig-title { font-size: 10px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }' +
  '.gse-footer { background: #f0ede6; border-top: 1px solid #e0ddd6; padding: 8px 28px; text-align: center; font-size: 10px; color: #888; line-height: 1.6; }' +
  '.photos-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 8px; page-break-inside: avoid; }' +
  '.photos-grid > div { aspect-ratio: 1; overflow: hidden; border-radius: 6px; border: 1px solid #e0ddd6; }' +
  '.photos-grid img { width: 100%; height: 100%; object-fit: cover; display: block; }' +
  '@media print {' +
  '  @page { size: A4 portrait; margin: 7mm 10mm 18mm 10mm; }' +
  '  .noprint { display: none; }' +
  '  body { background: #fff; font-size: 9px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
  '  .page { max-width: 100%; }' +
  '  .hdr { padding: 7px 14px; }' +
  '  .hdr-left .name { font-size: 14px; }' +
  '  .hdr img { width: 40px !important; height: 40px !important; }' +
  '  .agr { padding: 3px 10px; font-size: 7.5px; }' +
  '  .body { padding: 6px 14px; }' +
  '  .section { margin-bottom: 4px; }' +
  '  .section-title { font-size: 7.5px; padding-bottom: 2px; margin-bottom: 3px; }' +
  '  .value-box { padding: 3px 6px; font-size: 9px; min-height: 15px; line-height: 1.3; }' +
  '  .grid2 { gap: 6px; }' +
  '  .sig-zone { min-height: 28px; padding: 4px; }' +
  '  .sig-title { font-size: 7.5px; }' +
  '  .sigs-grid { gap: 10px !important; margin-top: 6px !important; }' +
  '  .sig-spacer { height: 18px !important; }' +
  '  .gse-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 3px 14px; font-size: 7.5px; border-top: 1px solid #e0ddd6; background: #f0ede6; }' +
  '  .photos-grid { grid-template-columns: repeat(6,1fr); gap: 3px; }' +
  '  .photos-grid > div { aspect-ratio: unset; height: 42px; }' +
  '  .photos-grid img { height: 42px; }' +
  '}'

// Nom de fichier proposé par Chrome à l'enregistrement en PDF : il vient du
// <title> du document. On le veut directement exploitable (pas de tiret
// cadratin, pas de caractère interdit par le système de fichiers) pour que
// l'utilisateur n'ait pas à le retaper dans la boîte d'enregistrement — c'est
// justement ce renommage qui produisait un PDF vide (voir ouvrirDocImprimable).
function nomFichierDoc() {
  var parts = []
  for (var i = 0; i < arguments.length; i++) {
    var v = (arguments[i] == null ? "" : String(arguments[i])).trim()
    if (v) parts.push(v)
  }
  return parts.join(" ")
    .replace(/[—–]/g, "-")
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
}

// Ouvre un document imprimable dans une nouvelle fenêtre.
//
// On passe par une URL blob plutôt que par window.open("") + document.write :
// ce dernier produit un about:blank, un document sans URL réelle. Quand
// l'utilisateur prend quelques secondes dans la boîte « Enregistrer au format
// PDF » de Chrome (typiquement pour renommer le fichier), ce document peut être
// régénéré sans source stable et le PDF sort vide. Une URL blob donne au
// document une vraie source, rechargeable à tout moment.
// Repli sur document.write si les URL blob sont indisponibles.
// Dans un document blob:, les chemins relatifs ne se resolvent plus contre le
// domaine : le logo `<img src="/logo-gse.jpeg">` ne chargeait plus dans AUCUN
// document imprime. On injecte une balise <base> pointant sur l'origine, ce qui
// retablit tous les chemins racine d'un coup, ici et pour tout futur document.
function injecterBase(html) {
  if (typeof window === "undefined") return html
  if (/<base\s/i.test(html)) return html
  return html.replace(/<head>/i, '<head><base href="' + window.location.origin + '/">')
}

function ouvrirDocImprimable(html, largeur, hauteur) {
  var dims = "width=" + (largeur || 920) + ",height=" + (hauteur || 1100)
  try {
    var url = URL.createObjectURL(new Blob([injecterBase(html)], { type: "text/html;charset=utf-8" }))
    var w = window.open(url, "_blank", dims)
    if (!w) { URL.revokeObjectURL(url); return null }
    // Révocation différée : une fois le document chargé, la révocation
    // n'affecte plus la fenêtre ouverte.
    setTimeout(function() { URL.revokeObjectURL(url) }, 60000)
    return w
  } catch (e) {
    var wf = window.open("", "_blank", dims)
    if (wf) { wf.document.write(injecterBase(html)); wf.document.close() }
    return wf
  }
}

function gseHeader(title, ref) {
  return '<div class="hdr">' +
    '<div class="hdr-left"><div class="sub">Global Solutions Entreprise</div><div class="name">Phyto Bénin</div></div>' +
    '<img src="/logo-gse.jpeg" alt="GSE" style="width:56px;height:56px;object-fit:contain;border-radius:4px;background:#fff;padding:3px">' +
    '<div class="hdr-right"><div class="title">' + title + '</div>' + (ref ? '<div class="ref">' + ref + '</div>' : '') + '</div>' +
    '</div>' +
    '<div class="agr">✅ Agrément APA/26-025/CNGP-BEN &nbsp;·&nbsp; Police d\'assurance N°:13901/7010000035 &nbsp;·&nbsp; RCCM: RB/COT/24 B 38910 &nbsp;·&nbsp; IFU: 3202420126111</div>'
}

function gseSigs() {
  return '<div class="sigs-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px">' +
    '<div><div class="sig-title">Signature du client</div><div class="sig-zone"><p style="font-size:10px;font-style:italic;color:#888">Bon pour accord</p><div class="sig-spacer" style="height:60px"></div></div></div>' +
    '<div><div class="sig-title">Pour Global Solutions Entreprise</div><div class="sig-zone"><p style="font-size:10px;font-style:italic;color:#888;margin-bottom:4px">Le Directeur Général</p><div class="sig-spacer" style="height:40px"></div><p style="font-weight:700;font-size:12px">Kabir YAKOUBOU</p></div></div>' +
    '</div>'
}

function gseFooter() {
  return '<div class="gse-footer">Global Solutions Entreprise — Phyto Bénin | Applicateur Agréé | Réf. APA/26-025/CNGP-BEN<br>RCCM: RB/COT/24 B 38910 · IFU: 3202420126111 · contact@phyto-benin.com · Cotonou, Bénin</div>'
}

function buildCertificatHtml(type, form) {
  var isDouble = type === 'double'
  var titre = type === 'desinsect' ? 'CERTIFICAT DE DÉSINSECTISATION'
             : isDouble ? 'CERTIFICAT DE DÉSINSECTISATION ET DE DÉRATISATION'
             : 'CERTIFICAT DE DÉRATISATION'
  var operationType = type === 'desinsect' ? 'désinsectisation'
                    : isDouble ? 'désinsectisation et de dératisation'
                    : 'dératisation'
  var methode = type === 'desinsect'
    ? "L'opération est réalisée par pulvérisation au moyen des produits homologués ci-après."
    : isDouble
    ? "L'opération de désinsectisation est réalisée par pulvérisation au moyen des produits homologués ci-après. L'opération de dératisation est réalisée par disposition de produit homologué dans les PVC (boîtes d'appâts)."
    : "L'opération est réalisée par disposition de produit homologué dans les PVC (boîtes d'appâts)."

  var rowsHtml
  if (isDouble) {
    var cellStyle = 'border:1px solid #bbb;padding:9px 10px;vertical-align:middle;white-space:pre-line'
    var agrtStyle = 'border:1px solid #bbb;padding:9px 10px;vertical-align:middle;color:#1a4731;font-weight:600'
    var rowDes = (form.matieres || '').trim()
      ? '<tr><td style="' + cellStyle + '"><strong>Désinsectisation :</strong><br>' + (form.matieres || '') + '</td><td style="' + agrtStyle + '">Agrément APA/26-025/CNGP-BEN</td></tr>'
      : ''
    var rowRat = (form.matieresDerat || '').trim()
      ? '<tr><td style="' + cellStyle + '"><strong>Dératisation :</strong><br>' + (form.matieresDerat || '') + '</td><td style="' + agrtStyle + '">Agrément APA/26-025/CNGP-BEN</td></tr>'
      : ''
    rowsHtml = rowDes + rowRat
  } else {
    rowsHtml = (form.matieres || '').trim()
      ? '<tr><td style="border:1px solid #bbb;padding:9px 10px;vertical-align:middle;white-space:pre-line">' + (form.matieres || '') + '</td><td style="border:1px solid #bbb;padding:9px 10px;vertical-align:middle;color:#1a4731;font-weight:600">Agrément APA/26-025/CNGP-BEN</td></tr>'
      : ''
  }

  var dateExec = (form.dateDebut && form.dateFin)
    ? 'du <strong>' + form.dateDebut + '</strong> au <strong>' + form.dateFin + '</strong> 2026'
    : 'du __________ au __________ 2026'

  var dateRef = 'Cotonou le ' + (form.dateJour || '__') + ' - ' + (form.dateMois || '__') + ' 2026 &nbsp;·&nbsp; Réf : ' + (form.ref || '')

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>' + nomFichierDoc('Certificat', operationType, form.ref, form.entreprise) + '</title>' +
    GSE_DOC_STYLES +
    '</style></head><body>' +
    '<div class="noprint"><button onclick="window.print()">🖨️ Imprimer / PDF</button><button class="sec" onclick="window.close()">Fermer</button></div>' +
    '<div class="page">' +
    gseHeader(titre, dateRef) +
    '<div class="body">' +

    '<p style="margin-bottom:14px;line-height:1.75">La Société <strong>Global Solutions Entreprise (GSE)</strong>, agissant en qualité d\'<strong>Applicateur Agréé</strong>.<br>' +
    'Référence <strong>APA/26-025/CNGP-BEN</strong> dont police d\'assurance <strong>N°:13901/7010000035</strong></p>' +

    '<p style="margin-bottom:18px;line-height:1.75"><strong>Certifie</strong> conformément à la <strong>loi 91-004 du 11 Février 1991</strong> portant réglementation Phytosanitaire en République du Bénin, et ceux sous la supervision des structures Compétentes du Ministère de l\'Agriculture, de l\'Élevage et de la Pêche (MAEP), de l\'exécution de l\'opération de <strong>' + operationType + '</strong> des locaux appartenant à :</p>' +

    '<table style="margin-bottom:18px;border-collapse:collapse;width:100%">' +
    (form.entreprise ? '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold;width:38%">Entreprise bénéficiaire</td><td style="border:1px solid #aaa;padding:7px 12px">' + form.entreprise + '</td></tr>' : '') +
    (form.ifu ? '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold">N° IFU</td><td style="border:1px solid #aaa;padding:7px 12px">' + form.ifu + '</td></tr>' : '') +
    (form.rccm ? '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold">RCCM</td><td style="border:1px solid #aaa;padding:7px 12px">' + form.rccm + '</td></tr>' : '') +
    (form.locaux ? '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold">Magasin / Locaux</td><td style="border:1px solid #aaa;padding:7px 12px">' + form.locaux + '</td></tr>' : '') +
    (form.situation ? '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold">Situation Géographique</td><td style="border:1px solid #aaa;padding:7px 12px">' + form.situation + '</td></tr>' : '') +
    '</table>' +

    '<p style="font-style:italic;margin-bottom:18px;line-height:1.6">' + methode + '</p>' +

    '<table style="margin-bottom:20px;border-collapse:collapse;width:100%">' +
    '<thead><tr>' +
    '<th style="background:#1a4731;color:#fff;padding:8px 10px;border:1px solid #1a4731;text-align:left;font-size:13px;width:38%;font-weight:bold">Matières actives</th>' +
    '<th style="background:#1a4731;color:#fff;padding:8px 10px;border:1px solid #1a4731;text-align:left;font-size:13px;font-weight:bold">Observations — Homologués par le CNEIP / DPV APV / CNGP-BEN</th>' +
    '</tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody>' +
    '</table>' +

    '<p style="margin-bottom:10px;line-height:1.75"><strong>Date d\'exécution : ' + dateExec + '</strong><br>' +
    'L\'opération à valider sous quinzaine confère aux locaux une protection durable (mensuelle, bimensuelle ou trimestrielle).</p>' +

    '<p style="font-style:italic;margin-top:16px;margin-bottom:24px;line-height:1.75">En foi de quoi le présent certificat est délivré pour servir et valoir ce que de droit.</p>' +

    gseSigs() +
    '</div>' +
    gseFooter() +
    '</div></body></html>'
}

function buildFichePassageHtml(form, client, numero) {
  var nomClient = form.nomClient || [(client.prenom || ''), client.nom].filter(Boolean).join(' ')
  var dateAff = form.datePassage ? new Date(form.datePassage).toLocaleDateString('fr-FR') : '__________'

  function chk(checked) {
    return '<span style="display:inline-block;width:12px;height:12px;border:1.5px solid #333;border-radius:2px;vertical-align:middle;margin-right:4px;background:' + (checked ? '#0a2e1a' : '#fff') + ';text-align:center;line-height:12px;font-size:9px;color:#fff">' + (checked ? '✓' : '') + '</span>'
  }

  var TYPES_PASSAGE = ['Contractuel', 'Occasionnel', 'Essai', 'Contrôle']
  var TYPES_PRESTA = ['Désinsectisation', 'Désinfection', 'Dératisation', 'Fumigation', 'Traitement phytosanitaire espèces verts']
  var NUISIBLES = ['Insectes rampants', 'Insectes volants', 'Rongeurs', 'Microbes']
  var PRODUITS_CATS = [
    { key: 'insecticides', label: 'Insecticides (Rampants / Volants)' },
    { key: 'raticides', label: 'Raticides (Rats / Souris)' },
    { key: 'desinfectants', label: 'Désinfectants (Bactéries, virus, champignons)' },
    { key: 'fumigants', label: 'Fumigants' },
    { key: 'phytosanitaires', label: 'Phytosanitaires (espèces vertes)' },
    { key: 'autres', label: 'Autres (à préciser)' },
  ]

  var typesPassageHtml = TYPES_PASSAGE.map(function(t) {
    return chk(form.typePassage === t) + t
  }).join('<span style="margin:0 10px;color:#ccc">|</span>')

  var typesPrestHtml = TYPES_PRESTA.map(function(t) {
    return '<span style="margin-right:14px;white-space:nowrap">' + chk((form.prestations || []).includes(t)) + t + '</span>'
  }).join('') +
  (form.autresPrestation ? '<span style="margin-right:14px;white-space:nowrap">' + chk(true) + 'Autres : <u>' + form.autresPrestation + '</u></span>' : '<span style="margin-right:14px;white-space:nowrap">' + chk(false) + 'Autres ___________</span>')

  var nuisiblesHtml = NUISIBLES.map(function(n) {
    return '<span style="margin-right:14px;white-space:nowrap">' + chk((form.nuisibles || []).includes(n)) + n + '</span>'
  }).join('') +
  (form.autresNuisible ? '<span style="margin-right:14px;white-space:nowrap">' + chk(true) + 'Autres : <u>' + form.autresNuisible + '</u></span>' : '<span style="margin-right:14px;white-space:nowrap">' + chk(false) + 'Autres ___________</span>')

  var produitsHtml = PRODUITS_CATS.map(function(cat) {
    var coched = (form.produitsCoches || []).includes(cat.key)
    var nom = (form.produits || {})[cat.key] || ''
    return '<tr>' +
      '<td style="border:1px solid #ccc;padding:7px 10px;white-space:nowrap">' + chk(coched) + cat.label + '</td>' +
      '<td style="border:1px solid #ccc;padding:7px 10px;color:#0a2e1a;font-weight:' + (nom ? '600' : '400') + '">' + (nom || '<span style="color:#ccc">___________________________</span>') + '</td>' +
      '</tr>'
  }).join('')

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    '<title>' + nomFichierDoc('Fiche_passage', numero, (client && (client.entreprise || client.nom)) || '') + '</title>' +
    '<style>' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; color: #111; background: #f5f5f0; }' +
    '.noprint { text-align: center; padding: 12px; background: #f0fdf4; border-bottom: 1px solid #bbf7d0; }' +
    '.noprint button { background: #0a2e1a; color: #d4a920; border: none; border-radius: 6px; padding: 9px 24px; font-size: 13px; font-weight: 700; cursor: pointer; margin: 4px; font-family: inherit; }' +
    '.noprint button.sec { background: #fff; color: #0a2e1a; border: 1px solid #0a2e1a; }' +
    '.page { max-width: 780px; margin: 0 auto; background: #fff; }' +
    '.hdr { background: #0a2e1a; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; }' +
    '.hdr-left .sub { color: #d4a920; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 4px; }' +
    '.hdr-left .name { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.03em; }' +
    '.hdr-right { text-align: right; }' +
    '.hdr-right .title { color: #fff; font-size: 15px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }' +
    '.hdr-right .num { color: #d4a920; font-size: 13px; font-weight: 700; margin-top: 4px; }' +
    '.agr { background: #d4a920; padding: 5px 12px; display: flex; align-items: center; gap: 8px; font-size: 10px; color: #0a2e1a; font-weight: 700; letter-spacing: 0.06em; }' +
    '.body { padding: 22px 28px; }' +
    '.section-title { font-size: 10px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid #0a2e1a; padding-bottom: 4px; margin-bottom: 10px; }' +
    '.field-row { display: flex; gap: 0; margin-bottom: 8px; align-items: baseline; }' +
    '.field-label { font-weight: 700; color: #555; min-width: 90px; font-size: 11.5px; }' +
    '.field-value { flex: 1; border-bottom: 1px solid #999; min-height: 18px; padding-bottom: 2px; font-size: 12.5px; }' +
    '.chk-row { line-height: 2; }' +
    '.sig-zone { border: 1px solid #ccc; border-radius: 6px; padding: 12px; min-height: 80px; }' +
    '.sig-title { font-size: 10px; font-weight: 700; color: #0a2e1a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }' +
    '.footer { background: #f0ede6; border-top: 1px solid #e0ddd6; padding: 8px 28px; text-align: center; font-size: 10px; color: #888; line-height: 1.6; }' +
    '@media print {' +
    '  @page { size: A4 portrait; margin: 7mm 10mm; }' +
    '  .noprint { display: none; }' +
    '  body { background: #fff; font-size: 10px; }' +
    '  .page { max-width: 100%; }' +
    '  .hdr { padding: 10px 20px; }' +
    '  .hdr-left .name { font-size: 15px; }' +
    '  .hdr-right .title { font-size: 12px; }' +
    '  .hdr-right .num { font-size: 11px; }' +
    '  .agr { padding: 3px 10px; font-size: 8.5px; }' +
    '  .body { padding: 10px 20px; }' +
    '  .section-title { font-size: 8.5px; margin-bottom: 5px; padding-bottom: 2px; }' +
    '  .field-row { margin-bottom: 4px; }' +
    '  .field-label { font-size: 9.5px; min-width: 70px; }' +
    '  .field-value { font-size: 10px; }' +
    '  .chk-row { line-height: 1.6; font-size: 10px; }' +
    '  .sig-zone { min-height: 44px; padding: 6px; }' +
    '  .sig-title { font-size: 8.5px; }' +
    '  .footer { padding: 5px 20px; font-size: 8.5px; }' +
    '  table td, table th { padding: 4px 8px !important; font-size: 9.5px; }' +
    '  [style*="min-height:60px"] { min-height: 32px !important; }' +
    '  [style*="margin-bottom:16px"], [style*="margin-bottom:14px"] { margin-bottom: 7px !important; }' +
    '  [style*="gap:20px"] { gap: 10px !important; }' +
    '}' +
    '</style></head><body>' +

    '<div class="noprint"><button onclick="window.print()">🖨️ Imprimer / PDF</button><button class="sec" onclick="window.close()">Fermer</button></div>' +

    '<div class="page">' +

    '<div class="hdr">' +
    '<div class="hdr-left">' +
    '<div class="sub">Global Solutions Entreprise</div>' +
    '<div class="name">Phyto Bénin</div>' +
    '</div>' +
    '<img src="/logo-gse.jpeg" alt="GSE" style="width:56px;height:56px;object-fit:contain;border-radius:4px;background:#fff;padding:3px">' +
    '<div class="hdr-right">' +
    '<div class="title">Fiche de Passage</div>' +
    '<div class="num">N° ' + numero + '</div>' +
    '</div>' +
    '</div>' +

    '<div class="agr">✅ Agrément APA/26-025/CNGP-BEN &nbsp;·&nbsp; Police d\'assurance N°:13901/7010000035 &nbsp;·&nbsp; RCCM: RB/COT/24 B 38910 &nbsp;·&nbsp; IFU: 3202420126111</div>' +

    '<div class="body">' +

    '<div style="margin-bottom:16px">' +
    '<div class="section-title">Informations client</div>' +
    '<div class="field-row"><span class="field-label">Nom du client</span><span class="field-value">' + nomClient + '</span></div>' +
    '<div class="field-row"><span class="field-label">Adresse</span><span class="field-value">' + (form.adresse || '') + '</span></div>' +
    '<div style="display:flex;gap:24px">' +
    '<div class="field-row" style="flex:1"><span class="field-label">Tél.</span><span class="field-value">' + (form.tel || '') + '</span></div>' +
    '<div class="field-row" style="flex:1"><span class="field-label">Mob.</span><span class="field-value">' + (form.mob || '') + '</span></div>' +
    '</div>' +
    '</div>' +

    '<div style="margin-bottom:14px">' +
    '<div class="section-title">Type de passage</div>' +
    '<div class="chk-row">' + typesPassageHtml + '</div>' +
    '</div>' +

    '<div style="margin-bottom:14px">' +
    '<div class="section-title">Type de prestation</div>' +
    '<div class="chk-row">' + typesPrestHtml + '</div>' +
    '</div>' +

    '<div style="margin-bottom:14px">' +
    '<div class="section-title">Lieu de prestation</div>' +
    '<div class="field-row"><span class="field-value">' + (form.lieuPrestation || '') + '</span></div>' +
    '</div>' +

    '<div style="margin-bottom:14px">' +
    '<div class="section-title">Nuisibles présents</div>' +
    '<div class="chk-row">' + nuisiblesHtml + '</div>' +
    '</div>' +

    '<div style="margin-bottom:16px">' +
    '<div class="section-title">Nom des produits phytopharmaceutiques appliqués</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-top:6px">' +
    '<thead><tr>' +
    '<th style="background:#0a2e1a;color:#fff;padding:7px 10px;text-align:left;font-size:11px;width:52%;border:1px solid #0a2e1a">Catégorie de produit</th>' +
    '<th style="background:#0a2e1a;color:#fff;padding:7px 10px;text-align:left;font-size:11px;border:1px solid #0a2e1a">Produit utilisé</th>' +
    '</tr></thead>' +
    '<tbody>' + produitsHtml + '</tbody>' +
    '</table>' +
    '</div>' +

    '<div style="margin-bottom:14px">' +
    '<div class="section-title">Durée de prestation</div>' +
    '<div style="display:flex;align-items:baseline;gap:12px;font-size:13px">' +
    'de <span style="border-bottom:1px solid #999;min-width:120px;display:inline-block;padding-bottom:1px">&nbsp;' + (form.dureeDebut || '') + '&nbsp;</span>' +
    'à <span style="border-bottom:1px solid #999;min-width:120px;display:inline-block;padding-bottom:1px">&nbsp;' + (form.dureeFin || '') + '&nbsp;</span>' +
    '</div>' +
    '</div>' +

    '<div style="margin-bottom:16px">' +
    '<div class="section-title">Remarques</div>' +
    '<div style="border:1px solid #ccc;border-radius:4px;min-height:60px;padding:10px;font-size:13px;line-height:1.6">' + (form.remarques || '') + '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">' +

    '<div>' +
    '<div class="section-title" style="margin-bottom:8px">Date de passage</div>' +
    '<div style="font-size:14px;font-weight:700;color:#0a2e1a">' + dateAff + '</div>' +
    '</div>' +

    '<div></div>' +

    '<div>' +
    '<div class="sig-title">Pour le client — Nom & Prénom(s)</div>' +
    '<div class="sig-zone"></div>' +
    '</div>' +

    '<div>' +
    '<div class="sig-title">Pour Global Solutions Entreprise</div>' +
    '<div class="sig-zone">' +
    (form.superviseurNom ? '<div style="font-weight:700;font-size:12px;color:#0a2e1a">' + form.superviseurNom + '</div>' : '') +
    (form.superviseurContact ? '<div style="font-size:11px;color:#666;margin-top:2px">' + form.superviseurContact + '</div>' : '') +
    '</div>' +
    '</div>' +

    '</div>' +

    '</div>' +

    '<div class="footer">' +
    'Global Solutions Entreprise — Phyto Bénin | Applicateur Agréé | Réf. APA/26-025/CNGP-BEN<br>' +
    'RCCM: RB/COT/24 B 38910 · IFU: 3202420126111 · contact@phyto-benin.com · Cotonou, Bénin' +
    '</div>' +

    '</div></body></html>'
}

function buildRapportVisiteHtml(form, client, devis) {
  var nomClient = [(client.prenom || ''), client.nom].filter(Boolean).join(' ') + (client.entreprise ? ' — ' + client.entreprise : '')
  var nuisiblesStr = (form.nuisibles || []).concat(form.autresNuisible ? [form.autresNuisible] : []).join(', ') || '—'
  var niveauColor = form.niveauInfestation === 'Faible' ? '#16a34a' : form.niveauInfestation === 'Élevé' ? '#dc2626' : '#d97706'
  var dateStr = form.dateVisite ? new Date(form.dateVisite).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>' + nomFichierDoc('Rapport_visite', (client && (client.entreprise || client.nom)) || '', form.dateVisite) + '</title>' +
    GSE_DOC_STYLES +
    '</style></head><body>' +
    '<div class="noprint"><button onclick="window.print()">🖨️ Imprimer / PDF</button><button class="sec" onclick="window.close()">Fermer</button></div>' +
    '<div class="page">' +
    gseHeader('RAPPORT DE VISITE', 'Date : ' + dateStr) +
    '<div class="body">' +

    '<div class="grid2 section">' +
    '<div><div class="section-title">Client</div><div class="value-box">' + nomClient + '</div></div>' +
    '<div><div class="section-title">Adresse du site</div><div class="value-box">' + (form.adresseSite || '—') + '</div></div>' +
    '</div>' +

    '<div class="grid2 section">' +
    '<div><div class="section-title">Prestation</div><div class="value-box">' + (devis.prestation || '—') + '</div></div>' +
    '<div><div class="section-title">Technicien</div><div class="value-box">' + (form.technicien || '—') + '</div></div>' +
    '</div>' +

    '<div class="section"><div class="section-title">Description du site</div><div class="value-box">' + (form.descriptionSite || '—') + '</div></div>' +

    '<div class="grid2 section">' +
    '<div><div class="section-title">Nuisibles observés</div><div class="value-box">' + nuisiblesStr + '</div></div>' +
    '<div><div class="section-title">Niveau d\'infestation</div><div class="value-box"><span class="badge" style="background:' + niveauColor + '">' + (form.niveauInfestation || '—') + '</span></div></div>' +
    '</div>' +

    '<div class="section"><div class="section-title">Zones infestées</div><div class="value-box">' + (form.zonesInfestees || '—') + '</div></div>' +
    '<div class="section"><div class="section-title">Recommandations</div><div class="value-box">' + (form.recommandations || '—') + '</div></div>' +
    '<div class="section"><div class="section-title">Observations techniques</div><div class="value-box">' + (form.observations || '—') + '</div></div>' +

    ((form.datesProposees && form.datesProposees.length > 0) ? (
      '<div class="section"><div class="section-title">📅 Dates d\'intervention proposées</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0">' +
      form.datesProposees.map(function(d) { return '<span style="background:#0a2e1a;color:#d4a920;border-radius:20px;padding:4px 16px;font-size:12px;font-weight:700;display:inline-block">' + d + '</span>' }).join('') +
      '</div></div>'
    ) : '') +

    ((form.photos && form.photos.length > 0) ? (
      '<div class="section"><div class="section-title">Photos du terrain (' + form.photos.length + ')</div>' +
      '<div class="photos-grid">' +
      form.photos.map(function(url, i) { return '<div><img src="' + url + '" alt="Photo ' + (i+1) + '"/></div>' }).join('') +
      '</div></div>'
    ) : '') +

    gseSigs() +
    '</div>' +
    gseFooter() +
    '</div></body></html>'
}

function buildRapportIntervHtml(form, client, devis) {
  var nomClient = [(client.prenom || ''), client.nom].filter(Boolean).join(' ') + (client.entreprise ? ' — ' + client.entreprise : '')
  var dateStr = form.dateIntervention ? new Date(form.dateIntervention).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>' + nomFichierDoc('Rapport_intervention', (client && (client.entreprise || client.nom)) || '', form.dateIntervention) + '</title>' +
    GSE_DOC_STYLES +
    '</style></head><body>' +
    '<div class="noprint"><button onclick="window.print()">🖨️ Imprimer / PDF</button><button class="sec" onclick="window.close()">Fermer</button></div>' +
    '<div class="page">' +
    gseHeader("RAPPORT D'INTERVENTION", 'Date : ' + dateStr) +
    '<div class="body">' +

    '<div class="grid2 section">' +
    '<div><div class="section-title">Client</div><div class="value-box">' + nomClient + '</div></div>' +
    '<div><div class="section-title">Prestation</div><div class="value-box">' + (devis.prestation || '—') + '</div></div>' +
    '</div>' +

    '<div class="grid2 section">' +
    '<div><div class="section-title">Technicien(s)</div><div class="value-box">' + (form.technicien || '—') + '</div></div>' +
    '<div><div class="section-title">Durée de l\'intervention</div><div class="value-box">' + (form.dureeIntervention || '—') + '</div></div>' +
    '</div>' +

    '<div class="grid2 section">' +
    '<div><div class="section-title">Méthode d\'application</div><div class="value-box">' + (form.methodeApplication || '—') + '</div></div>' +
    '<div><div class="section-title">Zones traitées</div><div class="value-box">' + (form.zonesTraitees || '—') + '</div></div>' +
    '</div>' +

    '<div class="section"><div class="section-title">Produits utilisés</div><div class="value-box">' + (form.produitsUtilises || '—') + '</div></div>' +
    '<div class="section"><div class="section-title">Résultats obtenus</div><div class="value-box">' + (form.resultats || '—') + '</div></div>' +
    '<div class="section"><div class="section-title">Observations</div><div class="value-box">' + (form.observations || '—') + '</div></div>' +
    '<div class="section"><div class="section-title">Recommandations / suivi</div><div class="value-box">' + (form.recommandations || '—') + '</div></div>' +

    ((form.photos && form.photos.length > 0) ? (
      '<div class="section"><div class="section-title">Photos du terrain (' + form.photos.length + ')</div>' +
      '<div class="photos-grid">' +
      form.photos.map(function(url, i) { return '<div><img src="' + url + '" alt="Photo ' + (i+1) + '"/></div>' }).join('') +
      '</div></div>'
    ) : '') +

    gseSigs() +
    '</div>' +
    gseFooter() +
    '</div></body></html>'
}