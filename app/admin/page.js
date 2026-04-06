"use client"
import { useState, useEffect } from "react"

const MOT_DE_PASSE = "physto2025"

const DONNEES_INITIALES = {
  chiffres: [
    { id: 1, valeur: "+50", label: "Clients proteges" },
    { id: 2, valeur: "2h", label: "Delai intervention" },
    { id: 3, valeur: "100%", label: "Resultats probants" },
    { id: 4, valeur: "24h/24", label: "Disponibilite urgence" },
  ],
  agrement: "N AGREMENT-BENIN-XXXXX",
  telephone: "+229 01 53 04 79 50",
  email: "contact@physto-benin.com",
  whatsapp: "2290153047950",
  adresse: "Cotonou, Benin",
  services: [
    { id: 1, ico: "🪳", titre: "Desinsectisation", desc: "Cafards, fourmis, moustiques, mouches, araignees. Gel appat, pulverisation, fumigation professionnelle certifiee.", tag: "Devis gratuit 24h" },
    { id: 2, ico: "🐀", titre: "Deratisation", desc: "Elimination securisee rats et souris. Pieges certifies, raticides homologues, securisation entrees et suivi mensuel.", tag: "Contrat mensuel dispo" },
    { id: 3, ico: "🧴", titre: "Desinfection", desc: "Assainissement complet. Virucide, bactericide, fongicide. Certifie restaurants, hotels et etablissements de sante.", tag: "Certificat fourni" },
    { id: 4, ico: "🐜", titre: "Anti-termites", desc: "Protection structures bois et beton. Barriere chimique en profondeur, garantie longue duree, controle annuel inclus.", tag: "Garantie longue duree" },
    { id: 5, ico: "🐍", titre: "Reptiles et serpents", desc: "Securisation contre geckos, serpents et lezards. Repulsifs pro, intervention urgence 2h, suivi post-traitement.", tag: "Urgence 2h" },
    { id: 6, ico: "➕", titre: "Autres nuisibles", desc: "Punaises de lit, puces, guepes, frelons, chenilles et tout autre nuisible sur demande specifique.", tag: "Contactez-nous" },
  ],
  mission: "Offrir a chaque client un environnement sain, securise et sans nuisibles. Nous intervenons avec des produits certifies, des methodes eprouvees et un engagement total sur les resultats.",
  engagement: "Si vous n etes pas satisfait du resultat, nous repassons gratuitement jusqu a obtenir le resultat attendu. Aucun compromis sur la qualite.",
  valeurs: [
    { id: 1, ico: "🎯", titre: "Efficacite", desc: "Chaque intervention est planifiee et executee avec precision pour un resultat optimal des la premiere fois." },
    { id: 2, ico: "🔒", titre: "Fiabilite", desc: "Nos techniciens certifies utilisent uniquement des produits homologues et des methodes eprouvees." },
    { id: 3, ico: "⚡", titre: "Reactivite", desc: "Disponibles 24h/24 et 7j/7, nous intervenons en urgence en moins de 2h a Cotonou." },
    { id: 4, ico: "🤝", titre: "Transparence", desc: "Devis clair, intervention expliquee, certificat fourni apres chaque traitement. Aucune surprise." },
  ],
  equipe: [
    { id: 1, init: "YK", nom: "Yakoubou Kabir", role: "Directeur General", desc: "Fondateur de GSE, plus de 10 ans experience en conseil et gestion d entreprise au Benin et en France." },
    { id: 2, init: "AT", nom: "Amadou T.", role: "Responsable Technique", desc: "Technicien certifie en hygiene phytosanitaire, specialiste des traitements termites et desinsectisation." },
    { id: 3, init: "MB", nom: "Marie B.", role: "Chargee de clientele", desc: "En charge de la relation client, des devis et du suivi des contrats d entretien." },
  ],
  temoignages: [
    { id: 1, init: "A.K", nom: "A. Kone", role: "Responsable restauration, Cotonou", texte: "Intervention le jour meme pour une infestation de cafards. Resultat parfait, nous avons pu rouvrir sans aucun probleme le lendemain." },
    { id: 2, init: "F.S", nom: "F. Sow", role: "Directrice etablissement, Porto-Novo", texte: "Contrat trimestriel depuis 2 ans. Notre etablissement est impeccable, nos clients ne se plaignent jamais de nuisibles." },
    { id: 3, init: "M.B", nom: "M. Bello", role: "Responsable logistique, Benin", texte: "Probleme de termites regle en une seule intervention. Tres satisfait du suivi post-traitement et du certificat fourni." },
  ],
  articles: [
    { id: 1, categorie: "DESINSECTISATION", titre: "Comment eliminer durablement les cafards dans un restaurant ?", resume: "Les etapes professionnelles pour en venir a bout definitivement.", date: "15 Mars 2025" },
    { id: 2, categorie: "DERATISATION", titre: "5 signes que votre entrepot est infeste de rats", resume: "Reconnaitre une infestation tot pour eviter des degats importants.", date: "8 Mars 2025" },
    { id: 3, categorie: "ANTI-TERMITES", titre: "Termites au Benin : comment proteger votre maison ?", resume: "Protegez vos structures durablement contre les termites.", date: "1 Mars 2025" },
  ],
}

