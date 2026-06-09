# Offre de bienvenue — Remise automatique 10%

**Date :** 2026-06-09  
**Statut :** Approuvé

---

## Objectif

Attirer de nouveaux clients sur le site GSE en proposant une remise automatique de 10% sur leur premier devis. Si le devis aboutit à un contrat annuel, la même remise est automatiquement appliquée au contrat, sans action manuelle de l'admin.

---

## Périmètre

- Remise de **10%** sur le **premier devis** uniquement
- Si ce devis se convertit en contrat, la remise de 10% est **portée automatiquement** sur le contrat
- Offre **permanente**, réservée à **toute première demande** (pas de date d'expiration, pas de code promo)
- Déclenchée côté **site public** — tous les contacts via le formulaire sont considérés éligibles ; la vérification "nouveau client" se fait côté backend

---

## Frontend — Ce que le client voit

### 1. Bannière globale (`app/layout.tsx`)
- Barre fixe en haut de toutes les pages
- Fond couleur GSE (vert), texte blanc
- Contenu : *"Offre de bienvenue — -10% sur votre premier traitement · Pour toute première demande"*
- Lien cliquable vers `/contact`

### 2. Section homepage (`app/page.tsx`)
- Nouveau bloc inséré entre les chiffres-clés et les témoignages
- Badge "-10%", titre accrocheur, sous-titre court précisant "première demande"
- Bouton CTA vers `/contact`

### 3. Badge sur le formulaire de contact (`app/contact/ContactForm.js`)
- Encadré vert au-dessus du bouton d'envoi
- Texte : *"Votre remise de 10% est automatiquement incluse — valable pour toute première demande"*
- Le formulaire envoie `offre_bienvenue: true` dans le payload

---

## Backend

### Migration Supabase
- Ajouter colonne `remise_bienvenue INTEGER DEFAULT 0` sur la table `devis`

### Vérification côté API (`app/api/create-client/route.js`)
1. Le frontend envoie `offre_bienvenue: true` dans chaque soumission de formulaire
2. Le backend vérifie si un devis existe déjà pour cet email dans Supabase
   - **Aucun devis existant** → `remise_bienvenue = 10` stocké sur le nouveau devis
   - **Devis existant trouvé** → `remise_bienvenue = 0`, offre ignorée

### CRM (`crm.html`)
- Les devis avec `remise_bienvenue = 10` affichent un badge vert **"Offre bienvenue -10%"**
- Lors de la génération du PDF devis, `remise=10` est pré-passé automatiquement

### Génération de contrat (`app/api/generate-contract/route.js`)
- Si le devis source a `remise_bienvenue = 10`, le paramètre `remise=10` est injecté automatiquement dans les paramètres de génération
- Aucune action manuelle requise de la part de l'admin

---

## Flux complet

```
Client visite le site
  → voit bannière + section homepage avec l'offre
  → remplit le formulaire de contact
  → badge confirme "remise de 10% incluse"
  → soumet le formulaire (payload: offre_bienvenue: true)

Backend reçoit la demande
  → vérifie: email déjà connu avec devis ? 
      OUI → remise_bienvenue = 0
      NON → remise_bienvenue = 10 (stocké sur le devis)

Admin ouvre le CRM
  → voit le badge "Offre bienvenue -10%" sur le devis
  → génère le devis PDF → remise=10 pré-remplie

Si devis accepté + contrat créé
  → remise_bienvenue=10 du devis est passée à generate-contract
  → contrat généré avec remise 10% sans action manuelle
```

---

## Ce qui n'est PAS dans le périmètre

- Pas de code promo
- Pas de date d'expiration affichée
- Pas de remise sur les clients créés manuellement par l'admin dans le CRM
- Pas de remise sur les devis suivants (uniquement le premier)
