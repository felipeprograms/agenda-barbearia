-- Limita o uso de armazenamento das fotos (rode no SQL Editor do Supabase).
-- 1) Cada arquivo: no máximo 1 MB (o site já reduz as fotos antes de enviar).
update storage.buckets
   set file_size_limit = 1048576,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'fotos';

-- 2) Cada usuário: no máximo 40 arquivos na própria pasta (aplicado no banco, não dá para burlar pelo navegador).
drop policy if exists "fotos_insert_own" on storage.objects;
create policy "fotos_insert_own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      select count(*) from storage.objects o
       where o.bucket_id = 'fotos' and (storage.foldername(o.name))[1] = auth.uid()::text
    ) < 40
  );
