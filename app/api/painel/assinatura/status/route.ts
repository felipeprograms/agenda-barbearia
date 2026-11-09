import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { settleSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/** POST { id } — confere se a mensalidade já foi paga (a tela chama de tempo em tempo). */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });
  const id = String((await req.json().catch(() => ({}))).id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Pagamento inválido." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: row } = await admin.from("subscription_payments").select("shop_id").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
  const { data: shop } = await admin.from("shops").select("id").eq("id", row.shop_id).eq("owner_user_id", user.id).maybeSingle();
  if (!shop) return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });

  return NextResponse.json({ paid: await settleSubscription(id) });
}
