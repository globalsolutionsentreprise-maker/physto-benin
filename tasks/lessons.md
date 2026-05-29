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
