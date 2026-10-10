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

[2026-09-22] | Dépôt de PDF dans un dossier client local dont le nom finit par un ESPACE (« Harvest Fields ») : chemin construit sans « / » final → fichiers créés À CÔTÉ dans le parent (nommés « Harvest Fields <fichier>.pdf ») au lieu de dedans. La vérif `ls fichier` passait quand même (chemin concaténé identique), masquant l'erreur. | Pour toute écriture de fichier dans un dossier : toujours terminer le chemin du dossier par « / » explicite, et vérifier avec `ls "<dossier>/"` (le dossier), pas `ls "<dossier><fichier>"`. Les dossiers de `~/Documents/ACTIVITE PHYTO- BENIN GSE ` ont souvent des espaces finaux (dossier parent inclus).

## Format d'ajout

Nouvelle correction de l'utilisateur → ajouter une entrée datée en bas de « Journal récent ».
Quand une entrée devient une règle durable : la promouvoir dans RÈGLES ACTIVES ci-dessus et déplacer l'entrée brute vers `tasks/lessons-archive.md` (pour garder ce fichier court).

Format : `[YYYY-MM-DD] | ce qui s'est mal passé | règle à suivre la prochaine fois`

## Journal récent

[2026-09-14] | Carrousel LinkedIn, slide « Vision 2026 » : inventé une « 3ᵉ solution GSE lancée au Bénin » qui n'existe pas, dans un livrable publié | Règle 53 déjà active : pour tout contenu métier destiné à la publication (slides, annonces, objectifs), ne mettre QUE du réel ou un gabarit explicite « [à compléter] ». Jamais une ambition/produit inventé présenté comme un projet réel, même dans une slide « vision ».

[2026-09-14] | Prospection froide injectée dans la table `leads` (leads entrants du site, seul état = booléen `traite`) : pas pilotable, pas de pipeline/relance/canal. Utilisateur a jugé « pas fonctionnel ». | Le démarchage sortant a sa table dédiée `prospects` (module /admin/prospection : statut a_contacter→…→gagne/perdu, canal, prochaine_relance, campagne ; actions 1 clic wa.me/tel/email ; convert_to_devis = bascule en exécution). Ne JAMAIS mélanger prospection froide et leads entrants. NB : l'onglet CRM « 🎯 Prospection » est le pipeline kanban des DEVIS (lane commerciale), pas les prospects froids.

[2026-09-22] | Note « intervention initiale (devis X) facturée séparément » sur le contrat. 1er correctif client (forcer `sansNoteDevis:"1"` dans `ouvrirContratExistant`) insuffisant : bundle JS en cache + le param n'était que gating, la note revenait. Devis et contrat ne sont PAS liés (le client choisit l'un OU l'autre), donc la note n'a pas lieu d'être. | Correctif définitif = SERVEUR : supprimer les 2 blocs de note dans `app/api/generate-contract/route.js` (Article 2 + note de bas de grille). Ne jamais gater un contenu métier « à ne jamais afficher » par un simple param côté client (cache + chemins multiples). Case « Inclure la note devis » retirée du modal (devenue morte). Règle : un contrat GSE ne référence jamais le devis comme facturation séparée.

[2026-09-25] | Colonne « dépenses » d'une affaire (Finances) gonflée (Saho 48000 au lieu de 23000 ; La Manne échec 60000 sur une affaire perdue). Cause : un lot de lignes `depenses_devis` estimées/placeholder (libellés génériques « 1 flacon », montants ronds), inséré automatiquement sur des affaires NON encaissées (contact/échec), qui double avec la saisie réelle de l'utilisateur. La dépense affichée = somme brute des `depenses_devis` (− investissement + prestataires interventions) : tout doublon en base se cumule. | Ne JAMAIS insérer en base des dépenses estimées/placeholder sur une affaire (surtout non convertie) : elles persistent et se cumulent avec la saisie réelle. Diagnostiquer un total de dépenses faux = lister `depenses_devis` par `devis_id` et repérer les lignes au même `created_at` exact (= lot automatique) ; supprimer par ID, vérifier le total avant/après.

