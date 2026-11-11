-- Reserva nomes de endereço que o sistema já usa, para nenhuma barbearia ficar com o link "escondido" por uma página do sistema.
-- Rode no SQL Editor do Supabase. Se alguma barbearia já usa um desses nomes, o comando avisa e nada muda.
alter table shops drop constraint if exists shops_slug_check;
alter table shops add constraint shops_slug_check
  check (slug ~ '^[a-z0-9-]{3,40}$' and slug not in
    ('painel', 'api', 'admin', 'entrar', 'login', 'termos', 'privacidade', 'conectar', 'pagamento', 'icons', 'offline', 'manifest'));
