import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { authorizationUrl, makeState, oauthConfigured } from "@/lib/mpOAuth";

export const dynamic = "force-dynamic";

/** POST — devolve o endereço do Mercado Pago onde o barbeiro entra e autoriza a conexão. */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  if (!oauthConfigured()) {
    return NextResponse.json(
      { error: "A conexão com um clique ainda não foi ativada neste sistema. Use a opção de colar o token." },
      { status: 501 },
    );
  }

  const { data: barber } = await supabaseAdmin().from("barbers").select("id").eq("user_id", user.id).maybeSingle();
  if (!barber) return NextResponse.json({ error: "Cadastro de barbeiro não encontrado." }, { status: 404 });

  return NextResponse.json({ url: authorizationUrl(makeState(barber.id)) });
}
