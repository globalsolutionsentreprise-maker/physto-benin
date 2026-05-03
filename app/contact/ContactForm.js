"use client"
import { useState } from "react"

export default function ContactForm() {

  const FORMSPREE_URL = "https://formspree.io/f/mreorevl"
  const TEL = "+2290153047950"
  const TEL_AFFICHE = "+229 01 53 04 79 50"
  const EMAIL = "contact@phyto-benin.com"
  const WHATSAPP = "https://wa.me/2290153047950"

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
          <strong style={{ fontWeight: "700" }}>Nous prenons en charge le reste.</strong>
        </h2>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "40px" }}>
          Réponse sous 2h. Diagnostic et estimation offerts.
        </p>

        {statut === "succes" && (
          <div style={{ backgroundColor: "rgba(26,107,56,0.25)", border: "1px solid rgba(26,107,56,0.5)", padding: "24px", marginBottom: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "18px", marginBottom: "8px", color: "#d4a920", fontWeight: "300" }}>— Envoyé</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#4ade80", marginBottom: "4px" }}>Message envoyé avec succès</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Notre équipe vous contacte sous 2h.</div>
          </div>
        )}

        {statut === "erreur" && (
          <div style={{ backgroundColor: "rgba(153,27,27,0.25)", border: "1px solid rgba(153,27,27,0.5)", padding: "16px", marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", color: "#fca5a5" }}>Une erreur est survenue. Contactez-nous directement sur WhatsApp.</div>
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
              Urgence — je souhaite être contacté(e) dans les 2h
            </span>
          </label>

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
              { ico: "☎", label: "Téléphone", valeur: TEL_AFFICHE, href: "tel:" + TEL, couleur: "#0a2e1a" },
              { ico: "💬", label: "WhatsApp", valeur: "Écrire sur WhatsApp", href: WHATSAPP, couleur: "#25d366" },
              { ico: "✉", label: "Email", valeur: EMAIL, href: "mailto:" + EMAIL, couleur: "#0a2e1a" },
              { ico: "📍", label: "Adresse", valeur: "Cotonou, Bénin", href: "#", couleur: "#0a2e1a" },
            ].map(function(c) {
              return (
                <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "16px", textDecoration: "none" }}>
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

        {/* WHATSAPP */}
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#25d366", padding: "24px 36px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", textDecoration: "none" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", letterSpacing: "0.02em" }}>Écrire sur WhatsApp maintenant</span>
        </a>

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
