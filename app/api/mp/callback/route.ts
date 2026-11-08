import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { APP_URL } from "@/lib/config";
import { exchangeCode, oauthConfigured, readState, saveOAuthTokens } from "@/lib/mpOAuth";

export const dynamic = "force-dynamic";

function back(result: "ok" | "erro") {
  return NextResponse.redirect(`${APP_URL}/painel?mp=${result}`);
}

/** Volta do Mercado Pago depois que o barbeiro autoriza: troca o código pelo token e guarda no servidor. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";

  if (!oauthConfigured() || !code) return back("erro"); // inclui o caso de o barbeiro ter recusado
  const barberId = readState(state);
  if (!barberId) return back("erro");

  try {
    const tokens = await exchangeCode(code);
    await saveOAuthTokens(supabaseAdmin(), barberId, tokens);
    return back("ok");
  } catch (e) {
    console.error("callback MP:", e);
    return back("erro");
  }
}
