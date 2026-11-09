import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { resolveBarberId } from "@/lib/barberAccess";
import { authorizationUrl, makeState, oauthConfigured } from "@/lib/mpOAuth";

export const dynamic = "force-dynamic";

/** POST — devolve o endereço do Mercado Pago onde o barbeiro entra e autoriza a conexão. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  if (!oauthConfigured()) {
    return NextResponse.json(
      { error: "A conexão com um clique ainda não foi ativada neste sistema. Use a opção de colar o token." },
      { status: 501 },
    );
  }

  const barberId = await resolveBarberId(supabaseAdmin(), user.id, body.barberId ? String(body.barberId) : undefined);
  if (!barberId) return NextResponse.json({ error: "Cadastro de barbeiro não encontrado." }, { status: 404 });

  return NextResponse.json({ url: authorizationUrl(makeState(barberId)) });
}
