# Notes vocales dans les rapports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'admin de joindre des notes vocales (audio) aux rapports de visite et d'intervention pour que Gemini les écoute et en intègre le contenu au rapport généré.

**Architecture:** Les fichiers audio sont lus en base64 dans le navigateur et POSTés directement à `/api/analyze-rapport` (pas de stockage). La route les passe à Gemini 2.5 Flash en `inlineData`, exactement comme les photos. Aucun changement de modèle ni de schéma BDD.

**Tech Stack:** Next.js (App Router) route handler JS, React (createElement, sans JSX) dans `app/admin/page.js`, Gemini 2.5 Flash `generateContent`.

## Global Constraints

- API route : `export const dynamic = "force-dynamic"` déjà présent — ne pas retirer.
- Toute interaction Supabase passe par les routes API (ici : aucune interaction Supabase, l'audio ne transite pas par le bucket).
- Ce projet n'a pas de framework de tests unitaires. Vérification = `npm run build` propre + QA manuelle. Par la leçon 2026-07-02 : la QA de l'admin se fait **en prod après déploiement** (`https://www.phyto-benin.com/admin`), pas en local — mais le déploiement n'est PAS inclus dans ce plan (l'utilisateur déclenche `/deploy-gse` séparément).
- Commits : format `Feat: …`, co-auteur Claude.
- Plafonds : max **5** notes vocales/rapport, **15 Mo**/fichier.
- Formats audio Gemini : `audio/ogg`, `audio/mp4`, `audio/mpeg`, `audio/wav`, `audio/aac`, `audio/flac`.

---

### Task 1: Backend — accepter et transmettre l'audio à Gemini

**Files:**
- Modify: `app/api/analyze-rapport/route.js` (POST handler ~L28-49 ; `buildPromptVisite` ~L85-112 ; `buildPromptIntervention` ~L114-140)

**Interfaces:**
- Consumes (nouveau champ du body) : `audios?: Array<{ mimeType: string, data: string }>` (base64 sans préfixe) ; `context.audiosCount?: number`.
- Produces : réponse inchangée `{ success: true, rapport }`.

- [ ] **Step 1: Déstructurer `audios` du body**

Dans `POST`, remplacer :
```js
const { type, notes, photos, context } = await req.json()
```
par :
```js
const { type, notes, photos, audios, context } = await req.json()
```

- [ ] **Step 2: Ajouter la boucle audio après la boucle photos**

Juste après la boucle `for (const url of (photos || []).slice(0, 12)) { … }` (après sa `}` fermante, avant `let geminiRes`), insérer :
```js
    // Notes vocales : déjà en base64 dans le body, passées directement en inlineData (max 5)
    for (const a of (audios || []).slice(0, 5)) {
      if (a && a.data && a.mimeType) {
        parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } })
      }
    }
```

- [ ] **Step 3: Ajouter la ligne audio dans `buildPromptVisite`**

Dans `buildPromptVisite`, repérer la ligne conditionnelle sur les photos :
```js
${(ctx?.photos?.length > 0) ? `${ctx.photos.length} visuel${ctx.photos.length > 1 ? 's' : ''} joint${ctx.photos.length > 1 ? 's' : ''} (photos et/ou frames extraites de vidéos) — analyse-les attentivement pour enrichir le rapport.` : ""}
```
Ajouter, sur une nouvelle ligne juste en dessous :
```js
${(ctx?.audiosCount > 0) ? `${ctx.audiosCount} note${ctx.audiosCount > 1 ? 's' : ''} vocale${ctx.audiosCount > 1 ? 's' : ''} du technicien jointe${ctx.audiosCount > 1 ? 's' : ''} — écoute-les attentivement, transcris les informations utiles et intègre-les au rapport (état des lieux, nuisibles observés, zones infestées, observations, recommandations).` : ""}
```

- [ ] **Step 4: Ajouter la même ligne dans `buildPromptIntervention`**

Idem Step 3, dans `buildPromptIntervention` (même chaîne exacte, sous la ligne photos de cette fonction).

- [ ] **Step 5: Vérifier le build**

Run: `npm run build`
Expected: build réussi, pas d'erreur de syntaxe sur `app/api/analyze-rapport/route.js`.

