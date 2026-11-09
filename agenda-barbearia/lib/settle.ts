import { supabaseAdmin } from "./supabaseAdmin";
import { getBarberAccessToken } from "./mpOAuth";
import { findApprovedPayment, getPayment } from "./mercadopago";
import { sendTelegram } from "./telegram";
import { formatBRL, formatDateTimeBR } from "./time";

/**
 * Confere no Mercado Pago se o Pix do agendamento foi pago e, se foi, confirma o horário
 * e avisa o barbeiro. Pode ser chamada pelo webhook e pela tela do cliente ao mesmo tempo:
 * o banco garante que só uma das chamadas confirma (e notifica).
 *
 * Retorna o status final: pending | confirmed | expired | conflict | cancelled | not_found
 */
export async function settleBooking(bookingId: string): Promise<string> {
  const admin = supabaseAdmin();

  const { data: b } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return "not_found";
  if (b.status === "confirmed" || b.status === "cancelled" || b.status === "conflict") return b.status;

  const mpToken = await getBarberAccessToken(admin, b.barber_id);
  if (!mpToken) return b.status;

  let payment: { status: string; externalReference: string | null; amount: number };
  let paymentId: string | null = b.mp_payment_id;
  try {
    if (paymentId) {
      // Pix: já sabemos qual é o pagamento.
      payment = await getPayment(mpToken, paymentId);
    } else {
      // Cartão: o pagamento só existe depois que o cliente paga; procuramos pelo id do agendamento.
      const found = await findApprovedPayment(mpToken, b.id);
      if (!found) return b.status;
      payment = found;
      paymentId = found.id;
    }
  } catch {
    return b.status;
  }

  const paid =
    payment.status === "approved" &&
    payment.externalReference === b.id &&
    Math.round(payment.amount * 100) >= b.amount_cents;
  if (!paid) return b.status;

  if (!b.mp_payment_id && paymentId) {
    await admin.from("bookings").update({ mp_payment_id: paymentId }).eq("id", b.id);
  }

  const { data: result, error } = await admin.rpc("confirm_booking", { p_id: b.id });
  if (error) return b.status;

  if (result === "confirmed" || result === "conflict_new") {
    const { data: barber } = await admin
      .from("barbers")
      .select("telegram_chat_id")
      .eq("id", b.barber_id)
      .maybeSingle();

    if (barber?.telegram_chat_id) {
      const when = formatDateTimeBR(b.starts_at);
      const text =
        result === "confirmed"
          ? [
              "✂️ Novo agendamento confirmado!",
              `Cliente: ${b.customer_name}`,
              `WhatsApp: ${b.customer_phone}`,
              `Serviço: ${b.service_name}`,
              `Quando: ${when}`,
              `Pago agora: ${formatBRL(b.amount_cents)} de ${formatBRL(b.price_cents)}`,
            ].join("\n")
          : [
              "⚠️ Pagamento recebido, mas o horário já estava ocupado.",
              `Cliente: ${b.customer_name} (${b.customer_phone})`,
              `Horário pedido: ${when}`,
              `Valor: ${formatBRL(b.amount_cents)}`,
              `Devolva o Pix no Mercado Pago (pagamento ${paymentId}) ou combine outro horário com o cliente.`,
            ].join("\n");
      await sendTelegram(barber.telegram_chat_id, text);
    }
  }

  if (result === "confirmed" || result === "already") return "confirmed";
  if (result === "conflict_new" || result === "conflict") return "conflict";
  return b.status;
}
