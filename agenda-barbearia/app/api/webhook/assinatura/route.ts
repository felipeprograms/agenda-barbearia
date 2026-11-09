import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { settleSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O Mercado Pago avisa aqui; nós consultamos o pagamento direto na API antes de liberar qualquer coisa. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.webhook);
  if (limited) return limited;

  const sub = new URL(req.url).searchParams.get("sub") ?? "";
  if (UUID.test(sub)) {
    try {
      await settleSubscription(sub);
    } catch (e) {
      console.error("webhook assinatura:", e);
    }
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
