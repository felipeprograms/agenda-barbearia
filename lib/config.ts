export const TIMEZONE = "America/Bahia";
export const TZ_OFFSET = "-03:00";
export const TZ_OFFSET_MIN = -180;

export const SLOT_STEP_MIN = 30;
export const MAX_DAYS_AHEAD = 60;
export const MIN_LEAD_MIN = 30;
export const CANCEL_MIN_HOURS = 2;
export const HOLD_MINUTES = 10;

export const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
