-- Avisos no celular (Web Push). Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- Guarda os celulares/computadores que ativaram os avisos. Só o servidor lê e escreve.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
revoke all on push_subscriptions from anon, authenticated;
