"use client"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

// Apparitions en fondu au défilement (effet premium) : sections ET titres.
// Sûr par construction : si JS échoue, rien n'est masqué ; un filet de
// sécurité révèle tout après 3s, et prefers-reduced-motion est respecté.
export default function ScrollReveal() {
  const pathname = usePathname()

  useEffect(function () {
    if (typeof window === "undefined") return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || !("IntersectionObserver" in window)) return

    const observers: IntersectionObserver[] = []
    const timers: number[] = []

    // Révèle un lot d'éléments : ceux déjà visibles sans les masquer (zéro flash),
    // les autres masqués (initClass) puis révélés (inClass) quand ils entrent.
    function setupReveal(targets: HTMLElement[], initClass: string, inClass: string) {
      if (targets.length === 0) return
      const reveal = function (el: Element) { el.classList.add(inClass) }

      const obs = new IntersectionObserver(function (entries, o) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { reveal(e.target); o.unobserve(e.target) }
        })
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 })
      observers.push(obs)

      targets.forEach(function (el) {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.9) {
          el.classList.add(inClass)
        } else {
          el.classList.add(initClass)
          obs.observe(el)
        }
      })

      // Filet de sécurité : ne jamais laisser un élément coincé invisible.
      timers.push(window.setTimeout(function () { targets.forEach(reveal) }, 3000))
    }

    // On laisse le DOM de la nouvelle page se peindre avant d'observer.
    const raf = window.requestAnimationFrame(function () {
      // Sections : on ne masque jamais le hero (1re section, au-dessus de la ligne de flottaison).
      const sections = Array.from(document.querySelectorAll("main > section")) as HTMLElement[]
      setupReveal(sections.slice(1), "reveal-init", "reveal-in")

      // Titres de section (h1/h2) : le titre "claque" en tête de chaque bloc.
      const titles = Array.from(document.querySelectorAll("main h1, main h2")) as HTMLElement[]
      setupReveal(titles, "reveal-title-init", "reveal-title-in")
    })

    return function () {
      window.cancelAnimationFrame(raf)
      observers.forEach(function (o) { o.disconnect() })
      timers.forEach(function (t) { window.clearTimeout(t) })
    }
  }, [pathname])

  return null
}
