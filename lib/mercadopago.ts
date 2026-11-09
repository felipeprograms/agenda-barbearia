import { TZ_OFFSET, TZ_OFFSET_MIN } from "./config";

const MP = "https://api.mercadopago.com";

export type PixPayment = { id: string; qrCode: string; qrCodeBase64: string };
export type PaymentInfo = { status: string; externalReference: string | null; amount: number };

/** Data no formato que o Mercado Pago pede: 2026-11-05T01:00:00.000-03:00 */
function toLocalISO(d: Date): string {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  return shifted.toISOString().replace("Z", TZ_OFFSET);
}

/** Cria um Pix na conta do Mercado Pago do BARBEIRO (o dinheiro cai direto na conta dele). */
export async function createPixPayment(
  accessToken: string,
  p: {
    bookingId: string;
    amountCents: number;
    description: string;
    payerEmail: string;
    payerName: string;
    notificationUrl?: string;
    expiresAt: Date;
  },
): Promise<PixPayment> {
  const [firstName, ...rest] = p.payerName.trim().split(/\s+/);

  const body: Record<string, unknown> = {
    transaction_amount: Number((p.amountCents / 100).toFixed(2)),
    description: p.description,
    payment_method_id: "pix",
    external_reference: p.bookingId,
    date_of_expiration: toLocalISO(p.expiresAt),
    payer: {
      email: p.payerEmail,
      first_name: firstName,
      ...(rest.length ? { last_name: rest.join(" ") } : {}),
    },
  };
  if (p.notificationUrl) body.notification_url = p.notificationUrl;

  const res = await fetch(`${MP}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": p.bookingId,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Mercado Pago ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }

  const data = json?.point_of_interaction?.transaction_data;
  if (!json?.id || !data?.qr_code) {
    throw new Error("O Mercado Pago não devolveu o QR Code do Pix.");
  }
  return { id: String(json.id), qrCode: data.qr_code, qrCodeBase64: data.qr_code_base64 ?? "" };
}

/** Consulta um pagamento direto no Mercado Pago (nunca confiamos no que chega pelo webhook). */
export async function getPayment(accessToken: string, paymentId: string): Promise<PaymentInfo> {
  const res = await fetch(`${MP}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) throw new Error(`Mercado Pago ${res.status} ao consultar pagamento.`);
  return {
    status: String(json.status),
    externalReference: json.external_reference ? String(json.external_reference) : null,
    amount: Number(json.transaction_amount ?? 0),
  };
}

/** Confere se o token informado pelo barbeiro é válido. */
export async function checkAccessToken(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${MP}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Cria um checkout hospedado do Mercado Pago (Checkout Pro) na conta do BARBEIRO, só com cartão.
 * O cliente é levado à página do Mercado Pago, paga e volta para o nosso site.
 * Devolve o endereço (init_point) para onde o cliente deve ir.
 */
export async function createCardCheckout(
  accessToken: string,
  p: {
    bookingId: string;
    amountCents: number;
    title: string;
    payerName: string;
    payerEmail?: string;
    notificationUrl?: string;
    returnUrl?: string; // precisa ser https para o Mercado Pago aceitar
    expiresAt: Date;
    maxInstallments?: number; // máximo de parcelas oferecidas (padrão 1 = à vista)
  },
): Promise<string> {
  const [firstName, ...rest] = p.payerName.trim().split(/\s+/);

  const body: Record<string, unknown> = {
    items: [
      {
        id: p.bookingId,
        title: p.title,
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number((p.amountCents / 100).toFixed(2)),
      },
    ],
    external_reference: p.bookingId,
    payer: {
      name: firstName,
      ...(rest.length ? { surname: rest.join(" ") } : {}),
      ...(p.payerEmail ? { email: p.payerEmail } : {}),
    },
    payment_methods: {
      // Só cartão: tira boleto, caixa eletrônico e transferência (Pix tem fluxo próprio).
      excluded_payment_types: [{ id: "ticket" }, { id: "atm" }, { id: "bank_transfer" }],
      installments: p.maxInstallments ?? 1, // padrão: à vista, para o valor recebido ser o valor cobrado
    },
    expires: true,
    expiration_date_from: toLocalISO(new Date()),
    expiration_date_to: toLocalISO(p.expiresAt),
  };
  if (p.notificationUrl) body.notification_url = p.notificationUrl;
  if (p.returnUrl) {
    body.back_urls = { success: p.returnUrl, pending: p.returnUrl, failure: p.returnUrl };
    body.auto_return = "approved";
  }

  const res = await fetch(`${MP}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.init_point) {
    throw new Error(`Mercado Pago ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return String(json.init_point);
}

/**
 * Procura, pelo id do agendamento (external_reference), um pagamento APROVADO.
 * Usado no cartão, onde o id do pagamento só existe depois que o cliente paga.
 */
export async function findApprovedPayment(
  accessToken: string,
  bookingId: string,
): Promise<(PaymentInfo & { id: string }) | null> {
  const url = `${MP}/v1/payments/search?external_reference=${encodeURIComponent(bookingId)}&sort=date_created&criteria=desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(json?.results)) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hit = json.results.find((r: any) => r?.status === "approved" && String(r?.external_reference) === bookingId);
  if (!hit) return null;
  return {
    id: String(hit.id),
    status: "approved",
    externalReference: String(hit.external_reference),
    amount: Number(hit.transaction_amount ?? 0),
  };
}
