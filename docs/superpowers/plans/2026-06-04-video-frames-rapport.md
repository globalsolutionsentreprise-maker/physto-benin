# Video Frames — Rapport de visite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre l'ajout de vidéos dans les rapports de visite et d'intervention ; extraire 4 frames par vidéo côté navigateur et les envoyer à Gemini comme images supplémentaires.

**Architecture:** Extraction pure client-side via `<video>` + `<canvas>` HTML5 — aucun serveur impliqué. Les frames sont uploadées dans Supabase Storage (même bucket `realisations`, même chemin `rapports/`) via la fonction `uploaderPhotoRapport` existante. L'API `analyze-rapport` reçoit les frames comme des images ordinaires, limite portée de 6 à 12.

**Tech Stack:** React (createElement), HTML5 Canvas API, Supabase Storage, Gemini API (inchangé)

---

## Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `app/admin/page.js` | +2 états, +1 fonction `extraireFramesVideo`, +bouton vidéo ×2 (visite + interv), condition disabled mise à jour ×2 |
| `app/api/analyze-rapport/route.js` | Limite photos 6→12, prompt mis à jour ×2 |

---

### Task 1 : Ajouter les états d'extraction

**Fichiers :**
- Modifier : `app/admin/page.js` (bloc useState autour de la ligne 1383)

- [ ] **Étape 1 : Ajouter les deux nouveaux états**

Trouver ce bloc dans `app/admin/page.js` :
```javascript
  const [uploadingPhotoInterv, setUploadingPhotoInterv] = React.useState(false)
```

Ajouter juste après :
```javascript
  const [extractingFramesVisite, setExtractingFramesVisite] = React.useState(null)
  const [extractingFramesInterv, setExtractingFramesInterv] = React.useState(null)
```

- [ ] **Étape 2 : Vérifier**

```bash
grep -n "extractingFrames" app/admin/page.js
```

Résultat attendu : 2 lignes correspondant aux deux nouveaux états.

- [ ] **Étape 3 : Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: états extractingFrames pour vidéos rapport de visite"
```

---

### Task 2 : Fonction `extraireFramesVideo`

**Fichiers :**
- Modifier : `app/admin/page.js` (après `supprimerPhotoRapport`, ligne ~1926)

- [ ] **Étape 1 : Ajouter la fonction**

Trouver ce bloc dans `app/admin/page.js` :
```javascript
  function supprimerPhotoRapport(url, formSetter) {
    formSetter(function(prev) { return Object.assign({}, prev, { photos: (prev.photos || []).filter(function(u) { return u !== url }) }) })
  }
```

Ajouter juste après :
```javascript
  async function extraireFramesVideo(file, formSetter, setExtracting) {
    var objectUrl = URL.createObjectURL(file)
    var video = document.createElement('video')
    video.src = objectUrl
    video.muted = true
    video.playsInline = true
    try {
      await new Promise(function(resolve, reject) {
        video.onloadedmetadata = resolve
        video.onerror = reject
        setTimeout(reject, 15000)
      })
      var duration = video.duration
      if (!duration || !isFinite(duration) || duration === 0) return
      var timestamps = [0.2, 0.4, 0.6, 0.8].map(function(p) { return p * duration })
      for (var ti = 0; ti < timestamps.length; ti++) {
        setExtracting('⏳ Frames ' + (ti + 1) + '/4 — ' + file.name)
        video.currentTime = timestamps[ti]
        await new Promise(function(resolve) {
          video.onseeked = resolve
          setTimeout(resolve, 3000)
        })
        var canvas = document.createElement('canvas')
        canvas.width = Math.min(video.videoWidth, 1280)
        canvas.height = Math.round(video.videoHeight * (canvas.width / video.videoWidth))
        var ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        var blob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.8) })
        if (!blob) continue
        var frameFile = new File([blob], 'frame-' + Math.round(timestamps[ti]) + 's.jpg', { type: 'image/jpeg' })
        await uploaderPhotoRapport(frameFile, function() {}, formSetter)
      }
    } catch (e) {
      // skip failed video silently
    } finally {
      URL.revokeObjectURL(objectUrl)
      setExtracting(null)
    }
  }
```

- [ ] **Étape 2 : Vérifier la syntaxe**

```bash
node --input-type=module <<'EOF'
import { readFileSync } from 'fs'
const src = readFileSync('app/admin/page.js', 'utf8')
console.log(src.includes('extraireFramesVideo') ? 'OK' : 'MISSING')
EOF
```

Résultat attendu : `OK`

- [ ] **Étape 3 : Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: fonction extraireFramesVideo — extraction frames côté client"
```

