export default function NotFound() {
  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", backgroundColor: "#ffffff" }}>
      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>ERREUR 404</div>
        <div style={{ fontSize: "80px", fontWeight: "700", color: "#0a2e1a", lineHeight: "1", marginBottom: "8px" }}>404</div>
        <h1 style={{ fontSize: "28px", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.3", marginBottom: "16px" }}>Page introuvable</h1>
        <p style={{ fontSize: "15px", color: "#888", lineHeight: "1.8", marginBottom: "40px" }}>La page que vous cherchez n&apos;existe pas ou a été déplacée.</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "700", fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none" }}>Retour accueil</a>
          <a href="/contact" style={{ backgroundColor: "#f7f7f5", color: "#0a2e1a", fontWeight: "600", fontSize: "14px", padding: "14px 28px", borderRadius: "6px", textDecoration: "none", border: "1px solid #e0e0e0" }}>Nous contacter</a>
        </div>
        <div style={{ marginTop: "48px", fontSize: "12px", color: "#bbb" }}>PHYSTO Bénin · +229 01 53 04 79 50 · 24h/24</div>
      </div>
    </main>
  )
}