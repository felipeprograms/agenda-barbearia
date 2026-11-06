import { notFound } from "next/navigation";
import ShopPageView from "@/components/shop/ShopPageView";
import { loadPublicShop } from "@/lib/shopData";

export const dynamic = "force-dynamic";

/** Link direto de um barbeiro: /<barbearia>/<barbeiro>. Mesma página, já com ele selecionado. */
export default async function BarberPage({ params }: { params: Promise<{ shop: string; barber: string }> }) {
  const { shop: shopSlug, barber: barberSlug } = await params;
  const shop = await loadPublicShop(shopSlug, barberSlug);
  if (!shop) notFound();
  return <ShopPageView shop={shop} focusBarber />;
}
