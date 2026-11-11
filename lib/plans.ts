export const MONTHLY_CENTS = 3990;
export const ANNUAL_DISCOUNT = 0.1;

const ANNUAL_FULL = MONTHLY_CENTS * 12;
const ANNUAL_TOTAL = Math.round(ANNUAL_FULL * (1 - ANNUAL_DISCOUNT));

export type PlanId = "mensal" | "anual";

export const PLANS: Record<PlanId, { id: PlanId; name: string; cents: number; fullCents?: number; days: number; perMonthCents: number }> = {
  mensal: { id: "mensal", name: "Mensal", cents: MONTHLY_CENTS, days: 30, perMonthCents: MONTHLY_CENTS },
  anual: {
    id: "anual",
    name: "Anual",
    cents: ANNUAL_TOTAL,
    fullCents: ANNUAL_FULL,
    days: 365,
    perMonthCents: Math.round(ANNUAL_TOTAL / 12),
  },
};

export function isPlanId(v: unknown): v is PlanId {
  return v === "mensal" || v === "anual";
}

export const PLAN_LABEL: Record<string, string> = { teste: "Teste", mensal: "Mensal", anual: "Anual" };

export const CARD_EXTRA_PERCENT = 0;

export function priceFor(plan: PlanId, method: "pix" | "card"): number {
  const base = PLANS[plan].cents;
  return method === "card" ? Math.round(base * (1 + CARD_EXTRA_PERCENT / 100)) : base;
}

export const MAX_INSTALLMENTS: Record<PlanId, number> = { mensal: 1, anual: 12 };
