# Devis à lignes multiples (multi-secteurs) — Design

**Date :** 2026-07-11
**Statut :** Validé (design), en attente de plan d'implémentation
**Fichiers principaux :** `app/admin/page.js` (composant `SectionClientsDevis`), nouvelle migration `supabase/migrations/`

## Problème

Un devis ne peut porter qu'**une seule ligne par type de prestation**, parce que les
lignes sont stockées dans des maps indexées par le **nom** de la prestation :
`prix_par_prestation` et `superficie_par_prestation` (`{ "Désinsectisation": 500, ... }`).

Cas réel : BIA GROUPE Bohicon a besoin de **plusieurs devis de désinsectisation pour
différents secteurs** (Bloc A, Cuisine, Entrepôt…), donc de plusieurs lignes
« Désinsectisation » distinctes dans **un même devis**, chacune avec sa surface et son
prix. Impossible aujourd'hui : la clé `"Désinsectisation"` est unique.

Ce besoin est général (l'utilisateur a signalé qu'il reviendra avec d'autres clients).

## Objectif

Permettre, dans **un seul devis**, une **liste de lignes** indépendantes. Chaque ligne =
une prestation + un secteur/zone (texte libre) + surface + prix au m² → montant auto.
Le total du devis = somme des lignes. Le même type de prestation peut apparaître
plusieurs fois ; des types différents peuvent être mélangés.

Hors périmètre (YAGNI) : montant forfaitaire par ligne, note/détail libre par ligne,
devis séparés par secteur, réorganisation des lignes (drag & drop).

## Approche retenue : « Lignes unifiées » (Approche A)

Le bloc de saisie des prestations (grille de cases à cocher + détails par prestation)
est remplacé par une **liste de lignes** éditable. Les devis à une seule prestation
deviennent simplement des devis à une ligne.

## 1. Modèle de données

### Nouvelle colonne
```sql
ALTER TABLE devis ADD COLUMN IF NOT EXISTS lignes JSONB DEFAULT NULL;
```

`lignes` = tableau d'objets, source de vérité pour les nouveaux devis :
```json
[
  { "prestation": "Désinsectisation", "secteur": "Bloc A",   "superficie": 120, "prix_m2": 500, "montant": 60000 },
  { "prestation": "Désinsectisation", "secteur": "Cuisine",  "superficie": 40,  "prix_m2": 700, "montant": 28000 },
  { "prestation": "Désinsectisation", "secteur": "Entrepôt", "superficie": 200, "prix_m2": 400, "montant": 80000 }
]
```

- `montant` par ligne = `round(superficie × prix_m2)`, calculé et **stocké** (robustesse
  d'affichage/impression, pas de recalcul divergent).
- `secteur` : texte libre, peut être vide ("").
- `superficie` / `prix_m2` : nombres, peuvent être 0 (ligne non chiffrée ignorée à
  l'impression, comme le filtre `montant > 0` actuel).

### Colonnes conservées (rétrocompatibilité + consommateurs existants)
- `montant_net` = somme des `montant` de lignes − remise (inchangé dans son rôle).
- `montant_total` = montant facturé (avec commission FedaPay si transmission en ligne,
  comme aujourd'hui — logique inchangée dans `creerDevis`).
- `prestation` (texte) : reste renseigné comme **résumé lisible** pour les listes,
  emails, contrats, etc. Règle de résumé : liste dédupliquée des types de prestation
  présents, jointe par `" + "` (ex. `"Désinsectisation"` ou `"Désinsectisation + Dératisation"`).
- `prix_par_prestation` / `superficie_par_prestation` : **laissées telles quelles** ;
  plus alimentées par les nouveaux devis multi-lignes (restent pour lire les anciens).

## 2. Rétrocompatibilité (anciens devis)

À l'ouverture d'un devis en édition (`ouvrirEditionDevis`) et à l'impression
(`imprimerDevis`), on obtient les lignes via une fonction unique :

```
lignesFromDevis(d):
  si d.lignes est un tableau non vide → renvoyer d.lignes
  sinon (ancien format) → reconstruire depuis prestation + prix_par_prestation +
    superficie_par_prestation : une ligne par type de prestation présent, secteur = "",
    superficie/prix_m2 depuis les maps, montant = superficie×prix_m2 (ou 0).
```

Conséquence : les anciens devis (ex. Direction Générale, 1 ligne Dératisation)
s'ouvrent, s'éditent et s'impriment sans re-saisie. Aucune migration de données
rétroactive nécessaire.

## 3. Formulaire (`renderFormDevis`)

Remplacer la grille de prestations + inputs `superficieParPrestation`/`prixParPrestation`
par une liste de lignes pilotée par un nouvel état `formDevis.lignes` (tableau).

Chaque ligne affiche : `[Prestation ▾] [Secteur/zone] [Surface m²] [Prix/m²] [Montant auto] [🗑]`.
- `Prestation` : `<select>` avec la liste `PRESTATIONS` (8 valeurs).
- `Montant` : lecture seule, recalculé à chaque changement de surface/prix.
- Bouton **« + Ajouter une ligne »** (ajoute une ligne vierge, prestation par défaut = la
  1re de la liste ou vide).
- **Total brut** affiché = somme des `montant`, injecté dans `formDevis.montantBrut`
  (pilote le calcul remise/net existant, inchangé en aval).
- Suppression de ligne via 🗑 ; garder au moins une ligne visible (si on supprime la
  dernière, en remettre une vierge).

Validation : au moins une ligne avec `prestation` renseignée et `montant > 0` pour
enregistrer (remplace la validation actuelle « au moins une prestation + montant »).

## 4. Sauvegarde (`creerDevis`)

- Construire `lignes` propre depuis `formDevis.lignes` (nombres parsés, `montant`
  recalculé, lignes totalement vides ignorées).
- `montantBrut` (brut) = somme des `montant` (déjà tenu à jour par le formulaire).
- Calculs remise / `montant_net` / `montant_total` (+ commission FedaPay si en ligne) :
  **inchangés**.
- Écrire `lignes`, `montant_net`, `montant_total`, et `prestation` = résumé.
- Ne plus écrire `prix_par_prestation` / `superficie_par_prestation` pour les nouveaux
  devis (laisser à `null`).
- Charger l'impression (`imprimData`) avec `lignes` au lieu de `prixParPrestation`/
  `superficieParPrestation`.

## 5. Impression du devis (`imprimerDevis`)

Le tableau des prestations itère désormais sur `lignesFromDevis(d)` et gagne une colonne
**Secteur** :

| Prestation | Secteur | Surface | Prix/m² | Montant |
|---|---|---|---|---|

- Une `<tr>` par ligne avec `montant > 0` (filtre conservé).
- Secteur vide → afficher « — ».
- Total, remise, acompte, bloc signatures, CSS `@media print` : inchangés.
- Chemin de secours : si `lignesFromDevis` renvoie des lignes reconstruites (ancien
  devis), le rendu est identique à aujourd'hui (colonne Secteur = « — »).

## 6. Affichage listes / tableau de bord

- Les listes de devis affichent déjà le texte `prestation` (résumé) et `montant_total` —
  **aucun changement nécessaire**.
- Optionnel (nice-to-have, non requis) : dans le tableau de bord client, montrer le
  nombre de lignes/secteurs. **Exclu du périmètre** pour rester focalisé.

## 7. Tests / vérification

1. **Build** Next passe (`npm run build`).
2. **Cas nominal** : créer un devis Bohicon avec 2 lignes Désinsectisation
   (Bloc A 120 m²×500, Cuisine 40 m²×700) → total brut 88 000 F correct, enregistrement OK.
3. **Réédition** : rouvrir ce devis → les 2 lignes réapparaissent avec secteurs/surfaces.
4. **Impression** : le PDF montre 2 lignes avec colonne Secteur + total.
5. **Mélange** : ajouter une ligne Dératisation → `prestation` résumé =
   « Désinsectisation + Dératisation », total = somme des 3 lignes.
6. **Rétrocompatibilité** : rouvrir un ancien devis (Direction Générale, 1 ligne
   Dératisation, sans `lignes`) → édition et impression correctes, colonne Secteur « — ».

## Fichiers touchés

- `supabase/migrations/2026XXXX_devis_lignes.sql` — ajout colonne `lignes`.
- `app/admin/page.js` :
  - état `formDevis` (+ `lignes`, retrait de l'usage UI de `prestations`/maps),
  - `renderFormDevis` (liste de lignes),
  - `ouvrirEditionDevis` (charge `lignes` via `lignesFromDevis`),
  - `creerDevis` (écrit `lignes`, résumé `prestation`),
  - `imprimerDevis` (tableau + colonne Secteur, via `lignesFromDevis`),
  - helper `lignesFromDevis(d)` (rétrocompat, réutilisé édition + impression).

## Risques / notes

- **Standard projet** : `creerDevis`/`ouvrirEditionDevis` utilisent aujourd'hui
  `db.from("devis").update(...)` en direct (déjà existant). Le périmètre ne l'élargit
  pas ; on suit le pattern en place. (À noter comme dette, hors sujet ici.)
- Bien conserver `.filter(Boolean)` et `.filter(montant > 0)` à l'impression (leçon
  2026-06-19 : lignes « 0 » parasites).
- La limite body Vercel ne concerne pas ce devis (pas d'upload).
