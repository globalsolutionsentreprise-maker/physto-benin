# /deploy

Build, commit, and deploy to Vercel production.

## Steps
1. Run `npm run build` — stop if errors
2. Run `git add -A` (excluding .env files)
3. Commit with message from user or auto-generate from git diff
4. Run `vercel --prod`
5. Confirm deployment URL responds with 200