- [ ] **Step 6: Vérification fonctionnelle rapide de la route (audio ignoré si absent)**

Run:
```bash
curl -s -X POST http://localhost:3000/api/analyze-rapport \
  -H 'Content-Type: application/json' \
  -d '{"type":"visite","notes":"Cafards cuisine 3e etage","photos":[],"audios":[],"context":{"clientNom":"Test","audiosCount":0}}' | head -c 300
```
(Nécessite `npm run dev` dans un autre terminal.)
Expected: JSON `{"success":true,"rapport":{…}}` — confirme que l'ajout de `audios`/`audiosCount` ne casse pas le chemin sans audio. (Si `GEMINI_API_KEY` absent en local, un 503 « Gemini indisponible » est acceptable : la route parse le body sans planter.)

- [ ] **Step 7: Commit**

```bash
git add app/api/analyze-rapport/route.js
git commit -m "Feat: route analyze-rapport accepte les notes vocales (inlineData audio)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Front — notes vocales dans le modal rapport de VISITE

**Files:**
- Modify: `app/admin/page.js` (états ~L1368-1372 ; helper partagé nouveau ; `genererRapportVisiteIA` ~L2015-2031 ; bloc JSX photos du modal visite ~L2196-2205)

**Interfaces:**
- Consumes : la route de Task 1 (`audios`, `context.audiosCount`).
- Produces (helper réutilisé par Task 3) :
  - `lireAudioBase64(file): Promise<{ name: string, mimeType: string, data: string }>` — lit un `File` audio, renvoie base64 sans préfixe + mimeType déduit.
  - `AUDIO_MAX_FILES = 5`, `AUDIO_MAX_BYTES = 15 * 1024 * 1024`.
  - État visite : `audiosVisite` / `setAudiosVisite` (array de `{ name, mimeType, data }`), `uploadingAudioVisite` / `setUploadingAudioVisite`.

- [ ] **Step 1: Ajouter le helper partagé et les constantes**

Placer près du haut du composant admin (juste avant les déclarations d'état des rapports, ~L1368), au niveau module ou composant selon le style du fichier. Constantes au niveau module (haut du fichier, avec les autres consts) :
```js
var AUDIO_MAX_FILES = 5
var AUDIO_MAX_BYTES = 15 * 1024 * 1024
function mimeAudioDepuisNom(file) {
  if (file.type) return file.type
  var n = (file.name || '').toLowerCase()
  if (n.endsWith('.opus') || n.endsWith('.ogg')) return 'audio/ogg'
  if (n.endsWith('.m4a') || n.endsWith('.mp4')) return 'audio/mp4'
  if (n.endsWith('.mp3')) return 'audio/mpeg'
  if (n.endsWith('.wav')) return 'audio/wav'
  if (n.endsWith('.aac')) return 'audio/aac'
  if (n.endsWith('.flac')) return 'audio/flac'
  return 'audio/ogg'
}
function lireAudioBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader()
    reader.onload = function() {
      var res = reader.result || ''
      var base64 = String(res).split(',')[1] || ''
      resolve({ name: file.name || 'note-vocale', mimeType: mimeAudioDepuisNom(file), data: base64 })
    }
    reader.onerror = function() { reject(reader.error) }
    reader.readAsDataURL(file)
  })
}
```

- [ ] **Step 2: Ajouter les états visite**

Près des autres `React.useState` du modal visite (~L1368-1372) :
```js
  const [audiosVisite, setAudiosVisite] = React.useState([])
  const [uploadingAudioVisite, setUploadingAudioVisite] = React.useState(false)
```

- [ ] **Step 3: Ajouter le handler d'ajout d'audios (visite)**

Ajouter cette fonction près de `uploaderPhotoRapport` :
```js
  async function ajouterAudios(files, existants, setAudios, setUploading) {
    setUploading(true)
    try {
      var restants = AUDIO_MAX_FILES - existants.length
      if (restants <= 0) { afficherMessage('Maximum ' + AUDIO_MAX_FILES + ' notes vocales'); return }
      var aTraiter = Array.from(files).slice(0, restants)
      var lus = []
      for (var i = 0; i < aTraiter.length; i++) {
        var f = aTraiter[i]
        if (f.size > AUDIO_MAX_BYTES) { afficherMessage('Fichier trop volumineux (max 15 Mo) : ' + f.name); continue }
        lus.push(await lireAudioBase64(f))
      }
      if (lus.length) setAudios(function(prev) { return prev.concat(lus) })
    } catch (e) {
      afficherMessage('Erreur lecture audio : ' + (e && e.message ? e.message : 'inconnue'))
    } finally {
      setUploading(false)
    }
  }
