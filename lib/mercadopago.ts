import { TZ_OFFSET, TZ_OFFSET_MIN } from "./config";

const MP = "https://api.mercadopago.com";

export type PixPayment = { id: string; qrCode: string; qrCodeBase64: string };
export type PaymentInfo = { status: string; externalReference: string | null; amount: number };

function toLocalISO(d: Date): string {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  return shifted.toISOString().replace("Z", TZ_OFFSET);
}

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

export async function createCardCheckout(
  accessToken: string,
  p: {
    bookingId: string;
    amountCents: number;
    title: string;
    payerName: string;
    payerEmail?: string;
    notificationUrl?: string;
    returnUrl?: string;
    expiresAt: Date;
    maxInstallments?: number;
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

      excluded_payment_types: [{ id: "ticket" }, { id: "atm" }, { id: "bank_transfer" }],
      installments: p.maxInstallments ?? 1,
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

export async function refundPayment(accessToken: string, paymentId: string, idempotencyKey: string): Promise<void> {
  const res = await fetch(`${MP}/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({}),
  });
  if (res.ok) return;
  const json = await res.json().catch(() => null);
  const text = JSON.stringify(json ?? {});

  if (/already|refunded|total amount/i.test(text) && res.status === 400) return;
  throw new Error(`Mercado Pago ${res.status} ao devolver o pagamento.`);
}
