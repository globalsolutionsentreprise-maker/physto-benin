"use client"
import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"

export default function Accueil() {

  const [chiffres, setChiffres] = useState([
    { id: 1, valeur: "+50", label: "Clients protégés" },
    { id: 2, valeur: "7j/7", label: "Service continu" },
    { id: 4, valeur: "24h/24", label: "Urgences assurées" },
  ])

  const [temoignages, setTemoignages] = useState([
    { id: 1, init: "A.K", nom: "A. Koné", role: "Directeur de restauration, Cotonou", texte: "Une intervention le jour même, un résultat parfait. Notre restaurant a pu rouvrir dès le lendemain sans aucune réserve de l'inspection sanitaire." },
    { id: 2, init: "F.S", nom: "F. Sow", role: "Directrice d'établissement hôtelier, Porto-Novo", texte: "Contrat trimestriel depuis deux ans. Nos clients ne se plaignent plus de rien. L'équipe est ponctuelle, discrète et extrêmement professionnelle." },
    { id: 3, init: "M.B", nom: "M. Bello", role: "Responsable logistique, Bénin", texte: "Un problème de termites réglé en une seule intervention. Le certificat fourni nous a permis de rassurer nos partenaires." },
  ])

  const [agrement, setAgrement] = useState("N° AGRÉMENT-BÉNIN-XXXXX")
  const [charge, setCharge] = useState(false)
  const [realisations, setRealisations] = useState<any[]>([])

  useEffect(function() {
    // Client Supabase partagé (singleton), évite les instances GoTrueClient multiples
    const db = supabase

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
          const agr = resParametres.data.find(function(x: any) { return x.cle === "agrement" })
          if (agr) setAgrement(agr.valeur)
        }
        const rr = await db.from("realisations").select("*").eq("actif", true).order("id")
        if (rr.data && rr.data.length > 0) setRealisations(rr.data.filter(function(r: any) { return r.actif === true }))
        setCharge(true)
      } catch(err) {
        console.error("Erreur Supabase:", err)
        setCharge(true)
      }
    }

    charger()
  }, [])

  // Motion du hero : neutralisation séquencée des nuisibles + cartes magnétiques (desktop).
  // Respecte prefers-reduced-motion ; purement décoratif, se nettoie au démontage.
  useEffect(function() {
    if (typeof window === "undefined") return
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const timers: number[] = []
    const cleanups: Array<() => void> = []

    if (!reduce) {
      document.querySelectorAll("[data-bug]").forEach(function(b, i) {
        timers.push(window.setTimeout(function() { b.classList.add("hit") }, 1700 + i * 260))
      })
    }
    if (!reduce && window.matchMedia("(pointer:fine)").matches) {
      document.querySelectorAll("[data-magnet]").forEach(function(node) {
        const el = node as HTMLElement
        const move = function(ev: Event) {
          const e = ev as MouseEvent
          const r = el.getBoundingClientRect()
          const px = (e.clientX - r.left) / r.width
          const py = (e.clientY - r.top) / r.height
          const rx = (0.5 - py) * 8
          const ry = (px - 0.5) * 10
          el.style.transform = "perspective(720px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-6px)"
          el.style.setProperty("--mx", (px * 100) + "%")
          el.style.setProperty("--my", (py * 100) + "%")
        }
        const leave = function() { el.style.transform = "" }
        el.addEventListener("mousemove", move)
        el.addEventListener("mouseleave", leave)
        cleanups.push(function() { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave) })
      })
      // boutons magnétiques (translation douce, sans tilt) : CTA final
      document.querySelectorAll("[data-magnet-soft]").forEach(function(node) {
        const el = node as HTMLElement
        const move = function(ev: Event) {
          const e = ev as MouseEvent
          const r = el.getBoundingClientRect()
          const x = e.clientX - r.left - r.width / 2
          const y = e.clientY - r.top - r.height / 2
          el.style.transform = "translate(" + x * 0.2 + "px," + y * 0.32 + "px)"
        }
        const leave = function() { el.style.transform = "" }
        el.addEventListener("mousemove", move)
        el.addEventListener("mouseleave", leave)
        cleanups.push(function() { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave) })
      })
    }
    return function() { timers.forEach(function(t) { clearTimeout(t) }); cleanups.forEach(function(c) { c() }) }
  }, [])

  // Révélation en cascade des items de section au défilement.
  // Visible par défaut si JS absent ; filet de sécurité à 3,5 s ; respecte reduced-motion.
  useEffect(function() {
    if (typeof window === "undefined") return
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || !("IntersectionObserver" in window)) return
    const main = document.querySelector("main")
    if (!main) return
    main.classList.add("js-rise")
    const items = Array.from(document.querySelectorAll(".rise")) as HTMLElement[]
    const reveal = function(el: Element) { el.classList.add("in") }
    const obs = new IntersectionObserver(function(entries, o) {
      entries.forEach(function(e) { if (e.isIntersecting) { reveal(e.target); o.unobserve(e.target) } })
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
    items.forEach(function(el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) reveal(el)
      else obs.observe(el)
    })
    const timer = window.setTimeout(function() { items.forEach(reveal) }, 3500)
    return function() { obs.disconnect(); window.clearTimeout(timer); main.classList.remove("js-rise") }
  }, [])

  const services = [
    { numero: "01", slug: "desinsectisation-cotonou", titre: "Désinsectisation", accroche: "Cafards, fourmis, moustiques, mouches", desc: "Gel appât, pulvérisation résiduelle ou fumigation, on choisit la bonne méthode selon votre situation. Résultat durable, certifié." },
    { numero: "02", slug: "deratisation-benin", titre: "Dératisation", accroche: "Rats, souris, rongeurs", desc: "Pièges homologués, raticides certifiés, sécurisation des points d'entrée. On élimine les rongeurs et on fait en sorte qu'ils ne reviennent pas." },
    { numero: "03", slug: "desinfection-locaux", titre: "Désinfection", accroche: "Assainissement complet de vos locaux", desc: "Locaux traités avec des produits virucides et bactéricides homologués OMS. Certificat officiel remis, valable pour les inspections sanitaires." },
    { numero: "04", slug: "anti-termites-benin", titre: "Anti-termites", accroche: "Protection des structures bois et béton", desc: "Les termites détruisent en silence. On les stoppe avec une barrière chimique par injection, protection longue durée. Diagnostic gratuit." },
    { numero: "05", slug: "reptiles-serpents-benin", titre: "Reptiles et Serpents", accroche: "Geckos, serpents, lézards", desc: "Serpent dans la maison, geckos envahissants, on intervient. Répulsifs durables, barrières physiques, disponible 24h/24." },
    { numero: "06", slug: "punaises-de-lit-cotonou", titre: "Autres traitements", accroche: "Tout nuisible sur demande", desc: "Punaises de lit, puces, guêpes, frelons, chenilles processionnaires. On adapte le traitement à votre situation. Devis gratuit." },
  ]

  const etapes = [
    { num: "01", titre: "Vous nous contactez", desc: "WhatsApp, téléphone ou formulaire, comme vous préférez. On répond rapidement, 24h/24 et 7j/7." },
    { num: "02", titre: "Diagnostic gratuit", desc: "Un technicien passe chez vous, sans frais, pour voir exactement ce qu'il y a à faire. Pas d'estimation à l'aveugle." },
    { num: "03", titre: "Intervention", desc: "On traite avec les bons produits, proprement et discrètement. Pas besoin de tout préparer, on s'adapte à votre planning." },
    { num: "04", titre: "Certificat et suivi", desc: "À la fin de chaque intervention, vous recevez un certificat officiel. Pour vous, vos partenaires ou l'inspection sanitaire." },
  ]

  const garanties = [
    { titre: "Agréé par l'État du Bénin", desc: "On est officiellement agréés par les autorités sanitaires du Bénin. Pas une promesse, un document.", detail: agrement, accent: true },
    { titre: "Produits homologués OMS", desc: "Tous nos produits passent les normes OMS, efficaces contre les nuisibles, sans danger pour votre entourage.", accent: false },
    { titre: "Disponibles 24h/24", desc: "Disponibles 24h/24 et 7j/7, y compris jours fériés. Urgences assurées sur Cotonou.", accent: false },
    { titre: "Certificat officiel remis", desc: "Chaque intervention se termine par un certificat signé. Valable pour les inspections sanitaires.", accent: false },
    { titre: "Techniciens certifiés", desc: "Nos techniciens sont formés, certifiés et connaissent le terrain béninois.", accent: false },
  ]

  // FAQ page d'accueil : questions générales à forte intention locale (cible les
  // « People Also Ask » de Google). Le schema FAQPage ci-dessous est construit à
  // partir de CE MÊME tableau : le balisage correspond donc toujours au contenu
  // visible, comme l'exige Google (pas de FAQ invisible).
  const faqAccueil = [
    { q: "Combien coûte une désinsectisation à Cotonou ?", r: "Le prix dépend de la surface à traiter et du nuisible concerné. On commence toujours par un diagnostic gratuit, puis on vous remet un devis clair, sans engagement. Nos contrats d'entretien démarrent à 25 000 FCFA par mois." },
    { q: "Intervenez-vous en urgence, la nuit et le week-end ?", r: "Oui, nous sommes disponibles 24h/24 et 7j/7, jours fériés compris, à Cotonou et dans les zones prioritaires (Abomey-Calavi, Sèmè-Kpodji, Porto-Novo)." },
    { q: "Êtes-vous agréés par l'État béninois ?", r: "Oui, Phyto Bénin (GSE) est agréé par les autorités sanitaires du Bénin (agrément APA/26-025/CNGP-BEN). Un certificat officiel, opposable lors des inspections, est remis après chaque intervention." },
    { q: "Vos produits sont-ils dangereux pour les enfants et les animaux ?", r: "Non. Nous utilisons uniquement des produits homologués OMS, et nous vous indiquons le délai exact à respecter avant de réoccuper les lieux selon le traitement réalisé." },
    { q: "Dans quelles villes du Bénin intervenez-vous ?", r: "Cotonou, Abomey-Calavi, Porto-Novo, Ouidah, Sèmè-Kpodji, et partout ailleurs au Bénin sur demande." },
    { q: "Proposez-vous des contrats pour les hôtels et restaurants ?", r: "Oui, des contrats d'entretien 3D mensuels ou trimestriels, avec certificat de conformité pour vos inspections HACCP. Tout commence par un audit gratuit sur site." },
  ]

  const schemaFAQAccueil = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqAccueil.map(function(f) {
      return { "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.r } }
    }),
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <style>{`
        .srv-card { transition: border-top-color .2s, transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s; border-top: 3px solid transparent; }
        .srv-card:hover { border-top-color: #d4a920 !important; transform: translateY(-6px); box-shadow: 0 22px 44px -26px rgba(10,46,26,0.55); }

        /* ===== Motion sections : révélation en cascade au scroll ===== */
        /* visible par défaut (si JS absent ou reduced-motion) ; masqué seulement quand main.js-rise */
        main.js-rise .rise { opacity: 0; transform: translateY(22px); }
        main.js-rise .rise.in { opacity: 1; transform: none; transition: opacity .55s ease, transform .6s cubic-bezier(.22,1,.36,1); transition-delay: var(--ri, 0s); }

        /* survols sections */
        .sect-card { transition: transform .35s cubic-bezier(.22,1,.36,1); }
        .sect-card img { transition: transform .7s cubic-bezier(.22,1,.36,1); }
        .sect-card:hover { transform: translateY(-4px); }
        .sect-card:hover img { transform: scale(1.06); }
        .nuis-chip { transition: background .25s, color .25s, border-color .25s, transform .25s cubic-bezier(.34,1.56,.64,1); }
        .nuis-chip:hover { background: #0a2e1a !important; color: #ffffff !important; border-color: #0a2e1a !important; transform: translateY(-3px); }
        .lift { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s; }
        .lift:hover { transform: translateY(-5px); box-shadow: 0 20px 40px -26px rgba(10,46,26,0.5); }

        /* ===== CTA final : moment de conversion ===== */
        .cta-beacon { position: absolute; inset: 0; z-index: 0; pointer-events: none; display: flex; align-items: center; justify-content: center; }
        .cta-beacon > span { width: min(60vw, 720px); aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, rgba(212,169,32,0.20), transparent 60%); animation: ctaBreath 5s ease-in-out infinite; }
        @keyframes ctaBreath { 0%, 100% { transform: scale(0.9); opacity: .55; } 50% { transform: scale(1.08); opacity: 1; } }
        .cta-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #d4a920; margin-right: 9px; vertical-align: middle; box-shadow: 0 0 0 0 rgba(212,169,32,0.6); animation: ctaPulse 2.2s ease-out infinite; }
        @keyframes ctaPulse { 0% { box-shadow: 0 0 0 0 rgba(212,169,32,0.55); } 70%, 100% { box-shadow: 0 0 0 11px rgba(212,169,32,0); } }
        /* bouton : anneaux sonar + reflet + magnétique */
        .cta-btn-wrap { position: relative; display: inline-block; }
        .cta-btn-wrap::before, .cta-btn-wrap::after { content: ""; position: absolute; inset: 0; border-radius: 6px; border: 2px solid rgba(212,169,32,0.55); z-index: 0; pointer-events: none; animation: ctaRing 2.8s cubic-bezier(.2,.6,.3,1) infinite; }
        .cta-btn-wrap::after { animation-delay: 1.4s; }
        @keyframes ctaRing { 0% { transform: scale(1); opacity: .75; } 100% { transform: scale(1.5); opacity: 0; } }
        .cta-cta { position: relative; z-index: 1; overflow: hidden; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 12px 32px -10px rgba(212,169,32,0.6); transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .3s; }
        .cta-cta:hover { box-shadow: 0 20px 48px -12px rgba(212,169,32,0.9); }
        .cta-cta::after { content: ""; position: absolute; top: 0; left: -60%; width: 38%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent); transform: skewX(-18deg); animation: ctaShine 4.5s ease-in-out infinite; }
        @keyframes ctaShine { 0% { left: -60%; } 28%, 100% { left: 165%; } }
        .cta-cta .arr { transition: transform .35s cubic-bezier(.22,1,.36,1); }
        .cta-cta:hover .arr { transform: translateX(6px); }

        /* ===== HERO motion (direction « Terrain vivant ») ===== */
        .hx-title { font-family: "Bricolage Grotesque", system-ui, sans-serif; }

        /* radar de protection */
        .hx-radar { position: absolute; right: -9vw; top: 46%; transform: translateY(-50%); z-index: 1; width: min(82vh, 760px); aspect-ratio: 1; pointer-events: none; }
        .hx-ring { position: absolute; inset: 0; margin: auto; border-radius: 50%; border: 1px solid rgba(212,169,32,0.16); }
        .hx-sweep { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, rgba(212,169,32,0.18), transparent 26%); -webkit-mask: radial-gradient(circle, transparent 7%, #000 8%); mask: radial-gradient(circle, transparent 7%, #000 8%); animation: hxTourne 6s linear infinite; }
        @keyframes hxTourne { to { transform: rotate(360deg); } }
        .hx-ping { position: absolute; inset: 0; margin: auto; width: 18%; height: 18%; border-radius: 50%; border: 1.5px solid rgba(212,169,32,0.5); opacity: 0; animation: hxPing 4s cubic-bezier(.2,.6,.3,1) infinite; }
        .hx-ping:nth-child(2) { animation-delay: 1.3s; } .hx-ping:nth-child(3) { animation-delay: 2.6s; }
        @keyframes hxPing { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(5.2); opacity: 0; } }

        /* nuisibles qui entrent puis sont neutralisés */
        .hx-bug { position: absolute; z-index: 2; font-size: clamp(22px, 2.8vw, 36px); opacity: 0; animation: hxEntre .6s ease forwards; }
        .hx-bug .hx-barre { position: absolute; left: -10%; top: 52%; width: 120%; height: 3px; background: #d4a920; border-radius: 2px; transform: scaleX(0); transform-origin: left; box-shadow: 0 0 10px #d4a920; }
        .hx-bug.hit { animation: hxNeutralise .8s cubic-bezier(.5,0,.75,0) forwards; }
        .hx-bug.hit .hx-barre { animation: hxRaye .28s ease forwards; }
        @keyframes hxEntre { to { opacity: .82; } }
        @keyframes hxRaye { to { transform: scaleX(1); } }
        @keyframes hxNeutralise { 0% { opacity: .82; transform: scale(1) rotate(0); } 60% { opacity: .45; } 100% { opacity: 0; transform: scale(.4) rotate(26deg); } }

        /* révélation du titre, mot à mot */
        .hx-mot { display: inline-block; overflow: hidden; vertical-align: bottom; }
        .hx-mot > span { display: inline-block; transform: translateY(110%); animation: hxMonte .85s cubic-bezier(.19,1,.22,1) var(--d, 0s) forwards; }
        @keyframes hxMonte { to { transform: translateY(0); } }
        /* glint doré discret qui passe sur les mots blancs du titre, en boucle lente */
        .hx-title .hx-mot > span:not(.hx-accent) {
          background: linear-gradient(100deg, #ffffff 0%, #ffffff 44%, #ffe9ad 50%, #ffffff 56%, #ffffff 100%);
          background-size: 300% 100%; background-position: 150% 0;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: hxMonte .85s cubic-bezier(.19,1,.22,1) var(--d, 0s) forwards, hxGlint 7s ease-in-out 2.4s infinite;
        }
        @keyframes hxGlint { 0%, 100% { background-position: 150% 0; } 50% { background-position: -50% 0; } }
        /* surlignage or qui balaie « On s'en occupe. » */
        .hx-accent { position: relative; color: #04110a; font-weight: 800; z-index: 0; padding: 0 .1em; white-space: nowrap; }
        .hx-accent::before { content: ""; position: absolute; inset: .08em 0; z-index: -1; background: linear-gradient(90deg, #d4a920, #ffde7a); transform: scaleX(0); transform-origin: left; border-radius: 3px; animation: hxSwipe .55s cubic-bezier(.65,0,.35,1) 1.2s forwards; }
        @keyframes hxSwipe { to { transform: scaleX(1); } }
        /* reflet assorti qui balaie le bloc doré, synchronisé avec le glint du titre */
        .hx-accent::after { content: ""; position: absolute; inset: .08em 0; z-index: -1; border-radius: 3px; pointer-events: none; background: linear-gradient(100deg, transparent 42%, rgba(255,255,255,0.45) 50%, transparent 58%); background-size: 260% 100%; background-repeat: no-repeat; background-position: 150% 0; animation: hxGoldSheen 7s ease-in-out 2.4s infinite; }
        @keyframes hxGoldSheen { 0%, 100% { background-position: 150% 0; } 50% { background-position: -40% 0; } }

        /* cartes parcours : entrée décalée + lumière continue + tilt 3D et lueur au curseur */
        .hx-carte { position: relative; overflow: hidden; will-change: transform; opacity: 0; transform: translateY(22px); animation: hxUp .8s cubic-bezier(.22,1,.36,1) forwards; transition: transform .18s ease-out, border-color .35s, box-shadow .35s; }
        .hx-carte:hover { border-color: #d4a920 !important; box-shadow: 0 22px 46px -20px rgba(212,169,32,0.6); }
        /* ligne de lumière or qui traverse le haut de la carte en continu */
        .hx-carte::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1.5px; pointer-events: none; background: linear-gradient(90deg, transparent, rgba(212,169,32,0.95), transparent); background-size: 42% 100%; background-repeat: no-repeat; animation: hxSheen 5.5s linear infinite; }
        .hx-carte.part::before { animation-delay: 2.75s; }
        @keyframes hxSheen { 0% { background-position: -45% 0; } 100% { background-position: 145% 0; } }
        /* lueur qui suit la souris */
        .hx-carte::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .3s; background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.16), transparent 60%); }
        .hx-carte:hover::after { opacity: 1; }
        .hx-fleche { display: inline-block; transition: transform .35s cubic-bezier(.22,1,.36,1); }
        .hx-carte:hover .hx-fleche { transform: translateX(6px); }
        @keyframes hxUp { to { opacity: 1; transform: translateY(0); } }

        .hx-fade { opacity: 0; animation: hxFade .9s ease forwards; }
        @keyframes hxFade { to { opacity: 1; } }

        @media (max-width: 640px) {
          .hx-radar { opacity: .4; right: -30vw; }
          .hx-bug { font-size: 20px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hx-sweep, .hx-ping, .hx-carte::before, .hx-accent::after, .hx-title .hx-mot > span:not(.hx-accent),
          .cta-beacon > span, .cta-dot, .cta-btn-wrap::before, .cta-btn-wrap::after, .cta-cta::after { animation: none; }
          .hx-mot > span, .hx-carte, .hx-fade { animation: none !important; opacity: 1; transform: none; }
          .hx-accent::before { animation: none; transform: scaleX(1); }
          .hx-bug { opacity: .82; animation: none; }
          .hx-bug .hx-barre { transform: scaleX(1); }
        }
      `}</style>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "#050e07" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/images/hero-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.45 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #020904 0%, rgba(2,9,4,0.75) 45%, rgba(2,9,4,0.2) 100%)" }} />

        {/* RADAR de protection + nuisibles neutralisés (décor animé, aucun contenu ajouté) */}
        <div className="hx-radar" aria-hidden="true">
          <div className="hx-ring" style={{ width: "30%", height: "30%" }} />
          <div className="hx-ring" style={{ width: "55%", height: "55%" }} />
          <div className="hx-ring" style={{ width: "80%", height: "80%" }} />
          <div className="hx-ring" style={{ width: "100%", height: "100%" }} />
          <div className="hx-sweep" />
          <div className="hx-ping" /><div className="hx-ping" /><div className="hx-ping" />
        </div>
        {[
          { e: "🦟", top: "18%", left: "58%", d: "0.3s" },
          { e: "🪳", top: "60%", left: "64%", d: "0.55s" },
          { e: "🐀", top: "30%", left: "80%", d: "0.8s" },
          { e: "🐍", top: "72%", left: "72%", d: "1.05s" },
          { e: "🐛", top: "12%", left: "82%", d: "1.3s" },
        ].map(function(b, i) {
          return (
            <div key={i} className="hx-bug" data-bug aria-hidden="true" style={{ top: b.top, left: b.left, animationDelay: b.d }}>
              {b.e}<span className="hx-barre" />
            </div>
          )
        })}

        {/* BADGE AGRÉMENT, haut droite */}
        <div className="badge-float" style={{ position: "absolute", top: "28px", right: "40px", zIndex: 10, display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(212,169,32,0.13)", border: "1.5px solid rgba(212,169,32,0.55)", padding: "10px 18px", borderRadius: "6px", backdropFilter: "blur(6px)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "11px", fontWeight: "900", flexShrink: 0 }}>✓</span>
          <div>
            <div style={{ fontSize: "10px", fontWeight: "800", color: "#d4a920", letterSpacing: "0.1em", lineHeight: 1.2 }}>AGRÉÉ PAR L'ÉTAT BÉNINOIS</div>
            <div style={{ fontSize: "9px", color: "rgba(212,169,32,0.7)", letterSpacing: "0.06em", marginTop: "2px" }}>{agrement}</div>
          </div>
        </div>
        <div className="hero-padding" style={{ position: "relative", zIndex: 3, padding: "0 60px 80px" }}>
          <div className="hx-fade" style={{ animationDelay: "0.15s", display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(212,169,32,0.12)", border: "1px solid rgba(212,169,32,0.35)", color: "#d4a920", fontSize: "11px", fontWeight: "600", padding: "6px 16px", borderRadius: "20px", letterSpacing: "0.08em", marginBottom: "28px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#d4a920" }} />
            BÉNIN · HYGIÈNE SANITAIRE · INTERVENTION 24H/24
          </div>
          <h1 className="hero-h1 hx-title" style={{ fontSize: "clamp(34px, 5.8vw, 74px)", fontWeight: "800", color: "#ffffff", lineHeight: "1.0", maxWidth: "860px", marginBottom: "24px", letterSpacing: "-0.02em", textTransform: "uppercase" }}>
            <span className="hx-mot"><span style={{ ["--d" as any]: "0.3s" }}>Moustiques,</span></span>{" "}
            <span className="hx-mot"><span style={{ ["--d" as any]: "0.42s" }}>cafards,</span></span>{" "}
            <span className="hx-mot"><span style={{ ["--d" as any]: "0.54s" }}>serpents…</span></span>
            <br />
            <span className="hx-mot"><span className="hx-accent" style={{ ["--d" as any]: "0.9s" }}>On s'en occupe.</span></span>
          </h1>
          <p className="hero-p hx-fade" style={{ animationDelay: "1.0s", fontSize: "16px", color: "rgba(255,255,255,0.65)", lineHeight: "1.85", maxWidth: "540px", marginBottom: "36px", fontWeight: "300" }}>
            Techniciens certifiés, produits homologués OMS. Partout au Bénin, pour les professionnels comme pour les particuliers.
          </p>

          {/* DEUX PARCOURS : pro / particulier */}
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", maxWidth: "660px" }}>
            <a href="/contrat-conformite" className="hx-carte" data-magnet style={{ textDecoration: "none", backgroundColor: "rgba(212,169,32,0.12)", border: "1px solid rgba(212,169,32,0.45)", borderRadius: "10px", padding: "20px 22px", display: "block", animationDelay: "1.2s" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#d4a920", letterSpacing: "0.1em", marginBottom: "8px" }}>PROFESSIONNELS</div>
              <div style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>Contrat de conformité 3D</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>Audit gratuit + certificat mensuel <span className="hx-fleche">→</span></div>
            </a>
            <a href="/contact" className="hx-carte part" data-magnet style={{ textDecoration: "none", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "10px", padding: "20px 22px", display: "block", animationDelay: "1.35s" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#d4a920", letterSpacing: "0.1em", marginBottom: "8px" }}>PARTICULIERS</div>
              <div style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>Intervention à domicile</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>Devis gratuit, réponse rapide <span className="hx-fleche">→</span></div>
            </a>
          </div>

        </div>
      </section>

      {/* VOTRE PROBLÈME ?, auto-orientation du visiteur */}
      <section className="section-padding" style={{ backgroundColor: "#ffffff", padding: "72px 60px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>VOTRE PROBLÈME ?</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Dites-nous ce qui vous dérange.
            <br />
            <strong style={{ fontWeight: "700" }}>On a la solution.</strong>
          </h2>
          <p style={{ fontSize: "15px", color: "#666", lineHeight: "1.8", marginBottom: "36px", maxWidth: "560px", margin: "0 auto 36px" }}>
            Cliquez sur le nuisible qui vous concerne, on vous montre comment on le traite.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
            {[
              { label: "🪳 Cafards", slug: "desinsectisation-cotonou" },
              { label: "🐀 Rats & souris", slug: "deratisation-benin" },
              { label: "🐛 Termites", slug: "anti-termites-benin" },
              { label: "🛏️ Punaises de lit", slug: "punaises-de-lit-cotonou" },
              { label: "🦟 Moustiques", slug: "anti-moustiques-cotonou" },
              { label: "🐍 Serpents", slug: "reptiles-serpents-benin" },
              { label: "🧴 Désinfection", slug: "desinfection-locaux" },
            ].map(function(p, i) {
              return (
                <a key={p.slug} href={`/services/${p.slug}`} className="rise nuis-chip" style={{ ["--ri" as any]: (i * 0.05) + "s", fontSize: "14px", fontWeight: "600", color: "#0a2e1a", backgroundColor: "#f7f7f5", border: "1px solid #e5e5e5", padding: "11px 18px", borderRadius: "30px", textDecoration: "none" }}>
                  {p.label}
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* BLOC PRO, CONTRAT CONFORMITÉ (mis en avant) */}
      <section className="section-padding" style={{ backgroundColor: "#0a2e1a", padding: "80px 60px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "48px", alignItems: "center" }} className="grid-2">
          <div>
            <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>POUR LES PROFESSIONNELS</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.2", letterSpacing: "-0.02em", marginBottom: "20px" }}>
              Un contrat, la conformité
              <br />
              <strong style={{ fontWeight: "700", color: "#d4a920" }}>toute l'année.</strong>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.65)", lineHeight: "1.85", marginBottom: "24px", maxWidth: "480px" }}>
              Hôtels, restaurants, agro-industries, cliniques, banques : passages réguliers 3D + <strong style={{ color: "#fff" }}>certificat de conformité chaque mois</strong> pour vos inspections HACCP. Tout commence par un audit gratuit sur site.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {["Certificat officiel opposable à vos contrôles", "Interventions hors heures d'ouverture", "Rapports et certificats dans votre espace client"].map(function(t) {
                return (
                  <li key={t} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "11px", fontWeight: "900", flexShrink: 0 }}>✓</span>
                    {t}
                  </li>
                )
              })}
            </ul>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <a href="/contrat-conformite" style={{ display: "block", textAlign: "center", backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "15px", padding: "16px", borderRadius: "8px", textDecoration: "none" }}>
              Réserver mon audit gratuit
            </a>
            <a href="/contrat-conformite" style={{ display: "block", textAlign: "center", backgroundColor: "transparent", color: "#ffffff", fontWeight: "600", fontSize: "14px", padding: "14px", borderRadius: "8px", textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>
              Voir l'offre et les 3 formules →
            </a>
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
                <a key={i} href={`/services/${s.slug}`} className="rise" style={{ ["--ri" as any]: (i * 0.07) + "s", textDecoration: "none" }}>
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
              { img: "/images/client-industrie.jpg", label: "Entrepôts et Industrie", desc: "Grandes surfaces, normes HACCP, suivi régulier, on s'adapte à vos exigences." },
              { img: "/images/client-bureau.jpg", label: "Bureaux et Entreprises", desc: "Interventions en dehors des heures ouvrées. Vos équipes ne voient rien, ne sentent rien." },
            ].map(function(c, i) {
              return (
                <div key={i} className="rise sect-card" style={{ ["--ri" as any]: (i * 0.08) + "s", position: "relative", borderRadius: "4px", overflow: "hidden", aspectRatio: "4/3", backgroundColor: "#0d3d1e" }}>
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
                <div key={i} className="rise" style={{ ["--ri" as any]: (i * 0.08) + "s", position: "relative" }}>
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
                  {r.photo_avant ? <img src={r.photo_avant} alt={`Avant intervention ${r.titre || "désinsectisation"}, Phyto Bénin Cotonou`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: "32px" }}>📷</div></div>}
                </div>
                <div style={{ position: "relative", aspectRatio: "1", backgroundColor: "#e8f5ee", overflow: "hidden" }}>
                  {r.photo_apres ? <img src={r.photo_apres} alt={`Après intervention ${r.titre || "désinsectisation"}, par Phyto Bénin`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: "32px" }}>✅</div></div>}
                </div>
                <div style={{ gridColumn: "span 2", backgroundColor: "#1a1a1a", minHeight: "180px", position: "relative", overflow: "hidden" }}>
                  {r.video ? <video src={r.video} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls /> : <><img src="/images/about-team.jpg" alt="Équipe de techniciens certifiés Phyto Bénin, désinsectisation et dératisation au Bénin" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7, position: "absolute", inset: 0 }} /><div style={{ position: "absolute", bottom: "16px", left: "16px" }}><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)" }}>ÉQUIPE TERRAIN</div><div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>Techniciens Phyto Bénin</div></div></>}
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
              { titre: "Valable sur tous nos services", desc: "Désinsectisation, dératisation, désinfection, anti-termites, tous nos traitements sont concernés." },
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
                <div key={t.id || i} className="rise lift" style={{ ["--ri" as any]: (i * 0.08) + "s", backgroundColor: "#ffffff", padding: "40px 32px", borderRadius: "4px", borderBottom: "3px solid #d4a920", display: "flex", flexDirection: "column" }}>
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
                <div key={i} className="rise lift" style={{ ["--ri" as any]: (i * 0.07) + "s", backgroundColor: g.accent ? "#0a2e1a" : "#f7f7f5", padding: "40px 32px", border: g.accent ? "2px solid #d4a920" : "none" }}>
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

      {/* FAQ, questions fréquentes (+ schema FAQPage) */}
      <section className="section-padding" style={{ backgroundColor: "#f7f7f5", padding: "100px 60px" }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFAQAccueil) }} />
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>QUESTIONS FRÉQUENTES</div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Vous vous posez
              <br />
              <strong style={{ fontWeight: "700" }}>sûrement ces questions.</strong>
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {faqAccueil.map(function(f, i) {
              return (
                <div key={i} className="rise" style={{ ["--ri" as any]: (i * 0.05) + "s", backgroundColor: "#ffffff", padding: "24px 28px", borderLeft: "3px solid #d4a920" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0a2e1a", marginBottom: "10px" }}>{f.q}</h3>
                  <p style={{ fontSize: "14px", color: "#555", lineHeight: "1.75", margin: 0 }}>{f.r}</p>
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: "36px" }}>
            <a href="/blog" style={{ fontSize: "13px", fontWeight: "600", color: "#0a2e1a", textDecoration: "none", borderBottom: "2px solid #d4a920", paddingBottom: "3px" }}>
              Plus de conseils sur notre blog →
            </a>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ position: "relative", backgroundColor: "#020904", padding: "120px 60px", overflow: "hidden", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/images/hero-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.12 }} />
        <div className="cta-beacon" aria-hidden="true"><span /></div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "24px" }}><span className="cta-dot" />CONTACTEZ-NOUS</div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 50px)", fontWeight: "300", color: "#ffffff", lineHeight: "1.15", letterSpacing: "-0.02em", marginBottom: "24px" }}>
            Une infestation ne s'arrange
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>jamais seule.</strong>
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", lineHeight: "1.85", marginBottom: "48px" }}>
            Besoin d'une intervention urgente ? Contactez-nous dès maintenant. Diagnostic et devis gratuit, réponse rapide.
          </p>
          <div className="cta-btns" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <span className="cta-btn-wrap">
              <a href="/contact" className="cta-cta" data-magnet-soft style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "14px", padding: "16px 36px", borderRadius: "6px", textDecoration: "none" }}>
                Demander une intervention <span className="arr">→</span>
              </a>
            </span>
          </div>
        </div>
      </section>

    </main>
  )
}
