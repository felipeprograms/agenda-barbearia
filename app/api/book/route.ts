import { NextResponse } from "next/server";
import { getBarberAccessToken } from "@/lib/mpOAuth";
import { barberShopIsOpen } from "@/lib/shopGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAvailableSlots } from "@/lib/availability";
import { createCardCheckout, createPixPayment } from "@/lib/mercadopago";
import { APP_URL, HOLD_MINUTES } from "@/lib/config";
import { formatDateTimeBR, localToDate, timeToMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST /api/book
 * Reserva o horário por HOLD_MINUTES minutos e gera o Pix na conta do barbeiro.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Requisição inválida.");
  }

  const barberId = String(body.barberId ?? "");
  const serviceId = String(body.serviceId ?? "");
  const date = String(body.date ?? "");
  const time = String(body.time ?? "");
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  const email = String(body.email ?? "").trim();
  const method = body.method === "card" ? "card" : "pix";

  if (!UUID.test(barberId) || !UUID.test(serviceId)) return fail(400, "Dados inválidos.");
  if (!/^\d{2}:\d{2}$/.test(time)) return fail(400, "Horário inválido.");
  if (name.length < 2 || name.length > 80) return fail(400, "Informe seu nome.");
  if (phone.length < 10 || phone.length > 13) return fail(400, "Informe um WhatsApp válido, com DDD.");
  if (email && !EMAIL.test(email)) return fail(400, "E-mail inválido.");

  const admin = supabaseAdmin();

  const { data: barber } = await admin
    .from("barbers")
    .select("id,name,mp_connected")
    .eq("id", barberId)
    .eq("active", true)
    .maybeSingle();
  if (!barber) return fail(404, "Barbeiro não encontrado.");
  if (!barber.mp_connected) return fail(409, "Este barbeiro ainda não ativou o pagamento online.");
  if (!(await barberShopIsOpen(admin, barberId))) return fail(409, "Esta barbearia não está recebendo agendamentos no momento.");

  const { data: service } = await admin
    .from("services")
    .select("id,name,duration_min")
    .eq("id", serviceId)
    .eq("barber_id", barberId)
    .eq("active", true)
    .maybeSingle();
  if (!service) return fail(404, "Serviço não encontrado.");

  // O horário precisa estar de fato livre (recalculado no servidor, não confiamos no navegador).
  const free = await getAvailableSlots(admin, barberId, date, service.duration_min);
  if (!free.includes(time)) return fail(409, "Esse horário acabou de ser ocupado. Escolha outro.");

  // Evita que uma pessoa segure vários horários sem pagar.
  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("barber_id", barberId)
    .eq("customer_phone", phone)
    .eq("status", "pending")
    .gt("hold_expires_at", new Date().toISOString());
  if ((count ?? 0) >= 2) {
    return fail(429, "Você já tem reservas aguardando pagamento. Pague uma delas ou aguarde alguns minutos.");
  }

  const startsAt = localToDate(date, timeToMinutes(time));

  const { data: booking, error: bookError } = await admin.rpc("create_booking", {
    p_barber: barberId,
    p_service: serviceId,
    p_name: name,
    p_phone: phone,
    p_email: email,
    p_start: startsAt.toISOString(),
    p_hold_minutes: HOLD_MINUTES,
  });
  if (bookError || !booking) {
    if (bookError?.message?.includes("slot_taken")) {
      return fail(409, "Esse horário acabou de ser ocupado. Escolha outro.");
    }
    if (bookError?.message?.includes("barber_not_found")) {
      return fail(404, "Barbeiro indisponível no momento.");
    }
    console.error("create_booking:", bookError);
    return fail(500, "Não foi possível reservar o horário.");
  }

  const mpToken = await getBarberAccessToken(admin, barberId);
  if (!mpToken) {
    await admin.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    return fail(409, "Este barbeiro ainda não ativou o pagamento online.");
  }

  const notificationUrl = APP_URL.startsWith("https://")
    ? `${APP_URL}/api/webhook/mercadopago?booking=${booking.id}`
    : undefined;

  if (method === "card") {
    try {
      const checkoutUrl = await createCardCheckout(mpToken, {
        bookingId: booking.id,
        amountCents: booking.amount_cents,
        title: `${service.name} com ${barber.name}`,
        payerName: name,
        payerEmail: email || undefined,
        notificationUrl,
        // O Mercado Pago só aceita endereço de retorno em https.
        returnUrl: APP_URL.startsWith("https://") ? `${APP_URL}/pagamento/${booking.id}` : undefined,
        expiresAt: new Date(Date.now() + 30 * 60_000),
      });
      return NextResponse.json({ bookingId: booking.id, checkoutUrl });
    } catch (e) {
      console.error("cartao:", e);
      await admin.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
      return fail(502, "Não foi possível abrir o pagamento por cartão agora. Tente o Pix ou fale com o barbeiro.");
    }
  }

  try {
    const pix = await createPixPayment(mpToken, {
      bookingId: booking.id,
      amountCents: booking.amount_cents,
      description: `${service.name} com ${barber.name}`,
      payerEmail: email || process.env.FALLBACK_PAYER_EMAIL || "cliente@email.com",
      payerName: name,
      notificationUrl,
      // O Pix vale por mais tempo que a reserva; pagamento tardio é tratado em confirm_booking.
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });

    const { error: updError } = await admin
      .from("bookings")
      .update({ mp_payment_id: pix.id })
      .eq("id", booking.id);
    if (updError) console.error("salvar mp_payment_id:", updError);

    return NextResponse.json({
      bookingId: booking.id,
      amountCents: booking.amount_cents,
      priceCents: booking.price_cents,
      serviceName: service.name,
      when: formatDateTimeBR(startsAt),
      holdExpiresAt: booking.hold_expires_at,
      qrCode: pix.qrCode,
      qrCodeBase64: pix.qrCodeBase64,
    });
  } catch (e) {
    console.error("pix:", e);
    await admin.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    return fail(502, "Não foi possível gerar o Pix agora. Tente novamente ou fale com o barbeiro.");
  }
}
