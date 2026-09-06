# Lessons — Règles actives

Ce fichier est lu au démarrage de chaque session. Il ne contient QUE les règles
encore valides, distillées. L'historique complet des incidents (51 entrées) est
dans `tasks/lessons-archive.md`, NON lu automatiquement : le consulter seulement
si une règle ci-dessous est ambiguë ou pour retrouver le contexte d'un bug.

## RÈGLES ACTIVES (non négociables)

### Supabase / RLS / API
- Toute interaction Supabase passe par une route `/api/*` (service_role + `verifyAdmin` + `Authorization: Bearer`). JAMAIS de `db.from(...).insert/update/delete` direct depuis `page.js`/`page.tsx` sur une table RLS. Symptôme d'un RLS bloquant : l'UI change puis revient au reload, sans erreur console.
- Toute nouvelle table : `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policies dans LA MÊME migration.
- Toute route qui lit/écrit des données sensibles : `verifyAdmin(req)`, y compris les GET. Après ajout d'une route, vérifier en prod qu'un appel non authentifié renvoie 401.
- `createClient` s'instancie DANS le handler (GET/POST), jamais au niveau module. Chaque route Supabase exporte `const dynamic = "force-dynamic"`.
- Numéro de devis : `crypto.randomUUID()`, jamais le RPC `generate_devis_numero` (doublons).
- Migrations : timestamp strictement supérieur à la dernière migration distante (vérifier `npx supabase migration list`). DDL via `npx supabase db push` (CLI), jamais via les outils MCP Supabase (lecture seule).
- Plusieurs `.select("col1,col2,...")` sur la même table : les mettre TOUS à jour ensemble quand on ajoute une colonne (grep `from("table")`). Symptôme « données en base mais absentes à l'écran » = un select qui ne liste pas la colonne.

### Devis / CRM / Pipeline
- Tout insert de devis destiné au dashboard DOIT définir `crm_statut` (ex. 'contact'), sinon filtré et invisible (persistant après F5, sans erreur).
- Source de vérité du pipeline = colonne `devis.etape`. Toute action qui fait progresser un devis met `etape` à jour, sinon la carte ne bouge pas.
- Prix de base = somme des lignes via helper `baseDevis(form)`, jamais stocké/relu depuis `montant_net` (montant post-remise = base fausse, remise en cascade).
- `save_client` : persister le champ `client` vers `clients.nom`.
- Bloc multi-prestation : afficher dès `length >= 1`.
- Avant de croire à un doublon de lignes, vérifier en base ; souvent c'est `entreprise == nom` concaténé à l'affichage.
- Avant de supprimer un devis « vide/brouillon », vérifier les tables rattachées (interventions, rapports_visite, rapports_intervention, certificats, fiches_passage, contrats, paiements) via `devis_id` ; réassigner avant de supprimer. « Vide » à l'écran ≠ vide en base.
- Ouvrir un modal/formulaire rendu conditionnellement à une vue : faire AUSSI `setVue(...)`, pas seulement set l'état.
- Prix du contrat de maintenance = DÉTERMINISTE (`lib/contrat-analyse.mjs`), jamais fixé par l'IA.

### Documents imprimables (devis, certificats, fiches, rapports, contrats)
- Ouvrir via `ouvrirDocImprimable` (URL blob `URL.createObjectURL`), jamais `document.write` sur about:blank (PDF vide au renommage). `<title>` exploitable via `nomFichierDoc` (pas de tiret cadratin, pas de `/ \ : * ? " < > |`).
- Styles : toujours `GSE_DOC_STYLES + '</style></head><body>'` (GSE_DOC_STYLES ne ferme pas la balise `<style>`).
- Séparer Sauvegarder (garde le modal ouvert, confirme en vert) et Imprimer (ouvre seulement la fenêtre). Bouton « Aperçu » dans les listes de documents.
- Un document contractuel décrit UNIQUEMENT les prestations réellement vendues (dérivées de `devis.prestation` normalisée), jamais un gabarit en dur. Certificat : type `'double'` si deux prestations (grep TOUTES les migrations, pas que le CREATE TABLE).
- Devis imprimé : `.filter(Boolean)` sur prestList, filtrer prix > 0, `momo-block { display:none }` à l'impression, CSS `@media print` complet.

