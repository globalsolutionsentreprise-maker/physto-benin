"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

export default function EspaceClientLogin() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "forgot">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)

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
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/espace-client/reset-password`,
    })
    if (error) {
      setMessage({ type: "error", text: "Impossible d'envoyer l'email." })
    } else {
      setMessage({ type: "success", text: "Email de réinitialisation envoyé. Vérifiez votre boîte." })
    }
    setLoading(false)
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f7f7f5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo / En-tête */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ display: "inline-block", backgroundColor: "#0a2e1a", padding: "12px 24px", borderRadius: "8px", marginBottom: "20px" }}>
            <span style={{ color: "#d4a920", fontWeight: "700", fontSize: "18px", letterSpacing: "0.05em" }}>GSE</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "300", color: "#0a2e1a", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Espace client
          </h1>
          <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>
            Accédez à vos devis, paiements et attestations
          </p>
        </div>

        {/* Formulaire */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e8e6e0", padding: "40px 36px" }}>
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
                  disabled={loading}
                  style={{ width: "100%", padding: "14px", backgroundColor: "#0a2e1a", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {loading ? "Envoi..." : "Envoyer le lien"}
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
          Pas encore de compte ? Contactez GSE pour obtenir vos accès.
        </p>
      </div>
    </main>
  )
}