function fusionner(stocke) {
  var resultat = Object.assign({}, DONNEES_INITIALES)
  if (!stocke) return resultat
  Object.keys(DONNEES_INITIALES).forEach(function(cle) {
    if (cle in stocke) {
      if (Array.isArray(DONNEES_INITIALES[cle])) {
        resultat[cle] = Array.isArray(stocke[cle]) && stocke[cle].length > 0 ? stocke[cle] : DONNEES_INITIALES[cle]
      } else {
        resultat[cle] = stocke[cle]
      }
    }
  })
  return resultat
}

export default function Admin() {
  const [connecte, setConnecte] = useState(false)
  const [mdp, setMdp] = useState("")
  const [erreurMdp, setErreurMdp] = useState(false)
  const [onglet, setOnglet] = useState("chiffres")
  const [donnees, setDonnees] = useState(DONNEES_INITIALES)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [nouveauService, setNouveauService] = useState({ ico: "", titre: "", desc: "", tag: "" })
  const [nouvelleValeur, setNouvelleValeur] = useState({ ico: "", titre: "", desc: "" })
  const [nouveauMembre, setNouveauMembre] = useState({ init: "", nom: "", role: "", desc: "" })
  const [nouveauTemoignage, setNouveauTemoignage] = useState({ init: "", nom: "", role: "", texte: "" })
  const [nouvelArticle, setNouvelArticle] = useState({ categorie: "", titre: "", resume: "", date: "" })

  useEffect(function() {
    try {
      var stored = localStorage.getItem("physto_donnees")
      if (stored) {
        var parsed = JSON.parse(stored)
        setDonnees(fusionner(parsed))
      }
      var auth = localStorage.getItem("physto_admin")
      if (auth === "oui") setConnecte(true)
    } catch(e) {
      setDonnees(DONNEES_INITIALES)
    }
  }, [])

  function seConnecter(e) {
    e.preventDefault()
    if (mdp === MOT_DE_PASSE) {
      setConnecte(true)
      localStorage.setItem("physto_admin", "oui")
      setErreurMdp(false)
    } else {
      setErreurMdp(true)
    }
  }

  function seDeconnecter() {
    setConnecte(false)
    localStorage.removeItem("physto_admin")
  }

  function sauvegarder() {
    localStorage.setItem("physto_donnees", JSON.stringify(donnees))
    setSauvegarde(true)
    setTimeout(function() { setSauvegarde(false) }, 3000)
  }

  function modifierChamp(champ, valeur) {
    setDonnees(function(prev) { return Object.assign({}, prev, { [champ]: valeur }) })
  }

  function modifierDansTableau(tableau, id, cle, val) {
    setDonnees(function(prev) {
      var copie = {}
      copie[tableau] = prev[tableau].map(function(item) {
        if (item.id === id) return Object.assign({}, item, { [cle]: val })
        return item
      })
      return Object.assign({}, prev, copie)
    })
  }

  function supprimerDansTableau(tableau, id) {
    setDonnees(function(prev) {
      var copie = {}
      copie[tableau] = prev[tableau].filter(function(item) { return item.id !== id })
      return Object.assign({}, prev, copie)
    })
  }

  function ajouterDansTableau(tableau, nouvelElement, reset) {
    setDonnees(function(prev) {
      var copie = {}
      copie[tableau] = prev[tableau].concat([Object.assign({}, nouvelElement, { id: Date.now() })])
      return Object.assign({}, prev, copie)
    })
    reset()
  }

  var inp = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", backgroundColor: "#fff" }
  var lbl = { fontSize: "11px", color: "#888", fontWeight: "600", letterSpacing: "0.05em", display: "block", marginBottom: "5px" }
  var card = { backgroundColor: "#fff", border: "1px solid #f0f0f0", borderRadius: "12px", padding: "20px", marginBottom: "14px" }
  var cardVert = Object.assign({}, card, { borderLeft: "3px solid #1a6b38" })
  var cardOr = Object.assign({}, card, { borderLeft: "3px solid #d4a920", backgroundColor: "#fffdf0" })
  var btnS = { fontSize: "12px", color: "#991b1b", background: "none", border: "1px solid #991b1b", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit" }
  var btnA = { backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "700", fontSize: "13px", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit" }

  var menu = [
    { id: "chiffres", label: "🔢 Chiffres cles" },
    { id: "coordonnees", label: "📞 Coordonnees" },
    { id: "agrement", label: "🏛️ Agrement Etat" },
    { id: "services", label: "🛠️ Nos Traitements" },
    { id: "mission", label: "🎯 Mission et Valeurs" },
    { id: "equipe", label: "👥 Notre Equipe" },
    { id: "temoignages", label: "⭐ Temoignages" },
    { id: "articles", label: "📰 Articles Blog" },
  ]

  if (!connecte) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "400px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <img src="/logo-gse.jpeg" alt="Logo GSE" style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "10px", marginBottom: "16px" }} />
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "4px" }}>Back Office</h1>
            <p style={{ fontSize: "13px", color: "#888" }}>PHYSTO Benin — Espace Admin</p>
          </div>
          <form onSubmit={seConnecter} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={lbl}>MOT DE PASSE</label>
              <input type="password" value={mdp} onChange={function(e) { setMdp(e.target.value) }} placeholder="Entrez votre mot de passe" style={Object.assign({}, inp, erreurMdp ? { borderColor: "#991b1b" } : {})} />
              {erreurMdp && <p style={{ fontSize: "12px", color: "#991b1b", marginTop: "5px" }}>Mot de passe incorrect</p>}
            </div>
            <button type="submit" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "700", fontSize: "14px", padding: "13px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
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
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>Tableau de bord administrateur</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {sauvegarde && <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600" }}>✅ Sauvegarde reussie !</span>}
          <button onClick={sauvegarder} style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "13px", padding: "9px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Sauvegarder</button>
          <a href="/" style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Voir le site</a>
          <button onClick={seDeconnecter} style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Deconnexion</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: "calc(100vh - 64px)" }}>

        <div style={{ backgroundColor: "#fff", borderRight: "1px solid #f0f0f0", padding: "20px 0" }}>
          {menu.map(function(item) {
            return (
              <button key={item.id} onClick={function() { setOnglet(item.id) }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 20px", fontSize: "13px", fontWeight: onglet === item.id ? "700" : "400", color: onglet === item.id ? "#0a2e1a" : "#555", backgroundColor: onglet === item.id ? "#f0f8f3" : "transparent", borderLeft: onglet === item.id ? "3px solid #1a6b38" : "3px solid transparent", borderTop: "none", borderRight: "none", borderBottom: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {item.label}
              </button>
            )
          })}
        </div>

        <div style={{ padding: "32px", overflowY: "auto" }}>

          {onglet === "chiffres" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Chiffres cles</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>Ces 4 chiffres apparaissent dans le hero de la page d accueil.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {donnees.chiffres.map(function(c) {
                  return (
                    <div key={c.id} style={cardVert}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                        <div style={{ width: "52px", height: "52px", borderRadius: "10px", backgroundColor: "#0a2e1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#d4a920", fontSize: "14px", fontWeight: "700", flexShrink: 0 }}>{c.valeur}</div>
                        <div style={{ fontSize: "12px", color: "#555" }}>{c.label}</div>
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={lbl}>VALEUR AFFICHEE</label>
                        <input type="text" value={c.valeur} onChange={function(e) { modifierDansTableau("chiffres", c.id, "valeur", e.target.value) }} placeholder="Ex: +50, 2h, 100%..." style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>LIBELLE</label>
                        <input type="text" value={c.label} onChange={function(e) { modifierDansTableau("chiffres", c.id, "label", e.target.value) }} placeholder="Ex: Clients proteges" style={inp} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {onglet === "coordonnees" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>Coordonnees de contact</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  { champ: "telephone", label: "TELEPHONE", placeholder: "+229 XX XX XX XX" },
                  { champ: "whatsapp", label: "NUMERO WHATSAPP (sans +)", placeholder: "22901234567" },
                  { champ: "email", label: "EMAIL", placeholder: "contact@physto-benin.com" },
                  { champ: "adresse", label: "ADRESSE", placeholder: "Cotonou, Benin" },
                ].map(function(item) {
                  return (
                    <div key={item.champ} style={card}>
                      <label style={lbl}>{item.label}</label>
                      <input type="text" value={donnees[item.champ]} onChange={function(e) { modifierChamp(item.champ, e.target.value) }} placeholder={item.placeholder} style={inp} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {onglet === "agrement" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Numero d agrement Etat</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>Apparait sur la page d accueil dans la section garanties.</p>
              <div style={card}>
                <label style={lbl}>NUMERO OFFICIEL D AGREMENT</label>
                <input type="text" value={donnees.agrement} onChange={function(e) { modifierChamp("agrement", e.target.value) }} placeholder="N AGREMENT-BENIN-XXXXX" style={Object.assign({}, inp, { fontSize: "16px", fontWeight: "600", padding: "14px" })} />
                <p style={{ fontSize: "11px", color: "#aaa", marginTop: "8px" }}>Ex : MSP-BENIN-2024-00123</p>
              </div>
              <div style={{ backgroundColor: "#f0f8f3", border: "1px solid #1a6b38", borderRadius: "10px", padding: "16px" }}>
                <p style={{ fontSize: "13px", color: "#1a6b38", fontWeight: "600", marginBottom: "4px" }}>Apercu :</p>
                <p style={{ fontSize: "16px", color: "#0a2e1a", fontWeight: "700" }}>{donnees.agrement}</p>
              </div>
            </div>
          )}

          {onglet === "services" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>Nos Traitements</h2>
              {donnees.services.map(function(s) {
                return (
                  <div key={s.id} style={cardVert}>
                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <div>
                        <label style={lbl}>ICONE</label>
                        <input type="text" value={s.ico} onChange={function(e) { modifierDansTableau("services", s.id, "ico", e.target.value) }} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>NOM DU TRAITEMENT</label>
                        <input type="text" value={s.titre} onChange={function(e) { modifierDansTableau("services", s.id, "titre", e.target.value) }} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>ETIQUETTE</label>
                        <input type="text" value={s.tag} onChange={function(e) { modifierDansTableau("services", s.id, "tag", e.target.value) }} style={inp} />
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={lbl}>DESCRIPTION</label>
                      <textarea rows={3} value={s.desc} onChange={function(e) { modifierDansTableau("services", s.id, "desc", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                    </div>
                    <button onClick={function() { supprimerDansTableau("services", s.id) }} style={btnS}>Supprimer</button>
                  </div>
                )
              })}
              <div style={cardOr}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "14px" }}>Ajouter un traitement</h3>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={lbl}>ICONE</label>
                    <input type="text" value={nouveauService.ico} onChange={function(e) { setNouveauService(function(p) { return Object.assign({}, p, { ico: e.target.value }) }) }} placeholder="🪳" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>NOM</label>
                    <input type="text" value={nouveauService.titre} onChange={function(e) { setNouveauService(function(p) { return Object.assign({}, p, { titre: e.target.value }) }) }} placeholder="Ex: Desinsectisation" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>ETIQUETTE</label>
                    <input type="text" value={nouveauService.tag} onChange={function(e) { setNouveauService(function(p) { return Object.assign({}, p, { tag: e.target.value }) }) }} placeholder="Ex: Devis gratuit 24h" style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={lbl}>DESCRIPTION</label>
                  <textarea rows={3} value={nouveauService.desc} onChange={function(e) { setNouveauService(function(p) { return Object.assign({}, p, { desc: e.target.value }) }) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                </div>
                <button onClick={function() { ajouterDansTableau("services", nouveauService, function() { setNouveauService({ ico: "", titre: "", desc: "", tag: "" }) }) }} style={btnA}>Ajouter ce traitement</button>
              </div>
            </div>
          )}

          {onglet === "mission" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>Mission et Valeurs</h2>
              <div style={card}>
                <label style={lbl}>NOTRE MISSION</label>
                <textarea rows={4} value={donnees.mission} onChange={function(e) { modifierChamp("mission", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
              </div>
              <div style={card}>
                <label style={lbl}>NOTRE ENGAGEMENT</label>
                <textarea rows={4} value={donnees.engagement} onChange={function(e) { modifierChamp("engagement", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111", margin: "24px 0 16px" }}>Nos valeurs</h3>
              {donnees.valeurs.map(function(v) {
                return (
                  <div key={v.id} style={cardVert}>
                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "10px", marginBottom: "10px" }}>
                      <div>
                        <label style={lbl}>ICONE</label>
                        <input type="text" value={v.ico} onChange={function(e) { modifierDansTableau("valeurs", v.id, "ico", e.target.value) }} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>TITRE</label>
                        <input type="text" value={v.titre} onChange={function(e) { modifierDansTableau("valeurs", v.id, "titre", e.target.value) }} style={inp} />
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={lbl}>DESCRIPTION</label>
                      <textarea rows={2} value={v.desc} onChange={function(e) { modifierDansTableau("valeurs", v.id, "desc", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                    </div>
                    <button onClick={function() { supprimerDansTableau("valeurs", v.id) }} style={btnS}>Supprimer</button>
                  </div>
                )
              })}
              <div style={cardOr}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "14px" }}>Ajouter une valeur</h3>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={lbl}>ICONE</label>
                    <input type="text" value={nouvelleValeur.ico} onChange={function(e) { setNouvelleValeur(function(p) { return Object.assign({}, p, { ico: e.target.value }) }) }} placeholder="🎯" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>TITRE</label>
                    <input type="text" value={nouvelleValeur.titre} onChange={function(e) { setNouvelleValeur(function(p) { return Object.assign({}, p, { titre: e.target.value }) }) }} placeholder="Ex: Innovation" style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={lbl}>DESCRIPTION</label>
                  <textarea rows={2} value={nouvelleValeur.desc} onChange={function(e) { setNouvelleValeur(function(p) { return Object.assign({}, p, { desc: e.target.value }) }) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                </div>
                <button onClick={function() { ajouterDansTableau("valeurs", nouvelleValeur, function() { setNouvelleValeur({ ico: "", titre: "", desc: "" }) }) }} style={btnA}>Ajouter cette valeur</button>
              </div>
            </div>
          )}

          {onglet === "equipe" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>Notre equipe</h2>
              {donnees.equipe.map(function(m) {
                return (
                  <div key={m.id} style={cardVert}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <div>
                        <label style={lbl}>INITIALES</label>
                        <input type="text" value={m.init} onChange={function(e) { modifierDansTableau("equipe", m.id, "init", e.target.value) }} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>NOM COMPLET</label>
                        <input type="text" value={m.nom} onChange={function(e) { modifierDansTableau("equipe", m.id, "nom", e.target.value) }} style={inp} />
                      </div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={lbl}>POSTE</label>
                      <input type="text" value={m.role} onChange={function(e) { modifierDansTableau("equipe", m.id, "role", e.target.value) }} style={inp} />
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={lbl}>DESCRIPTION</label>
                      <textarea rows={3} value={m.desc} onChange={function(e) { modifierDansTableau("equipe", m.id, "desc", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                    </div>
                    <button onClick={function() { supprimerDansTableau("equipe", m.id) }} style={btnS}>Supprimer</button>
                  </div>
                )
              })}
              <div style={cardOr}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "14px" }}>Ajouter un membre</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={lbl}>INITIALES</label>
                    <input type="text" value={nouveauMembre.init} onChange={function(e) { setNouveauMembre(function(p) { return Object.assign({}, p, { init: e.target.value }) }) }} placeholder="Ex: YK" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>NOM COMPLET</label>
                    <input type="text" value={nouveauMembre.nom} onChange={function(e) { setNouveauMembre(function(p) { return Object.assign({}, p, { nom: e.target.value }) }) }} placeholder="Ex: Yakoubou Kabir" style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label style={lbl}>POSTE</label>
                  <input type="text" value={nouveauMembre.role} onChange={function(e) { setNouveauMembre(function(p) { return Object.assign({}, p, { role: e.target.value }) }) }} placeholder="Ex: Technicien certifie" style={inp} />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={lbl}>DESCRIPTION</label>
                  <textarea rows={3} value={nouveauMembre.desc} onChange={function(e) { setNouveauMembre(function(p) { return Object.assign({}, p, { desc: e.target.value }) }) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                </div>
                <button onClick={function() { ajouterDansTableau("equipe", nouveauMembre, function() { setNouveauMembre({ init: "", nom: "", role: "", desc: "" }) }) }} style={btnA}>Ajouter ce membre</button>
              </div>
            </div>
          )}

          {onglet === "temoignages" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>Temoignages clients</h2>
              {donnees.temoignages.map(function(t) {
                return (
                  <div key={t.id} style={cardVert}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <div>
                        <label style={lbl}>INITIALES</label>
                        <input type="text" value={t.init} onChange={function(e) { modifierDansTableau("temoignages", t.id, "init", e.target.value) }} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>NOM</label>
                        <input type="text" value={t.nom} onChange={function(e) { modifierDansTableau("temoignages", t.id, "nom", e.target.value) }} style={inp} />
                      </div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={lbl}>ROLE ET VILLE</label>
                      <input type="text" value={t.role} onChange={function(e) { modifierDansTableau("temoignages", t.id, "role", e.target.value) }} style={inp} />
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={lbl}>TEMOIGNAGE</label>
                      <textarea rows={3} value={t.texte} onChange={function(e) { modifierDansTableau("temoignages", t.id, "texte", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                    </div>
                    <button onClick={function() { supprimerDansTableau("temoignages", t.id) }} style={btnS}>Supprimer</button>
                  </div>
                )
              })}
              <div style={cardOr}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "14px" }}>Ajouter un temoignage</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={lbl}>INITIALES</label>
                    <input type="text" value={nouveauTemoignage.init} onChange={function(e) { setNouveauTemoignage(function(p) { return Object.assign({}, p, { init: e.target.value }) }) }} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>NOM</label>
                    <input type="text" value={nouveauTemoignage.nom} onChange={function(e) { setNouveauTemoignage(function(p) { return Object.assign({}, p, { nom: e.target.value }) }) }} style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label style={lbl}>ROLE ET VILLE</label>
                  <input type="text" value={nouveauTemoignage.role} onChange={function(e) { setNouveauTemoignage(function(p) { return Object.assign({}, p, { role: e.target.value }) }) }} style={inp} />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={lbl}>TEMOIGNAGE</label>
                  <textarea rows={3} value={nouveauTemoignage.texte} onChange={function(e) { setNouveauTemoignage(function(p) { return Object.assign({}, p, { texte: e.target.value }) }) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                </div>
                <button onClick={function() { ajouterDansTableau("temoignages", nouveauTemoignage, function() { setNouveauTemoignage({ init: "", nom: "", role: "", texte: "" }) }) }} style={btnA}>Ajouter ce temoignage</button>
              </div>
            </div>
          )}

          {onglet === "articles" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>Articles du blog</h2>
              {donnees.articles.map(function(a) {
                return (
                  <div key={a.id} style={cardVert}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <div>
                        <label style={lbl}>CATEGORIE</label>
                        <input type="text" value={a.categorie} onChange={function(e) { modifierDansTableau("articles", a.id, "categorie", e.target.value) }} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>DATE</label>
                        <input type="text" value={a.date} onChange={function(e) { modifierDansTableau("articles", a.id, "date", e.target.value) }} style={inp} />
                      </div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={lbl}>TITRE</label>
                      <input type="text" value={a.titre} onChange={function(e) { modifierDansTableau("articles", a.id, "titre", e.target.value) }} style={inp} />
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={lbl}>RESUME</label>
                      <textarea rows={2} value={a.resume} onChange={function(e) { modifierDansTableau("articles", a.id, "resume", e.target.value) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                    </div>
                    <button onClick={function() { supprimerDansTableau("articles", a.id) }} style={btnS}>Supprimer</button>
                  </div>
                )
              })}
              <div style={cardOr}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "14px" }}>Ajouter un article</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={lbl}>CATEGORIE</label>
                    <input type="text" value={nouvelArticle.categorie} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { categorie: e.target.value }) }) }} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>DATE</label>
                    <input type="text" value={nouvelArticle.date} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { date: e.target.value }) }) }} style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label style={lbl}>TITRE</label>
                  <input type="text" value={nouvelArticle.titre} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { titre: e.target.value }) }) }} style={inp} />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={lbl}>RESUME</label>
                  <textarea rows={2} value={nouvelArticle.resume} onChange={function(e) { setNouvelArticle(function(p) { return Object.assign({}, p, { resume: e.target.value }) }) }} style={Object.assign({}, inp, { resize: "vertical" })} />
                </div>
                <button onClick={function() { ajouterDansTableau("articles", nouvelArticle, function() { setNouvelArticle({ categorie: "", titre: "", resume: "", date: "" }) }) }} style={btnA}>Ajouter cet article</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
