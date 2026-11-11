import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_URL } from "./config";

const MP = "https://api.mercadopago.com";
const STATE_MAX_AGE_MS = 20 * 60 * 1000;
const REFRESH_MARGIN_MS = 7 * 24 * 3600 * 1000;

export const OAUTH_REDIRECT_URI = `${APP_URL}/api/mp/callback`;

export function oauthConfigured(): boolean {
  return Boolean(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET && APP_URL.startsWith("https://"));
}

function sign(payload: string): string {
  return createHmac("sha256", process.env.MP_CLIENT_SECRET ?? "").update(payload).digest("base64url");
}

export function makeState(barberId: string): string {
  const payload = `${barberId}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function readState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [barberId, ts, sig] = parts;
  const expected = sign(`${barberId}.${ts}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > STATE_MAX_AGE_MS) return null;
  return barberId;
}

export function authorizationUrl(state: string): string {
  const q = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID ?? "",
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: OAUTH_REDIRECT_URI,
  });
  return `https://auth.mercadopago.com/authorization?${q.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: number;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${MP}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      ...body,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & { message?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`oauth/token ${res.status}: ${json.error ?? json.message ?? "sem detalhes"}`);
  }
  return json as TokenResponse;
}

export function exchangeCode(code: string): Promise<TokenResponse> {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: OAUTH_REDIRECT_URI });
}

function refreshWith(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

function expiresAtOf(t: TokenResponse): string {
  const seconds = t.expires_in && t.expires_in > 0 ? t.expires_in : 180 * 24 * 3600;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function saveOAuthTokens(admin: SupabaseClient, barberId: string, t: TokenResponse): Promise<void> {
  const { error } = await admin.from("barber_secrets").upsert({
    barber_id: barberId,
    mp_access_token: t.access_token,
    refresh_token: t.refresh_token ?? null,
    expires_at: expiresAtOf(t),
    mp_user_id: t.user_id ?? null,
    source: "oauth",
  });
  if (error) throw new Error(`barber_secrets: ${error.message}`);
  await admin.from("barbers").update({ mp_connected: true }).eq("id", barberId);
}

export async function getBarberAccessToken(admin: SupabaseClient, barberId: string): Promise<string | null> {
  const { data } = await admin
    .from("barber_secrets")
    .select("mp_access_token,refresh_token,expires_at,source")
    .eq("barber_id", barberId)
    .maybeSingle();
  if (!data) return null;

  const dueSoon =
    data.source === "oauth" && data.refresh_token && data.expires_at && new Date(data.expires_at).getTime() - Date.now() < REFRESH_MARGIN_MS;
  if (!dueSoon) return data.mp_access_token as string;

  try {
    const fresh = await refreshWith(data.refresh_token as string);
    await saveOAuthTokens(admin, barberId, { ...fresh, refresh_token: fresh.refresh_token ?? (data.refresh_token as string) });
    return fresh.access_token;
  } catch (e) {
    console.error("renovar token MP:", e);
    return data.mp_access_token as string;
  }
}