---

### Task 3 : Bouton vidéo dans la modale rapport de visite

**Fichiers :**
- Modifier : `app/admin/page.js` (section "Photos du terrain" du rapport de visite, ligne ~2083)

- [ ] **Étape 1 : Ajouter le bouton vidéo**

Trouver ce bloc exact dans `app/admin/page.js` :
```javascript
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bae6fd', backgroundColor: '#f0f9ff', cursor: uploadingPhotoVisite ? 'wait' : 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' }, onChange: function(e) { Array.from(e.target.files).forEach(function(f) { uploaderPhotoRapport(f, setUploadingPhotoVisite, setRapportVisiteForm) }) }, disabled: uploadingPhotoVisite }),
              uploadingPhotoVisite ? '⏳ Envoi...' : '+ Ajouter des photos'
            )
```

Remplacer par :
```javascript
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bae6fd', backgroundColor: '#f0f9ff', cursor: uploadingPhotoVisite ? 'wait' : 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' }, onChange: function(e) { Array.from(e.target.files).forEach(function(f) { uploaderPhotoRapport(f, setUploadingPhotoVisite, setRapportVisiteForm) }) }, disabled: uploadingPhotoVisite }),
              uploadingPhotoVisite ? '⏳ Envoi...' : '+ Ajouter des photos'
            ),
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bbf7d0', backgroundColor: '#f0fdf4', cursor: extractingFramesVisite ? 'wait' : 'pointer', fontSize: '12px', color: '#166534', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'video/*', multiple: true, style: { display: 'none' }, onChange: function(e) {
                var files = Array.from(e.target.files).slice(0, 3)
                files.reduce(function(p, f) { return p.then(function() { return extraireFramesVideo(f, setRapportVisiteForm, setExtractingFramesVisite) }) }, Promise.resolve())
                e.target.value = ''
              }, disabled: !!extractingFramesVisite }),
              extractingFramesVisite || '🎥 Ajouter des vidéos'
            )
```

- [ ] **Étape 2 : Mettre à jour la condition du bouton "Générer"**

Trouver ce bloc dans `app/admin/page.js` :
```javascript
              disabled: generatingRapportVisite || uploadingPhotoVisite || (!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length),
              style: { backgroundColor: '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (generatingRapportVisite || uploadingPhotoVisite || (!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length)) ? 0.5 : 1 }
```

Remplacer par :
```javascript
              disabled: generatingRapportVisite || uploadingPhotoVisite || !!extractingFramesVisite || (!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length),
              style: { backgroundColor: '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (generatingRapportVisite || uploadingPhotoVisite || !!extractingFramesVisite || (!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length)) ? 0.5 : 1 }
```

- [ ] **Étape 3 : Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: bouton vidéo + extraction frames dans rapport de visite"
```

---

### Task 4 : Bouton vidéo dans la modale rapport d'intervention

**Fichiers :**
- Modifier : `app/admin/page.js` (section "Photos du terrain" du rapport d'intervention, ligne ~2417)

- [ ] **Étape 1 : Ajouter le bouton vidéo**

Trouver ce bloc exact dans `app/admin/page.js` :
```javascript
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #fed7aa', backgroundColor: '#fff7ed', cursor: uploadingPhotoInterv ? 'wait' : 'pointer', fontSize: '12px', color: '#c2410c', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' }, onChange: function(e) { Array.from(e.target.files).forEach(function(f) { uploaderPhotoRapport(f, setUploadingPhotoInterv, setRapportIntervForm) }) }, disabled: uploadingPhotoInterv }),
              uploadingPhotoInterv ? '⏳ Envoi...' : '+ Ajouter des photos'
            )
```

Remplacer par :
```javascript
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #fed7aa', backgroundColor: '#fff7ed', cursor: uploadingPhotoInterv ? 'wait' : 'pointer', fontSize: '12px', color: '#c2410c', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' }, onChange: function(e) { Array.from(e.target.files).forEach(function(f) { uploaderPhotoRapport(f, setUploadingPhotoInterv, setRapportIntervForm) }) }, disabled: uploadingPhotoInterv }),
              uploadingPhotoInterv ? '⏳ Envoi...' : '+ Ajouter des photos'
            ),
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bbf7d0', backgroundColor: '#f0fdf4', cursor: extractingFramesInterv ? 'wait' : 'pointer', fontSize: '12px', color: '#166534', fontWeight: '600' } },
              React.createElement('input', { type: 'file', accept: 'video/*', multiple: true, style: { display: 'none' }, onChange: function(e) {
                var files = Array.from(e.target.files).slice(0, 3)
                files.reduce(function(p, f) { return p.then(function() { return extraireFramesVideo(f, setRapportIntervForm, setExtractingFramesInterv) }) }, Promise.resolve())
                e.target.value = ''
              }, disabled: !!extractingFramesInterv }),
              extractingFramesInterv || '🎥 Ajouter des vidéos'
            )
