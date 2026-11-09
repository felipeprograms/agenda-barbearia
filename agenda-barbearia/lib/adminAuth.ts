import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdmin";
import { userFromRequest } from "./authServer";

/** Devolve o usuário logado somente se ele estiver na lista de administradores da plataforma. */
export async function adminFromRequest(req: Request): Promise<User | null> {
  const user = await userFromRequest(req);
  if (!user) return null;
  const { data } = await supabaseAdmin().from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? user : null;
}
