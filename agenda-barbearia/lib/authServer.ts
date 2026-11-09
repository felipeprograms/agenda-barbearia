import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdmin";

/** Descobre quem é o usuário logado a partir do header "Authorization: Bearer <jwt>". */
export async function userFromRequest(req: Request): Promise<User | null> {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user;
}
