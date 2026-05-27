# /check-db

Verify Supabase connection and pending migrations.

## Steps
1. Check `supabase/migrations/` for any .sql files not yet pushed
2. Run `supabase db push --dry-run` to preview pending changes
3. Report which tables exist vs which are defined in migrations
4. Flag any foreign key or RLS issues
