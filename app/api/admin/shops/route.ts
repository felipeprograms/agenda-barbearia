import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminFromRequest } from "@/lib/adminAuth";
import { addDays, todayLocal } from "@/lib/time";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** GET: lista todas as barbearias com números para você decidir e cobrar. */
export async function GET(req: Request) {
  if (!(await adminFromRequest(req))) return fail(403, "Sem permissão.");
  const admin = supabaseAdmin();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [shops, barbers, bookings, users] = await Promise.all([
    admin
      .from("shops")
      .select("id,name,slug,status,paid_until,admin_note,created_at,approved_at,owner_user_id")
      .order("created_at", { ascending: false }),
    admin.from("barbers").select("id,shop_id,active,mp_connected"),
    admin.from("bookings").select("barber_id").eq("status", "confirmed").gte("created_at", since).limit(20000),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (shops.error) return fail(500, "Não foi possível carregar as barbearias.");

  const emailOf = new Map<string, string>();
  for (const u of users.data?.users ?? []) emailOf.set(u.id, u.email ?? "");

  const shopOfBarber = new Map<string, string>();
  const stats = new Map<string, { total: number; ready: number; bookings: number }>();
  const stat = (shopId: string) => {
    let s = stats.get(shopId);
    if (!s) stats.set(shopId, (s = { total: 0, ready: 0, bookings: 0 }));
    return s;
  };
  for (const b of barbers.data ?? []) {
    shopOfBarber.set(b.id, b.shop_id);
    const s = stat(b.shop_id);
    s.total += 1;
    if (b.active && b.mp_connected) s.ready += 1;
  }
  for (const bk of bookings.data ?? []) {
    const shopId = shopOfBarber.get(bk.barber_id);
    if (shopId) stat(shopId).bookings += 1;
  }

  const list = (shops.data ?? []).map((s) => {
    const st = stats.get(s.id) ?? { total: 0, ready: 0, bookings: 0 };
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      status: s.status,
      paid_until: s.paid_until,
      admin_note: s.admin_note,
      created_at: s.created_at,
      owner_email: emailOf.get(s.owner_user_id) ?? "",
      barbers_total: st.total,
      barbers_ready: st.ready,
      bookings_30d: st.bookings,
    };
  });
  return NextResponse.json({ shops: list, today: todayLocal() });
}

/**
 * POST { shopId, action, days?, date?, note? }
 *  approve        libera a barbearia e soma "days" (padrão 30) de uso
 *  add_days       soma "days" ao vencimento (a partir de hoje ou do vencimento atual, o que for mais tarde)
 *  set_paid_until define o vencimento exato (date) ou remove (date vazio = sem vencimento)
 *  suspend        tira do ar
 *  reactivate     volta a liberar (não mexe no vencimento)
 *  note           grava uma anotação sua (até 200 letras)
 */
export async function POST(req: Request) {
  if (!(await adminFromRequest(req))) return fail(403, "Sem permissão.");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Requisição inválida.");
  }
  const shopId = String(body.shopId ?? "");
  const action = String(body.action ?? "");
  if (!UUID.test(shopId)) return fail(400, "Barbearia inválida.");

  const admin = supabaseAdmin();
  const { data: shop } = await admin.from("shops").select("id,paid_until").eq("id", shopId).maybeSingle();
  if (!shop) return fail(404, "Barbearia não encontrada.");

  const today = todayLocal();
  const rawDays = Number(body.days ?? 30);
  const days = Number.isInteger(rawDays) && rawDays >= 1 && rawDays <= 366 ? rawDays : NaN;
  const extend = (n: number) => {
    const base = shop.paid_until && shop.paid_until > today ? shop.paid_until : today;
    return addDays(base, n);
  };

  let patch: Record<string, unknown>;
  switch (action) {
    case "approve":
      if (Number.isNaN(days)) return fail(400, "Informe de 1 a 366 dias.");
      patch = { status: "active", approved_at: new Date().toISOString(), paid_until: extend(days) };
      break;
    case "add_days":
      if (Number.isNaN(days)) return fail(400, "Informe de 1 a 366 dias.");
      patch = { paid_until: extend(days) };
      break;
    case "set_paid_until": {
      const date = String(body.date ?? "");
      if (date && !DATE.test(date)) return fail(400, "Data inválida.");
      patch = { paid_until: date || null };
      break;
    }
    case "suspend":
      patch = { status: "suspended" };
      break;
    case "reactivate":
      patch = { status: "active" };
      break;
    case "note": {
      const note = String(body.note ?? "").trim().slice(0, 200);
      patch = { admin_note: note || null };
      break;
    }
    default:
      return fail(400, "Ação desconhecida.");
  }

  const { error } = await admin.from("shops").update(patch).eq("id", shopId);
  if (error) {
    console.error("admin update:", error);
    return fail(500, "Não foi possível salvar.");
  }
  return NextResponse.json({ ok: true });
}
