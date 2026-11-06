import { NextResponse } from "next/server";
import { settleBooking } from "@/lib/settle";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * O Mercado Pago chama aqui quando o status de um pagamento muda.
 * Não confiamos no conteúdo da chamada: apenas usamos o id do agendamento (na URL) para
 * consultar o pagamento direto na API do Mercado Pago, com o token do barbeiro.
 * Assim, ninguém consegue "confirmar" um horário enviando uma requisição falsa.
 */
export async function POST(req: Request) {
  const booking = new URL(req.url).searchParams.get("booking") ?? "";
  if (UUID.test(booking)) {
    try {
      await settleBooking(booking);
    } catch (e) {
      console.error("webhook:", e);
    }
  }
  // Sempre 200, para o Mercado Pago não ficar reenviando.
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
