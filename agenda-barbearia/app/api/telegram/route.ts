import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";

type Update = { message?: { text?: string; chat?: { id?: number } } };

/**
 * Webhook do bot do Telegram. Quando o barbeiro abre o link t.me/<bot>?start=<codigo> e toca
 * em "Iniciar", o Telegram envia "/start <codigo>" para cá e guardamos o chat dele.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.webhook);
  if (limited) return limited;

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: Update;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = (update.message?.text ?? "").trim();
  if (!chatId || !text.startsWith("/start")) return NextResponse.json({ ok: true });

  const code = text.split(/\s+/)[1] ?? "";
  if (!/^[a-f0-9]{16}$/i.test(code)) {
    await sendTelegram(chatId, "Olá! Para receber avisos de agendamento, use o botão “Conectar Telegram” no seu painel.");
    return NextResponse.json({ ok: true });
  }

  const admin = supabaseAdmin();
  const { data: barber } = await admin
    .from("barbers")
    .select("id,name")
    .eq("telegram_code", code.toLowerCase())
    .maybeSingle();

  if (!barber) {
    await sendTelegram(chatId, "Código não reconhecido. Abra o link de novo pelo seu painel.");
    return NextResponse.json({ ok: true });
  }

  await admin.from("barbers").update({ telegram_chat_id: chatId }).eq("id", barber.id);
  await sendTelegram(chatId, `✅ Conectado, ${barber.name}! Os novos agendamentos vão chegar aqui.`);
  return NextResponse.json({ ok: true });
}
