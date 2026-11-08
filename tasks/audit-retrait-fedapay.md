# Audit FedaPay & plan de retrait — GSE / Phyto-Bénin

> Décision du 05/11/2026 : retrait total de FedaPay. Règlements gérés hors site
> (chèque en main propre, Mobile Money direct). L'app enregistre, reçoit le
> justificatif, vérifie et valide ; l'attestation n'est émise qu'après
> confirmation du règlement effectif.
>
> Audit réalisé le 07-08/11/2026 en lecture seule. Aucune suppression, aucune
> donnée modifiée, aucune migration appliquée.

## Constat critique
L'émission d'attestation dépend **à 100 %** du webhook FedaPay : `generate-attestation`
n'a **aucun appelant frontend**, seul le webhook l'appelle. Retirer FedaPay sans
re-câblage casse toute émission d'attestation.

Deux mécanismes de « paiement » coexistent, à ne pas confondre :
- `paiements_recus` : colonne numérique sur devis/contrats, **saisie manuelle admin**
  (Finances / frise d'encaissement). Déjà hors site. **Non concerné par FedaPay.**
- table `paiements` : versements 60/40, **flux FedaPay en ligne** (espace-client). Objet du retrait.

## 1. Empreinte FedaPay

### A. Code 100 % FedaPay → à retirer (Lot C)
| Fichier | Rôle |
|---|---|
| `app/api/create-payment/route.ts` | Crée la transaction FedaPay |
| `supabase/functions/fedapay-webhook/index.ts` | Webhook de confirmation (Edge Function Deno) |
| `supabase/functions/fedapay-webhook/fedapay-logic.ts` | Machine à états du webhook |
| `app/api/_secure-routes-test/webhook-sig.test.mjs` | Tests signature FedaPay |
| `app/api/_secure-routes-test/webhook-logic.test.mjs` | Tests machine à états FedaPay |

### B. Code FedaPay mêlé → à modifier
| Fichier | Partie FedaPay |
|---|---|
| `app/espace-client/devis/[id]/page.tsx` | `lancerPaiement()` + 2 blocs « Payer via Feday Pay » (60 % l.277-292, 40 % l.296-312) |
| `app/admin/page.js` | `COMMISSION_FEDAPAY=0.0185` (l.1403), surcharge 1,85 % sur `montant_total` mode email (l.2090, 5394-5395), libellés FedaPay (l.1139, 5404, 5421) |
| `app/api/generate-attestation/route.ts` | À CONSERVER (émetteur), déclencheur à re-câbler du webhook vers la confirmation admin |
| `app/api/_secure-routes-test/routes.test.mjs` | CP1-CP9 (create-payment) à retirer ; GA* (attestation) à garder/adapter |
| `app/api/client-devis/route.js` | Commentaire l.9 (cosmétique) |

### C. Variables d'environnement
`FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET` → à retirer après dé-déploiement.
`ATTESTATION_INTERNAL_SECRET` → inutile une fois l'attestation déclenchée par l'admin.
Aucune dépendance npm FedaPay (REST direct) → rien à désinstaller.

### D. Tables / colonnes
Table `paiements` : `fedapay_transaction_id`, `fedapay_payment_url` deviennent inutiles
(conservées pour traçabilité). `paiements_statut_check` = `en_attente/en_cours/confirme/echoue`.
Table créée directement en prod (pas de migration de création au repo) ; seules les
policies RLS la référencent (**déjà déployées — ne pas toucher**).

### E. Migrations
Aucune n'est « FedaPay ». `20261107140000_paiements_unique_active.sql` (non appliquée)
reste pertinent hors site — superséd é par la migration du Lot A.

## 2. Données de production (à vérifier en lecture seule AVANT toute migration)
Accès MCP refusé en session ; requête à exécuter côté prod :
```sql
select
  (select count(*) from paiements) total,
  (select count(*) from paiements where fedapay_transaction_id is not null) via_fedapay,
  (select count(*) from paiements where statut='confirme') confirmes,
  (select count(*) from attestations) attestations,
  (select count(*) from devis where statut in ('en_cours','termine')) devis_actifs;
```
`via_fedapay = 0` → retrait sans migration de données. `> 0` → lignes `confirme`
conservées, continuent de compter dans le solde. Vérifier l'Edge Function : `supabase functions list`.

## 3. Supprimer / conserver / remplacer
- **Supprimer** : create-payment, fedapay-webhook (+ `functions delete` + config dashboard FedaPay + révoquer clés), tests FedaPay, env vars, surcharge 1,85 %.
- **Conserver** : RLS déployées, `verifyAdminWrite`, table `paiements` + RLS, `attestations` + `/verifier/[token]` + révocation par `statut`, contrôle « paiement intégral » (`Σ confirmés ≥ montant_total`), concept anti-doublon (index unique + 23505).
- **Remplacer** : déclencheur attestation (webhook → confirmation admin) ; blocs « Payer en ligne » → déclaration hors site.

## 4. Parcours cible hors site (réemploi de `paiements`)
1. **Déclaration** (client ou admin) : montant (recalculé serveur), mode (`cheque`/`mobile_money`), référence, date → statut `declare`.
2. **Justificatif** : upload (photo chèque / capture MoMo) → Supabase Storage, URL sur la ligne.
3. **Vérification comptable** (admin) : consultation du justificatif, rapprochement relevé réel.
4. **Confirmation** (admin, `verifyAdminWrite`) : valide → `confirme` + `confirmed_at` + `verifie_par` ; refuse → `rejete` + note.
5. **Solde** : `Σ(confirme) vs montant_total` → devis `en_cours` (acompte) / `termine` (soldé).
6. **Attestation** : la confirmation du règlement **soldant** déclenche `emettreAttestation` (admin, contrôle intégral conservé). Remplace le webhook.

Routes : `POST /api/declarer-paiement` (client+admin), `POST /api/valider-paiement` (admin).

## 5. Impacts existants
- **Attestations émises** : inchangées.
- **Devis « mode email »** (décision 08/11) : montant initial conservé, **aucune modif rétroactive** ; nouveaux devis **sans surcharge** (Lot B).
- **Paiements FedaPay `confirme`** : conservés, comptent dans le solde ; `fedapay_*` gardés pour traçabilité.
- **Devis en cours de paiement en ligne** : bascule sur la déclaration hors site ; solde déjà payé acquis.

## 6. Plan de retrait (ordonné, sur autorisation par lot)
- **Lot A — Backend hors site** : routes declarer/valider-paiement + extraction `lib/attestation.js` (re-câblage) + migration d'extension `paiements` (préparée) + tests. *(non-destructif, FedaPay intact)*
- **Lot B — Frontend hors site** : remplacer les blocs « Payer via FedaPay » par le formulaire de déclaration + upload ; écran admin vérification/validation ; retirer surcharge 1,85 % et libellés (nouveaux devis uniquement).
- **Lot C — Retrait FedaPay** : supprimer create-payment + fedapay-webhook (+ `functions delete`), tests FedaPay ; retirer env vars ; nettoyer refs admin ; révoquer clés + webhook côté FedaPay (externe).

Ordre : **A → B → C**. Chaque lot : commit / déploiement / migration sur autorisation distincte.
