import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

// Carte OpenGraph de marque, générée au build (statique, mise en cache).
// Devient l'image de partage par défaut de toutes les pages du site.
export const alt = "Phyto Bénin by GSE, Hygiène sanitaire professionnelle au Bénin"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const VERT = "#0a2e1a"
const OR = "#d4a920"

export default async function Image() {
  // Logo embarqué en base64 (runtime Node.js, chemin relatif à la racine projet)
  let logoSrc = ""
  try {
    const logo = await readFile(join(process.cwd(), "public/logo-gse.jpeg"), "base64")
    logoSrc = `data:image/jpeg;base64,${logo}`
  } catch {
    logoSrc = ""
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: VERT,
          padding: "70px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Barre d'accent haut */}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: "100%", height: "10px", backgroundColor: OR }} />

        {/* En-tête : logo + marque */}
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          {logoSrc ? (
            <img src={logoSrc} width={84} height={84} style={{ borderRadius: "14px", objectFit: "contain" }} />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: "38px", fontWeight: 700, color: "#ffffff" }}>
              Phyto Bénin <span style={{ color: OR, marginLeft: "10px" }}>by GSE</span>
            </div>
            <div style={{ display: "flex", fontSize: "20px", color: "rgba(255,255,255,0.55)" }}>
              Global Solutions Entreprise
            </div>
          </div>
        </div>

        {/* Titre principal */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "20px", fontWeight: 700, letterSpacing: "3px", color: OR, marginBottom: "18px" }}>
            HYGIÈNE SANITAIRE PROFESSIONNELLE AU BÉNIN
          </div>
          <div style={{ display: "flex", fontSize: "76px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
            Désinsectisation.
          </div>
          <div style={{ display: "flex", fontSize: "76px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
            Dératisation. <span style={{ color: OR, marginLeft: "18px" }}>Désinfection.</span>
          </div>
          <div style={{ display: "flex", fontSize: "26px", color: "rgba(255,255,255,0.7)", marginTop: "22px" }}>
            Techniciens certifiés · Produits homologués OMS · Intervention 24h/24
          </div>
        </div>

        {/* Pied : agrément + site */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 700,
              color: VERT,
              backgroundColor: OR,
              padding: "12px 26px",
              borderRadius: "8px",
            }}
          >
            AGRÉÉ PAR L'ÉTAT BÉNINOIS
          </div>
          <div style={{ display: "flex", fontSize: "24px", fontWeight: 600, color: "#ffffff" }}>
            www.phyto-benin.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
