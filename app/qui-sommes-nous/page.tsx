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

export default function QuiSommesNous() {
  const [equipe, setEquipe] = useState([
    { id: 1, init: "YK", nom: "Yakoubou Kabir", role: "Directeur Général", description: "Fondateur de Global Solutions Entreprise, fort de plus de 10 ans d'expérience en conseil et gestion d'entreprise au Bénin et en France." },
    { id: 2, init: "AT", nom: "Amadou T.", role: "Responsable Technique", description: "Technicien certifié en hygiène phytosanitaire, spécialisé dans les traitements anti-termites et désinsectisation." },
    { id: 3, init: "MB", nom: "Marie B.", role: "Chargée de Clientèle", description: "Responsable de la relation client, des devis et du suivi des contrats d'entretien." },
  ])

  const [mission, setMission] = useState("Notre mission est simple : offrir à chaque client, particulier ou professionnel, un environnement sain, sécurisé et durablement débarrassé de toute nuisance.")
  const [engagement, setEngagement] = useState("Notre engagement est de délivrer des interventions professionnelles, rigoureuses et durables, avec des produits homologués et des techniciens certifiés.")
  const [chiffres, setChiffres] = useState([
    { id: 1, valeur: "+50", label: "Clients protégés" },
    { id: 2, valeur: "2h", label: "Délai d'urgence garanti" },
    { id: 3, valeur: "100%", label: "Résultats probants" },
    { id: 4, valeur: "24h/24", label: "Disponibilité" },
  ])

  useEffect(function() {
    const db = creerSupabase()
    async function charger() {
      const [e, c, co] = await Promise.all([
        db.from("equipe").select("*").order("ordre"),
        db.from("chiffres").select("*").order("ordre"),
        db.from("contenus").select("*"),
      ])
      if (e.data && e.data.length > 0) setEquipe(e.data)
      if (c.data && c.data.length > 0) setChiffres(c.data)
      if (co.data) {
        const m1 = co.data.find(x => x.cle === "mission_texte_1")
        const m2 = co.data.find(x => x.cle === "mission_texte_2")
        if (m1) setMission(m1.valeur)
        if (m2) setEngagement(m2.valeur)
      }
    }
    charger()
  }, [])

  const valeurs = [
    { num: "01", titre: "Efficacité", desc: "Chaque intervention est préparée, planifiée et exécutée avec précision. Nous ne partons pas avant que le résultat soit là." },
    { num: "02", titre: "Fiabilité", desc: "Produits homologués, protocoles certifiés, techniciens formés en continu. Pas de compromis sur la qualité." },
    { num: "03", titre: "Réactivité", desc: "Disponibles 24h/24 et 7j/7. Délai d'intervention garanti en moins de 2h à Cotonou et ses environs." },
    { num: "04", titre: "Transparence", desc: "Devis clair, intervention expliquée, certificat remis. Vous savez exactement ce que vous payez et pourquoi." },
  ]

  const engagements = [
    "Techniciens formés et régulièrement certifiés",
    "Produits respectueux de la santé humaine et de l'environnement",
    "Transparence totale sur les traitements appliqués",
    "Rapport d'intervention remis après chaque prestation",
    "Respect absolu de la confidentialité de nos clients",
  ]

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <style>{`
        .grid-2-mob { display: grid; grid-template-columns: 1fr 1fr; }
        .grid-3-mob { display: grid; grid-template-columns: repeat(3, 1fr); }
        .grid-4-mob { display: grid; grid-template-columns: repeat(4, 1fr); }
        .section-pad { padding: 100px 60px; }
        .hero-pad { padding: 80px 60px 72px; }
        @media (max-width: 768px) {
          .grid-2-mob { grid-template-columns: 1fr !important; gap: 40px !important; }
          .grid-3-mob { grid-template-columns: 1fr !important; }
          .grid-4-mob { grid-template-columns: 1fr 1fr !important; }
          .section-pad { padding: 60px 20px !important; }
          .hero-pad { padding: 48px 20px !important; }
          .chiffres-grid { grid-template-columns: 1fr 1fr !important; }
          .cta-flex { flex-direction: column !important; text-align: center; }
          .cta-btns { justify-content: center !important; }
          .badge-float { display: none !important; }
        }
        @media (max-width: 480px) {
          .grid-4-mob { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* EN-TÊTE */}
      <section className="hero-pad" style={{ backgroundColor: "#0a2e1a", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.04)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>QUI SOMMES-NOUS</div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.15", letterSpacing: "-0.02em", marginBottom: "20px", maxWidth: "620px" }}>
            Une expertise reconnue
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>au service du Bénin.</strong>
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: "1.85", maxWidth: "560px", fontWeight: "300" }}>
            PHYSTO Bénin est la division hygiène sanitaire et phytosanitaire de Global Solutions Entreprise. Basés à Cotonou, nous intervenons dans tout le Bénin.
          </p>
        </div>
      </section>

      {/* MISSION */}
      <section className="section-pad" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="grid-2-mob" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOTRE MISSION</div>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "24px" }}>
                Offrir un environnement
                <br />
                <strong style={{ fontWeight: "700" }}>sain à chaque client.</strong>
              </h2>
              <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.9", marginBottom: "20px" }}>{mission}</p>
              <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.9", marginBottom: "32px" }}>{engagement}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {engagements.map(function(e) {
                  return (
                    <div key={e} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <span style={{ width: "10px", height: "1px", backgroundColor: "#d4a920", display: "inline-block", flexShrink: 0, marginTop: "9px" }} />
                      <span style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>{e}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="chiffres-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", marginBottom: "3px" }}>
                {chiffres.map(function(c, i) {
                  return (
                    <div key={c.id} style={{ backgroundColor: i === 0 ? "#0a2e1a" : "#f7f7f5", padding: "32px 24px", textAlign: "center" }}>
                      <div style={{ fontSize: "32px", fontWeight: "700", color: i === 0 ? "#d4a920" : "#0a2e1a", marginBottom: "8px" }}>{c.valeur}</div>
                      <div style={{ fontSize: "11px", color: i === 0 ? "rgba(255,255,255,0.6)" : "#999", letterSpacing: "0.06em" }}>{c.label.toUpperCase()}</div>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* VALEURS */}
      <section className="section-pad" style={{ backgroundColor: "#f7f7f5" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOS VALEURS</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Ce qui nous distingue
              <br />
              <strong style={{ fontWeight: "700" }}>depuis le premier jour.</strong>
            </h2>
          </div>
          <div className="grid-4-mob" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "3px" }}>
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
      <section className="section-pad" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOTRE ÉQUIPE</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Des experts à
              <br />
              <strong style={{ fontWeight: "700" }}>votre service.</strong>
            </h2>
          </div>
          <div className="grid-3-mob" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px" }}>
            {equipe.map(function(m, i) {
              return (
                <div key={m.id || i} style={{ backgroundColor: "#f7f7f5", padding: "40px 32px" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "0", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                    {m.init}
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0a0a0a", marginBottom: "6px" }}>{m.nom}</h3>
                  <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "16px" }}>{m.role.toUpperCase()}</div>
                  <p style={{ fontSize: "13px", color: "#666", lineHeight: "1.8" }}>{m.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad" style={{ backgroundColor: "#0a2e1a" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>TRAVAILLONS ENSEMBLE</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Prêt à confier votre
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>hygiène à des experts ?</strong>
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: "1.85", marginBottom: "40px" }}>
            Contactez-nous pour un diagnostic gratuit. Nous vous proposons la solution la plus adaptée à votre situation.
          </p>
          <div className="cta-btns" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
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
