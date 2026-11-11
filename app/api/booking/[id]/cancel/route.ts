import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { cancelBooking } from "@/lib/cancel";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, LIMITS.bookingCancel);
  if (limited) return limited;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Inválido." }, { status: 400 });

  const r = await cancelBooking(id, "customer");
  if (!r.ok) {
    const status = r.code === "not_found" ? 404 : r.code === "refund_failed" ? 502 : 409;
    return NextResponse.json({ error: r.message }, { status });
  }
  return NextResponse.json({ ok: true, refunded: r.refunded });
}
