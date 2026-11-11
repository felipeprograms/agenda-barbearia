import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isShopOpen } from "@/lib/shopStatus";
import BrandBar from "@/components/BrandBar";
import ConnectClient from "./ConnectClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conectar pagamento", robots: { index: false, follow: false } };

type ShopInfo = { name: string; status: string; paid_until: string | null };
type BarberInfo = {
  name: string;
  mp_connected: boolean;
  telegram_chat_id: number | null;
  telegram_code: string;
  shops: ShopInfo | ShopInfo[] | null;
};

async function loadBarber(token: string): Promise<BarberInfo | null> {
  const { data } = await supabaseAdmin()
    .from("barbers")
    .select("name,mp_connected,telegram_chat_id,telegram_code,shops(name,status,paid_until)")
    .eq("connect_token", token)
    .is("user_id", null)
    .maybeSingle();
  return (data as BarberInfo | null) ?? null;
}

export default async function ConectarPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mp?: string }>;
}) {
  const { token } = await params;
  const { mp } = await searchParams;

  const barber = /^[a-f0-9]{32}$/.test(token) ? await loadBarber(token) : null;

  if (!barber) {
    return (
      <div className="container stack">
        <BrandBar />
        <div className="card">
          <h2>Link inválido</h2>
          <p className="muted" style={{ margin: 0 }}>
            Este link não existe ou foi substituído. Peça um novo ao dono da barbearia.
          </p>
        </div>
      </div>
    );
  }

  const shop = Array.isArray(barber.shops) ? barber.shops[0] : barber.shops;
  const open = !!shop && isShopOpen(shop.status, shop.paid_until);

  return (
    <div className="container stack">
      <BrandBar />
      <div className="card stack">
        <div>
          <h2>Olá, {barber.name}!</h2>
          <p className="muted" style={{ margin: 0 }}>
            {shop ? `Barbearia ${shop.name}. ` : ""}Conecte as duas coisas abaixo para começar a receber agendamentos.
          </p>
        </div>
        {!open && (
          <p className="error">A barbearia ainda não foi liberada ou está com a mensalidade vencida. Fale com o dono.</p>
        )}
        <ConnectClient
          token={token}
          mpConnected={barber.mp_connected}
          telegramConnected={Boolean(barber.telegram_chat_id)}
          telegramCode={barber.telegram_code}
          botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ""}
          result={mp === "ok" || mp === "erro" ? mp : null}
        />
      </div>
    </div>
  );
}
