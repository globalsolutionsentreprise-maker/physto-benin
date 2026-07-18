# Analyse IA de contrat enrichie (rapport de visite + devis réel)

**Date :** 2026-07-19
**Statut :** Validé (design), en attente de plan d'implémentation
**Fichiers principaux :** `app/api/analyze-contract/route.js`, `app/admin/page.js` (`renderContratModal`, `analyserContrat`)

## Problème

Deux problèmes distincts, découverts en instruisant la demande « il faut que l'IA prenne
en compte le rapport de visite et le devis ».

### 1. L'IA travaille déjà presque à vide

Le prompt de `analyze-contract` lit trois champs qui n'existent pas en base. Vérifié par
requête directe sur la production :

| Ce que le prompt lit | Réalité |
|---|---|
| `devis.montant` | `column devis.montant does not exist` (les colonnes sont `montant_net`, `montant_total`, `montant_brut`) |
| `devis.prestations` | `column devis.prestations does not exist` (la colonne est `prestation`, au singulier) |
| requête historique `select id, statut, created_at, montant` | **400**, la requête entière échoue |

Conséquences en production :

- **« Montant devis : Non précisé »** : l'IA propose un prix de contrat sans jamais
  connaître le montant du devis de référence.
- **« Superficie : Non précisée »** : depuis le passage aux lignes multi-secteurs
  (migration `20260711020000_devis_lignes`), `devis.superficie` est `NULL`. Les surfaces
  vivent dans `lignes`.
- **« Nouveau client » pour tout le monde** : la requête d'historique échoue en silence,
  `historique` vaut `null`, donc `nbDevisAntérieurs = 0` en permanence. La règle 2 du
  prompt (remise fidélité de 5 à 10 % pour un client existant) ne s'est jamais
  déclenchée pour personne.
- `devis.remise` existe mais `creerDevis` ne l'enregistre pas : elle vaut 0 partout.

Un échec de requête se présente donc aujourd'hui comme un fait (« 0 devis antérieurs »)
au lieu d'une absence d'information. C'est la cause directe du bug.

### 2. Le rapport de visite n'est pas exploité

La table `rapports_visite` contient exactement ce qui manque à la décision :
`niveau_infestation`, `nuisibles`, `zones_infestees`, `recommandations`, `observations`,
`notes_technicien`, `description_site`.

Exemple réel (Jean Folly, RV-2026-0718-304, 18/07/2026) : niveau Élevé, termites et rats,
zones détaillées avec dimensions, et une recommandation du technicien qui écrit
elle-même l'argumentaire du contrat (« la mise en place d'un contrat de suivi régulier et
permanent est fortement conseillée, incluant des passages multiples et des contrôles
périodiques »). L'IA n'en voit rien.

## État des données (production, 2026-07-19)

- 22 devis, 12 rapports de visite
- 11 devis avec rapport, **11 sans** : exiger un rapport bloquerait un dossier sur deux
- 1 devis porte plusieurs rapports
- 0 rapport orphelin (`devis_id` toujours renseigné)
- Niveaux réellement saisis à ce jour : `Moyen` et `Élevé` uniquement

## Objectif

L'IA doit fonder sa recommandation sur le dossier réel : montant et structure du devis,
constat terrain quand il existe, historique du client. Trois axes d'amélioration retenus,
sans changer la structure de la réponse JSON :

1. **Le prix** cohérent avec le devis et la superficie réelle
2. **La formule et la fréquence** cohérentes avec le niveau d'infestation constaté
3. **Les clauses et l'argumentaire** citant les nuisibles et zones réellement constatés

Hors périmètre (YAGNI) : envoi des photos du rapport à l'IA (multimodal, coût et latence
pour un gain incertain), modification de la structure JSON de sortie, refonte du modal.

## Approche retenue : une route, deux phases (Approche A)

`analyze-contract` prend un paramètre `phase`. Le bloc de chargement des données du
dossier est écrit **une seule fois** et sert aux deux phases.

Approches écartées :

