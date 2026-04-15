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
  { id: 1, ico: "🪳", titre: "Désinsectisation", accroche: "Cafards · Fourmis · Moustiques · Mouches", desc: "Élimination complète et durable de tous les insectes nuisibles. Traitements par gel appât, pulvérisation résiduelle et fumigation professionnelle.", tag: "Devis gratuit sous 2h", details: ["Diagnostic complet et gratuit", "Gel appât professionnel longue durée", "Pulvérisation résiduelle certifiée", "Fumigation pour les cas sévères", "Contrat de suivi mensuel disponible"] },
  { id: 2, ico: "🐀", titre: "Dératisation", accroche: "Rats · Souris · Rongeurs", desc: "Intervention sécurisée et efficace contre les rongeurs. Pièges homologués, raticides certifiés, sécurisation des accès et suivi mensuel.", tag: "Contrat mensuel disponible", details: ["Inspection complète des zones à risque", "Pièges professionnels certifiés", "Raticides homologués et sécurisés", "Sécurisation des points d'entrée", "Rapport d'intervention et suivi"] },
  { id: 3, ico: "🧴", titre: "Désinfection", accroche: "Assainissement · Virucide · Bactéricide", desc: "Assainissement complet de vos locaux avec produits virucides, bactéricides et fongicides. Certifié restaurants, hôtels et établissements de santé.", tag: "Certificat officiel remis", details: ["Désinfection totale des surfaces", "Produits virucides certifiés OMS", "Conforme aux normes sanitaires", "Certificat d'hygiène officiel remis", "Traitement adapté aux ERP"] },
  { id: 4, ico: "🐜", titre: "Anti-termites", accroche: "Protection bois et béton", desc: "Protection durable de vos structures. Barrière chimique en profondeur, traitement par injection et garantie longue durée avec contrôle annuel.", tag: "Garantie longue durée", details: ["Diagnostic complet des structures", "Barrière chimique par injection", "Traitement du bois et fondations", "Garantie longue durée", "Contrôle annuel inclus"] },
  { id: 5, ico: "🐍", titre: "Reptiles et Serpents", accroche: "Geckos · Serpents · Lézards", desc: "Sécurisation complète contre les reptiles. Répulsifs professionnels longue durée, barrières physiques et intervention urgence en moins de 2h.", tag: "Urgence — 2h à Cotonou", details: ["Intervention d'urgence en moins de 2h", "Répulsifs professionnels longue durée", "Sécurisation périmétrique complète", "Pose de barrières physiques", "Suivi post-intervention inclus"] },
  { id: 6, ico: "🦟", titre: "Anti-moustiques", accroche: "Gîtes larvaires · Jardins · Extérieurs", desc: "Traitement des zones de prolifération, gîtes larvaires et espaces extérieurs. Protection durable pour votre famille et vos employés.", tag: "Traitement extérieur inclus", details: ["Traitement des gîtes larvaires", "Pulvérisation des extérieurs", "Brumisation professionnelle", "Pose de diffuseurs longue durée", "Traitement préventif de saison"] },
  { id: 7, ico: "🛏️", titre: "Punaises de lit", accroche: "Hôtels · Appartements · Résidences", desc: "Élimination complète et garantie. Traitement thermique à 60°C et traitement chimique certifié. Inspection intégrale du mobilier.", tag: "Résultat garanti", details: ["Inspection complète du mobilier", "Traitement thermique à 60 degrés", "Traitement chimique résiduel", "Protection des matelas incluse", "Garantie sans punaises 3 mois"] },
  { id: 8, ico: "📋", titre: "Contrat d'entretien", accroche: "Mensuel · Trimestriel · Sur mesure", desc: "Programme d'entretien régulier sur mesure. Visites planifiées, rapports détaillés, alerte préventive et tarif préférentiel.", tag: "À partir de 25 000 FCFA/mois", details: ["Fréquence mensuelle ou trimestrielle", "Rapport détaillé après chaque visite", "Alerte préventive SMS/WhatsApp", "Tarif préférentiel sous contrat", "Priorité en cas d'urgence"] },
]

export default function Services() {
  const [services, setServices] = useState(SERVICES_DEFAUT)

  useEffect(function() {
    const db = creerSupabase()
    async function charger() {
      const { data } = await db.from("services").select("*").order("id")
      if (data && data.length > 0) {
        setServices(data.map(function(s) {
          return {
            id: s.id,
            ico: s.ico || "🔧",
            titre: s.titre,
            accroche: s.accroche || "",
            desc: s.description,
            tag: s.tag || "",
            details: s.details || []
          }
        }))
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
            Huit interventions spécialisées, réalisées par des techniciens certifiés avec des produits homologués par l'OMS. Résultats garantis par contrat écrit.
          </p>
        </div>
      </section>

      {/* LISTE SERVICES */}
      <section className="section-pad" style={{ backgroundColor: "#f7f7f5" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3px" }}>
          {services.map(function(s, i) {
            return (
              <div key={s.id || i} style={{ backgroundColor: "#ffffff", padding: "48px", borderTop: i === 0 ? "3px solid #d4a920" : "3px solid transparent" }}>
                <div className="srv-row" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "60px", alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: "36px", marginBottom: "16px" }}>{s.ico}</div>
                    <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#0a0a0a", marginBottom: "10px" }}>{s.titre}</h2>
                    {s.accroche && <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "20px" }}>{s.accroche.toUpperCase()}</div>}
                    <div style={{ display: "inline-block", fontSize: "11px", color: "#d4a920", fontWeight: "700", backgroundColor: "rgba(212,169,32,0.1)", padding: "6px 14px", borderRadius: "4px" }}>
                      {s.tag}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.85", marginBottom: "24px" }}>{s.description}</p>
                    {s.details && s.details.length > 0 && (
                      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                        {s.details.map(function(d, j) {
                          return (
                            <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "13px", color: "#444" }}>
                              <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px", fontWeight: "700" }}>✓</span>
                              {d}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <a href="/contact" style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a", textDecoration: "none", borderBottom: "2px solid #d4a920", paddingBottom: "3px" }}>
                      Demander une intervention →
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
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
                De l'hôtel cinq étoiles à l'entrepôt industriel, PHYSTO Bénin adapte ses protocoles à chaque environnement avec la même exigence de résultat.
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
            Votre situation mérite
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>une réponse immédiate.</strong>
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: "1.85", marginBottom: "40px" }}>
            Décrivez-nous votre problème. Nous vous répondons sous 2h avec un diagnostic et un devis gratuit.
          </p>
          <div className="cta-btns" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
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
