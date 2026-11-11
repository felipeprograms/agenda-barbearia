"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { copyText, postAuthed, type Barber, type ShopBasic } from "@/lib/panelUtils";
import { isShopOpen } from "@/lib/shopStatus";
import { Hours, PhotoCard, Services } from "./BarberSection";

type Row = { name: string; me: boolean };

export default function TeamSection({
  shop,
  myUserId,
  onChange,
}: {
  shop: ShopBasic;
  myUserId: string;
  onChange: () => void;
}) {
  const [team, setTeam] = useState<Barber[]>([]);
  const [rows, setRows] = useState<Row[]>([{ name: "", me: false }]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = isShopOpen(shop.status, shop.paid_until);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("barbers").select("*").eq("shop_id", shop.id).order("created_at");
    setTeam((data ?? []) as Barber[]);
  }, [shop.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasMe = team.some((b) => b.user_id === myUserId);
  const meTaken = hasMe || rows.some((r) => r.me);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((list) => list.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await postAuthed("/api/painel/team", { barbers: rows.map((r) => ({ name: r.name, me: r.me })) });
    setBusy(false);
    if (result.ok) {
      const n = Number(result.data?.created ?? rows.length);
      setMsg({ ok: true, text: n === 1 ? "Barbeiro cadastrado!" : `${n} barbeiros cadastrados!` });
      setRows([{ name: "", me: false }]);
      await load();
      onChange();
    } else {
      setMsg({ ok: false, text: result.error ?? "Não foi possível salvar." });
    }
  }

  async function toggle(b: Barber) {
    await supabaseBrowser().from("barbers").update({ active: !b.active }).eq("id", b.id);
    await load();
  }

  return (
    <div className="card stack">
      <div>
        <h2>Barbeiros da barbearia</h2>
        <p className="muted">
          Cadastre aqui quem atende na sua barbearia. Se você também atende, marque “Este barbeiro sou eu”. Cada barbeiro
          pode ser ativado ou desativado a qualquer momento e só aparece para os clientes depois de conectar o Mercado
          Pago.
        </p>
      </div>

      <div>
        {team.length === 0 && <p className="muted">Nenhum barbeiro cadastrado ainda.</p>}
        {team.map((b) => (
          <TeamItem
            key={b.id}
            barber={b}
            mine={b.user_id === myUserId}
            expanded={openId === b.id}
            onExpand={() => setOpenId(openId === b.id ? null : b.id)}
            onToggle={() => toggle(b)}
            onChange={async () => {
              await load();
              onChange();
            }}
          />
        ))}
      </div>

      <form className="stack" onSubmit={save}>
        <h3>Adicionar barbeiros</h3>
        {!open && <p className="muted">O cadastro libera quando a barbearia estiver ativa e com a mensalidade em dia.</p>}
        {rows.map((r, i) => (
          <div className="stack" key={i} style={{ gap: 6 }}>
            <div className="row">
              <input
                style={{ flex: 1, minWidth: 180 }}
                required
                minLength={2}
                maxLength={80}
                placeholder={`Nome do barbeiro ${rows.length > 1 ? i + 1 : ""}`.trim()}
                aria-label={`Nome do barbeiro ${i + 1}`}
                value={r.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => setRows((list) => list.filter((_, k) => k !== i))}
                >
                  Remover
                </button>
              )}
            </div>
            {(!meTaken || r.me) && (
              <label className="check">
                <input type="checkbox" checked={r.me} onChange={(e) => setRow(i, { me: e.target.checked })} />
                Este barbeiro sou eu
              </label>
            )}
          </div>
        ))}
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={rows.length >= 20}
            onClick={() => setRows((list) => [...list, { name: "", me: false }])}
          >
            + Adicionar mais um barbeiro
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy || !open}>
            {busy ? "Salvando…" : rows.length > 1 ? "Salvar barbeiros" : "Salvar barbeiro"}
          </button>
        </div>
        {msg && <p className={msg.ok ? "ok" : "error"}>{msg.text}</p>}
      </form>
    </div>
  );
}

