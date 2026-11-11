import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { settleBooking } from "@/lib/settle";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.webhook);
  if (limited) return limited;

  const booking = new URL(req.url).searchParams.get("booking") ?? "";
  if (UUID.test(booking)) {
    try {
      await settleBooking(booking);
    } catch (e) {
      console.error("webhook:", e);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
