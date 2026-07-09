"use client"
import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

function creerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

const SERVICES_DEFAUT = [
  { id: 1, ico: "🪳", titre: "Désinsectisation", slug: "desinsectisation-cotonou", accroche: "Cafards · Fourmis · Moustiques · Mouches", description: "Cafards, fourmis, moustiques, mouches, on traite chaque cas avec la bonne méthode : gel appât, pulvérisation ou fumigation. Résultat durable.", tag: "Devis gratuit", details: ["Diagnostic complet et gratuit", "Gel appât professionnel longue durée", "Pulvérisation résiduelle certifiée", "Fumigation pour les cas sévères", "Contrat de suivi mensuel disponible"] },
  { id: 2, ico: "🐀", titre: "Dératisation", slug: "deratisation-benin", accroche: "Rats · Souris · Rongeurs", description: "Rats, souris, rongeurs, on les élimine et on sécurise vos accès pour qu'ils ne reviennent pas. Suivi mensuel disponible.", tag: "Contrat mensuel disponible", details: ["Inspection complète des zones à risque", "Pièges professionnels certifiés", "Raticides homologués et sécurisés", "Sécurisation des points d'entrée", "Rapport d'intervention et suivi"] },
  { id: 3, ico: "🧴", titre: "Désinfection", slug: "desinfection-locaux", accroche: "Assainissement · Virucide · Bactéricide", description: "Vos locaux traités de fond en comble avec des produits virucides et bactéricides homologués OMS. Certificat officiel remis à l'issue.", tag: "Certificat officiel remis", details: ["Désinfection totale des surfaces", "Produits virucides certifiés OMS", "Conforme aux normes sanitaires", "Certificat d'hygiène officiel remis", "Traitement adapté aux ERP"] },
  { id: 4, ico: "🐜", titre: "Anti-termites", slug: "anti-termites-benin", accroche: "Protection bois et béton", description: "Les termites détruisent en silence. On les stoppe avec une barrière chimique par injection, protection longue durée, contrôle annuel inclus.", tag: "Protection longue durée", details: ["Diagnostic complet des structures", "Barrière chimique par injection", "Traitement du bois et fondations", "Protection longue durée", "Contrôle annuel inclus"] },
  { id: 5, ico: "🐍", titre: "Reptiles et Serpents", slug: "reptiles-serpents-benin", accroche: "Geckos · Serpents · Lézards", description: "Sécurisation complète contre les reptiles. Répulsifs professionnels longue durée, barrières physiques et intervention urgence disponible 24h/24.", tag: "Urgence, disponible 24h/24", details: ["Intervention d'urgence disponible 24h/24", "Répulsifs professionnels longue durée", "Sécurisation périmétrique complète", "Pose de barrières physiques", "Suivi post-intervention inclus"] },
  { id: 6, ico: "🦟", titre: "Anti-moustiques", slug: "anti-moustiques-cotonou", accroche: "Gîtes larvaires · Jardins · Extérieurs", description: "Traitement des zones de prolifération, gîtes larvaires et espaces extérieurs. Protection durable pour votre famille et vos employés.", tag: "Traitement extérieur inclus", details: ["Traitement des gîtes larvaires", "Pulvérisation des extérieurs", "Brumisation professionnelle", "Pose de diffuseurs longue durée", "Traitement préventif de saison"] },
  { id: 7, ico: "🛏️", titre: "Punaises de lit", slug: "punaises-de-lit-cotonou", accroche: "Hôtels · Appartements · Résidences", description: "Traitement complet et rigoureux. Traitement thermique à 60°C et traitement chimique certifié. Inspection intégrale du mobilier.", tag: "Traitement thermique 60°C", details: ["Inspection complète du mobilier", "Traitement thermique à 60 degrés", "Traitement chimique résiduel", "Protection des matelas incluse", "Contrôle de suivi inclus"] },
  { id: 8, ico: "📋", titre: "Contrat d'entretien", slug: "contrat-entretien-hygiene", accroche: "Mensuel · Trimestriel · Sur mesure", description: "Programme d'entretien régulier sur mesure. Visites planifiées, rapports détaillés, alerte préventive et tarif préférentiel.", tag: "À partir de 25 000 FCFA/mois", details: ["Fréquence mensuelle ou trimestrielle", "Rapport détaillé après chaque visite", "Alerte préventive SMS/WhatsApp", "Tarif préférentiel sous contrat", "Priorité en cas d'urgence"] },
]

