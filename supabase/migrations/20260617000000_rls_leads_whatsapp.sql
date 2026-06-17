-- Fix alerte sécurité Supabase : RLS manquant sur leads + whatsapp_conversations
-- Ces tables ont été créées après la migration RLS globale de juin 2026.
-- service_role bypasse RLS automatiquement — les routes API ne sont pas affectées.

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
