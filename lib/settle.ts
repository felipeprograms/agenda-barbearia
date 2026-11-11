import { supabaseAdmin } from "./supabaseAdmin";
import { getBarberAccessToken } from "./mpOAuth";
import { findApprovedPayment, getPayment } from "./mercadopago";
import { sendTelegram } from "./telegram";
import { sendPushForBarber } from "./push";
import { formatBRL, formatDateTimeBR } from "./time";

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

      payment = await getPayment(mpToken, paymentId);
    } else {

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

    await sendPushForBarber(
      admin,
      b.barber_id,
      result === "confirmed"
        ? {
            title: "Novo agendamento ✂️",
            body: `${b.customer_name} · ${b.service_name} · ${formatDateTimeBR(b.starts_at)}`,
            tag: `bk-${b.id}`,
          }
        : {
            title: "Pagamento recebido, horário ocupado ⚠️",
            body: `${b.customer_name} pagou ${formatBRL(b.amount_cents)} mas o horário já estava ocupado. Devolva o valor.`,
            tag: `bk-${b.id}`,
          },
    );
  }

  if (result === "confirmed" || result === "already") return "confirmed";
  if (result === "conflict_new" || result === "conflict") return "conflict";
  return b.status;
}
