# Coding Standards — GSE Phyto-Bénin

## JavaScript (rh.html / crm.html)

- Global state variables must be declared at the top of the `<script>` block
- All Supabase interactions go through the API routes (never call Supabase directly from HTML)
- Use `fetch("/api/rh-data")` or `fetch("/api/crm-data")` for data
- Always use `await fetch(...)` then check `res.ok` before using the response
- DOM manipulation: use `getElementById` with the modal container as context when inside a modal

## API routes (app/api/*/route.js)

- Always export `const dynamic = "force-dynamic"` to prevent caching
- Use Promise.all for parallel Supabase queries
- Every `if (action === "...")` block must return a Response.json()
- Fall through to `return Response.json({ error: "Action inconnue" }, { status: 400 })`
- Never read from `process.env` inside a function — read at module level

## Signatures on documents

- Client signature: ALWAYS on the LEFT
- GSE signature: ALWAYS on the RIGHT
- This applies to all documents: devis, certificats, fiches de passage
- GSE signatory: ALWAYS "Le Directeur Général / Kabir YAKOUBOU" — never Fabrice ADOSSOU (files: admin/page.js gseSigs(), crm.html imprimerDevisFromCrm(), generate-contract/route.js)

## Git commits

- Format: `Feat: description` (new feature) or `Fix: description` (bug fix)
- Never commit .env.local or secrets
- Always co-author with Claude when Claude writes the code
