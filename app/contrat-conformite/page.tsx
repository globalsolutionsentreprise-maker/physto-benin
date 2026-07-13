import type { Metadata } from "next"
import AuditForm from "./AuditForm"

const BASE = "https://www.phyto-benin.com"
const CANONICAL = `${BASE}/contrat-conformite`

export const metadata: Metadata = {
  title: "Contrat de conformité sanitaire 3D au Bénin | Phyto Bénin",
  description:
    "Contrat annuel de conformité sanitaire pour hôtels, restaurants, agro-industrie, cliniques et banques au Bénin. Désinsectisation, dératisation, désinfection + certificat de conformité mensuel. Audit gratuit sur site.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Contrat de conformité sanitaire 3D au Bénin, Phyto Bénin",
    description:
      "Un contrat, la tranquillité toute l'année : 3D + certificat de conformité mensuel. Agréé par l'État. Audit gratuit sur site.",
    url: CANONICAL,
    siteName: "Phyto Bénin by GSE",
    locale: "fr_FR",
    type: "website",
    images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: "Contrat de conformité sanitaire 3D, Phyto Bénin" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contrat de conformité sanitaire 3D au Bénin, Phyto Bénin",
    description: "3D + certificat de conformité mensuel. Agréé par l'État. Audit gratuit.",
    images: [`${BASE}/opengraph-image`],
  },
}

const PALIERS = [
  {
    nom: "Essentiel",
    cible: "Petits restaurants, commerces, bureaux",
    accent: false,
    points: [
      "1 passage préventif par mois (désinsectisation + dératisation)",
      "Certificat de conformité mensuel",
      "Rapport de passage détaillé",
      "Support téléphonique",
    ],
  },
  {
    nom: "Pro",
    cible: "Hôtels, moyennes surfaces, cliniques",
    accent: true,
    points: [
      "Tout l'Essentiel, avec passages renforcés (3D complet)",
      "Espace client : rapports et certificats en ligne",
      "Interventions hors heures d'ouverture",
      "Rapport de passage détaillé après chaque intervention",
    ],
  },
  {
    nom: "Conformité+",
    cible: "Agro-industrie, banques, multi-sites, institutionnel",
    accent: false,
    points: [
      "Tout le Pro, en programme sur mesure multi-sites",
      "Conformité HACCP dédiée + technicien référent",
      "Reporting consolidé et engagement de délai (SLA)",
      "Interlocuteur unique et interventions prioritaires",
    ],
  },
]

const COUVERTURE = [
  { titre: "Désinsectisation", desc: "Cafards, fourmis, moustiques, mouches, traitements ciblés et préventifs à chaque passage." },
  { titre: "Dératisation", desc: "Postes d'appâtage sécurisés, suivi des consommations, sécurisation des points d'entrée." },
  { titre: "Désinfection", desc: "Assainissement des locaux avec produits homologués OMS, sur demande et en cas d'alerte." },
  { titre: "Certificat de conformité mensuel", desc: "Le document officiel pour vos inspections HACCP, vos clients et vos partenaires." },
]

const FAQS = [
  { q: "Pourquoi un contrat plutôt que des interventions ponctuelles ?", r: "Les nuisibles reviennent : une intervention unique ne protège pas dans la durée. Le contrat garantit des passages réguliers, une réaction rapide en cas de problème, et surtout un certificat de conformité à jour pour vos inspections, c'est ce qui vous protège vraiment." },
  { q: "Comment se passe l'audit gratuit ?", r: "Un technicien certifié passe sur votre site, inspecte les zones sensibles et vous remet un rapport photo des points critiques. Sans frais et sans engagement. Vous décidez ensuite en connaissance de cause." },
  { q: "Puis-je payer au mois ?", r: "Oui. Nos contrats se règlent mensuellement pour lisser la dépense, plutôt qu'en une seule facture annuelle." },
  { q: "Suis-je engagé longtemps ?", r: "Le contrat est annuel et renouvelable. Les modalités précises (durée, préavis) sont fixées ensemble après l'audit, selon votre établissement." },
  { q: "Le certificat est-il valable pour mon inspection sanitaire ?", r: "Oui. Phyto Bénin est agréé par l'État béninois (APA/26-025/CNGP-BEN) et chaque passage donne lieu à un certificat officiel, opposable lors de vos contrôles HACCP et audits clients." },
]