### IA (Gemini, prompts)
- Ne jamais faire confiance à l'IA seule pour une contrainte métier : parser la valeur en JS, l'injecter comme contrainte dure dans le prompt ET l'écraser après `JSON.parse`. Parser `demandeClient` dans TOUS les chemins (IA et direct).
- Un prompt qui interpole des champs BDD : vérifier chaque champ vs le schéma réel. Une requête annexe en échec écrit « indisponible », jamais une valeur par défaut présentée comme un fait.
- Appeler réellement une feature IA (et dérouler le premier rendu d'un état React conditionnel) avant de la déclarer finie. Un budget de tokens ne se déduit pas de la longueur attendue.

### Sécurité / secrets
- Webhook Meta/WhatsApp : `WHATSAPP_APP_SECRET` pour la vérification HMAC, jamais l'access token. Bot : ne jamais devenir un cul-de-sac après un lead (repartir sur une conversation neuve).
- Jamais de mot de passe hardcodé côté client, jamais de fallback `localStorage` pour l'auth admin, jamais `rejectUnauthorized:false` en prod.
- Upload base64 POST vers Vercel : total < ~4,3 Mo (plafond plateforme ~4,5 Mo), jamais `res.json()` sans try/catch ; gros fichiers via Supabase Storage.

### Next.js 16
- `params` est une `Promise` : `await params` dans les pages dynamiques, `generateMetadata`, `generateStaticParams`. Composant `async`.

### Style / livrables (IMPÉRATIF)
- INTERDICTION du tiret cadratin/demi-cadratin (— –) comme ponctuation, dans le CHAT comme dans tout livrable. Remplacer par virgule, deux-points, point, parenthèses. Les traits d'union dans les mots composés restent OK.
- Signatures documents : client TOUJOURS à gauche, GSE à droite. Signataire GSE = « Le Directeur Général / Kabir YAKOUBOU », jamais Fabrice.
- Ne jamais inventer un contenu métier publié (annonce, tarif, prix) : demander ou poser un gabarit « à compléter ». Ne jamais inventer de prix chiffré dans les articles TARIFS.
- URL de prod = `https://www.phyto-benin.com`, jamais une URL `*.vercel.app`.

### Workflow / QA
- QA de l'admin : déployer d'abord, tester sur `https://www.phyto-benin.com/admin` (utilisateur déjà connecté). Ne jamais saisir ses identifiants à sa place.
- Scripts JS de QA/DOM : scoper la recherche d'un élément à profondeur 1-2 (parent direct du bouton), jamais remonter au conteneur qui agrège tout. JAMAIS scripter une action DESTRUCTIVE (supprimer client/devis/lead) par nom via remontée DOM : cibler par ID via l'API ou par coordonnées vues à l'écran. Vérifier le décompte avant/après.
- Avant de développer une feature « manquante », grep les points d'entrée existants (`grep -n "setXxxModal"`) : souvent déjà là, enterrée dans une vue. Fournir le CRUD complet (édition incluse) dès le départ pour toute entité éditable.
- Helpers : vérifier dans QUEL composant ils sont définis avant de les appeler (`app/admin/page.js` a deux composants qui ne partagent pas leur scope ; dans `SectionClientsDevis`, prendre le token via `db.auth.getSession()`, pas `authHeaders()`). Un `try/catch` qui retombe sur un message générique masque une ReferenceError : logguer `e` avant de conclure à une erreur réseau.
- « Page blanche » : faire préciser QUELLE surface (page de l'app / fenêtre ouverte / fichier téléchargé / aperçu) AVANT de coder un correctif.

## Format d'ajout

Nouvelle correction de l'utilisateur → ajouter une entrée datée en bas de « Journal récent ».
Quand une entrée devient une règle durable : la promouvoir dans RÈGLES ACTIVES ci-dessus et déplacer l'entrée brute vers `tasks/lessons-archive.md` (pour garder ce fichier court).

Format : `[YYYY-MM-DD] | ce qui s'est mal passé | règle à suivre la prochaine fois`

## Journal récent

(vide — les 51 entrées historiques sont dans `tasks/lessons-archive.md`)
