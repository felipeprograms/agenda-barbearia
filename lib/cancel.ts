import { supabaseAdmin } from "./supabaseAdmin";
import { getBarberAccessToken } from "./mpOAuth";
import { refundPayment } from "./mercadopago";
import { sendTelegram } from "./telegram";
import { CANCEL_MIN_HOURS } from "./config";
import { formatBRL, formatDateTimeBR } from "./time";

export type CancelResult =
  | { ok: true; refunded: boolean }
  | { ok: false; code: "not_found" | "not_allowed" | "too_late" | "refund_failed"; message: string };

/**
 * Cancela um agendamento e devolve o sinal pago.
 *  - by "customer": só agendamento confirmado e com pelo menos CANCEL_MIN_HOURS de antecedência;
 *  - by "barber": barbeiro/dono cancela a qualquer momento (inclusive pagamentos em conflito).
 * Primeiro devolve o dinheiro; só então libera o horário. Se a devolução falhar, nada muda.
 */
export async function cancelBooking(bookingId: string, by: "customer" | "barber"): Promise<CancelResult> {
  const admin = supabaseAdmin();
  const { data: b } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { ok: false, code: "not_found", message: "Agendamento não encontrado." };

  const allowed = by === "barber" ? ["confirmed", "conflict"] : ["confirmed"];
  if (!allowed.includes(b.status)) {
    return { ok: false, code: "not_allowed", message: "Este agendamento não pode ser cancelado." };
  }
  if (by === "customer" && new Date(b.starts_at).getTime() - Date.now() < CANCEL_MIN_HOURS * 3600_000) {
    return {
      ok: false,
      code: "too_late",
      message: `O cancelamento online vai até ${CANCEL_MIN_HOURS} horas antes do horário. Fale com a barbearia.`,
    };
  }

  let refunded = false;
  if (b.mp_payment_id && b.amount_cents > 0) {
    const token = await getBarberAccessToken(admin, b.barber_id);
    if (!token) {
      return { ok: false, code: "refund_failed", message: "Mercado Pago do barbeiro desconectado. Devolva o valor pelo app do Mercado Pago." };
    }
    try {
      await refundPayment(token, b.mp_payment_id, `refund-${b.id}`);
      refunded = true;
    } catch (e) {
      console.error("refund:", e);
      return { ok: false, code: "refund_failed", message: "Não foi possível devolver o valor agora. Tente de novo em instantes." };
    }
  }

  const { error } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", b.id)
    .in("status", allowed);
  if (error) return { ok: false, code: "not_allowed", message: "Não foi possível cancelar. Tente de novo." };

  if (by === "customer") {
    const { data: barber } = await admin.from("barbers").select("telegram_chat_id").eq("id", b.barber_id).maybeSingle();
    if (barber?.telegram_chat_id) {
      await sendTelegram(
        barber.telegram_chat_id,
        `❌ Cancelado pelo cliente: ${b.customer_name} · ${b.service_name} · ${formatDateTimeBR(b.starts_at)}.` +
          (refunded ? ` Sinal de ${formatBRL(b.amount_cents)} devolvido.` : ""),
      );
    }
  }
  return { ok: true, refunded };
}
