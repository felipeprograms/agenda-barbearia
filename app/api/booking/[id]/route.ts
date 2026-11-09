import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { settleBooking } from "@/lib/settle";
import { formatDateTimeBR } from "@/lib/time";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/booking/<id>
 *   -> { status, serviceName, barberName, when, amountCents, priceCents }
 * A tela do cliente consulta isto a cada poucos segundos. Se ainda está pendente, conferimos o
 * pagamento direto no Mercado Pago (funciona mesmo se o webhook atrasar).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(_req, LIMITS.bookingStatus);
  if (limited) return limited;

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Inválido." }, { status: 400 });

  let status = await settleBooking(id);
  if (status === "not_found") return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { data } = await supabaseAdmin()
    .from("bookings")
    .select("service_name,starts_at,amount_cents,price_cents,hold_expires_at,barbers(name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  if (status === "pending" && new Date(data.hold_expires_at).getTime() < Date.now()) status = "expired";

  const barber = data.barbers as unknown as { name: string } | { name: string }[] | null;
  const barberName = Array.isArray(barber) ? barber[0]?.name : barber?.name;

  return NextResponse.json({
    status,
    serviceName: data.service_name,
    barberName: barberName ?? "",
    when: formatDateTimeBR(data.starts_at),
    amountCents: data.amount_cents,
    priceCents: data.price_cents,
  });
}
