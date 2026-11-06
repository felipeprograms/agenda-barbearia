-- Painel de administrador: liberação de barbearias e controle de mensalidade.
-- Rode DEPOIS do schema.sql e do migracao-vitrine.sql. Pode rodar mais de uma vez.

-- 1) Administradores da plataforma (você). RLS ligado e SEM políticas: só o servidor lê.
create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table platform_admins enable row level security;
revoke all on platform_admins from anon, authenticated;

-- 2) Situação de cada barbearia.
--    pending   = cadastrou, aguardando você liberar (página pública fora do ar)
--    active    = liberada (no ar enquanto a mensalidade estiver em dia)
--    suspended = bloqueada por você
-- As barbearias que já existiam hoje ficam "active" para não saírem do ar.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shops' and column_name = 'status'
  ) then
    alter table shops add column status text not null default 'active'
      check (status in ('pending', 'active', 'suspended'));
    alter table shops alter column status set default 'pending';
  end if;
end $$;

alter table shops add column if not exists paid_until date;       -- vazio = sem vencimento
alter table shops add column if not exists approved_at timestamptz;
alter table shops add column if not exists admin_note text
  check (admin_note is null or char_length(admin_note) <= 200);

-- 3) Permissões: o dono NÃO pode mais alterar status, vencimento, slug ou dono da barbearia.
--    Só pode criar com (owner_user_id, name, slug) e editar o perfil abaixo.
revoke insert, update on shops from anon, authenticated;
grant insert (owner_user_id, name, slug) on shops to authenticated;
grant update (name, tagline, about, address, phone, instagram, hours_text, policies_text,
              cover_url, logo_url, gallery) on shops to authenticated;

-- 4) Convites só podem ser gerados por barbearias liberadas e em dia.
create or replace function shop_is_open(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from shops
    where id = sid
      and status = 'active'
      and (paid_until is null or paid_until >= (now() at time zone 'America/Bahia')::date)
  );
$$;

drop policy if exists "invites_owner_insert" on invites;
create policy "invites_owner_insert" on invites for insert
  with check (owns_shop(shop_id) and shop_is_open(shop_id));
