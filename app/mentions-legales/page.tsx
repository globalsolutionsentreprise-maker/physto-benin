export const metadata = { title: "Mentions légales — PHYSTO Bénin" }

export default function MentionsLegales() {
  const sections = [
    { t: "Éditeur du site", c: "Raison sociale : Global Solutions Entreprise (GSE)\nMarque : PHYSTO Bénin — division hygiène sanitaire\nSiège social : Ilot 3535, Cotonou, Bénin\nRCCM : RB/COT/24 B 38910\nIFU : 3202420126111\nTél : +229 01 53 04 79 50\nEmail : globalsolutionsentreprise@gmail.com\nDirecteur : Yakoubou Kabir" },
    { t: "Hébergement", c: "Vercel Inc. — 340 Pine Street, Suite 701, San Francisco, CA 94104, USA — vercel.com" },
    { t: "Propriété intellectuelle", c: "Tous les contenus de ce site sont la propriété de Global Solutions Entreprise. Toute reproduction sans autorisation écrite est interdite. La marque PHYSTO Bénin est une marque de GSE." },
    { t: "Données personnelles", c: "Les informations collectées via le formulaire sont utilisées uniquement pour répondre à vos demandes. Elles ne sont ni vendues ni transmises à des tiers. Contact : globalsolutionsentreprise@gmail.com" },
    { t: "Cookies", c: "Ce site utilise Google Analytics (GA4) pour mesurer l'audience de manière anonyme. Aucune donnée personnelle identifiable n'est collectée à des fins publicitaires." },
  ]
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#fff" }}>
      <section style={{ backgroundColor: "#0a2e1a", padding: "60px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>LÉGAL</div>
          <h1 style={{ fontSize: "42px", fontWeight: "300", color: "#fff" }}>Mentions légales</h1>
        </div>
      </section>
      <section style={{ padding: "80px 60px", maxWidth: "800px", margin: "0 auto" }}>
        {sections.map(function(s) { return (
          <div key={s.t} style={{ marginBottom: "48px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0a2e1a", marginBottom: "16px", paddingBottom: "12px", borderBottom: "2px solid #d4a920" }}>{s.t}</h2>
            {s.c.split("\n").map(function(l, i) { return <p key={i} style={{ fontSize: "15px", color: "#444", lineHeight: "1.9", margin: "0 0 4px" }}>{l}</p> })}
          </div>
        )})}
      </section>
    </main>
  )
}
