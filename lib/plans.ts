/** Planos vendidos pelo sistema. Para mudar preços, altere só este arquivo. */
export const MONTHLY_CENTS = 3990; // R$ 39,90 por mês
export const ANNUAL_DISCOUNT = 0.1; // 10% de desconto no plano anual

const ANNUAL_FULL = MONTHLY_CENTS * 12; // 47880 = R$ 478,80 sem desconto
const ANNUAL_TOTAL = Math.round(ANNUAL_FULL * (1 - ANNUAL_DISCOUNT)); // 43092 = R$ 430,92

export type PlanId = "mensal" | "anual";

export const PLANS: Record<PlanId, { id: PlanId; name: string; cents: number; fullCents?: number; days: number; perMonthCents: number }> = {
  mensal: { id: "mensal", name: "Mensal", cents: MONTHLY_CENTS, days: 30, perMonthCents: MONTHLY_CENTS },
  anual: {
    id: "anual",
    name: "Anual",
    cents: ANNUAL_TOTAL,
    fullCents: ANNUAL_FULL,
    days: 365,
    perMonthCents: Math.round(ANNUAL_TOTAL / 12), // 3591 = R$ 35,91
  },
};

export function isPlanId(v: unknown): v is PlanId {
  return v === "mensal" || v === "anual";
}

export const PLAN_LABEL: Record<string, string> = { teste: "Teste", mensal: "Mensal", anual: "Anual" };

/**
 * Acréscimo (em %) cobrado a mais de quem paga no cartão, para repassar a taxa do Mercado Pago.
 * 0 = mesmo preço no Pix e no cartão (você absorve a taxa). Exemplo: 5 => cartão 5% mais caro.
 */
export const CARD_EXTRA_PERCENT = 0;

export function priceFor(plan: PlanId, method: "pix" | "card"): number {
  const base = PLANS[plan].cents;
  return method === "card" ? Math.round(base * (1 + CARD_EXTRA_PERCENT / 100)) : base;
}
