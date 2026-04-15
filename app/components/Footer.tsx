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

export default function Footer() {
  const [coord, setCoord] = useState({
    email: "globalsolutionsentreprise@gmail.com",
    telephone: "+229 01 53 04 79 50",
    adresse: "Cotonou, Bénin",
    whatsapp: "22953047950"
  })

  useEffect(function() {
    const db = creerSupabase()
    async function charger() {
      const { data } = await db.from("parametres").select("cle, valeur")
      if (data) {
        const map: Record<string, string> = {}
        data.forEach(function(p: any) { map[p.cle] = p.valeur })
        setCoord({
          email: map.email || "globalsolutionsentreprise@gmail.com",
          telephone: map.telephone || "+229 01 53 04 79 50",
          adresse: map.adresse || "Cotonou, Bénin",
          whatsapp: map.whatsapp || "22953047950"
        })
      }
    }
    charger()
  }, [])

  return (
    <footer className="footer-padding" style={{ backgroundColor: "#f9f9f9", padding: "56px 40px 28px" }}>
      <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "40px", marginBottom: "40px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <img src="/logo-gse.jpeg" alt="Logo PHYSTO Benin" style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "8px" }} />
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a" }}>PHYSTO Benin</div>
              <div style={{ fontSize: "10px", color: "#888" }}>Global Solutions Entreprise</div>
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "#888", lineHeight: "1.8" }}>
            Specialiste hygiene sanitaire et phytosanitaire au Benin. Intervention rapide, produits certifies, resultats probants.
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Nos services</h4>
          {["Desinsectisation", "Deratisation", "Desinfection", "Anti-termites", "Reptiles et Serpents"].map(function(s) {
            return <a key={s} href="/services" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{s}</a>
          })}
        </div>

        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Entreprise</h4>
          {[
            { label: "Qui sommes-nous", href: "/qui-sommes-nous" },
            { label: "Blog et Conseils", href: "/blog" },
            { label: "Contact", href: "/contact" },
          ].map(function(l) {
            return <a key={l.label} href={l.href} style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{l.label}</a>
          })}
        </div>

        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Contact</h4>
          <a href="/contact" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{coord.adresse}</a>
          <a href={"tel:" + coord.telephone.replace(/\s/g, "")} style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{coord.telephone}</a>
          <a href={"https://wa.me/" + coord.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>WhatsApp</a>
          <a href={"mailto:" + coord.email} style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{coord.email}</a>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <p style={{ fontSize: "11px", color: "#aaa" }}>2025 PHYSTO Benin — Global Solutions Entreprise — Tous droits reserves</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["Produits certifies", "Agrees par l Etat", "Resultats probants", "24h/24"].map(function(c) {
            return <span key={c} style={{ fontSize: "10px", backgroundColor: "#fff", border: "1px solid #eee", padding: "3px 10px", borderRadius: "4px", color: "#aaa" }}>{c}</span>
          })}
        </div>
      </div>
    </footer>
  )
}
