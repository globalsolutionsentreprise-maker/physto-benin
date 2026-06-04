"use client"
import React, { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CHIFFRES_DEFAUT = [
  { id: 1, valeur: "+50", label: "Clients proteges", ordre: 1 },
  { id: 2, valeur: "2h", label: "Delai intervention", ordre: 2 },
  { id: 4, valeur: "24h/24", label: "Disponibilite urgence", ordre: 4 },
]

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
  const [dossierDevisId, setDossierDevisId] = useState(null)
  const [onglet, setOnglet] = useState("chiffres")
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

  React.useEffect(function() {
    function handleMessage(e) {
      if (e.data && e.data.type === "open_dossier" && e.data.devisId) {
        setDossierDevisId(e.data.devisId)
        setOnglet("clients")
      }
    }
    window.addEventListener("message", handleMessage)
    return function() { window.removeEventListener("message", handleMessage) }
  }, [])

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

  const menu = [
    { id: "chiffres", label: "Chiffres cles" },
    { id: "parametres", label: "Coordonnees" },
    { id: "textes_accueil", label: "Textes Accueil" },
    { id: "textes_mission", label: "Textes Mission" },
    { id: "textes_garanties", label: "Garanties" },
    { id: "temoignages", label: "Temoignages" },
    { id: "articles", label: "Articles Blog" },
    { id: "services", label: "Nos Services" },
    { id: "realisations", label: "Realisations" },
    { id: "equipe", label: "Notre Equipe" },
    { id: "crm", label: "📊 CRM Pipeline" },
    { id: "rh", label: "👥 Équipe & Planning" },
    { id: "stock", label: "📦 Stock produits" },
    ...(currentUser?.role === "admin" ? [
      { id: "acces", label: "🔐 Accès utilisateurs" },
      { id: "journal", label: "📋 Journal activité" },
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
          {menu.map(function(item) {
            return (
              <button key={item.id} onClick={function() { setOnglet(item.id) }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 20px", fontSize: "12px", fontWeight: onglet === item.id ? "700" : "400", color: onglet === item.id ? "#0a2e1a" : "#666", backgroundColor: onglet === item.id ? "#f0f8f3" : "transparent", borderLeft: onglet === item.id ? "3px solid #1a6b38" : "3px solid transparent", borderTop: "none", borderRight: "none", borderBottom: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {item.label}
              </button>
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

          {onglet === "textes_accueil" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Textes de la page d accueil</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "28px" }}>Modifiez chaque texte puis cliquez Sauvegarder.</p>
              {[
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
              ].map(function(t) {
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
          )}

          {onglet === "textes_mission" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Textes Qui sommes-nous</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "28px" }}>Modifiez les textes de la page Qui sommes-nous.</p>
              {[
                { cle: "mission_texte_1", label: "NOTRE MISSION PARAGRAPHE 1" },
                { cle: "mission_texte_2", label: "NOTRE MISSION PARAGRAPHE 2" },
              ].map(function(t) {
                return (
                  <div key={t.cle} style={card}>
                    <label style={lbl}>{t.label}</label>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <textarea rows={4} value={contenus[t.cle] || ""} onChange={function(e) { modifierContenu(t.cle, e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                      <button onClick={function() { sauvegarderContenu(t.cle) }} style={btnSauvegarder}>Sauvegarder</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {onglet === "textes_garanties" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Textes des garanties</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "28px" }}>Ces textes apparaissent dans la section Nos engagements.</p>
              {[
                { cle: "garantie_agrement_desc", label: "AGREMENT DESCRIPTION" },
                { cle: "garantie_produits_desc", label: "PRODUITS HOMOLOGUES DESCRIPTION" },
                { cle: "garantie_resultats_desc", label: "RESULTATS GARANTIS DESCRIPTION" },
              ].map(function(t) {
                return (
                  <div key={t.cle} style={card}>
                    <label style={lbl}>{t.label}</label>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <textarea rows={3} value={contenus[t.cle] || ""} onChange={function(e) { modifierContenu(t.cle, e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                      <button onClick={function() { sauvegarderContenu(t.cle) }} style={btnSauvegarder}>Sauvegarder</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

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

          {onglet === "clients" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Clients & Devis</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "28px" }}>Créez des devis, gérez les clients et suivez les paiements FedaPay.</p>
              <SectionClientsDevis db={supabase} agrement={parametres.agrement || ""} initialDevisId={dossierDevisId} />
            </div>
          )}

          {onglet === "crm" && (
            <div style={{ margin: "-32px" }}>
              <iframe
                src="/api/crm-frame"
                title="CRM Pipeline GSE"
                style={{ width: "100%", height: "calc(100vh - 64px)", border: "none", display: "block" }}
              />
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
function SectionClientsDevis({ db, agrement, initialDevisId }) {
  const COMMISSION_FEDAPAY = 0.0185
  const [vue, setVue] = React.useState("devis")
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
  const [rapportIntervModal, setRapportIntervModal] = React.useState(null)
  const [rapportIntervForm, setRapportIntervForm] = React.useState({})
  const [savingRapportInterv, setSavingRapportInterv] = React.useState(false)
  const [uploadingPhotoInterv, setUploadingPhotoInterv] = React.useState(false)
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
  const [analysingContrat, setAnalysingContrat] = React.useState(false)
  const [contratErreur, setContratErreur] = React.useState(null)
  const [editingDevis, setEditingDevis] = React.useState(null)
  const [showNouveauDevis, setShowNouveauDevis] = React.useState(false)
  const [nouveauDevisPresta, setNouveauDevisPresta] = React.useState([])
  const COND_PAIEMENT_DEFAUT = "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention."
  const [formDevis, setFormDevis] = React.useState({ clientId: "", prenom: "", nom: "", email: "", telephone: "", entreprise: "", prestation: "", prestations: [], superficie: "", prixM2: "", prixParPrestation: {}, description: "", montantBrut: "", remise: "", remiseType: "pct", modeTransmission: "email", pctAcompte: "60", conditionsPaiement: "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention." })
  const [showFormClient, setShowFormClient] = React.useState(false)
  const [editingClient, setEditingClient] = React.useState(null)
  const [submittingClient, setSubmittingClient] = React.useState(false)
  const [clientDetail, setClientDetail] = React.useState(null)
  const [formClient, setFormClient] = React.useState({ prenom: "", nom: "", email: "", telephone: "", entreprise: "", adresse: "" })
  const [pipelineExpanded, setPipelineExpanded] = React.useState(null)

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
  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "6px", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box" }
  const lbl = { display: "block", fontSize: "11px", fontWeight: "700", color: "#888", marginBottom: "6px", textTransform: "uppercase" }

  React.useEffect(function() { charger() }, [])

  const _lastDossier = React.useRef(null)
  React.useEffect(function() {
    if (!initialDevisId || initialDevisId === _lastDossier.current || devisList.length === 0) return
    var d = devisList.find(function(x) { return x.id === initialDevisId })
    if (!d) return
    var cl = clients.find(function(x) { return x.id === d.client_id })
    if (cl) {
      _lastDossier.current = initialDevisId
      setClientDetail(cl)
      setVue("devis-client")
    }
  }, [initialDevisId, devisList])

  async function charger() {
    setLoading(true)
    const [{ data: devis }, { data: cls }, { data: certs }, { data: fiches }, { data: rVisite }, { data: rInterv }, { data: intervs }, { data: contrats }, { data: perso }] = await Promise.all([
      db.from("devis").select("*, clients(id, nom, prenom, entreprise, email, telephone)").order("created_at", { ascending: false }),
      db.from("clients").select("*").order("nom"),
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
  }

  async function saveParcours(devisId, newParcours) {
    await db.from('devis').update({ parcours: newParcours }).eq('id', devisId)
    setDevisList(function(prev) {
      return prev.map(function(d) { return d.id === devisId ? Object.assign({}, d, { parcours: newParcours }) : d })
    })
  }

  function ouvrirAjoutClient() {
    setEditingClient(null)
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
    if (editingClient) {
      const { error } = await db.from("clients").update(formClient).eq("id", editingClient.id)
      if (error) { setMsg("Erreur: " + error.message); setSubmittingClient(false); return }
      setMsg("✓ Client mis à jour")
      setShowFormClient(false); setEditingClient(null)
      await charger(); setSubmittingClient(false)
    } else {
      try {
        const res = await fetch("/api/create-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formClient)
        })
        const data = await res.json()
        if (!res.ok) { setMsg("Erreur: " + (data.error || "Échec")); setSubmittingClient(false); return }
        setMsg("✓ " + data.message)
        setShowFormClient(false)
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
    setEditingDevis(d)
    setFormDevis({
      clientId: d.client_id || "",
      prenom: cl ? (cl.prenom || "") : "",
      nom: cl ? cl.nom : "",
      email: cl ? cl.email : "",
      telephone: cl ? (cl.telephone || "") : "",
      entreprise: cl ? (cl.entreprise || "") : "",
      prestation: d.prestation || "",
      prestations: d.prestation ? d.prestation.split(" + ").map(function(p) { return p.trim() }) : [],
      superficie: d.superficie ? String(d.superficie) : "",
      prixM2: d.prix_m2 ? String(d.prix_m2) : "",
      prixParPrestation: d.prix_par_prestation || {},
      description: d.description || "",
      montantBrut: d.montant_net || d.montant_total || "",
      remise: "",
      remiseType: "pct",
      modeTransmission: "email",
      pctAcompte: d.pct_acompte ? String(d.pct_acompte) : "60",
      conditionsPaiement: d.conditions_paiement || "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention."
    })
    setMsg("")
  }

  async function creerNouveauDevisClient(cl) {
    if (nouveauDevisPresta.length === 0) { setMsg("Sélectionnez au moins une prestation."); return }
    var prestationStr = nouveauDevisPresta.join(" + ")
    var { data: num } = await db.rpc("generate_devis_numero")
    var numero = num || ("DEV-GSE-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4))
    var { data: newDevis, error } = await db.from("devis").insert({
      client_id: cl.id,
      numero: numero,
      prestation: prestationStr,
      montant_net: 0,
      montant_total: 0,
      statut: "brouillon"
    }).select("*, clients(id, nom, prenom, entreprise, email, telephone)").single()
    if (error) { setMsg("Erreur : " + error.message); return }
    setShowNouveauDevis(false)
    setNouveauDevisPresta([])
    await charger()
    ouvrirEditionDevis(newDevis)
    setVue("devis")
  }

  async function creerDevis() {
    var prestationStr = (formDevis.prestations && formDevis.prestations.length > 0)
      ? formDevis.prestations.join(" + ")
      : formDevis.prestation
    if ((!formDevis.clientId && !formDevis.nom) || !prestationStr || !formDevis.montantBrut) {
      setMsg("Remplissez tous les champs obligatoires."); return
    }
    setMsg("")

    var brut = parseFloat(formDevis.montantBrut) || 0
    var remiseVal = formDevis.remise ? parseFloat(formDevis.remise) : 0
    var remiseMontant = formDevis.remiseType === "pct"
      ? Math.round(brut * remiseVal / 100)
      : Math.round(remiseVal)
    var montantNet = Math.max(0, brut - remiseMontant)
    var enLigne = formDevis.modeTransmission === "email"
    var montantClient = enLigne ? Math.round(montantNet * (1 + COMMISSION_FEDAPAY)) : Math.round(montantNet)
    var superficieVal = formDevis.superficie ? parseFloat(formDevis.superficie) : null
    var prixM2Val = formDevis.prixM2 ? parseFloat(formDevis.prixM2) : null

    var viderForm = function() {
      setFormDevis({ clientId: "", prenom: "", nom: "", email: "", telephone: "", entreprise: "", prestation: "", prestations: [], superficie: "", prixM2: "", prixParPrestation: {}, description: "", montantBrut: "", remise: "", remiseType: "pct", modeTransmission: "email", pctAcompte: "60", conditionsPaiement: "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention." })
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
        prix_par_prestation: (formDevis.prixParPrestation && Object.keys(formDevis.prixParPrestation).length > 0) ? formDevis.prixParPrestation : null
      }).eq("id", editingDevis.id)
      if (error) { setMsg("Erreur: " + error.message); return }
      if (enLigne && cl && cl.email) {
        try {
          await fetch("/api/send-devis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientEmail: cl.email, clientNom: cl.nom, clientPrenom: cl.prenom || "", devisNumero: editingDevis.numero, prestation: prestationStr, montant: montantClient, description: formDevis.description }) })
          setMsg("✓ Devis modifié et renvoyé à " + cl.email)
        } catch(e) { setMsg("✓ Devis modifié (email non envoyé)") }
      } else if (!enLigne) {
        setMsg("✓ Devis modifié")
        var imprimData = { numero: editingDevis.numero, clientNom: cl ? cl.nom : "", clientPrenom: cl ? (cl.prenom || "") : "", clientEmail: cl ? cl.email : "", clientTelephone: cl ? (cl.telephone || "") : "", clientEntreprise: cl ? (cl.entreprise || "") : "", prestation: prestationStr, superficie: formDevis.superficie, prixM2: formDevis.prixM2, prixParPrestation: formDevis.prixParPrestation || {}, description: formDevis.description, montantBrut: brut, remiseMontant: remiseMontant, remiseLabel: formDevis.remiseType === "pct" ? (remiseVal + "%") : (remiseMontant.toLocaleString("fr-FR") + " FCFA"), montantNet: montantNet, pctAcompte: parseInt(formDevis.pctAcompte) || 60, conditionsPaiement: formDevis.conditionsPaiement, agrement: agrement }
        imprimerDevis(imprimData)
      } else { setMsg("✓ Devis modifié") }
      setEditingDevis(null)
      viderForm()
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
      }
      await charger()
    } catch(e) { setMsg('Erreur: ' + e.message) }
    setCertSaving(false)
  }

  function imprimerCertificat() {
    var html = buildCertificatHtml(certModal.type, certForm)
    var w = window.open('', '_blank', 'width=920,height=1050')
    if (w) { w.document.write(html); w.document.close() }
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
    var w = window.open('', '_blank', 'width=920,height=1050')
    if (w) { w.document.write(html); w.document.close() }
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
    var w = window.open('', '_blank', 'width=920,height=1100')
    if (w) { w.document.write(html); w.document.close() }
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
      adresseSite: client.adresse || '',
      descriptionSite: devis.prestation || '',
      nuisibles: [],
      autresNuisible: '',
      zonesInfestees: '',
      niveauInfestation: 'Moyen',
      recommandations: '',
      observations: '',
      technicien: '',
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

  async function genererRapportVisiteIA() {
    if (!rapportVisiteModal) return
    setGeneratingRapportVisite(true)
    setRapportVisiteErreurIA(null)
    var { devis, client } = rapportVisiteModal
    var clientNom = [(client.prenom || ''), client.nom].filter(Boolean).join(' ') + (client.entreprise ? ' — ' + client.entreprise : '')
    try {
      var res = await fetch('/api/analyze-rapport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'visite',
          notes: rapportVisiteForm.notesTechnicien,
          photos: rapportVisiteForm.photos || [],
          context: { clientNom, adresse: rapportVisiteForm.adresseSite, date: rapportVisiteForm.dateVisite, technicien: rapportVisiteForm.technicien, prestation: devis.prestation },
        })
      })
      var data = await res.json()
      if (!res.ok || !data.success) {
        setRapportVisiteErreurIA(data.error || 'Erreur inconnue')
      } else {
        var r = data.rapport
        setRapportVisiteForm(function(prev) {
          return Object.assign({}, prev, {
            descriptionSite: r.descriptionSite || prev.descriptionSite || '',
            nuisibles: Array.isArray(r.nuisibles) ? r.nuisibles : prev.nuisibles || [],
            zonesInfestees: r.zonesInfestees || prev.zonesInfestees || '',
            niveauInfestation: r.niveauInfestation || prev.niveauInfestation || 'Moyen',
            observations: r.observations || prev.observations || '',
            recommandations: r.recommandations || prev.recommandations || '',
          })
        })
        setRapportVisitePhase('genere')
      }
    } catch(e) { setRapportVisiteErreurIA(e.message) }
    setGeneratingRapportVisite(false)
  }

  function imprimerRapportVisite() {
    if (!rapportVisiteModal) return
    var { client, devis } = rapportVisiteModal
    var html = buildRapportVisiteHtml(rapportVisiteForm, client, devis)
    var w = window.open('', '_blank', 'width=920,height=1100')
    if (w) { w.document.write(html); w.document.close() }
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
    }
    await charger()
    setSavingRapportVisite(false)
    setMsg('✓ Rapport de visite enregistré')
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
            personnelAdmin.length > 0 && React.createElement('select', {
              value: '',
              onChange: function(e) {
                if (!e.target.value) return
                var current = (rapportVisiteForm.technicien || '').trim()
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
            React.createElement('input', { value: rapportVisiteForm.technicien || '', onChange: function(e) { upd('technicien', e.target.value) }, placeholder: 'Nom du technicien', style: inp2 })
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
            )
          ),

          rapportVisiteErreurIA ? React.createElement('div', { style: { backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', color: '#991b1b', marginBottom: '14px' } }, '❌ ' + rapportVisiteErreurIA) : null,

          React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f0ede8' } },
            React.createElement('button', { onClick: function() { setRapportVisiteModal(null) }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, 'Annuler'),
            React.createElement('button', {
              onClick: genererRapportVisiteIA,
              disabled: generatingRapportVisite || uploadingPhotoVisite || (!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length),
              style: { backgroundColor: '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (generatingRapportVisite || uploadingPhotoVisite || (!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length)) ? 0.5 : 1 }
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
      var res = await fetch('/api/analyze-rapport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'intervention',
          notes: rapportIntervForm.notesTechnicien,
          photos: rapportIntervForm.photos || [],
          context: { clientNom, date: rapportIntervForm.dateIntervention, technicien: rapportIntervForm.technicien, prestation: devis.prestation },
        })
      })
      var data = await res.json()
      if (!res.ok || !data.success) {
        setRapportIntervErreurIA(data.error || 'Erreur inconnue')
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
      }
    } catch(e) { setRapportIntervErreurIA(e.message) }
    setGeneratingRapportInterv(false)
  }

  function imprimerRapportInterv() {
    if (!rapportIntervModal) return
    var { client, devis } = rapportIntervModal
    var html = buildRapportIntervHtml(rapportIntervForm, client, devis)
    var w = window.open('', '_blank', 'width=920,height=1100')
    if (w) { w.document.write(html); w.document.close() }
  }

  async function supprimerRapportInterv() {
    var editingId = rapportIntervModal?.editingId
    if (!editingId) return
    if (!window.confirm('Supprimer ce rapport d\'intervention définitivement ?')) return
    await db.from('rapports_intervention').delete().eq('id', editingId)
    setRapportIntervModal(null)
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
              disabled: generatingRapportInterv || uploadingPhotoInterv || (!rapportIntervForm.notesTechnicien && !(rapportIntervForm.photos || []).length),
              style: { backgroundColor: '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (generatingRapportInterv || uploadingPhotoInterv || (!rapportIntervForm.notesTechnicien && !(rapportIntervForm.photos || []).length)) ? 0.5 : 1 }
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
      var html = buildFichePassageHtml(ficheForm, ficheModal.client, ficheNumero)
      var w = window.open('', '_blank', 'width=920,height=1100')
      if (w) { w.document.write(html); w.document.close() }
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
    var html = "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"><title>Devis " + d.numero + " — GSE</title><style>" +
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
      "@media print { .noprint { display: none; } body { background: #fff; } @page { size: A4 portrait; margin: 7mm 10mm; } }" +
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
        var prestList = d.prestation ? d.prestation.split(" + ").map(function(p) { return p.trim() }) : []
        var ppp = d.prixParPrestation || {}
        var sup = d.superficie ? Number(d.superficie) : 0
        var hasMulti = prestList.length > 1 && sup > 0 && Object.keys(ppp).length > 0
        if (hasMulti) {
          var lignes = prestList.map(function(p) {
            var pm2 = parseFloat(ppp[p]) || 0
            var montP = pm2 ? Math.round(sup * pm2) : 0
            return "<tr>" +
              "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:13px;color:#0a2e1a;font-weight:600\">" + p + "</td>" +
              "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#888;text-align:center\">" + sup.toLocaleString("fr-FR") + " m²</td>" +
              "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#888;text-align:right\">" + pm2.toLocaleString("fr-FR") + " FCFA/m²</td>" +
              "<td style=\"padding:8px 10px;border-bottom:1px solid #f0ede8;font-size:13px;font-weight:700;color:#0a2e1a;text-align:right\">" + montP.toLocaleString("fr-FR") + " FCFA</td>" +
              "</tr>"
          }).join("")
          return "<div class=\"pbox\" style=\"padding:0;overflow:hidden\">" +
            "<table style=\"width:100%;border-collapse:collapse\">" +
            "<thead><tr style=\"background:#0a2e1a\">" +
            "<th style=\"padding:8px 10px;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.08em;text-align:left\">Prestation</th>" +
            "<th style=\"padding:8px 10px;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.08em;text-align:center\">Superficie</th>" +
            "<th style=\"padding:8px 10px;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.08em;text-align:right\">Prix/m²</th>" +
            "<th style=\"padding:8px 10px;font-size:10px;color:#d4a920;text-transform:uppercase;letter-spacing:0.08em;text-align:right\">Montant</th>" +
            "</tr></thead><tbody>" + lignes + "</tbody></table>" +
            (d.description ? "<div class=\"pdesc\" style=\"padding:10px 14px;font-size:12px;color:#555;border-top:1px solid #e8e6e0\">" + d.description + "</div>" : "") +
            "</div>"
        }
        return "<div class=\"pbox\"><div class=\"pname\">" + d.prestation + "</div>" +
          (sup ? "<div class=\"pdesc\" style=\"margin-top:6px;font-size:12px;color:#888\">Superficie : " + sup.toLocaleString("fr-FR") + " m²  ·  Prix au m² : " + Number(d.prixM2 || 0).toLocaleString("fr-FR") + " FCFA/m²</div>" : "") +
          (d.description ? "<div class=\"pdesc\" style=\"margin-top:6px\">" + d.description + "</div>" : "") +
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
        return "<div style=\"background:#fff8e1;border:1.5px solid #fde68a;border-radius:8px;padding:18px 20px;margin-bottom:18px;\">" +
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
    var w = window.open("", "_blank", "width=820,height=900")
    if (w) { w.document.write(html); w.document.close() }
  }

  function renduDevis(d) {
    var st = STATUTS[d.statut] || { label: d.statut, c: "#444", bg: "#f0f0f0" }
    var cl = d.clients
    var clientObj = cl || clients.find(function(c) { return c.id === d.client_id })
    return React.createElement("div", { key: d.id, style: { backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", padding: "16px 20px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" } },
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" } },
          React.createElement("span", { style: { fontSize: "11px", fontWeight: "700", color: "#d4a920" } }, d.numero),
          React.createElement("span", { style: { padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "600", backgroundColor: st.bg, color: st.c } }, st.label)
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

  function renderOnglets() {
    var docsEnAttente = certsList.filter(function(c) { return !c.envoye }).length + fichesList.filter(function(f) { return !f.envoye }).length
    return React.createElement("div", { style: { display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "2px solid #e8e6e0", paddingBottom: "0" } },
      [["devis", "Devis"], ["clients", "Clients"], ["pipeline", "Pipeline"], ["documents", "Documents"]].map(function(t) {
        var active = vue === t[0] || (vue === "devis-client" && t[0] === "clients")
        var badge = t[0] === "documents" && docsEnAttente > 0
          ? React.createElement("span", { style: { marginLeft: "6px", background: "#e65c00", color: "#fff", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: "700" } }, docsEnAttente)
          : null
        return React.createElement("button", { key: t[0], onClick: function() { setVue(t[0]); setClientDetail(null); setMsg("") }, style: { padding: "10px 20px", border: "none", borderBottom: active ? "2px solid #0a2e1a" : "2px solid transparent", marginBottom: "-2px", background: "none", fontSize: "13px", fontWeight: active ? "700" : "400", color: active ? "#0a2e1a" : "#888", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center" } },
          t[1], badge
        )
      })
    )
  }

  function renderFormDevis() {
    if (!editingDevis) return null
    return React.createElement("div", { style: { backgroundColor: "#fafaf8", border: "2px solid #0a2e1a", borderRadius: "10px", padding: "24px", marginBottom: "24px" } },
      React.createElement("h4", { style: { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#0a2e1a" } }, "Modifier " + editingDevis.numero),
      React.createElement("div", { style: { marginBottom: "14px" } },
        React.createElement("label", { style: lbl }, "Prestation(s) * — sélectionnez une ou plusieurs"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", padding: "12px", border: "1.5px solid #e0ddd6", borderRadius: "6px", backgroundColor: "#fff" } },
          PRESTATIONS.map(function(p) {
            var checked = (formDevis.prestations || []).includes(p)
            return React.createElement("label", { key: p, style: { display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", cursor: "pointer", padding: "6px 8px", borderRadius: "4px", backgroundColor: checked ? "#f0fdf4" : "transparent", border: checked ? "1px solid #bbf7d0" : "1px solid transparent", userSelect: "none" } },
              React.createElement("input", {
                type: "checkbox",
                checked: checked,
                onChange: function() {
                  setFormDevis(function(prev) {
                    var current = prev.prestations || []
                    var newList = current.includes(p) ? current.filter(function(x) { return x !== p }) : current.concat([p])
                    return Object.assign({}, prev, { prestations: newList })
                  })
                },
                style: { accentColor: "#0a2e1a", width: "14px", height: "14px", flexShrink: 0 }
              }),
              p
            )
          })
        ),
        (formDevis.prestations && formDevis.prestations.length > 0) && React.createElement("div", { style: { marginTop: "6px", fontSize: "12px", color: "#065f46", backgroundColor: "#f0fdf4", padding: "6px 10px", borderRadius: "4px" } },
          "Sélectionnées : " + formDevis.prestations.join(" + ")
        )
      ),
      React.createElement("div", { style: { marginBottom: "12px" } },
        React.createElement("label", { style: lbl }, "Superficie (m²)"),
        React.createElement("input", {
          type: "number",
          value: formDevis.superficie,
          onChange: function(e) {
            var sup = e.target.value
            setFormDevis(function(prev) {
              var prixPP = prev.prixParPrestation || {}
              var multi = prev.prestations && prev.prestations.length > 1
              if (multi && sup) {
                var total = prev.prestations.reduce(function(sum, p) {
                  var pm2 = parseFloat(prixPP[p]) || 0
                  return sum + Math.round(parseFloat(sup) * pm2)
                }, 0)
                return Object.assign({}, prev, { superficie: sup, montantBrut: total > 0 ? String(total) : prev.montantBrut })
              }
              var pm2 = parseFloat(prev.prixM2) || 0
              return Object.assign({}, prev, { superficie: sup, montantBrut: (sup && pm2) ? String(Math.round(parseFloat(sup) * pm2)) : prev.montantBrut })
            })
          },
          placeholder: "Ex : 500",
          style: inp
        })
      ),
      (function() {
        var prestations = formDevis.prestations || []
        var sup = parseFloat(formDevis.superficie) || 0
        var multiPresta = prestations.length > 1
        if (multiPresta) {
          return React.createElement("div", { style: { marginBottom: "12px", backgroundColor: "#f8f7f4", border: "1px solid #e0ddd6", borderRadius: "8px", padding: "14px 16px" } },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" } }, "Prix par prestation (FCFA/m²)"),
            prestations.map(function(p) {
              var pm2 = formDevis.prixParPrestation ? (formDevis.prixParPrestation[p] || "") : ""
              var montantP = sup && parseFloat(pm2) ? Math.round(sup * parseFloat(pm2)) : 0
              return React.createElement("div", { key: p, style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" } },
                React.createElement("span", { style: { flex: 1, fontSize: "13px", color: "#0a2e1a", fontWeight: "600" } }, p),
                React.createElement("input", {
                  type: "number",
                  value: pm2,
                  onChange: function(e) {
                    var val = e.target.value
                    setFormDevis(function(prev) {
                      var newPPP = Object.assign({}, prev.prixParPrestation || {})
                      newPPP[p] = val
                      var supPrev = parseFloat(prev.superficie) || 0
                      var total = (prev.prestations || []).reduce(function(sum, pr) {
                        var v = parseFloat(pr === p ? val : (newPPP[pr] || 0)) || 0
                        return sum + (supPrev ? Math.round(supPrev * v) : 0)
                      }, 0)
                      return Object.assign({}, prev, { prixParPrestation: newPPP, montantBrut: total > 0 ? String(total) : prev.montantBrut })
                    })
                  },
                  placeholder: "Ex : 300",
                  style: Object.assign({}, inp, { width: "120px", textAlign: "right" })
                }),
                React.createElement("span", { style: { fontSize: "12px", color: "#888", minWidth: "120px", textAlign: "right" } },
                  montantP > 0 ? "= " + montantP.toLocaleString("fr-FR") + " FCFA" : "= —"
                )
              )
            }),
            React.createElement("div", { style: { borderTop: "1px solid #e0ddd6", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", color: "#0a2e1a" } },
              React.createElement("span", null, "Total prestations"),
              React.createElement("span", null, (function() {
                var t = prestations.reduce(function(s, pr) {
                  var pm2 = parseFloat((formDevis.prixParPrestation || {})[pr]) || 0
                  return s + (sup ? Math.round(sup * pm2) : 0)
                }, 0)
                return t > 0 ? t.toLocaleString("fr-FR") + " FCFA" : "—"
              })())
            )
          )
        }
        return React.createElement("div", { style: { marginBottom: "12px" } },
          React.createElement("label", { style: lbl }, "Prix au m² (FCFA)"),
          React.createElement("input", {
            type: "number",
            value: formDevis.prixM2,
            onChange: function(e) {
              var pm2 = e.target.value
              setFormDevis(function(prev) {
                var s = parseFloat(prev.superficie) || 0
                return Object.assign({}, prev, { prixM2: pm2, montantBrut: (s && pm2) ? String(Math.round(s * parseFloat(pm2))) : prev.montantBrut })
              })
            },
            placeholder: "Ex : 300",
            style: inp
          })
        )
      })(),
      React.createElement("div", { style: { marginBottom: "12px" } },
        React.createElement("label", { style: lbl }, "Prix de base FCFA *" + (formDevis.superficie && formDevis.prixM2 ? " — calculé automatiquement" : "")),
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
        var brut = parseFloat(formDevis.montantBrut) || 0
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
        React.createElement("button", { onClick: function() { setEditingDevis(null); setFormDevis({ clientId: "", prenom: "", nom: "", email: "", telephone: "", entreprise: "", prestation: "", prestations: [], superficie: "", prixM2: "", prixParPrestation: {}, description: "", montantBrut: "", remise: "", remiseType: "pct", modeTransmission: "email", pctAcompte: "60", conditionsPaiement: "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention." }) }, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" } }, "Annuler")
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
        React.createElement("h4", { style: { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#0a2e1a" } }, editingClient ? "Modifier le client" : "Ajouter un client"),
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
          React.createElement("button", { onClick: function() { setShowFormClient(false); setEditingClient(null) }, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" } }, "Annuler")
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
      p[etapeId] = { done: !currentDone, date: !currentDone ? new Date().toISOString().split('T')[0] : null }
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
                var date = p[etape.id] && p[etape.id].date ? p[etape.id].date : null
                return React.createElement('div', { key: etape.id,
                  onClick: function() { if (!etape.auto) toggleDB(d, etape.id) },
                  title: etape.auto ? 'Détecté automatiquement' : (done ? 'Cliquer pour annuler' : 'Cliquer pour valider'),
                  style: { backgroundColor: done ? '#f0fdf4' : '#f8f7f4', border: '1px solid ' + (done ? '#bbf7d0' : '#e8e6e0'), borderRadius: '8px', padding: '8px 4px', textAlign: 'center', cursor: etape.auto ? 'default' : 'pointer' }
                },
                  React.createElement('div', { style: { fontSize: '15px', marginBottom: '3px' } }, done ? '✅' : '⬜'),
                  React.createElement('div', { style: { fontSize: '9px', color: done ? '#065f46' : '#888', fontWeight: done ? '700' : '400', lineHeight: 1.3 } }, etape.label),
                  !etape.auto && date ? React.createElement('div', { style: { fontSize: '8px', color: '#aaa', marginTop: '2px' } }, date) : null,
                  etape.auto ? React.createElement('div', { style: { fontSize: '8px', color: '#bbb', marginTop: '2px' } }, 'auto') : null
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
                  React.createElement('button', { onClick: function() { ouvrirRapportVisite(r, d, cl) }, style: { background: 'none', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '👁 Voir')
                )
              }),
              rapIntervDevis.map(function(r) {
                return React.createElement('div', { key: r.id, style: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', borderRadius: '8px', padding: '8px 12px' } },
                  React.createElement('span', null, '📊'),
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontWeight: '600', color: '#0a2e1a', fontSize: '11px' } }, r.numero_unique || "Rapport intervention"),
                    React.createElement('div', { style: { fontSize: '10px', color: '#888' } }, r.date_intervention ? new Date(r.date_intervention).toLocaleDateString('fr-FR') : "Rapport d'intervention")
                  ),
                  React.createElement('button', { onClick: function() { ouvrirRapportInterv(r, d, cl) }, style: { background: 'none', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '👁 Voir')
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
                  React.createElement('button', { onClick: function() { rouvrirCertModal(cert, d, cl) }, style: { background: 'none', border: '1px solid #e0ddd6', color: '#555', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' } }, '👁 Voir')
                )
              }),
              fichesDevis.map(function(fiche) {
                return React.createElement('div', { key: fiche.id, style: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid ' + (fiche.envoye ? '#bbf7d0' : '#e0ddd6'), backgroundColor: fiche.envoye ? '#f0fdf4' : '#fafaf8', borderRadius: '8px', padding: '8px 12px' } },
                  React.createElement('span', null, '📋'),
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontWeight: '600', color: '#0a2e1a', fontSize: '11px' } }, fiche.numero_unique),
                    React.createElement('div', { style: { fontSize: '10px', color: '#888' } }, 'Fiche de passage')
                  ),
                  React.createElement('button', { onClick: function() { toggleFicheEnvoye(fiche) }, style: { background: fiche.envoye ? '#0a2e1a' : '#fff', color: fiche.envoye ? '#fff' : '#999', border: '1px solid ' + (fiche.envoye ? '#0a2e1a' : '#ccc'), borderRadius: '20px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700' } }, fiche.envoye ? '✓ Remis' : 'Marquer remis')
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
            React.createElement('button', { onClick: function() { setContratModal(d); setContratAnalyse(null); setContratErreur(null); setContratForm({ typeEtablissement: '', demandeClient: 'trimestriel sur un an', notes: '', prixNegocie: '', inclureNoteDevis: false }) }, style: { background: '#faf5ff', border: '1px solid #e9d5ff', color: '#6b21a8', borderRadius: '6px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' } }, '📄 Contrat'),
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

  async function lancerAnalyseContrat() {
    if (!contratModal) return
    setAnalysingContrat(true)
    setContratAnalyse(null)
    setContratErreur(null)
    try {
      var res = await fetch("/api/analyze-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId: contratModal.id, typeEtablissement: contratForm.typeEtablissement, demandeClient: contratForm.demandeClient, notes: contratForm.notes })
      })
      var data = await res.json()
      if (data.success) {
        setContratAnalyse(data.analyse)
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

  function renderContratModal() {
    if (!contratModal) return null
    var d = contratModal
    var cl = d.clients
    var nomClient = [(cl && cl.prenom) || "", (cl && cl.nom) || ""].filter(Boolean).join(" ")
    var a = contratAnalyse

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
          React.createElement("button", { onClick: function() { setContratModal(null); setContratAnalyse(null); setContratErreur(null) }, style: { background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 } }, "×")
        ),

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
                sansNoteDevis: contratForm.inclureNoteDevis ? "0" : "1"
              })
              window.open("/api/generate-contract?" + params.toString(), "_blank")
            },
            style: { width: "100%", backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "8px", padding: "14px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", marginBottom: "10px" }
          }, "⚡ Générer directement — " + parseInt(contratForm.prixNegocie || 0).toLocaleString("fr-FR") + " FCFA/an"),
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

          // Grille prix / structure
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" } },
            React.createElement("div", { style: { backgroundColor: "#0a2e1a", borderRadius: "8px", padding: "14px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: "22px", fontWeight: "300", color: "#d4a920" } }, Number(a.prixSuggere).toLocaleString("fr-FR")),
              React.createElement("div", { style: { fontSize: "9px", color: "#aaa", textTransform: "uppercase", marginTop: "4px" } }, "FCFA / an")
            ),
            React.createElement("div", { style: { backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "14px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: "22px", fontWeight: "300", color: "#065f46" } }, Number(a.prixTrimestre).toLocaleString("fr-FR")),
              React.createElement("div", { style: { fontSize: "9px", color: "#888", textTransform: "uppercase", marginTop: "4px" } }, "FCFA / " + (a.paiementRecommande === "semestriel" ? "semestre" : a.paiementRecommande === "mensuel" ? "mois" : a.paiementRecommande === "annuel" ? "an" : "trimestre"))
            ),
            React.createElement("div", { style: { backgroundColor: "#fef9ee", borderRadius: "8px", padding: "14px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: "22px", fontWeight: "300", color: "#92400e" } }, a.remiseContrat + "%"),
              React.createElement("div", { style: { fontSize: "9px", color: "#888", textTransform: "uppercase", marginTop: "4px" } }, "remise contrat")
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
                prixAnnuel: a.prixSuggere,
                prixTrimestre: a.prixTrimestre,
                formule: a.formuleRecommandee,
                passages: a.frequencePassages,
                controles: a.controlesMensuels || 0,
                duree: a.dureeContrat || 12,
                paiement: a.paiementRecommande || "trimestriel_avance",
                typeEtablissement: contratForm.typeEtablissement,
                remise: a.remiseContrat || 0,
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
      return 'visite'
    }

    function getProgress(d) {
      var done = ETAPES.filter(function(e) { return isEtapeDone(d, e.id) }).length
      return Math.round((done / ETAPES.length) * 100)
    }

    function toggleEtape(d, etapeId, currentDone) {
      var p = Object.assign({}, d.parcours || {})
      p[etapeId] = { done: !currentDone, date: !currentDone ? new Date().toISOString().split('T')[0] : null }
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
          var date = p[etape.id] && p[etape.id].date ? p[etape.id].date : null
          return React.createElement('div', { key: etape.id, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: '1px solid #eee' } },
            etape.auto
              ? React.createElement('span', { style: { fontSize: '13px', opacity: done ? 1 : 0.3, flexShrink: 0 } }, done ? '✅' : '⬜')
              : React.createElement('button', {
                  onClick: function() { toggleEtape(d, etape.id, done) },
                  title: done ? 'Marquer non fait' : 'Marquer fait',
                  style: { background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', padding: 0, flexShrink: 0 }
                }, done ? '✅' : '⬜'),
            React.createElement('span', { style: { fontSize: '11px', color: done ? '#0a2e1a' : '#888', flex: 1, fontWeight: done ? '600' : '400' } }, etape.label),
            etape.auto
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
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(190px, 1fr))', gap: '10px', overflowX: 'auto', paddingBottom: '12px' } },
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
              var icon = isContrat ? "📄" : isCert ? (doc.sousType === "desinsect" ? "🪲" : doc.sousType === "double" ? "🪲🐭" : "🐭") : "📋"
              var typeLabel = isContrat ? "Contrat d'entretien" : isCert ? (doc.sousType === "desinsect" ? "Certificat Désinsect." : doc.sousType === "double" ? "Certificat Combiné" : "Certificat Dératisation") : "Fiche de passage"
              var clientNom = doc.client ? ([doc.client.prenom, doc.client.nom].filter(Boolean).join(" ") + (doc.client.entreprise ? " — " + doc.client.entreprise : "")) : "Client inconnu"
              var dateStr = doc.date ? new Date(doc.date).toLocaleDateString("fr-FR") : "—"
              var borderColor = isContrat ? "#e9d5ff" : "#e8e6e0"
              var bgColor     = isContrat ? "#faf5ff" : "#fff"
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
                    : React.createElement("button", {
                        onClick: function() { isCert ? apercuCert(doc._rawCert) : apercuFiche(doc._raw, doc.client) },
                        style: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" }
                      }, "👁 Aperçu"),
                  !isContrat && React.createElement("button", {
                    onClick: function() { isCert ? toggleCertEnvoye({ id: doc._id, envoye: doc.envoye, envoye_at: doc.envoye_at }) : toggleFicheEnvoye({ id: doc._id, envoye: doc.envoye, envoye_at: doc.envoye_at }) },
                    title: doc.envoye ? ("Envoyé le " + new Date(doc.envoye_at).toLocaleDateString("fr-FR")) : "Marquer comme envoyé",
                    style: { background: doc.envoye ? "#0a2e1a" : "#fff", color: doc.envoye ? "#fff" : "#999", border: "1px solid " + (doc.envoye ? "#0a2e1a" : "#ccc"), borderRadius: "20px", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "700" }
                  }, doc.envoye ? "✓ " + (isCert ? "Envoyé" : "Remis") : (isCert ? "Envoyé ?" : "Remis ?")),
                  !isContrat && (isCert
                    ? React.createElement("button", {
                        onClick: function() { var d = devisList.find(function(x) { return x.id === doc._devisId }); rouvrirCertModal(doc._rawCert, d, doc.client) },
                        style: { background: "#fff", color: "#0a2e1a", border: "1px solid #0a2e1a", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }
                      }, "✏️ Modifier")
                    : React.createElement("button", {
                        onClick: function() { reouvrirFicheModal(doc._raw, doc.client) },
                        style: { background: "#fff", color: "#0a2e1a", border: "1px solid #0a2e1a", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }
                      }, "✏️ Modifier")),
                  React.createElement("button", {
                    onClick: function() { isContrat ? (window.confirm("Supprimer ce contrat ?") && db.from("contrats").delete().eq("id", doc._id).then(charger)) : isCert ? supprimerCertificat(doc._id) : supprimerFiche(doc._id) },
                    style: { background: "#fff", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }
                  }, "🗑")
                )
              )
            })
          )
    )
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
    vue === "pipeline" ? renderVuePipeline() : null,
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
  '  @page { size: A4 portrait; margin: 7mm 10mm; }' +
  '  .noprint { display: none; }' +
  '  body { background: #fff; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
  '  .page { max-width: 100%; }' +
  '  .hdr { padding: 8px 16px; }' +
  '  .hdr-left .name { font-size: 15px; }' +
  '  .hdr img { width: 44px !important; height: 44px !important; }' +
  '  .agr { padding: 3px 10px; font-size: 8px; }' +
  '  .body { padding: 8px 16px; }' +
  '  .section { margin-bottom: 6px; }' +
  '  .section-title { font-size: 8px; padding-bottom: 2px; margin-bottom: 5px; }' +
  '  .value-box { padding: 4px 7px; font-size: 9.5px; min-height: 18px; line-height: 1.4; }' +
  '  .grid2 { gap: 8px; }' +
  '  .sig-zone { min-height: 38px; padding: 5px; }' +
  '  .sig-title { font-size: 8px; }' +
  '  .gse-footer { padding: 4px 16px; font-size: 8px; }' +
  '  .photos-grid { grid-template-columns: repeat(5,1fr); gap: 4px; }' +
  '  .photos-grid > div { aspect-ratio: unset; height: 62px; }' +
  '  .photos-grid img { height: 62px; }' +
  '}'

function gseHeader(title, ref) {
  return '<div class="hdr">' +
    '<div class="hdr-left"><div class="sub">Global Solutions Entreprise</div><div class="name">Phyto Bénin</div></div>' +
    '<img src="/logo-gse.jpeg" alt="GSE" style="width:56px;height:56px;object-fit:contain;border-radius:4px;background:#fff;padding:3px">' +
    '<div class="hdr-right"><div class="title">' + title + '</div>' + (ref ? '<div class="ref">' + ref + '</div>' : '') + '</div>' +
    '</div>' +
    '<div class="agr">✅ Agrément APA/26-025/CNGP-BEN &nbsp;·&nbsp; Police d\'assurance N°:13901/7010000035 &nbsp;·&nbsp; RCCM: RB/COT/24 B 38910 &nbsp;·&nbsp; IFU: 3202420126111</div>'
}

function gseSigs() {
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px">' +
    '<div><div class="sig-title">Signature du client</div><div class="sig-zone"><p style="font-size:10px;font-style:italic;color:#888">Bon pour accord</p><div style="height:60px"></div></div></div>' +
    '<div><div class="sig-title">Pour Global Solutions Entreprise</div><div class="sig-zone"><p style="font-size:10px;font-style:italic;color:#888;margin-bottom:4px">Le Directeur Général</p><div style="height:40px"></div><p style="font-weight:700;font-size:12px">Kabir Mohamed YAKOUBOU</p></div></div>' +
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

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>' + titre + ' — GSE</title>' +
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
    '<title>Fiche de Passage ' + numero + ' — GSE</title>' +
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
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport de visite — GSE</title>' +
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
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport d\'intervention — GSE</title>' +
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