```

- [ ] **Étape 2 : Mettre à jour la condition du bouton "Générer"**

Trouver ce bloc dans `app/admin/page.js` :
```javascript
              disabled: generatingRapportInterv || uploadingPhotoInterv || (!rapportIntervForm.notesTechnicien && !(rapportIntervForm.photos || []).length),
              style: { backgroundColor: '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (generatingRapportInterv || uploadingPhotoInterv || (!rapportIntervForm.notesTechnicien && !(rapportIntervForm.photos || []).length)) ? 0.5 : 1 }
```

Remplacer par :
```javascript
              disabled: generatingRapportInterv || uploadingPhotoInterv || !!extractingFramesInterv || (!rapportIntervForm.notesTechnicien && !(rapportIntervForm.photos || []).length),
              style: { backgroundColor: '#d4a920', color: '#0a2e1a', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (generatingRapportInterv || uploadingPhotoInterv || !!extractingFramesInterv || (!rapportIntervForm.notesTechnicien && !(rapportIntervForm.photos || []).length)) ? 0.5 : 1 }
```

- [ ] **Étape 3 : Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: bouton vidéo + extraction frames dans rapport d'intervention"
```

---

### Task 5 : Mettre à jour l'API analyze-rapport

**Fichiers :**
- Modifier : `app/api/analyze-rapport/route.js`

- [ ] **Étape 1 : Augmenter la limite de photos (6 → 12)**

Trouver dans `app/api/analyze-rapport/route.js` :
```javascript
    for (const url of (photos || []).slice(0, 6)) {
```

Remplacer par :
```javascript
    for (const url of (photos || []).slice(0, 12)) {
```

- [ ] **Étape 2 : Mettre à jour le prompt visite**

Trouver dans `buildPromptVisite` :
```javascript
  ${(ctx?.photos?.length > 0) ? "Des photos du terrain sont jointes — analyse-les pour enrichir le rapport." : ""}
```

Remplacer par :
```javascript
  ${(ctx?.photos?.length > 0) ? `${ctx.photos.length} visuel${ctx.photos.length > 1 ? 's' : ''} joint${ctx.photos.length > 1 ? 's' : ''} (photos et/ou frames extraites de vidéos) — analyse-les attentivement : zones infestées, nature des nuisibles, état du site.` : ""}
```

- [ ] **Étape 3 : Mettre à jour le prompt intervention**

Trouver dans `buildPromptIntervention` :
```javascript
  ${(ctx?.photos?.length > 0) ? "Des photos du terrain sont jointes — analyse-les pour enrichir le rapport." : ""}
```

Remplacer par :
```javascript
  ${(ctx?.photos?.length > 0) ? `${ctx.photos.length} visuel${ctx.photos.length > 1 ? 's' : ''} joint${ctx.photos.length > 1 ? 's' : ''} (photos et/ou frames extraites de vidéos) — analyse-les attentivement : zones traitées, méthodes appliquées, état post-intervention.` : ""}
```

- [ ] **Étape 4 : Commit**

```bash
git add app/api/analyze-rapport/route.js
git commit -m "Feat: analyze-rapport accepte jusqu'à 12 visuels (photos + frames vidéo)"
```

---

### Task 6 : Build et vérification finale

- [ ] **Étape 1 : Vérifier le build**

```bash
npm run build 2>&1 | tail -20
```

Résultat attendu : `✓ Compiled successfully` ou équivalent, sans erreur.

- [ ] **Étape 2 : Vérifier les chaînes clés présentes**

```bash
grep -n "extraireFramesVideo\|extractingFramesVisite\|extractingFramesInterv\|Ajouter des vidéos" app/admin/page.js | wc -l
```

Résultat attendu : au moins 8 lignes.

```bash
grep -n "slice(0, 12)" app/api/analyze-rapport/route.js
```

Résultat attendu : 1 ligne.

- [ ] **Étape 3 : Commit final si nécessaire**

```bash
git status
# Si rien à commit, passer à l'étape suivante
```
