"use client"
import { useState, useEffect, use } from "react"
import { createClient } from "@supabase/supabase-js"

function creerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

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
    const db = creerSupabase()
    async function charger() {
      const { data } = await db.from("articles").select("*").order("id")
      if (data && data.length > 0) {
        const trouve = data.find(function(a) {
          return slugifier(a.titre) === slug
        })
        setArticle(trouve || null)
        setAutres(data.filter(function(a) {
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
        <div style={{ fontSize: "14px", color: "#888" }}>Chargement...</div>
      </main>
    )
  }

  if (!article) {
    return (
      <main style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
        <div style={{ fontSize: "48px" }}>😕</div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111" }}>Article introuvable</h1>
        <a href="/blog" style={{ backgroundColor: "#0a2e1a", color: "#d4a920", fontWeight: "600", fontSize: "13px", padding: "12px 24px", borderRadius: "6px", textDecoration: "none" }}>
          Retour au blog
        </a>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <section style={{ backgroundColor: "#0a2e1a", padding: "60px 60px 48px" }}>
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
          <h1 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "700", color: "#ffffff", lineHeight: "1.3", letterSpacing: "-0.01em", marginBottom: "16px" }}>
            {article.titre}
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)", lineHeight: "1.8" }}>
            {article.resume}
          </p>
        </div>
      </section>

      <section style={{ backgroundColor: "#ffffff", padding: "64px 60px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {article.contenu ? (
            <div style={{ fontSize: "16px", color: "#333", lineHeight: "1.9" }}>
              {article.contenu.split("\n").map(function(para: string, i: number) {
                if (!para.trim()) return <br key={i} />
                if (para.startsWith("# ")) return <h2 key={i} style={{ fontSize: "24px", fontWeight: "700", color: "#0a0a0a", marginTop: "40px", marginBottom: "16px" }}>{para.replace("# ", "")}</h2>
                if (para.startsWith("## ")) return <h3 key={i} style={{ fontSize: "18px", fontWeight: "700", color: "#0a0a0a", marginTop: "32px", marginBottom: "12px" }}>{para.replace("## ", "")}</h3>
                if (para.startsWith("- ")) return <li key={i} style={{ fontSize: "15px", color: "#444", marginBottom: "8px", marginLeft: "20px" }}>{para.replace("- ", "")}</li>
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

          <div style={{ backgroundColor: "#0a2e1a", borderRadius: "12px", padding: "40px", marginTop: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#ffffff", marginBottom: "8px" }}>Vous avez un problème similaire ?</h3>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>Nos techniciens certifiés interviennent rapidement dans tout le Bénin.</p>
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

      {autres.length > 0 && (
        <section style={{ backgroundColor: "#f7f7f5", padding: "64px 60px" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0a0a0a", marginBottom: "32px" }}>Autres articles</h2>
            <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {autres.map(function(a) {
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
