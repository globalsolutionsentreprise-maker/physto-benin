# Audit ECC — 2026-10-28

Audit lancé via 4 agents ECC (lecture seule) sur le repo : `database-reviewer`, `security-reviewer`, `silent-failure-hunter`, `seo-specialist`.

> ⚠️ **Caveat :** les agents ont lu le **code + migrations**, pas la prod. Les findings RLS, index et buckets sont à **confirmer en base** (`pg_policies`, `pg_indexes`, `\d`). Les failles « route sans auth » sont certaines (lecture du code).
> Notation `×2/×3` = nombre d'agents ayant relevé le point (confiance).

---

## 🔴 P0 — Sécurité & argent

1. **Routes API sensibles SANS `verifyAdmin`** *(security ×2 + database ×2)* — quick win majeur.
   - `send-devis`, `create-client`, `analyze-contract`, `analyze-rapport`, `generate-article` → ajouter `verifyAdmin`.
   - `generate-contract` (GET ouvert via `window.open`, `admin/page.js:1691`) → jeton signé HMAC court **ou** fetch Bearer + blob.
   - Impacts : relais mail phishing depuis `direction@`, faux devis/contrats GSE à prix arbitraire, IDOR données client, facture Gemini explosable.
2. **`analyze-rapport` = SSRF** *(security)* — `fetch` d'URLs fournies par l'appelant sans whitelist → whitelister `…supabase.co/storage/…`, limiter taille/content-type.
3. **RLS `devis_own_update`** *(security ×2 + database ×2)* — client modifie toutes les colonnes de son devis (clé anon) ; `create-payment` lit `montant_total` → **baisse son prix avant de payer**. DROP + restreindre aux champs signature via route API.
4. **RLS `stock_all`/`mouvements_all` en `USING(true)` pour anon** *(security ×2)* — lecture/écriture/suppression du stock avec la clé publique. DROP les policies permissives (migration 20260604 ne les a pas supprimées).
5. **XSS stocké — `lib/fiche-html.js`** *(security)* — `nomClient`, `signatureClient`… sans `esc()`, servis en `text/html` sur l'origine → vol de session admin. `esc()` partout + valider `data:image/png;base64,` + CSP sur `?doc=1`.

## 🟠 P1 — Intégrité des données

6. **Échecs silencieux en masse** *(silent-failure ×31 + database ×25)* — cause racine : supabase-js renvoie `{error}`, ne throw jamais → `await supabase…` sans lire `error` = muet ; front ne lit pas `res.ok` (catch ne voit que le réseau). Famille de bugs connue (« dépense CRM bloquait en silence », « UI revient au reload sans erreur »). ~30 actions : `move`, `save_client`, `sync_encaissements`, stock désync, rapports « enregistrés » mais perdus, session expirée affichant « ✓ », Finances à 0 au lieu d'erreur.
   - **Fix structurel :** (a) routes → lire `error` → 500 ; (b) front → helper `post()` commun qui throw si `!res.ok`.
7. **Écritures multi-étapes non atomiques** *(database + silent-failure)* — `generate_planning` (DELETE puis INSERT, planning perdu si insert rate), `convert_to_devis` (orphelins + double conversion), `supprimerClient` (devis supprimés, client reste). → RPC transactionnelles.
8. **`create-client` branche « email déjà inscrit »** *(security ×2 + silent-failure)* — remet `user_id=null` (détache le compte) + envoie un mot de passe non fonctionnel. Mot de passe en `Math.random()`.

## 🟡 P2 — Perf & correction

