export const metadata = {
  title: "Nos Traitements - Cafards, Rats, Termites | PHYSTO Benin",
  description: "Desinsectisation cafards, deratisation rats, desinfection, anti-termites, reptiles. Traitements certifies pour hotels, restaurants et entreprises au Benin.",
  keywords: "desinsectisation cafards Benin, deratisation rats Cotonou, anti-termites Benin, desinfection restaurant Benin",
  openGraph: {
    title: "Nos Traitements | PHYSTO Benin",
    description: "Desinsectisation, deratisation, desinfection et tous traitements phytosanitaires au Benin.",
    url: "https://physto-benin.bj/services",
  },
}

export default function Services() {
  const services = [
    { id: 1, ico: "🪳", titre: "Desinsectisation", desc: "Elimination complete des cafards, fourmis, moustiques, mouches et araignees. Traitement par gel appat, pulverisation et fumigation professionnelle.", tag: "Devis gratuit 24h", details: ["Gel appat professionnel", "Pulverisation residuelle", "Fumigation complete", "Traitement preventif", "Contrat de suivi mensuel"] },
    { id: 2, ico: "🐀", titre: "Deratisation", desc: "Elimination securisee des rats et souris. Pose de pieges professionnels, raticides homologues, securisation des entrees et suivi mensuel.", tag: "Contrat mensuel disponible", details: ["Pieges professionnels certifies", "Raticides homologues", "Securisation des acces", "Rapport d intervention", "Suivi mensuel inclus"] },
    { id: 3, ico: "🧴", titre: "Desinfection", desc: "Assainissement complet de vos locaux. Produits virucides, bactericides et fongicides. Certifie pour restaurants, hotels et etablissements de sante.", tag: "Certificat officiel fourni", details: ["Desinfection totale des surfaces", "Produits virucides certifies", "Traitement des zones sensibles", "Certificat d hygiene fourni", "Conforme normes internationales"] },
    { id: 4, ico: "🐜", titre: "Anti-termites", desc: "Protection de vos structures en bois et beton contre les termites. Barriere chimique en profondeur et garantie longue duree.", tag: "Garantie longue duree", details: ["Diagnostic complet gratuit", "Barriere chimique injections", "Traitement bois en profondeur", "Garantie longue duree", "Controle annuel inclus"] },
    { id: 5, ico: "🐍", titre: "Reptiles et serpents", desc: "Securisation complete de vos espaces contre geckos, serpents et lezards. Repulsifs professionnels et intervention urgence en 2h.", tag: "Urgence 2h", details: ["Intervention urgence en 2h", "Repulsifs pro longue duree", "Securisation perimetrique", "Pose de barrieres physiques", "Suivi post-intervention"] },
    { id: 6, ico: "🦟", titre: "Anti-moustiques", desc: "Traitement des zones de proliferation, gites larvaires, jardins et espaces exterieurs. Protection durable pour votre famille et vos employes.", tag: "Traitement exterieur inclus", details: ["Traitement gites larvaires", "Pulverisation exterieurs", "Brumisation professionnelle", "Pose de diffuseurs", "Traitement preventif saison"] },
    { id: 7, ico: "🛏️", titre: "Punaises de lit", desc: "Elimination complete et garantie des punaises de lit. Traitement thermique et chimique, inspection complete du mobilier.", tag: "Resultat garanti", details: ["Inspection complete mobilier", "Traitement thermique 60 degres", "Traitement chimique certifie", "Protection matelas incluse", "Garantie sans punaises"] },
    { id: 8, ico: "📋", titre: "Contrat entretien", desc: "Programme mensuel ou trimestriel sur mesure. Visites regulieres, rapports detailles, alerte preventive et tarif preferentiel.", tag: "A partir de 25 000 FCFA/mois", details: ["Visites planifiees regulieres", "Rapport detaille a chaque visite", "Alerte preventive par SMS", "Tarif preferentiel contrat", "Priorite intervention urgence"] },
    { id: 9, ico: "➕", titre: "Autres nuisibles", desc: "Guepes, frelons, fourmis charpentieres, cafards americains, blattes et tout autre nuisible sur demande specifique.", tag: "Contactez-nous", details: ["Traitement sur devis", "Intervention rapide", "Produits adaptes", "Technicien specialise", "Rapport complet fourni"], dashed: true },
  ]

  return (
    <main style={{ padding: "48px 40px" }}>

      <div style={{ marginBottom: "48px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "8px" }}>NOS TRAITEMENTS</div>
        <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#111", marginBottom: "12px" }}>Une solution pour chaque nuisible</h1>
        <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.7", maxWidth: "600px" }}>
          Tous nos traitements sont realises par des techniciens certifies, avec des produits homologues.
          Resultat garanti par contrat ou nous repassons gratuitement.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "48px" }}>
        {services.map(function(s) {
          return (
            <div key={s.id} style={{ position: "relative", borderRadius: "14px", padding: "28px 22px", border: s.dashed ? "2px dashed #1a6b38" : "1px solid #efefef", backgroundColor: s.dashed ? "#f9fdf9" : "#fff", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #0a2e1a, #1a6b38)" }} />
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>{s.ico}</div>
              <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111", marginBottom: "10px" }}>{s.titre}</h3>
              <p style={{ fontSize: "12px", color: "#777", lineHeight: "1.7", marginBottom: "16px" }}>{s.desc}</p>
              <ul style={{ listStyle: "none", padding: 0, marginBottom: "16px" }}>
                {s.details.map(function(d) {
                  return (
                    <li key={d} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#555", marginBottom: "5px" }}>
                      <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#1a6b38", flexShrink: 0 }} />
                      {d}
                    </li>
                  )
                })}
              </ul>
              <span style={{ fontSize: "10px", color: "#1a6b38", backgroundColor: "#e8f5ee", padding: "4px 10px", borderRadius: "5px" }}>{s.tag}</span>
            </div>
          )
        })}
      </div>

      <div style={{ backgroundColor: "#0a2e1a", borderRadius: "16px", padding: "40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "500", color: "#fff", marginBottom: "8px" }}>Votre nuisible n est pas dans la liste ?</h3>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>Contactez-nous, nous avons une solution pour chaque situation.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "600", fontSize: "13px", padding: "12px 24px", borderRadius: "8px", textDecoration: "none" }}>Nous contacter</a>
          <a href="https://wa.me/2290153047950" target="_blank" rel="noopener noreferrer" style={{ border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "13px", padding: "12px 24px", borderRadius: "8px", textDecoration: "none" }}>WhatsApp direct</a>
        </div>
      </div>

    </main>
  )
}
