export const metadata = {
  title: "Qui Sommes-Nous - PHYSTO Benin | Agrees Etat Benin",
  description: "PHYSTO Benin, specialiste hygiene phytosanitaire agree par l Etat. Techniciens certifies, 10 ans experience, intervention dans tout le Benin.",
  keywords: "PHYSTO Benin entreprise, hygiene sanitaire agree Benin, Global Solutions Entreprise Cotonou",
  openGraph: {
    title: "Qui Sommes-Nous | PHYSTO Benin",
    description: "Specialiste hygiene phytosanitaire agree par l Etat du Benin.",
    url: "https://physto-benin.bj/qui-sommes-nous",
  },
}

export default function QuiSommesNous() {
  const valeurs = [
    { id: 1, ico: "🎯", titre: "Efficacite", desc: "Chaque intervention est planifiee et executee avec precision pour un resultat optimal des la premiere fois." },
    { id: 2, ico: "🔒", titre: "Fiabilite", desc: "Nos techniciens certifies utilisent uniquement des produits homologues et des methodes eprouvees." },
    { id: 3, ico: "⚡", titre: "Reactivite", desc: "Disponibles 24h/24 et 7j/7, nous intervenons en urgence en moins de 2h a Cotonou." },
    { id: 4, ico: "🤝", titre: "Transparence", desc: "Devis clair, intervention expliquee, certificat fourni apres chaque traitement. Aucune surprise." },
  ]

  const equipe = [
    { id: 1, init: "YK", nom: "Yakoubou Kabir", role: "Directeur General", desc: "Fondateur de GSE, plus de 10 ans experience en conseil et gestion d entreprise au Benin et en France." },
    { id: 2, init: "AT", nom: "Amadou T.", role: "Responsable Technique", desc: "Technicien certifie en hygiene phytosanitaire, specialiste des traitements termites et desinsectisation." },
    { id: 3, init: "MB", nom: "Marie B.", role: "Chargee de clientele", desc: "En charge de la relation client, des devis et du suivi des contrats d entretien." },
  ]

  const stats = [
    { n: "+50", l: "Clients proteges" },
    { n: "2h", l: "Delai urgence garanti" },
    { n: "100%", l: "Resultats probants" },
    { n: "24h/24", l: "Disponibilite" },
  ]

  return (
    <main style={{ padding: "48px 40px" }}>

      <div style={{ marginBottom: "48px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "8px" }}>QUI SOMMES-NOUS</div>
        <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#111", marginBottom: "12px" }}>Une expertise reconnue au Benin</h1>
        <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.7", maxWidth: "560px" }}>
          PHYSTO Benin est la division hygiene sanitaire et phytosanitaire de Global Solutions Entreprise.
          Bases a Cotonou, nous intervenons dans tout le Benin avec des techniciens certifies.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center", marginBottom: "64px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111", marginBottom: "16px" }}>Notre mission</h2>
          <p style={{ fontSize: "13px", color: "#666", lineHeight: "1.8", marginBottom: "16px" }}>
            Offrir a chaque client, particulier ou professionnel, un environnement sain, securise et sans nuisibles.
            Nous intervenons avec des produits certifies, des methodes eprouvees et un engagement total sur les resultats.
          </p>
          <p style={{ fontSize: "13px", color: "#666", lineHeight: "1.8", marginBottom: "24px" }}>
            Notre engagement est simple : si vous n etes pas satisfait du resultat, nous repassons gratuitement
            jusqu a obtenir le resultat attendu. Aucun compromis sur la qualite.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {["Techniciens formes et certifies", "Produits respectueux de la sante et de l environnement", "Transparence totale sur les traitements utilises", "Intervention garantie ou nous repassons gratuitement"].map(function(v) {
              return (
                <div key={v} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#d4a920", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "#444" }}>{v}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          {stats.map(function(s, i) {
            return (
              <div key={i} style={{ backgroundColor: "#0a2e1a", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
                <div style={{ fontSize: "26px", fontWeight: "700", color: "#d4a920", marginBottom: "6px" }}>{s.n}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{s.l}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: "64px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "8px" }}>NOS VALEURS</div>
        <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111", marginBottom: "32px" }}>Ce qui nous distingue</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {valeurs.map(function(v) {
            return (
              <div key={v.id} style={{ backgroundColor: "#f8f8f8", borderRadius: "14px", padding: "24px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "14px" }}>{v.ico}</div>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111", marginBottom: "8px" }}>{v.titre}</h3>
                <p style={{ fontSize: "11px", color: "#888", lineHeight: "1.6" }}>{v.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: "64px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "8px" }}>NOTRE EQUIPE</div>
        <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111", marginBottom: "32px" }}>Des experts a votre service</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {equipe.map(function(e) {
            return (
              <div key={e.id} style={{ backgroundColor: "#fff", border: "1px solid #f0f0f0", borderRadius: "14px", padding: "28px", textAlign: "center" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  {e.init}
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111", marginBottom: "4px" }}>{e.nom}</h3>
                <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "600", marginBottom: "12px" }}>{e.role}</div>
                <p style={{ fontSize: "11px", color: "#888", lineHeight: "1.6" }}>{e.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: "linear-gradient(135deg, #050e07, #0a2e1a)", borderRadius: "16px", padding: "48px 40px", textAlign: "center" }}>
        <h3 style={{ fontSize: "22px", fontWeight: "600", color: "#fff", marginBottom: "12px" }}>Pret a travailler avec nous ?</h3>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "28px" }}>
          Contactez-nous pour un diagnostic gratuit et une intervention rapide.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "600", fontSize: "13px", padding: "13px 28px", borderRadius: "8px", textDecoration: "none" }}>Nous contacter</a>
          <a href="/services" style={{ border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "13px", padding: "13px 28px", borderRadius: "8px", textDecoration: "none" }}>Voir nos services</a>
        </div>
      </div>

    </main>
  )
}
