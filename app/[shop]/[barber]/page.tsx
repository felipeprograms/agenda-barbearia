import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopPageView from "@/components/shop/ShopPageView";
import { loadPublicShop } from "@/lib/shopData";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ shop: string; barber: string }> }): Promise<Metadata> {
  const { shop: shopSlug, barber: barberSlug } = await params;
  const shop = await loadPublicShop(shopSlug, barberSlug);
  if (!shop) return {};
  return { title: shop.name, manifest: `/${shopSlug}/manifest.webmanifest`, appleWebApp: { capable: true, title: shop.name, statusBarStyle: "black-translucent" } };
}

export default async function BarberPage({ params }: { params: Promise<{ shop: string; barber: string }> }) {
  const { shop: shopSlug, barber: barberSlug } = await params;
  const shop = await loadPublicShop(shopSlug, barberSlug);
  if (!shop) notFound();
  return <ShopPageView shop={shop} focusBarber />;
}
