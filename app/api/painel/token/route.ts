import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { checkAccessToken } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

/** POST { token } — o barbeiro cola o Access Token do próprio Mercado Pago. */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  let token = "";
  try {
    token = String((await req.json()).token ?? "").trim();
  } catch {
    /* corpo inválido */
  }
  if (token.length < 20 || token.length > 300) {
    return NextResponse.json({ error: "Token inválido." }, { status: 400 });
  }

  if (!(await checkAccessToken(token))) {
    return NextResponse.json(
      { error: "O Mercado Pago não aceitou esse token. Confira se copiou inteiro." },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();
  const { data: barber } = await admin.from("barbers").select("id").eq("user_id", user.id).maybeSingle();
  if (!barber) return NextResponse.json({ error: "Cadastro de barbeiro não encontrado." }, { status: 404 });

  const { error: secretError } = await admin
    .from("barber_secrets")
    .upsert({ barber_id: barber.id, mp_access_token: token });
  if (secretError) {
    console.error("barber_secrets:", secretError);
    return NextResponse.json({ error: "Não foi possível salvar o token." }, { status: 500 });
  }

  await admin.from("barbers").update({ mp_connected: true }).eq("id", barber.id);
  return NextResponse.json({ ok: true });
}
