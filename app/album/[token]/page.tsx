"use client"

import { use, useEffect, useState } from "react"

// Album public des médias d'une intervention (photos + vidéos), ouvert par le
// client via le lien en fin de rapport. Gardé par un jeton d'album non devinable
// (fiches_passage.album_token). Mobile-first, sans login. Le chrome marketing
// (nav, footer, WhatsApp) est masqué sur /album via usePathname dans les
// composants concernés.

const VERT = "#0a2e1a"
const OR = "#d4a920"

type Media = { url: string; type: string; name: string; note: string }
type Album = { client: string; lieu: string; date: string; dateFin: string; numero: string; medias: Media[] }

function dateFr(d: string) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : ""
}

export default function AlbumPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<Album | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/album?token=" + encodeURIComponent(token))
      .then((r) => r.json())
      .then((d) => { if (d.error) setErreur(d.error); else setData(d) })
      .catch(() => setErreur("Connexion impossible."))
      .finally(() => setLoading(false))
  }, [token])

  const periode = data
    ? (data.dateFin && data.dateFin !== data.date ? "du " + dateFr(data.date) + " au " + dateFr(data.dateFin) : dateFr(data.date))
    : ""

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f0", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#111" }}>
      <div style={{ background: VERT, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/logo-gse.png" alt="GSE" style={{ width: 42, height: 42, objectFit: "contain", background: "#fff", borderRadius: 6, padding: 3 }} />
        <div>
          <div style={{ color: OR, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>Global Solutions Entreprise</div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Phyto Bénin by GSE</div>
        </div>
      </div>
      <div style={{ background: OR, padding: "6px 18px", fontSize: 11, color: VERT, fontWeight: 700, letterSpacing: "0.06em" }}>
        Album photos &amp; vidéos de l'intervention
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "18px 16px 48px" }}>
        {loading && <p style={{ textAlign: "center", color: "#888", padding: 24 }}>Chargement de l'album…</p>}
        {erreur && <p style={{ textAlign: "center", color: "#991b1b", padding: 24 }}>{erreur}</p>}

        {data && (
          <>
            <div style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 18, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
              <div style={{ fontWeight: 700, color: VERT, fontSize: 17 }}>{data.client}</div>
              {data.lieu ? <div style={{ color: "#555", fontSize: 14, marginTop: 2 }}>Site : {data.lieu}</div> : null}
              {periode ? <div style={{ color: "#555", fontSize: 14, marginTop: 2 }}>Intervention {periode}</div> : null}
              <div style={{ color: "#888", fontSize: 13, marginTop: 6 }}>
                {data.medias.length} média{data.medias.length > 1 ? "s" : ""}
                {data.numero ? " · Fiche N° " + data.numero : ""}
              </div>
            </div>

            {data.medias.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", padding: 24 }}>Aucun média pour cette intervention.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                {data.medias.map((m, i) => {
                  const isVideo = m.type.startsWith("video")
                  return (
                    <div key={i} style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
                      {isVideo ? (
                        <video src={m.url} controls playsInline preload="metadata" style={{ width: "100%", display: "block", background: "#000", maxHeight: 260 }} />
                      ) : (
                        <img src={m.url} alt={m.name || "Photo " + (i + 1)} onClick={() => setZoom(m.url)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", cursor: "zoom-in" }} />
                      )}
                      {m.note ? <div style={{ padding: "8px 10px", fontSize: 13, color: "#444", lineHeight: 1.4 }}>{m.note}</div> : null}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ background: "#f0ede6", borderTop: "1px solid #e0ddd6", padding: "12px 18px", textAlign: "center", fontSize: 11, color: "#888", lineHeight: 1.6 }}>
        Phyto Bénin by GSE (Global Solutions Entreprise) · Applicateur Agréé · Réf. APA-26-026/CNGP-BEN<br />
        direction@phyto-benin.com · Cotonou, Bénin
      </div>

      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50, cursor: "zoom-out" }}>
          <img src={zoom} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 6 }} />
        </div>
      )}
    </div>
  )
}
