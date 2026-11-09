import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";

/** Limites por rota: "max" chamadas a cada "windowSec" segundos, contadas por IP (ou por outra chave). */
export const LIMITS = {
  // Públicas
  book: { name: "book", max: 8, windowSec: 600 }, // cria reserva e chama o Mercado Pago
  slots: { name: "slots", max: 60, windowSec: 60 },
  bookingStatus: { name: "bkst", max: 120, windowSec: 60 }, // a tela confere de poucos em poucos segundos
  connect: { name: "conn", max: 10, windowSec: 600 },
  mpCallback: { name: "mpcb", max: 20, windowSec: 600 },
  webhook: { name: "hook", max: 300, windowSec: 60 }, // webhooks do Mercado Pago e do Telegram
  // Login, cadastro e recuperação de senha (por IP e, separado, por e-mail)
  authLoginIp: { name: "login-ip", max: 20, windowSec: 900 },
  authLoginEmail: { name: "login-em", max: 6, windowSec: 900 },
  authSignupIp: { name: "signup-ip", max: 5, windowSec: 3600 },
  authResetIp: { name: "reset-ip", max: 5, windowSec: 3600 },
  authResetEmail: { name: "reset-em", max: 3, windowSec: 3600 },
  // Painel (logado)
  painelWrite: { name: "pw", max: 30, windowSec: 600 },
  painelPay: { name: "pay", max: 10, windowSec: 600 }, // gera Pix/cartão da mensalidade
  painelPoll: { name: "poll", max: 90, windowSec: 60 },
  painelToken: { name: "tok", max: 10, windowSec: 600 }, // confere token no Mercado Pago
  admin: { name: "adm", max: 120, windowSec: 60 },
  // Reservado para chamadas de IA, caso o projeto venha a ter
  ai: { name: "ai", max: 20, windowSec: 600 },
} as const;

export type Rule = { name: string; max: number; windowSec: number };

export function clientIp(req: Request): string {
  const h = req.headers;
  const raw = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
  return raw.split(",")[0].trim() || "unknown";
}

// Plano B (por instância) para quando o banco estiver fora do ar ou a migração ainda não rodou.
const memory = new Map<string, { n: number; resetAt: number }>();
function memoryHit(key: string, rule: Rule): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
  let e = memory.get(key);
  if (!e || e.resetAt < now) memory.set(key, (e = { n: 0, resetAt: now + rule.windowSec * 1000 }));
  e.n += 1;
  return { allowed: e.n <= rule.max, retryAfter: Math.max(1, Math.ceil((e.resetAt - now) / 1000)) };
}

/**
 * Confere o limite. Devolve null se pode seguir, ou uma resposta 429 (com Retry-After) para ser retornada.
 * `id` troca o IP por outra chave (ex.: e-mail). Se o banco falhar, usa o contador em memória (nunca derruba a rota).
 */
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
