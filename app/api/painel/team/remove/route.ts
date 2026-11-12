import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.painelWrite);
  if (limited) return limited;
  const user = await userFromRequest(req);
  if (!user) return fail(401, "Faça login novamente.");

  let barberId = "";
  try {
    barberId = String((await req.json()).barberId ?? "");
  } catch {

  }
  if (!UUID.test(barberId)) return fail(400, "Barbeiro inválido.");

  const admin = supabaseAdmin();
  const { data: shop } = await admin.from("shops").select("id").eq("owner_user_id", user.id).maybeSingle();
  if (!shop) return fail(403, "Só o dono da barbearia pode remover barbeiros.");

  const { data: barber } = await admin.from("barbers").select("id,shop_id,name").eq("id", barberId).maybeSingle();
  if (!barber || barber.shop_id !== shop.id) return fail(404, "Barbeiro não encontrado.");

  const nowIso = new Date().toISOString();
  const [{ count: openConfirmed }, { count: openPending }, { count: total }] = await Promise.all([
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("barber_id", barberId)
      .in("status", ["confirmed", "conflict"])
      .gte("ends_at", nowIso),
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("barber_id", barberId)
      .eq("status", "pending")
      .gt("hold_expires_at", nowIso),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("barber_id", barberId),
  ]);

  const open = (openConfirmed ?? 0) + (openPending ?? 0);
  if (open > 0) {
    return fail(
      409,
      `${barber.name} tem ${open} agendamento(s) em aberto. Cancele (e devolva o sinal) na lista de agendamentos antes de remover.`,
    );
  }

  if ((total ?? 0) === 0) {
    const { error } = await admin.from("barbers").delete().eq("id", barberId);
    if (error) {
      console.error("apagar barbeiro:", error);
      return fail(500, "Não foi possível remover agora.");
    }
    return NextResponse.json({ ok: true, mode: "deleted" });
  }

  const { error } = await admin
    .from("barbers")
    .update({
      archived_at: nowIso,
      active: false,
      user_id: null,
      telegram_chat_id: null,
      connect_token: randomBytes(16).toString("hex"),
      telegram_code: randomBytes(8).toString("hex"),
    })
    .eq("id", barberId);
  if (error) {
    console.error("arquivar barbeiro:", error);
    return fail(500, "Não foi possível remover agora. Confira se rodou o migracao-novidades.sql.");
  }
  return NextResponse.json({ ok: true, mode: "archived" });
}
