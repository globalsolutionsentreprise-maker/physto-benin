# /deploy-gse

Déploiement complet et sécurisé du site GSE Phyto-Bénin.
Couvre : pré-checks → Supabase migrations → git commit → push → vérification prod → QA navigateur.

---

## ÉTAPE 0 — Lire les leçons

Lire `tasks/lessons.md` en entier. Appliquer chaque règle avant de continuer.

---

## ÉTAPE 1 — Pré-checks

```bash
git status
git diff --stat
```

- Si des fichiers `.env*` ou contenant des secrets sont modifiés → STOPPER et alerter l'utilisateur.
- Si le working tree est propre (rien à commiter) → passer directement à l'ÉTAPE 4.

Vérifier le build :
```bash
npm run build 2>&1
```
Si le build échoue → STOPPER. Corriger l'erreur avant de continuer.

---

## ÉTAPE 2 — Migrations Supabase (si nécessaire)

Vérifier si de nouveaux fichiers SQL existent dans `supabase/migrations/` qui ne sont pas encore poussés :

```bash
git diff --name-only HEAD supabase/migrations/
```

Si oui :
```bash
npx supabase db push 2>&1
```
Si la migration échoue → STOPPER et afficher l'erreur.

---

## ÉTAPE 3 — Commit Git

Analyser les changements avec `git diff` et `git log --oneline -5`.

Construire le message de commit :
- Format : `Feat: description` pour une nouvelle fonctionnalité
- Format : `Fix: description` pour une correction de bug
- Toujours terminer par `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

```bash
git add <fichiers concernés — jamais .env ni secrets>
git commit -m "..."
```

---

## ÉTAPE 4 — Push vers GitHub (déclenche Vercel)

```bash
git push origin main 2>&1
```

Vercel se déploie automatiquement depuis GitHub. Attendre ~90 secondes.

---

## ÉTAPE 5 — Vérification production

Vérifier que le site répond correctement :

```bash
curl -s -o /dev/null -w "%{http_code}" https://physto-benin.vercel.app/
curl -s -o /dev/null -w "%{http_code}" https://physto-benin.vercel.app/admin
curl -s -o /dev/null -w "%{http_code}" https://physto-benin.vercel.app/api/crm-data
```

Résultats attendus :
- `/` → 200
- `/admin` → 200
- `/api/crm-data` → 401 (normal — protégé)

Si autre code → STOPPER et analyser.

---

## ÉTAPE 6 — QA navigateur (utiliser le skill /browse)

Ouvrir le site et vérifier la fonctionnalité qui vient d'être modifiée :

1. Naviguer vers `https://physto-benin.vercel.app/admin`
2. Se connecter avec les credentials admin
3. Tester le flux lié au changement déployé
4. Prendre un screenshot de preuve

Si l'utilisateur n'a pas précisé quoi tester → tester le flux le plus critique récemment modifié selon `git log`.

---

## ÉTAPE 7 — Rapport final

Afficher un résumé :

```
✅ DÉPLOYÉ avec succès
   Commit  : <sha> — <message>
   Prod    : https://physto-benin.vercel.app
   Build   : OK
   Supabase: OK / non nécessaire
   QA      : ✅ <ce qui a été testé>
```

ou

```
❌ ÉCHEC DÉPLOIEMENT
   Étape   : <numéro de l'étape>
   Erreur  : <message exact>
   Action  : <ce que l'utilisateur doit faire>
```

---

## Règles de sécurité absolues

- Ne jamais commiter `.env.local`, `.env`, ou tout fichier contenant `SECRET`, `KEY`, `PASSWORD` dans le nom
- Ne jamais utiliser `git add -A` sans vérifier le statut avant
- Ne jamais utiliser `--no-verify` pour bypasser les hooks
- Si une migration Supabase échoue → ne pas continuer le déploiement
- En cas de doute sur une étape → demander à l'utilisateur avant d'agir
