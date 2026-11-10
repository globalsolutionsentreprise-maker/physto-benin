// app/api/client-documents/route.js
// Étape C — Téléchargement sécurisé d'un document par le CLIENT connecté.
// Le bucket 'documents' est privé : le fichier est servi par URL signée courte
// générée en service_role. Double contrôle serveur AVANT de signer :
//   1) le document doit être PUBLIÉ (jamais brouillon/archivé) ;
//   2) il doit appartenir à un client dont le user_id = utilisateur connecté.
// Un client ne peut donc pas obtenir le fichier d'un autre client, ni un brouillon,
// même en devinant un id. (La RLS protège déjà la lecture des métadonnées.)
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BUCKET = "documents"

function j(data, status) { return Response.json(data, status ? { status } : undefined) }

export async function POST(req) {
  let body
  try { body = await req.json() } catch { return j({ error: "JSON invalide" }, 400) }
  if (body.action !== "download") return j({ error: "Action inconnue" }, 400)

  // Identité du client connecté.
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return j({ error: "Authentification requise" }, 401)
  const anon = createClient(SUPABASE_URL, ANON_KEY)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user) return j({ error: "Session invalide" }, 401)

  const id = body.documentId
  if (!id) return j({ error: "documentId requis" }, 400)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: doc } = await supabase
    .from("documents").select("client_id, statut, storage_path").eq("id", id).single()
  if (!doc) return j({ error: "Document introuvable" }, 404)
  if (doc.statut !== "publie") return j({ error: "Document non disponible" }, 403)

  // Propriété : le document doit appartenir à un établissement du client connecté.
  const { data: owner } = await supabase
    .from("clients").select("id").eq("id", doc.client_id).eq("user_id", user.id).maybeSingle()
  if (!owner) return j({ error: "Accès refusé" }, 403)

  const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60)
  if (error) return j({ error: "Lien indisponible" }, 500)
  return j({ url: signed.signedUrl })
}