export default function Services() {
  const [services, setServices] = useState(SERVICES_DEFAUT)

  useEffect(function() {
    const db = creerSupabase()
    async function charger() {
      const { data } = await db.from("services").select("*").order("id")
      if (data && data.length > 0) {
        setServices(data)
      }
    }
    charger()
  }, [])

  const secteurs = [
    "Hôtels et Resorts", "Restaurants et Traiteurs", "Entrepôts et Industrie",
    "Bureaux et Entreprises", "Écoles et Institutions", "Particuliers exigeants",
    "Établissements de santé", "Résidences haut de gamme",
  ]

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <style>{`
        .section-pad { padding: 80px 60px; }
        .hero-pad { padding: 80px 60px 72px; }
        .grid-2-mob { display: grid; grid-template-columns: 1fr 1fr; }
        .grid-3-mob { display: grid; grid-template-columns: repeat(3, 1fr); }
        .srv-row { display: grid; grid-template-columns: 1fr 2fr; gap: 60px; }
        .srv-card { transition: border-top-color 0.2s; }
        .srv-card:hover { border-top-color: #d4a920 !important; }
        @media (max-width: 768px) {
          .section-pad { padding: 48px 20px !important; }
          .hero-pad { padding: 48px 20px !important; }
          .grid-2-mob { grid-template-columns: 1fr !important; gap: 40px !important; }
          .grid-3-mob { grid-template-columns: 1fr !important; }
          .srv-row { grid-template-columns: 1fr !important; gap: 20px !important; }
          .secteurs-grid { grid-template-columns: 1fr 1fr !important; }
          .cta-btns { flex-direction: column !important; }
        }
      `}</style>

      {/* EN-TÊTE */}
      <section className="hero-pad" style={{ backgroundColor: "#0a2e1a", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.04)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>NOS INTERVENTIONS</div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.15", letterSpacing: "-0.02em", marginBottom: "20px", maxWidth: "600px" }}>
            Une expertise complète
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>pour chaque nuisible.</strong>
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: "1.85", maxWidth: "560px", fontWeight: "300" }}>
            Huit interventions spécialisées, réalisées par des techniciens certifiés avec des produits homologués par l'OMS.
          </p>
        </div>
      </section>

      {/* FLAGSHIP — CONTRAT DE CONFORMITÉ */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "clamp(44px, 6vw, 64px) clamp(20px, 5vw, 60px)", borderBottom: "2px solid #d4a920" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: "40px", alignItems: "center" }} className="grid-2-mob">
          <div>
            <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "14px" }}>LE PLUS DEMANDÉ PAR LES PROFESSIONNELS</div>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: "300", color: "#fff", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "14px" }}>
              Contrat de conformité 3D <strong style={{ fontWeight: "700", color: "#d4a920" }}>toute l'année.</strong>
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: "1.8", maxWidth: "500px" }}>
              Passages réguliers 3D + certificat de conformité mensuel pour hôtels, restaurants, agro-industries et cliniques. Tout commence par un audit gratuit sur site.
            </p>
          </div>
          <a href="/contrat-conformite" style={{ display: "block", textAlign: "center", backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "16px", borderRadius: "8px", textDecoration: "none" }}>
            Voir l'offre &amp; réserver un audit
          </a>
        </div>
      </section>

      {/* GRILLE SERVICES */}
      <section className="section-pad" style={{ backgroundColor: "#f7f7f5" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="grid-3-mob" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
            {services.filter(function(s) { return s.slug !== "contrat-entretien-hygiene" }).map(function(s, i) {
              return (
                <a key={s.id || i} href={`/services/${s.slug || ""}`} style={{ textDecoration: "none" }}>
                  <div className="srv-card" style={{ backgroundColor: "#ffffff", padding: "36px 30px", minHeight: "240px", display: "flex", flexDirection: "column", borderTop: "3px solid transparent" }}>
                    <div style={{ fontSize: "28px", marginBottom: "16px" }}>{s.ico}</div>
                    {s.accroche && <div style={{ fontSize: "10px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "8px" }}>{s.accroche.toUpperCase()}</div>}
                    <h2 style={{ fontSize: "19px", fontWeight: "700", color: "#0a0a0a", marginBottom: "10px" }}>{s.titre}</h2>
                    <p style={{ fontSize: "13px", color: "#777", lineHeight: "1.7", margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</p>
                    <div style={{ flex: 1 }} />
                    <div style={{ marginTop: "18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10px", color: "#d4a920", fontWeight: "700", backgroundColor: "rgba(212,169,32,0.1)", padding: "5px 10px", borderRadius: "4px" }}>{s.tag}</span>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#0a2e1a", whiteSpace: "nowrap" }}>En savoir plus →</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* SECTEURS */}
      <section className="section-pad" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="grid-2-mob" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>SECTEURS D'ACTIVITÉ</div>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "24px" }}>
                Nous intervenons dans
                <br />
                <strong style={{ fontWeight: "700" }}>tous les secteurs.</strong>
              </h2>
              <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.85", marginBottom: "32px" }}>
                De l'hôtel cinq étoiles à l'entrepôt industriel, Phyto Bénin adapte ses protocoles à chaque environnement avec la même exigence de résultat.
              </p>
              <a href="/contact" style={{ display: "inline-block", backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "13px", padding: "13px 28px", borderRadius: "6px", textDecoration: "none" }}>
                Nous contacter
              </a>
            </div>
            <div className="secteurs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
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
      <section className="section-pad" style={{ backgroundColor: "#0a2e1a", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>INTERVENTION RAPIDE</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Besoin d'une intervention urgente ?
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>Contactez-nous dès maintenant.</strong>
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: "1.85", marginBottom: "40px" }}>
            Diagnostic et devis gratuit, réponse rapide.
          </p>
          <div className="cta-btns" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "15px 32px", borderRadius: "6px", textDecoration: "none" }}>
              Demander un devis gratuit
            </a>
          </div>
        </div>
      </section>

    </main>
  )
}
