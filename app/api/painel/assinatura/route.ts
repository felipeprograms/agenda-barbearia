import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userFromRequest } from "@/lib/authServer";
import { APP_URL } from "@/lib/config";
import { createCardCheckout, createPixPayment } from "@/lib/mercadopago";
import { MAX_INSTALLMENTS, PLANS, isPlanId, priceFor } from "@/lib/plans";
import { platformToken } from "@/lib/subscription";

export const dynamic = "force-dynamic";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST { plan: "mensal" | "anual", method: "pix" | "card" } — o dono paga a mensalidade da própria barbearia.
 * Pix: devolve { id, qrCode, qrCodeBase64 }. Cartão: devolve { id, url } (página segura do Mercado Pago).
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.painelPay);
  if (limited) return limited;

  const user = await userFromRequest(req);
  if (!user) return fail(401, "Faça login novamente.");

  const body = await req.json().catch(() => ({}));
  const planId: unknown = body.plan;
  if (!isPlanId(planId)) return fail(400, "Escolha um plano.");
  const method = body.method === "card" ? "card" : body.method === "pix" ? "pix" : null;
  if (!method) return fail(400, "Escolha a forma de pagamento.");

  const token = platformToken();
  if (!token) return fail(501, "O pagamento da mensalidade ainda não foi ativado neste sistema.");

  const admin = supabaseAdmin();
  const { data: shop } = await admin.from("shops").select("id,name,status").eq("owner_user_id", user.id).maybeSingle();
  if (!shop) return fail(403, "Só o dono da barbearia pode pagar a mensalidade.");
  if (shop.status === "suspended") return fail(403, "O acesso está suspenso. Fale com o administrador.");

  const plan = PLANS[planId];
  const amount = priceFor(planId, method);
  const { data: row, error } = await admin
    .from("subscription_payments")
    .insert({ shop_id: shop.id, plan: plan.id, method, amount_cents: amount, days: plan.days })
    .select("id")
    .single();
  if (error || !row) {
    console.error("assinatura insert:", error);
    return fail(500, "Não foi possível iniciar o pagamento.");
  }

  const notificationUrl = APP_URL.startsWith("https://") ? `${APP_URL}/api/webhook/assinatura?sub=${row.id}` : undefined;
  const title = `Mensalidade ${plan.name} - ${shop.name}`.slice(0, 120);

  try {
    if (method === "pix") {
      const pix = await createPixPayment(token, {
        bookingId: row.id,
        amountCents: amount,
        description: title,
        payerEmail: user.email ?? "pagador@example.com",
        payerName: shop.name,
        notificationUrl,
        expiresAt: new Date(Date.now() + 30 * 60_000),
      });
      await admin.from("subscription_payments").update({ mp_payment_id: pix.id }).eq("id", row.id);
      return NextResponse.json({ id: row.id, qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64 });
    }

    const url = await createCardCheckout(token, {
      bookingId: row.id,
      amountCents: amount,
      title,
      payerName: shop.name,
      payerEmail: user.email ?? undefined,
      notificationUrl,
      returnUrl: APP_URL.startsWith("https://") ? `${APP_URL}/painel?assinatura=${row.id}` : undefined,
      expiresAt: new Date(Date.now() + 24 * 3600_000),
      maxInstallments: MAX_INSTALLMENTS[planId],
    });
    return NextResponse.json({ id: row.id, url });
  } catch (e) {
    console.error("assinatura MP:", e);
    await admin.from("subscription_payments").delete().eq("id", row.id);
    return fail(502, "O Mercado Pago não aceitou o pagamento agora. Tente novamente em instantes.");
  }
}