export default function ContratConformite() {
  const schemaService = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Contrat annuel de conformité sanitaire 3D",
    "name": "Contrat de conformité sanitaire 3D",
    "description": "Contrat annuel de désinsectisation, dératisation et désinfection avec certificat de conformité mensuel pour entreprises au Bénin.",
    "provider": {
      "@type": "LocalBusiness",
      "name": "Phyto Bénin by GSE",
      "url": BASE,
      "telephone": "+22901530 47950",
      "address": { "@type": "PostalAddress", "addressLocality": "Cotonou", "addressCountry": "BJ" },
    },
    "areaServed": { "@type": "Country", "name": "Bénin" },
    "url": CANONICAL,
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Contrats de conformité sanitaire",
      "itemListElement": PALIERS.map((p) => ({
        "@type": "Offer",
        "itemOffered": { "@type": "Service", "name": `Contrat ${p.nom}`, "description": p.cible },
      })),
    },
  }

  const schemaFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQS.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.r },
    })),
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaService) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFAQ) }} />

      {/* HERO */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "72px 60px", position: "relative", overflow: "hidden" }} className="section-padding">
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.05)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "56px", alignItems: "center" }} className="grid-2">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(212,169,32,0.12)", border: "1px solid rgba(212,169,32,0.35)", color: "#d4a920", fontSize: "11px", fontWeight: "700", padding: "6px 14px", borderRadius: "20px", letterSpacing: "0.08em", marginBottom: "24px" }}>
              CONTRAT ANNUEL · AGRÉÉ PAR L'ÉTAT BÉNINOIS
            </div>
            <h1 style={{ fontSize: "clamp(30px, 4vw, 52px)", fontWeight: "700", color: "#ffffff", lineHeight: "1.12", letterSpacing: "-0.02em", marginBottom: "20px" }}>
              Votre conformité sanitaire,
              <br />
              <span style={{ color: "#d4a920" }}>suivie toute l'année.</span>
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.65)", lineHeight: "1.85", maxWidth: "520px", marginBottom: "28px" }}>
              Un seul contrat : désinsectisation, dératisation et désinfection régulières, avec un <strong style={{ color: "#fff" }}>certificat de conformité mensuel</strong> pour vos inspections HACCP. Pensé pour les hôtels, restaurants, agro-industries, cliniques et banques du Bénin.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {["Audit gratuit sur site, sans engagement", "Certificat officiel opposable à vos contrôles", "Rapports et certificats dans votre espace client"].map((t) => (
                <li key={t} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "11px", fontWeight: "900", flexShrink: 0 }}>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div id="audit">
            <AuditForm />
          </div>
        </div>
      </section>

      {/* PROBLÈME */}
      <section style={{ backgroundColor: "#ffffff", padding: "80px 60px" }} className="section-padding">
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>POURQUOI UN CONTRAT</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.25", letterSpacing: "-0.02em", marginBottom: "20px" }}>
            Une intervention ponctuelle ne vous protège pas.
            <br />
            <strong style={{ fontWeight: "700" }}>Un contrat, si.</strong>
          </h2>
          <p style={{ fontSize: "16px", color: "#555", lineHeight: "1.9" }}>
            Un cafard aperçu par un client, une trace de rongeur pendant une inspection, un certificat expiré le jour d'un audit HACCP : le risque n'est pas seulement le nuisible, c'est votre réputation et votre autorisation d'exercer. Le contrat de conformité maintient vos locaux protégés <strong>et</strong> vos documents à jour, en permanence.
          </p>
        </div>
      </section>

      {/* AUDIT GRATUIT */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "80px 60px" }} className="section-padding">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>ÇA COMMENCE ICI</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              L'audit gratuit <strong style={{ fontWeight: "700" }}>sur votre site</strong>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }} className="grid-3">
            {[
              { n: "01", t: "On inspecte", d: "Un technicien certifié passe chez vous et examine les zones sensibles : cuisines, réserves, points d'eau, accès." },
              { n: "02", t: "On documente", d: "Vous recevez un rapport photo des points critiques trouvés, concret, pas une estimation à l'aveugle." },
              { n: "03", t: "Vous décidez", d: "On vous propose le palier adapté. Sans frais et sans engagement : vous choisissez en connaissance de cause." },
            ].map((e) => (
              <div key={e.n} style={{ backgroundColor: "#fff", padding: "32px 28px", borderTop: "3px solid #d4a920" }}>
                <div style={{ fontSize: "12px", color: "#ccc", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>{e.n}</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0a0a0a", marginBottom: "10px" }}>{e.t}</h3>
                <p style={{ fontSize: "14px", color: "#777", lineHeight: "1.7" }}>{e.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PALIERS */}
      <section style={{ backgroundColor: "#ffffff", padding: "80px 60px" }} className="section-padding">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>NOS FORMULES</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Trois paliers, <strong style={{ fontWeight: "700" }}>une seule promesse.</strong>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", alignItems: "stretch" }} className="grid-3">
            {PALIERS.map((p) => (
              <div key={p.nom} style={{ backgroundColor: p.accent ? "#0a2e1a" : "#f7f7f5", border: p.accent ? "2px solid #d4a920" : "1px solid #eee", borderRadius: "10px", padding: "36px 28px", display: "flex", flexDirection: "column", position: "relative" }}>
                {p.accent && (
                  <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "10px", fontWeight: "800", letterSpacing: "0.08em", padding: "5px 14px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                    LE PLUS CHOISI
                  </div>
                )}
                <h3 style={{ fontSize: "22px", fontWeight: "700", color: p.accent ? "#d4a920" : "#0a2e1a", marginBottom: "6px" }}>{p.nom}</h3>
                <div style={{ fontSize: "12px", color: p.accent ? "rgba(255,255,255,0.6)" : "#888", marginBottom: "24px", minHeight: "34px" }}>{p.cible}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px 0", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  {p.points.map((pt) => (
                    <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: p.accent ? "rgba(255,255,255,0.8)" : "#444", lineHeight: "1.6" }}>
                      <span style={{ color: p.accent ? "#d4a920" : "#1a6b38", fontWeight: "700", flexShrink: 0 }}>✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
                <div style={{ fontSize: "13px", fontWeight: "700", color: p.accent ? "#d4a920" : "#0a2e1a", marginBottom: "16px" }}>
                  Tarif sur devis, après audit gratuit
                </div>
                <a href="#audit" style={{ display: "block", textAlign: "center", backgroundColor: p.accent ? "#d4a920" : "#0a2e1a", color: p.accent ? "#0a2e1a" : "#d4a920", fontWeight: "700", fontSize: "13px", padding: "13px", borderRadius: "8px", textDecoration: "none" }}>
                  Réserver mon audit
                </a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: "13px", color: "#999", marginTop: "24px" }}>
            Le tarif dépend de la surface, du secteur et de la fréquence, il est fixé après l'audit gratuit, sans surprise.
          </p>
        </div>
      </section>

      {/* CE QUE COUVRE LE CONTRAT */}
      <section style={{ backgroundColor: "#0a2e1a", padding: "80px 60px" }} className="section-padding">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>CE QUE COUVRE LE CONTRAT</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: "300", color: "#fff", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
              Le <strong style={{ fontWeight: "700", color: "#d4a920" }}>3D</strong> complet, plus le document qui compte.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }} className="grid-4">
            {COUVERTURE.map((c) => (
              <div key={c.titre} style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "28px 24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#d4a920", marginBottom: "10px" }}>{c.titre}</h3>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.7" }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREUVE */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "72px 60px" }} className="section-padding">
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", textAlign: "center" }} className="grid-4">
          {[
            { v: "Agréé", l: "par l'État béninois (APA/26-025/CNGP-BEN)" },
            { v: "+50", l: "établissements protégés" },
            { v: "24h/24", l: "urgences assurées, 7j/7" },
            { v: "100%", l: "des passages certifiés" },
          ].map((s) => (
            <div key={s.l}>
              <div style={{ fontSize: "30px", fontWeight: "700", color: "#0a2e1a" }}>{s.v}</div>
              <div style={{ fontSize: "12px", color: "#777", marginTop: "6px", lineHeight: "1.5" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ backgroundColor: "#ffffff", padding: "80px 60px" }} className="section-padding">
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>QUESTIONS FRÉQUENTES</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: "300", color: "#0a0a0a", letterSpacing: "-0.02em" }}>
              Tout ce qu'il faut <strong style={{ fontWeight: "700" }}>savoir.</strong>
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {FAQS.map((f) => (
              <div key={f.q} style={{ backgroundColor: "#f7f7f5", borderLeft: "3px solid #d4a920", borderRadius: "6px", padding: "22px 26px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0a2e1a", marginBottom: "8px" }}>{f.q}</h3>
                <p style={{ fontSize: "14px", color: "#555", lineHeight: "1.75" }}>{f.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTICULIERS */}
      <section style={{ backgroundColor: "#f7f7f5", padding: "64px 60px" }} className="section-padding">
        <div style={{ maxWidth: "980px", margin: "0 auto", backgroundColor: "#fff", border: "1px solid #eee", borderLeft: "4px solid #d4a920", borderRadius: "10px", padding: "36px 40px" }}>
          <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "12px" }}>VOUS ÊTES UN PARTICULIER ?</div>
          <h2 style={{ fontSize: "clamp(22px, 2.6vw, 30px)", fontWeight: "300", color: "#0a0a0a", lineHeight: "1.25", letterSpacing: "-0.01em", marginBottom: "12px" }}>
            On protège aussi <strong style={{ fontWeight: "700" }}>votre maison.</strong>
          </h2>
          <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.8", marginBottom: "24px", maxWidth: "640px" }}>
            Cafards, termites, serpents ou punaises de lit chez vous ? Pas besoin de contrat : intervention rapide à domicile, devis gratuit, techniciens certifiés. Dites-nous ce qu'il vous faut.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
            {[
              { label: "Cafards & insectes", href: "/services/desinsectisation-cotonou" },
              { label: "Punaises de lit", href: "/services/punaises-de-lit-cotonou" },
              { label: "Serpents & reptiles", href: "/services/reptiles-serpents-benin" },
              { label: "Termites", href: "/services/anti-termites-benin" },
              { label: "Rats & souris", href: "/services/deratisation-benin" },
            ].map((c) => (
              <a key={c.href} href={c.href} style={{ fontSize: "13px", fontWeight: "600", color: "#0a2e1a", backgroundColor: "#f7f7f5", border: "1px solid #e5e5e5", padding: "8px 14px", borderRadius: "20px", textDecoration: "none" }}>
                {c.label}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a href="/contact" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "700", fontSize: "14px", padding: "13px 24px", borderRadius: "6px", textDecoration: "none" }}>
              Demander une intervention à domicile
            </a>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ backgroundColor: "#020904", padding: "88px 60px", textAlign: "center" }} className="section-padding">
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: "300", color: "#fff", lineHeight: "1.15", letterSpacing: "-0.02em", marginBottom: "20px" }}>
            Commencez par l'audit.
            <br />
            <strong style={{ fontWeight: "700", color: "#d4a920" }}>C'est gratuit.</strong>
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)", lineHeight: "1.85", marginBottom: "36px" }}>
            Un technicien passe, inspecte et vous remet un rapport photo. Vous verrez par vous-même ce qu'il y a à protéger.
          </p>
          <a href="#audit" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "15px", padding: "16px 40px", borderRadius: "6px", textDecoration: "none" }}>
            Réserver mon audit gratuit
          </a>
        </div>
      </section>
    </main>
  )
}
