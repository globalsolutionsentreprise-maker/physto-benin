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
    { id: 2, valeur: "7j/7", label: "Disponibilité urgence" },
    { id: 4, valeur: "24h/24", label: "Disponibilité urgence" },
  ])

  const [temoignages, setTemoignages] = useState([
    { id: 1, init: "A.K", nom: "A. Koné", role: "Directeur de restauration — Cotonou", texte: "Une intervention le jour même, un résultat parfait. Notre restaurant a pu rouvrir dès le lendemain sans aucune réserve de l'inspection sanitaire." },
    { id: 2, init: "F.S", nom: "F. Sow", role: "Directrice d'établissement hôtelier — Porto-Novo", texte: "Contrat trimestriel depuis deux ans. Nos clients ne se plaignent plus de rien. L'équipe est ponctuelle, discrète et extrêmement professionnelle." },
    { id: 3, init: "M.B", nom: "M. Bello", role: "Responsable logistique — Bénin", texte: "Un problème de termites réglé en une seule intervention. Le certificat fourni nous a permis de rassurer nos partenaires." },
  ])

  const [agrement, setAgrement] = useState("N° AGRÉMENT-BÉNIN-XXXXX")
  const [charge, setCharge] = useState(false)
  const [realisations, setRealisations] = useState<any[]>([])

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
        const rr = await db.from("realisations").select("*").eq("actif", true).order("id")
        if (rr.data && rr.data.length > 0) setRealisations(rr.data.filter(function(r) { return r.actif === true }))
        setCharge(true)
      } catch(err) {
        console.error("Erreur Supabase:", err)
        setCharge(true)
      }
    }

    charger()
  }, [])

  const services = [
    { numero: "01", titre: "Désinsectisation", accroche: "Cafards, fourmis, moustiques, mouches", desc: "Gel appât, pulvérisation résiduelle ou fumigation — on choisit la bonne méthode selon votre situation. Résultat durable, certifié." },
    { numero: "02", titre: "Dératisation", accroche: "Rats, souris, rongeurs", desc: "Pièges homologués, raticides certifiés, sécurisation des points d'entrée. On élimine les rongeurs et on fait en sorte qu'ils ne reviennent pas." },
    { numero: "03", titre: "Désinfection", accroche: "Assainissement complet de vos locaux", desc: "Locaux traités avec des produits virucides et bactéricides homologués OMS. Certificat officiel remis — valable pour les inspections sanitaires." },
    { numero: "04", titre: "Anti-termites", accroche: "Protection des structures bois et béton", desc: "Les termites détruisent en silence. On les stoppe avec une barrière chimique par injection, garantie longue durée. Diagnostic gratuit." },
    { numero: "05", titre: "Reptiles et Serpents", accroche: "Geckos, serpents, lézards", desc: "Serpent dans la maison, geckos envahissants — on intervient. Répulsifs durables, barrières physiques, disponible 24h/24." },
    { numero: "06", titre: "Autres traitements", accroche: "Tout nuisible sur demande", desc: "Punaises de lit, puces, guêpes, frelons, chenilles processionnaires. On adapte le traitement à votre situation. Devis gratuit." },
  ]

  const etapes = [
    { num: "01", titre: "Vous nous contactez", desc: "WhatsApp, téléphone ou formulaire — comme vous préférez. On répond rapidement, 24h/24 et 7j/7." },
    { num: "02", titre: "Diagnostic gratuit", desc: "Un technicien passe chez vous — sans frais — pour voir exactement ce qu'il y a à faire. Pas d'estimation à l'aveugle." },
    { num: "03", titre: "Intervention", desc: "On traite avec les bons produits, proprement et discrètement. Pas besoin de tout préparer — on s'adapte à votre planning." },
    { num: "04", titre: "Certificat et suivi", desc: "À la fin de chaque intervention, vous recevez un certificat officiel. Pour vous, vos partenaires ou l'inspection sanitaire." },
  ]

  const garanties = [
    { titre: "Agréé par l'État du Bénin", desc: "On est officiellement agréés par les autorités sanitaires du Bénin. Pas une promesse — un document.", detail: agrement, accent: true },
    { titre: "Produits homologués OMS", desc: "Tous nos produits passent les normes OMS — efficaces contre les nuisibles, sans danger pour votre entourage.", accent: false },
    { titre: "Disponibles 24h/24", desc: "Disponibles 24h/24 et 7j/7, y compris jours fériés. Urgences assurées sur Cotonou.", accent: false },
    { titre: "Certificat officiel remis", desc: "Chaque intervention se termine par un certificat signé. Valable pour les inspections sanitaires.", accent: false },
    { titre: "Techniciens certifiés", desc: "Nos techniciens sont formés, certifiés et connaissent le terrain béninois.", accent: false },
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

        {/* BADGE AGRÉMENT — haut droite */}
        <div className="badge-float" style={{ position: "absolute", top: "28px", right: "40px", zIndex: 10, display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(212,169,32,0.13)", border: "1.5px solid rgba(212,169,32,0.55)", padding: "10px 18px", borderRadius: "6px", backdropFilter: "blur(6px)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "11px", fontWeight: "900", flexShrink: 0 }}>✓</span>
          <div>
            <div style={{ fontSize: "10px", fontWeight: "800", color: "#d4a920", letterSpacing: "0.1em", lineHeight: 1.2 }}>AGRÉÉ PAR L'ÉTAT BÉNINOIS</div>
            <div style={{ fontSize: "9px", color: "rgba(212,169,32,0.7)", letterSpacing: "0.06em", marginTop: "2px" }}>{agrement}</div>
          </div>
        </div>
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
            Cafards, rats, termites, serpents — on s'en occupe. Techniciens certifiés, produits homologués OMS, résultats garantis. Pour les professionnels comme pour les particuliers, partout au Bénin.
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
            Phyto Bénin, c'est l'entreprise que les hôtels, restaurants et familles appellent quand ils ont un vrai problème de nuisibles. Depuis plus de dix ans, on intervient avec les bons produits, les bons techniciens — et on ne repart pas tant que c'est réglé.
          </p>
          <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.9", marginBottom: "32px" }}>
            Ce n'est pas qu'un traitement. C'est la tranquillité d'esprit qui vient avec.
          </p>
          <a href="/qui-sommes-nous" style={{ fontSize: "13px", fontWeight: "600", color: "#0a2e1a", textDecoration: "none", borderBottom: "2px solid #d4a920", paddingBottom: "3px" }}>
            Découvrir notre histoire →
          </a>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ borderRadius: "4px", overflow: "hidden", aspectRatio: "4/3", backgroundColor: "#e8e8e8" }}>
            <img src="/images/about-team.jpg" alt="Techniciens Phyto Bénin en intervention d'hygiène sanitaire à Cotonou, Bénin" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
              { img: "/images/client-hotel.jpg", label: "Hôtels et Resorts", desc: "On connaît les contraintes hôtelières : discrétion, horaires stricts, zéro interruption de service." },
              { img: "/images/client-industrie.jpg", label: "Entrepôts et Industrie", desc: "Grandes surfaces, normes HACCP, suivi régulier — on s'adapte à vos exigences." },
              { img: "/images/client-bureau.jpg", label: "Bureaux et Entreprises", desc: "Interventions en dehors des heures ouvrées. Vos équipes ne voient rien, ne sentent rien." },
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
              <strong style={{ fontWeight: "700" }}>Et ça marche.</strong>
            </h2>
          </div>
          <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "40px" }}>
            {etapes.map(function(e, i) {
              return (
                <div key={i} style={{ position: "relative" }}>
                  {i < etapes.length - 1 && (
                    <div style={{ position: "absolute", top: "20px", right: "-20px", width: "40px", height: "1px", backgroundColor: "#e0e0e0" }} />
                  )}
                  <div style={{ width: "40px", height: "40px", borderRadius: "0", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
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



      {realisations.length > 0 && (
      <section className="section-padding" style={{ backgroundColor: "#ffffff", padding: "100px 60px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>CAS RÉELS</div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2" }}>Des résultats concrets<br /><strong style={{ fontWeight: "700" }}>sur le terrain.</strong></h2>
          </div>
          {realisations.map(function(r) { return (
            <div key={r.id} style={{ backgroundColor: "#f7f7f5", display: "grid", gridTemplateColumns: "1fr 1fr", marginBottom: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
                <div style={{ position: "relative", aspectRatio: "1", backgroundColor: "#e0e0e0", overflow: "hidden" }}>
                  {r.photo_avant ? <img src={r.photo_avant} alt={`Avant intervention ${r.titre || "désinsectisation"} — Phyto Bénin Cotonou`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: "32px" }}>📷</div></div>}
                </div>
                <div style={{ position: "relative", aspectRatio: "1", backgroundColor: "#e8f5ee", overflow: "hidden" }}>
                  {r.photo_apres ? <img src={r.photo_apres} alt={`Après intervention ${r.titre || "désinsectisation"} — résultat garanti Phyto Bénin`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: "32px" }}>✅</div></div>}
                </div>
                <div style={{ gridColumn: "span 2", backgroundColor: "#1a1a1a", minHeight: "180px", position: "relative", overflow: "hidden" }}>
                  {r.video ? <video src={r.video} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls /> : <><img src="/images/about-team.jpg" alt="Équipe de techniciens certifiés Phyto Bénin — désinsectisation et dératisation au Bénin" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7, position: "absolute", inset: 0 }} /><div style={{ position: "absolute", bottom: "16px", left: "16px" }}><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)" }}>ÉQUIPE TERRAIN</div><div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>Techniciens Phyto Bénin</div></div></>}
                </div>
              </div>
              <div style={{ padding: "48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", marginBottom: "24px" }}>🏨 {r.secteur}</div>
                <div style={{ marginBottom: "24px" }}><div style={{ fontSize: "10px", color: "#991b1b", fontWeight: "700", marginBottom: "8px" }}>LE PROBLÈME</div><p style={{ fontSize: "15px", color: "#333", lineHeight: "1.8" }}>{r.probleme}</p></div>
                <div><div style={{ fontSize: "10px", color: "#1a6b38", fontWeight: "700", marginBottom: "8px" }}>LE RÉSULTAT</div><p style={{ fontSize: "15px", color: "#333", lineHeight: "1.8" }}>{r.resultat}</p></div>
              </div>
            </div>
          )})}
        </div>
      </section>
      )}

      {/* OFFRE DE BIENVENUE */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "64px 40px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }} className="grid-2">
          <div>
            <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px", textTransform: "uppercase" }}>Offre de bienvenue</div>
            <h2 style={{ fontSize: "32px", fontWeight: "300", color: "#ffffff", lineHeight: "1.2", letterSpacing: "-0.01em", marginBottom: "16px" }}>
              Votre premier traitement à{" "}
              <strong style={{ fontWeight: "700", color: "#d4a920" }}>-10%</strong>
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: "1.7", marginBottom: "32px" }}>
              Chaque nouveau client bénéficie automatiquement d&apos;une remise de 10% sur son premier devis. Valable pour toute première demande, sans condition ni code promo.
            </p>
            <a href="/contact" style={{ display: "inline-block", backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "13px", fontWeight: "700", padding: "14px 28px", textDecoration: "none", letterSpacing: "0.04em" }}>
              Demander un devis gratuit →
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { titre: "Remise automatique", desc: "Aucun code promo à saisir. La remise s'applique d'elle-même sur votre premier devis." },
              { titre: "Valable sur tous nos services", desc: "Désinsectisation, dératisation, désinfection, anti-termites — tous nos traitements sont concernés." },
              { titre: "Remise portée sur le contrat", desc: "Si votre devis débouche sur un contrat annuel, la remise de 10% est conservée." },
            ].map(function(item) {
              return (
                <div key={item.titre} style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#d4a920", flexShrink: 0, marginTop: "6px" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>{item.titre}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: "1.5" }}>{item.desc}</div>
                  </div>
                </div>
              )
            })}
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
                    <div style={{ width: "42px", height: "42px", borderRadius: "0", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
            Besoin d'une intervention urgente ? Contactez-nous dès maintenant. Diagnostic et devis gratuit, réponse rapide garantie.
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
