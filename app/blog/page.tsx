export const metadata = {
  title: "Blog et Conseils — Hygiène sanitaire au Bénin | PHYSTO Bénin",
  description: "Guides pratiques sur la désinsectisation, dératisation et hygiène sanitaire au Bénin. Conseils d'experts rédigés par nos techniciens certifiés.",
}

export default function Blog() {

  const articles = [
    {
      id: 1,
      categorie: "DÉSINSECTISATION",
      titre: "Comment éliminer durablement les cafards dans un restaurant ?",
      resume: "Les blattes sont l'ennemi numéro un de tout restaurateur. Présence nocturne, résistance aux produits du commerce, multiplication rapide — voici les étapes professionnelles pour en venir à bout définitivement.",
      date: "15 Mars 2025",
      lecture: "6 min",
      vedette: true,
    },
    {
      id: 2,
      categorie: "DÉRATISATION",
      titre: "5 signes que votre entrepôt est infesté de rats",
      resume: "Reconnaître une infestation à ses prémices permet d'éviter des dégâts considérables — matériaux, stocks, câblage électrique. Voici les signaux d'alerte à ne pas ignorer.",
      date: "8 Mars 2025",
      lecture: "4 min",
      vedette: false,
    },
    {
      id: 3,
      categorie: "ANTI-TERMITES",
      titre: "Termites au Bénin : comment protéger votre maison durablement ?",
      resume: "Le Bénin est l'un des pays d'Afrique de l'Ouest les plus touchés par les termites souterrains. Découvrez les traitements professionnels qui protègent réellement vos structures.",
      date: "1 Mars 2025",
      lecture: "7 min",
      vedette: false,
    },
    {
      id: 4,
      categorie: "DÉSINFECTION",
      titre: "Pourquoi la désinfection post-traitement est indispensable ?",
      resume: "La désinfection après un traitement anti-nuisibles est une étape souvent négligée mais absolument essentielle pour garantir la salubrité de vos locaux et protéger vos équipes.",
      date: "22 Février 2025",
      lecture: "3 min",
      vedette: false,
    },
    {
      id: 5,
      categorie: "REPTILES",
      titre: "Geckos dans votre maison : vraiment dangereux ou simple inconfort ?",
      resume: "Les geckos sont omniprésents au Bénin. Si beaucoup les considèrent inoffensifs, leur présence dans les locaux professionnels peut poser de réels problèmes. Réponses d'experts.",
      date: "14 Février 2025",
      lecture: "4 min",
      vedette: false,
    },
    {
      id: 6,
      categorie: "HYGIÈNE PROFESSIONNELLE",
      titre: "Hôteliers au Bénin : vos obligations légales en matière d'hygiène",
      resume: "Normes sanitaires, inspections, certifications requises — tout ce que les hôteliers et restaurateurs béninois doivent savoir pour être en conformité et éviter les fermetures administratives.",
      date: "5 Février 2025",
      lecture: "8 min",
      vedette: false,
    },
  ]

  const categories = ["Tous les articles", "Désinsectisation", "Dératisation", "Anti-termites", "Désinfection", "Reptiles", "Hygiène professionnelle"]
  const vedette = articles.find(function(a) { return a.vedette })
  const autres = articles.filter(function(a) { return !a.vedette })

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* EN-TÊTE */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "80px 60px 72px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.04)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>BLOG ET CONSEILS</div>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.15", letterSpacing: "-0.02em", marginBottom: "20px", maxWidth: "600px" }}>
            L'expertise PHYSTO
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>à votre disposition.</strong>
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: "1.85", maxWidth: "520px", fontWeight: "300" }}>
            Guides pratiques, conseils de prévention et actualités sur l'hygiène
            sanitaire au Bénin. Rédigés par nos techniciens certifiés.
          </p>
        </div>
      </section>

      {/* FILTRES */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "32px 60px", borderBottom: "1px solid #ebebeb" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {categories.map(function(c, i) {
            return (
              <button key={c} style={{ fontSize: "11px", fontWeight: "700", padding: "8px 18px", borderRadius: "4px", border: "none", cursor: "pointer", backgroundColor: i === 0 ? "#0a2e1a" : "#ffffff", color: i === 0 ? "#d4a920" : "#777", letterSpacing: "0.04em", fontFamily: "inherit" }}>
                {c.toUpperCase()}
              </button>
            )
          })}
        </div>
      </section>

      {/* ARTICLE VEDETTE */}
      {vedette && (
        <section style={{ backgroundColor: "#f7f7f5", padding: "60px 60px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ backgroundColor: "#0a2e1a", padding: "64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                  <span style={{ fontSize: "10px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", backgroundColor: "rgba(212,169,32,0.1)", padding: "5px 12px", borderRadius: "4px" }}>
                    {vedette.categorie}
                  </span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>À LA UNE</span>
                </div>
                <h2 style={{ fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: "700", color: "#ffffff", lineHeight: "1.3", marginBottom: "20px", letterSpacing: "-0.01em" }}>
                  {vedette.titre}
                </h2>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: "1.85", marginBottom: "32px" }}>
                  {vedette.resume}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <a href="#" style={{ display: "inline-block", backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "13px", padding: "12px 24px", borderRadius: "6px", textDecoration: "none" }}>
                    Lire l'article →
                  </a>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{vedette.date} · {vedette.lecture} de lecture</span>
                </div>
              </div>
              <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "40px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "240px" }}>
                <div style={{ fontSize: "64px", color: "rgba(212,169,32,0.15)", fontFamily: "Georgia, serif", lineHeight: 1, marginBottom: "16px" }}>"</div>
                <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: "1.85", fontStyle: "italic" }}>
                  Un traitement efficace commence par un diagnostic rigoureux.
                  C'est ce qui fait la différence entre une solution temporaire et une élimination définitive.
                </p>
                <div style={{ marginTop: "20px", fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: "700", letterSpacing: "0.08em" }}>
                  — L'ÉQUIPE PHYSTO BÉNIN
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GRILLE ARTICLES */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "60px 60px 80px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px" }}>
            {autres.map(function(a) {
              return (
                <a key={a.id} href="#" style={{ textDecoration: "none", display: "block" }}>
                  <div style={{ backgroundColor: "#ffffff", padding: "36px 28px", height: "100%", display: "flex", flexDirection: "column", borderBottom: "3px solid transparent", transition: "border-color 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                      <span style={{ fontSize: "9px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", backgroundColor: "#e8f5ee", padding: "4px 10px", borderRadius: "3px" }}>
                        {a.categorie}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0a0a0a", marginBottom: "12px", lineHeight: "1.4", letterSpacing: "-0.01em", flex: 1 }}>
                      {a.titre}
                    </h3>
                    <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.75", marginBottom: "24px" }}>
                      {a.resume}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                      <span style={{ fontSize: "11px", color: "#bbb", letterSpacing: "0.04em" }}>{a.date}</span>
                      <span style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700" }}>{a.lecture} de lecture</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section style={{ backgroundColor: "#ffffff", padding: "80px 60px", borderTop: "1px solid #f0f0f0" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NEWSLETTER</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Recevez nos conseils
            <br />
            <strong style={{ fontWeight: "700" }}>chaque semaine.</strong>
          </h2>
          <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.85", marginBottom: "32px" }}>
            Un article de conseil par semaine, directement dans votre boîte mail.
            Désabonnement en un clic, à tout moment.
          </p>
          <div style={{ display: "flex", gap: "3px" }}>
            <input type="email" placeholder="votre@email.com" style={{ flex: 1, padding: "14px 18px", border: "1px solid #e0e0e0", fontSize: "14px", fontFamily: "inherit", borderRadius: "0", outline: "none" }} />
            <button style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "700", fontSize: "13px", padding: "14px 24px", border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              Je m'abonne
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "#ccc", marginTop: "12px" }}>
            Vos données ne sont jamais partagées. Désabonnement en un clic.
          </p>
        </div>
      </section>

    </main>
  )
}
