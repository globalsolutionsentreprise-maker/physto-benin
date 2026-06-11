# Lessons — Journal d'apprentissage

Ce fichier est lu au début de chaque session par Claude Code et avant toute modification de code.

## Format

[YYYY-MM-DD] | ce qui s'est mal passé | règle à suivre la prochaine fois

## Entrées

[2026-05-25] | Bouton "Générer certificat" faisait save + print en même temps, sans confirmation visuelle — l'utilisateur perdait son travail si la popup était bloquée | Toujours séparer Sauvegarder (garde le modal ouvert, confirme en vert) et Imprimer (ouvre seulement la fenêtre d'impression)

[2026-05-25] | Liste documents sans aperçu : impossible de distinguer plusieurs certificats du même client | Toujours ajouter un bouton "Aperçu" dans les listes de documents, régénérant le HTML depuis les données sauvegardées
[2026-05-28] | createClient(@supabase/supabase-js) appelé au niveau module dans analyze-contract, create-client, generate-contract — build échoue avec "supabaseKey is required" car les env vars ne sont pas disponibles à build time | Toujours instancier createClient à l'intérieur du handler (GET/POST), jamais au niveau module ; ajouter export const dynamic = "force-dynamic" sur chaque route API Supabase

[2026-05-29] | L'IA (analyze-contract) ignorait la demande du client sur la fréquence de passages même avec RÈGLE 0 dans le prompt. L'IA utilise son propre jugement et ignore les règles textuelles. | Ne jamais faire confiance à l'IA seule pour respecter une contrainte métier critique. Toujours parser la valeur dans le code JS (parseFrequenceClient), l'injecter comme contrainte dure dans le prompt ET l'écraser dans la réponse après le JSON.parse. Double sécurité : prompt + surcharge côté serveur.

[2026-05-29] | Le bouton "Générer directement" (prix négocié) ignorait demandeClient et hardcodait passages=4/paiement=trimestriel. L'utilisateur tape "deux passages par an" mais le contrat générait 4 passages. | Toujours parser demandeClient dans TOUS les chemins de génération (IA et direct). Dupliquer la même regex de parsing côté frontend pour le bouton direct.
[2026-06-02] | Activation RLS sans policies brise le portail client (espace-client utilise la clé anon + JWT) et l'admin panel (accès CMS direct via anon) | Toujours créer les policies RLS en même temps que l'activation RLS — jamais ALTER TABLE ENABLE ROW LEVEL SECURITY sans la migration de policies correspondante

[2026-06-04] | Bloc prix-par-prestation ne s'affichait pas avec condition `length > 1` — le cas 1 prestation était exclu, et les devis existants rechargés depuis la BDD avaient parfois 1 seule prestation dans l'array même si plusieurs étaient visibles | Utiliser `length >= 1` dès qu'il y a des prestations sélectionnées ; le bloc multi-prestation doit s'afficher pour N >= 1 prestations

[2026-06-04] | Modifier le nom dans la fiche CRM (crm.html) ne mettait pas à jour le rapport de visite — le champ `client` (nom) envoyé par `saveClient()` était ignoré dans le destructuring de `save_client` dans crm-data/route.js ; la table `clients.nom` n'était jamais mise à jour | Dans `save_client`, toujours déstructurer et persister le champ `client` vers `clients.nom`. Attention : crm.html et app/admin/page.js sont deux systèmes distincts qui partagent la même BDD — un changement dans l'un peut ne pas se propager à l'autre si l'API n'est pas complète.

[2026-06-02] | Audit de sécurité CSO a révélé 5 vulnérabilités sur le site en prod : (1) bypass admin via localStorage.setItem("phyto-benin_admin_v4","oui"), (2) mot de passe hardcodé "phyto-benin2025" visible dans le bundle JS, (3) routes /api/crm-data et /api/rh-data sans auth retournaient toutes les données business publiquement, (4) TLS désactivé (rejectUnauthorized:false) sur les appels FedaPay, (5) RLS activé sans policies cassait l'espace-client | Corrections appliquées et vérifiées : supprimer tout fallback localStorage dans l'auth admin ; ne jamais hardcoder de mot de passe dans le code client ; toujours vérifier le token Supabase (Authorization: Bearer) dans les routes API admin ; ne jamais désactiver rejectUnauthorized en prod ; créer les policies RLS avec la migration d'activation. Vérification post-fix : build propre, /api/crm-data → 401 sans token, toutes les pages publiques → 200, bundle prod sans traces des vulnérabilités.

[2026-06-04] | Technicien rapport de visite non auto-rempli, et aucun lien vers le planning | 1) Auto-remplir technicien si personnelAdmin.length === 1 dans ouvrirNouveauRapportVisite ; 2) À la sauvegarde d'un nouveau rapport de visite (pas editingId), si technicien + dateVisite renseignés et aucune intervention existante pour ce devis_id, créer automatiquement une entrée "planifiee" dans la table interventions via /api/rh-data avec le token Supabase de la session courante

[2026-06-09] | CRM add_client : le toast "Client ajouté" s'affichait mais le client n'apparaissait pas — triple bug : (1) toast hors du try-catch → success apparent même en cas d'erreur, (2) generate_devis_numero RPC retourne un doublon existant → constraint 23505, (3) fallback Date.now().slice(-6) cyclique toutes les 16 min → doublon après tests répétés | Ne jamais appeler generate_devis_numero sans fallback garanti unique. Utiliser crypto.randomUUID() directement sans RPC. Toujours mettre le toast DANS le bloc de succès. Exposer l'erreur API dans la réponse (pas juste console.error) pour diagnostiquer rapidement.

[2026-06-10] | Webhook WhatsApp ne recevait aucun message réel — le code utilisait WHATSAPP_TOKEN (access token) comme clé HMAC pour vérifier les signatures Meta, mais Meta signe les payloads webhook avec l'App Secret. Résultat : tous les appels Meta retournaient 401 silencieusement. Les tests locaux passaient car ils utilisaient le même mauvais token pour générer la signature. | Pour tout webhook Meta/WhatsApp : utiliser une variable dédiée WHATSAPP_APP_SECRET (valeur dans Paramètres app → Général → Clé secrète) pour la vérification HMAC — jamais l'access token. Ce sont deux secrets distincts : access token = authentification API sortante, App Secret = vérification signature webhook entrante.
