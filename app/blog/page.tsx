export const metadata = {
  title: "Blog Hygiene et Conseils | PHYSTO Benin",
  description: "Guides pratiques sur la desinsectisation, deratisation et hygiene sanitaire au Benin. Conseils experts de nos techniciens certifies.",
  keywords: "blog hygiene Benin, conseils desinsectisation, guide deratisation Cotonou, prevenir nuisibles Benin",
  openGraph: {
    title: "Blog et Conseils | PHYSTO Benin",
    description: "Guides pratiques et conseils d experts sur l hygiene sanitaire au Benin.",
    url: "https://physto-benin.bj/blog",
  },
}

export default function Blog() {
  const articles = [
    { id: 1, ico: "🪳", cat: "DESINSECTISATION", titre: "Comment eliminer durablement les cafards dans un restaurant ?", resume: "Les cafards sont le cauchemar de tout restaurateur. Voici les etapes professionnelles pour en venir a bout definitivement.", date: "15 Mars 2025", temps: "5 min", vedette: true },
    { id: 2, ico: "🐀", cat: "DERATISATION", titre: "5 signes que votre entrepot est infeste de rats", resume: "Reconnaitre une infestation tot permet d eviter des degats importants. Voici les signes qui ne trompent pas.", date: "8 Mars 2025", temps: "4 min", vedette: false },
    { id: 3, ico: "🐜", cat: "ANTI-TERMITES", titre: "Termites au Benin : comment proteger votre maison ?", resume: "Le Benin est particulierement touche par les termites. Decouvrez comment proteger vos structures durablement.", date: "1 Mars 2025", temps: "6 min", vedette: false },
    { id: 4, ico: "🧴", cat: "DESINFECTION", titre: "Pourquoi desinfecter apres un traitement anti-nuisibles ?", resume: "La desinfection post-traitement est une etape souvent negligee mais essentielle pour garantir un environnement sain.", date: "22 Fevrier 2025", temps: "3 min", vedette: false },
    { id: 5, ico: "🦎", cat: "REPTILES", titre: "Geckos dans votre maison : danger ou simple inconfort ?", resume: "Les geckos sont tres presents au Benin. Sont-ils dangereux ? Comment les eloigner durablement ?", date: "14 Fevrier 2025", temps: "4 min", vedette: false },
    { id: 6, ico: "🏨", cat: "HYGIENE PRO", titre: "Hygiene en hotel : les obligations legales au Benin", resume: "Quelles sont les obligations des hoteliers en matiere d hygiene sanitaire ? Normes, inspections, certifications.", date: "5 Fevrier 2025", temps: "7 min", vedette: false },
  ]

  const categories = ["Tous les articles", "Desinsectisation", "Deratisation", "Anti-termites", "Desinfection", "Reptiles", "Hygiene Pro"]
  const vedette = articles.find(function(a) { return a.vedette })
  const autres = articles.filter(function(a) { return !a.vedette })

  return (
    <main style={{ padding: "48px 40px" }}>

      <div style={{ marginBottom: "48px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "8px" }}>BLOG ET CONSEILS</div>
        <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#111", marginBottom: "12px" }}>Nos conseils d experts</h1>
        <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.7", maxWidth: "500px" }}>
          Guides pratiques, astuces de prevention et actualites sur l hygiene sanitaire au Benin.
        </p>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "40px" }}>
        {categories.map(function(c, i) {
          return (
            <button key={c} style={{ fontSize: "11px", fontWeight: "500", padding: "7px 16px", borderRadius: "20px", border: "none", cursor: "pointer", backgroundColor: i === 0 ? "#0a2e1a" : "#f0f0f0", color: i === 0 ? "#d4a920" : "#555", fontFamily: "inherit" }}>
              {c}
            </button>
          )
        })}
      </div>

      {vedette && (
        <div style={{ background: "linear-gradient(135deg, #050e07, #0a2e1a)", borderRadius: "16px", padding: "40px", marginBottom: "32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "10px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.08em" }}>ARTICLE VEDETTE</span>
            <h2 style={{ fontSize: "22px", fontWeight: "600", color: "#fff", margin: "12px 0 16px", lineHeight: "1.4" }}>{vedette.titre}</h2>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: "1.7", marginBottom: "24px" }}>{vedette.resume}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <a href="#" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "600", fontSize: "13px", padding: "10px 22px", borderRadius: "8px", textDecoration: "none" }}>Lire l article</a>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{vedette.date} — {vedette.temps} de lecture</span>
            </div>
          </div>
          <div style={{ fontSize: "80px", textAlign: "center", opacity: 0.8 }}>{vedette.ico}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        {autres.map(function(a) {
          return (
            <div key={a.id} style={{ backgroundColor: "#fff", border: "1px solid #f0f0f0", borderRadius: "14px", overflow: "hidden", cursor: "pointer" }}>
              <div style={{ height: "100px", background: "linear-gradient(135deg, #0a2e1a, #1a6b38)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>{a.ico}</div>
              <div style={{ padding: "20px" }}>
                <div style={{ fontSize: "9px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.06em", marginBottom: "8px" }}>{a.cat}</div>
                <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#111", marginBottom: "10px", lineHeight: "1.4" }}>{a.titre}</h3>
                <p style={{ fontSize: "11px", color: "#888", lineHeight: "1.6", marginBottom: "14px" }}>{a.resume}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "#aaa" }}>{a.date}</span>
                  <span style={{ fontSize: "10px", color: "#1a6b38", fontWeight: "600" }}>{a.temps} de lecture</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ backgroundColor: "#f8f8f8", borderRadius: "16px", padding: "40px", marginTop: "48px", textAlign: "center" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#111", marginBottom: "8px" }}>Recevez nos conseils par email</h3>
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>Un article de conseil chaque semaine, directement dans votre boite mail.</p>
        <div style={{ display: "flex", gap: "10px", maxWidth: "400px", margin: "0 auto" }}>
          <input type="email" placeholder="votre@email.com" style={{ flex: 1, padding: "11px 14px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "13px", fontFamily: "inherit" }} />
          <button style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "600", fontSize: "13px", padding: "11px 20px", borderRadius: "8px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            Je m abonne
          </button>
        </div>
      </div>

    </main>
  )
}
