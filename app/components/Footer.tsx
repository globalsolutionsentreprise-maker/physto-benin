"use client"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
export default function Footer() {
  const [coord, setCoord] = useState({ email: "globalsolutionsentreprise@gmail.com", telephone: "+229 01 53 04 79 50", adresse: "Cotonou, Bénin", whatsapp: "2290153047950" })
  useEffect(function() {
    supabase.from("parametres").select("cle, valeur").then(function({ data }: { data: any }) {
      if (data) {
        const map: Record<string,string> = {}
        data.forEach(function(p: any) { map[p.cle] = p.valeur })
        setCoord({ email: map.email || coord.email, telephone: map.telephone || coord.telephone, adresse: map.adresse || coord.adresse, whatsapp: map.whatsapp || coord.whatsapp })
      }
    })
  }, [])
  return (
    <footer className="footer-padding" style={{ backgroundColor: "#f9f9f9", padding: "56px 40px 28px" }}>
      <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "40px", marginBottom: "40px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <img src="/logo-gse.jpeg" alt="Logo" style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "8px" }} />
            <div><div style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a" }}>PHYSTO Benin</div><div style={{ fontSize: "10px", color: "#888" }}>Global Solutions Entreprise</div></div>
          </div>
          <p style={{ fontSize: "12px", color: "#888", lineHeight: "1.8" }}>Spécialiste hygiène sanitaire et phytosanitaire au Bénin.</p>
        </div>
        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Nos services</h4>
          {["Désinsectisation","Dératisation","Désinfection","Anti-termites","Reptiles"].map(function(s) { return <a key={s} href="/services" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{s}</a> })}
        </div>
        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Entreprise</h4>
          <a href="/qui-sommes-nous" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Qui sommes-nous</a>
          <a href="/blog" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Blog</a>
          <a href="/contact" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Contact</a>
        </div>
        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Contact</h4>
          <span style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px" }}>{coord.adresse}</span>
          <a href={"tel:"+coord.telephone.replace(/\s/g,"")} style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{coord.telephone}</a>
          <a href={"https://wa.me/"+coord.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>WhatsApp</a>
          <a href={"mailto:"+coord.email} style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{coord.email}</a>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #eee", paddingTop: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <p style={{ fontSize: "11px", color: "#aaa" }}>{new Date().getFullYear()} PHYSTO by GSE — Tous droits réservés</p>
        <a href="/mentions-legales" style={{ fontSize: "11px", color: "#aaa", textDecoration: "none" }}>Mentions légales</a>
        <div style={{ display: "flex", gap: "8px" }}>
          {["Produits certifiés","Agréés par l'État","24h/24"].map(function(c) { return <span key={c} style={{ fontSize: "10px", backgroundColor: "#fff", border: "1px solid #eee", padding: "3px 10px", borderRadius: "4px", color: "#aaa" }}>{c}</span> })}
        </div>
      </div>
    </footer>
  )
}