```
(`afficherMessage` existe déjà dans le composant admin — vérifier qu'il est dans la portée ; sinon utiliser le mécanisme de toast en place.)

- [ ] **Step 4: Ajouter le bouton + la liste dans le JSX du modal visite**

Dans le modal visite, juste après le bloc `<label>` du bouton « + Ajouter des photos » / vidéo (~L2205), insérer :
```js
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bae6fd', backgroundColor: '#f0f9ff', cursor: uploadingAudioVisite ? 'wait' : 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '600', marginLeft: '8px' } },
              React.createElement('input', { type: 'file', accept: 'audio/*', multiple: true, style: { display: 'none' }, onChange: function(e) { ajouterAudios(e.target.files, audiosVisite, setAudiosVisite, setUploadingAudioVisite); e.target.value = '' }, disabled: uploadingAudioVisite }),
              uploadingAudioVisite ? '⏳ Lecture…' : '+ Ajouter note vocale'
            ),
            audiosVisite.length > 0 && React.createElement('div', { style: { marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' } },
              audiosVisite.map(function(a, i) {
                return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0369a1' } },
                  React.createElement('span', null, '🎤 ' + (a.name || ('Note vocale ' + (i + 1)))),
                  React.createElement('button', { type: 'button', onClick: function() { setAudiosVisite(function(prev) { return prev.filter(function(_, j) { return j !== i }) }) }, style: { border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px', padding: 0 } }, '✕')
                )
              })
            ),
```

- [ ] **Step 5: Envoyer les audios dans `genererRapportVisiteIA`**

Dans le body du `fetch('/api/analyze-rapport')` (~L2025-2030), modifier pour :
```js
        body: JSON.stringify({
          type: 'visite',
          notes: rapportVisiteForm.notesTechnicien,
          photos: rapportVisiteForm.photos || [],
          audios: audiosVisite.map(function(a) { return { mimeType: a.mimeType, data: a.data } }),
          context: { clientNom, adresse: rapportVisiteForm.adresseSite, date: rapportVisiteForm.dateVisite, technicien: rapportVisiteForm.technicien, prestation: devis.prestation, audiosCount: audiosVisite.length },
        })
```

- [ ] **Step 6: Vider les audios après génération réussie**

Dans le `else` de succès de `genererRapportVisiteIA` (après `var r = data.rapport` et le `setRapportVisiteForm(...)`), ajouter :
```js
        setAudiosVisite([])
```
(Ne PAS vider dans la branche d'erreur — on garde l'audio pour réessayer.)

- [ ] **Step 7: Débloquer le bouton Générer si seul l'audio est fourni**

Le bouton Générer (~L2218) est désactivé quand `!notesTechnicien && !photos.length`. Ajouter l'audio comme source valide : remplacer les deux occurrences de
```js
(!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length)
```
par
```js
(!rapportVisiteForm.notesTechnicien && !(rapportVisiteForm.photos || []).length && !audiosVisite.length)
```

- [ ] **Step 8: Vérifier le build**

Run: `npm run build`
Expected: build réussi, pas d'erreur JS dans `app/admin/page.js`.

- [ ] **Step 9: QA manuelle (après déploiement, hors périmètre de ce plan)**

Dans le modal rapport de visite : ajouter un fichier audio (`.m4a` ou `.ogg`), vérifier qu'il apparaît dans la liste avec ✕, générer, vérifier que le contenu parlé se reflète dans le rapport, et que la liste se vide après succès. Vérifier le rejet d'un fichier >15 Mo.

- [ ] **Step 10: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: notes vocales dans le modal rapport de visite

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Front — notes vocales dans le modal rapport d'INTERVENTION

**Files:**
- Modify: `app/admin/page.js` (états ~L1369-1380 ; `genererRapportIntervIA` ~L2390-2405 ; bloc JSX photos du modal intervention)

**Interfaces:**
- Consumes : helper `lireAudioBase64`, `ajouterAudios`, constantes `AUDIO_MAX_*` (définis en Task 2) ; la route de Task 1.
- Produces : état `audiosInterv` / `setAudiosInterv`, `uploadingAudioInterv` / `setUploadingAudioInterv`.

- [ ] **Step 1: Ajouter les états intervention**

Près des états du modal intervention (~L1369-1380) :
```js
  const [audiosInterv, setAudiosInterv] = React.useState([])
  const [uploadingAudioInterv, setUploadingAudioInterv] = React.useState(false)
```

- [ ] **Step 2: Ajouter le bouton + la liste dans le JSX du modal intervention**

Dans le modal intervention, juste après le bloc `<label>` du bouton d'ajout de photos de ce modal, insérer (identique à Task 2 Step 4 mais avec les états intervention) :
```js
            React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1.5px dashed #bae6fd', backgroundColor: '#f0f9ff', cursor: uploadingAudioInterv ? 'wait' : 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '600', marginLeft: '8px' } },
              React.createElement('input', { type: 'file', accept: 'audio/*', multiple: true, style: { display: 'none' }, onChange: function(e) { ajouterAudios(e.target.files, audiosInterv, setAudiosInterv, setUploadingAudioInterv); e.target.value = '' }, disabled: uploadingAudioInterv }),
              uploadingAudioInterv ? '⏳ Lecture…' : '+ Ajouter note vocale'
            ),
            audiosInterv.length > 0 && React.createElement('div', { style: { marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' } },
              audiosInterv.map(function(a, i) {
                return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0369a1' } },
                  React.createElement('span', null, '🎤 ' + (a.name || ('Note vocale ' + (i + 1)))),
                  React.createElement('button', { type: 'button', onClick: function() { setAudiosInterv(function(prev) { return prev.filter(function(_, j) { return j !== i }) }) }, style: { border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px', padding: 0 } }, '✕')
                )
              })
            ),
```

- [ ] **Step 3: Envoyer les audios dans `genererRapportIntervIA`**

Dans le body du `fetch` (~L2400-2404), ajouter `audios` et `audiosCount` :
```js
        body: JSON.stringify({
          type: 'intervention',
          notes: rapportIntervForm.notesTechnicien,
          photos: rapportIntervForm.photos || [],
          audios: audiosInterv.map(function(a) { return { mimeType: a.mimeType, data: a.data } }),
          context: { clientNom, date: rapportIntervForm.dateIntervention, technicien: rapportIntervForm.technicien, prestation: devis.prestation, audiosCount: audiosInterv.length },
        })
```
(Conserver les autres champs de `context` déjà présents dans le code réel.)

- [ ] **Step 4: Vider les audios après génération réussie**

Dans la branche de succès de `genererRapportIntervIA`, ajouter :
```js
        setAudiosInterv([])
```

- [ ] **Step 5: Débloquer le bouton Générer (intervention) si seul l'audio est fourni**

Repérer la condition `disabled` du bouton Générer du modal intervention (équivalent à `!notesTechnicien && !photos.length`) et y ajouter `&& !audiosInterv.length`, sur les deux occurrences (disabled + opacity), comme en Task 2 Step 7.

- [ ] **Step 6: Vérifier le build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 7: QA manuelle (après déploiement, hors périmètre)**

Même check qu'en Task 2 Step 9, dans le modal rapport d'intervention.

- [ ] **Step 8: Commit**

```bash
git add app/admin/page.js
git commit -m "Feat: notes vocales dans le modal rapport d'intervention

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notes de fin

- Après implémentation, mettre à jour le graphe : `graphify update .`.
- Déploiement + QA prod via `/deploy-gse` (déclenché par l'utilisateur, hors de ce plan).
- Rappel leçon 2026-07-02 : la QA de l'admin se fait sur `https://www.phyto-benin.com/admin` (session Supabase de l'utilisateur), pas en local.
