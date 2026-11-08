-- Conexão do Mercado Pago com um clique (OAuth). Rode uma vez no SQL Editor. Pode repetir sem problema.
alter table barber_secrets add column if not exists refresh_token text;
alter table barber_secrets add column if not exists expires_at timestamptz;
alter table barber_secrets add column if not exists mp_user_id bigint;
alter table barber_secrets add column if not exists source text not null default 'manual'
  check (source in ('manual', 'oauth'));
-- barber_secrets continua com RLS ligado e sem políticas: só o servidor (service role) lê.
