import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizationUrl, makeState, oauthConfigured } from "@/lib/mpOAuth";

export const dynamic = "force-dynamic";

/** POST { token } — o barbeiro sem login (link de conexão) pede o endereço de autorização do Mercado Pago. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.json({ error: "Link inválido." }, { status: 400 });

  if (!oauthConfigured()) {
    return NextResponse.json(
      { error: "A conexão com o Mercado Pago ainda não foi ativada neste sistema. Fale com o dono da barbearia." },
      { status: 501 },
    );
  }

  const { data: barber } = await supabaseAdmin()
    .from("barbers")
    .select("id")
    .eq("connect_token", token)
    .is("user_id", null)
    .maybeSingle();
  if (!barber) return NextResponse.json({ error: "Link inválido ou já substituído." }, { status: 404 });

  return NextResponse.json({ url: authorizationUrl(makeState(barber.id as string)) });
}
