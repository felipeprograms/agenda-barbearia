import { supabaseBrowser } from "./supabaseBrowser";
import { prepareImage } from "./imageUtils";

const BUCKET = "fotos";
const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024; // foto original que a pessoa escolhe
const MAX_FINAL_BYTES = 900 * 1024; // depois de reduzida (o bucket aceita até 1 MB)

/** Reduz a foto (ou o logo, em PNG), envia para a pasta do usuário logado e devolve o endereço público dela. */
export async function uploadPhoto(file: File, opts: { logo?: boolean } = {}): Promise<string> {
  const db = supabaseBrowser();
  const { data } = await db.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Faça login novamente.");

  if (file.size > MAX_ORIGINAL_BYTES) throw new Error("Foto muito grande. Escolha uma de até 15 MB.");

  const png = Boolean(opts.logo);
  let blob = await prepareImage(file, png ? 1000 : 1600, 0.82, png ? "png" : "jpeg");
  // Ainda grande? Reduz mais, em passos, até caber no limite.
  for (const [side, q] of [[1280, 0.72], [1000, 0.65], [800, 0.55]] as const) {
    if (blob.size <= MAX_FINAL_BYTES) break;
    blob = await prepareImage(file, png ? Math.min(side, 800) : side, q, png ? "png" : "jpeg");
  }
  if (blob.size > MAX_FINAL_BYTES) throw new Error("Não consegui reduzir essa foto o bastante. Tente outra imagem.");
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${png ? "png" : "jpg"}`;

  const { error } = await db.storage.from(BUCKET).upload(path, blob, {
    contentType: png ? "image/png" : "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) {
    if (/row-level|policy/i.test(error.message))
      throw new Error("Limite de fotos atingido (40). Apague fotos antigas antes de enviar novas.");
    const hint = /bucket|not found/i.test(error.message)
      ? " Confira se você rodou o arquivo migracao-vitrine.sql no Supabase."
      : "";
    throw new Error(`Não foi possível enviar a foto.${hint}`);
  }
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Apaga uma foto enviada antes (ignora erros: no máximo sobra um arquivo sem uso). */
export async function removePhoto(url: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  try {
    await supabaseBrowser().storage.from(BUCKET).remove([path]);
  } catch {
    /* sem problema */
  }
}
