"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Barber, Shop, ShopBasic } from "@/lib/panelUtils";
import AuthForm from "@/components/panel/AuthForm";
import Onboarding from "@/components/panel/Onboarding";
import ShopSection from "@/components/panel/ShopSection";
import ProfileSection from "@/components/panel/ProfileSection";
import BarberSection from "@/components/panel/BarberSection";
import BarberForm from "@/components/panel/BarberForm";
import BrandBar from "@/components/BrandBar";
import StatusBanner from "@/components/panel/StatusBanner";

export default function PainelPage() {
  // undefined = ainda verificando o login; null = deslogado
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [ownedShop, setOwnedShop] = useState<Shop | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [barberShop, setBarberShop] = useState<ShopBasic | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const auth = supabaseBrowser().auth;
    auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    if (!session) return;
    const db = supabaseBrowser();
    const uid = session.user.id;
    const [shopRes, barberRes] = await Promise.all([
      db
        .from("shops")
        .select("id,slug,name,status,paid_until,tagline,about,address,phone,instagram,hours_text,policies_text,cover_url,logo_url,gallery")
        .eq("owner_user_id", uid)
        .maybeSingle(),
      db.from("barbers").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    setOwnedShop((shopRes.data as Shop | null) ?? null);
    const b = (barberRes.data as Barber | null) ?? null;
    setBarber(b);
    if (b) {
      const { data } = await db.from("shops").select("id,slug,name,status,paid_until").eq("id", b.shop_id).maybeSingle();
      setBarberShop((data as ShopBasic | null) ?? null);
    } else {
      setBarberShop(null);
    }
    setLoaded(true);
  }, [session]);

  useEffect(() => {
    if (session) void reload();
    else setLoaded(false);
  }, [session, reload]);

  if (session === undefined) return <div className="container"><BrandBar /><p className="muted">Carregando…</p></div>;
  if (session === null) return <div className="container"><BrandBar /><AuthForm /></div>;

  return (
    <div className="container stack">
      <BrandBar />
      <div className="row between">
        <span className="muted">{session.user.email}</span>
        <button className="btn btn-small" onClick={() => supabaseBrowser().auth.signOut()}>
          Sair
        </button>
      </div>

      {!loaded && <p className="muted">Carregando…</p>}

      {loaded && !ownedShop && !barber && <Onboarding session={session} onDone={reload} />}

      {loaded && ownedShop && <StatusBanner status={ownedShop.status} paidUntil={ownedShop.paid_until} />}

      {loaded && !ownedShop && barberShop && (
        <StatusBanner status={barberShop.status} paidUntil={barberShop.paid_until} />
      )}

      {loaded && ownedShop && <ShopSection shop={ownedShop} />}

      {loaded && ownedShop && <ProfileSection key={ownedShop.id} shop={ownedShop} onChange={reload} />}

      {loaded && ownedShop && !barber && (
        <div className="card stack">
          <h2>Você também atende clientes?</h2>
          <p className="muted">
            Crie seu cadastro de barbeiro para ter agenda, receber Pix na sua conta e aparecer na página da barbearia.
          </p>
          <BarberForm invite={false} onDone={reload} />
        </div>
      )}

      {loaded && barber && <BarberSection barber={barber} shop={barberShop} onChange={reload} />}
    </div>
  );
}
