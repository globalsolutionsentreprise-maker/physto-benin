"use client"
import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const MOT_DE_PASSE = "physto2025"

const CHIFFRES_DEFAUT = [
  { id: 1, valeur: "+50", label: "Clients proteges", ordre: 1 },
  { id: 2, valeur: "2h", label: "Delai intervention", ordre: 2 },
  { id: 3, valeur: "100%", label: "Resultats garantis", ordre: 3 },
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
    const auth = localStorage.getItem("physto_admin_v4")
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
      localStorage.setItem("physto_admin_v4", "oui")
      chargerTout()
    } else {
      setErreurMdp(true)
    }
  }

  function seDeconnecter() {
    setConnecte(false)
    localStorage.removeItem("physto_admin_v4")
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
  ]

  if (!connecte) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "48px 40px", width: "100%", maxWidth: "380px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <img src="/logo-gse.jpeg" alt="Logo" style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "10px", marginBottom: "16px" }} />
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "4px" }}>Back Office</h1>
            <p style={{ fontSize: "13px", color: "#888" }}>PHYSTO Benin</p>
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
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#d4a920" }}>Back Office PHYSTO Benin</div>
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
                { cle: "email", label: "EMAIL", placeholder: "contact@physto-benin.com" },
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

        </div>
      </div>
    </main>
  )
}
 // Mer 15 avr 2026 22:22:43 CEST
