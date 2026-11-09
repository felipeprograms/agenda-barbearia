-- Limite de requisições (rate limit) compartilhado entre todas as instâncias do site.
-- Rode no Supabase: SQL Editor > New query > Run. Pode rodar mais de uma vez.

create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);
alter table rate_limits enable row level security;
revoke all on rate_limits from anon, authenticated;

-- Conta mais uma chamada na janela atual e diz se ainda pode (allowed) ou quantos segundos esperar (retry_after).
create or replace function rate_limit_hit(p_key text, p_max int, p_window int)
returns table (allowed boolean, retry_after int)
language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window) * p_window);
  h int;
begin
  insert into rate_limits as r (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into h;

  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;

  allowed := h <= p_max;
  retry_after := greatest(1, ceil(extract(epoch from (w + make_interval(secs => p_window) - now())))::int);
  return next;
end;
$$;

revoke all on function rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, int, int) to service_role;
