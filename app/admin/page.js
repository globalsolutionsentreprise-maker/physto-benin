"use client"
import React, { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const MOT_DE_PASSE = "phyto-benin2025"

const CHIFFRES_DEFAUT = [
  { id: 1, valeur: "+50", label: "Clients proteges", ordre: 1 },
  { id: 2, valeur: "2h", label: "Delai intervention", ordre: 2 },
  { id: 4, valeur: "24h/24", label: "Disponibilite urgence", ordre: 4 },
]

export default function Admin() {
  const [connecte, setConnecte] = useState(false)
  const [mdp, setMdp] = useState("")
  const [erreurMdp, setErreurMdp] = useState(false)
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

  const [nouveauTemoignage, setNouveauTemoignage] = useState({ init: "", nom: "", role: "", texte: "" })
  const [nouvelArticle, setNouvelArticle] = useState({ categorie: "", titre: "", resume: "", contenu: "", date: "", lecture: "5 min", vedette: false })
  const [nouveauMembre, setNouveauMembre] = useState({ init: "", nom: "", role: "", description: "", ordre: 0 })

  useEffect(function() {
    const auth = localStorage.getItem("phyto-benin_admin_v4")
    if (auth === "oui") { setConnecte(true); chargerTout() }
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

  function seConnecter(e) {
    e.preventDefault()
    if (mdp === MOT_DE_PASSE) {
      setConnecte(true)
      localStorage.setItem("phyto-benin_admin_v4", "oui")
      chargerTout()
    } else {
      setErreurMdp(true)
    }
  }

  function seDeconnecter() {
    setConnecte(false)
    localStorage.removeItem("phyto-benin_admin_v4")
  }

  function afficherMessage(msg) {
    setMessage(msg)
    setTimeout(function() { setMessage("") }, 3000)
  }

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
    { id: "clients", label: "Clients & Devis" },
  ]

  if (!connecte) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "48px 40px", width: "100%", maxWidth: "380px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <img src="/logo-gse.jpeg" alt="Logo" style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "10px", marginBottom: "16px" }} />
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "4px" }}>Back Office</h1>
            <p style={{ fontSize: "13px", color: "#888" }}>Phyto Bénin</p>
          </div>
          <form onSubmit={seConnecter} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={lbl}>MOT DE PASSE</label>
              <input type="password" value={mdp} onChange={function(e) { setMdp(e.target.value) }} placeholder="Mot de passe" style={Object.assign({}, inp, erreurMdp ? { borderColor: "#991b1b" } : {})} />
              {erreurMdp && <p style={{ fontSize: "12px", color: "#991b1b", marginTop: "5px" }}>Mot de passe incorrect</p>}
            </div>
            <button type="submit" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "700", fontSize: "14px", padding: "13px", borderRadius: "6px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Se connecter
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>

      <div style={{ backgroundColor: "#0a2e1a", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo-gse.jpeg" alt="Logo" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px" }} />
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
          <button onClick={chargerTout} style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", background: "none", border: "1px solid rgba(255,255,255,0.2)", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit" }}>Recharger</button>
          <a href="/" style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Voir le site</a>
          <button onClick={seDeconnecter} style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Deconnexion</button>
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
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "14px" }}>Ajouter un article</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div><label style={lbl}>CATEGORIE</label><input type="text" value={nouvelArticle.categorie} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { categorie: e.target.value }) }) }} placeholder="Ex: DESINSECTISATION" style={inp} /></div>
                  <div><label style={lbl}>DATE</label><input type="text" value={nouvelArticle.date} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { date: e.target.value }) }) }} placeholder="Ex: 15 Avril 2025" style={inp} /></div>
                </div>
                <div style={{ marginBottom: "10px" }}><label style={lbl}>TITRE</label><input type="text" value={nouvelArticle.titre} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { titre: e.target.value }) }) }} placeholder="Titre de l article..." style={inp} /></div>
                <div style={{ marginBottom: "10px" }}><label style={lbl}>RESUME</label><textarea rows={2} value={nouvelArticle.resume} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { resume: e.target.value }) }) }} style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                <div style={{ marginBottom: "14px" }}><label style={lbl}>CONTENU COMPLET</label><textarea rows={6} value={nouvelArticle.contenu} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { contenu: e.target.value }) }) }} placeholder="Redigez le contenu complet..." style={Object.assign({}, inp, { resize: "vertical" })} /></div>
                <button onClick={ajouterArticle} style={btnAjouter}>Ajouter cet article</button>
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
              <SectionClientsDevis db={supabase} agrement={parametres.agrement || ""} />
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
function SectionClientsDevis({ db, agrement }) {
  const COMMISSION_FEDAPAY = 0.0185
  const [vue, setVue] = React.useState("devis")
  const [devisList, setDevisList] = React.useState([])
  const [clients, setClients] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [msg, setMsg] = React.useState("")
  const [filtre, setFiltre] = React.useState("tous")
  const [showFormDevis, setShowFormDevis] = React.useState(false)
  const [submittingDevis, setSubmittingDevis] = React.useState(false)
  const [showNewClient, setShowNewClient] = React.useState(false)
  const [validating, setValidating] = React.useState(null)
  const [certModal, setCertModal] = React.useState(null)
  const [certForm, setCertForm] = React.useState({})
  const [ficheModal, setFicheModal] = React.useState(null)
  const [ficheForm, setFicheForm] = React.useState({})
  const [savingFiche, setSavingFiche] = React.useState(false)
  const [certsList, setCertsList] = React.useState([])
  const [fichesList, setFichesList] = React.useState([])
  const [editingDevis, setEditingDevis] = React.useState(null)
  const COND_PAIEMENT_DEFAUT = "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention."
  const [formDevis, setFormDevis] = React.useState({ clientId: "", prenom: "", nom: "", email: "", telephone: "", entreprise: "", prestation: "", prestations: [], superficie: "", prixM2: "", description: "", montantBrut: "", remise: "", remiseType: "pct", modeTransmission: "email", pctAcompte: "60", conditionsPaiement: "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention." })
  const [showFormClient, setShowFormClient] = React.useState(false)
  const [editingClient, setEditingClient] = React.useState(null)
  const [submittingClient, setSubmittingClient] = React.useState(false)
  const [clientDetail, setClientDetail] = React.useState(null)
  const [formClient, setFormClient] = React.useState({ prenom: "", nom: "", email: "", telephone: "", entreprise: "", adresse: "" })

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

  async function charger() {
    setLoading(true)
    const [{ data: devis }, { data: cls }, { data: certs }, { data: fiches }] = await Promise.all([
      db.from("devis").select("*, clients(id, nom, prenom, entreprise, email, telephone)").order("created_at", { ascending: false }),
      db.from("clients").select("*").order("nom"),
      db.from("certificats").select("*").order("created_at", { ascending: false }),
      db.from("fiches_passage").select("*").order("created_at", { ascending: false }),
    ])
    setDevisList(devis || [])
    setClients(cls || [])
    setCertsList(certs || [])
    setFichesList(fiches || [])
    setLoading(false)
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
      description: d.description || "",
      montantBrut: d.montant_net || d.montant_total || "",
      remise: "",
      remiseType: "pct",
      modeTransmission: "email",
      pctAcompte: d.pct_acompte ? String(d.pct_acompte) : "60",
      conditionsPaiement: d.conditions_paiement || "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention."
    })
    setShowFormDevis(true)
    setMsg("")
  }

  async function creerDevis() {
    var prestationStr = (formDevis.prestations && formDevis.prestations.length > 0)
      ? formDevis.prestations.join(" + ")
      : formDevis.prestation
    if ((!formDevis.clientId && !formDevis.nom) || !prestationStr || !formDevis.montantBrut) {
      setMsg("Remplissez tous les champs obligatoires."); return
    }
    setSubmittingDevis(true); setMsg("")

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
      setFormDevis({ clientId: "", prenom: "", nom: "", email: "", telephone: "", entreprise: "", prestation: "", prestations: [], superficie: "", prixM2: "", description: "", montantBrut: "", remise: "", remiseType: "pct", modeTransmission: "email", pctAcompte: "60", conditionsPaiement: "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention." })
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
        prix_m2: prixM2Val
      }).eq("id", editingDevis.id)
      if (error) { setMsg("Erreur: " + error.message); setSubmittingDevis(false); return }
      if (enLigne && cl && cl.email) {
        try {
          await fetch("/api/send-devis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientEmail: cl.email, clientNom: cl.nom, clientPrenom: cl.prenom || "", devisNumero: editingDevis.numero, prestation: prestationStr, montant: montantClient, description: formDevis.description }) })
          setMsg("✓ Devis modifié et renvoyé à " + cl.email)
        } catch(e) { setMsg("✓ Devis modifié (email non envoyé)") }
      } else if (!enLigne) {
        setMsg("✓ Devis modifié")
        var imprimData = { numero: editingDevis.numero, clientNom: cl ? cl.nom : "", clientPrenom: cl ? (cl.prenom || "") : "", clientEmail: cl ? cl.email : "", clientTelephone: cl ? (cl.telephone || "") : "", clientEntreprise: cl ? (cl.entreprise || "") : "", prestation: prestationStr, superficie: formDevis.superficie, prixM2: formDevis.prixM2, description: formDevis.description, montantBrut: brut, remiseMontant: remiseMontant, remiseLabel: formDevis.remiseType === "pct" ? (remiseVal + "%") : (remiseMontant.toLocaleString("fr-FR") + " FCFA"), montantNet: montantNet, pctAcompte: parseInt(formDevis.pctAcompte) || 60, conditionsPaiement: formDevis.conditionsPaiement, agrement: agrement }
        imprimerDevis(imprimData)
      } else { setMsg("✓ Devis modifié") }
      setShowFormDevis(false); setEditingDevis(null)
      viderForm()
      await charger(); setSubmittingDevis(false)
      return
    }

    var clientId = formDevis.clientId
    var clientEmail = "", clientNom = "", clientPrenom = "", clientTel = "", clientEnt = ""
    if (!clientId) {
      var { data: nc, error: errClient } = await db.from("clients").insert({ user_id: null, nom: formDevis.nom, prenom: formDevis.prenom, email: formDevis.email, telephone: formDevis.telephone, entreprise: formDevis.entreprise }).select().single()
      if (errClient) { setMsg("Erreur client: " + errClient.message); setSubmittingDevis(false); return }
      clientId = nc.id; clientEmail = formDevis.email; clientNom = formDevis.nom; clientPrenom = formDevis.prenom; clientTel = formDevis.telephone; clientEnt = formDevis.entreprise
    } else {
      var cl2 = clients.find(function(c) { return c.id === clientId })
      if (cl2) { clientEmail = cl2.email; clientNom = cl2.nom; clientPrenom = cl2.prenom || ""; clientTel = cl2.telephone || ""; clientEnt = cl2.entreprise || "" }
    }
    var { data: num } = await db.rpc("generate_devis_numero")
    var numero = num || ("DEV-" + Date.now())
    var { error: errDevis } = await db.from("devis").insert({ client_id: clientId, numero: numero, prestation: prestationStr, description: formDevis.description, montant_total: montantClient, montant_net: montantNet, statut: "envoye", date_envoi: new Date().toISOString(), pct_acompte: parseInt(formDevis.pctAcompte) || 60, conditions_paiement: formDevis.conditionsPaiement || null, superficie: superficieVal, prix_m2: prixM2Val })
    if (errDevis) { setMsg("Erreur devis: " + errDevis.message); setSubmittingDevis(false); return }

    if (enLigne && clientEmail) {
      try {
        await fetch("/api/send-devis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientEmail, clientNom, clientPrenom, devisNumero: numero, prestation: prestationStr, montant: montantClient, description: formDevis.description }) })
        setMsg("✓ Devis créé et email envoyé à " + clientEmail)
      } catch(e) { setMsg("✓ Devis créé (email non envoyé)") }
    } else if (enLigne) {
      setMsg("✓ Devis créé (pas d'email pour ce client)")
    } else {
      setMsg("✓ Devis créé — impression en cours...")
      var imprimData2 = { numero: numero, clientNom: clientNom, clientPrenom: clientPrenom, clientEmail: clientEmail, clientTelephone: clientTel, clientEntreprise: clientEnt, prestation: prestationStr, superficie: formDevis.superficie, prixM2: formDevis.prixM2, description: formDevis.description, montantBrut: brut, remiseMontant: remiseMontant, remiseLabel: formDevis.remiseType === "pct" ? (remiseVal + "%") : (remiseMontant.toLocaleString("fr-FR") + " FCFA"), montantNet: montantNet, pctAcompte: parseInt(formDevis.pctAcompte) || 60, conditionsPaiement: formDevis.conditionsPaiement, agrement: agrement }
      imprimerDevis(imprimData2)
    }

    setShowFormDevis(false); setShowNewClient(false)
    viderForm()
    await charger(); setSubmittingDevis(false)
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
      ref: type === 'desinsect' ? '001/26' : '002/26',
      dateJour: jour,
      dateMois: mois,
      entreprise: (cl && cl.entreprise) ? cl.entreprise : [(cl && cl.prenom) || '', (cl && cl.nom) || ''].filter(Boolean).join(' '),
      ifu: '',
      rccm: '',
      locaux: d.description || '',
      situation: (d.lieu_intervention) || (cl && cl.adresse) || '',
      dateDebut: '',
      dateFin: '',
      matiere1: type === 'desinsect' ? 'Deltaméthrine SC 12.5%' : 'Brodifacoum 0.005%',
      obs1: 'Homologué CNEIP / DPV APV / CNGP-BEN',
      matiere2: type === 'desinsect' ? 'Cyperméthrine 10 CE' : 'Bromadiolone 0.005%',
      obs2: 'Homologué CNEIP / DPV APV / CNGP-BEN',
      matiere3: '',
      obs3: '',
    })
    setCertModal({ type: type, devis: d, cl: cl })
  }

  async function genererCertificat() {
    var html = buildCertificatHtml(certModal.type, certForm)
    var w = window.open('', '_blank', 'width=920,height=1050')
    if (w) { w.document.write(html); w.document.close() }
    var type = certModal.type
    var devisId = certModal.devis.id
    var clientId = certModal.devis.client_id
    setCertModal(null)
    try {
      var { data: numero } = await db.rpc('generate_certificat_numero', { cert_type: type })
      var certNumero = numero || ('CERT-' + type.toUpperCase() + '-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4))
      await db.from('certificats').insert({ numero_unique: certNumero, devis_id: devisId, client_id: clientId, type: type })
      setMsg('✓ Certificat ' + certNumero + ' enregistré — imprimez en PDF')
      await charger()
    } catch(e) { setMsg('✓ Certificat généré (non enregistré : ' + e.message + ')') }
  }

  function renderCertModal() {
    if (!certModal) return null
    var type = certModal.type
    var title = type === 'desinsect' ? 'Certificat de Désinsectisation' : 'Certificat de Dératisation'
    var updateForm = function(field, val) {
      setCertForm(function(prev) { return Object.assign({}, prev, { [field]: val }) })
    }
    var inp2 = { width: '100%', padding: '8px 10px', border: '1.5px solid #e0ddd6', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
    var lbl2 = { display: 'block', fontSize: '10px', fontWeight: '700', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }
    var pairs = [['matiere1', 'obs1'], ['matiere2', 'obs2'], ['matiere3', 'obs3']]

    return React.createElement('div', {
      style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px' },
      onClick: function(e) { if (e.target === e.currentTarget) setCertModal(null) }
    },
      React.createElement('div', { style: { backgroundColor: '#fff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '700px', marginTop: '20px' } },

        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
          React.createElement('h3', { style: { fontSize: '16px', fontWeight: '700', color: '#0a2e1a', margin: 0 } }, '📋 ' + title),
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

        React.createElement('div', { style: { backgroundColor: '#f8f7f4', borderRadius: '8px', padding: '16px', marginBottom: '20px' } },
          React.createElement('div', { style: { fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '12px', textTransform: 'uppercase' } }, 'Matières actives utilisées'),
          pairs.map(function(pair, i) {
            return React.createElement('div', { key: i, style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: i < 2 ? '10px' : 0 } },
              React.createElement('div', null, React.createElement('label', { style: lbl2 }, 'Matière active ' + (i + 1) + (i === 2 ? ' (optionnel)' : '')), React.createElement('input', { value: certForm[pair[0]] || '', onChange: function(e) { updateForm(pair[0], e.target.value) }, style: inp2 })),
              React.createElement('div', null, React.createElement('label', { style: lbl2 }, 'Observations ' + (i + 1) + (i === 2 ? ' (optionnel)' : '')), React.createElement('input', { value: certForm[pair[1]] || '', onChange: function(e) { updateForm(pair[1], e.target.value) }, style: inp2 }))
            )
          })
        ),

        React.createElement('div', { style: { display: 'flex', gap: '10px' } },
          React.createElement('button', { onClick: genererCertificat, style: { backgroundColor: '#0a2e1a', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' } }, '🖨️ Générer le certificat'),
          React.createElement('button', { onClick: function() { setCertModal(null) }, style: { background: 'none', border: '1px solid #e0ddd6', borderRadius: '6px', padding: '12px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' } }, 'Annuler')
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

  // ── FICHES DE PASSAGE ──────────────────────────────
  function ouvrirFicheModal(c) {
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
      autresPrestation: '',
      lieuPrestation: '',
      nuisibles: [],
      autresNuisible: '',
      produits: { insecticides: '', raticides: '', desinfectants: '', fumigants: '', phytosanitaires: '', autres: '' },
      produitsCoches: [],
      dureeDebut: '',
      dureeFin: '',
      remarques: '',
      datePassage: yyyy + '-' + mm + '-' + dd,
      superviseurNom: '',
      superviseurContact: '',
    })
    setFicheModal({ client: c })
  }

  async function saveFichePassage() {
    setSavingFiche(true); setMsg('')
    try {
      var { data: numero } = await db.rpc('generate_fiche_numero')
      var ficheNumero = numero || ('FP-GSE-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4))
      var { data: fiche, error } = await db.from('fiches_passage').insert({
        numero_unique: ficheNumero,
        client_id: ficheModal.client.id,
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
      }).select().single()
      if (error) { setMsg('Erreur: ' + error.message); setSavingFiche(false); return }
      var html = buildFichePassageHtml(ficheForm, ficheModal.client, ficheNumero)
      var w = window.open('', '_blank', 'width=920,height=1100')
      if (w) { w.document.write(html); w.document.close() }
      setFicheModal(null)
      setMsg('✓ Fiche ' + ficheNumero + ' créée — imprimez en PDF')
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
                return React.createElement('label', { key: t, style: chkLbl },
                  React.createElement('input', { type: 'checkbox', checked: (ficheForm.prestations || []).includes(t), onChange: function() { toggleArr('prestations', t) }, style: chkStyle }),
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
                return React.createElement('label', { key: n, style: chkLbl },
                  React.createElement('input', { type: 'checkbox', checked: (ficheForm.nuisibles || []).includes(n), onChange: function() { toggleArr('nuisibles', n) }, style: chkStyle }),
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
      ".page { max-width: 720px; margin: 0 auto; background: #fff; }" +
      ".header { background: #0a2e1a; padding: 32px 40px; }" +
      ".header .co { color: #d4a920; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px; }" +
      ".header .ti { color: #fff; font-size: 26px; font-weight: 300; letter-spacing: 0.05em; }" +
      ".header .ref { color: rgba(255,255,255,0.55); font-size: 13px; margin-top: 6px; }" +
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
      ".sigs { display: flex; gap: 32px; margin-top: 8px; }" +
      ".sig { flex: 1; border: 1px solid #e0ddd6; border-radius: 6px; padding: 14px; text-align: center; }" +
      ".sigl { font-size: 11px; color: #888; margin-bottom: 48px; line-height: 1.5; }" +
      ".sigl em { display: block; color: #aaa; font-size: 10px; }" +
      ".sigline { border-top: 1px solid #333; margin-top: 6px; }" +
      ".footer { background: #0a2e1a; padding: 18px 40px; text-align: center; margin-top: 0; }" +
      ".footer div { color: #d4a920; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }" +
      ".noprint { text-align: center; padding: 16px; background: #f0fdf4; }" +
      ".noprint button { background: #0a2e1a; color: #d4a920; border: none; border-radius: 6px; padding: 10px 28px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; margin: 4px; }" +
      ".noprint button.sec-btn { background: #fff; color: #0a2e1a; border: 1px solid #0a2e1a; }" +
      "@media print { .noprint { display: none; } body { background: #fff; } }" +
      "</style></head><body>" +
      "<div class=\"noprint\"><button onclick=\"window.print()\">🖨️ Imprimer</button><button class=\"sec-btn\" onclick=\"window.close()\">Fermer</button></div>" +
      "<div class=\"page\">" +
      "<div class=\"header\"><div class=\"co\">Global Solutions Entreprise" + (d.agrement ? " &nbsp;·&nbsp; Agréé État du Bénin" : "") + "</div><div class=\"ti\">DEVIS</div><div class=\"ref\">Réf. " + d.numero + (d.agrement ? " &nbsp;·&nbsp; " + d.agrement : "") + "</div></div>" +
      "<div class=\"body\">" +
      "<div class=\"meta\">" +
      "<div><div class=\"ml\">Client</div><div class=\"mv\">" + nomClient + "</div>" +
      (d.clientEntreprise ? "<div class=\"ms\">" + d.clientEntreprise + "</div>" : "") +
      (d.clientEmail ? "<div class=\"ms\">" + d.clientEmail + "</div>" : "") +
      (d.clientTelephone ? "<div class=\"ms\">" + d.clientTelephone + "</div>" : "") +
      "</div>" +
      "<div style=\"text-align:right\"><div class=\"ml\">Date d'émission</div><div class=\"mv\">" + dateStr + "</div><div class=\"ms\">Valide jusqu'au " + validiteDate + "</div></div>" +
      "</div>" +
      "<div class=\"sec\">Prestation</div>" +
      "<div class=\"pbox\"><div class=\"pname\">" + d.prestation + "</div>" +
      (d.superficie ? "<div class=\"pdesc\" style=\"margin-top:6px;font-size:12px;color:#888\">Superficie : " + Number(d.superficie).toLocaleString("fr-FR") + " m²  ·  Prix au m² : " + Number(d.prixM2 || 0).toLocaleString("fr-FR") + " FCFA/m²</div>" : "") +
      (d.description ? "<div class=\"pdesc\" style=\"margin-top:6px\">" + d.description + "</div>" : "") +
      "</div>" +
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
      "<div class=\"valid\">Ce devis est valable 30 jours · Global Solutions Entreprise · contact@phyto-benin.com</div>" +
      "<div class=\"sigs\">" +
      "<div class=\"sig\"><div class=\"sigl\">Signature du client<em>Bon pour accord</em></div><div class=\"sigline\"></div></div>" +
      "<div class=\"sig\"><div class=\"sigl\">Pour GSE<em>Cachet et signature</em></div><div class=\"sigline\"></div></div>" +
      "</div>" +
      "</div>" +
      "<div class=\"footer\"><div>Global Solutions Entreprise · Cotonou, Bénin · contact@phyto-benin.com</div></div>" +
      "</div></body></html>"
    var w = window.open("", "_blank", "width=820,height=900")
    if (w) { w.document.write(html); w.document.close() }
  }

  function renduDevis(d) {
    var st = STATUTS[d.statut] || { label: d.statut, c: "#444", bg: "#f0f0f0" }
    var cl = d.clients
    var certsDevis = certsList.filter(function(c) { return c.devis_id === d.id })
    return React.createElement("div", { key: d.id, style: { backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", padding: "18px 22px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" } },
          React.createElement("span", { style: { fontSize: "11px", fontWeight: "700", color: "#d4a920" } }, d.numero),
          React.createElement("span", { style: { padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "600", backgroundColor: st.bg, color: st.c } }, st.label)
        ),
        React.createElement("div", { style: { fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "3px" } }, d.prestation),
        cl && React.createElement("div", { style: { fontSize: "12px", color: "#666" } }, (cl.prenom || "") + " " + cl.nom + (cl.entreprise ? " — " + cl.entreprise : "") + (cl.email ? " · " + cl.email : "")),
        d.notes_modification && React.createElement("div", { style: { marginTop: "8px", padding: "8px 12px", backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "6px", fontSize: "12px", color: "#6b21a8" } },
          React.createElement("strong", null, "Modification demandée : "), d.notes_modification
        ),
        certsDevis.length > 0 && React.createElement("div", { style: { marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" } },
          certsDevis.map(function(cert) {
            var label = cert.type === 'desinsect' ? '🪲' : '🐭'
            return React.createElement("div", { key: cert.id, style: { display: "flex", alignItems: "center", gap: "6px", background: cert.envoye ? "#f0fdf4" : "#fafaf8", border: "1px solid " + (cert.envoye ? "#bbf7d0" : "#e0ddd6"), borderRadius: "20px", padding: "3px 10px", fontSize: "11px" } },
              React.createElement("span", { style: { color: "#555" } }, label + " " + cert.numero_unique),
              React.createElement("button", {
                onClick: function() { toggleCertEnvoye(cert) },
                title: cert.envoye ? ("Envoyé le " + new Date(cert.envoye_at).toLocaleDateString("fr-FR")) : "Marquer comme envoyé",
                style: { background: cert.envoye ? "#0a2e1a" : "#fff", color: cert.envoye ? "#fff" : "#999", border: "1px solid " + (cert.envoye ? "#0a2e1a" : "#ccc"), borderRadius: "10px", padding: "1px 8px", fontSize: "10px", cursor: "pointer", fontFamily: "inherit", fontWeight: "700" }
              }, cert.envoye ? "✓ Envoyé" : "Envoyé ?")
            )
          })
        )
      ),
      React.createElement("div", { style: { textAlign: "right", marginLeft: "20px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" } },
        React.createElement("div", { style: { fontSize: "17px", fontWeight: "700", color: "#0a2e1a" } }, Number(d.montant_total).toLocaleString("fr-FR") + " FCFA"),
        d.montant_net && React.createElement("div", { style: { fontSize: "11px", color: "#aaa" } }, "dont " + Math.round(d.montant_total - d.montant_net).toLocaleString("fr-FR") + " FCFA frais"),
        React.createElement("div", { style: { fontSize: "11px", color: "#bbb" } }, new Date(d.created_at).toLocaleDateString("fr-FR")),
        d.statut === "en_cours" && React.createElement("button", { onClick: function() { validerLivraison(d.id) }, disabled: validating === d.id, style: { backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, validating === d.id ? "..." : "✓ Valider → 40%"),
        d.statut === "modification_demandee" && React.createElement("div", { style: { fontSize: "11px", color: "#7c3aed", backgroundColor: "#ede9fe", padding: "6px 10px", borderRadius: "6px" } }, "⚠ " + (d.notes_modification || "Modification demandée")),
        d.statut === "modification_demandee" && React.createElement("button", { onClick: function() { ouvrirEditionDevis(d) }, style: { backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "✏️ Modifier et renvoyer"),
        d.statut !== "modification_demandee" && React.createElement("button", { onClick: function() { ouvrirEditionDevis(d) }, style: { background: "none", border: "1px solid #d1d5db", color: "#374151", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "✏️ Modifier"),
        cl && cl.email && React.createElement("button", { onClick: function() { renvoyerEmail(d) }, style: { background: "none", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "✉ Renvoyer"),
        d.statut !== "annule" && React.createElement("button", { onClick: function() { openCertModal('desinsect', d) }, style: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#065f46", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" } }, "🪲 Désinsect."),
        d.statut !== "annule" && React.createElement("button", { onClick: function() { openCertModal('derat', d) }, style: { background: "#fefce8", border: "1px solid #fde68a", color: "#92400e", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" } }, "🐭 Dératisation"),
        React.createElement("button", { onClick: function() { supprimerDevis(d.id, d.numero) }, style: { background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "🗑 Supprimer")
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
    return React.createElement("div", { style: { display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "2px solid #e8e6e0", paddingBottom: "0" } },
      [["devis", "Devis"], ["clients", "Clients"]].map(function(t) {
        var active = vue === t[0] || (vue === "devis-client" && t[0] === "clients")
        return React.createElement("button", { key: t[0], onClick: function() { setVue(t[0]); setClientDetail(null); setMsg("") }, style: { padding: "10px 20px", border: "none", borderBottom: active ? "2px solid #0a2e1a" : "2px solid transparent", marginBottom: "-2px", background: "none", fontSize: "13px", fontWeight: active ? "700" : "400", color: active ? "#0a2e1a" : "#888", cursor: "pointer", fontFamily: "inherit" } }, t[1])
      })
    )
  }

  function renderFormDevis() {
    if (!showFormDevis) return null
    return React.createElement("div", { style: { backgroundColor: "#fafaf8", border: "2px solid #0a2e1a", borderRadius: "10px", padding: "24px", marginBottom: "24px" } },
      React.createElement("h4", { style: { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#0a2e1a" } }, editingDevis ? "Modifier " + editingDevis.numero : "Créer un devis"),
      React.createElement("div", { style: { display: "flex", gap: "10px", marginBottom: "16px" } },
        React.createElement("button", { onClick: function() { setShowNewClient(false) }, style: { padding: "7px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", border: "none", backgroundColor: !showNewClient ? "#0a2e1a" : "#f0ede6", color: !showNewClient ? "#fff" : "#444" } }, "Client existant"),
        React.createElement("button", { onClick: function() { setShowNewClient(true); setFormDevis(Object.assign({}, formDevis, { clientId: "" })) }, style: { padding: "7px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", border: "none", backgroundColor: showNewClient ? "#0a2e1a" : "#f0ede6", color: showNewClient ? "#fff" : "#444" } }, "+ Nouveau client")
      ),
      !showNewClient
        ? React.createElement("div", { style: { marginBottom: "14px" } },
            React.createElement("label", { style: lbl }, "Client *"),
            React.createElement("select", { value: formDevis.clientId, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { clientId: e.target.value })) }, style: inp },
              React.createElement("option", { value: "" }, "Choisir un client..."),
              clients.map(function(c) { return React.createElement("option", { key: c.id, value: c.id }, (c.prenom || "") + " " + c.nom + (c.entreprise ? " — " + c.entreprise : "")) })
            )
          )
        : React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" } },
            React.createElement("div", null, React.createElement("label", { style: lbl }, "Prénom"), React.createElement("input", { value: formDevis.prenom, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { prenom: e.target.value })) }, placeholder: "Jean", style: inp })),
            React.createElement("div", null, React.createElement("label", { style: lbl }, "Nom *"), React.createElement("input", { value: formDevis.nom, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { nom: e.target.value })) }, placeholder: "Dupont", style: inp })),
            React.createElement("div", null, React.createElement("label", { style: lbl }, "Email"), React.createElement("input", { type: "email", value: formDevis.email, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { email: e.target.value })) }, placeholder: "jean@email.com (optionnel)", style: inp })),
            React.createElement("div", null, React.createElement("label", { style: lbl }, "Téléphone"), React.createElement("input", { value: formDevis.telephone, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { telephone: e.target.value })) }, placeholder: "+229 01...", style: inp })),
            React.createElement("div", { style: { gridColumn: "1/-1" } }, React.createElement("label", { style: lbl }, "Entreprise"), React.createElement("input", { value: formDevis.entreprise, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { entreprise: e.target.value })) }, placeholder: "Nom entreprise (optionnel)", style: inp }))
          ),
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
                  var current = formDevis.prestations || []
                  var newList = checked ? current.filter(function(x) { return x !== p }) : current.concat([p])
                  setFormDevis(Object.assign({}, formDevis, { prestations: newList }))
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
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" } },
        React.createElement("div", null,
          React.createElement("label", { style: lbl }, "Superficie (m²)"),
          React.createElement("input", {
            type: "number",
            value: formDevis.superficie,
            onChange: function(e) {
              var sup = e.target.value
              var pm2 = parseFloat(formDevis.prixM2) || 0
              var auto = (sup && pm2) ? String(Math.round(parseFloat(sup) * pm2)) : formDevis.montantBrut
              setFormDevis(Object.assign({}, formDevis, { superficie: sup, montantBrut: (sup && pm2) ? auto : formDevis.montantBrut }))
            },
            placeholder: "Ex : 500",
            style: inp
          })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: lbl }, "Prix au m² (FCFA)"),
          React.createElement("input", {
            type: "number",
            value: formDevis.prixM2,
            onChange: function(e) {
              var pm2 = e.target.value
              var sup = parseFloat(formDevis.superficie) || 0
              setFormDevis(Object.assign({}, formDevis, { prixM2: pm2, montantBrut: (sup && pm2) ? String(Math.round(sup * parseFloat(pm2))) : formDevis.montantBrut }))
            },
            placeholder: "Ex : 300",
            style: inp
          })
        )
      ),
      React.createElement("div", { style: { marginBottom: "12px" } },
        React.createElement("label", { style: lbl }, "Prix de base FCFA *" + (formDevis.superficie && formDevis.prixM2 ? " — calculé automatiquement" : "")),
        React.createElement("input", { type: "number", value: formDevis.montantBrut, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { montantBrut: e.target.value })) }, placeholder: "200000", style: inp })
      ),
      React.createElement("div", { style: { marginBottom: "12px" } },
        React.createElement("label", { style: lbl }, "Remise accordée (optionnel)"),
        React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "stretch" } },
          React.createElement("div", { style: { display: "flex", borderRadius: "6px", overflow: "hidden", border: "1.5px solid #e0ddd6", flexShrink: 0 } },
            React.createElement("button", { type: "button", onClick: function() { setFormDevis(Object.assign({}, formDevis, { remiseType: "pct" })) }, style: { padding: "8px 14px", border: "none", backgroundColor: formDevis.remiseType === "pct" ? "#0a2e1a" : "#fff", color: formDevis.remiseType === "pct" ? "#fff" : "#666", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", fontWeight: "700" } }, "%"),
            React.createElement("button", { type: "button", onClick: function() { setFormDevis(Object.assign({}, formDevis, { remiseType: "fixe" })) }, style: { padding: "8px 14px", border: "none", backgroundColor: formDevis.remiseType === "fixe" ? "#0a2e1a" : "#fff", color: formDevis.remiseType === "fixe" ? "#fff" : "#666", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", fontWeight: "700" } }, "FCFA")
          ),
          React.createElement("input", { type: "number", value: formDevis.remise, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { remise: e.target.value })) }, placeholder: formDevis.remiseType === "pct" ? "Ex: 10  (= 10%)" : "Ex: 5000", style: Object.assign({}, inp, { flex: 1 }) })
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
          React.createElement("button", { type: "button", onClick: function() { setFormDevis(Object.assign({}, formDevis, { modeTransmission: "email" })) }, style: { flex: 1, padding: "12px 14px", borderRadius: "6px", border: formDevis.modeTransmission === "email" ? "2px solid #0a2e1a" : "2px solid #e0ddd6", backgroundColor: formDevis.modeTransmission === "email" ? "#f0fdf4" : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" } },
            React.createElement("div", { style: { fontSize: "13px", fontWeight: "700", color: formDevis.modeTransmission === "email" ? "#0a2e1a" : "#555" } }, "✉ Envoyer par email"),
            React.createElement("div", { style: { fontSize: "11px", color: "#888", marginTop: "2px" } }, "Paiement en ligne via FedaPay")
          ),
          React.createElement("button", { type: "button", onClick: function() { setFormDevis(Object.assign({}, formDevis, { modeTransmission: "impression" })) }, style: { flex: 1, padding: "12px 14px", borderRadius: "6px", border: formDevis.modeTransmission === "impression" ? "2px solid #0a2e1a" : "2px solid #e0ddd6", backgroundColor: formDevis.modeTransmission === "impression" ? "#f0fdf4" : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" } },
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
                    setFormDevis(Object.assign({}, formDevis, { pctAcompte: String(v) }))
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
          React.createElement("textarea", { value: formDevis.conditionsPaiement, rows: 2, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { conditionsPaiement: e.target.value })) }, placeholder: "Ex: Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention.", style: Object.assign({}, inp, { resize: "vertical", fontSize: "13px" }) })
        )
      ),
      React.createElement("div", { style: { marginBottom: "18px" } },
        React.createElement("label", { style: lbl }, "Description"),
        React.createElement("textarea", { value: formDevis.description, rows: 3, onChange: function(e) { setFormDevis(Object.assign({}, formDevis, { description: e.target.value })) }, placeholder: "Surface, zones, délais...", style: Object.assign({}, inp, { resize: "vertical" }) })
      ),
      React.createElement("div", { style: { display: "flex", gap: "10px" } },
        React.createElement("button", { onClick: creerDevis, disabled: submittingDevis, style: { backgroundColor: editingDevis ? "#7c3aed" : "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 22px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", opacity: submittingDevis ? 0.7 : 1 } },
          submittingDevis ? "..." : (
            editingDevis
              ? (formDevis.modeTransmission === "email" ? "✏️ Modifier et renvoyer" : "✏️ Modifier et imprimer")
              : (formDevis.modeTransmission === "email" ? "✉ Créer et envoyer" : "🖨️ Créer et imprimer")
          )
        ),
        React.createElement("button", { onClick: function() { setShowFormDevis(false); setShowNewClient(false); setEditingDevis(null); setFormDevis({ clientId: "", prenom: "", nom: "", email: "", telephone: "", entreprise: "", prestation: "", prestations: [], superficie: "", prixM2: "", description: "", montantBrut: "", remise: "", remiseType: "pct", modeTransmission: "email", pctAcompte: "60", conditionsPaiement: "Le règlement du solde peut se faire jusqu'à 2 semaines après l'intervention." }) }, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" } }, "Annuler")
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
              var fichesClient = fichesList.filter(function(f) { return f.client_id === c.id })
              return React.createElement("div", { key: c.id, style: { backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", padding: "16px 20px", marginBottom: "8px" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                  React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: "600", color: "#0a2e1a", fontSize: "15px", marginBottom: "3px" } }, (c.prenom || "") + " " + c.nom),
                    React.createElement("div", { style: { fontSize: "12px", color: "#666" } }, c.email + (c.telephone ? " · " + c.telephone : "") + (c.entreprise ? " · " + c.entreprise : ""))
                  ),
                  React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
                    React.createElement("span", { style: { fontSize: "11px", color: "#888", marginRight: "4px" } }, nbDevis + " devis"),
                    React.createElement("button", { onClick: function() { voirDevisClient(c) }, style: { background: "none", border: "1px solid #0a2e1a", color: "#0a2e1a", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "Voir devis"),
                    React.createElement("button", { onClick: function() { ouvrirFicheModal(c) }, style: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#065f46", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" } }, "📋 Fiche"),
                    React.createElement("button", { onClick: function() { ouvrirEditionClient(c) }, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "✏️"),
                    React.createElement("button", { onClick: function() { supprimerClient(c) }, style: { background: "none", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "🗑")
                  )
                ),
                fichesClient.length > 0 && React.createElement("div", { style: { marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" } },
                  fichesClient.map(function(fiche) {
                    return React.createElement("div", { key: fiche.id, style: { display: "flex", alignItems: "center", gap: "6px", background: fiche.envoye ? "#f0fdf4" : "#fafaf8", border: "1px solid " + (fiche.envoye ? "#bbf7d0" : "#e0ddd6"), borderRadius: "20px", padding: "3px 10px", fontSize: "11px" } },
                      React.createElement("span", { style: { color: "#555" } }, "📋 " + fiche.numero_unique),
                      React.createElement("span", { style: { color: "#aaa" } }, new Date(fiche.created_at).toLocaleDateString("fr-FR")),
                      React.createElement("button", {
                        onClick: function() { toggleFicheEnvoye(fiche) },
                        title: fiche.envoye ? ("Remis le " + new Date(fiche.envoye_at).toLocaleDateString("fr-FR")) : "Marquer comme remis",
                        style: { background: fiche.envoye ? "#0a2e1a" : "#fff", color: fiche.envoye ? "#fff" : "#999", border: "1px solid " + (fiche.envoye ? "#0a2e1a" : "#ccc"), borderRadius: "10px", padding: "1px 8px", fontSize: "10px", cursor: "pointer", fontFamily: "inherit", fontWeight: "700" }
                      }, fiche.envoye ? "✓ Remis" : "Remis ?")
                    )
                  })
                )
              )
            }))
    )
  }

  function renderVueDevisClient() {
    if (!clientDetail) return null
    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" } },
        React.createElement("button", { onClick: function() { setVue("clients"); setClientDetail(null) }, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "← Retour"),
        React.createElement("div", null,
          React.createElement("div", { style: { fontWeight: "700", fontSize: "16px", color: "#0a2e1a" } }, (clientDetail.prenom || "") + " " + clientDetail.nom),
          React.createElement("div", { style: { fontSize: "12px", color: "#888" } }, clientDetail.email + (clientDetail.entreprise ? " · " + clientDetail.entreprise : ""))
        )
      ),
      filtresDevis.length === 0
        ? React.createElement("div", { style: { textAlign: "center", padding: "40px", backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "8px", color: "#888" } }, "Aucun devis pour ce client.")
        : React.createElement("div", null, filtresDevis.map(function(d) { return renduDevis(d) }))
    )
  }

  function renderVueDevis() {
    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" } },
        React.createElement("strong", { style: { fontSize: "15px", color: "#111" } }, "Tous les devis"),
        React.createElement("div", { style: { display: "flex", gap: "8px" } },
          React.createElement("button", { onClick: charger, style: { background: "none", border: "1px solid #e0ddd6", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "↺"),
          React.createElement("button", { onClick: function() { setShowFormDevis(true); setMsg("") }, style: { backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "+ Nouveau devis")
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
    renderCompteurs(),
    msg ? React.createElement("div", { style: { padding: "12px 16px", backgroundColor: msg.startsWith("Erreur") ? "#fef2f2" : "#f0fdf4", border: "1px solid " + (msg.startsWith("Erreur") ? "#fecaca" : "#bbf7d0"), borderRadius: "6px", color: msg.startsWith("Erreur") ? "#991b1b" : "#065f46", fontSize: "13px", marginBottom: "18px", display: "flex", justifyContent: "space-between" } },
      msg,
      React.createElement("span", { onClick: function() { setMsg("") }, style: { cursor: "pointer", opacity: 0.5 } }, "×")
    ) : null,
    renderOnglets(),
    vue === "clients" ? renderVueClients() : null,
    vue === "devis-client" ? renderVueDevisClient() : null,
    vue === "devis" ? renderVueDevis() : null
  )
}

function buildCertificatHtml(type, form) {
  var titre = type === 'desinsect' ? 'CERTIFICAT DE DÉSINSECTISATION' : 'CERTIFICAT DE DÉRATISATION'
  var operationType = type === 'desinsect' ? 'désinsectisation' : 'dératisation'
  var methode = type === 'desinsect'
    ? "L'opération est réalisée par pulvérisation au moyen des produits homologués ci-après."
    : "L'opération est réalisée par disposition de produit homologué dans les PVC (boîtes d'appâts)."

  var rowsHtml = [
    [form.matiere1, form.obs1],
    [form.matiere2, form.obs2],
    [form.matiere3, form.obs3],
  ].map(function(r) {
    return '<tr><td style="border:1px solid #bbb;padding:9px 10px;height:32px;vertical-align:middle">' + (r[0] || '') + '</td><td style="border:1px solid #bbb;padding:9px 10px;height:32px;vertical-align:middle">' + (r[1] || '') + '</td></tr>'
  }).join('')

  var dateExec = (form.dateDebut && form.dateFin)
    ? 'du <strong>' + form.dateDebut + '</strong> au <strong>' + form.dateFin + '</strong> 2026'
    : 'du __________ au __________ 2026'

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>' + titre + ' — GSE</title>' +
    '<style>' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; background: #fff; }' +
    '.noprint { text-align: center; padding: 14px; background: #f0fdf4; border-bottom: 1px solid #bbf7d0; }' +
    '.noprint button { background: #0a2e1a; color: #d4a920; border: none; border-radius: 6px; padding: 10px 28px; font-size: 13px; font-weight: 700; cursor: pointer; margin: 4px; font-family: inherit; }' +
    '.noprint button.sec { background: #fff; color: #0a2e1a; border: 1px solid #0a2e1a; }' +
    '.page { max-width: 760px; margin: 0 auto; padding: 40px 50px; }' +
    '@media print { .noprint { display: none; } body { background: #fff; } .page { padding: 24px 36px; } }' +
    '</style></head><body>' +
    '<div class="noprint"><button onclick="window.print()">🖨️ Imprimer / PDF</button><button class="sec" onclick="window.close()">Fermer</button></div>' +
    '<div class="page">' +

    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">' +
    '<img src="/logo-gse.jpeg" alt="Logo GSE" style="width:82px;height:82px;object-fit:contain;border-radius:4px">' +
    '<div style="text-align:right;font-size:13px;line-height:1.9">' +
    'Cotonou le <strong>' + (form.dateJour || '__') + '</strong> - <strong>' + (form.dateMois || '__') + '</strong> 2026<br>' +
    '<strong>Réf : ' + (form.ref || '') + '</strong>' +
    '</div>' +
    '</div>' +

    '<h1 style="text-align:center;font-size:17px;font-weight:bold;text-decoration:underline;margin:0 0 22px;text-transform:uppercase;letter-spacing:0.02em">' + titre + '</h1>' +

    '<p style="margin-bottom:14px;line-height:1.75">La Société <strong>Global Solutions Entreprise (GSE)</strong>, agissant en qualité d\'<strong>Applicateur Agréé</strong>.<br>' +
    'Référence <strong>APA/26-025/CNGP-BEN</strong> dont police d\'assurance <strong>N°:13901/7010000035</strong></p>' +

    '<p style="margin-bottom:18px;line-height:1.75"><strong>Certifie</strong> conformément à la <strong>loi 91-004 du 11 Février 1991</strong> portant réglementation Phytosanitaire en République du Bénin, et ceux sous la supervision des structures Compétentes du Ministère de l\'Agriculture, de l\'Élevage et de la Pêche (MAEP), de l\'exécution de l\'opération de <strong>' + operationType + '</strong> des locaux appartenant à :</p>' +

    '<table style="margin-bottom:18px;border-collapse:collapse;width:100%">' +
    '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold;width:38%">Entreprise bénéficiaire</td><td style="border:1px solid #aaa;padding:7px 12px">' + (form.entreprise || '') + '</td></tr>' +
    '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold">N° IFU</td><td style="border:1px solid #aaa;padding:7px 12px">' + (form.ifu || '') + '</td></tr>' +
    '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold">RCCM</td><td style="border:1px solid #aaa;padding:7px 12px">' + (form.rccm || '') + '</td></tr>' +
    '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold">Magasin / Locaux</td><td style="border:1px solid #aaa;padding:7px 12px">' + (form.locaux || '') + '</td></tr>' +
    '<tr><td style="border:1px solid #aaa;padding:7px 12px;background:#d9d9d9;font-weight:bold">Situation Géographique</td><td style="border:1px solid #aaa;padding:7px 12px">' + (form.situation || '') + '</td></tr>' +
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

    '<p style="font-style:italic;margin-top:16px;margin-bottom:52px;line-height:1.75">En foi de quoi le présent certificat est délivré pour servir et valoir ce que de droit.</p>' +

    '<div>' +
    '<p style="font-weight:bold;margin-bottom:6px">Le Directeur Général</p>' +
    '<div style="height:88px"></div>' +
    '<p style="font-weight:bold">Kabir Mohamed YAKOUBOU</p>' +
    '</div>' +

    '<div style="margin-top:36px;padding-top:10px;border-top:1px solid #bbb;font-size:11px;text-align:center;color:#666;line-height:1.6">' +
    'Global Solutions Entreprise | Applicateur Agréé | Réf. APA/26-025/CNGP-BEN | Cotonou, Bénin' +
    '</div>' +

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
    '@media print { .noprint { display: none; } body { background: #fff; } .page { max-width: 100%; } }' +
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

 // Mer 15 avr 2026 22:22:43 CEST