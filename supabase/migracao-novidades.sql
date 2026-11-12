-- Novidades: localização (CEP + mapa), remover barbeiro, atendimento e avisos ao cliente.
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

-- 1) Localização da barbearia
alter table shops
  add column if not exists cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  add column if not exists lat double precision check (lat is null or lat between -35 and 6),
  add column if not exists lng double precision check (lng is null or lng between -75 and -30);
grant update (cep, lat, lng) on shops to authenticated;

-- 2) Barbeiro removido que já tem histórico fica "arquivado" (some do painel e do site, mas os agendamentos antigos ficam).
alter table barbers add column if not exists archived_at timestamptz;

-- 3) Atendimento: quando o barbeiro iniciou e finalizou.
alter table bookings
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz;

-- 4) Aviso ao cliente sem cadastro: cada agendamento pode guardar aparelhos que ativaram os avisos.
create table if not exists booking_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists booking_push_booking on booking_push_subscriptions (booking_id);
alter table booking_push_subscriptions enable row level security;
revoke all on booking_push_subscriptions from anon, authenticated;
