export async function prepareImage(
  file: File,
  maxSide = 1600,
  quality = 0.82,
  format: "jpeg" | "png" = "jpeg",
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("A imagem é muito grande. O máximo é 25 MB.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não foi possível abrir essa imagem. Tente uma foto em JPG ou PNG.");
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu preparar a imagem.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format === "png" ? "image/png" : "image/jpeg", quality));
  if (!blob) throw new Error("Não foi possível preparar a imagem.");
  if (blob.size > 5 * 1024 * 1024) throw new Error("Mesmo reduzida, a imagem passa de 5 MB. Escolha outra.");
  return blob;
}
