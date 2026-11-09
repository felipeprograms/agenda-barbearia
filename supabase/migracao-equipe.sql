-- Barbeiros cadastrados pelo dono, sem login próprio.
-- Rode no Supabase: SQL Editor > New query > Run. Pode rodar mais de uma vez sem problema.

-- 1) O barbeiro pode existir sem conta (user_id vazio): quem cuida dele é o dono da barbearia.
alter table barbers alter column user_id drop not null;

-- 2) Link secreto de conexão: o barbeiro abre /conectar/<token> e liga o próprio Mercado Pago e Telegram.
alter table barbers add column if not exists connect_token text;
update barbers set connect_token = replace(gen_random_uuid()::text, '-', '') where connect_token is null;
alter table barbers alter column connect_token set default replace(gen_random_uuid()::text, '-', '');
alter table barbers alter column connect_token set not null;
create unique index if not exists barbers_connect_token_key on barbers (connect_token);

-- 3) O dono também pode editar serviços e horários dos barbeiros da barbearia dele.
create or replace function owns_barber(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from barbers b
    where b.id = bid
      and (b.user_id = auth.uid()
           or exists (select 1 from shops s where s.id = b.shop_id and s.owner_user_id = auth.uid()))
  );
$$;
