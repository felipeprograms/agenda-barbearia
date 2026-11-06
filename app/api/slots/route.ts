import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAvailableSlots } from "@/lib/availability";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/slots?barber=<id>&service=<id>&date=YYYY-MM-DD  ->  { slots: ["09:00", ...] } */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const barberId = url.searchParams.get("barber") ?? "";
  const serviceId = url.searchParams.get("service") ?? "";
  const date = url.searchParams.get("date") ?? "";

  if (!UUID.test(barberId) || !UUID.test(serviceId)) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  try {
    const admin = supabaseAdmin();
    const { data: service } = await admin
      .from("services")
      .select("duration_min")
      .eq("id", serviceId)
      .eq("barber_id", barberId)
      .eq("active", true)
      .maybeSingle();
    if (!service) return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });

    const slots = await getAvailableSlots(admin, barberId, date, service.duration_min);
    return NextResponse.json({ slots });
  } catch (e) {
    console.error("slots:", e);
    return NextResponse.json({ error: "Erro ao buscar horários." }, { status: 500 });
  }
}
