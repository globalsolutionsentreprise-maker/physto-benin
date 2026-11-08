import { createClient } from "@supabase/supabase-js"

// Garde d'accès admin partagée (factorisée depuis crm-data/rh-data/...).
// Un jeton Supabase valide ne suffit PAS : les clients de l'espace client ont
// aussi un compte. On vérifie donc l'appartenance à admin_acces (actif=true).
// En cas d'erreur de lecture, on REFUSE : une panne ferme l'accès, jamais l'ouvre.
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function verifyAdmin(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  const anon = createClient(SUPA_URL, ANON_KEY)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user || !user.email) return null
  const admin = createClient(SUPA_URL, SERVICE_KEY)
  const { data: acces, error } = await admin
    .from("admin_acces")
    .select("email, actif, role")
    .eq("email", user.email)
    .maybeSingle()
  if (error || !acces || acces.actif !== true) return null
  // Rôle MÉTIER (admin|lecture) issu d'admin_acces. À ne JAMAIS confondre avec
  // user.role (Auth Supabase = "authenticated" pour tout compte connecté).
  user.acces_role = acces.role || null
  return user
}

// Garde d'ÉCRITURE : exige explicitement le rôle métier "admin".
// Refuse PAR DÉFAUT si le rôle est absent, inconnu ou "lecture".
// Un compte "lecture" passe verifyAdmin (consultation) mais JAMAIS verifyAdminWrite.
export async function verifyAdminWrite(req) {
  const user = await verifyAdmin(req)
  if (!user || user.acces_role !== "admin") return null
  return user
}
