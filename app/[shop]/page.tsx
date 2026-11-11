import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopPageView from "@/components/shop/ShopPageView";
import { loadPublicShop } from "@/lib/shopData";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ shop: string }> }): Promise<Metadata> {
  const { shop: shopSlug } = await params;
  const shop = await loadPublicShop(shopSlug);
  if (!shop) return {};
  return { title: shop.name, manifest: `/${shopSlug}/manifest.webmanifest`, appleWebApp: { capable: true, title: shop.name, statusBarStyle: "black-translucent" } };
}

export default async function ShopPage({ params }: { params: Promise<{ shop: string }> }) {
  const { shop: shopSlug } = await params;
  const shop = await loadPublicShop(shopSlug);
  if (!shop) notFound();
  return <ShopPageView shop={shop} />;
}
