import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

const MAX_DEVICES = 8;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.painelWrite);
  if (limited) return limited;
  const user = await userFromRequest(req);
  if (!user) return fail(401, "Faça login novamente.");

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const admin = supabaseAdmin();

  if (action === "subscribe") {
    const sub = body.subscription ?? {};
    const endpoint = String(sub.endpoint ?? "");
    const p256dh = String(sub.keys?.p256dh ?? "");
    const auth = String(sub.keys?.auth ?? "");
    if (!/^https:\/\/[^\s]{10,990}$/.test(endpoint) || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
      return fail(400, "Aparelho inválido.");
    }

    const { data: mine } = await admin
      .from("push_subscriptions")
      .select("id,endpoint")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const others = (mine ?? []).filter((m) => m.endpoint !== endpoint);
    const excess = others.length - (MAX_DEVICES - 1);
    if (excess > 0) {
      await admin.from("push_subscriptions").delete().in("id", others.slice(0, excess).map((m) => m.id));
    }
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) || null,
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      console.error("push subscribe:", error);
      return fail(500, "Não foi possível ativar os avisos. Confira se rodou o migracao-push.sql.");
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "unsubscribe") {
    const endpoint = String(body.endpoint ?? "");
    await admin.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
    return NextResponse.json({ ok: true });
  }

  if (action === "test") {
    const sent = await sendPushToUsers(admin, [user.id], {
      title: "Avisos ativados ✂️",
      body: "Tudo certo! Os novos agendamentos vão aparecer aqui.",
      tag: "teste",
    });
    if (sent === 0) return fail(409, "Nenhum aparelho recebeu. Ative os avisos de novo neste celular.");
    return NextResponse.json({ ok: true, sent });
  }

  return fail(400, "Ação desconhecida.");
}
