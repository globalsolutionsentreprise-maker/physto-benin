# Lessons — Journal d'apprentissage

Ce fichier est lu au début de chaque session par Claude Code et avant toute modification de code.

## Format

[YYYY-MM-DD] | ce qui s'est mal passé | règle à suivre la prochaine fois

## Entrées

[2026-05-25] | Bouton "Générer certificat" faisait save + print en même temps, sans confirmation visuelle — l'utilisateur perdait son travail si la popup était bloquée | Toujours séparer Sauvegarder (garde le modal ouvert, confirme en vert) et Imprimer (ouvre seulement la fenêtre d'impression)

[2026-05-25] | Liste documents sans aperçu : impossible de distinguer plusieurs certificats du même client | Toujours ajouter un bouton "Aperçu" dans les listes de documents, régénérant le HTML depuis les données sauvegardées