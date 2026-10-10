import type { Metadata } from "next"

// Formulaire technicien privé (accès par lien token) : exclu de l'indexation
// des moteurs (robots noindex), en complément du Disallow: /fiche de robots.txt.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function FicheLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
