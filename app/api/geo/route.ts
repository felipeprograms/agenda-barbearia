import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { userFromRequest } from "@/lib/authServer";
import { APP_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

type Point = { lat: number; lng: number };

function inBrazil(p: Point): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat > -34 && p.lat < 6 && p.lng > -74 && p.lng < -32;
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

async function geocode(q: string): Promise<Point | null> {
  try {
    const json = (await getJson(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`,
      { "User-Agent": `AgendaBarbearia/1.0 (${APP_URL})`, "Accept-Language": "pt-BR" },
    )) as { lat?: string; lon?: string }[] | null;
    const first = json?.[0];
    if (!first?.lat || !first?.lon) return null;
    const p = { lat: Number(first.lat), lng: Number(first.lon) };
    return inBrazil(p) ? p : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.geo);
  if (limited) return limited;
  const user = await userFromRequest(req);
  if (!user) return fail(401, "Faça login novamente.");

  const body = await req.json().catch(() => ({}));

  if (typeof body.cep === "string") {
    const cep = body.cep.replace(/\D/g, "");
    if (cep.length !== 8) return fail(400, "CEP inválido.");
    type ViaCep = { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    const via = await getJson(`https://viacep.com.br/ws/${cep}/json/`)
      .then((v) => v as ViaCep | null)
      .catch(() => null);
    if (!via) return fail(502, "Não foi possível consultar o CEP agora. Preencha o endereço à mão.");
    if (via.erro) return fail(404, "CEP não encontrado. Confira os números ou preencha o endereço à mão.");

    const street = String(via.logradouro ?? "").slice(0, 120);
    const neighborhood = String(via.bairro ?? "").slice(0, 80);
    const city = String(via.localidade ?? "").slice(0, 80);
    const uf = String(via.uf ?? "").slice(0, 2).toUpperCase();

    let point = await geocode([street, neighborhood, city, uf, "Brasil"].filter(Boolean).join(", "));
    if (!point) point = await geocode([city, uf, "Brasil"].filter(Boolean).join(", "));
    return NextResponse.json({ street, neighborhood, city, uf, lat: point?.lat ?? null, lng: point?.lng ?? null });
  }

  if (typeof body.q === "string") {
    const q = body.q.trim().slice(0, 200);
    if (q.length < 6) return fail(400, "Endereço muito curto.");
    const point = await geocode(q);
    return NextResponse.json({ lat: point?.lat ?? null, lng: point?.lng ?? null });
  }

  return fail(400, "Requisição inválida.");
}
