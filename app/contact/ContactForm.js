"use client"
import { useState } from "react"

export default function ContactForm() {
  const FORMSPREE_URL = "https://formspree.io/f/mreorevl"
  const TEL = "+2290153047950"
  const TEL_AFFICHE = "+229 01 53 04 79 50"
  const EMAIL = "contact@physto-benin.com"
  const WHATSAPP = "https://wa.me/2290153047950"

  const [statut, setStatut] = useState("idle")
  const [formulaire, setFormulaire] = useState({ nom: "", telephone: "", email: "", nuisible: "", ville: "", message: "", urgence: false })

  function handleChange(e) {
    const target = e.target
    setFormulaire(function(prev) {
      return Object.assign({}, prev, { [target.name]: target.type === "checkbox" ? target.checked : target.value })
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatut("envoi")
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ nom: formulaire.nom, telephone: formulaire.telephone, email: formulaire.email, nuisible: formulaire.nuisible, ville: formulaire.ville, message: formulaire.message, urgence: formulaire.urgence ? "OUI - Urgent" : "Non" })
      })
      if (res.ok) {
        setStatut("succes")
        setFormulaire({ nom: "", telephone: "", email: "", nuisible: "", ville: "", message: "", urgence: false })
      } else { setStatut("erreur") }
    } catch(err) { setStatut("erreur") }
  }

  const zones = [
    { ville: "Cotonou", delai: "2h", priorite: true },
    { ville: "Abomey-Calavi", delai: "2h", priorite: true },
    { ville: "Seme-Kpodji", delai: "2h", priorite: true },
    { ville: "Porto-Novo", delai: "3h", priorite: false },
    { ville: "Ouidah", delai: "3h", priorite: false },
    { ville: "Abomey", delai: "4h", priorite: false },
    { ville: "Parakou", delai: "24h", priorite: false },
    { ville: "Toute autre ville", delai: "Sur demande", priorite: false },
  ]

  const inp = { width: "100%", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "13px", padding: "11px 12px", borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box" }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" }}>

      <div style={{ background: "linear-gradient(135deg, #050e07, #0a2e1a)", borderRadius: "16px", padding: "36px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "600", color: "#fff", marginBottom: "6px" }}>Envoyez-nous un message</h2>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "28px" }}>Decrivez votre situation et nous vous recontactons dans les 2h.</p>

        {statut === "succes" && (
          <div style={{ backgroundColor: "rgba(26,107,56,0.3)", border: "1px solid #1a6b38", borderRadius: "10px", padding: "20px", marginBottom: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#4ade80", marginBottom: "4px" }}>Message envoye !</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>Nous vous recontactons dans les 2h.</div>
          </div>
        )}

        {statut === "erreur" && (
          <div style={{ backgroundColor: "rgba(153,27,27,0.3)", border: "1px solid #991b1b", borderRadius: "10px", padding: "16px", marginBottom: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "13px", color: "#fca5a5" }}>Erreur. Contactez-nous directement par WhatsApp.</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "5px" }}>Votre nom *</label>
              <input type="text" name="nom" required value={formulaire.nom} onChange={handleChange} placeholder="Ex : Kofi Mensah" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "5px" }}>Telephone *</label>
              <input type="tel" name="telephone" required value={formulaire.telephone} onChange={handleChange} placeholder="+229 XX XX XX XX" style={inp} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "5px" }}>Email</label>
            <input type="email" name="email" value={formulaire.email} onChange={handleChange} placeholder="exemple@email.com" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "5px" }}>Type de nuisible *</label>
            <select name="nuisible" required value={formulaire.nuisible} onChange={handleChange} style={inp}>
              <option value="" style={{ backgroundColor: "#0a2e1a" }}>-- Choisir --</option>
              <option value="Cafards" style={{ backgroundColor: "#0a2e1a" }}>Cafards et Blattes</option>
              <option value="Rats" style={{ backgroundColor: "#0a2e1a" }}>Rats et Souris</option>
              <option value="Moustiques" style={{ backgroundColor: "#0a2e1a" }}>Moustiques</option>
              <option value="Termites" style={{ backgroundColor: "#0a2e1a" }}>Termites et Fourmis</option>
              <option value="Geckos" style={{ backgroundColor: "#0a2e1a" }}>Geckos et Reptiles</option>
              <option value="Serpents" style={{ backgroundColor: "#0a2e1a" }}>Serpents</option>
              <option value="Desinfection" style={{ backgroundColor: "#0a2e1a" }}>Desinfection generale</option>
              <option value="Autre" style={{ backgroundColor: "#0a2e1a" }}>Autre nuisible</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "5px" }}>Votre ville *</label>
            <input type="text" name="ville" required value={formulaire.ville} onChange={handleChange} placeholder="Ex : Cotonou, Porto-Novo..." style={inp} />
          </div>
          <div>
            <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "5px" }}>Votre message</label>
            <textarea name="message" rows={4} value={formulaire.message} onChange={handleChange} placeholder="Decrivez votre situation..." style={Object.assign({}, inp, { resize: "vertical" })} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input type="checkbox" name="urgence" checked={formulaire.urgence} onChange={handleChange} style={{ width: "16px", height: "16px", accentColor: "#d4a920" }} />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>Urgence — intervention souhaitee dans les 2h</span>
          </label>
          <button type="submit" disabled={statut === "envoi"} style={{ width: "100%", backgroundColor: statut === "envoi" ? "#9a7a14" : "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "15px", padding: "15px", borderRadius: "9px", border: "none", cursor: statut === "envoi" ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {statut === "envoi" ? "Envoi en cours..." : "Envoyer le message"}
          </button>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {["Reponse sous 2h", "Gratuit et sans engagement", "Disponible 24h/24"].map(function(g) {
              return (
                <div key={g} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#1a6b38", flexShrink: 0 }} />
                  {g}
                </div>
              )
            })}
          </div>
        </form>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ backgroundColor: "#fff", border: "1px solid #f0f0f0", borderRadius: "14px", padding: "28px" }}>
          <h3 style={{ fontSize: "17px", fontWeight: "600", color: "#111", marginBottom: "20px" }}>Contacts directs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <a href={"tel:" + TEL} style={{ display: "flex", alignItems: "center", gap: "14px", textDecoration: "none" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#f0f8f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>📞</div>
              <div><div style={{ fontSize: "10px", color: "#aaa", marginBottom: "2px" }}>Telephone</div><div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{TEL_AFFICHE}</div></div>
            </a>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "14px", textDecoration: "none" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#f0f8f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>💬</div>
              <div><div style={{ fontSize: "10px", color: "#aaa", marginBottom: "2px" }}>WhatsApp</div><div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>Ecrire sur WhatsApp</div></div>
            </a>
            <a href={"mailto:" + EMAIL} style={{ display: "flex", alignItems: "center", gap: "14px", textDecoration: "none" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#f0f8f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>✉️</div>
              <div><div style={{ fontSize: "10px", color: "#aaa", marginBottom: "2px" }}>Email</div><div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{EMAIL}</div></div>
            </a>
          </div>
        </div>

        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", backgroundColor: "#25d366", color: "#fff", fontWeight: "700", fontSize: "15px", padding: "18px", borderRadius: "12px", textDecoration: "none" }}>
          💬 Ecrire sur WhatsApp maintenant
        </a>

        <div style={{ backgroundColor: "#f8f8f8", borderRadius: "14px", padding: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111", marginBottom: "16px" }}>Zones d intervention</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {zones.map(function(z) {
              return (
                <div key={z.ville} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#fff", borderRadius: "8px", border: z.priorite ? "1px solid #1a6b38" : "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {z.priorite && <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1a6b38", flexShrink: 0 }} />}
                    <span style={{ fontSize: "13px", fontWeight: z.priorite ? "600" : "400", color: "#111" }}>{z.ville}</span>
                  </div>
                  <span style={{ fontSize: "11px", color: z.priorite ? "#1a6b38" : "#aaa", fontWeight: z.priorite ? "600" : "400" }}>En {z.delai}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
