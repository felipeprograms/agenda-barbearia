import { supabaseAdmin } from "./supabaseAdmin";
import { isShopOpen } from "./shopStatus";

export type PublicService = { id: string; name: string; price_cents: number; duration_min: number };
export type PublicBarber = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  deposit_percent: number;
  services: PublicService[];
};
export type PublicShop = {
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  instagram: string | null;
  hours_text: string | null;
  policies_text: string | null;
  cover_url: string | null;
  logo_url: string | null;
  gallery: string[];
  barbers: PublicBarber[];
};

type RawBarber = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  deposit_percent: number;
  services: (PublicService & { active: boolean })[] | null;
};

export async function loadPublicShop(shopSlug: string, barberSlug?: string): Promise<PublicShop | null> {
  const admin = supabaseAdmin();

  const { data: shop } = await admin
    .from("shops")
    .select("id,name,status,paid_until,tagline,about,address,lat,lng,phone,instagram,hours_text,policies_text,cover_url,logo_url,gallery")
    .eq("slug", shopSlug)
    .eq("active", true)
    .maybeSingle();
  if (!shop || !isShopOpen(shop.status, shop.paid_until)) return null;

  let query = admin
    .from("barbers")
    .select("id,name,slug,photo_url,deposit_percent,services(id,name,price_cents,duration_min,active)")
    .eq("shop_id", shop.id)
    .eq("active", true)
    .eq("mp_connected", true)
    .order("name");
  if (barberSlug) query = query.eq("slug", barberSlug);

  const { data } = await query;
  const barbers: PublicBarber[] = ((data ?? []) as RawBarber[])
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      photo_url: b.photo_url,
      deposit_percent: b.deposit_percent,
      services: (b.services ?? [])
        .filter((s) => s.active)
        .map((s) => ({ id: s.id, name: s.name, price_cents: s.price_cents, duration_min: s.duration_min })),
    }))
    .filter((b) => b.services.length > 0);

  if (barberSlug && barbers.length === 0) return null;
  return {
    slug: shopSlug,
    name: shop.name,
    tagline: shop.tagline ?? null,
    about: shop.about ?? null,
    address: shop.address ?? null,
    lat: typeof shop.lat === "number" ? shop.lat : null,
    lng: typeof shop.lng === "number" ? shop.lng : null,
    phone: shop.phone ?? null,
    instagram: shop.instagram ?? null,
    hours_text: shop.hours_text ?? null,
    policies_text: shop.policies_text ?? null,
    cover_url: shop.cover_url ?? null,
    logo_url: shop.logo_url ?? null,
    gallery: Array.isArray(shop.gallery) ? (shop.gallery as string[]) : [],
    barbers,
  };
}
