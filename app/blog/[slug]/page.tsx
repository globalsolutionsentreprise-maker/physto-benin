"use client"
import { useState, useEffect, use } from "react"
import { supabase } from "../../lib/supabase"

function slugifier(titre: string): string {
  return titre
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [article, setArticle] = useState<any>(null)
  const [autres, setAutres] = useState<any[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(function() {
    async function charger() {
      setChargement(true)
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("id")

      if (error) {
        console.error("Erreur Supabase:", error)
        setChargement(false)
        return
      }

      if (data && data.length > 0) {
        const trouve = data.find(function(a: any) {
          return slugifier(a.titre) === slug
        })
        setArticle(trouve || null)
        setAutres(data.filter(function(a: any) {
          return slugifier(a.titre) !== slug
        }).slice(0, 3))
      }
      setChargement(false)
    }
    charger()
  }, [slug])

  if (chargement) {
    return (
      <main style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "14px", color: "#888" }}>Chargement de l'article...</div>
      </main>
    )
  }

  if (!article) {
    return (
      <main style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", padding: "40px 20px" }}>
        <div style={{ fontSize: "48px" }}>😕</div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111", textAlign: "center" }}>Article introuvable</h1>
        <a href="/blog" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "600", fontSize: "13px", padding: "12px 24px", borderRadius: "6px", textDecoration: "none" }}>
          Retour au blog
        </a>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <style>{`
        .article-pad { padding: 60px 60px 48px; }
        .content-pad { padding: 64px 60px; }
        .autres-pad { padding: 64px 60px; }
        .grid-3-art { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .cta-art { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; }
        @media (max-width: 768px) {
          .article-pad { padding: 40px 20px 32px !important; }
          .content-pad { padding: 40px 20px !important; }
          .autres-pad { padding: 40px 20px !important; }
          .grid-3-art { grid-template-columns: 1fr !important; }
          .cta-art { flex-direction: column !important; text-align: center; }
          .cta-art div { justify-content: center !important; }
        }
      `}</style>

      {/* EN-TÊTE */}
      <section className="article-pad" style={{ backgroundColor: "#0a2e1a" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <a href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: "24px" }}>
            ← Retour au blog
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.1em", backgroundColor: "rgba(212,169,32,0.1)", padding: "5px 12px", borderRadius: "4px" }}>
              {article.categorie}
            </span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{article.date}</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{article.lecture || "5 min"} de lecture</span>
          </div>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 38px)", fontWeight: "700", color: "#ffffff", lineHeight: "1.3", letterSpacing: "-0.01em", marginBottom: "16px" }}>
            {article.titre}
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)", lineHeight: "1.8" }}>
            {article.resume}
          </p>
        </div>
      </section>

      {/* CONTENU */}
      <section className="content-pad" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {article.contenu && article.contenu.trim() !== "" ? (
            <div style={{ fontSize: "16px", color: "#333", lineHeight: "1.9" }}>
              {article.contenu.split("\n").map(function(para: string, i: number) {
                if (!para.trim()) return <br key={i} />
                if (para.startsWith("# ")) return (
                  <h2 key={i} style={{ fontSize: "24px", fontWeight: "700", color: "#0a0a0a", marginTop: "40px", marginBottom: "16px", letterSpacing: "-0.01em" }}>
                    {para.replace("# ", "")}
                  </h2>
                )
                if (para.startsWith("## ")) return (
                  <h3 key={i} style={{ fontSize: "18px", fontWeight: "700", color: "#0a0a0a", marginTop: "32px", marginBottom: "12px" }}>
                    {para.replace("## ", "")}
                  </h3>
                )
                if (para.startsWith("- ")) return (
                  <li key={i} style={{ fontSize: "15px", color: "#444", marginBottom: "8px", marginLeft: "20px", lineHeight: "1.7" }}>
                    {para.replace("- ", "")}
                  </li>
                )
                return <p key={i} style={{ marginBottom: "20px" }}>{para}</p>
              })}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "16px", color: "#555", lineHeight: "1.9", marginBottom: "24px" }}>{article.resume}</p>
              <div style={{ backgroundColor: "#f7f7f5", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "32px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>✍️</div>
                <p style={{ fontSize: "14px", color: "#888", marginBottom: "20px" }}>
                  Le contenu complet de cet article est en cours de rédaction.
                  <br />Revenez bientôt ou contactez-nous directement.
                </p>
                <a href="/contact" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "600", fontSize: "13px", padding: "12px 24px", borderRadius: "6px", textDecoration: "none" }}>
                  Nous contacter
                </a>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="cta-art" style={{ backgroundColor: "#0a2e1a", borderRadius: "12px", padding: "40px", marginTop: "64px", display: "flex" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#ffffff", marginBottom: "8px" }}>
                Vous avez un problème similaire ?
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
                Nos techniciens certifiés interviennent rapidement dans tout le Bénin.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a href="/contact" style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontWeight: "700", fontSize: "13px", padding: "12px 24px", borderRadius: "6px", textDecoration: "none" }}>
                Demander une intervention
              </a>
              <a href="https://wa.me/2290153047950" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#25d366", color: "#ffffff", fontWeight: "700", fontSize: "13px", padding: "12px 24px", borderRadius: "6px", textDecoration: "none" }}>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* AUTRES ARTICLES */}
      {autres.filter(a => a.contenu && a.contenu.trim() !== "").length > 0 && (
        <section className="autres-pad" style={{ backgroundColor: "#f7f7f5" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0a0a0a", marginBottom: "32px" }}>
              Autres articles
            </h2>
            <div className="grid-3-art">
              {autres.filter(a => a.contenu && a.contenu.trim() !== "").map(function(a) {
                return (
                  <a key={a.id} href={"/blog/" + slugifier(a.titre)} style={{ textDecoration: "none", backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px", display: "block", borderBottom: "3px solid #d4a920" }}>
                    <div style={{ fontSize: "9px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "8px" }}>{a.categorie}</div>
                    <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#0a0a0a", lineHeight: "1.4", marginBottom: "8px" }}>{a.titre}</h3>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>{a.date}</div>
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}

    </main>
  )
}
