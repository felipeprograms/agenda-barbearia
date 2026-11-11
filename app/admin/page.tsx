"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { shopState, formatDateBR, type ShopState } from "@/lib/shopStatus";
import BrandBar from "@/components/BrandBar";
import AuthForm from "@/components/panel/AuthForm";
import PasswordForm from "@/components/panel/PasswordForm";

type AdminShop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  paid_until: string | null;
  plan: string | null;
  admin_note: string | null;
  created_at: string;
  owner_email: string;
  barbers_total: number;
  barbers_ready: number;
  bookings_30d: number;
};

const LABEL: Record<ShopState, string> = {
  pending: "Aguardando liberação",
  open: "No ar",
  expired: "Mensalidade vencida",
  suspended: "Suspensa",
};
const BADGE: Record<ShopState, string> = { pending: "warn", open: "ok", expired: "warn", suspended: "" };

export default function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [shops, setShops] = useState<AdminShop[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const auth = supabaseBrowser().auth;
    auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const call = useCallback(
    async (method: "GET" | "POST", body?: Record<string, unknown>) => {
      const res = await fetch("/api/admin/shops", {
        method,
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, json };
    },
    [session],
  );

  const load = useCallback(async () => {
    if (!session) return;
    const { status, json } = await call("GET");
    if (status === 403) return setDenied(true);
    if (status !== 200) return setError(json.error ?? "Erro ao carregar.");
    setDenied(false);
    setError("");
    setShops(json.shops as AdminShop[]);
  }, [session, call]);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  async function act(shopId: string, action: string, extra: Record<string, unknown> = {}) {
    setBusyId(shopId);
    setError("");
    const { status, json } = await call("POST", { shopId, action, ...extra });
    if (status === 409 && json.futureBookings) {
      setBusyId("");
      if (window.confirm(`${json.error}\n\nOs clientes que já pagaram perderiam o horário. Excluir mesmo assim?`)) {
        return act(shopId, action, { ...extra, force: true });
      }
      return;
    }
    setBusyId("");
    if (status !== 200) return setError(json.error ?? "Não foi possível salvar.");
    await load();
  }

  if (session === undefined) return <div className="container"><BrandBar /><p className="muted">Carregando…</p></div>;
  if (session === null) return <div className="container"><BrandBar /><AuthForm /></div>;

  if (denied) {
    return (
      <div className="container stack">
        <BrandBar />
        <div className="card stack">
          <h2>Acesso restrito</h2>
          <p className="muted" style={{ margin: 0 }}>
            Esta conta não é administradora da plataforma. Entre com a conta de administrador.
          </p>
          <div>
            <button className="btn btn-small" onClick={() => supabaseBrowser().auth.signOut()}>
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rows = (shops ?? []).map((s) => ({ s, state: shopState(s.status, s.paid_until) }));
  const pending = rows.filter((r) => r.state === "pending");
  const others = rows.filter((r) => r.state !== "pending");

  return (
    <div className="container stack">
      <BrandBar />
      <div className="row between">
        <h1 className="admin-title">Administração</h1>
        <button className="btn btn-small" onClick={() => supabaseBrowser().auth.signOut()}>
          Sair
        </button>
      </div>

      <details className="card">
        <summary>
          <strong>Alterar a minha senha de administrador</strong>
        </summary>
        <div style={{ marginTop: 14 }}>
          <PasswordForm />
        </div>
      </details>

      {error && <p className="error" role="alert">{error}</p>}
      {!shops && !error && <p className="muted">Carregando…</p>}

      {shops && (
        <div className="admin-stats">
          <div><strong>{pending.length}</strong><span>aguardando</span></div>
          <div><strong>{rows.filter((r) => r.state === "open").length}</strong><span>no ar</span></div>
          <div><strong>{rows.filter((r) => r.state === "expired").length}</strong><span>vencidas</span></div>
          <div><strong>{rows.filter((r) => r.state === "suspended").length}</strong><span>suspensas</span></div>
        </div>
      )}

      {shops && pending.length > 0 && <h2>Aguardando liberação</h2>}
      {pending.map(({ s, state }) => (
        <ShopCard key={s.id} s={s} state={state} busy={busyId === s.id} act={act} />
      ))}

      {shops && <h2>Barbearias</h2>}
      {shops && others.length === 0 && <p className="muted">Nenhuma barbearia liberada ainda.</p>}
      {others.map(({ s, state }) => (
        <ShopCard key={s.id} s={s} state={state} busy={busyId === s.id} act={act} />
      ))}
    </div>
  );
}

function ShopCard({
  s,
  state,
  busy,
  act,
}: {
  s: AdminShop;
  state: ShopState;
  busy: boolean;
  act: (shopId: string, action: string, extra?: Record<string, unknown>) => Promise<void>;
}) {
  const [note, setNote] = useState(s.admin_note ?? "");
  const [days, setDays] = useState("30");
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");
  const [withAccounts, setWithAccounts] = useState(false);
  const [newPw, setNewPw] = useState("");
  const created = formatDateBR(s.created_at.slice(0, 10));

  return (
    <div className="card stack admin-shop">
      <div className="row between">
        <div>
          <h3 style={{ margin: 0 }}>{s.name}</h3>
          <div className="muted">
            /{s.slug} · {s.owner_email || "sem e-mail"}
          </div>
        </div>
        <span className={`badge ${BADGE[state]}`}>{LABEL[state]}</span>
      </div>

      <p className="muted" style={{ margin: 0 }}>
        Cadastro em {created} · {s.barbers_total} barbeiro(s), {s.barbers_ready} pronto(s) para receber · {s.bookings_30d}{" "}
        agendamento(s) pagos em 30 dias ·{" "}
        {s.plan ? `plano ${s.plan} · ` : ""}
        {s.paid_until ? `vence em ${formatDateBR(s.paid_until)}` : "sem vencimento"}
      </p>

      <div className="row">
        {state === "pending" && (
          <button className="btn btn-primary btn-small" disabled={busy} onClick={() => act(s.id, "approve", { days: Number(days) })}>
            Liberar por {days} dias
          </button>
        )}
        {state === "pending" && (
          <button className="btn btn-small" disabled={busy} onClick={() => act(s.id, "approve", { days: Number(days), trial: true })}>
            Liberar teste de {days} dias
          </button>
        )}
        {state !== "pending" && (
          <button className="btn btn-primary btn-small" disabled={busy} onClick={() => act(s.id, "add_days", { days: Number(days) })}>
            Renovar +{days} dias
          </button>
        )}
        <label className="admin-days">
          dias
          <input
            type="number"
            min={1}
            max={366}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            aria-label="Quantidade de dias"
          />
        </label>
        {(state === "open" || state === "expired") && (
          <button className="btn btn-small" disabled={busy} onClick={() => act(s.id, "suspend")}>
            Suspender
          </button>
        )}
        {(state === "suspended" || state === "pending") && (
          <button className="btn btn-small" disabled={busy} onClick={() => act(s.id, state === "pending" ? "suspend" : "reactivate")}>
            {state === "pending" ? "Recusar" : "Reativar"}
          </button>
        )}
        <a className="btn btn-small" href={`/${s.slug}`} target="_blank" rel="noreferrer">
          Ver página
        </a>
        <button
          className="btn btn-small"
          disabled={busy}
          onClick={() => act(s.id, "set_paid_until", { date: "" })}
          title="Remove a data de vencimento"
        >
          Sem vencimento
        </button>
      </div>

      <div className="row">
        <input
          className="admin-note"
          maxLength={200}
          placeholder="Anotação (ex.: pagou via Pix em 05/11)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Anotação"
        />
        <button className="btn btn-small" disabled={busy || note === (s.admin_note ?? "")} onClick={() => act(s.id, "note", { note })}>
          Salvar anotação
        </button>
      </div>

      <details>
        <summary className="muted">Definir uma nova senha para o dono desta barbearia</summary>
        <div className="row" style={{ marginTop: 10 }}>
          <input
            type="text"
            className="admin-note"
            minLength={8}
            maxLength={72}
            autoComplete="off"
            placeholder="Nova senha (mínimo 8 caracteres)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            aria-label="Nova senha do dono"
          />
          <button
            className="btn btn-small"
            disabled={busy || newPw.length < 8}
            onClick={async () => {
              if (!window.confirm(`Trocar a senha de ${s.owner_email || "o dono"}? A senha antiga deixa de funcionar.`)) return;
              await act(s.id, "set_password", { password: newPw });
              setNewPw("");
            }}
          >
            Trocar senha
          </button>
        </div>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Combine a senha nova com o dono por um canal seguro (WhatsApp) e peça para ele trocá-la em “Alterar minha senha”.
        </p>
      </details>

      {!deleting ? (
        <div>
          <button className="btn btn-small btn-danger" onClick={() => setDeleting(true)}>
            Excluir barbearia
          </button>
        </div>
      ) : (
        <div className="danger-box stack">
          <p style={{ margin: 0 }}>
            <strong>Isso apaga para sempre</strong> a barbearia, os barbeiros, serviços, horários, agendamentos e fotos.
            Se ela só parou de pagar, prefira <strong>Suspender</strong>.
          </p>
          <label htmlFor={`del-${s.id}`}>
            Para confirmar, digite o endereço: <code>{s.slug}</code>
          </label>
          <input id={`del-${s.id}`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          <label className="check">
            <input type="checkbox" checked={withAccounts} onChange={(e) => setWithAccounts(e.target.checked)} />
            Apagar também os logins do dono e dos barbeiros (contas de administrador nunca são apagadas)
          </label>
          <div className="row">
            <button
              className="btn btn-small btn-danger"
              disabled={busy || typed.trim().toLowerCase() !== s.slug}
              onClick={() => act(s.id, "delete", { confirm: typed, deleteAccounts: withAccounts })}
            >
              Excluir definitivamente
            </button>
            <button
              className="btn btn-small"
              onClick={() => {
                setDeleting(false);
                setTyped("");
                setWithAccounts(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
