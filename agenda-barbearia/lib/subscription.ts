import { supabaseAdmin } from "./supabaseAdmin";
import { findApprovedPayment, getPayment } from "./mercadopago";
import { addDays, todayLocal } from "./time";

export function platformToken(): string | null {
  return process.env.PLATFORM_MP_ACCESS_TOKEN?.trim() || null;
}

/**
 * Confere no Mercado Pago (conta da plataforma) se a mensalidade foi paga e, se foi, soma os dias
 * e libera a barbearia. Pode ser chamada pelo webhook e pela tela ao mesmo tempo: só uma vez vale.
 * Retorna true se o pagamento está confirmado.
 */
export async function settleSubscription(rowId: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data: row } = await admin.from("subscription_payments").select("*").eq("id", rowId).maybeSingle();
  if (!row) return false;
  if (row.status === "paid") return true;

  const token = platformToken();
  if (!token) return false;

  let paymentId: string | null = row.mp_payment_id;
  try {
    if (paymentId) {
      const p = await getPayment(token, paymentId);
      if (p.status !== "approved" || p.externalReference !== row.id || p.amount + 0.001 < row.amount_cents / 100) {
        return false;
      }
    } else {
      const found = await findApprovedPayment(token, row.id);
      if (!found || found.amount + 0.001 < row.amount_cents / 100) return false;
      paymentId = found.id;
    }
  } catch {
    return false;
  }

  // Marca como pago de forma atômica: só uma chamada consegue, então os dias são somados uma vez só.
  const { data: won } = await admin
    .from("subscription_payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), mp_payment_id: paymentId })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (!won) return true;

  const { data: shop } = await admin.from("shops").select("status,paid_until").eq("id", row.shop_id).maybeSingle();
  if (!shop) return true;

  const today = todayLocal();
  const base = shop.paid_until && shop.paid_until > today ? shop.paid_until : today;
  const patch: Record<string, unknown> = { paid_until: addDays(base, row.days), plan: row.plan };
  if (shop.status === "pending") {
    patch.status = "active"; // primeira mensalidade paga libera a barbearia
    patch.approved_at = new Date().toISOString();
  }
  await admin.from("shops").update(patch).eq("id", row.shop_id);
  return true;
}
