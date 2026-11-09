import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { checkAccessToken } from "@/lib/mercadopago";
import { resolveBarberId } from "@/lib/barberAccess";

export const dynamic = "force-dynamic";

/** POST { token, barberId? } — cola o Access Token do Mercado Pago do barbeiro (o dono pode informar barberId). */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  let token = "";
  let barberIdIn: string | undefined;
  try {
    const body = await req.json();
    token = String(body.token ?? "").trim();
    barberIdIn = body.barberId ? String(body.barberId) : undefined;
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
  const barberId = await resolveBarberId(admin, user.id, barberIdIn);
  if (!barberId) return NextResponse.json({ error: "Cadastro de barbeiro não encontrado." }, { status: 404 });
  const barber = { id: barberId };

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
