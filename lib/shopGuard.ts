import type { SupabaseClient } from "@supabase/supabase-js";
import { isShopOpen } from "./shopStatus";

export async function barberShopIsOpen(admin: SupabaseClient, barberId: string): Promise<boolean> {
  const { data } = await admin.from("barbers").select("shops(status,paid_until)").eq("id", barberId).maybeSingle();
  const raw = (data as { shops?: unknown } | null)?.shops;
  const shop = (Array.isArray(raw) ? raw[0] : raw) as { status: string; paid_until: string | null } | undefined;
  return !!shop && isShopOpen(shop.status, shop.paid_until);
}
