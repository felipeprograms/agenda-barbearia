import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { loadPublicShop } from "@/lib/shopData";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ shop: string }> }) {
  const limited = await rateLimit(req, LIMITS.slots);
  if (limited) return limited;

  const { shop: slug } = await params;
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const shop = await loadPublicShop(slug);
  if (!shop) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const manifest = {
    name: shop.name,
    short_name: shop.name.length > 14 ? shop.name.slice(0, 14) : shop.name,
    description: `Agende seu horário na ${shop.name}.`,
    lang: "pt-BR",
    start_url: `/${slug}`,
    scope: `/${slug}`,
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    icons: [
      { src: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png?v=3", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new NextResponse(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
