import { supabaseBrowser } from "./supabaseBrowser";
import { prepareImage } from "./imageUtils";

const BUCKET = "fotos";

/** Reduz a foto (ou o logo, em PNG), envia para a pasta do usuário logado e devolve o endereço público dela. */
export async function uploadPhoto(file: File, opts: { logo?: boolean } = {}): Promise<string> {
  const db = supabaseBrowser();
  const { data } = await db.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Faça login novamente.");

  const png = Boolean(opts.logo);
  const blob = await prepareImage(file, png ? 1000 : 1600, 0.82, png ? "png" : "jpeg");
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${png ? "png" : "jpg"}`;

  const { error } = await db.storage.from(BUCKET).upload(path, blob, {
    contentType: png ? "image/png" : "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) {
    const hint = /bucket|not found|row-level|policy/i.test(error.message)
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
