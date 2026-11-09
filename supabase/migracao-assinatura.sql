-- Cobrança da mensalidade pelo próprio sistema (Mercado Pago) e plano de cada barbearia.
-- Rode no Supabase: SQL Editor > New query > Run. Pode rodar mais de uma vez.

alter table shops add column if not exists plan text;  -- 'teste' | 'mensal' | 'anual'

create table if not exists subscription_payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  plan text not null check (plan in ('mensal', 'anual')),
  method text not null check (method in ('pix', 'card')),
  amount_cents int not null check (amount_cents > 0),
  days int not null check (days > 0),
  mp_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Cada pagamento do Mercado Pago só pode valer uma vez.
create unique index if not exists subscription_payments_mp_key on subscription_payments (mp_payment_id) where mp_payment_id is not null;
create index if not exists subscription_payments_shop_idx on subscription_payments (shop_id, created_at desc);

-- RLS ligado e SEM políticas: só o servidor (service role) mexe aqui.
alter table subscription_payments enable row level security;
