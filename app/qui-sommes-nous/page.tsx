export const metadata = {
  title: "Qui sommes-nous — PHYSTO Bénin | Agréé par l'État du Bénin",
  description: "PHYSTO Bénin, spécialiste en hygiène sanitaire et phytosanitaire agréé par l'État. Techniciens certifiés, 10 ans d'expertise, intervention dans tout le Bénin.",
}

export default function QuiSommesNous() {

  const valeurs = [
    { num: "01", titre: "Efficacité", desc: "Chaque intervention est préparée, planifiée et exécutée avec précision. Nous ne partons pas avant que le résultat soit là." },
    { num: "02", titre: "Fiabilité", desc: "Produits homologués, protocoles certifiés, techniciens formés en continu. Pas de compromis sur la qualité." },
    { num: "03", titre: "Réactivité", desc: "Disponibles 24h/24 et 7j/7. Délai d'intervention garanti en moins de 2h à Cotonou et ses environs." },
    { num: "04", titre: "Transparence", desc: "Devis clair, intervention expliquée, certificat remis. Vous savez exactement ce que vous payez et pourquoi." },
  ]

  const equipe = [
    { init: "YK", nom: "Yakoubou Kabir", role: "Directeur Général", desc: "Fondateur de Global Solutions Entreprise, fort de plus de 10 ans d'expérience en conseil, gestion d'entreprise et accompagnement de structures professionnelles au Bénin et en France." },
    { init: "AT", nom: "Amadou T.", role: "Responsable Technique", desc: "Technicien certifié en hygiène phytosanitaire, spécialisé dans les traitements anti-termites, désinsectisation et fumigation. Formé aux protocoles OMS." },
    { init: "MB", nom: "Marie B.", role: "Chargée de Clientèle", desc: "Responsable de la relation client, de l'établissement des devis et du suivi des contrats d'entretien. Première interlocutrice de nos clients professionnels." },
  ]

  const chiffres = [
    { valeur: "+50", label: "Clients protégés" },
    { valeur: "2h", label: "Délai d'urgence garanti" },
    { valeur: "100%", label: "Résultats probants" },
    { valeur: "24h/24", label: "Disponibilité" },
  ]

  const engagements = [
    "Techniciens formés et régulièrement certifiés",
    "Produits respectueux de la santé humaine et de l'environnement",
    "Transparence totale sur les traitements appliqués",
    "Retour gratuit si le résultat n'est pas au rendez-vous",
    "Rapport d'intervention remis après chaque prestation",
    "Respect absolu de la confidentialité de nos clients",
  ]

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* EN-TÊTE */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "80px 60px 72px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.04)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>QUI SOMMES-NOUS</div>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.15", letterSpacing: "-0.02em", marginBottom: "20px", maxWidth: "620px" }}>
            Une expertise reconnue
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>au service du Bénin.</strong>
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: "1.85", maxWidth: "560px", fontWeight: "300" }}>
            PHYSTO Bénin est la division hygiène sanitaire et phytosanitaire de Global Solutions
            Entreprise. Basés à Cotonou, nous intervenons dans tout le Bénin avec des techniciens
            certifiés et des produits homologués.
          </p>
        </div>
      </section>

      {/* MISSION */}
      <section style={{ backgroundColor: "#ffffff", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOTRE MISSION</div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "24px" }}>
              Offrir un environnement
              <br />
              <strong style={{ fontWeight: "700" }}>sain à chaque client.</strong>
            </h2>
            <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.9", marginBottom: "20px" }}>
              Notre mission est simple : offrir à chaque client, particulier ou professionnel,
              un environnement sain, sécurisé et durablement débarrassé de toute nuisance.
              Nous intervenons avec des produits certifiés, des méthodes éprouvées et un
              engagement total sur les résultats.
            </p>
            <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.9", marginBottom: "32px" }}>
              Notre promesse est absolue : si vous n'êtes pas entièrement satisfait du résultat,
              nous revenons gratuitement jusqu'à ce que ce soit parfait. Sans délai, sans discussion.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {engagements.map(function(e) {
                return (
                  <div key={e} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px", fontWeight: "700" }}>✓</span>
                    <span style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>{e}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", marginBottom: "3px" }}>
              {chiffres.map(function(c, i) {
                return (
                  <div key={i} style={{ backgroundColor: i === 0 ? "#0a2e1a" : "#f7f7f5", padding: "32px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: "32px", fontWeight: "700", color: i === 0 ? "#d4a920" : "#0a2e1a", marginBottom: "8px" }}>{c.valeur}</div>
                    <div style={{ fontSize: "11px", color: i === 0 ? "rgba(255,255,255,0.6)" : "#999", letterSpacing: "0.06em" }}>{c.label.toUpperCase()}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ backgroundColor: "#d4a920", padding: "28px 24px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a", marginBottom: "6px" }}>Notre garantie absolue</div>
              <div style={{ fontSize: "13px", color: "rgba(10,46,26,0.75)", lineHeight: "1.6" }}>
                Pas satisfait du résultat ? Nous revenons sans surcoût jusqu'à obtenir le résultat attendu.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALEURS */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOS VALEURS</div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Ce qui nous distingue
              <br />
              <strong style={{ fontWeight: "700" }}>depuis le premier jour.</strong>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "3px" }}>
            {valeurs.map(function(v, i) {
              return (
                <div key={i} style={{ backgroundColor: "#ffffff", padding: "40px 28px", borderTop: "3px solid #0a2e1a" }}>
                  <div style={{ fontSize: "11px", color: "#cccccc", fontWeight: "700", letterSpacing: "0.15em", marginBottom: "20px" }}>{v.num}</div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0a0a0a", marginBottom: "14px" }}>{v.titre}</h3>
                  <p style={{ fontSize: "13px", color: "#777", lineHeight: "1.75" }}>{v.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ÉQUIPE */}
      <section style={{ backgroundColor: "#ffffff", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOTRE ÉQUIPE</div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Des experts à
              <br />
              <strong style={{ fontWeight: "700" }}>votre service.</strong>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px" }}>
            {equipe.map(function(m, i) {
              return (
                <div key={i} style={{ backgroundColor: "#f7f7f5", padding: "40px 32px" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                    {m.init}
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0a0a0a", marginBottom: "6px" }}>{m.nom}</h3>
                  <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "16px" }}>{m.role.toUpperCase()}</div>
                  <p style={{ fontSize: "13px", color: "#666", lineHeight: "1.8" }}>{m.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "80px 60px", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>TRAVAILLONS ENSEMBLE</div>
          <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Prêt à confier votre
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>hygiène à des experts ?</strong>
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: "1.85", marginBottom: "40px" }}>
            Contactez-nous pour un diagnostic gratuit. Nous vous proposons la solution
            la plus adaptée à votre situation, sans engagement.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "15px 32px", borderRadius: "6px", textDecoration: "none" }}>
              Demander un diagnostic gratuit
            </a>
            <a href="/services" style={{ border: "1px solid rgba(255,255,255,0.25)", color: "#ffffff", fontWeight: "500", fontSize: "14px", padding: "15px 32px", borderRadius: "6px", textDecoration: "none" }}>
              Découvrir nos services →
            </a>
          </div>
        </div>
      </section>

    </main>
  )
}
