"use client"
// Panneau « Documents du client » (CRM). Isolé pour limiter le risque de régression
// dans app/admin/page.js. Appelle /api/admin-documents (service_role, bucket privé).
// Lecture via verifyAdmin ; écritures via verifyAdminWrite + gate UI canWrite.
import React, { useState, useEffect } from "react"

const CATS = [
  ["facture", "Facture"], ["rapport_intervention", "Rapport d'intervention"], ["fiche_technique", "Fiche technique"],
  ["fiche_controle", "Fiche de contrôle/suivi"], ["attestation", "Attestation"], ["contrat", "Contrat"],
  ["devis", "Devis"], ["autre", "Autre document"],
]
const CAT_LABEL = Object.fromEntries(CATS)
const STATUT = {
  brouillon: { l: "Brouillon", bg: "#f3f4f6", c: "#92400e" },
  publie:    { l: "Publié",    bg: "#d1fae5", c: "#065f46" },
  archive:   { l: "Archivé",   bg: "#e5e7eb", c: "#6b7280" },
}
const h = React.createElement
const EMPTY = { categorie: "facture", titre: "", date_document: "", reference: "", description: "", visibilite: "brouillon", interventionId: "", file: null }

export default function DocumentsClient({ db, clientId, canWrite }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const [modal, setModal] = useState(null)   // { mode:'add'|'edit', form, id }
  const [busy, setBusy] = useState(false)
  const [replaceId, setReplaceId] = useState(null)

  async function token() {
    const { data: { session } } = await db.auth.getSession()
    return (session && session.access_token) || ""
  }
  async function jpost(body) {
    const t = await token()
    const res = await fetch("/api/admin-documents", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify(body) })
    return { res, data: await res.json().catch(() => ({})) }
  }
  async function fpost(form) {
    const t = await token()
    const res = await fetch("/api/admin-documents", { method: "POST", headers: { Authorization: "Bearer " + t }, body: form })
    return { res, data: await res.json().catch(() => ({})) }
  }

  async function reload() {
    setLoading(true)
    const { res, data } = await jpost({ action: "list", clientId })
    if (res.ok) setDocs(data.documents || [])
    else setMsg("Erreur de chargement : " + (data.error || res.status))
    setLoading(false)
  }
  useEffect(() => { if (clientId) reload() }, [clientId])

  function flash(t) { setMsg(t); setTimeout(() => setMsg(null), 3500) }

  async function submitAdd() {
    const f = modal.form
    if (!f.file) return flash("Sélectionne un fichier PDF.")
    if (!f.titre.trim()) return flash("Titre requis.")
    if (f.file.size > 4 * 1024 * 1024) return flash("Fichier trop volumineux (max 4 Mo).")
    setBusy(true)
    const fd = new FormData()
    fd.append("action", "add"); fd.append("clientId", clientId); fd.append("categorie", f.categorie)
    fd.append("titre", f.titre.trim())
    if (f.date_document) fd.append("date_document", f.date_document)
    if (f.reference) fd.append("reference", f.reference)
    if (f.description) fd.append("description", f.description)
    if (f.interventionId) fd.append("interventionId", f.interventionId)
    fd.append("file", f.file)
    const { res, data } = await fpost(fd)
    if (!res.ok) { setBusy(false); return flash("Échec : " + (data.error || res.status)) }
    // Publication = action explicite (le dépôt ne publie jamais côté serveur).
    if (f.visibilite === "publie" && data.document) { await jpost({ action: "publish", id: data.document.id }) }
    setBusy(false); setModal(null); flash("Document ajouté" + (f.visibilite === "publie" ? " et publié." : " (brouillon).")); reload()
  }

  async function submitEdit() {
    const f = modal.form
    if (!f.titre.trim()) return flash("Titre requis.")
    setBusy(true)
    const { res, data } = await jpost({ action: "update", id: modal.id, titre: f.titre.trim(), categorie: f.categorie, date_document: f.date_document || null, reference: f.reference || null, description: f.description || null })
    setBusy(false)
    if (!res.ok) return flash("Échec : " + (data.error || res.status))
    setModal(null); flash("Modifié."); reload()
  }

  async function act(action, id, label) {
    if (action === "delete" && !window.confirm("Supprimer définitivement ce document et son fichier ?")) return
    const { res, data } = await jpost({ action, id })
    if (!res.ok) return flash("Échec : " + (data.error || res.status))
    flash(label); reload()
  }
  async function ouvrir(id) {
    const { res, data } = await jpost({ action: "download", id })
    if (!res.ok) return flash("Ouverture impossible : " + (data.error || res.status))
    window.open(data.url, "_blank", "noopener")
  }
  async function onReplaceFile(e) {
    const file = e.target.files && e.target.files[0]; e.target.value = ""
    const id = replaceId; setReplaceId(null)
    if (!file || !id) return
    if (file.type !== "application/pdf") return flash("PDF uniquement.")
    if (file.size > 4 * 1024 * 1024) return flash("Fichier trop volumineux (max 4 Mo).")
    const fd = new FormData(); fd.append("action", "replace"); fd.append("id", id); fd.append("file", file)
    const { res, data } = await fpost(fd)
    if (!res.ok) return flash("Échec du remplacement : " + (data.error || res.status))
    flash("Fichier remplacé."); reload()
  }

  // ---- styles ----
  const card = { backgroundColor: "#fff", border: "1px solid #e8e6e0", borderRadius: "10px", padding: "16px 20px", marginTop: "18px" }
  const btn = (bg, bd, c) => ({ background: bg, border: "1px solid " + bd, color: c, borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" })

  function row(d) {
    const st = STATUT[d.statut] || STATUT.brouillon
    return h("div", { key: d.id, style: { border: "1px solid #e8e6e0", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px", background: "#fafaf8" } },
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" } },
        h("div", null,
          h("div", { style: { fontSize: "13px", fontWeight: "700", color: "#0a2e1a" } }, d.titre),
          h("div", { style: { fontSize: "11px", color: "#666", marginTop: "3px", display: "flex", gap: "12px", flexWrap: "wrap" } },
            h("span", null, CAT_LABEL[d.categorie] || d.categorie),
            d.date_document ? h("span", null, "📅 " + d.date_document) : null,
            d.reference ? h("span", null, "réf " + d.reference) : null,
            d.nom_fichier ? h("span", { style: { color: "#999" } }, d.nom_fichier) : null
          )
        ),
        h("span", { style: { padding: "3px 10px", borderRadius: "20px", fontSize: "10.5px", fontWeight: "700", background: st.bg, color: st.c, whiteSpace: "nowrap" } }, st.l)
      ),
      h("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" } },
        h("button", { onClick: () => ouvrir(d.id), style: btn("#eef2ff", "#c7d2fe", "#3730a3") }, "👁 Ouvrir"),
        canWrite && (d.statut !== "publie"
          ? h("button", { onClick: () => act("publish", d.id, "Publié."), style: btn("#f0fdf4", "#bbf7d0", "#065f46") }, "✓ Publier")
          : h("button", { onClick: () => act("unpublish", d.id, "Dépublié."), style: btn("#fff7ed", "#fed7aa", "#c2410c") }, "Dépublier")),
        canWrite && h("button", { onClick: () => setModal({ mode: "edit", id: d.id, form: { categorie: d.categorie, titre: d.titre, date_document: d.date_document || "", reference: d.reference || "", description: d.description || "", visibilite: d.statut, interventionId: d.intervention_id || "" } }), style: btn("#fff", "#d1d5db", "#374151") }, "✏️ Modifier"),
        canWrite && h("button", { onClick: () => { setReplaceId(d.id); document.getElementById("doc-replace-input").click() }, style: btn("#fff", "#d1d5db", "#374151") }, "⟳ Remplacer"),
        canWrite && d.statut !== "archive" && h("button", { onClick: () => act("archive", d.id, "Archivé."), style: btn("#f3f4f6", "#d1d5db", "#6b7280") }, "📥 Archiver"),
        canWrite && h("button", { onClick: () => act("delete", d.id, "Supprimé."), style: btn("#fff", "#fecaca", "#991b1b") }, "🗑 Supprimer")
      )
    )
  }

  function modalEl() {
    if (!modal) return null
    const f = modal.form, set = (k, v) => setModal({ ...modal, form: { ...modal.form, [k]: v } })
    const inp = { width: "100%", padding: "9px 11px", border: "1.5px solid #e0ddd6", borderRadius: "7px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit" }
    return h("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" } },
      h("div", { style: { background: "#fff", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "460px", maxHeight: "90vh", overflowY: "auto" } },
        h("div", { style: { fontSize: "16px", fontWeight: "700", color: "#0a2e1a", marginBottom: "16px" } }, modal.mode === "add" ? "Ajouter un document" : "Modifier le document"),
        h("label", { style: { fontSize: "11px", fontWeight: "600", color: "#555" } }, "Catégorie"),
        h("select", { value: f.categorie, onChange: e => set("categorie", e.target.value), style: { ...inp, marginBottom: "12px", marginTop: "4px" } }, CATS.map(c => h("option", { key: c[0], value: c[0] }, c[1]))),
        h("label", { style: { fontSize: "11px", fontWeight: "600", color: "#555" } }, "Titre *"),
        h("input", { value: f.titre, onChange: e => set("titre", e.target.value), placeholder: "ex. Facture n°2026-012", style: { ...inp, marginBottom: "12px", marginTop: "4px" } }),
        h("div", { style: { display: "flex", gap: "10px", marginBottom: "12px" } },
          h("div", { style: { flex: 1 } }, h("label", { style: { fontSize: "11px", fontWeight: "600", color: "#555" } }, "Date"), h("input", { type: "date", value: f.date_document, onChange: e => set("date_document", e.target.value), style: { ...inp, marginTop: "4px" } })),
          h("div", { style: { flex: 1 } }, h("label", { style: { fontSize: "11px", fontWeight: "600", color: "#555" } }, "Référence"), h("input", { value: f.reference, onChange: e => set("reference", e.target.value), placeholder: "facultatif", style: { ...inp, marginTop: "4px" } }))
        ),
        h("label", { style: { fontSize: "11px", fontWeight: "600", color: "#555" } }, "Description"),
        h("textarea", { value: f.description, onChange: e => set("description", e.target.value), rows: 2, style: { ...inp, marginBottom: "12px", marginTop: "4px", resize: "vertical" } }),
        modal.mode === "add" ? h("div", { style: { marginBottom: "12px" } },
          h("label", { style: { fontSize: "11px", fontWeight: "600", color: "#555" } }, "Fichier PDF * (max 4 Mo)"),
          h("input", { type: "file", accept: "application/pdf", onChange: e => set("file", e.target.files && e.target.files[0]), style: { display: "block", marginTop: "4px", fontSize: "12px" } })
        ) : null,
        modal.mode === "add" ? h("div", { style: { marginBottom: "16px" } },
          h("label", { style: { fontSize: "11px", fontWeight: "600", color: "#555" } }, "Visibilité"),
          h("select", { value: f.visibilite, onChange: e => set("visibilite", e.target.value), style: { ...inp, marginTop: "4px" } },
            h("option", { value: "brouillon" }, "Brouillon (interne)"),
            h("option", { value: "publie" }, "Publier au client"))
        ) : null,
        h("div", { style: { display: "flex", gap: "10px", marginTop: "8px" } },
          h("button", { disabled: busy, onClick: modal.mode === "add" ? submitAdd : submitEdit, style: { flex: 1, background: "#0a2e1a", color: "#fff", border: "none", borderRadius: "8px", padding: "11px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 } }, busy ? "..." : (modal.mode === "add" ? "Ajouter" : "Enregistrer")),
          h("button", { onClick: () => setModal(null), style: { background: "#fff", border: "1px solid #e0ddd6", borderRadius: "8px", padding: "11px 18px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" } }, "Annuler")
        )
      )
    )
  }

  return h("div", { style: card },
    h("input", { type: "file", id: "doc-replace-input", accept: "application/pdf", onChange: onReplaceFile, style: { display: "none" } }),
    h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" } },
      h("div", { style: { fontSize: "15px", fontWeight: "700", color: "#0a2e1a" } }, "📁 Documents du client"),
      canWrite && h("button", { onClick: () => setModal({ mode: "add", form: { ...EMPTY } }), style: { background: "#d4a920", color: "#0a2e1a", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" } }, "+ Ajouter un document")
    ),
    msg ? h("div", { style: { fontSize: "12px", padding: "8px 12px", background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "7px", color: "#3730a3", marginBottom: "12px" } }, msg) : null,
    loading ? h("div", { style: { color: "#888", fontSize: "13px" } }, "Chargement…")
      : docs.length === 0 ? h("div", { style: { color: "#888", fontSize: "13px", padding: "16px 0" } }, "Aucun document pour ce client.")
      : docs.map(row),
    modalEl()
  )
}
