"use client"
import Image from "next/image"
import { usePathname } from "next/navigation"

// En-tête public (barre de navigation + bandeau offre de bienvenue).
// Masqué sur /fiche (formulaire technicien terrain, sans chrome marketing),
// comme WhatsAppFloat se masque sur l'admin.
export default function SiteHeader() {
  const pathname = usePathname() || ""
  if (pathname.startsWith("/fiche")) return null
  return (
    <>
      {/* NAVBAR */}
      <nav style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="nav-padding" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 40px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", flexShrink: 0 }}>
            <Image src="/logo-gse.jpeg" alt="Logo Global Solutions Entreprise" width={44} height={44} priority className="logo-anime" style={{ objectFit: "contain", borderRadius: "8px" }} />
            <div className="nav-brand-text">
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0a2e1a" }}>Phyto Bénin <span className="nav-brand-by" style={{ color: "#d4a920" }}>by</span> GSE</div>
              <div style={{ fontSize: "10px", color: "#888" }}>Global Solutions Entreprise</div>
              <div className="nav-agrement-mobile" style={{ fontSize: "9px", color: "#d4a920", fontWeight: "700", marginTop: "1px" }}>✓ APA/26-025/CNGP-BEN</div>
            </div>
          </a>

          <div className="nav-desktop" style={{ alignItems: "center", gap: "28px" }}>
            {[
              { label: "Accueil", href: "/" },
              { label: "Services", href: "/services" },
              { label: "Nuisibles", href: "/nuisibles" },
              { label: "Contrat conformité", href: "/contrat-conformite" },
              { label: "Qui sommes-nous", href: "/qui-sommes-nous" },
              { label: "Blog", href: "/blog" },
              { label: "Recrutement", href: "/recrutement" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <a key={l.href} href={l.href} style={{ fontSize: "12px", color: "#444", textDecoration: "none", fontWeight: "500" }}>
                {l.label}
              </a>
            ))}
          </div>

          <div className="nav-desktop" style={{ alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", backgroundColor: "#f0fdf4", border: "1px solid rgba(10,46,26,0.18)", padding: "6px 12px", borderRadius: "5px", marginRight: "4px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "10px", fontWeight: "900", flexShrink: 0 }}>✓</span>
              <div>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#0a2e1a", letterSpacing: "0.07em", lineHeight: 1.1, whiteSpace: "nowrap" }}>AGRÉÉ PAR L'ÉTAT BÉNINOIS</div>
                <div style={{ fontSize: "8.5px", color: "#1a6b38", letterSpacing: "0.05em", marginTop: "1px" }}>Autorités sanitaires du Bénin</div>
                <div style={{ fontSize: "8.5px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.04em", marginTop: "1px" }}>APA/26-025/CNGP-BEN</div>
              </div>
            </div>
            <a href="/espace-client" style={{ fontSize: "11px", fontWeight: "700", color: "#0a2e1a", textDecoration: "none", border: "0.5px solid #d4a920", padding: "7px 14px", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Espace client</a>
            <a href="/contact" style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#1a6b38", color: "#fff", fontSize: "12px", fontWeight: "600", padding: "9px 16px", borderRadius: "8px", textDecoration: "none" }}>
              Devis gratuit
            </a>
          </div>

          <div className="nav-mobile-btn" style={{ display: "none", alignItems: "center", gap: "8px" }}>
            <a href="/contact" style={{ backgroundColor: "#1a6b38", color: "#fff", fontSize: "11px", fontWeight: "600", padding: "8px 12px", borderRadius: "8px", textDecoration: "none" }}>
              Devis
            </a>
          </div>
        </div>
      </nav>

      {/* OFFRE DE BIENVENUE */}
      <div style={{ backgroundColor: "#1a6b38", padding: "9px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "#d4a920", color: "#0a2e1a", fontSize: "10px", fontWeight: "800", padding: "3px 9px", borderRadius: "20px", letterSpacing: "0.06em", flexShrink: 0 }}>−10%</span>
          <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "400" }}>
            Offre de bienvenue, <strong>10% de remise</strong> sur votre premier traitement · Pour toute première demande
          </span>
        </div>
        <a href="/contact" style={{ color: "#d4a920", fontSize: "11px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap", letterSpacing: "0.04em", flexShrink: 0 }}>
          En profiter →
        </a>
      </div>
    </>
  )
}