- **Deux routes séparées** (`/api/contract-questions` + l'existante) : duplique le bloc de
  chargement des données, c'est-à-dire précisément le bloc qui contient les bugs corrigés
  ici. Un champ qui change demanderait de penser aux deux fichiers.
- **Un seul appel renvoyant questions et analyse** : l'analyse serait produite avant les
  réponses, donc sans les intégrer. Les questions deviendraient décoratives.

## 1. Socle de données

Rassemblé une fois, consommé par les deux phases.

```js
// Devis
montant     = devis.montant_net || devis.montant_total || null
prestation  = devis.prestation || null
lignes      = Array.isArray(devis.lignes) ? devis.lignes : []
superficie  = lignes.reduce((s, l) => s + (Number(l.superficie) || 0), 0) || devis.superficie || null
totalLignes = lignes.reduce((s, l) => s + (Number(l.montant) || 0), 0)
remise      = totalLignes > 0 && montant ? totalLignes - montant : null
```

Le **détail des lignes** part dans le prompt (prestation, secteur, surface, prix au m²,
montant), pas seulement le total : l'IA voit la structure du chantier.

Requête historique corrigée : `select id, statut, created_at, montant_net`.

**Règle sur les échecs de requête.** Toute requête annexe (historique, fiches, rapports)
qui échoue n'interrompt pas l'analyse, mais son absence est déclarée telle quelle dans le
prompt : « historique indisponible », jamais « 0 devis antérieurs ». Une absence
d'information ne doit jamais être présentée à l'IA comme un fait.

## 2. Rapport de visite

Recherche par `devis_id`, triée sur `date_visite` décroissante.

- **Le plus récent** sert de référence : date, niveau, nuisibles (+ `autres_nuisible`),
  zones infestées, recommandations, observations, notes du technicien, description et
  adresse du site, technicien.
- **Les précédents** tiennent en une ligne chacun (date et niveau) pour montrer
  l'évolution de l'infestation.
- **Repli inter-dossiers** : si le devis n'a aucun rapport mais que le client en a un sur
  un autre dossier, on prend le plus récent du client en l'étiquetant explicitement comme
  provenant d'un autre devis. Même site, même infestation.

Les photos ne sont pas transmises.

## 3. Plancher d'infestation (contrainte dure)

Appliqué **après** le `JSON.parse`, comme `parseFrequenceClient` aujourd'hui. Motif : le
journal `tasks/lessons.md` documente deux cas où l'IA a ignoré une contrainte métier
posée en texte dans le prompt. Une contrainte critique se garantit dans le code.

```js
const PLANCHER_PASSAGES = { 'Faible': 1, 'Moyen': 2, 'Élevé': 4, 'Critique': 6 }
```

Ordre de priorité, du plus fort au plus faible :

1. **Demande explicite du client** (`parseFrequenceClient`) : souveraine, comportement
   actuel inchangé. C'est ce qui est vendu.
2. **Plancher d'infestation** : s'applique à la proposition de l'IA. Elle peut proposer
   plus, jamais moins.
3. **Proposition de l'IA** en dernier recours.

**Conflit client contre terrain.** Quand la demande du client est inférieure au plancher,
la demande client l'emporte sur le nombre contractuel, et le conflit est remonté
explicitement, jamais tranché en silence :

> « Le client demande 2 passages, le constat terrain (Élevé) en justifie 4. Écart à
> arbitrer avant signature. »

Ajouté en tête de `pointsAttention`. L'arbitrage commercial revient à l'utilisateur.

Sans rapport de visite, aucun plancher ne s'applique : pas de constat, pas de contrainte.

Quand le rapport utilisé provient d'un autre dossier du même client (repli de la section
2), le plancher **s'applique quand même** : c'est le même site et la même infestation.
L'origine du constat est déclarée dans `pointsAttention` pour que l'écart de dossier soit
visible à la relecture.

## 4. Phase questions

Déclenchée **uniquement** quand aucun rapport n'est trouvé (ni sur le devis, ni sur un
autre dossier du client). Un dossier avec rapport conserve le flux actuel en un clic.

**Requête**
```
POST /api/analyze-contract
{ devisId, phase: "questions", typeEtablissement, demandeClient, notes }
```

**Réponse**
```json
{ "questions": [ { "id": "acces", "question": "…", "pourquoi": "…" } ] }
```

5 questions maximum. Contrainte inscrite dans le prompt : chaque question doit être
répondable **depuis le bureau** (horaires d'exploitation, accès aux locaux, historique
d'infestation, contraintes HACCP ou réglementaires). Aucune question exigeant un retour
sur site, sinon elle reste sans réponse et n'apporte rien.

**Phase analyse**
```
POST /api/analyze-contract
{ devisId, phase: "analyse", typeEtablissement, demandeClient, notes, reponsesTechniques: { acces: "…" } }
```

Les réponses sont **facultatives** : l'analyse peut être lancée sans qu'aucune ne soit
remplie. Les réponses vides ne partent pas dans le prompt.

Rétrocompatibilité : `phase` absent équivaut à `"analyse"`.

## 5. Modal

Un bandeau déclare ce que l'IA a réellement vu, avant et après analyse :

- `📋 Rapport RV-2026-0718-304 du 18/07/2026, niveau Élevé`
- `📋 Rapport RV-… du 02/06/2026 (autre dossier du même client), niveau Moyen`
- `⚠️ Aucun rapport de visite, analyse fondée sur le devis et vos réponses`

Sur un dossier sans rapport, l'étape questions s'intercale entre le formulaire de contexte
et l'analyse, avec un bouton permettant de la sauter.

## 6. Vérification

Deux cas réels de production :

| Cas | Attendu |
|---|---|
| Jean Folly, `DEV-GSE-2026-450F524B` (rapport Élevé, termites avec reine mère) | Montant 104 118 FCFA et superficie visibles dans le prompt ; plancher à 4 passages appliqué ; clauses citant termites et rats ; aucune phase questions |
| Un des 11 devis sans rapport | Phase questions déclenchée, 5 questions maximum toutes répondables depuis le bureau ; analyse possible sans y répondre |

Contrôle de non-régression : un dossier avec rapport doit continuer à produire une analyse
en un seul clic, sans étape supplémentaire.
