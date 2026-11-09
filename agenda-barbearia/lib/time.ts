import { TIMEZONE, TZ_OFFSET, TZ_OFFSET_MIN } from "./config";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Data de hoje no horário do Brasil, formato YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Soma dias a uma data YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dia da semana (0 = domingo) de uma data YYYY-MM-DD. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Converte data + minutos desde 00:00 (horário local) em um instante (Date). */
export function localToDate(date: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00${TZ_OFFSET}`);
}

/** "09:30" ou "09:30:00" -> 570 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
}

export function minutesToLabel(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Ex: "qui., 05/11 às 14:30" */
export function formatDateTimeBR(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const day = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${day} às ${time}`;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
