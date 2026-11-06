-- ATUALIZAÇÃO: perfil da barbearia (capa, galeria, endereço...) e fotos dos barbeiros.
-- Rode DEPOIS do schema.sql: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar mais de uma vez sem problema.

-- ============ Perfil da barbearia ============
alter table shops
  add column if not exists tagline text check (char_length(tagline) <= 90),
  add column if not exists about text check (char_length(about) <= 600),
  add column if not exists address text check (char_length(address) <= 160),
  add column if not exists phone text check (phone ~ '^[0-9]{10,13}$'),
  add column if not exists instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  add column if not exists hours_text text check (char_length(hours_text) <= 400),
  add column if not exists policies_text text check (char_length(policies_text) <= 600),
  add column if not exists cover_url text,
  add column if not exists logo_url text,
  add column if not exists gallery text[] not null default '{}' check (cardinality(gallery) <= 8);

-- ============ Foto do barbeiro ============
alter table barbers add column if not exists photo_url text;
grant update (photo_url) on barbers to authenticated;

-- ============ Fotos (Supabase Storage) ============
-- Bucket público para leitura (as fotos aparecem para os clientes). Só aceita imagens de até 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Cada usuário só envia, troca e apaga arquivos dentro da própria pasta (nome da pasta = id do usuário).
drop policy if exists "fotos_insert_own" on storage.objects;
drop policy if exists "fotos_update_own" on storage.objects;
drop policy if exists "fotos_delete_own" on storage.objects;

create policy "fotos_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
