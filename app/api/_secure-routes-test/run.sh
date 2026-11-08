#!/usr/bin/env bash
# Transpile les routes .ts + la logique webhook en .mjs (esbuild, types strippés, imports
# conservés pour le loader), puis exécute les suites via node --test.
# Artefacts générés (gen/pay/logic.mjs) : NON commités (régénérés ici).
set -euo pipefail
cd "$(dirname "$0")"

esb() { npx esbuild "$1" --format=esm --platform=node --target=node20 --log-level=warning > "$2"; }

esb ../generate-attestation/route.ts   gen.mjs
esb ../declarer-paiement/route.js      declarer.mjs
esb ../valider-paiement/route.js       valider.mjs
esb ../paiements-data/route.js         paiements-data.mjs
esb ../justificatif-upload/route.js    justif-upload.mjs
esb ../crm-data/route.js               crm-data.mjs
esb ../rh-data/route.js                rh-data.mjs
esb ../recrutement/route.js            recrutement.mjs
esb ../prospection/route.js            prospection.mjs
esb ../admin-auth/route.js             admin-auth.mjs
esb ../create-client/route.js          create-client.mjs

node --import tsx --test \
  routes.test.mjs \
  hors-site.test.mjs \
  lot-b.test.mjs \
  p2-permissions.test.mjs
