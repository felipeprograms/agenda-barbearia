import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { isShopOpen } from "@/lib/shopStatus";

export const dynamic = "force-dynamic";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36) || "barbeiro"
  );
}

/**
 * POST { barbers: [{ name, me? }] } — o dono cadastra um ou vários barbeiros da própria barbearia.
 *  - me = true: o barbeiro é o próprio dono (fica ligado ao login dele, uma vez só);
 *  - sem me: barbeiro sem login; ele conecta o Mercado Pago pelo link de conexão.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.painelWrite);
  if (limited) return limited;

  const user = await userFromRequest(req);
  if (!user) return fail(401, "Faça login novamente.");

  let list: { name: string; me: boolean }[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body.barbers)) {
      list = body.barbers.map((b: Record<string, unknown>) => ({
        name: String(b?.name ?? "").trim(),
        me: b?.me === true,
      }));
    }
  } catch {
    return fail(400, "Requisição inválida.");
  }
  if (list.length === 0 || list.length > 20) return fail(400, "Informe de 1 a 20 barbeiros.");
  if (list.some((b) => b.name.length < 2 || b.name.length > 80)) return fail(400, "Cada barbeiro precisa de um nome (2 a 80 letras).");
  if (list.filter((b) => b.me).length > 1) return fail(400, "Só um barbeiro pode ser você.");

  const admin = supabaseAdmin();
  const { data: shop } = await admin
    .from("shops")
    .select("id,status,paid_until")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!shop) return fail(403, "Só o dono da barbearia pode cadastrar barbeiros.");
  if (!isShopOpen(shop.status, shop.paid_until)) {
    return fail(403, "Sua barbearia ainda não foi liberada ou está com a mensalidade vencida.");
  }

  if (list.some((b) => b.me)) {
    const { data: mine } = await admin.from("barbers").select("id").eq("user_id", user.id).maybeSingle();
    if (mine) return fail(409, "Você já está cadastrado como barbeiro.");
  }

  const { data: existing } = await admin.from("barbers").select("slug").eq("shop_id", shop.id);
  const used = new Set((existing ?? []).map((b) => b.slug as string));

  let created = 0;
  for (const b of list) {
    const base = slugify(b.name);
    let slug = base;
    for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;
    used.add(slug);

    const { error } = await admin
      .from("barbers")
      .insert({ shop_id: shop.id, user_id: b.me ? user.id : null, name: b.name, slug });
    if (error) {
      console.error("criar barbeiro (dono):", error);
      return fail(500, created > 0 ? `Foram salvos ${created}, mas houve erro em "${b.name}". Tente de novo.` : "Não foi possível salvar.");
    }
    created += 1;
  }

  return NextResponse.json({ ok: true, created });
}
