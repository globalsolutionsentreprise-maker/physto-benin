#!/usr/bin/env bash
# Transpile les routes .ts + la logique webhook en .mjs (esbuild, types strippés, imports
# conservés pour le loader), puis exécute les suites via node --test.
# Artefacts générés (gen/pay/logic.mjs) : NON commités (régénérés ici).
set -euo pipefail
cd "$(dirname "$0")"

esb() { npx esbuild "$1" --format=esm --platform=node --target=node20 --log-level=warning > "$2"; }

esb ../generate-attestation/route.ts   gen.mjs
esb ../create-payment/route.ts         pay.mjs
esb ../declarer-paiement/route.js      declarer.mjs
esb ../valider-paiement/route.js       valider.mjs
esb ../paiements-data/route.js         paiements-data.mjs
esb ../justificatif-upload/route.js    justif-upload.mjs
esb ../../../supabase/functions/fedapay-webhook/fedapay-logic.ts logic.mjs

node --import tsx --test \
  routes.test.mjs \
  webhook-sig.test.mjs \
  webhook-logic.test.mjs \
  hors-site.test.mjs \
  lot-b.test.mjs
