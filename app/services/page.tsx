export const metadata = {
  title: "Nos interventions — Désinsectisation, Dératisation, Désinfection | PHYSTO Bénin",
  description: "Désinsectisation, dératisation, désinfection, anti-termites et tous traitements phytosanitaires au Bénin. Techniciens certifiés, produits homologués, résultats garantis.",
}

export default function Services() {

  const services = [
    {
      numero: "01",
      titre: "Désinsectisation",
      accroche: "Cafards · Fourmis · Moustiques · Mouches",
      desc: "Élimination complète et durable de tous les insectes nuisibles. Nous utilisons des traitements par gel appât, pulvérisation résiduelle et fumigation professionnelle, adaptés à chaque type de local et d'infestation.",
      details: [
        "Diagnostic complet et gratuit avant intervention",
        "Gel appât professionnel longue durée",
        "Pulvérisation résiduelle certifiée",
        "Fumigation pour les cas sévères",
        "Traitement préventif et contrat de suivi mensuel",
      ],
      tag: "Devis gratuit sous 2h",
    },
    {
      numero: "02",
      titre: "Dératisation",
      accroche: "Rats · Souris · Rongeurs",
      desc: "Intervention sécurisée et efficace contre les rongeurs. Nos techniciens posent des pièges homologués, utilisent des raticides certifiés et sécurisent vos accès pour éviter toute réinfestation.",
      details: [
        "Inspection complète des zones à risque",
        "Pièges professionnels certifiés",
        "Raticides homologués et sécurisés",
        "Sécurisation des points d'entrée",
        "Rapport d'intervention détaillé et suivi mensuel",
      ],
      tag: "Contrat mensuel disponible",
    },
    {
      numero: "03",
      titre: "Désinfection",
      accroche: "Assainissement · Virucide · Bactéricide",
      desc: "Assainissement complet de vos locaux avec des produits virucides, bactéricides et fongicides de grade professionnel. Certifié pour les restaurants, hôtels, établissements de santé et espaces collectifs.",
      details: [
        "Désinfection totale des surfaces et zones sensibles",
        "Produits virucides et bactéricides certifiés OMS",
        "Conforme aux normes sanitaires béninoises",
        "Certificat d'hygiène officiel remis",
        "Traitement adapté aux établissements recevant du public",
      ],
      tag: "Certificat officiel remis",
    },
    {
      numero: "04",
      titre: "Anti-termites",
      accroche: "Termites · Protection bois et béton",
      desc: "Protection durable de vos structures contre les termites souterrains et aériens. Barrière chimique en profondeur, traitement par injection et garantie longue durée avec contrôle annuel inclus.",
      details: [
        "Diagnostic complet des structures gratuit",
        "Barrière chimique par injection en profondeur",
        "Traitement du bois et des fondations",
        "Garantie longue durée sur l'intervention",
        "Contrôle annuel inclus dans le contrat",
      ],
      tag: "Garantie longue durée",
    },
    {
      numero: "05",
      titre: "Reptiles et Serpents",
      accroche: "Geckos · Serpents · Lézards",
      desc: "Sécurisation complète de vos espaces intérieurs et extérieurs contre les reptiles. Répulsifs professionnels longue durée, pose de barrières physiques et intervention d'urgence garantie en moins de 2h à Cotonou.",
      details: [
        "Intervention d'urgence en moins de 2h à Cotonou",
        "Répulsifs professionnels longue durée",
        "Sécurisation périmétrique complète",
        "Pose de barrières physiques anti-intrusion",
        "Suivi post-intervention inclus",
      ],
      tag: "Urgence — 2h à Cotonou",
    },
    {
      numero: "06",
      titre: "Anti-moustiques",
      accroche: "Moustiques · Gîtes larvaires · Extérieurs",
      desc: "Traitement complet des zones de prolifération — gîtes larvaires, jardins, espaces extérieurs, bassins. Protection durable pour votre famille, vos employés et vos clients.",
      details: [
        "Traitement des gîtes larvaires",
        "Pulvérisation des espaces extérieurs",
        "Brumisation professionnelle",
        "Pose de diffuseurs longue durée",
        "Traitement préventif en début de saison",
      ],
      tag: "Traitement extérieur inclus",
    },
    {
      numero: "07",
      titre: "Punaises de lit",
      accroche: "Hôtels · Appartements · Résidences",
      desc: "Élimination complète et garantie des punaises de lit par traitement thermique à 60°C et traitement chimique certifié. Inspection intégrale du mobilier, protection des matelas incluse.",
      details: [
        "Inspection complète du mobilier et literie",
        "Traitement thermique à 60 degrés",
        "Traitement chimique résiduel certifié",
        "Protection des matelas incluse",
        "Garantie sans punaises sur 3 mois",
      ],
      tag: "Résultat garanti",
    },
    {
      numero: "08",
      titre: "Contrat d'entretien",
      accroche: "Mensuel · Trimestriel · Sur mesure",
      desc: "Programme d'entretien régulier sur mesure pour maintenir un niveau d'hygiène irréprochable tout au long de l'année. Visites planifiées, rapports détaillés et alerte préventive inclus.",
      details: [
        "Fréquence mensuelle ou trimestrielle selon vos besoins",
        "Rapport détaillé remis après chaque visite",
        "Alerte préventive par SMS ou WhatsApp",
        "Tarif préférentiel pour les clients sous contrat",
        "Priorité absolue en cas d'urgence",
      ],
      tag: "À partir de 25 000 FCFA/mois",
    },
    {
      numero: "09",
      titre: "Autres nuisibles",
      accroche: "Guêpes · Frelons · Puces · Sur demande",
      desc: "Puces, guêpes, frelons, fourmis charpentières, cafards américains, blattes et tout autre nuisible sur demande spécifique. Traitement adapté à chaque situation, devis gratuit sous 2h.",
      details: [
        "Traitement sur devis personnalisé",
        "Intervention rapide selon disponibilité",
        "Produits adaptés à chaque type de nuisible",
        "Technicien spécialisé selon le cas",
        "Rapport complet fourni",
      ],
      tag: "Nous consulter",
      dashed: true,
    },
  ]

  const secteurs = [
    "Hôtels et Resorts",
    "Restaurants et Traiteurs",
    "Entrepôts et Industrie",
    "Bureaux et Entreprises",
    "Écoles et Institutions",
    "Particuliers exigeants",
    "Établissements de santé",
    "Résidences haut de gamme",
  ]

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <style>{`
        .srv-detail-card { transition: box-shadow 0.2s; }
        .srv-detail-card:hover { box-shadow: 0 8px 40px rgba(0,0,0,0.08); }
      `}</style>

      {/* EN-TÊTE PAGE */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "80px 60px 72px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.04)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>NOS INTERVENTIONS</div>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.15", letterSpacing: "-0.02em", marginBottom: "20px", maxWidth: "600px" }}>
            Une expertise complète
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>pour chaque nuisible.</strong>
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: "1.85", maxWidth: "560px", fontWeight: "300" }}>
            Neuf interventions spécialisées, réalisées par des techniciens certifiés
            avec des produits homologués par l'OMS. Résultats garantis par contrat écrit.
          </p>
        </div>
      </section>

      {/* LISTE SERVICES */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "80px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3px" }}>
          {services.map(function(s, i) {
            return (
              <div key={i} className="srv-detail-card" style={{ backgroundColor: "#ffffff", padding: "48px 48px", display: "grid", gridTemplateColumns: "1fr 2fr", gap: "60px", alignItems: "start", borderTop: i === 0 ? "3px solid #d4a920" : "3px solid transparent" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#cccccc", fontWeight: "700", letterSpacing: "0.15em", marginBottom: "16px" }}>{s.numero}</div>
                  <h2 style={{ fontSize: "26px", fontWeight: "700", color: "#0a0a0a", marginBottom: "10px", letterSpacing: "-0.01em" }}>{s.titre}</h2>
                  <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "20px" }}>{s.accroche.toUpperCase()}</div>
                  <div style={{ display: "inline-block", fontSize: "11px", color: "#d4a920", fontWeight: "700", backgroundColor: "rgba(212,169,32,0.1)", padding: "6px 14px", borderRadius: "4px", letterSpacing: "0.04em" }}>
                    {s.tag}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.85", marginBottom: "28px" }}>{s.desc}</p>
                  <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                    {s.details.map(function(d) {
                      return (
                        <li key={d} style={{ display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "13px", color: "#444" }}>
                          <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px", fontWeight: "700" }}>✓</span>
                          {d}
                        </li>
                      )
                    })}
                  </ul>
                  <a href="/contact" style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a", textDecoration: "none", borderBottom: "2px solid #d4a920", paddingBottom: "3px" }}>
                    Demander une intervention →
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* SECTEURS */}
      <section style={{ backgroundColor: "#ffffff", padding: "80px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>SECTEURS D'ACTIVITÉ</div>
              <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "24px" }}>
                Nous intervenons dans
                <br />
                <strong style={{ fontWeight: "700" }}>tous les secteurs.</strong>
              </h2>
              <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.85", marginBottom: "32px" }}>
                De l'hôtel cinq étoiles à l'entrepôt industriel, en passant par le cabinet médical
                et la résidence privée, PHYSTO Bénin adapte ses protocoles à chaque environnement
                avec la même exigence de résultat.
              </p>
              <a href="/contact" style={{ display: "inline-block", backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "13px", padding: "13px 28px", borderRadius: "6px", textDecoration: "none" }}>
                Nous contacter
              </a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
              {secteurs.map(function(s, i) {
                return (
                  <div key={i} style={{ backgroundColor: "#f7f7f5", padding: "20px 18px", fontSize: "13px", fontWeight: "500", color: "#444", borderLeft: "3px solid #0a2e1a" }}>
                    {s}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "80px 60px", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>INTERVENTION RAPIDE</div>
          <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Votre situation mérite
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>une réponse immédiate.</strong>
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: "1.85", marginBottom: "40px" }}>
            Décrivez-nous votre problème. Nous vous répondons sous 2h avec
            un diagnostic et un devis gratuit, sans engagement.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "15px 32px", borderRadius: "6px", textDecoration: "none" }}>
              Demander un devis gratuit
            </a>
            <a href="https://wa.me/2290153047950" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#25d366", color: "#ffffff", fontWeight: "700", fontSize: "14px", padding: "15px 32px", borderRadius: "6px", textDecoration: "none" }}>
              WhatsApp direct
            </a>
          </div>
        </div>
      </section>

    </main>
  )
}
