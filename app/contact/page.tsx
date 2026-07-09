import ContactForm from "./ContactForm"

export const metadata = {
  title: "Zones d'intervention et Contact, Phyto Bénin | Cotonou",
  description: "Contactez Phyto Bénin pour une intervention rapide 24h/24. Disponibles à Cotonou, Porto-Novo, Calavi, Ouidah et dans tout le Bénin.",
}

export default function Contact() {
  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* EN-TÊTE */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "80px 60px 72px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.04)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>ZONES ET CONTACT</div>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.15", letterSpacing: "-0.02em", marginBottom: "20px", maxWidth: "580px" }}>
            Nous sommes disponibles
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>24h/24 et 7j/7.</strong>
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: "1.85", maxWidth: "520px", fontWeight: "300" }}>
            Décrivez votre situation. Nous vous répondons rapidement avec un diagnostic et une estimation offerts.
          </p>
        </div>
      </section>

      {/* BANDEAU CONFIANCE */}
      <section style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #eee", padding: "26px clamp(20px, 5vw, 60px)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px" }}>
          {[
            { t: "Diagnostic gratuit", s: "Visite de site sans engagement" },
            { t: "Réponse rapide", s: "On vous recontacte au plus vite" },
            { t: "Agréé par l'État", s: "APA/26-025/CNGP-BEN" },
            { t: "Remise −10%", s: "Sur votre première demande" },
          ].map(function(x) {
            return (
              <div key={x.t} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "11px", fontWeight: "900", flexShrink: 0, marginTop: "2px" }}>✓</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a" }}>{x.t}</div>
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "2px", lineHeight: "1.4" }}>{x.s}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FORMULAIRE + INFOS */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "80px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <ContactForm />
        </div>
      </section>

    </main>
  )
}