[2026-10-02] | « ↩ Relancer » un contrat perdu ne faisait rien : la carte restait en « Contrats perdus », ne revenait pas dans « générés non signés ». Cause : `deplacerCarte` mettait à jour l'état optimiste `etape` mais pas `crm_statut`, alors que le filtre `estPerduD` lit LES DEUX (`etape==="perdu" || crm_statut==="echec"`). `crm_statut` restait à "echec" → carte toujours perdue sans rechargement. | Une MAJ d'état optimiste doit poser TOUS les champs que les filtres/dérivés lisent, pas juste celui qu'on « déplace ». Fix = ajouter `crm_statut: crm` dans le `setDevisList` de `deplacerCarte` (miroir ligne 1814 + du `statut: crm` de finData juste en dessous).

[2026-10-02] | Après avoir fixé la date de début d'un contrat déjà signé (La Manne Dorée, 26/09), les dates d'intervention/contrôle restaient sur l'ancien planning : `marquer_contrat_signe` ne régénère le planning que si AUCUN passage n'existe (garde-fou anti-doublon). Changer la date ne recalculait donc rien. | Changer la date de début d'un contrat DOIT recalculer le planning depuis la règle `datesPassages` (lib/contrat-analyse.mjs). Fait via `forceReplan` dans l'action `marquer_contrat_signe` : delete + réinsertion, MAIS refusé si un passage est engagé (statut≠planifiee, montant_payé>0, ou technicien affecté) → planning conservé, UI invite à ajuster à la main. Ne jamais détruire un planning où du travail est déjà organisé. Règle de calcul trimestriel = interventions tous les ~92j, contrôle à +45j (issu du planning réel de La Manne Dorée).

[2026-10-02] | « pourquoi 8 passages ? » : j'avais calculé le planning via datesPassages (heuristique 1 contrôle/intervention) SANS lire le vrai contrat. Le contrat réel (contrats.params) = Formule Intégrale, passages=4 + controles=8 = 12 passages (contrôles mensuels inter-passage). La règle générait 8 au lieu de 12. | Un planning de contrat se génère depuis les COMPTEURS du contrat (contrats.params.passages/controles), jamais depuis une heuristique de fréquence. Quand l'utilisateur dit « vérifie le contrat », lire contrats.params ET le PDF generate-contract (la vraie cadence : « × N / an, mensuel, inter-passage »), pas seulement la ligne devis (duree/frequence/montant). Fonction dédiée = planifierPassages() ; datesPassages reste un repli pour contrats sans params.

[2026-10-02] | La Manne Dorée « met en ordre » : la ligne devis portait le prix PONCTUEL (176358) pas l'annuel du contrat, le planning avait 8 passages (heuristique) au lieu de 12, 1 seul dû saisi à la main (176000). Le vrai contrat (PDF signé) = Formule Intégrale 12 mois, 4 interventions trimestrielles à 158722 + 8 contrôles mensuels INCLUS (0) + 1 audit annuel ; total 634888, paiement trimestriel d'avance. | Toujours lire le PDF signé (generate-contract) comme source de vérité, pas la ligne devis. Le montant_net d'un CONTRAT doit être l'annuel (prix/passage × nb interventions), pas le prix ponctuel. Le dû de chaque passage découle du montant net via montantDuPassage (interventions se partagent le net, contrôles = 0) — désormais posé à la génération. Garde-fou replanification : protège TOUT le planning si un passage a des techniciens → pour corriger, préserver la ligne engagée (date+techniciens) et ne remplacer que les lignes vides. NB audit annuel (×1/an fin de contrat) pas encore modélisé comme passage.

[2026-10-02] | Après avoir mis 12 passages (2 contrôles/intervalle, conforme au PDF ×8), l'utilisateur a corrigé : le vrai rythme terrain = 1 contrôle entre chaque intervention = 4 contrôles/an (8 passages + 1 audit = 9). Le PDF signé (×8 contrôles) est donc FAUX, à rééditer en ×4. | Le nombre de contrôles d'un contrat se confirme AVEC l'utilisateur (réalité terrain), pas seulement depuis le PDF, le PDF peut être erroné. planifierPassages répartit les contrôles PAR INTERVALLE (base + reste), pas en remplissage global. Audit annuel = type de passage "audit" (dû 0), dérivé de la formule (Intégrale → 1/an). Toujours finir par « vérifier tous les contrats » (script cohérence planning vs params vs net).

