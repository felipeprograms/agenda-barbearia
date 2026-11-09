import { notFound } from "next/navigation";
import ShopPageView from "@/components/shop/ShopPageView";
import { loadPublicShop } from "@/lib/shopData";

export const dynamic = "force-dynamic";

/** Página pública da barbearia: /<barbearia>. O cliente vê a vitrine e agenda. */
export default async function ShopPage({ params }: { params: Promise<{ shop: string }> }) {
  const { shop: shopSlug } = await params;
  const shop = await loadPublicShop(shopSlug);
  if (!shop) notFound();
  return <ShopPageView shop={shop} />;
}
