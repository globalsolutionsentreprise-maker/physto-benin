#!/bin/bash
echo "=== Installation Portail Client GSE ==="

mkdir -p app/espace-client/dashboard
mkdir -p "app/espace-client/devis/[id]"
mkdir -p "app/espace-client/attestations/[id]"
mkdir -p app/admin/clients
mkdir -p app/api/create-payment
mkdir -p lib

echo "✓ Dossiers créés"

# lib/supabase-client.ts
cat > lib/supabase-client.ts << 'EOF'
// lib/supabase-client.ts
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
EOF
echo "✓ lib/supabase-client.ts"

cat > app/api/create-payment/route.ts << 'ENDOFFILE'
// app/api/create-payment/route.ts
// Crée une transaction FedaPay et retourne l'URL de paiement

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://physto-benin.vercel.app"

export async function POST(req: NextRequest) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { devisId, typeVersement } = body // typeVersement: '60' | '40'

  if (!devisId || !typeVersement) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
  }

  // Récupérer le devis et le client
  const { data: devis, error: devisError } = await supabase
    .from("devis")
    .select("*, clients(*)")
    .eq("id", devisId)
    .single()

  if (devisError || !devis) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })
  }

  const client = devis.clients
  const montant = typeVersement === "60"
    ? Math.round(devis.montant_total * 0.6)
    : Math.round(devis.montant_total * 0.4)

  // Créer l'enregistrement paiement en base
  const { data: paiement, error: paiementError } = await supabase
    .from("paiements")
    .insert({
      devis_id: devisId,
      client_id: devis.client_id,
      type_versement: typeVersement,
      montant,
      statut: "en_cours",
    })
    .select()
    .single()

  if (paiementError || !paiement) {
    return NextResponse.json({ error: "Erreur création paiement" }, { status: 500 })
  }

  // Créer la transaction FedaPay
  const description = typeVersement === "60"
    ? `Acompte 60% — ${devis.prestation} (Devis ${devis.numero})`
    : `Solde 40% — ${devis.prestation} (Devis ${devis.numero})`

  let fedapayRes: any
  try {
    const res = await fetch("https://api.fedapay.com/v1/transactions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FEDAPAY_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        amount: montant,
        currency: { iso: "XOF" },
        callback_url: `${SITE_URL}/espace-client/paiements?status=success&devis=${devisId}`,
        cancel_url: `${SITE_URL}/espace-client/devis/${devisId}?status=cancelled`,
        customer: {
          email: client.email,
          firstname: client.prenom || "",
          lastname: client.nom,
          phone_number: client.telephone ? {
            number: client.telephone,
            country: "BJ"
          } : undefined,
        },
        metadata: {
          paiement_id: paiement.id,
          devis_id: devisId,
          type_versement: typeVersement,
        },
      }),
    })
    fedapayRes = await res.json()
  } catch (err) {
    console.error("Erreur FedaPay API:", err)
    return NextResponse.json({ error: "Erreur FedaPay" }, { status: 502 })
  }

  const transactionId = fedapayRes?.v1?.transaction?.id
  const token = fedapayRes?.v1?.token

  if (!token) {
    console.error("FedaPay response inattendue:", fedapayRes)
    return NextResponse.json({ error: "Pas de token FedaPay" }, { status: 502 })
  }

  const paymentUrl = `https://checkout.fedapay.com/${token}`

  // Sauvegarder l'URL et l'ID de transaction
  await supabase
    .from("paiements")
    .update({
      fedapay_transaction_id: String(transactionId),
      fedapay_payment_url: paymentUrl,
    })
    .eq("id", paiement.id)

  return NextResponse.json({ paymentUrl })
}
ENDOFFILE
echo "✓ app/api/create-payment/route.ts"

cat > app/espace-client/page.tsx << 'ENDOFFILE'
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
ENDOFFILE
echo "✓ app/espace-client/page.tsx"

