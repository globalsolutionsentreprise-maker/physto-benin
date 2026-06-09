create table if not exists whatsapp_conversations (
  id           uuid primary key default gen_random_uuid(),
  phone        text unique not null,
  messages     jsonb not null default '[]',
  lead_created boolean not null default false,
  lead_partial jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_whatsapp_conversations_phone
  on whatsapp_conversations(phone);
