"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

export default function EspaceClientLogin() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "forgot">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)   // anti-spam de la demande de réinitialisation
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)

  // Décompte du délai anti-répétition (le vrai rate-limit est côté Supabase Auth).
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage({ type: "error", text: "Email ou mot de passe incorrect." })
    } else {
      router.push("/espace-client/dashboard")
    }
    setLoading(false)
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (cooldown > 0) return
    // Format d'email simple avant l'appel (le champ est déjà type=email + required).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ type: "error", text: "Veuillez saisir une adresse email valide." })
      return
    }
    setLoading(true)
    // On ignore volontairement le résultat : message TOUJOURS générique pour ne pas
    // révéler si un compte existe (anti-énumération). Supabase renvoie déjà « ok » pour
    // un email inconnu ; on masque aussi les erreurs d'envoi (rate-limit, etc.).
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/espace-client/reset-password`,
    }).catch(() => {})
    setMessage({ type: "success", text: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé. Vérifiez votre boîte (et les indésirables)." })
    setCooldown(30)   // empêche les clics répétés ; le rate-limit réel reste côté Supabase
    setLoading(false)
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f7f7f5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo / En-tête */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ marginBottom: "20px" }}>
            <a href="/" aria-label="Retour à l'accueil">
              <img src="/logo-gse.png" alt="Logo Phyto Bénin by GSE" className="logo-anime" style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "12px", cursor: "pointer" }} />
            </a>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "300", color: "#0a2e1a", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Espace client
          </h1>
          <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>
            Accédez à vos devis, paiements et attestations
          </p>
        </div>

        {/* Formulaire */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e8e6e0", borderTop: "3px solid #d4a920", padding: "40px 36px" }}>
          {mode === "login" ? (
            <>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a", margin: "0 0 28px" }}>Connexion</h2>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#444", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "15px", outline: "none", backgroundColor: "#fafaf8", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: "28px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#444", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "15px", outline: "none", backgroundColor: "#fafaf8", boxSizing: "border-box" }}
                  />
                </div>

                {message && (
                  <div style={{ padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px", backgroundColor: message.type === "error" ? "#fef2f2" : "#f0fdf4", color: message.type === "error" ? "#b91c1c" : "#166534", border: `1px solid ${message.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", padding: "14px", backgroundColor: "#0a2e1a", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </button>
              </form>
              <button
                onClick={() => { setMode("forgot"); setMessage(null) }}
                style={{ display: "block", width: "100%", textAlign: "center", marginTop: "16px", background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", textDecoration: "underline" }}
              >
                Mot de passe oublié ?
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a", margin: "0 0 8px" }}>Réinitialiser le mot de passe</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>Un lien vous sera envoyé par email.</p>
              <form onSubmit={handleForgot}>
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#444", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "15px", outline: "none", backgroundColor: "#fafaf8", boxSizing: "border-box" }}
                  />
                </div>
                {message && (
                  <div style={{ padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px", backgroundColor: message.type === "error" ? "#fef2f2" : "#f0fdf4", color: message.type === "error" ? "#b91c1c" : "#166534", border: `1px solid ${message.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>
                    {message.text}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  style={{ width: "100%", padding: "14px", backgroundColor: "#0a2e1a", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: (loading || cooldown > 0) ? "not-allowed" : "pointer", opacity: (loading || cooldown > 0) ? 0.7 : 1 }}
                >
                  {loading ? "Envoi..." : cooldown > 0 ? `Patientez ${cooldown}s` : "Envoyer le lien"}
                </button>
              </form>
              <button
                onClick={() => { setMode("login"); setMessage(null) }}
                style={{ display: "block", width: "100%", textAlign: "center", marginTop: "16px", background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", textDecoration: "underline" }}
              >
                ← Retour à la connexion
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "12px", color: "#aaa" }}>
          Pas encore de compte ?{" "}
          <a href="/contact" style={{ color: "#1a6b38", fontWeight: "600", textDecoration: "none" }}>Contactez-nous</a>{" "}pour obtenir vos accès.
        </p>
        <p style={{ textAlign: "center", marginTop: "10px", fontSize: "12px" }}>
          <a href="/" style={{ color: "#aaa", textDecoration: "none" }}>← Retour au site</a>
        </p>
      </div>
    </main>
  )
}
