"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

// Page de RETOUR du lien de récupération Supabase (type=recovery).
// Le client arrive ici via le lien d'activation (create-client) ou « Mot de passe oublié ».
// supabase-js (detectSessionInUrl par défaut) échange le token du hash contre une session
// et émet l'événement PASSWORD_RECOVERY. On définit ensuite le mot de passe via updateUser.
export default function ResetPassword() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)   // vérification du lien en cours
  const [ready, setReady] = useState(false)         // session de récupération valide
  const [pwd, setPwd] = useState("")
  const [pwd2, setPwd2] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)

  useEffect(() => {
    // 1) Événement de récupération (si le hash est détecté après le montage).
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") { setReady(true); setChecking(false) }
    })
    // 2) Session déjà établie (l'événement a pu se déclencher avant le montage).
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) setReady(true)
      setChecking(false)
    })()
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (pwd.length < 8) { setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 8 caractères." }); return }
    if (pwd !== pwd2) { setMessage({ type: "error", text: "Les deux mots de passe ne correspondent pas." }); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    if (error) {
      setMessage({ type: "error", text: "Lien expiré ou invalide. Veuillez redemander un lien de réinitialisation." })
    } else {
      setDone(true)
      // On déconnecte la session de récupération : le client se reconnecte avec son nouveau mot de passe.
      await supabase.auth.signOut()
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "15px", outline: "none", backgroundColor: "#fafaf8", boxSizing: "border-box" }
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "#444", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f7f7f5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ marginBottom: "20px" }}>
            <a href="/" aria-label="Retour à l'accueil">
              <img src="/logo-gse.png" alt="Logo Phyto Bénin by GSE" style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "12px" }} />
            </a>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 300, color: "#0a2e1a", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Définir votre mot de passe
          </h1>
          <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>
            Choisissez un mot de passe pour votre espace client GSE
          </p>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e8e6e0", borderTop: "3px solid #d4a920", padding: "40px 36px" }}>

          {checking ? (
            <p style={{ textAlign: "center", color: "#888", fontSize: "14px", margin: 0 }}>Vérification du lien…</p>
          ) : done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>✓</div>
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0a2e1a", margin: "0 0 8px" }}>Mot de passe enregistré</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <button
                onClick={() => router.push("/espace-client")}
                style={{ width: "100%", padding: "14px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
              >
                Aller à la connexion
              </button>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0a2e1a", margin: "0 0 8px" }}>Lien invalide ou expiré</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>Ce lien n&apos;est plus valide. Demandez-en un nouveau depuis la page de connexion.</p>
              <button
                onClick={() => router.push("/espace-client")}
                style={{ width: "100%", padding: "14px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0a2e1a", margin: "0 0 28px" }}>Nouveau mot de passe</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={labelStyle}>Nouveau mot de passe</label>
                  <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} required placeholder="••••••••" autoComplete="new-password" style={inputStyle} />
                  <div style={{ fontSize: "11px", color: "#999", marginTop: "6px" }}>Au moins 8 caractères.</div>
                </div>
                <div style={{ marginBottom: "28px" }}>
                  <label style={labelStyle}>Confirmer le mot de passe</label>
                  <input type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} required placeholder="••••••••" autoComplete="new-password" style={inputStyle} />
                </div>

                {message && (
                  <div style={{ padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px", backgroundColor: message.type === "error" ? "#fef2f2" : "#f0fdf4", color: message.type === "error" ? "#b91c1c" : "#166534", border: `1px solid ${message.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", padding: "14px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "12px" }}>
          <a href="/espace-client" style={{ color: "#aaa", textDecoration: "none" }}>← Retour à la connexion</a>
        </p>
      </div>
    </main>
  )
}