[2026-10-05] | Contrat KIKI (engagement 2 ans, année 1 à 120 F/m², année 2 réévaluée). 1er codage : la clause « engagement ferme » dans generate-contract était déclenchée par `manuel || engagementMois > duree`, ce qui touchait AUSSI les contrats manuels standards. L'utilisateur a corrigé : le « pluriannuel » et la « réévaluation » sont propres à ce type de contrat, ne pas les rendre génériques. | Toute formulation contractuelle spécifique à un deal (pluriannuel, tarif année 2 réévalué par avenant, titre « pluriannuel ») doit être STRICTEMENT opt-in, gâtée sur le paramètre explicite `engagementMois > duree`, jamais appliquée au contrat standard. Nouveau param `engagementMois` dans generate-contract (défaut = duree → zéro changement pour l'existant) + champ « Engagement ferme (mois) » dans le modal manuel. Vérifier systématiquement qu'un contrat SANS le param reste identique à avant (titre « annuel », Article 6 « cochée à l'Article 4 », pas de note de réévaluation).

[2026-10-06] | Pour expliquer le tarif dans le contrat, j'avais proposé un champ TEXTE libre à rédiger. L'utilisateur : « je ne veux pas écrire de texte mais des chiffres et tu traduis ça en phrase ». | Pour une explication métier dans un document (tarif, calcul), proposer des champs CHIFFRÉS (ex. prix/m²) et laisser le code reconstruire la phrase depuis les données déjà en base (superficie du devis, prestations), jamais faire saisir la phrase à la main. Fait : param `prixM2` dans generate-contract → phrase « Base tarifaire : X FCFA/m² × superficie × N prestations = Y/passage ». Option alerte : préavis de réévaluation/renouvellement réglable (défaut `SEUIL_RENOUVELLEMENT_JOURS = 32`), `resumeContrat` expose `alerteRenouvellement`/`joursAvantFin`, bannière dans l'onglet Contrats. Les deux features sont opt-in (vide/0 → inchangé).

[2026-10-10] | Fiche terrain `/fiche/[token]` : pour retirer le chrome marketing (nav, bandeau offre, footer, WhatsApp flottant) hérité du `app/layout.tsx` racine. En App Router, un layout imbriqué NE PEUT PAS retirer le chrome du layout racine (il s'imbrique, ne remplace pas) ; un route-group aurait obligé à déplacer toutes les pages. | Pour masquer le chrome sur une route précise, suivre l'idiome DÉJÀ en place dans ce repo : chaque élément de chrome est un composant client qui s'auto-masque via `usePathname()` (ex. `WhatsAppFloat` fait `if (pathname.startsWith("/admin")) return null`). Fait : navbar + bandeau extraits dans `app/components/SiteHeader.tsx` (masqué sur `/fiche`), + garde `startsWith("/fiche")` dans Footer et WhatsAppFloat. Le `return null` se place APRÈS tous les hooks (useState/useEffect). Zéro impact sur les pages marketing et l'admin.

[2026-10-10] | QA navigateur juste après `git push` : le 1er screenshot de `/fiche` montrait encore tout le chrome (fix semblait cassé). Cause : la boucle de poll a cassé dès que `/`=200, mais c'était l'ANCIEN déploiement Vercel encore servi (build pas fini). | Avant toute QA visuelle post-déploiement, confirmer que le NOUVEAU build est live via un marqueur de CONTENU qui change (ex. `curl /fiche | grep -c "Offre de bienvenue"` doit tomber à 0), pas seulement un code HTTP 200 (stable entre les deux versions). Puis seulement screenshot. Astuce fiche : un faux token suffit pour vérifier le chrome (masquage basé sur le pathname, indépendant de la validité du token) → QA sans toucher la base.
