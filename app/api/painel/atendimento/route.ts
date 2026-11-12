import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { resolveBarberId } from "@/lib/barberAccess";
import { sendPushToBooking } from "@/lib/push";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EARLY_MARGIN_MS = 5 * 60_000;
const NEXT_WINDOW_MS = 3 * 3600_000;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function hhmm(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" }).format(new Date(iso));
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.painelWrite);
  if (limited) return limited;
  const user = await userFromRequest(req);
  if (!user) return fail(401, "Faça login novamente.");

  const body = await req.json().catch(() => ({}));
  const bookingId = String(body.bookingId ?? "");
  const action = String(body.action ?? "");
  if (!UUID.test(bookingId) || (action !== "start" && action !== "finish")) return fail(400, "Inválido.");

  const admin = supabaseAdmin();
  const { data: b } = await admin
    .from("bookings")
    .select("id,barber_id,status,starts_at,ends_at,started_at,finished_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return fail(404, "Agendamento não encontrado.");
  if (!(await resolveBarberId(admin, user.id, b.barber_id as string))) return fail(403, "Sem permissão.");
  if (b.status !== "confirmed") return fail(409, "Este agendamento não está confirmado.");
  if (b.finished_at) return fail(409, "Este atendimento já foi finalizado.");

  const now = Date.now();
  const startsAt = new Date(b.starts_at as string).getTime();
  const endsAt = new Date(b.ends_at as string).getTime();

  if (action === "start") {
    if (b.started_at) return NextResponse.json({ ok: true });
    if (now < startsAt - 60 * 60_000) return fail(409, "Só dá para iniciar até 1 hora antes do horário.");
    if (now > endsAt + 6 * 3600_000) return fail(409, "Este horário já passou.");
    const { error } = await admin.from("bookings").update({ started_at: new Date(now).toISOString() }).eq("id", bookingId);
    if (error) {
      console.error("atendimento start:", error);
      return fail(500, "Não foi possível iniciar. Confira se você rodou o arquivo migracao-novidades.sql.");
    }
    return NextResponse.json({ ok: true });
  }

  const patch: { finished_at: string; started_at?: string } = { finished_at: new Date(now).toISOString() };
  if (!b.started_at) patch.started_at = patch.finished_at;
  const { error } = await admin.from("bookings").update(patch).eq("id", bookingId);
  if (error) {
    console.error("atendimento finish:", error);
    return fail(500, "Não foi possível finalizar. Confira se você rodou o arquivo migracao-novidades.sql.");
  }

  const early = now < endsAt - EARLY_MARGIN_MS;
  if (!early) return NextResponse.json({ ok: true, early: false });

  const { data: next } = await admin
    .from("bookings")
    .select("id,customer_name,customer_phone,starts_at")
    .eq("barber_id", b.barber_id)
    .eq("status", "confirmed")
    .is("started_at", null)
    .gte("starts_at", new Date(endsAt).toISOString())
    .lte("starts_at", new Date(endsAt + NEXT_WINDOW_MS).toISOString())
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  if (!next) return NextResponse.json({ ok: true, early: true, next: null });

  const when = hhmm(next.starts_at as string);
  const pushSent = await sendPushToBooking(admin, next.id as string, {
    title: "Pode vir mais cedo! ✂️",
    body: `O barbeiro já está livre. Seu horário é às ${when}. Se quiser, pode chegar agora.`,
    tag: `cedo-${next.id}`,
  });

  const digits = String(next.customer_phone ?? "").replace(/\D/g, "");
  const phone = digits.length <= 11 ? `55${digits}` : digits;
  const text = `Oi, ${String(next.customer_name).split(" ")[0]}! Terminei o atendimento antes do previsto. Seu horário é às ${when}, mas se quiser pode vir agora.`;
  return NextResponse.json({
    ok: true,
    early: true,
    next: {
      name: next.customer_name,
      when,
      pushSent,
      whatsappUrl: digits ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : null,
    },
  });
}
