"use client"
import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

// Options critiques : désactiver auth pour éviter le bug de verrou
function creerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    }
  )
}

export default function Accueil() {

  const [chiffres, setChiffres] = useState([
    { id: 1, valeur: "+50", label: "Clients protégés" },
    { id: 2, valeur: "2h", label: "Délai d'intervention" },
    { id: 3, valeur: "100%", label: "Résultats garantis" },
    { id: 4, valeur: "24h/24", label: "Disponibilité urgence" },
  ])

  const [temoignages, setTemoignages] = useState([
    { id: 1, init: "A.K", nom: "A. Koné", role: "Directeur de restauration — Cotonou", texte: "Une intervention le jour même, un résultat parfait. Notre restaurant a pu rouvrir dès le lendemain sans aucune réserve de l'inspection sanitaire." },
    { id: 2, init: "F.S", nom: "F. Sow", role: "Directrice d'établissement hôtelier — Porto-Novo", texte: "Contrat trimestriel depuis deux ans. Nos clients ne se plaignent plus de rien. L'équipe est ponctuelle, discrète et extrêmement professionnelle." },
    { id: 3, init: "M.B", nom: "M. Bello", role: "Responsable logistique — Bénin", texte: "Un problème de termites réglé en une seule intervention. Le certificat fourni nous a permis de rassurer nos partenaires." },
  ])

  const [agrement, setAgrement] = useState("N° AGRÉMENT-BÉNIN-XXXXX")
  const [charge, setCharge] = useState(false)

  useEffect(function() {
    // Créer le client DANS le useEffect pour éviter les conflits React
    const db = creerSupabase()

    async function charger() {
      try {
        const [resChiffres, resTemoignages, resParametres] = await Promise.all([
          db.from("chiffres").select("valeur, label, ordre, id").order("ordre"),
          db.from("temoignages").select("id, init, nom, role, texte").order("id"),
          db.from("parametres").select("cle, valeur"),
        ])

        if (resChiffres.data && resChiffres.data.length > 0) {
          setChiffres(resChiffres.data)
        }
        if (resTemoignages.data && resTemoignages.data.length > 0) {
          setTemoignages(resTemoignages.data)
        }
        if (resParametres.data) {
          const agr = resParametres.data.find(function(x) { return x.cle === "agrement" })
          if (agr) setAgrement(agr.valeur)
        }
        setCharge(true)
      } catch(err) {
        console.error("Erreur Supabase:", err)
        setCharge(true)
      }
    }

    charger()
  }, [])

  const services = [
    { numero: "01", titre: "Désinsectisation", accroche: "Cafards, fourmis, moustiques, mouches", desc: "Élimination complète et durable par gel appât, pulvérisation résiduelle et fumigation professionnelle. Traitement certifié, résultat garanti par contrat." },
    { numero: "02", titre: "Dératisation", accroche: "Rats, souris, rongeurs", desc: "Intervention sécurisée avec pièges homologués et raticides certifiés. Sécurisation de vos accès et suivi mensuel inclus." },
    { numero: "03", titre: "Désinfection", accroche: "Assainissement complet de vos locaux", desc: "Traitement virucide, bactéricide et fongicide. Certifié pour les restaurants, hôtels et établissements de santé. Certificat officiel remis." },
    { numero: "04", titre: "Anti-termites", accroche: "Protection des structures bois et béton", desc: "Barrière chimique en profondeur, traitement par injection et garantie longue durée. Diagnostic gratuit inclus." },
    { numero: "05", titre: "Reptiles et Serpents", accroche: "Geckos, serpents, lézards", desc: "Sécurisation périmétrique complète, répulsifs professionnels longue durée. Intervention d'urgence en moins de 2h à Cotonou." },
    { numero: "06", titre: "Autres traitements", accroche: "Tout nuisible sur demande", desc: "Punaises de lit, puces, guêpes, frelons, chenilles processionnaires. Traitement adapté à chaque situation, devis gratuit sous 2h." },
  ]

  const etapes = [
    { num: "01", titre: "Vous nous contactez", desc: "Par WhatsApp, téléphone ou formulaire. Disponibles 24h/24 et 7j/7, y compris les jours fériés." },
    { num: "02", titre: "Diagnostic gratuit", desc: "Un technicien certifié se déplace chez vous pour évaluer la situation et proposer la solution la plus adaptée." },
    { num: "03", titre: "Intervention professionnelle", desc: "Traitement réalisé avec des produits homologués et des équipements de niveau professionnel. Discret et efficace." },
    { num: "04", titre: "Certificat et suivi", desc: "Un certificat officiel vous est remis. Résultat garanti par contrat — nous revenons gratuitement si nécessaire." },
  ]

  const garanties = [
    { titre: "Agréé par l'État du Bénin", desc: "Entreprise officiellement référencée et agréée par les autorités sanitaires du Bénin.", detail: agrement, accent: true },
    { titre: "Produits homologués OMS", desc: "Tous nos produits respectent les normes de l'Organisation Mondiale de la Santé.", accent: false },
    { titre: "Résultats probants garantis", desc: "Pas satisfait du résultat ? Nous revenons sans surcoût jusqu'à obtenir le résultat attendu.", accent: false },
    { titre: "Intervention en 2h", desc: "Disponibles 24h/24 et 7j/7. Délai garanti en moins de 2h sur Cotonou.", accent: false },
    { titre: "Certificat officiel remis", desc: "Un document officiel vous est remis après chaque intervention.", accent: false },
    { titre: "Techniciens certifiés", desc: "Notre équipe est formée et certifiée en hygiène phytosanitaire.", accent: false },
  ]

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <style>{`
        .srv-card { transition: border-top-color 0.2s; border-top: 3px solid transparent; }
        .srv-card:hover { border-top-color: #d4a920 !important; }
      `}</style>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "#050e07" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/images/hero-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.45 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #020904 0%, rgba(2,9,4,0.75) 45%, rgba(2,9,4,0.2) 100%)" }} />
        <div className="hero-padding" style={{ position: "relative", zIndex: 2, padding: "0 60px 80px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(212,169,32,0.12)", border: "1px solid rgba(212,169,32,0.35)", color: "#d4a920", fontSize: "11px", fontWeight: "600", padding: "6px 16px", borderRadius: "20px", letterSpacing: "0.08em", marginBottom: "28px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#d4a920" }} />
            BÉNIN · SPÉCIALISTE EN HYGIÈNE SANITAIRE PROFESSIONNELLE
          </div>
          <h1 className="hero-h1" style={{ fontSize: "clamp(32px, 5vw, 62px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.1", maxWidth: "700px", marginBottom: "24px", letterSpacing: "-0.02em" }}>
            Protégez votre espace.
            <br />
            <span style={{ color: "#d4a920", fontWeight: "700" }}>Vivez et travaillez</span>
            <br />
            en toute sérénité.
          </h1>
          <p className="hero-p" style={{ fontSize: "16px", color: "rgba(255,255,255,0.65)", lineHeight: "1.85", maxWidth: "520px", marginBottom: "40px", fontWeight: "300" }}>
            Désinsectisation, dératisation, désinfection — des interventions professionnelles certifiées pour hôtels, restaurants, entreprises et particuliers exigeants dans tout le Bénin.
          </p>
          <div className="hero-btns" style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "15px 32px", borderRadius: "6px", textDecoration: "none" }}>
              Demander une intervention
            </a>
            <a href="/services" style={{ backgroundColor: "transparent", color: "#ffffff", fontWeight: "500", fontSize: "14px", padding: "15px 32px", borderRadius: "6px", textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>
              Découvrir nos services →
            </a>
          </div>

          {/* CHIFFRES DYNAMIQUES */}
          <div className="hero-stats" style={{ display: "flex", marginTop: "64px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.08)", maxWidth: "600px" }}>
            {chiffres.map(function(s, i) {
              return (
                <div key={s.id || i} style={{ flex: 1, textAlign: "center", borderRight: i < chiffres.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none", padding: "0 20px" }}>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#d4a920" }}>{s.valeur}</div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginTop: "6px", letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="section-padding" style={{ backgroundColor: "#ffffff", padding: "100px 60px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOTRE ENGAGEMENT</div>
          <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "24px" }}>
            Une seule intervention
            <br />
            <strong style={{ fontWeight: "700" }}>suffit à tout changer.</strong>
          </h2>
          <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.9", marginBottom: "16px" }}>
            PHYSTO Bénin est la référence béninoise en matière d'hygiène sanitaire et phytosanitaire professionnelle. Nous intervenons avec des produits homologués, des techniciens certifiés et un protocole rigoureux éprouvé depuis plus de dix ans.
          </p>
          <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.9", marginBottom: "32px" }}>
            Notre promesse est simple et absolue : si le résultat n'est pas à la hauteur de vos attentes, nous revenons gratuitement jusqu'à ce que ce soit parfait.
          </p>
          <a href="/qui-sommes-nous" style={{ fontSize: "13px", fontWeight: "600", color: "#0a2e1a", textDecoration: "none", borderBottom: "2px solid #d4a920", paddingBottom: "3px" }}>
            Découvrir notre histoire →
          </a>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ borderRadius: "4px", overflow: "hidden", aspectRatio: "4/3", backgroundColor: "#e8e8e8" }}>
            <img src="/images/about-team.jpg" alt="Technicien PHYSTO Bénin" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section-padding" style={{ backgroundColor: "#f7f7f5", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "64px", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOS INTERVENTIONS</div>
              <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
                Une solution précise
                <br />
                <strong style={{ fontWeight: "700" }}>pour chaque nuisible.</strong>
              </h2>
            </div>
            <a href="/services" style={{ fontSize: "13px", fontWeight: "600", color: "#0a2e1a", textDecoration: "none", borderBottom: "2px solid #d4a920", paddingBottom: "3px", whiteSpace: "nowrap" }}>
              Voir tous nos services →
            </a>
          </div>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
            {services.map(function(s, i) {
              return (
                <a key={i} href="/services" style={{ textDecoration: "none" }}>
                  <div className="srv-card" style={{ backgroundColor: "#ffffff", padding: "40px 32px", minHeight: "280px", display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "11px", color: "#cccccc", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "20px" }}>{s.numero}</div>
                    <div style={{ fontSize: "10px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "10px" }}>{s.accroche.toUpperCase()}</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#0a0a0a", marginBottom: "14px" }}>{s.titre}</h3>
                    <p style={{ fontSize: "13px", color: "#777", lineHeight: "1.75", flex: 1 }}>{s.desc}</p>
                    <div style={{ marginTop: "24px", fontSize: "12px", fontWeight: "600", color: "#0a2e1a" }}>En savoir plus →</div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* SECTEURS */}
      <section className="section-padding" style={{ backgroundColor: "#0a2e1a", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOS CLIENTS</div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Nous protégeons les meilleurs
              <br />
              <strong style={{ fontWeight: "700", color: "#d4a920" }}>établissements du Bénin.</strong>
            </h2>
          </div>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { img: "/images/client-hotel.jpg", label: "Hôtels et Resorts", desc: "Interventions discrètes, respect des horaires, protocole hôtelier" },
              { img: "/images/client-industrie.jpg", label: "Entrepôts et Industrie", desc: "Traitement des grandes surfaces, mise aux normes, suivi régulier" },
              { img: "/images/client-bureau.jpg", label: "Bureaux et Entreprises", desc: "Interventions hors heures ouvrées, confidentialité garantie" },
            ].map(function(c, i) {
              return (
                <div key={i} style={{ position: "relative", borderRadius: "4px", overflow: "hidden", aspectRatio: "4/3", backgroundColor: "#0d3d1e" }}>
                  <img src={c.img} alt={c.label} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(2,9,4,0.92) 0%, transparent 60%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "24px" }}>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff", marginBottom: "6px" }}>{c.label}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{c.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* PROCESSUS */}
      <section className="section-padding" style={{ backgroundColor: "#ffffff", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "80px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOTRE MÉTHODE</div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Simple. Rapide.
              <br />
              <strong style={{ fontWeight: "700" }}>Définitivement efficace.</strong>
            </h2>
          </div>
          <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "40px" }}>
            {etapes.map(function(e, i) {
              return (
                <div key={i} style={{ position: "relative" }}>
                  {i < etapes.length - 1 && (
                    <div style={{ position: "absolute", top: "20px", right: "-20px", width: "40px", height: "1px", backgroundColor: "#e0e0e0" }} />
                  )}
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                    {e.num}
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0a0a0a", marginBottom: "12px" }}>{e.titre}</h3>
                  <p style={{ fontSize: "13px", color: "#777", lineHeight: "1.75" }}>{e.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>


      {/* RÉALISATIONS */}
      <section className="section-padding" style={{ backgroundColor: "#ffffff", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "64px", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>CAS RÉELS</div>
              <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
                Des résultats concrets
                <br />
                <strong style={{ fontWeight: "700" }}>sur le terrain.</strong>
              </h2>
            </div>
            <a href="/contact" style={{ fontSize: "13px", fontWeight: "600", color: "#0a2e1a", textDecoration: "none", borderBottom: "2px solid #d4a920", paddingBottom: "3px", whiteSpace: "nowrap" }}>
              Demander une intervention →
            </a>
          </div>

          {/* CAS CLIENT */}
          <div style={{ backgroundColor: "#f7f7f5", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
            {/* AVANT/APRÈS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
              <div style={{ position: "relative", aspectRatio: "1", backgroundColor: "#e0e0e0", overflow: "hidden" }}>
                <img src="/images/avant-placeholder.jpg" alt="Avant intervention" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={function(e: any) { e.target.style.display = "none" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#999", letterSpacing: "0.1em" }}>AVANT</div>
                  <div style={{ fontSize: "10px", color: "#bbb", marginTop: "4px" }}>Photo à venir</div>
                </div>
                <div style={{ position: "absolute", top: "12px", left: "12px", backgroundColor: "#991b1b", color: "#fff", fontSize: "9px", fontWeight: "700", padding: "4px 10px", borderRadius: "3px", letterSpacing: "0.08em" }}>AVANT</div>
              </div>
              <div style={{ position: "relative", aspectRatio: "1", backgroundColor: "#e8f5ee", overflow: "hidden" }}>
                <img src="/images/apres-placeholder.jpg" alt="Après intervention" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={function(e: any) { e.target.style.display = "none" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#1a6b38", letterSpacing: "0.1em" }}>APRÈS</div>
                  <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>Photo à venir</div>
                </div>
                <div style={{ position: "absolute", top: "12px", left: "12px", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "9px", fontWeight: "700", padding: "4px 10px", borderRadius: "3px", letterSpacing: "0.08em" }}>APRÈS</div>
              </div>
              {/* PHOTO ÉQUIPE TERRAIN */}
              <div style={{ position: "relative", aspectRatio: "2", gridColumn: "span 2", backgroundColor: "#1a1a1a", overflow: "hidden" }}>
                <img src="/images/about-team.jpg" alt="Équipe PHYSTO sur le terrain" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                <div style={{ position: "absolute", bottom: "16px", left: "16px" }}>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", marginBottom: "4px" }}>ÉQUIPE TERRAIN</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>Techniciens PHYSTO Bénin</div>
                </div>
              </div>
            </div>

            {/* DÉTAILS DU CAS */}
            <div style={{ padding: "48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(212,169,32,0.1)", border: "1px solid rgba(212,169,32,0.3)", color: "#d4a920", fontSize: "10px", fontWeight: "700", padding: "5px 14px", borderRadius: "20px", letterSpacing: "0.08em", marginBottom: "28px", alignSelf: "flex-start" }}>
                🏨 HÔTEL — COTONOU
              </div>
              <div style={{ marginBottom: "28px" }}>
                <div style={{ fontSize: "10px", color: "#991b1b", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "10px" }}>LE PROBLÈME</div>
                <p style={{ fontSize: "15px", color: "#333", lineHeight: "1.8" }}>
                  Infestation sévère de cafards dans les cuisines et réserves. Signalement lors d'une inspection sanitaire — risque de fermeture administrative.
                </p>
              </div>
              <div style={{ marginBottom: "36px" }}>
                <div style={{ fontSize: "10px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "10px" }}>LE RÉSULTAT</div>
                <p style={{ fontSize: "15px", color: "#333", lineHeight: "1.8" }}>
                  Traitement gel appât en 2 interventions sur 72h. Zéro nuisible constaté à la contre-visite. Certificat d'hygiène délivré. L'établissement a rouvert sans aucune réserve.
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {["Désinsectisation", "2 interventions", "Certificat remis", "Résultat garanti"].map(function(tag, i) {
                  return (
                    <span key={i} style={{ fontSize: "11px", fontWeight: "600", color: i === 0 ? "#0a2e1a" : "#666", backgroundColor: i === 0 ? "rgba(10,46,26,0.08)" : "#f0f0f0", padding: "5px 12px", borderRadius: "4px" }}>
                      {tag}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="section-padding" style={{ backgroundColor: "#f7f7f5", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "64px", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>TÉMOIGNAGES</div>
              <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
                Ce que disent
                <br />
                <strong style={{ fontWeight: "700" }}>nos clients.</strong>
              </h2>
            </div>
            <span style={{ color: "#d4a920", fontSize: "20px", letterSpacing: "4px" }}>★★★★★</span>
          </div>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
            {temoignages.slice(0, 3).map(function(t, i) {
              return (
                <div key={t.id || i} style={{ backgroundColor: "#ffffff", padding: "40px 32px", borderRadius: "4px", borderBottom: "3px solid #d4a920", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: "48px", color: "#d4a920", lineHeight: 1, marginBottom: "16px", fontFamily: "Georgia, serif" }}>"</div>
                  <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.85", fontStyle: "italic", flex: 1, marginBottom: "32px" }}>{t.texte}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {t.init}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#0a0a0a" }}>{t.nom}</div>
                      <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* GARANTIES */}
      <section className="section-padding" style={{ backgroundColor: "#ffffff", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOS ENGAGEMENTS</div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Les raisons de nous
              <br />
              <strong style={{ fontWeight: "700" }}>faire confiance.</strong>
            </h2>
          </div>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
            {garanties.map(function(g, i) {
              return (
                <div key={i} style={{ backgroundColor: g.accent ? "#0a2e1a" : "#f7f7f5", padding: "40px 32px", border: g.accent ? "2px solid #d4a920" : "none" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: g.accent ? "#d4a920" : "#0a0a0a", marginBottom: "12px" }}>{g.titre}</h3>
                  <p style={{ fontSize: "13px", color: g.accent ? "rgba(255,255,255,0.65)" : "#777", lineHeight: "1.75", marginBottom: g.detail ? "16px" : "0" }}>{g.desc}</p>
                  {g.detail && (
                    <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", backgroundColor: "rgba(212,169,32,0.12)", padding: "6px 12px", borderRadius: "4px", display: "inline-block" }}>
                      {g.detail}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ position: "relative", backgroundColor: "#020904", padding: "120px 60px", overflow: "hidden", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/images/hero-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.12 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "24px" }}>CONTACTEZ-NOUS</div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 50px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.15", letterSpacing: "-0.02em", marginBottom: "24px" }}>
            Une infestation ne s'arrange
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>jamais seule.</strong>
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", lineHeight: "1.85", marginBottom: "48px" }}>
            Chaque heure compte. Contactez-nous maintenant pour une intervention rapide et définitive. Résultats garantis par contrat.
          </p>
          <div className="cta-btns" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "16px 36px", borderRadius: "6px", textDecoration: "none" }}>
              Demander une intervention
            </a>
            <a href="https://wa.me/2290153047950" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#25d366", color: "#ffffff", fontWeight: "700", fontSize: "14px", padding: "16px 36px", borderRadius: "6px", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp direct
            </a>
          </div>
        </div>
      </section>

    </main>
  )
}