cat > app/espace-client/dashboard/page.tsx << 'ENDOFFILE'
"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  brouillon:            { label: "Brouillon",           color: "#92400e", bg: "#fef3c7" },
  envoye:               { label: "En attente de réponse", color: "#1e40af", bg: "#dbeafe" },
  accepte:              { label: "Accepté — 60% en attente", color: "#065f46", bg: "#d1fae5" },
  modification_demandee:{ label: "Modification demandée", color: "#7c3aed", bg: "#ede9fe" },
  en_cours:             { label: "Prestation en cours", color: "#065f46", bg: "#d1fae5" },
  termine:              { label: "Terminé",             color: "#1f2937", bg: "#f3f4f6" },
  annule:               { label: "Annulé",              color: "#991b1b", bg: "#fee2e2" },
}

export default function Dashboard() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [devisList, setDevisList] = useState<any[]>([])
  const [attestations, setAttestations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/espace-client"); return }

      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (!clientData) { router.push("/espace-client"); return }
      setClient(clientData)

      const { data: devis } = await supabase
        .from("devis")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false })
      setDevisList(devis || [])

      const { data: atts } = await supabase
        .from("attestations")
        .select("*")
        .eq("client_id", clientData.id)
        .order("generated_at", { ascending: false })
      setAttestations(atts || [])

      setLoading(false)
    }
    load()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push("/espace-client")
  }

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#888" }}>Chargement...</div>
  }

  const devisActifs = devisList.filter(d => !["termine","annule"].includes(d.statut))
  const devisTermines = devisList.filter(d => d.statut === "termine")

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f7f7f5", minHeight: "100vh" }}>

      {/* Barre de navigation */}
      <nav style={{ backgroundColor: "#0a2e1a", padding: "0 40px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#d4a920", fontWeight: "700", fontSize: "16px", letterSpacing: "0.05em" }}>GSE</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Espace client</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px" }}>{client?.prenom} {client?.nom}</span>
          <button onClick={logout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Bonjour */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: "300", color: "#0a2e1a", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Bonjour, <strong style={{ fontWeight: "600" }}>{client?.prenom || client?.nom}</strong>
          </h1>
          {client?.entreprise && <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>{client.entreprise}</p>}
        </div>

        {/* Stats rapides */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "40px" }}>
          {[
            { label: "Devis actifs", value: devisActifs.length, color: "#0a2e1a" },
            { label: "Prestations terminées", value: devisTermines.length, color: "#065f46" },
            { label: "Attestations disponibles", value: attestations.length, color: "#d4a920" },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "24px" }}>
              <div style={{ fontSize: "32px", fontWeight: "300", color: stat.color, marginBottom: "6px" }}>{stat.value}</div>
              <div style={{ fontSize: "12px", color: "#888", fontWeight: "500", letterSpacing: "0.04em", textTransform: "uppercase" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Devis actifs */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #e8e6e0" }}>
            Vos devis
          </h2>

          {devisList.length === 0 ? (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "40px", textAlign: "center", color: "#888", fontSize: "14px" }}>
              Aucun devis pour l'instant. GSE vous en enverra un après votre demande.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {devisList.map(devis => {
                const statut = STATUT_LABELS[devis.statut] || { label: devis.statut, color: "#444", bg: "#f3f4f6" }
                return (
                  <div
                    key={devis.id}
                    onClick={() => router.push(`/espace-client/devis/${devis.id}`)}
                    style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#0a2e1a")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8e6e0")}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0a2e1a", marginBottom: "4px" }}>{devis.numero}</div>
                      <div style={{ fontSize: "15px", color: "#333", marginBottom: "4px" }}>{devis.prestation}</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>
                        {new Date(devis.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "18px", fontWeight: "600", color: "#0a2e1a" }}>
                          {Number(devis.montant_total).toLocaleString("fr-FR")} FCFA
                        </div>
                      </div>
                      <span style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: statut.bg, color: statut.color, whiteSpace: "nowrap" }}>
                        {statut.label}
                      </span>
                      <span style={{ color: "#ccc", fontSize: "18px" }}>→</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Attestations */}
        {attestations.length > 0 && (
          <section>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #e8e6e0" }}>
              Attestations de traitement
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {attestations.map(att => (
                <div
                  key={att.id}
                  onClick={() => router.push(`/espace-client/attestations/${att.id}`)}
                  style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#d4a920")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8e6e0")}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#d4a920", marginBottom: "4px" }}>{att.numero}</div>
                    <div style={{ fontSize: "15px", color: "#333" }}>{att.prestation}</div>
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                      Délivrée le {new Date(att.generated_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: "#d1fae5", color: "#065f46" }}>
                      ✓ Disponible
                    </span>
                    <span style={{ color: "#ccc", fontSize: "18px" }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
ENDOFFILE
echo "✓ app/espace-client/dashboard/page.tsx"

cat > 'app/espace-client/devis/[id]/page.tsx' << 'ENDOFFILE'
"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "En attente de votre réponse",
  accepte: "Accepté — paiement 60% requis",
  modification_demandee: "Modification en cours",
  en_cours: "Prestation en cours",
  termine: "Terminé",
  annule: "Annulé",
}

export default function DevisPage() {
  const router = useRouter()
  const params = useParams()
  const devisId = params.id as string

  const [devis, setDevis] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [paiements, setPaiements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<"none" | "modifier" | "payer60" | "payer40">("none")
  const [motifModif, setMotifModif] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [msgResult, setMsgResult] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/espace-client"); return }

      const { data: clientData } = await supabase
        .from("clients").select("*").eq("user_id", user.id).single()
      if (!clientData) { router.push("/espace-client"); return }
      setClient(clientData)

      const { data: devisData, error } = await supabase
        .from("devis").select("*").eq("id", devisId).eq("client_id", clientData.id).single()
      if (error || !devisData) { router.push("/espace-client/dashboard"); return }
      setDevis(devisData)

      const { data: paies } = await supabase
        .from("paiements").select("*").eq("devis_id", devisId).order("created_at")
      setPaiements(paies || [])

      setLoading(false)
    }
    load()
  }, [devisId, router])

  async function accepterDevis() {
    setSubmitting(true)
    await supabase.from("devis").update({
      statut: "accepte",
      date_acceptation: new Date().toISOString(),
    }).eq("id", devisId)
    setDevis((prev: any) => ({ ...prev, statut: "accepte" }))
    setAction("payer60")
    setSubmitting(false)
  }

  async function demanderModification() {
    if (!motifModif.trim()) return
    setSubmitting(true)
    await supabase.from("devis").update({
      statut: "modification_demandee",
      notes_modification: motifModif,
    }).eq("id", devisId)
    setDevis((prev: any) => ({ ...prev, statut: "modification_demandee", notes_modification: motifModif }))
    setAction("none")
    setMsgResult("Votre demande de modification a été envoyée à GSE. Vous serez notifié dès la mise à jour.")
    setSubmitting(false)
  }

  async function lancerPaiement(type: "60" | "40") {
    setSubmitting(true)
    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId, typeVersement: type }),
      })
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        setMsgResult("Erreur lors de la création du paiement. Contactez GSE.")
      }
    } catch {
      setMsgResult("Erreur réseau. Réessayez.")
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#888" }}>Chargement...</div>
  )

  const montant60 = Math.round(devis.montant_total * 0.6)
  const montant40 = Math.round(devis.montant_total * 0.4)
  const paie60 = paiements.find(p => p.type_versement === "60" && p.statut === "confirme")
  const paie40 = paiements.find(p => p.type_versement === "40" && p.statut === "confirme")

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f7f7f5", minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{ backgroundColor: "#0a2e1a", padding: "0 40px", height: "60px", display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={() => router.push("/espace-client/dashboard")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "13px", cursor: "pointer" }}>← Tableau de bord</button>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
        <span style={{ color: "#d4a920", fontWeight: "600", fontSize: "13px" }}>{devis.numero}</span>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>

        {/* En-tête devis */}
        <div style={{ backgroundColor: "#0a2e1a", borderRadius: "12px", padding: "32px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "8px" }}>DEVIS</div>
            <h1 style={{ fontSize: "22px", fontWeight: "300", color: "#ffffff", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              {devis.prestation}
            </h1>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{devis.numero}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "28px", fontWeight: "300", color: "#d4a920" }}>
              {Number(devis.montant_total).toLocaleString("fr-FR")}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>FCFA TTC</div>
          </div>
        </div>

        {/* Statut */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "20px 24px", marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Statut du dossier</div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a" }}>{STATUT_LABELS[devis.statut] || devis.statut}</div>
          {devis.notes_modification && (
            <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f0f4ff", borderRadius: "8px", fontSize: "13px", color: "#444" }}>
              <strong>Votre demande de modification :</strong> {devis.notes_modification}
            </div>
          )}
        </div>

        {/* Description */}
        {devis.description && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "24px", marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Détails de la prestation</div>
            <p style={{ fontSize: "15px", color: "#333", lineHeight: "1.7", margin: 0, whiteSpace: "pre-wrap" }}>{devis.description}</p>
          </div>
        )}

        {/* Plan de paiement */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "24px", marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plan de paiement</div>
          {[
            { label: "À la signature du devis", pct: "60%", montant: montant60, confirme: !!paie60 },
            { label: "À la fin de la prestation", pct: "40%", montant: montant40, confirme: !!paie40 },
          ].map(v => (
            <div key={v.pct} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f0ede6" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{v.pct}</div>
                <div style={{ fontSize: "12px", color: "#888" }}>{v.label}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a" }}>{v.montant.toLocaleString("fr-FR")} FCFA</div>
                {v.confirme
                  ? <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", backgroundColor: "#d1fae5", color: "#065f46" }}>✓ Payé</span>
                  : <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", backgroundColor: "#fef3c7", color: "#92400e" }}>En attente</span>
                }
              </div>
            </div>
          ))}
        </div>

        {/* Message résultat */}
        {msgResult && (
          <div style={{ padding: "16px 20px", borderRadius: "10px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#065f46", fontSize: "14px", marginBottom: "20px" }}>
            {msgResult}
          </div>
        )}

        {/* Actions selon statut */}
        {devis.statut === "envoye" && action === "none" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={accepterDevis}
              disabled={submitting}
              style={{ padding: "16px", backgroundColor: "#0a2e1a", color: "#ffffff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
            >
              ✓ Accepter ce devis et procéder au paiement
            </button>
            <button
              onClick={() => setAction("modifier")}
              style={{ padding: "16px", backgroundColor: "#ffffff", color: "#0a2e1a", border: "2px solid #0a2e1a", borderRadius: "10px", fontSize: "14px", cursor: "pointer" }}
            >
              Demander une modification
            </button>
          </div>
        )}

        {action === "modifier" && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "24px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "8px" }}>Votre demande de modification</div>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>Expliquez ce que vous souhaitez modifier et pourquoi. GSE vous renverra un devis mis à jour.</p>
            <textarea
              value={motifModif}
              onChange={e => setMotifModif(e.target.value)}
              rows={5}
              placeholder="Ex : Je souhaite que la prestation inclut également la réserve alimentaire, et que le délai d'intervention soit raccourci à 48h..."
              style={{ width: "100%", padding: "14px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", resize: "vertical", boxSizing: "border-box", lineHeight: "1.6" }}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                onClick={demanderModification}
                disabled={submitting || !motifModif.trim()}
                style={{ flex: 1, padding: "14px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", opacity: !motifModif.trim() ? 0.5 : 1 }}
              >
                {submitting ? "Envoi..." : "Envoyer ma demande"}
              </button>
              <button
                onClick={() => setAction("none")}
                style={{ padding: "14px 20px", backgroundColor: "#fff", border: "1px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Payer 60% après acceptation */}
        {(devis.statut === "accepte" || action === "payer60") && !paie60 && (
          <div style={{ backgroundColor: "#fefce8", borderRadius: "10px", border: "2px solid #d4a920", padding: "24px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "8px" }}>
              Paiement du premier versement (60%)
            </div>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "20px", lineHeight: "1.6" }}>
              Votre devis est accepté. Pour démarrer la prestation, effectuez le paiement du premier versement de <strong>{montant60.toLocaleString("fr-FR")} FCFA</strong> via Feday Pay.
            </p>
            <button
              onClick={() => lancerPaiement("60")}
              disabled={submitting}
              style={{ width: "100%", padding: "16px", backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
            >
              {submitting ? "Redirection..." : `Payer ${montant60.toLocaleString("fr-FR")} FCFA via Feday Pay`}
            </button>
          </div>
        )}

        {/* Payer 40% (déclenché par admin) */}
        {devis.statut === "en_cours" && paie60 && !paie40 && (
          <div style={{ backgroundColor: "#f0fdf4", borderRadius: "10px", border: "2px solid #22c55e", padding: "24px" }}>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "8px" }}>
              Prestation terminée — Solde final (40%)
            </div>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "20px", lineHeight: "1.6" }}>
              GSE a validé la livraison de votre prestation. Réglez le solde de <strong>{montant40.toLocaleString("fr-FR")} FCFA</strong> pour recevoir votre attestation de traitement.
            </p>
            <button
              onClick={() => lancerPaiement("40")}
              disabled={submitting}
              style={{ width: "100%", padding: "16px", backgroundColor: "#0a2e1a", color: "#ffffff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
            >
              {submitting ? "Redirection..." : `Payer le solde — ${montant40.toLocaleString("fr-FR")} FCFA`}
            </button>
          </div>
        )}

        {/* Attestation disponible */}
        {devis.statut === "termine" && paie40 && (
          <div style={{ backgroundColor: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>✅</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#065f46", marginBottom: "6px" }}>Dossier complet</div>
            <p style={{ fontSize: "13px", color: "#444", marginBottom: "16px" }}>Votre attestation de traitement est disponible dans votre espace client.</p>
            <button
              onClick={() => router.push("/espace-client/dashboard")}
              style={{ padding: "12px 24px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}
            >
              Voir mes attestations
            </button>
          </div>
        )}

        {/* Lien PDF devis */}
        {devis.pdf_url && (
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <a href={devis.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: "#888", textDecoration: "underline" }}>
              Télécharger le PDF du devis
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
ENDOFFILE
echo "✓ app/espace-client/devis/[id]/page.tsx"

cat > 'app/espace-client/attestations/[id]/page.tsx' << 'ENDOFFILE'
"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

export default function AttestationPage() {
  const router = useRouter()
  const params = useParams()
  const attId = params.id as string

  const [att, setAtt] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/espace-client"); return }

      const { data: clientData } = await supabase
        .from("clients").select("*").eq("user_id", user.id).single()
      if (!clientData) { router.push("/espace-client"); return }
      setClient(clientData)

      const { data: attData, error } = await supabase
        .from("attestations").select("*").eq("id", attId).eq("client_id", clientData.id).single()
      if (error || !attData) { router.push("/espace-client/dashboard"); return }
      setAtt(attData)
      setLoading(false)
    }
    load()
  }, [attId, router])

  function imprimer() {
    window.print()
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#888" }}>Chargement...</div>
  )

  const dateFormatee = att.date_traitement
    ? new Date(att.date_traitement).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : new Date(att.generated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .attestation-card { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 40px !important; }
        }
      `}</style>

      {/* Nav (masquée à l'impression) */}
      <nav className="no-print" style={{ backgroundColor: "#0a2e1a", padding: "0 40px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={() => router.push("/espace-client/dashboard")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "13px", cursor: "pointer" }}>← Tableau de bord</button>
        </div>
        <button
          onClick={imprimer}
          style={{ padding: "8px 20px", backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
        >
          Télécharger en PDF
        </button>
      </nav>

      {/* Attestation */}
      <div style={{ backgroundColor: "#f7f7f5", minHeight: "100vh", padding: "40px 24px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <div
          className="attestation-card"
          style={{ maxWidth: "760px", margin: "0 auto", backgroundColor: "#ffffff", border: "1px solid #e8e6e0", borderRadius: "4px", padding: "60px 70px", position: "relative" }}
        >
          {/* Filet décoratif haut */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", backgroundColor: "#0a2e1a" }} />
          <div style={{ position: "absolute", top: "6px", left: 0, right: 0, height: "2px", backgroundColor: "#d4a920" }} />

          {/* En-tête */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
            <div>
              {/* Logo textuel (remplacer par <img> si logo disponible) */}
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: "800", fontSize: "24px", color: "#0a2e1a", letterSpacing: "0.05em" }}>GSE</span>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888", display: "block", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>Global Solutions Entreprise</span>
              </div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888", lineHeight: "1.7" }}>
                <div>RCCM : RB/COT/24 B 38910</div>
                <div>IFU : 3202420126111</div>
                <div>Cotonou, Bénin · +229 01 53 04 79 50</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>N° Agrément</div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontWeight: "700", fontSize: "13px", color: "#0a2e1a", border: "1.5px solid #0a2e1a", padding: "6px 12px", borderRadius: "4px" }}>
                N° AGREMENT-BENIN-XXXXX
              </div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#888", marginTop: "8px" }}>Réf. : {att.numero}</div>
            </div>
          </div>

          {/* Titre */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "10px", color: "#d4a920", fontWeight: "700", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>
              Document officiel
            </div>
            <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: "22px", fontWeight: "700", color: "#0a2e1a", margin: "0 0 6px", letterSpacing: "0.02em" }}>
              ATTESTATION DE TRAITEMENT
            </h1>
            <div style={{ width: "60px", height: "2px", backgroundColor: "#d4a920", margin: "12px auto 0" }} />
          </div>

          {/* Corps */}
          <div style={{ fontSize: "15px", color: "#333", lineHeight: "2", marginBottom: "32px" }}>
            <p style={{ margin: "0 0 16px" }}>
              Global Solutions Entreprise (GSE), société agréée par l'État du Bénin,
              atteste avoir réalisé la prestation suivante au bénéfice de :
            </p>

            {/* Bloc client */}
            <div style={{ backgroundColor: "#f7f7f5", border: "1px solid #e8e6e0", borderRadius: "4px", padding: "20px 24px", marginBottom: "24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "8px", width: "40%" }}>Client :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "8px" }}>
                      {client?.prenom} {client?.nom}
                      {client?.entreprise && ` — ${client.entreprise}`}
                    </td>
                  </tr>
                  {client?.adresse && (
                    <tr>
                      <td style={{ color: "#888", paddingBottom: "8px" }}>Adresse :</td>
                      <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "8px" }}>{client.adresse}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "8px" }}>Prestation :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "8px" }}>{att.prestation}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#888", paddingBottom: "8px" }}>Date du traitement :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a", paddingBottom: "8px" }}>{dateFormatee}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#888" }}>Technicien responsable :</td>
                    <td style={{ fontWeight: "600", color: "#0a2e1a" }}>{att.technicien}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p style={{ margin: "0 0 12px" }}>
              Le traitement a été réalisé conformément aux normes professionnelles en vigueur,
              avec des produits homologués par les autorités sanitaires compétentes.
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
              Cette attestation est délivrée à la demande du client et peut être présentée
              à toute autorité compétente.
            </p>
          </div>

          {/* Pied */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #e8e6e0" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Fait à Cotonou, le {dateFormatee}</div>
              <div style={{ fontSize: "12px", color: "#888" }}>Pour Global Solutions Entreprise</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "120px", height: "60px", border: "1px dashed #ccc", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "11px", color: "#ccc" }}>Cachet GSE</span>
              </div>
              <div style={{ fontSize: "11px", color: "#888", marginTop: "6px" }}>Signature autorisée</div>
            </div>
          </div>

          {/* Filet bas */}
          <div style={{ position: "absolute", bottom: "6px", left: 0, right: 0, height: "2px", backgroundColor: "#d4a920" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", backgroundColor: "#0a2e1a" }} />
        </div>
      </div>
    </>
  )
}
ENDOFFILE
echo "✓ app/espace-client/attestations/[id]/page.tsx"

cat > app/admin/clients/page.tsx << 'ENDOFFILE'
"use client"
import { useState, useEffect } from "react"

// Ce composant s'intègre dans ton admin/page.js existant
// Copier ce contenu comme un nouvel onglet "Clients & Devis"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  brouillon:            { label: "Brouillon",            color: "#92400e", bg: "#fef3c7" },
  envoye:               { label: "Envoyé",               color: "#1e40af", bg: "#dbeafe" },
  accepte:              { label: "Accepté",              color: "#065f46", bg: "#d1fae5" },
  modification_demandee:{ label: "Modif. demandée",      color: "#7c3aed", bg: "#ede9fe" },
  en_cours:             { label: "En cours",             color: "#0f766e", bg: "#ccfbf1" },
  termine:              { label: "Terminé",              color: "#1f2937", bg: "#f3f4f6" },
  annule:               { label: "Annulé",               color: "#991b1b", bg: "#fee2e2" },
}

function creerSupabase() {
  const { createClient } = require("@supabase/supabase-js")
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export default function AdminClientsDevis() {
  const [devisList, setDevisList] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevis, setSelectedDevis] = useState<any | null>(null)
  const [showNewDevis, setShowNewDevis] = useState(false)
  const [validating, setValidating] = useState<string | null>(null)
  const [filterStatut, setFilterStatut] = useState("tous")

  // Formulaire nouveau devis
  const [formDevis, setFormDevis] = useState({
    clientId: "",
    prestation: "",
    description: "",
    montantTotal: "",
  })
  const [submittingDevis, setSubmittingDevis] = useState(false)

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    const db = creerSupabase()
    const [{ data: devis }, { data: cls }] = await Promise.all([
      db.from("devis").select("*, clients(nom, prenom, entreprise, email)").order("created_at", { ascending: false }),
      db.from("clients").select("id, nom, prenom, entreprise, email").order("nom"),
    ])
    setDevisList(devis || [])
    setClients(cls || [])
    setLoading(false)
  }

  async function creerDevis() {
    if (!formDevis.clientId || !formDevis.prestation || !formDevis.montantTotal) return
    setSubmittingDevis(true)
    const db = creerSupabase()

    const { data: numData } = await db.rpc("generate_devis_numero")
    const { error } = await db.from("devis").insert({
      client_id: formDevis.clientId,
      numero: numData || `DEV-${Date.now()}`,
      prestation: formDevis.prestation,
      description: formDevis.description,
      montant_total: parseFloat(formDevis.montantTotal),
      statut: "envoye",
      date_envoi: new Date().toISOString(),
    })

    if (!error) {
      setShowNewDevis(false)
      setFormDevis({ clientId: "", prestation: "", description: "", montantTotal: "" })
      await charger()
    } else {
      alert("Erreur: " + error.message)
    }
    setSubmittingDevis(false)
  }

  async function validerLivraison(devisId: string) {
    setValidating(devisId)
    const db = creerSupabase()

    // Mettre à jour le statut (le webhook de FedaPay gérera après le paiement 40%)
    // Ici on marque que la livraison est validée par l'admin
    // Le client verra le bouton "Payer 40%" apparaître
    await db.from("devis").update({
      statut: "en_cours",
      date_livraison: new Date().toISOString(),
    }).eq("id", devisId)

    await charger()
    setValidating(null)
  }

  const devisFiltres = filterStatut === "tous"
    ? devisList
    : devisList.filter(d => d.statut === filterStatut)

  return (
    <div>
      {/* Outils devis GSE intégré */}
      <div style={{ marginBottom: "32px", backgroundColor: "#f7f7f5", border: "1px solid #e8e6e0", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", backgroundColor: "#0a2e1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#d4a920", fontWeight: "700", fontSize: "14px" }}>Générateur de devis GSE</span>
          <a href="https://globalsolutionsentreprise-maker.github.io/gse-devis/" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
            Ouvrir en plein écran ↗
          </a>
        </div>
        <iframe
          src="https://globalsolutionsentreprise-maker.github.io/gse-devis/"
          style={{ width: "100%", height: "600px", border: "none", display: "block" }}
          title="Générateur de devis GSE"
        />
      </div>

      {/* En-tête section devis */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#0a2e1a", margin: 0 }}>Devis clients</h2>
        <button
          onClick={() => setShowNewDevis(true)}
          style={{ padding: "10px 20px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
        >
          + Nouveau devis
        </button>
      </div>

      {/* Filtres statut */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {["tous", "envoye", "accepte", "modification_demandee", "en_cours", "termine"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatut(s)}
            style={{
              padding: "6px 14px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", border: "none",
              backgroundColor: filterStatut === s ? "#0a2e1a" : "#f0ede6",
              color: filterStatut === s ? "#fff" : "#444",
              fontWeight: filterStatut === s ? "600" : "400",
            }}
          >
            {s === "tous" ? "Tous" : (STATUT_LABELS[s]?.label || s)}
          </button>
        ))}
      </div>

      {/* Formulaire nouveau devis */}
      {showNewDevis && (
        <div style={{ backgroundColor: "#fff", border: "2px solid #0a2e1a", borderRadius: "10px", padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0a2e1a", margin: "0 0 20px" }}>Créer et envoyer un devis</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#888", marginBottom: "6px", textTransform: "uppercase" }}>Client *</label>
              <select
                value={formDevis.clientId}
                onChange={e => setFormDevis(p => ({ ...p, clientId: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px" }}
              >
                <option value="">Choisir un client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom} {c.entreprise ? `— ${c.entreprise}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#888", marginBottom: "6px", textTransform: "uppercase" }}>Prestation *</label>
              <select
                value={formDevis.prestation}
                onChange={e => setFormDevis(p => ({ ...p, prestation: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px" }}
              >
                <option value="">Choisir</option>
                <option value="Désinsectisation">Désinsectisation</option>
                <option value="Dératisation">Dératisation</option>
                <option value="Désinfection">Désinfection</option>
                <option value="Traitement anti-termites">Traitement anti-termites</option>
                <option value="Fumigation">Fumigation</option>
                <option value="Traitement 3D (3 en 1)">Traitement 3D (3 en 1)</option>
                <option value="Accompagnement marchés publics">Accompagnement marchés publics</option>
                <option value="Recrutement & RH">Recrutement & RH</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#888", marginBottom: "6px", textTransform: "uppercase" }}>Description / Détails *</label>
            <textarea
              value={formDevis.description}
              onChange={e => setFormDevis(p => ({ ...p, description: e.target.value }))}
              rows={4}
              placeholder="Surface traitée, zones concernées, produits utilisés, délais..."
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: "20px", maxWidth: "250px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#888", marginBottom: "6px", textTransform: "uppercase" }}>Montant total (FCFA) *</label>
            <input
              type="number"
              value={formDevis.montantTotal}
              onChange={e => setFormDevis(p => ({ ...p, montantTotal: e.target.value }))}
              placeholder="150000"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0ddd6", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={creerDevis}
              disabled={submittingDevis || !formDevis.clientId || !formDevis.prestation || !formDevis.montantTotal}
              style={{ padding: "12px 24px", backgroundColor: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", opacity: submittingDevis ? 0.7 : 1 }}
            >
              {submittingDevis ? "Création..." : "Créer et envoyer au client"}
            </button>
            <button onClick={() => setShowNewDevis(false)} style={{ padding: "12px 20px", backgroundColor: "#f0ede6", color: "#444", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste devis */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>Chargement...</div>
      ) : devisFiltres.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e8e6e0", color: "#888" }}>
          Aucun devis pour ce filtre.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {devisFiltres.map(devis => {
            const statut = STATUT_LABELS[devis.statut] || { label: devis.statut, color: "#444", bg: "#f0f0f0" }
            const clientInfo = devis.clients
            return (
              <div key={devis.id} style={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e8e6e0", padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#d4a920" }}>{devis.numero}</span>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: statut.bg, color: statut.color }}>
                        {statut.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#0a2e1a", marginBottom: "4px" }}>{devis.prestation}</div>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      {clientInfo?.prenom} {clientInfo?.nom}
                      {clientInfo?.entreprise && ` — ${clientInfo.entreprise}`}
                      {clientInfo?.email && ` · ${clientInfo.email}`}
                    </div>
                    {devis.notes_modification && (
                      <div style={{ marginTop: "10px", padding: "10px 14px", backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "6px", fontSize: "13px", color: "#6b21a8" }}>
                        <strong>Demande de modification :</strong> {devis.notes_modification}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", marginLeft: "20px" }}>
                    <div style={{ fontSize: "18px", fontWeight: "600", color: "#0a2e1a", marginBottom: "4px" }}>
                      {Number(devis.montant_total).toLocaleString("fr-FR")} FCFA
                    </div>
                    <div style={{ fontSize: "11px", color: "#888", marginBottom: "10px" }}>
                      {new Date(devis.created_at).toLocaleDateString("fr-FR")}
                    </div>

                    {/* Action: Valider livraison */}
                    {devis.statut === "en_cours" && (
                      <button
                        onClick={() => validerLivraison(devis.id)}
                        disabled={validating === devis.id}
                        style={{ padding: "8px 16px", backgroundColor: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                      >
                        {validating === devis.id ? "..." : "✓ Valider la livraison → 40%"}
                      </button>
                    )}

                    {/* Note modification en attente */}
                    {devis.statut === "modification_demandee" && (
                      <div style={{ fontSize: "11px", color: "#7c3aed", backgroundColor: "#ede9fe", padding: "6px 10px", borderRadius: "6px" }}>
                        ⚠ Modifier le devis et le renvoyer
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
ENDOFFILE
echo "✓ app/admin/clients/page.tsx"

echo ""
echo "=== TOUS LES FICHIERS INSTALLÉS ==="
