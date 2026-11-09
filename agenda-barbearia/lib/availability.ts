import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_DAYS_AHEAD, MIN_LEAD_MIN, SLOT_STEP_MIN } from "./config";
import {
  DATE_RE,
  addDays,
  localToDate,
  minutesToLabel,
  timeToMinutes,
  todayLocal,
  weekdayOf,
} from "./time";

/** A data é válida, não é passado e está dentro da janela de agendamento? */
export function dateInRange(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  if (Number.isNaN(new Date(`${date}T12:00:00Z`).getTime())) return false;
  const today = todayLocal();
  return date >= today && date <= addDays(today, MAX_DAYS_AHEAD);
}

type Busy = { start: number; end: number };

/**
 * Horários livres ("HH:MM") de um barbeiro em um dia, para um serviço com a duração dada.
 * Considera o expediente, agendamentos confirmados e reservas ainda aguardando pagamento.
 */
export async function getAvailableSlots(
  admin: SupabaseClient,
  barberId: string,
  date: string,
  durationMin: number,
): Promise<string[]> {
  if (!dateInRange(date)) return [];

  const { data: hours, error: hoursError } = await admin
    .from("working_hours")
    .select("start_time,end_time")
    .eq("barber_id", barberId)
    .eq("weekday", weekdayOf(date));
  if (hoursError) throw new Error(hoursError.message);
  if (!hours || hours.length === 0) return [];

  const dayStart = localToDate(date, 0);
  const dayEnd = localToDate(addDays(date, 1), 0);

  const { data: bookings, error: bookingsError } = await admin
    .from("bookings")
    .select("starts_at,ends_at,status,hold_expires_at")
    .eq("barber_id", barberId)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());
  if (bookingsError) throw new Error(bookingsError.message);

  const now = Date.now();
  const busy: Busy[] = (bookings ?? [])
    .filter((b) => b.status === "confirmed" || new Date(b.hold_expires_at).getTime() > now)
    .map((b) => ({ start: new Date(b.starts_at).getTime(), end: new Date(b.ends_at).getTime() }));

  const earliest = now + MIN_LEAD_MIN * 60_000;
  const found = new Set<number>();

  for (const h of hours) {
    const open = timeToMinutes(h.start_time);
    const close = timeToMinutes(h.end_time);
    for (let t = open; t + durationMin <= close; t += SLOT_STEP_MIN) {
      const start = localToDate(date, t).getTime();
      const end = start + durationMin * 60_000;
      if (start < earliest) continue;
      if (busy.some((b) => start < b.end && end > b.start)) continue;
      found.add(t);
    }
  }

  return [...found].sort((a, b) => a - b).map(minutesToLabel);
}
