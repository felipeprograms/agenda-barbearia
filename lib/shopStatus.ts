import { todayLocal } from "./time";

export type ShopStatus = "pending" | "active" | "suspended";

export type ShopState = "open" | "pending" | "suspended" | "expired";

/** Situação real da barbearia: liberada e em dia ("open") ou o motivo de estar fora do ar. */
export function shopState(status: string | null | undefined, paidUntil: string | null | undefined): ShopState {
  if (status === "pending") return "pending";
  if (status !== "active") return "suspended";
  if (paidUntil && paidUntil < todayLocal()) return "expired";
  return "open";
}

export function isShopOpen(status: string | null | undefined, paidUntil: string | null | undefined): boolean {
  return shopState(status, paidUntil) === "open";
}

/** "2026-11-30" -> "30/11/2026" */
export function formatDateBR(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