function TeamItem({
  barber,
  mine,
  expanded,
  onExpand,
  onToggle,
  onChange,
}: {
  barber: Barber;
  mine: boolean;
  expanded: boolean;
  onExpand: () => void;
  onToggle: () => void;
  onChange: () => void;
}) {
  return (
    <div className="stack" style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 12, marginBottom: 12 }}>
      <div className="row between">
        <div className="row">
          <span className="avatar" aria-hidden="true">
            {barber.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={barber.photo_url} alt="" />
            ) : (
              barber.name.trim().slice(0, 1).toUpperCase()
            )}
          </span>
          <div>
            <strong>{barber.name}</strong> {mine && <span className="badge">você</span>}{" "}
            {!barber.active && <span className="badge warn">desativado</span>}
            <div>
              <span className={`badge ${barber.mp_connected ? "ok" : "warn"}`}>
                {barber.mp_connected ? "Pagamento ativo" : "falta conectar Mercado Pago"}
              </span>{" "}
              <span className={`badge ${barber.telegram_chat_id ? "ok" : ""}`}>
                {barber.telegram_chat_id ? "Telegram ligado" : "sem Telegram"}
              </span>
            </div>
          </div>
        </div>
        <div className="row">
          <button className="btn btn-small" onClick={onToggle}>
            {barber.active ? "Desativar" : "Ativar"}
          </button>
          {!mine && (
            <button className="btn btn-small" onClick={onExpand}>
              {expanded ? "Fechar" : "Configurar"}
            </button>
          )}
        </div>
      </div>
      {mine && <p className="muted" style={{ margin: 0 }}>Você configura o seu próprio cadastro na área “{barber.name}”, mais abaixo.</p>}
      {expanded && !mine && <ManagedEditor barber={barber} onChange={onChange} />}
    </div>
  );
}

function ManagedEditor({ barber, onChange }: { barber: Barber; onChange: () => void }) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = barber.connect_token ? `${origin}/conectar/${barber.connect_token}` : "";
  const text = `Olá, ${barber.name}! Para receber os agendamentos, abra este link e conecte o seu Mercado Pago e o Telegram: ${link}`;

  async function changeDeposit(value: number) {
    await supabaseBrowser().from("barbers").update({ deposit_percent: value }).eq("id", barber.id);
    onChange();
  }

  async function saveToken(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await postAuthed("/api/painel/token", { token, barberId: barber.id });
    setBusy(false);
    if (r.ok) {
      setToken("");
      setMsg({ ok: true, text: "Mercado Pago conectado!" });
      onChange();
    } else setMsg({ ok: false, text: r.error ?? "Erro ao salvar." });
  }

  return (
    <div className="stack" style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 14 }}>
      <PhotoCard barber={barber} onChange={onChange} />

      <div className="stack">
        <h3>Conexão do barbeiro (Mercado Pago e Telegram)</h3>
        <p className="muted" style={{ margin: 0 }}>
          Envie este link para {barber.name}. Sem criar conta, ele conecta o próprio Mercado Pago (o dinheiro cai direto
          na conta dele) e o Telegram (aviso de cada agendamento).
        </p>
        <div className="code">{link}</div>
        <div className="row">
          <button
            className="btn btn-small"
            onClick={async () => {
              if (await copyText(text)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            {copied ? "Copiado!" : "Copiar mensagem com o link"}
          </button>
          <button className="btn btn-small" onClick={onChange}>
            Atualizar situação
          </button>
        </div>
        <details>
          <summary className="muted">Avançado: colar o Access Token do barbeiro</summary>
          <form className="stack" onSubmit={saveToken} style={{ marginTop: 10 }}>
            <input
              type="password"
              autoComplete="off"
              placeholder="APP_USR-..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            <div>
              <button className="btn btn-small" type="submit" disabled={busy}>
                {busy ? "Conferindo…" : "Salvar token"}
              </button>
            </div>
          </form>
        </details>
        {msg && <p className={msg.ok ? "ok" : "error"}>{msg.text}</p>}
      </div>

      <div className="stack">
        <h3>Sinal cobrado</h3>
        <select value={barber.deposit_percent} onChange={(e) => changeDeposit(Number(e.target.value))}>
          {[10, 20, 30, 40, 50, 70, 100].map((p) => (
            <option key={p} value={p}>
              {p === 100 ? "100% (pagamento total)" : `${p}%`}
            </option>
          ))}
        </select>
      </div>

      <Services barber={barber} />
      <Hours barber={barber} />
    </div>
  );
}
