import ContactForm from "./ContactForm"

export const metadata = {
  title: "Contact et Zones - PHYSTO Benin | Cotonou",
  description: "Contactez PHYSTO Benin pour une intervention rapide. Disponibles 24h/24 a Cotonou, Porto-Novo, Calavi et dans tout le Benin.",
  keywords: "contact desinsectisation Cotonou, urgence nuisibles Benin, intervention rapide 24h Cotonou",
}

export default function Contact() {
  return (
    <main style={{ padding: "48px 40px" }}>
      <div style={{ marginBottom: "48px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "8px" }}>ZONES ET CONTACT</div>
        <h1 style={{ fontSize: "36px", fontWeight: "700", color: "#111", marginBottom: "12px" }}>Contactez-nous</h1>
        <p style={{ fontSize: "15px", color: "#888", lineHeight: "1.7", maxWidth: "500px" }}>
          Disponibles 24h/24 et 7j/7 pour toute urgence. Reponse garantie en moins de 2h.
        </p>
      </div>
      <ContactForm />
    </main>
  )
}
