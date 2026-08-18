import type { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"
import FormCandidature from "./FormCandidature"

export const revalidate = 300
const BASE = "https://www.phyto-benin.com"

export const metadata: Metadata = {
  title: "Recrutement | Phyto Bénin by GSE",
  description: "GSE Phyto-Bénin recrute au Bénin. Découvrez nos offres d'emploi et postulez en ligne avec votre CV.",
  alternates: { canonical: `${BASE}/recrutement` },
  openGraph: {
    title: "GSE Phyto-Bénin recrute",
    description: "Découvrez nos offres d'emploi et postulez en ligne.",
    url: `${BASE}/recrutement`,
    siteName: "Phyto Bénin by GSE",
    locale: "fr_FR",
    type: "website",
  },
}

async function getOffres() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await sb
      .from("offres_emploi")
      .select("id, titre, description, profil, contrat, lieu, pourquoi_postuler, futur_employeur, avantages, deplacements, temps_travail, salaire_min, salaire_max, salaire_devise, salaire_periode, salaire_visible, est_stage, stage_duree, stage_gratifie, stage_montant, stage_profil")
      .eq("actif", true)
      .order("created_at", { ascending: false })
    return data || []
  } catch {
    return []
  }
}

// Rend un texte multi-lignes : lignes en -,*,• => puces, sinon paragraphes.
function renderTexte(txt?: string) {
  if (!txt) return null
  return String(txt).split("\n").map((l, i) => {
    const t = l.trim()
    if (!t) return null
    if (/^[-*•]\s?/.test(t)) return (
      <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
        <span style={{ color: "#d4a920", flexShrink: 0 }}>•</span>
        <span style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{t.replace(/^[-*•]\s?/, "")}</span>
      </div>
    )
    return <p key={i} style={{ fontSize: "14px", color: "#333", lineHeight: 1.8, marginBottom: "10px" }}>{t}</p>
  })
}

function fmtRemuneration(o: any): string {
  if (o.salaire_visible === false) return "Rémunération selon profil"
  const dev = o.salaire_devise || "FCFA"
  const per = o.salaire_periode || "mois"
  const f = (n: number) => Number(n).toLocaleString("fr-FR")
  if (o.salaire_min && o.salaire_max) return `${f(o.salaire_min)} à ${f(o.salaire_max)} ${dev}/${per}`
  if (o.salaire_min) return `À partir de ${f(o.salaire_min)} ${dev}/${per}`
  if (o.salaire_max) return `Jusqu'à ${f(o.salaire_max)} ${dev}/${per}`
  return "Rémunération selon profil"
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#0a2e1a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px", borderLeft: "3px solid #d4a920", paddingLeft: "10px" }}>{titre}</h4>
      {children}
    </div>
  )
}

function RLigne({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: "8px", fontSize: "14px", color: "#333", lineHeight: 1.6 }}><span style={{ color: "#d4a920", flexShrink: 0 }}>•</span><span>{children}</span></div>
}

