# Design — Vidéos dans le rapport de visite (frames client-side)

**Date :** 2026-06-04  
**Scope :** Rapport de visite + Rapport d'intervention

---

## Contexte

Le technicien envoie des vidéos de terrain (infestation, zones à risque). Actuellement seules les photos sont acceptées. L'objectif est de permettre l'upload de plusieurs vidéos, d'en extraire automatiquement des frames côté navigateur, et de les envoyer à Gemini pour enrichir le rapport généré par l'IA.

---

## Architecture

Extraction 100% client-side via l'API HTML5 `<video>` + `<canvas>`. Pas de ffmpeg, pas de traitement serveur. Le navigateur lit la vidéo en mémoire, capture N frames à différents timestamps, et les upload sur Supabase Storage comme des JPEG — indiscernables des photos existantes pour l'API.

```
Vidéo sélectionnée (input file)
  → URL.createObjectURL → <video> en mémoire
  → seek à T1, T2, T3, T4 (20/40/60/80% de la durée)
  → canvas.drawImage → Blob JPEG (qualité 0.8)
  → upload Supabase Storage (bucket rapports/, préfixe frames/)
  → URL ajoutée à rapportVisiteForm.photos[]
  → envoyée à Gemini avec les photos normales
  → Gemini analyse visuellement photos + frames
```

---

## Changements

### `app/admin/page.js`

**Nouveau state :**
- `extractingFramesVisite` : string | null — texte de progression ("⏳ Frames 2/4...") ou null

**Nouvelle fonction `extraireFramesVideo(file, formSetter, setExtracting)` :**
1. `URL.createObjectURL(file)` → charge vidéo dans `<video>` en mémoire
2. Attendre `loadedmetadata` pour lire `video.duration`
3. Calculer 4 timestamps : `[0.2, 0.4, 0.6, 0.8] * duration`
4. Pour chaque timestamp : seek → attendre `seeked` → canvas.drawImage → toBlob JPEG 0.8
5. Upload blob via `uploaderPhotoRapport` existant (réutilisé tel quel)
6. Mettre à jour le texte de progression à chaque frame
7. `URL.revokeObjectURL` en fin de traitement

**UI — modale rapport de visite :**
- Bouton `"🎥 Vidéos"` ajouté à côté du bouton `"+ Ajouter des photos"`
- `<input type="file" accept="video/*" multiple>` (max 3 vidéos — vérifié dans le onChange)
- Pendant l'extraction : bouton désactivé + texte `"⏳ Frames X/Y..."`
- Bouton "Générer" désactivé pendant l'extraction
- Les frames apparaissent dans la grille photo existante (même rendu)

**UI — modale rapport d'intervention :**
- Même bouton et même logique (state `extractingFramesInterv`)

### `app/api/analyze-rapport/route.js`

- Limite photos : 6 → 12
- Prompt `buildPromptVisite` : "Des photos et frames vidéo sont jointes — analyse-les"
- Prompt `buildPromptIntervention` : même mise à jour

---

## Limites

| Paramètre | Valeur |
|-----------|--------|
| Max vidéos par upload | 3 |
| Frames par vidéo | 4 (timestamps 20/40/60/80%) |
| Max frames total envoyées à Gemini | 12 |
| Format frames | JPEG, qualité 0.8 |
| Vidéo originale uploadée | Non — seulement les frames |

---

## Ce qui N'est PAS fait

- Transcription audio (hors scope, feature séparée si besoin)
- Upload de la vidéo originale sur Supabase
- Lecture/lecture de la vidéo dans l'interface
- Différenciation visuelle frames/photos dans la grille (optionnel futur)
