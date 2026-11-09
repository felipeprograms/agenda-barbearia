import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { isShopOpen } from "@/lib/shopStatus";

export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9-]{2,40}$/;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST { name, slug, code? } — cria o cadastro de barbeiro do usuário logado.
 *  - com "code": entra na barbearia que gerou o convite;
 *  - sem "code": o dono da barbearia cria o próprio cadastro de barbeiro ("eu também atendo").
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.painelWrite);
  if (limited) return limited;

  const user = await userFromRequest(req);
  if (!user) return fail(401, "Faça login novamente.");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Requisição inválida.");
  }

  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const code = String(body.code ?? "").trim().toUpperCase();

  if (name.length < 2 || name.length > 80) return fail(400, "Informe seu nome.");
  if (!SLUG.test(slug)) return fail(400, "O apelido do link deve ter 2 a 40 letras minúsculas, números ou hífen.");

  const admin = supabaseAdmin();

  const { data: existing } = await admin.from("barbers").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) return fail(409, "Você já tem cadastro de barbeiro.");

  let shopId: string;
  let invitedByCode = false;

  if (code) {
    // Marca o convite como usado de forma atômica: só uma pessoa consegue usar cada código.
    const { data: invite } = await admin
      .from("invites")
      .update({ used_by: user.id })
      .eq("code", code)
      .is("used_by", null)
      .select("shop_id")
      .maybeSingle();
    if (!invite) return fail(400, "Código de convite inválido ou já utilizado.");
    shopId = invite.shop_id;
    invitedByCode = true;
    const { data: invShop } = await admin.from("shops").select("status,paid_until").eq("id", shopId).maybeSingle();
    if (!invShop || !isShopOpen(invShop.status, invShop.paid_until)) {
      await admin.from("invites").update({ used_by: null }).eq("code", code);
      return fail(403, "Esta barbearia ainda não foi liberada ou está com a mensalidade vencida. Fale com o dono.");
    }
  } else {
    const { data: shop } = await admin
      .from("shops")
      .select("id,status,paid_until")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (!shop) return fail(400, "Informe o código de convite da barbearia.");
    if (!isShopOpen(shop.status, shop.paid_until)) {
      return fail(403, "Sua barbearia ainda não foi liberada. Assim que o administrador liberar, você poderá criar seu cadastro de barbeiro.");
    }
    shopId = shop.id;
  }

  const { data: barber, error } = await admin
    .from("barbers")
    .insert({ shop_id: shopId, user_id: user.id, name, slug })
    .select("id")
    .single();

  if (error || !barber) {
    if (invitedByCode) await admin.from("invites").update({ used_by: null }).eq("code", code);
    if (error?.code === "23505") return fail(409, "Já existe um barbeiro com esse apelido nessa barbearia. Escolha outro.");
    console.error("criar barbeiro:", error);
    return fail(500, "Não foi possível criar o cadastro.");
  }

  return NextResponse.json({ ok: true, barberId: barber.id });
}
