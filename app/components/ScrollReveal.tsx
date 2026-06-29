"use client"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

// Apparitions en fondu des sections au défilement (effet premium).
// Sûr par construction : si JS échoue, rien n'est masqué ; un filet de
// sécurité révèle tout après 3s, et prefers-reduced-motion est respecté.
export default function ScrollReveal() {
  const pathname = usePathname()

  useEffect(function () {
    if (typeof window === "undefined") return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || !("IntersectionObserver" in window)) return

    let obs: IntersectionObserver | null = null
    let timer = 0

    // On laisse le DOM de la nouvelle page se peindre avant d'observer.
    const raf = window.requestAnimationFrame(function () {
      const sections = Array.from(document.querySelectorAll("main > section")) as HTMLElement[]
      // On ne masque jamais le hero (1re section, au-dessus de la ligne de flottaison).
      const targets = sections.slice(1)
      if (targets.length === 0) return

      const reveal = function (el: Element) { el.classList.add("reveal-in") }

      obs = new IntersectionObserver(function (entries, o) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { reveal(e.target); o.unobserve(e.target) }
        })
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 })

      targets.forEach(function (el) {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.9) {
          // Déjà visible : on révèle sans masquer (zéro flash).
          el.classList.add("reveal-in")
        } else {
          el.classList.add("reveal-init")
          obs!.observe(el)
        }
      })

      // Filet de sécurité : ne jamais laisser une section coincée invisible.
      timer = window.setTimeout(function () { targets.forEach(reveal) }, 3000)
    })

    return function () {
      window.cancelAnimationFrame(raf)
      if (obs) obs.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [pathname])

  return null
}