export default async function Page() {
  const offres = await getOffres()
  const shareUrl = `${BASE}/recrutement`
  const enc = encodeURIComponent
  const shareText = "GSE Phyto-Bénin recrute. Découvrez les offres et postulez :"
  const partages = [
    { label: "WhatsApp", bg: "#25D366", href: `https://wa.me/?text=${enc(shareText + " " + shareUrl)}` },
    { label: "Facebook", bg: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}` },
    { label: "LinkedIn", bg: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}` },
    { label: "X", bg: "#0a0a0a", href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(shareText)}` },
  ]

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        .rec-pad { padding: 64px 60px; }
        @media (max-width: 768px) { .rec-pad { padding: 40px 20px !important; } .rec-grid2 { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* EN-TÊTE */}
      <section className="rec-pad" style={{ backgroundColor: "#0a2e1a" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <a href="/" style={{ display: "inline-flex", gap: "6px", fontSize: "12px", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: "20px" }}>← Accueil</a>
          <h1 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 700, color: "#fff", lineHeight: 1.25, marginBottom: "14px" }}>Rejoignez GSE Phyto-Bénin</h1>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.65)", lineHeight: 1.8, maxWidth: "640px" }}>
            Nous protégeons les foyers et les entreprises du Bénin contre les nuisibles. Pour accompagner notre croissance, nous recrutons des profils motivés. Découvrez nos offres et postulez en ligne.
          </p>
        </div>
      </section>

      {/* OFFRES */}
      <section className="rec-pad" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0a0a0a", marginBottom: "24px" }}>Nos offres ouvertes</h2>

          {offres.length === 0 ? (
            <div style={{ backgroundColor: "#f7f7f5", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "28px", color: "#666", fontSize: "14px" }}>
              Aucune offre ouverte pour le moment. Vous pouvez tout de même nous envoyer une candidature spontanée ci-dessous.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "24px" }}>
              {offres.map((o: any) => (
                <article key={o.id} style={{ backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "12px", padding: "28px 30px" }}>
                  <h3 style={{ fontSize: "22px", fontWeight: 700, color: "#0a2e1a", marginBottom: "6px" }}>{o.titre}</h3>
                  <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px", color: "#888", marginBottom: "20px" }}>
                    {o.contrat && <span>📄 {o.contrat}</span>}
                    {o.lieu && <span>📍 {o.lieu}</span>}
                    {o.est_stage && <span>🎓 Stage</span>}
                  </div>

                  {o.pourquoi_postuler && <Section titre="Pourquoi postuler">{renderTexte(o.pourquoi_postuler)}</Section>}
                  {o.description && <Section titre="Vos missions">{renderTexte(o.description)}</Section>}
                  {o.profil && <Section titre="Votre profil">{renderTexte(o.profil)}</Section>}
                  {o.futur_employeur && <Section titre="Votre futur employeur">{renderTexte(o.futur_employeur)}</Section>}

                  <Section titre="En résumé">
                    <div style={{ display: "grid", gap: "6px" }}>
                      {(o.contrat || o.temps_travail) && <RLigne>{[o.contrat, o.temps_travail].filter(Boolean).join(", ")}</RLigne>}
                      {o.est_stage && <RLigne>Stage{o.stage_duree ? ` de ${o.stage_duree}` : ""}{o.stage_gratifie ? `, gratifié${o.stage_montant ? ` (${Number(o.stage_montant).toLocaleString("fr-FR")} FCFA)` : ""}` : (o.stage_gratifie === false ? ", non gratifié" : "")}</RLigne>}
                      {o.est_stage && o.stage_profil && <RLigne>Profil recherché : {o.stage_profil}</RLigne>}
                      {o.lieu && <RLigne>Basé à {o.lieu}</RLigne>}
                      <RLigne>{fmtRemuneration(o)}</RLigne>
                      {o.avantages && <RLigne>Avantages : {o.avantages}</RLigne>}
                      {o.deplacements && <RLigne>Déplacements : {o.deplacements}</RLigne>}
                    </div>
                  </Section>

                  <a href="#postuler" style={{ display: "inline-block", marginTop: "6px", backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: 700, fontSize: "13px", padding: "12px 24px", borderRadius: "6px", textDecoration: "none" }}>Postuler à cette offre →</a>
                </article>
              ))}
            </div>
          )}

          {/* PARTAGE : diffuser les offres */}
          <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #eee", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0a2e1a" }}>Partager ces offres</span>
            {partages.map((p) => (
              <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer" aria-label={"Partager sur " + p.label}
                style={{ backgroundColor: p.bg, color: "#fff", fontSize: "12px", fontWeight: 600, padding: "8px 16px", borderRadius: "6px", textDecoration: "none" }}>
                {p.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FORMULAIRE */}
      <section className="rec-pad" style={{ backgroundColor: "#f7f7f5" }}>
        <FormCandidature offres={offres.map((o: any) => ({ id: o.id, titre: o.titre }))} />
      </section>
    </main>
  )
}
