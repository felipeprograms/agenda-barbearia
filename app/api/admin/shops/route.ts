import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
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
  const limited = await rateLimit(req, LIMITS.admin);
  if (limited) return limited;

  if (!(await adminFromRequest(req))) return fail(403, "Sem permissão.");
  const admin = supabaseAdmin();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [shops, barbers, bookings, users] = await Promise.all([
    admin
      .from("shops")
      .select("id,name,slug,status,paid_until,plan,admin_note,created_at,approved_at,owner_user_id")
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
      plan: s.plan,
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
 *  approve        libera a barbearia e soma "days" (padrão 30) de uso; com trial = true, marca como plano de teste
 *  add_days       soma "days" ao vencimento (a partir de hoje ou do vencimento atual, o que for mais tarde)
 *  set_paid_until define o vencimento exato (date) ou remove (date vazio = sem vencimento)
 *  suspend        tira do ar
 *  reactivate     volta a liberar (não mexe no vencimento)
 *  set_password   define uma nova senha (8 a 72 letras) para o dono da barbearia
 *  note           grava uma anotação sua (até 200 letras)
 *  delete         apaga a barbearia para sempre (exige "confirm" = endereço da barbearia).
 *                 "deleteAccounts" também apaga os logins do dono e dos barbeiros (nunca os de administradores).
 *                 Se houver agendamentos pagos futuros, responde 409 até receber "force": true.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.admin);
  if (limited) return limited;

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
  const { data: shop } = await admin
    .from("shops")
    .select("id,slug,owner_user_id,paid_until")
    .eq("id", shopId)
    .maybeSingle();
  if (!shop) return fail(404, "Barbearia não encontrada.");

  if (action === "delete") return deleteShop(admin, shop, body);

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
      if (body.trial === true) patch.plan = "teste"; // plano de teste: só você libera
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
    case "set_password": {
      const password = String(body.password ?? "");
      if (password.length < 8 || password.length > 72) return fail(400, "A senha precisa ter de 8 a 72 caracteres.");
      const { data: isAdmin } = await admin.from("platform_admins").select("user_id").eq("user_id", shop.owner_user_id).maybeSingle();
      if (isAdmin) return fail(403, "Esta conta é de administrador. Troque a senha pela própria tela de administração.");
      const { error: pwErr } = await admin.auth.admin.updateUserById(shop.owner_user_id, { password });
      if (pwErr) {
        console.error("admin set_password:", pwErr);
        return fail(500, "Não foi possível trocar a senha.");
      }
      return NextResponse.json({ ok: true });
    }
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

type ShopRow = { id: string; slug: string; owner_user_id: string; paid_until: string | null };

/** Apaga a barbearia e tudo que pertence a ela. Ordem importa: agendamentos antes dos serviços. */
async function deleteShop(admin: ReturnType<typeof supabaseAdmin>, shop: ShopRow, body: Record<string, unknown>) {
  if (String(body.confirm ?? "").trim().toLowerCase() !== shop.slug) {
    return fail(400, "Para excluir, digite o endereço da barbearia exatamente como aparece.");
  }

  const { data: team } = await admin.from("barbers").select("id,user_id").eq("shop_id", shop.id);
  const barberIds = (team ?? []).map((b) => b.id as string);
  const userIds = [
    ...new Set([shop.owner_user_id, ...(team ?? []).map((b) => b.user_id as string | null)]),
  ].filter((u): u is string => Boolean(u));

  if (body.force !== true && barberIds.length > 0) {
    const { count } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("barber_id", barberIds)
      .eq("status", "confirmed")
      .gt("starts_at", new Date().toISOString());
    if (count && count > 0) {
      return NextResponse.json(
        { error: `Esta barbearia tem ${count} agendamento(s) pago(s) para os próximos dias.`, futureBookings: count },
        { status: 409 },
      );
    }
  }

  // Fotos enviadas (cada usuário tem uma pasta no armazenamento). Se falhar, não impede a exclusão.
  for (const uid of userIds) {
    try {
      const { data: files } = await admin.storage.from("fotos").list(uid, { limit: 200 });
      if (files && files.length > 0) await admin.storage.from("fotos").remove(files.map((f) => `${uid}/${f.name}`));
    } catch (e) {
      console.error("limpar fotos:", e);
    }
  }

  if (barberIds.length > 0) {
    const { error: bErr } = await admin.from("bookings").delete().in("barber_id", barberIds);
    if (bErr) {
      console.error("apagar agendamentos:", bErr);
      return fail(500, "Não foi possível apagar os agendamentos da barbearia.");
    }
  }

  const { error } = await admin.from("shops").delete().eq("id", shop.id);
  if (error) {
    console.error("apagar barbearia:", error);
    return fail(500, "Não foi possível apagar a barbearia.");
  }

  let accountsDeleted = 0;
  if (body.deleteAccounts === true) {
    const { data: admins } = await admin.from("platform_admins").select("user_id");
    const protectedIds = new Set((admins ?? []).map((a) => a.user_id as string));
    for (const uid of userIds) {
      if (protectedIds.has(uid)) continue;
      const { error: dErr } = await admin.auth.admin.deleteUser(uid);
      if (dErr) console.error("apagar login:", dErr);
      else accountsDeleted += 1;
    }
  }
  return NextResponse.json({ ok: true, accountsDeleted });
}
