"use client"
import { useState } from "react"

export default function ContactForm() {

  const FORMSPREE_URL = "https://formspree.io/f/mreorevl"
  const EMAIL = "contact@phyto-benin.com"

  const [statut, setStatut] = useState("idle")
  const [formulaire, setFormulaire] = useState({
    nom: "", telephone: "", email: "", nuisible: "", ville: "", message: "", urgence: false,
  })

  function handleChange(e) {
    const t = e.target
    setFormulaire(function(p) {
      return Object.assign({}, p, { [t.name]: t.type === "checkbox" ? t.checked : t.value })
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatut("envoi")
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(formulaire),
      })
      if (res.ok) {
        setStatut("succes")
        // Fire-and-forget : enregistre le lead dans Supabase pour l'offre bienvenue
        fetch("/api/register-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formulaire),
        }).catch(function() {})
        setFormulaire({ nom: "", telephone: "", email: "", nuisible: "", ville: "", message: "", urgence: false })
      } else { setStatut("erreur") }
    } catch(err) { setStatut("erreur") }
  }

  const zones = [
    { ville: "Cotonou", delai: "Zone prioritaire", priorite: true },
    { ville: "Abomey-Calavi", delai: "Zone prioritaire", priorite: true },
    { ville: "Sèmè-Kpodji", delai: "Zone prioritaire", priorite: true },
    { ville: "Porto-Novo", delai: "Disponible", priorite: false },
    { ville: "Ouidah", delai: "Disponible", priorite: false },
    { ville: "Abomey", delai: "Disponible", priorite: false },
    { ville: "Parakou", delai: "Disponible", priorite: false },
    { ville: "Toute autre ville", delai: "Nous contacter", priorite: false },
  ]

  const inp = {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: "14px",
    padding: "13px 16px",
    borderRadius: "0",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxSizing: "border-box",
    outline: "none",
  }

  const lbl = {
    fontSize: "10px",
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
    letterSpacing: "0.1em",
    display: "block",
    marginBottom: "6px",
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "3px" }}>

      {/* FORMULAIRE */}
      <div style={{ backgroundColor: "#0a2e1a", padding: "56px 48px" }}>
        <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>FORMULAIRE DE CONTACT</div>
        <h2 style={{ fontSize: "26px", fontWeight: "300", color: "#ffffff", lineHeight: "1.2", letterSpacing: "-0.01em", marginBottom: "8px" }}>
          Décrivez votre situation.
          <br />
          <strong style={{ fontWeight: "700" }}>On s'occupe du reste.</strong>
        </h2>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "40px" }}>
          Diagnostic et estimation offerts.
        </p>

        {statut === "succes" && (
          <div style={{ backgroundColor: "rgba(26,107,56,0.25)", border: "1px solid rgba(26,107,56,0.5)", padding: "24px", marginBottom: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px", color: "#d4a920" }}>✓</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#4ade80", marginBottom: "4px" }}>Message envoyé avec succès</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Notre équipe vous contacte rapidement.</div>
          </div>
        )}

        {statut === "erreur" && (
          <div style={{ backgroundColor: "rgba(153,27,27,0.25)", border: "1px solid rgba(153,27,27,0.5)", padding: "16px", marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", color: "#fca5a5" }}>Une erreur est survenue. Contactez-nous directement par téléphone ou email.</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
            <div>
              <label htmlFor="nom" style={lbl}>VOTRE NOM *</label>
              <input id="nom" type="text" name="nom" required value={formulaire.nom} onChange={handleChange} placeholder="Ex : Kofi Mensah" style={inp} />
            </div>
            <div>
              <label htmlFor="telephone" style={lbl}>TÉLÉPHONE *</label>
              <input id="telephone" type="tel" name="telephone" required value={formulaire.telephone} onChange={handleChange} placeholder="+229 XX XX XX XX" style={inp} />
            </div>
          </div>

          <div>
            <label htmlFor="email" style={lbl}>EMAIL</label>
            <input id="email" type="email" name="email" value={formulaire.email} onChange={handleChange} placeholder="exemple@email.com" style={inp} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
            <div>
              <label htmlFor="nuisible" style={lbl}>TYPE DE NUISIBLE *</label>
              <select id="nuisible" name="nuisible" required value={formulaire.nuisible} onChange={handleChange} style={inp}>
                <option value="" style={{ backgroundColor: "#0a2e1a" }}>Sélectionner</option>
                <option value="Cafards" style={{ backgroundColor: "#0a2e1a" }}>Cafards et Blattes</option>
                <option value="Rats" style={{ backgroundColor: "#0a2e1a" }}>Rats et Souris</option>
                <option value="Moustiques" style={{ backgroundColor: "#0a2e1a" }}>Moustiques</option>
                <option value="Termites" style={{ backgroundColor: "#0a2e1a" }}>Termites et Fourmis</option>
                <option value="Geckos" style={{ backgroundColor: "#0a2e1a" }}>Geckos et Reptiles</option>
                <option value="Serpents" style={{ backgroundColor: "#0a2e1a" }}>Serpents</option>
                <option value="Punaises" style={{ backgroundColor: "#0a2e1a" }}>Punaises de lit</option>
                <option value="Desinfection" style={{ backgroundColor: "#0a2e1a" }}>Désinfection générale</option>
                <option value="Autre" style={{ backgroundColor: "#0a2e1a" }}>Autre nuisible</option>
              </select>
            </div>
            <div>
              <label htmlFor="ville" style={lbl}>VOTRE VILLE *</label>
              <input id="ville" type="text" name="ville" required value={formulaire.ville} onChange={handleChange} placeholder="Ex : Cotonou" style={inp} />
            </div>
          </div>

          <div>
            <label htmlFor="message" style={lbl}>VOTRE MESSAGE</label>
            <textarea id="message" name="message" rows={4} value={formulaire.message} onChange={handleChange} placeholder="Décrivez votre situation, la superficie, le type de local..." style={Object.assign({}, inp, { resize: "vertical" })} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <input type="checkbox" name="urgence" checked={formulaire.urgence} onChange={handleChange} style={{ width: "16px", height: "16px", accentColor: "#d4a920", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.5" }}>
              Urgence, je souhaite être contacté(e) rapidement
            </span>
          </label>

          <div style={{ backgroundColor: "rgba(26,107,56,0.15)", border: "1px solid rgba(26,107,56,0.4)", borderRadius: "6px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "12px", fontWeight: "800", padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>−10%</span>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: "1.4" }}>
              Votre remise de 10% est automatiquement incluse, valable pour toute première demande.
            </span>
          </div>

          <button type="submit" disabled={statut === "envoi"} style={{ backgroundColor: statut === "envoi" ? "#8a6e12" : "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "16px", border: "none", cursor: statut === "envoi" ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.02em" }}>
            {statut === "envoi" ? "Envoi en cours..." : "Envoyer ma demande"}
          </button>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {["Réponse rapide", "Disponible 24h/24"].map(function(g) {
              return (
                <div key={g} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
                  <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#1a6b38", flexShrink: 0 }} />
                  {g.toUpperCase()}
                </div>
              )
            })}
          </div>

        </form>
      </div>

      {/* COLONNE DROITE */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>

        {/* CONTACTS DIRECTS */}
        <div style={{ backgroundColor: "#ffffff", padding: "40px 36px" }}>
          <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "24px" }}>CONTACTS DIRECTS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { ico: "✉", label: "Email", valeur: EMAIL, href: "mailto:" + EMAIL, couleur: "#0a2e1a" },
              { ico: "📍", label: "Adresse", valeur: "Cotonou, Bénin", href: "#", couleur: "#0a2e1a" },
            ].map(function(c) {
              return (
                <a key={c.label} href={c.href} style={{ display: "flex", alignItems: "center", gap: "16px", textDecoration: "none" }}>
                  <div style={{ width: "44px", height: "44px", backgroundColor: "#f7f7f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{c.ico}</div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#bbb", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "3px" }}>{c.label.toUpperCase()}</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#0a0a0a" }}>{c.valeur}</div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>

        {/* MOMO PAY */}
        <div style={{ backgroundColor: "#fff8e1", padding: "28px 36px", borderTop: "3px solid #ffcc00" }}>
          <div style={{ fontSize: "11px", color: "#b45309", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>PAIEMENT MOBILE MONEY</div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
            <div style={{ width: "48px", height: "48px", backgroundColor: "#ffcc00", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", fontSize: "22px", flexShrink: 0, boxShadow: "0 2px 8px rgba(255,204,0,0.4)" }}>📱</div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#111" }}>MTN MoMo Pay</div>
              <div style={{ fontSize: "12px", color: "#888" }}>Paiement instantané depuis votre téléphone</div>
            </div>
          </div>
          <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #ffe082", borderRadius: "8px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", color: "#b45309", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "8px" }}>CODE USSD, COMPOSEZ :</div>
            <div style={{ fontSize: "19px", fontWeight: "700", color: "#111", letterSpacing: "0.04em", fontFamily: "monospace" }}>
              *880*41*893118*<span style={{ color: "#b45309" }}>montant</span>#
            </div>
          </div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "10px", lineHeight: "1.6" }}>
            Remplacez <strong style={{ color: "#b45309" }}>montant</strong> par la somme à régler en FCFA, puis appelez le code depuis votre téléphone MTN.
          </div>
        </div>

        {/* ZONES */}
        <div style={{ backgroundColor: "#ffffff", padding: "36px 36px", flex: 1 }}>
          <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "24px" }}>ZONES D'INTERVENTION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {zones.map(function(z) {
              return (
                <div key={z.ville} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: z.priorite ? "#f0f8f3" : "#f9f9f9", borderLeft: z.priorite ? "3px solid #1a6b38" : "3px solid transparent" }}>
                  <span style={{ fontSize: "13px", fontWeight: z.priorite ? "700" : "400", color: "#0a0a0a" }}>{z.ville}</span>
                  <span style={{ fontSize: "11px", color: z.priorite ? "#1a6b38" : "#bbb", fontWeight: z.priorite ? "700" : "400" }}>{z.delai}</span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
