import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Descobre qual barbeiro o usuário logado está mexendo (uso só no servidor).
 *  - sem barberId: o próprio cadastro de barbeiro do usuário;
 *  - com barberId: só vale se o barbeiro for da barbearia do próprio usuário (dono).
 */
export async function resolveBarberId(
  admin: SupabaseClient,
  userId: string,
  barberId?: string,
): Promise<string | null> {
  if (!barberId) {
    const { data } = await admin.from("barbers").select("id").eq("user_id", userId).maybeSingle();
    return (data?.id as string | undefined) ?? null;
  }
  const { data: b } = await admin.from("barbers").select("id,user_id,shop_id").eq("id", barberId).maybeSingle();
  if (!b) return null;
  if (b.user_id === userId) return b.id as string;
  const { data: shop } = await admin
    .from("shops")
    .select("id")
    .eq("id", b.shop_id)
    .eq("owner_user_id", userId)
    .maybeSingle();
  return shop ? (b.id as string) : null;
}
