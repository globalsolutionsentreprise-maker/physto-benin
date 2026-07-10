# Spec — Notes vocales dans les rapports de visite/intervention

Date : 2026-07-10
Auteur : Kabir YAKOUBOU (via Claude)
Statut : validé pour implémentation

## Contexte & problème

Les rapports de visite et d'intervention destinés aux clients sont générés par IA
(Gemini 2.5 Flash, route `app/api/analyze-rapport/route.js`) à partir de deux
sources : les **notes texte** collées par l'admin et les **photos** (upload direct +
frames extraites de vidéos). Or, en pratique, les techniciens envoient le plus
souvent leurs comptes-rendus sous forme de **notes vocales WhatsApp**. Aujourd'hui
l'admin doit ré-écouter et retaper ces notes à la main.

Objectif : permettre à l'admin de joindre une ou plusieurs notes vocales au moment de
la génération, pour que l'IA les écoute et en intègre le contenu au rapport, au même
titre que les photos et les notes texte.

## Décisions produit (validées)

1. **Entrée audio** : bouton d'upload dans le modal, calqué sur le flux photos
   (l'admin enregistre l'audio WhatsApp du technicien puis l'upload). Pas
   d'enregistrement micro navigateur.
2. **Conservation** : l'audio sert **uniquement à la génération** et n'est **pas**
   rattaché ni sauvegardé avec le rapport. => Pas de passage par le bucket de
   stockage : l'audio est lu en base64 dans le navigateur et POSTé directement à
   l'API (pièce jointe éphémère, aucun fichier orphelin à nettoyer).

## Architecture

Gemini 2.5 Flash accepte l'audio en entrée nativement (transcription + compréhension).
On réutilise le mécanisme `inlineData` déjà en place pour les photos. Aucun service de
transcription externe, aucun changement de modèle, aucun changement de schéma BDD.

Flux :

```
[Modal admin] --(base64 audios)--> POST /api/analyze-rapport --(inlineData parts)--> Gemini 2.5 Flash --> JSON rapport
```

## Composant 1 — Front (`app/admin/page.js`)

S'applique **symétriquement** aux deux modals : rapport de **visite**
(`rapportVisiteForm` / `genererRapportVisiteIA`) et rapport d'**intervention**
(le pendant intervention équivalent).

### État
- Nouvel état **local au composant** (pas dans le form persisté ni dans la BDD) :
  `audiosVisite` et `audiosInterv`, chacun un array d'objets
  `{ name: string, mimeType: string, data: string /* base64 sans préfixe */ }`.
- Un booléen `uploadingAudioVisite` / `uploadingAudioInterv` pour l'état de lecture.

### Bouton d'upload
- `<input type="file" accept="audio/*" multiple>` masqué dans un `<label>` stylé
  « + Ajouter note vocale », placé à côté du bouton photos existant.
- `onChange` : pour chaque fichier, lire via `FileReader.readAsDataURL`, retirer le
  préfixe `data:...;base64,`, pousser `{ name, mimeType: file.type, data }` dans l'état.

### Garde-fous (dans le onChange)
- Max **5** notes vocales par rapport (au-delà : `afficherMessage` d'avertissement,
  on ignore le surplus).
- Taille max **15 Mo** par fichier (au-delà : message d'erreur, fichier ignoré).
- `mimeType` de secours si `file.type` est vide (certains exports `.opus`) : déduire
  de l'extension (`.opus`/`.ogg` → `audio/ogg`, `.m4a` → `audio/mp4`, `.mp3` →
  `audio/mpeg`, `.wav` → `audio/wav`, `.aac` → `audio/aac`), défaut `audio/ogg`.

### Affichage
- Sous le bouton, liste des notes ajoutées : nom du fichier (ou « Note vocale N ») +
  bouton **✕** pour retirer une note de l'array.
- Indicateur « ⏳ Lecture… » pendant le chargement.

### Envoi (`genererRapportVisiteIA` / pendant intervention)
- Dans le body du `fetch('/api/analyze-rapport')`, ajouter :
  - `audios: audiosVisite.map(a => ({ mimeType: a.mimeType, data: a.data }))`
  - dans `context` : `audiosCount: audiosVisite.length`
- Après une génération **réussie**, vider l'array (`setAudiosVisite([])`) — rien n'est
  sauvegardé avec le rapport. En cas d'erreur, on **garde** les audios pour réessayer.

## Composant 2 — Backend (`app/api/analyze-rapport/route.js`)

### Réception
- Déstructurer `audios` du body : `const { type, notes, photos, audios, context } = await req.json()`.

### Parts Gemini
- Après la boucle photos existante, ajouter une boucle sur `audios` (max 5) :
  ```js
  for (const a of (audios || []).slice(0, 5)) {
    if (a?.data && a?.mimeType) parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } })
  }
  ```
- Aucun `fetch` réseau ici (contrairement aux photos) : le base64 est déjà dans le body.

### Prompts
- Dans `buildPromptVisite` et `buildPromptIntervention`, ajouter une ligne
  conditionnelle calquée sur celle des photos, pilotée par `ctx?.audiosCount` :
  > `${(ctx?.audiosCount > 0) ? "N note(s) vocale(s) du technicien jointe(s) — écoute-les attentivement, transcris les informations utiles et intègre-les au rapport (état des lieux, nuisibles observés, zones, recommandations)." : ""}`

### Inchangé
- Modèle `gemini-2.5-flash`, `generationConfig`, parsing JSON, format de sortie,
  gestion d'erreurs et retries.

## Limites de taille de requête

Une note vocale WhatsApp de ~2 min ≈ 300 Ko (opus) → ~400 Ko en base64. Avec le
plafond 5 fichiers × 15 Mo, le pire cas base64 ≈ 100 Mo, ce qui est irréaliste en
usage normal. Les route handlers Next.js (App Router) lisent le body brut sans la
limite historique de 4 Mo du body-parser. En usage réel (quelques centaines de Ko),
aucune contrainte. Le plafond 15 Mo/fichier protège contre un upload aberrant.

## Formats audio supportés (Gemini 2.5 Flash)

`audio/ogg` (opus WhatsApp Android), `audio/mp4` / `.m4a` (iPhone), `audio/mpeg`
(mp3), `audio/wav`, `audio/aac`, `audio/flac`. Couverts par le mapping d'extension.

## Hors périmètre (YAGNI)

- Pas d'enregistrement micro dans le navigateur.
- Pas de stockage/rattachement de l'audio au rapport, pas de ré-écoute ultérieure.
- Pas de transcription affichée séparément à l'admin (l'audio nourrit directement le
  rapport final).
- Pas de changement de schéma BDD (`rapports_visite` / `rapports_intervention`).

## Critères de succès

1. L'admin peut joindre 1..5 notes vocales (opus/m4a/mp3) dans le modal rapport de
   visite **et** intervention, les voir listées, en retirer.
2. À la génération, le contenu parlé du technicien est reflété dans le rapport produit
   (observations, nuisibles, zones, recommandations).
3. Aucun fichier audio n'est écrit dans le bucket ni sauvegardé avec le rapport ;
   l'array est vidé après une génération réussie.
4. Un fichier trop gros (>15 Mo) ou au-delà de 5 est rejeté proprement avec message.
5. Build propre, pas de régression sur le flux photos/notes existant.
