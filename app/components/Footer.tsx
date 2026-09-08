"use client"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
export default function Footer() {
  const [coord, setCoord] = useState({ email: "contact@phyto-benin.com", telephone: "", adresse: "Cotonou, Bénin", whatsapp: "", facebook: "", instagram: "", tiktok: "", linkedin: "" })
  useEffect(function() {
    supabase.from("parametres").select("cle, valeur").then(function({ data }: { data: any }) {
      if (data) {
        const map: Record<string,string> = {}
        data.forEach(function(p: any) { map[p.cle] = p.valeur })
        setCoord({ email: map.email || coord.email, telephone: map.telephone || coord.telephone, adresse: map.adresse || coord.adresse, whatsapp: map.whatsapp || coord.whatsapp, facebook: map.facebook || "", instagram: map.instagram || "", tiktok: map.tiktok || "", linkedin: map.linkedin || "" })
      }
    })
  }, [])
  // Réseaux sociaux : rendus uniquement pour les comptes renseignés dans `parametres`
  // (clés facebook / instagram / tiktok / linkedin). Aucune URL en dur.
  const SOCIAL_ICONS: Record<string,string> = {
    facebook: "M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z",
    instagram: "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2zm6.3-8.2a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0z",
    tiktok: "M16.5 3c.3 2.1 1.5 3.4 3.5 3.5v2.4c-1.2.1-2.3-.3-3.5-1v6.6c0 3.3-2.4 5.5-5.4 5.5-2.8 0-4.9-2-4.9-4.7 0-2.9 2.3-4.8 5.4-4.6v2.5c-.5-.1-1-.1-1.5 0-1.1.2-1.8 1-1.7 2.1.1 1.1 1 1.8 2.1 1.7 1.2-.1 1.9-1 1.9-2.4V3h3.6z",
    linkedin: "M6.9 8.8H3.6V21h3.3V8.8zM5.2 3.5A1.9 1.9 0 1 0 5.2 7.3a1.9 1.9 0 0 0 0-3.8zM21 21v-6.7c0-3.3-1.8-4.9-4.1-4.9-1.9 0-2.8 1-3.2 1.8V8.8H10.4c.1.9 0 12.2 0 12.2h3.3v-6.8c0-.4 0-.7.1-1 .3-.7.9-1.4 1.9-1.4 1.4 0 1.9 1 1.9 2.6V21H21z",
  }
  const socials = (["facebook","instagram","tiktok","linkedin"] as const)
    .map(function(k) { return { k, url: (coord as any)[k] as string } })
    .filter(function(s) { return s.url })
  return (
    <footer className="footer-padding" style={{ backgroundColor: "#f9f9f9", padding: "56px 40px 28px" }}>
      <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "40px", marginBottom: "40px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <img src="/logo-gse.jpeg" alt="Logo Phyto Bénin by GSE, Hygiène sanitaire et phytosanitaire au Bénin" className="logo-anime" style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "8px" }} />
            <div className="nav-brand-text"><div style={{ fontSize: "13px", fontWeight: "700", color: "#0a2e1a" }}>Phyto Bénin</div><div style={{ fontSize: "10px", color: "#888" }}>Global Solutions Entreprise</div></div>
          </div>
          <p style={{ fontSize: "12px", color: "#888", lineHeight: "1.8" }}>Spécialiste hygiène sanitaire et phytosanitaire au Bénin.</p>
          {socials.length > 0 && (
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              {socials.map(function(s) { return (
                <a key={s.k} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.k} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#0a2e1a", textDecoration: "none" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="#d4a920" aria-hidden="true"><path d={SOCIAL_ICONS[s.k]} /></svg>
                </a>
              ) })}
            </div>
          )}
        </div>
        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Nos services</h4>
          {["Désinsectisation","Dératisation","Désinfection","Anti-termites","Reptiles"].map(function(s) { return <a key={s} href="/services" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{s}</a> })}
        </div>
        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Zones d&apos;intervention</h4>
          <a href="/zones/abomey-calavi" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Abomey-Calavi</a>
          <a href="/zones/porto-novo" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Porto-Novo</a>
          <a href="/zones/ouidah" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Ouidah</a>
          <a href="/zones" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Toutes nos zones</a>
        </div>
        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Entreprise</h4>
          <a href="/qui-sommes-nous" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Qui sommes-nous</a>
          <a href="/blog" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Blog</a>
          <a href="/recrutement" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Recrutement</a>
          <a href="/contact" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Contact</a>
        </div>
        <div>
          <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "16px" }}>Contact</h4>
          <span style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px" }}>{coord.adresse}</span>
          <a href="/contact" style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>Demander un devis</a>
          <a href={"mailto:"+coord.email} style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "9px", textDecoration: "none" }}>{coord.email}</a>
          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #eee" }}>
            <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "7px" }}>PAIEMENT ACCEPTÉ</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ backgroundColor: "#ffcc00", borderRadius: "5px", padding: "3px 7px", fontSize: "11px", fontWeight: "700", color: "#111", letterSpacing: "0.02em" }}>MTN MoMo</span>
              <span style={{ fontSize: "11px", color: "#888", fontFamily: "monospace" }}>*880*41*893118*<span style={{ color: "#b45309", fontWeight: "700" }}>montant</span>#</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #eee", paddingTop: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <p style={{ fontSize: "11px", color: "#aaa" }}>{new Date().getFullYear()} Phyto Bénin by GSE, Tous droits réservés</p>
        <a href="/mentions-legales" style={{ fontSize: "11px", color: "#aaa", textDecoration: "none" }}>Mentions légales</a>
        <div style={{ display: "flex", gap: "8px" }}>
          {["Produits certifiés","Agréés par l'État","24h/24"].map(function(c) { return <span key={c} style={{ fontSize: "10px", backgroundColor: "#fff", border: "1px solid #eee", padding: "3px 10px", borderRadius: "4px", color: "#aaa" }}>{c}</span> })}
        </div>
      </div>
    </footer>
  )
}
