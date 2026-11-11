"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { removePhoto, uploadPhoto } from "@/lib/photos";
import { WEEKDAYS, copyText, postAuthed, reaisToCents, type Barber, type ShopBasic } from "@/lib/panelUtils";
import { formatBRL, formatDateTimeBR } from "@/lib/time";

export default function BarberSection({
  barber,
  shop,
  onChange,
}: {
  barber: Barber;
  shop: ShopBasic | null;
  onChange: () => void;
}) {
  const [copied, setCopied] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const directLink = shop ? `${origin}/${shop.slug}/${barber.slug}` : "";

  async function flash(label: string, text: string) {
    if (await copyText(text)) {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    }
  }

  return (
    <div className="stack">
      <div className="card stack">
        <div>
          <h2>
            {barber.name} {shop ? <span className="muted">· {shop.name}</span> : null}
          </h2>
          {!barber.mp_connected && (
            <p className="error">
              Você só aparece na página de agendamento depois de conectar o seu Mercado Pago (abaixo).
            </p>
          )}
        </div>
        {shop && (
          <div>
            <p className="muted">Seu link direto (opcional, para divulgar só o seu agendamento):</p>
            <div className="code">{directLink}</div>
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-small" onClick={() => flash("direct", directLink)}>
                {copied === "direct" ? "Copiado!" : "Copiar link"}
              </button>
            </div>
          </div>
        )}
      </div>

      <PhotoCard barber={barber} onChange={onChange} />
      <Integrations barber={barber} onChange={onChange} />
      <Services barber={barber} />
      <Hours barber={barber} />
      <Bookings barber={barber} />
    </div>
  );
}

