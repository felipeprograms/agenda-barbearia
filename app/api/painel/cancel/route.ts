import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { resolveBarberId } from "@/lib/barberAccess";
import { cancelBooking } from "@/lib/cancel";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST { bookingId } — barbeiro (ou dono) cancela e devolve o sinal. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.painelWrite);
  if (limited) return limited;
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  let bookingId = "";
  try {
    bookingId = String((await req.json()).bookingId ?? "");
  } catch {
    /* corpo inválido */
  }
  if (!UUID.test(bookingId)) return NextResponse.json({ error: "Inválido." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: b } = await admin.from("bookings").select("barber_id").eq("id", bookingId).maybeSingle();
  if (!b) return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
  // Só quem é o barbeiro ou dono da barbearia dele.
  if (!(await resolveBarberId(admin, user.id, b.barber_id as string))) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const r = await cancelBooking(bookingId, "barber");
  if (!r.ok) {
    return NextResponse.json({ error: r.message }, { status: r.code === "refund_failed" ? 502 : 409 });
  }
  return NextResponse.json({ ok: true, refunded: r.refunded });
}
