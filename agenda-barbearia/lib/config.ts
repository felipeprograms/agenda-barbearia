// Fuso horário do Brasil (Bahia/Brasília). O Brasil não usa mais horário de verão,
// então um deslocamento fixo de -03:00 é suficiente.
export const TIMEZONE = "America/Bahia";
export const TZ_OFFSET = "-03:00";
export const TZ_OFFSET_MIN = -180;

export const SLOT_STEP_MIN = 30; // intervalo entre horários oferecidos
export const MAX_DAYS_AHEAD = 60; // até quantos dias à frente o cliente pode agendar
export const MIN_LEAD_MIN = 30; // antecedência mínima para agendar
export const HOLD_MINUTES = 10; // tempo para pagar o Pix antes de liberar o horário

export const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
