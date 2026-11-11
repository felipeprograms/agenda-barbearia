import { supabaseBrowser } from "./supabaseBrowser";

export type ShopBasic = {
  id: string;
  slug: string;
  name: string;
  status: string;
  paid_until: string | null;
  plan?: string | null;
};

export type Shop = ShopBasic & {
  tagline: string | null;
  about: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  hours_text: string | null;
  policies_text: string | null;
  cover_url: string | null;
  logo_url: string | null;
  gallery: string[];
};

export type Barber = {
  id: string;
  shop_id: string;
  slug: string;
  name: string;
  deposit_percent: number;
  telegram_chat_id: number | null;
  telegram_code: string;
  photo_url: string | null;
  mp_connected: boolean;
  active: boolean;
  user_id?: string | null;
  connect_token?: string;
};

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function reaisToCents(v: string): number {
  const t = v.trim().replace(/[^\d,.]/g, "");
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalized);
  return Number.isFinite(n) && normalized !== "" ? Math.round(n * 100) : NaN;
}

export async function postAuthed(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token ?? "";
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: json } : { ok: false, error: json.error ?? "Erro inesperado." };
  } catch {
    return { ok: false, error: "Sem conexão. Tente novamente." };
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
