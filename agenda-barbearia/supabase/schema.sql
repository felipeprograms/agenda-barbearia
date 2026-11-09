-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run.
-- Estrutura: BARBEARIA (shops) -> vários BARBEIROS (barbers) -> serviços, horários e agendamentos.

create extension if not exists btree_gist;

-- ============ TABELAS ============

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9-]{3,40}$' and slug not in ('painel', 'api', 'admin', 'entrar', 'login')),
  name text not null check (char_length(name) between 2 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists barbers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  deposit_percent int not null default 30 check (deposit_percent between 10 and 100),
  telegram_chat_id bigint,
  telegram_code text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  mp_connected boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (shop_id, slug)
);

-- Convites: o dono gera um código, o barbeiro usa para entrar na barbearia.
create table if not exists invites (
  code text primary key default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  shop_id uuid not null references shops(id) on delete cascade,
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Token do Mercado Pago de cada barbeiro. RLS ligado e SEM políticas:
-- ninguém acessa pelo navegador, só o servidor (service role).
create table if not exists barber_secrets (
  barber_id uuid primary key references barbers(id) on delete cascade,
  mp_access_token text not null
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  price_cents int not null check (price_cents >= 100),
  duration_min int not null check (duration_min between 10 and 240),
  active boolean not null default true
);

-- weekday: 0 = domingo ... 6 = sábado. Pode ter mais de um intervalo por dia (ex: manhã e tarde).
create table if not exists working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers(id) on delete cascade,
  service_id uuid not null references services(id),
  service_name text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_cents int not null,
  amount_cents int not null,          -- valor cobrado agora (sinal ou total)
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'expired', 'cancelled', 'conflict')),
  hold_expires_at timestamptz not null,
  mp_payment_id text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Garante no banco que dois agendamentos ativos do mesmo barbeiro nunca se sobreponham.
  constraint no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed'))
);

create index if not exists bookings_barber_start on bookings (barber_id, starts_at);

-- ============ FUNÇÕES AUXILIARES DE PERMISSÃO ============
-- security definer evita recursão entre as políticas das tabelas.

create or replace function owns_shop(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from shops where id = sid and owner_user_id = auth.uid());
$$;

create or replace function is_member_of_shop(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from barbers where shop_id = sid and user_id = auth.uid());
$$;

create or replace function owns_barber(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from barbers where id = bid and user_id = auth.uid());
$$;

-- O próprio barbeiro ou o dono da barbearia dele.
create or replace function can_see_barber(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from barbers b
    where b.id = bid
      and (b.user_id = auth.uid()
           or exists (select 1 from shops s where s.id = b.shop_id and s.owner_user_id = auth.uid()))
  );
$$;

-- ============ SEGURANÇA (RLS) ============

alter table shops enable row level security;
alter table barbers enable row level security;
alter table invites enable row level security;
alter table barber_secrets enable row level security;
alter table services enable row level security;
alter table working_hours enable row level security;
alter table bookings enable row level security;

-- Barbearia: o dono cria e edita; barbeiros da casa podem ler.
create policy "shops_select" on shops for select
  using (owner_user_id = auth.uid() or is_member_of_shop(id));
create policy "shops_insert" on shops for insert with check (owner_user_id = auth.uid());
create policy "shops_update" on shops for update using (owner_user_id = auth.uid());

-- Barbeiros: criados SOMENTE pelo servidor (rota de convite). O barbeiro lê e edita o próprio
-- cadastro; o dono lê e pode ativar/desativar os da sua barbearia.
create policy "barbers_select" on barbers for select
  using (user_id = auth.uid() or owns_shop(shop_id));
create policy "barbers_update" on barbers for update
  using (user_id = auth.uid() or owns_shop(shop_id));

-- Só estas colunas podem ser alteradas pelo navegador (shop_id, slug, token etc. não).
revoke insert, update, delete on barbers from anon, authenticated;
grant update (name, deposit_percent, active) on barbers to authenticated;

-- Convites: só o dono.
create policy "invites_owner_select" on invites for select using (owns_shop(shop_id));
create policy "invites_owner_insert" on invites for insert with check (owns_shop(shop_id));
create policy "invites_owner_delete" on invites for delete using (owns_shop(shop_id) and used_by is null);
revoke update on invites from anon, authenticated;

-- Serviços e horários: o próprio barbeiro.
create policy "services_own_all" on services for all
  using (owns_barber(barber_id)) with check (owns_barber(barber_id));
create policy "hours_own_all" on working_hours for all
  using (owns_barber(barber_id)) with check (owns_barber(barber_id));

-- Agendamentos: o barbeiro vê os dele; o dono vê os da barbearia. Quem cria/altera é o servidor.
create policy "bookings_select" on bookings for select using (can_see_barber(barber_id));

-- ============ FUNÇÕES DO SERVIDOR ============

create or replace function create_booking(
  p_barber uuid,
  p_service uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_start timestamptz,
  p_hold_minutes int
) returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  svc services;
  brb barbers;
  amount int;
  result bookings;
begin
  select b.* into brb
    from barbers b join shops s on s.id = b.shop_id
   where b.id = p_barber and b.active and s.active;
  if not found then raise exception 'barber_not_found'; end if;

  select * into svc from services where id = p_service and barber_id = p_barber and active;
  if not found then raise exception 'service_not_found'; end if;

  -- Libera reservas que passaram do prazo de pagamento.
  update bookings set status = 'expired'
   where barber_id = p_barber and status = 'pending' and hold_expires_at < now();

  amount := least(svc.price_cents, greatest(100, round(svc.price_cents * brb.deposit_percent / 100.0)::int));

  begin
    insert into bookings (
      barber_id, service_id, service_name, customer_name, customer_phone, customer_email,
      starts_at, ends_at, price_cents, amount_cents, status, hold_expires_at
    ) values (
      p_barber, p_service, svc.name, p_name, p_phone, nullif(p_email, ''),
      p_start, p_start + make_interval(mins => svc.duration_min),
      svc.price_cents, amount, 'pending', now() + make_interval(mins => p_hold_minutes)
    ) returning * into result;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  return result;
end;
$$;

-- Confirma um agendamento depois que o pagamento foi aprovado. Pode ser chamada
-- várias vezes (webhook + consulta do cliente) sem confirmar em dobro.
-- Retorno: confirmed | already | conflict_new | conflict | not_found | cancelled
create or replace function confirm_booking(p_id uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  b bookings;
begin
  select * into b from bookings where id = p_id for update;
  if not found then return 'not_found'; end if;

  if b.status = 'confirmed' then return 'already'; end if;

  if b.status in ('pending', 'expired') then
    begin
      update bookings set status = 'confirmed' where id = p_id;
      return 'confirmed';
    exception when exclusion_violation then
      -- Pagou depois do prazo e o horário já foi ocupado por outra pessoa.
      update bookings set status = 'conflict' where id = p_id;
      return 'conflict_new';
    end;
  end if;

  return b.status;
end;
$$;

revoke all on function create_booking(uuid, uuid, text, text, text, timestamptz, int) from public, anon, authenticated;
revoke all on function confirm_booking(uuid) from public, anon, authenticated;
grant execute on function create_booking(uuid, uuid, text, text, text, timestamptz, int) to service_role;
grant execute on function confirm_booking(uuid) to service_role;
