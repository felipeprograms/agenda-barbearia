import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { APP_URL } from "@/lib/config";
import { exchangeCode, oauthConfigured, readState, saveOAuthTokens } from "@/lib/mpOAuth";

export const dynamic = "force-dynamic";

/** Barbeiro sem login volta para o link de conexão dele; quem tem login volta para o painel. */
async function back(result: "ok" | "erro", barberId?: string | null) {
  if (barberId) {
    const { data } = await supabaseAdmin()
      .from("barbers")
      .select("user_id,connect_token")
      .eq("id", barberId)
      .maybeSingle();
    if (data && !data.user_id && data.connect_token) {
      return NextResponse.redirect(`${APP_URL}/conectar/${data.connect_token}?mp=${result}`);
    }
  }
  return NextResponse.redirect(`${APP_URL}/painel?mp=${result}`);
}

/** Volta do Mercado Pago depois que o barbeiro autoriza: troca o código pelo token e guarda no servidor. */
export async function GET(req: Request) {
  const limited = await rateLimit(req, LIMITS.mpCallback);
  if (limited) return limited;

  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const barberId = readState(state);

  if (!oauthConfigured() || !code || !barberId) return back("erro", barberId); // inclui o caso de recusar

  try {
    const tokens = await exchangeCode(code);
    await saveOAuthTokens(supabaseAdmin(), barberId, tokens);
    return back("ok", barberId);
  } catch (e) {
    console.error("callback MP:", e);
    return back("erro", barberId);
  }
}
