export default function Home() {

  const stats = [
    { n: "+50", l: "Clients proteges" },
    { n: "2h", l: "Delai intervention" },
    { n: "100%", l: "Resultats probants" },
    { n: "24h/24", l: "Disponibilite urgence" },
  ]

  const services = [
    { ico: "🪳", titre: "Desinsectisation", desc: "Elimination totale cafards, fourmis, moustiques, mouches. Gel appat, pulverisation et fumigation professionnelle certifiee." },
    { ico: "🐀", titre: "Deratisation", desc: "Elimination securisee rats et souris. Pieges certifies, raticides homologues, securisation entrees et suivi mensuel." },
    { ico: "🧴", titre: "Desinfection", desc: "Assainissement complet locaux. Virucide, bactericide, fongicide. Certifie restaurants, hotels et etablissements de sante." },
    { ico: "🐜", titre: "Anti-termites", desc: "Protection structures bois et beton. Barriere chimique en profondeur, garantie longue duree, controle annuel inclus." },
    { ico: "🐍", titre: "Reptiles et serpents", desc: "Securisation contre geckos, serpents et lezards. Repulsifs pro, intervention urgence 2h, suivi post-traitement." },
    { ico: "➕", titre: "Autres nuisibles", desc: "Punaises de lit, puces, guepes, frelons, chenilles et tout autre nuisible sur demande specifique.", dashed: true },
  ]

  const temoignages = [
    { init: "A.K", nom: "A. Kone", role: "Responsable restauration, Cotonou", txt: "Intervention le jour meme pour une infestation de cafards. Resultat parfait, nous avons pu rouvrir sans aucun probleme le lendemain." },
    { init: "F.S", nom: "F. Sow", role: "Directrice etablissement, Porto-Novo", txt: "Contrat trimestriel depuis 2 ans. Notre etablissement est impeccable, nos clients ne se plaignent jamais de nuisibles." },
    { init: "M.B", nom: "M. Bello", role: "Responsable logistique, Benin", txt: "Probleme de termites regle en une seule intervention. Tres satisfait du suivi post-traitement et du certificat fourni." },
  ]

  // ✅ NUMERO AGREMENT — modifiable en back office
  const NUMERO_AGREMENT = "N° AGREMENT-BENIN-XXXXX"

  return (
    <main>

      {/* ===== HERO GRAND ET IMPACTANT ===== */}
      <section style={{ background: "linear-gradient(135deg, #020a04 0%, #0a2e1a 45%, #061a0e 100%)", padding: "80px 40px 72px", position: "relative", overflow: "hidden" }}>

        {/* Cercles decoratifs */}
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "400px", height: "400px", borderRadius: "50%", backgroundColor: "rgba(212,169,32,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "20%", width: "250px", height: "250px", borderRadius: "50%", backgroundColor: "rgba(26,107,56,0.08)", pointerEvents: "none" }} />

        {/* Logo grand sur la page accueil */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <img
            src="/logo-gse.jpeg"
            alt="Logo Global Solutions Entreprise"
            style={{ width: "72px", height: "72px", objectFit: "contain", borderRadius: "12px", border: "2px solid rgba(212,169,32,0.3)" }}
          />
          <div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>GLOBAL SOLUTIONS ENTREPRISE</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#d4a920", letterSpacing: "0.05em" }}>PHYSTO BENIN</div>
          </div>
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          backgroundColor: "rgba(212,169,32,0.15)", border: "1px solid rgba(212,169,32,0.4)",
          color: "#d4a920", fontSize: "11px", fontWeight: "600", padding: "6px 16px", borderRadius: "20px", marginBottom: "28px",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#d4a920", display: "inline-block" }} />
          N°1 de l hygiene professionnelle au Benin
        </div>

        <h1 style={{ fontSize: "48px", fontWeight: "700", color: "#fff", lineHeight: "1.15", marginBottom: "20px", maxWidth: "620px" }}>
          Protegez votre espace,{" "}
          <span style={{ color: "#d4a920" }}>vivez et travaillez</span>{" "}
          en toute serenite.
        </h1>

        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)", lineHeight: "1.8", maxWidth: "540px", marginBottom: "40px" }}>
          Desinsectisation, deratisation, desinfection et tous traitements phytosanitaires.
          Techniciens certifies, produits homologues, intervention rapide dans tout le Benin.
        </p>

        <div style={{ display: "flex", gap: "14px", marginBottom: "56px", flexWrap: "wrap" }}>
          <a href="/contact" style={{
            backgroundColor: "#d4a920", color: "#0a2e1a",
            fontWeight: "700", fontSize: "15px",
            padding: "15px 32px", borderRadius: "10px", textDecoration: "none",
          }}>
            Nous contacter
          </a>
          <a href="/services" style={{
            border: "2px solid #d4a920", color: "#d4a920",
            fontWeight: "700", fontSize: "15px",
            padding: "15px 30px", borderRadius: "10px", textDecoration: "none",
          }}>
            Voir nos services
          </a>
        </div>

        {/* STATS */}
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "36px", gap: "0" }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: "center",
              borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
              padding: "0 16px",
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#d4a920" }}>{s.n}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "6px" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SERVICES ===== */}
      <section style={{ padding: "80px 40px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "10px" }}>NOS TRAITEMENTS</div>
        <h2 style={{ fontSize: "32px", fontWeight: "600", color: "#111", marginBottom: "12px" }}>Une solution pour chaque nuisible</h2>
        <p style={{ fontSize: "14px", color: "#888", marginBottom: "40px", lineHeight: "1.7" }}>
          Traitements homologues par les autorites sanitaires, produits certifies OMS,
          resultats garantis par contrat ecrit.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {services.map((s, i) => (
            <a href="/services" key={i} style={{ textDecoration: "none" }}>
              <div style={{
                position: "relative", borderRadius: "14px", padding: "32px 24px",
                border: s.dashed ? "2px dashed #1a6b38" : "1px solid #efefef",
                backgroundColor: s.dashed ? "#f6fdf8" : "#fff",
                overflow: "hidden", cursor: "pointer",
                transition: "transform 0.2s",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #0a2e1a, #1a6b38)" }} />
                <div style={{ fontSize: "40px", marginBottom: "18px" }}>{s.ico}</div>
                <h3 style={{ fontSize: "17px", fontWeight: "600", color: "#111", marginBottom: "10px" }}>{s.titre}</h3>
                <p style={{ fontSize: "13px", color: "#777", lineHeight: "1.7" }}>{s.desc}</p>
              </div>
            </a>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "36px" }}>
          <a href="/services" style={{
            backgroundColor: "#0a2e1a", color: "#d4a920",
            fontSize: "14px", fontWeight: "700",
            padding: "14px 32px", borderRadius: "10px", textDecoration: "none",
          }}>
            Voir tous nos services en detail
          </a>
        </div>
      </section>

      {/* ===== PROCESSUS ===== */}
      <section style={{ backgroundColor: "#f5f5f5", padding: "80px 40px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "10px" }}>COMMENT CA MARCHE</div>
        <h2 style={{ fontSize: "32px", fontWeight: "600", color: "#111", marginBottom: "48px" }}>Simple, rapide, efficace</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "32px" }}>
          {[
            { n: "1", t: "Vous nous contactez", d: "WhatsApp, appel ou formulaire, disponible 24h/24 et 7j/7", ico: "📞" },
            { n: "2", t: "Diagnostic gratuit", d: "Un technicien certifie se deplace chez vous pour evaluer la situation", ico: "🔍" },
            { n: "3", t: "Traitement professionnel", d: "Intervention avec produits homologues et equipements professionnels", ico: "🛠️" },
            { n: "4", t: "Garantie et suivi", d: "Certificat officiel remis, resultat garanti ou nous repassons gratuitement", ico: "✅" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "16px" }}>
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>{s.ico}</div>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%",
                backgroundColor: "#0a2e1a", color: "#d4a920",
                fontSize: "18px", fontWeight: "700",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
              }}>{s.n}</div>
              <h4 style={{ fontSize: "15px", fontWeight: "600", color: "#111", marginBottom: "8px" }}>{s.t}</h4>
              <p style={{ fontSize: "13px", color: "#777", lineHeight: "1.7" }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TEMOIGNAGES ===== */}
      <section style={{ padding: "80px 40px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "10px" }}>TEMOIGNAGES</div>
        <h2 style={{ fontSize: "32px", fontWeight: "600", color: "#111", marginBottom: "40px" }}>Ils nous font confiance</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {temoignages.map((t, i) => (
            <div key={i} style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: "16px", padding: "28px" }}>
              <div style={{ color: "#d4a920", fontSize: "20px", marginBottom: "16px", letterSpacing: "3px" }}>★★★★★</div>
              <p style={{ fontSize: "14px", color: "#555", lineHeight: "1.8", fontStyle: "italic", marginBottom: "20px" }}>"{t.txt}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  backgroundColor: "#0a2e1a", color: "#d4a920",
                  fontSize: "12px", fontWeight: "700",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{t.init}</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#111" }}>{t.nom}</div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== POURQUOI NOUS FAIRE CONFIANCE ===== */}
      <section style={{ backgroundColor: "#f5f5f5", padding: "80px 40px" }}>
        <div style={{ fontSize: "11px", color: "#1a6b38", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "10px" }}>CERTIFICATIONS ET GARANTIES</div>
        <h2 style={{ fontSize: "32px", fontWeight: "600", color: "#111", marginBottom: "40px" }}>Pourquoi nous faire confiance</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>

          {/* ✅ AGREE PAR L'ETAT — numéro modifiable */}
          <div style={{
            backgroundColor: "#0a2e1a", borderRadius: "16px", padding: "32px",
            border: "2px solid #d4a920", textAlign: "center",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🏛️</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#d4a920", marginBottom: "8px" }}>Agree par l Etat du Benin</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: "10px", lineHeight: "1.6" }}>
              Entreprise officiellement agreee et reconnue par les autorites sanitaires du Benin
            </div>
            <div style={{ fontSize: "12px", color: "#d4a920", fontWeight: "700", backgroundColor: "rgba(212,169,32,0.15)", padding: "6px 14px", borderRadius: "6px", display: "inline-block" }}>
              {NUMERO_AGREMENT}
            </div>
          </div>

          <div style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🏆</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Produits homologues</div>
            <div style={{ fontSize: "13px", color: "#777", lineHeight: "1.6" }}>Tous nos produits sont certifies OMS et conformes aux normes sanitaires du Benin</div>
          </div>

          <div style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>✅</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Resultats probants</div>
            <div style={{ fontSize: "13px", color: "#777", lineHeight: "1.6" }}>Pas satisfait du resultat ? Nous repassons gratuitement jusqu a obtenir le resultat attendu</div>
          </div>

          <div style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚡</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Intervention rapide</div>
            <div style={{ fontSize: "13px", color: "#777", lineHeight: "1.6" }}>Disponibles 24h/24 et 7j/7, intervention en moins de 2h a Cotonou et alentours</div>
          </div>

          <div style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>📄</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Certificat officiel fourni</div>
            <div style={{ fontSize: "13px", color: "#777", lineHeight: "1.6" }}>Un certificat d intervention officiel est remis apres chaque traitement realise</div>
          </div>

          <div style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔒</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>Techniciens certifies</div>
            <div style={{ fontSize: "13px", color: "#777", lineHeight: "1.6" }}>Notre equipe est formee et certifiee en hygiene phytosanitaire et securite des traitements</div>
          </div>

        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section style={{
        background: "linear-gradient(135deg, #020a04, #0a2e1a)",
        padding: "72px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "32px",
      }}>
        <div style={{ maxWidth: "520px" }}>
          <h3 style={{ fontSize: "28px", fontWeight: "600", color: "#fff", marginBottom: "12px", lineHeight: "1.3" }}>
            Une infestation ? N attendez pas qu elle empire.
          </h3>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.65)", lineHeight: "1.7" }}>
            Chaque heure compte. Contactez-nous maintenant pour une intervention rapide.
            Resultats probants garantis ou nous repassons gratuitement.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "220px" }}>
          <a href="/contact" style={{
            backgroundColor: "#d4a920", color: "#0a2e1a",
            fontWeight: "700", fontSize: "15px", textAlign: "center",
            padding: "15px 32px", borderRadius: "10px", textDecoration: "none",
          }}>
            Nous contacter maintenant
          </a>
          <a href="https://wa.me/22900000000" target="_blank" rel="noopener noreferrer" style={{
            border: "1px solid rgba(255,255,255,0.3)", color: "#fff",
            fontSize: "14px", textAlign: "center",
            padding: "14px 32px", borderRadius: "10px", textDecoration: "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp direct
          </a>
        </div>
      </section>

    </main>
  )
}
