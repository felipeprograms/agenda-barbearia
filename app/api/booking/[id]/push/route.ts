import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DEVICES = 3;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, LIMITS.bookingPush);
  if (limited) return limited;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Inválido." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const sub = body.subscription ?? {};
  const endpoint = String(sub.endpoint ?? "");
  const p256dh = String(sub.keys?.p256dh ?? "");
  const auth = String(sub.keys?.auth ?? "");
  if (!/^https:\/\/[^\s]{10,990}$/.test(endpoint) || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ error: "Aparelho inválido." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: b } = await admin.from("bookings").select("status").eq("id", id).maybeSingle();
  if (!b || (b.status !== "confirmed" && b.status !== "pending")) {
    return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
  }

  const { data: mine } = await admin
    .from("booking_push_subscriptions")
    .select("id,endpoint")
    .eq("booking_id", id)
    .order("created_at", { ascending: true });
  const others = (mine ?? []).filter((m) => m.endpoint !== endpoint);
  const excess = others.length - (MAX_DEVICES - 1);
  if (excess > 0) {
    await admin.from("booking_push_subscriptions").delete().in("id", others.slice(0, excess).map((m) => m.id));
  }
  const { error } = await admin
    .from("booking_push_subscriptions")
    .upsert({ booking_id: id, endpoint, p256dh, auth }, { onConflict: "endpoint" });
  if (error) {
    console.error("booking push:", error);
    return NextResponse.json({ error: "Não foi possível ativar agora." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