export function Integrations({ barber, onChange }: { barber: Barber; onChange: () => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("mp");
    if (r === "ok") setMsg({ ok: true, text: "Mercado Pago conectado com sucesso!" });
    if (r === "erro") setMsg({ ok: false, text: "Não foi possível conectar o Mercado Pago. Tente de novo." });
    if (r) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function connectOneClick() {
    setBusy(true);
    setMsg(null);
    const result = await postAuthed("/api/painel/mp/connect", {});
    const url = typeof result.data?.url === "string" ? result.data.url : "";
    if (result.ok && url) {
      window.location.href = url;
      return;
    }
    setBusy(false);
    setMsg({ ok: false, text: result.error ?? "Não foi possível iniciar a conexão." });
  }

  async function saveToken(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await postAuthed("/api/painel/token", { token });
    setBusy(false);
    if (result.ok) {
      setToken("");
      setMsg({ ok: true, text: "Mercado Pago conectado!" });
      onChange();
    } else {
      setMsg({ ok: false, text: result.error ?? "Erro ao salvar." });
    }
  }

  async function changeDeposit(value: number) {
    await supabaseBrowser().from("barbers").update({ deposit_percent: value }).eq("id", barber.id);
    onChange();
  }

  return (
    <div className="card stack">
      <h2>Pagamento e avisos</h2>

      <div>
        <h3>
          Mercado Pago{" "}
          <span className={`badge ${barber.mp_connected ? "ok" : "warn"}`}>
            {barber.mp_connected ? "conectado" : "não conectado"}
          </span>
        </h3>
        <p className="muted">
          Os pagamentos dos seus clientes (Pix e cartão) caem direto na sua conta do Mercado Pago. Clique no botão, entre
          com o seu login do Mercado Pago e toque em autorizar. Você volta para cá já conectado.
        </p>
        <div>
          <button className="btn btn-primary" disabled={busy} type="button" onClick={connectOneClick}>
            {busy ? "Abrindo…" : barber.mp_connected ? "Reconectar com Mercado Pago" : "Conectar com Mercado Pago"}
          </button>
        </div>
        {msg && <p className={msg.ok ? "ok" : "error"}>{msg.text}</p>}
        <details style={{ marginTop: 12 }}>
          <summary className="muted">Avançado: colar o Access Token manualmente</summary>
          <form className="stack" onSubmit={saveToken} style={{ marginTop: 10 }}>
            <p className="muted" style={{ margin: 0 }}>
              Cole o Access Token de produção da sua aplicação (Mercado Pago Developers, em “Suas integrações”). Ele fica
              guardado no servidor e não aparece mais na tela.
            </p>
            <input
              type="password"
              autoComplete="off"
              placeholder="APP_USR-..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            <div>
              <button className="btn btn-small" disabled={busy} type="submit">
                {busy ? "Conferindo…" : "Salvar token"}
              </button>
            </div>
          </form>
        </details>
      </div>

      <div>
        <h3>
          Telegram{" "}
          <span className={`badge ${barber.telegram_chat_id ? "ok" : "warn"}`}>
            {barber.telegram_chat_id ? "conectado" : "não conectado"}
          </span>
        </h3>
        <p className="muted">É por ele que você recebe o aviso de cada novo agendamento.</p>
        {bot ? (
          <div className="row">
            <a
              className="btn btn-primary"
              href={`https://t.me/${bot}?start=${barber.telegram_code}`}
              target="_blank"
              rel="noreferrer"
            >
              {barber.telegram_chat_id ? "Reconectar Telegram" : "Conectar Telegram"}
            </a>
            <button className="btn" onClick={onChange}>
              Já conectei, atualizar
            </button>
          </div>
        ) : (
          <p className="error">O bot do Telegram ainda não foi configurado no servidor.</p>
        )}
      </div>

      <div>
        <h3>Sinal cobrado no agendamento</h3>
        <p className="muted">O cliente paga esse percentual do serviço pelo Pix; o restante é pago na barbearia.</p>
        <select value={barber.deposit_percent} onChange={(e) => changeDeposit(Number(e.target.value))}>
          {[10, 20, 30, 40, 50, 70, 100].map((p) => (
            <option key={p} value={p}>
              {p === 100 ? "100% (pagamento total)" : `${p}%`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

type Service = { id: string; name: string; price_cents: number; duration_min: number };

export function Services({ barber }: { barber: Barber }) {
  const [items, setItems] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", price: "", duration: "30" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser()
      .from("services")
      .select("id,name,price_cents,duration_min")
      .eq("barber_id", barber.id)
      .eq("active", true)
      .order("name");
    setItems((data ?? []) as Service[]);
  }, [barber.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    const cents = reaisToCents(form.price);
    const duration = Number(form.duration);
    if (!Number.isFinite(cents) || cents < 100) return setError("Informe um preço de pelo menos R$ 1,00.");
    if (!Number.isInteger(duration) || duration < 10 || duration > 240) {
      return setError("A duração deve ficar entre 10 e 240 minutos.");
    }
    const { error: err } = await supabaseBrowser().from("services").insert({
      barber_id: barber.id,
      name: form.name.trim(),
      price_cents: cents,
      duration_min: duration,
    });
    if (err) return setError("Não foi possível salvar o serviço.");
    setForm({ name: "", price: "", duration: "30" });
    await load();
  }

  async function remove(id: string) {

    await supabaseBrowser().from("services").update({ active: false }).eq("id", id);
    await load();
  }

  return (
    <div className="card stack">
      <h2>Serviços</h2>
      <div>
        {items.length === 0 && <p className="muted">Nenhum serviço ainda.</p>}
        {items.map((s) => (
          <div className="item" key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <div className="muted">
                {formatBRL(s.price_cents)} · {s.duration_min} min
              </div>
            </div>
            <button className="btn btn-small" onClick={() => remove(s.id)}>
              Remover
            </button>
          </div>
        ))}
      </div>
      <form className="stack" onSubmit={add}>
        <div>
          <label htmlFor="svc-name">Nome (ex: Corte, Barba)</label>
          <input id="svc-name" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="svc-price">Preço (R$)</label>
            <input id="svc-price" required inputMode="decimal" placeholder="35,00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="svc-dur">Duração (min)</label>
            <input id="svc-dur" required inputMode="numeric" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <div>
          <button className="btn btn-primary" type="submit">
            Adicionar serviço
          </button>
        </div>
      </form>
    </div>
  );
}

type Hour = { id: string; weekday: number; start_time: string; end_time: string };

export function Hours({ barber }: { barber: Barber }) {
  const [items, setItems] = useState<Hour[]>([]);
  const [form, setForm] = useState({ weekday: "1", start: "09:00", end: "19:00" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser()
      .from("working_hours")
      .select("id,weekday,start_time,end_time")
      .eq("barber_id", barber.id)
      .order("weekday")
      .order("start_time");
    setItems((data ?? []) as Hour[]);
  }, [barber.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.end <= form.start) return setError("O horário final precisa ser depois do inicial.");
    const { error: err } = await supabaseBrowser().from("working_hours").insert({
      barber_id: barber.id,
      weekday: Number(form.weekday),
      start_time: form.start,
      end_time: form.end,
    });
    if (err) return setError("Não foi possível salvar o horário.");
    await load();
  }

  async function preset() {
    setError("");
    const rows = [1, 2, 3, 4, 5, 6].map((weekday) => ({
      barber_id: barber.id,
      weekday,
      start_time: "09:00",
      end_time: "19:00",
    }));
    const { error: err } = await supabaseBrowser().from("working_hours").insert(rows);
    if (err) setError("Não foi possível salvar os horários.");
    await load();
  }

  async function remove(id: string) {
    await supabaseBrowser().from("working_hours").delete().eq("id", id);
    await load();
  }

  return (
    <div className="card stack">
      <h2>Horários de atendimento</h2>
      <p className="muted">
        Para folga no almoço, cadastre dois intervalos no mesmo dia (ex: 09:00–12:00 e 14:00–19:00).
      </p>
      <div>
        {items.length === 0 && (
          <div className="stack">
            <p className="muted">Nenhum horário cadastrado.</p>
            <div>
              <button className="btn" onClick={preset}>
                Preencher segunda a sábado, 09:00 às 19:00
              </button>
            </div>
          </div>
        )}
        {items.map((h) => (
          <div className="item" key={h.id}>
            <span>
              <strong>{WEEKDAYS[h.weekday]}</strong> · {h.start_time.slice(0, 5)} às {h.end_time.slice(0, 5)}
            </span>
            <button className="btn btn-small" onClick={() => remove(h.id)}>
              Remover
            </button>
          </div>
        ))}
      </div>
      <form className="stack" onSubmit={add}>
        <div className="row">
          <div style={{ flex: 2 }}>
            <label htmlFor="h-day">Dia</label>
            <select id="h-day" value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="h-start">Das</label>
            <input id="h-start" type="time" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="h-end">Às</label>
            <input id="h-end" type="time" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <div>
          <button className="btn btn-primary" type="submit">
            Adicionar horário
          </button>
        </div>
      </form>
    </div>
  );
}

type BookingRow = {
  id: string;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  starts_at: string;
  status: string;
  amount_cents: number;
  price_cents: number;
};

function Bookings({ barber }: { barber: Barber }) {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [cancelling, setCancelling] = useState("");
  const [cancelMsg, setCancelMsg] = useState("");

  async function cancel(b: BookingRow) {
    if (!window.confirm(`Cancelar o horário de ${b.customer_name} e devolver ${formatBRL(b.amount_cents)} pelo Mercado Pago?`)) return;
    setCancelling(b.id);
    setCancelMsg("");
    try {
      const r = await postAuthed("/api/painel/cancel", { bookingId: b.id });
      setCancelMsg(r.ok ? "Cancelado e valor devolvido." : (r.error ?? "Não foi possível cancelar."));
      if (r.ok) await load();
    } finally {
      setCancelling("");
    }
  }

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 2 * 3600_000).toISOString();
    const { data } = await supabaseBrowser()
      .from("bookings")
      .select("id,service_name,customer_name,customer_phone,starts_at,status,amount_cents,price_cents")
      .eq("barber_id", barber.id)
      .in("status", ["confirmed", "conflict"])
      .gte("starts_at", since)
      .order("starts_at");
    setItems((data ?? []) as BookingRow[]);
  }, [barber.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="card stack">
      <div className="row between">
        <h2>Próximos agendamentos</h2>
        <button className="btn btn-small" onClick={() => void load()}>
          Atualizar
        </button>
      </div>
      {cancelMsg && <p className="muted">{cancelMsg}</p>}
      {items.length === 0 && <p className="muted">Nenhum agendamento por enquanto.</p>}
      {items.map((b) => {
        const wa = b.customer_phone.length <= 11 ? `55${b.customer_phone}` : b.customer_phone;
        return (
          <div className="item" key={b.id}>
            <div>
              <strong>{formatDateTimeBR(b.starts_at)}</strong> · {b.service_name}
              <div className="muted">
                {b.customer_name} ·{" "}
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                  {b.customer_phone}
                </a>
              </div>
              <div className="muted">
                Sinal pago: {formatBRL(b.amount_cents)} de {formatBRL(b.price_cents)}
              </div>
            </div>
            <div className="row">
              {b.status === "conflict" && <span className="badge warn">devolver Pix</span>}
              <button className="btn btn-small" disabled={cancelling === b.id} onClick={() => void cancel(b)}>
                {cancelling === b.id ? "Cancelando…" : "Cancelar e devolver sinal"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PhotoCard({ barber, onChange }: { barber: Barber; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const url = await uploadPhoto(file);
      const { error: err } = await supabaseBrowser().from("barbers").update({ photo_url: url }).eq("id", barber.id);
      if (err) throw new Error("Não foi possível salvar a foto. Confira se você rodou o arquivo migracao-vitrine.sql.");
      if (barber.photo_url) await removePhoto(barber.photo_url);
      onChange();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Erro ao enviar a foto.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!barber.photo_url) return;
    await supabaseBrowser().from("barbers").update({ photo_url: null }).eq("id", barber.id);
    await removePhoto(barber.photo_url);
    onChange();
  }

  return (
    <div className="card">
      <div className="row">
        <span className="avatar avatar-lg" aria-hidden="true">
          {barber.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={barber.photo_url} alt="" />
          ) : (
            barber.name.trim().slice(0, 1).toUpperCase()
          )}
        </span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h3>Sua foto</h3>
          <p className="muted" style={{ margin: "0 0 8px" }}>
            Aparece na escolha do barbeiro. Use uma foto de rosto, com boa luz.
          </p>
          <div className="row">
            <label className="btn btn-small file-btn">
              {busy ? "Enviando…" : barber.photo_url ? "Trocar foto" : "Enviar foto"}
              <input type="file" accept="image/*" onChange={onFile} disabled={busy} hidden />
            </label>
            {barber.photo_url && (
              <button type="button" className="btn btn-small" onClick={remove}>
                Remover
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="error" role="alert" style={{ marginTop: 10 }}>{error}</p>}
    </div>
  );
}
