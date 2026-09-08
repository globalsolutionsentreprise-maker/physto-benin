"use client"
import { usePathname } from "next/navigation"

// Bouton WhatsApp flottant, présent sur tout le site public (canal de conversion
// direct). Numéro public de Phyto Bénin, déjà affiché ailleurs (schema, services).
// Masqué sur l'admin (usage interne).
const WA_NUMBER = "2290153047950"
const WA_MSG = encodeURIComponent("Bonjour Phyto Bénin, je souhaite un devis / des informations.")

export default function WhatsAppFloat() {
  const pathname = usePathname() || ""
  if (pathname.startsWith("/admin")) return null
  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      style={{
        position: "fixed", right: "18px", bottom: "18px", zIndex: 900,
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "56px", height: "56px", borderRadius: "50%",
        backgroundColor: "#25D366", boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
        textDecoration: "none",
      }}
    >
      <svg width="30" height="30" viewBox="0 0 32 32" fill="#fff" aria-hidden="true">
        <path d="M16.003 3C9.383 3 4 8.383 4 15.003c0 2.117.553 4.185 1.603 6.007L4 29l8.17-1.573a12.02 12.02 0 0 0 3.833.63h.003C22.62 28.057 28 22.674 28 16.054 28 12.84 26.75 9.82 24.48 7.548 22.21 5.278 19.217 4 16.003 3zm.003 21.9h-.003a9.86 9.86 0 0 1-3.42-.6l-.245-.09-4.848.934.98-4.723-.16-.244a9.83 9.83 0 0 1-1.51-5.25c0-5.45 4.435-9.884 9.887-9.884 2.64 0 5.122 1.03 6.99 2.898a9.82 9.82 0 0 1 2.896 6.99c0 5.452-4.435 9.887-9.887 9.887zm5.42-7.403c-.297-.15-1.758-.868-2.03-.967-.272-.1-.47-.15-.67.148-.198.297-.767.967-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.76-1.653-2.058-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.15-.174.198-.298.297-.496.1-.198.05-.372-.025-.52-.075-.15-.67-1.612-.918-2.207-.242-.58-.487-.5-.67-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.478 0 1.462 1.065 2.875 1.213 3.073.15.198 2.095 3.2 5.076 4.487.71.306 1.263.49 1.694.627.712.226 1.36.194 1.872.118.57-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
      </svg>
    </a>
  )
}
