"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import BrandBar from "@/components/BrandBar";
import PasswordForm from "@/components/panel/PasswordForm";

export default function SenhaPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const auth = supabaseBrowser().auth;
    auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = auth.onAuthStateChange((_e, s) => setSession(s));

    const t = setTimeout(() => setSession((cur) => (cur === undefined ? null : cur)), 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="container stack">
      <BrandBar />
      <div className="card stack">
        <h1>Nova senha</h1>
        {session === undefined && <p className="muted">Conferindo o link…</p>}
        {session === null && (
          <>
            <p className="error">Este link é inválido ou já expirou.</p>
            <p className="muted" style={{ margin: 0 }}>
              Volte ao painel, toque em “Esqueci minha senha” e peça um link novo.
            </p>
            <div>
              <Link className="btn btn-primary" href="/painel">
                Voltar ao painel
              </Link>
            </div>
          </>
        )}
        {session && !done && <PasswordForm onDone={() => setDone(true)} />}
        {session && done && (
          <div className="stack">
            <p className="ok">Tudo certo! Sua senha foi alterada.</p>
            <div>
              <Link className="btn btn-primary" href="/painel">
                Ir para o painel
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
