import type { Metadata } from "next"

// Page de suivi des leads, privée (accès par lien secret unique pour Fabrice).
// noindex + referrer no-referrer : le secret ne doit pas fuir dans l'en-tête
// Referer quand Fabrice tape un lien tel:/wa.me depuis la page.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default function SuiviLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
