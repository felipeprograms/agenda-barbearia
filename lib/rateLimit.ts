import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";

export const LIMITS = {

  book: { name: "book", max: 8, windowSec: 600 },
  slots: { name: "slots", max: 60, windowSec: 60 },
  bookingStatus: { name: "bkst", max: 120, windowSec: 60 },
  geo: { name: "geo", max: 40, windowSec: 600 },
  bookingPush: { name: "bkpush", max: 10, windowSec: 600 },
  bookingCancel: { name: "bkcx", max: 10, windowSec: 600 },
  connect: { name: "conn", max: 10, windowSec: 600 },
  mpCallback: { name: "mpcb", max: 20, windowSec: 600 },
  webhook: { name: "hook", max: 300, windowSec: 60 },

  authLoginIp: { name: "login-ip", max: 20, windowSec: 900 },
  authLoginEmail: { name: "login-em", max: 6, windowSec: 900 },
  authSignupIp: { name: "signup-ip", max: 5, windowSec: 3600 },
  authResetIp: { name: "reset-ip", max: 5, windowSec: 3600 },
  authResetEmail: { name: "reset-em", max: 3, windowSec: 3600 },

  painelWrite: { name: "pw", max: 30, windowSec: 600 },
  painelPay: { name: "pay", max: 10, windowSec: 600 },
  painelPoll: { name: "poll", max: 90, windowSec: 60 },
  painelToken: { name: "tok", max: 10, windowSec: 600 },
  admin: { name: "adm", max: 120, windowSec: 60 },

  ai: { name: "ai", max: 20, windowSec: 600 },
} as const;

export type Rule = { name: string; max: number; windowSec: number };

export function clientIp(req: Request): string {
  const h = req.headers;
  const raw = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
  return raw.split(",")[0].trim() || "unknown";
}

const memory = new Map<string, { n: number; resetAt: number }>();
function memoryHit(key: string, rule: Rule): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
  let e = memory.get(key);
  if (!e || e.resetAt < now) memory.set(key, (e = { n: 0, resetAt: now + rule.windowSec * 1000 }));
  e.n += 1;
  return { allowed: e.n <= rule.max, retryAfter: Math.max(1, Math.ceil((e.resetAt - now) / 1000)) };
}

export async function rateLimit(req: Request, rule: Rule, id?: string): Promise<Response | null> {
  const key = `${rule.name}:${(id ?? clientIp(req)).toLowerCase().slice(0, 200)}`;
  let allowed = true;
  let retryAfter = rule.windowSec;

  try {
    const { data, error } = await supabaseAdmin().rpc("rate_limit_hit", {
      p_key: key,
      p_max: rule.max,
      p_window: rule.windowSec,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) throw error ?? new Error("sem resposta");
    allowed = Boolean(row.allowed);
    retryAfter = Number(row.retry_after) || rule.windowSec;
  } catch {
    const m = memoryHit(key, rule);
    allowed = m.allowed;
    retryAfter = m.retryAfter;
  }

  if (allowed) return null;
  return NextResponse.json(
    { error: `Muitas tentativas. Tente de novo em ${retryAfter < 90 ? `${retryAfter} segundos` : `${Math.ceil(retryAfter / 60)} minutos`}.`, retryAfter },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter), "RateLimit-Limit": String(rule.max), "RateLimit-Remaining": "0" },
    },
  );
}