- **Index manquants** *(database)* — aucun sur FK/colonnes filtrées : `devis(client_id)`, `interventions(devis_id)` (24 usages), `leads(traite,created_at)`, `clients(user_id)`… → migration `CREATE INDEX IF NOT EXISTS` (confirmer prod d'abord).
- **`select("*")` non bornés** rechargés à chaque ouverture CRM/RH → `.limit()`, selects explicites, compteurs `head:true`.
- **`verifyAdmin` ignore `role`** *(security + database)* — compte `lecture` peut tout supprimer. Exiger `role==="admin"` sur POST.
- **Bug `''` vs NULL** migration `type_client` (déjà en prod) — backfill à rattraper.
- **Rate-limit/anti-bot** absent sur `register-lead`/`newsletter`/`candidature`.

## 🔵 P3 — SEO / GEO

- 🔴 **Canonical cassé** — `/services`, `/contact`, `/mentions-legales` héritent du canonical de l'accueil (`layout.tsx:14`) → risque désindexation.
- 🟠 **Agrément** — placeholder `AGRÉMENT-BÉNIN-XXXXX` au rendu serveur (`page.tsx:20`) + `llms.txt` dit `APA/26-025` vs `APA-26-026` ailleurs.
- 🟠 **NAP** — 2 emails qui circulent, pas de `streetAddress`, footer Supabase → tél/adresse vides dans le HTML serveur.
- 🟡 hero en `next/image`, `provider:{"@id"}` partagé, Parakou/Bohicon dans `areaServed`, `app/not-found.tsx`.

---

## Notes transverses
- `crm.html` n'existe pas (seul `public/rh.html`). Beaucoup d'écritures Supabase en direct depuis `admin/page.js` au lieu des routes API (convention projet) — c'est ce qui explique l'absence de vérif d'erreur à ces endroits.
- `verifyAdmin` est dupliqué dans 5 routes (pas de lib partagée) — candidat à factorisation dans `lib/`.

## Suivi
- [x] P0 #1 (4/6 — 2026-10-28) — verifyAdmin ajouté sur `send-devis`, `create-client`, `analyze-contract`, `generate-article` (+ `lib/verify-admin.js` partagé, callers admin passés en `authHeaders()`). **RESTE :** `analyze-rapport` (aussi appelé par la page publique `/fiche/[token]` → besoin token-OU-admin) et `generate-contract` (GET via `window.open` → besoin jeton signé HMAC).
- [x] P0 #1 (6/6 — 2026-10-28) — `analyze-rapport` : admin OU `fiche_token` valide (caller public /fiche/[token] envoie `ficheToken`). `generate-contract` : signature HMAC (POST signe, GET vérifie exp+sig ; `ouvrirContrat` ouvre une fenêtre sync puis pose l'URL signée). Secret `CONTRACT_SIGN_SECRET` (repli service-role).
- [ ] P0 #2 — SSRF analyze-rapport (toujours ouvert : whitelister les URLs supabase storage)
- [x] P0 #3/#4 (2026-10-28) — RLS : migration `20261028120000_rls_hardening.sql` (DROP `stock_all`, `mouvements_all`, `devis_own_update`). Les updates client légitimes passent par la nouvelle route `/api/client-devis` (ownership + champs whitelistés). **À APPLIQUER via `supabase db push` au déploiement.** `clients_own_update` (IFU/RCCM modifiables par le client) reste à durcir (moindre).
- [x] P0 #5 (2026-10-28) — XSS `lib/fiche-html.js` : `esc()` étendu aux `"`, helpers `imgData()` (whitelist data-URL base64 pour les `src` de signatures) et `safeUrl()` (http(s) pour les médias). Appliqué à tous les champs saisis de la fiche de passage (publique) + signatures/médias de la fiche de contrôle.
- [~] P1 #6 — helpers erreur. FAIT côté serveur `crm-data` (helper `fail()` + contrôle `error` sur : move, set_lead_traite, delete_lead, sync_encaissements, save_client, del_client, add_depense (fix crash), del_depense, del_charge_fixe, toggle_charge_fixe, del_dep_client, generate_planning DELETE). RESTE : `crm-data` save_devis_fields + add_charge_fixe ; `rh-data` (preparerCertificat, add/save/del_personnel, interventions, paiements_recus) ; **rollout front `res.ok`** dans admin/page.js. FAIT (2026-10-28) : `deplacerCarte` (move — resync base sur échec), `ajouterChargeFixe`, `supprimerChargeFixe`, `supprimerDepense` ; `ajouterDepense` l'avait déjà. RESTE : les autres écritures directes admin/page.js (rapports, stock, certificats…) + routes `rh-data` — à faire avec l'app lancée pour QA.
- [ ] P1 #7 — RPC transactionnelles
- [ ] P1 #8 — create-client branche existante
- [ ] P2 — index / select bornés / role / '' vs NULL / rate-limit
- [ ] P3 — SEO (canonical, agrément, NAP…)
