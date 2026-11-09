"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { addDays, formatBRL } from "@/lib/time";
import type { PublicBarber } from "@/lib/shopData";

type PixData = {
  bookingId: string;
  amountCents: number;
  priceCents: number;
  serviceName: string;
  when: string;
  holdExpiresAt: string;
  qrCode: string;
  qrCodeBase64: string;
};

type Status = "pending" | "confirmed" | "expired" | "conflict" | "cancelled";

function dayParts(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(d)
    .replace(".", "");
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "UTC" }).format(d);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
    .format(d)
    .replace(".", "");
  return { weekday, day, month };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function periodOf(time: string) {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "Manhã";
  if (hour < 18) return "Tarde";
  return "Noite";
}

function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="sheet-wrap">
      <div className="sheet">{children}</div>
    </div>
  );
}

type LedgerRow = { label: string; value?: string; onClick?: () => void; active?: boolean };

/** Resumo do que já foi escolhido, no estilo de comanda. Cada linha preenchida pode ser tocada para voltar. */
function Ledger({ rows }: { rows: LedgerRow[] }) {
  return (
    <ul className="ledger">
      {rows.map((r) => (
        <li key={r.label}>
          <button
            type="button"
            className={`ledger-row${r.active ? " active" : ""}`}
            onClick={r.onClick}
            disabled={!r.onClick}
            aria-current={r.active ? "step" : undefined}
          >
            <span className="k">{r.label}</span>
            <span className="dots" aria-hidden="true" />
            <span className={`v${r.value ? "" : " empty"}`}>{r.value ?? "A escolher"}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function BookingFlow({
  shopName,
  barbers,
  today,
  maxDays,
}: {
  shopName: string;
  barbers: PublicBarber[];
  today: string;
  maxDays: number;
}) {
  const [barberId, setBarberId] = useState<string | null>(barbers.length === 1 ? barbers[0].id : null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState("");
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [redirecting, setRedirecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [pix, setPix] = useState<PixData | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  const barber = barbers.find((b) => b.id === barberId) ?? null;
  const service = barber?.services.find((s) => s.id === serviceId) ?? null;
  const maxDate = useMemo(() => addDays(today, maxDays), [today, maxDays]);

  // Mesma conta que o servidor faz: sinal em % do preço, no mínimo R$ 1,00 e no máximo o preço.
  const deposit =
    service && barber
      ? Math.min(service.price_cents, Math.max(100, Math.round((service.price_cents * barber.deposit_percent) / 100)))
      : 0;

  const groups = useMemo(() => {
    const byPeriod: Record<string, string[]> = { Manhã: [], Tarde: [], Noite: [] };
    (slots ?? []).forEach((t) => byPeriod[periodOf(t)].push(t));
    return Object.entries(byPeriod).filter(([, list]) => list.length > 0);
  }, [slots]);

  // Busca os horários livres sempre que barbeiro, serviço ou dia mudam.
  useEffect(() => {
    if (!barberId || !serviceId || !date) return;
    let cancelled = false;
    setSlots(null);
    setSlotsError("");
    fetch(`/api/slots?barber=${barberId}&service=${serviceId}&date=${date}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) setSlotsError(json.error ?? "Não foi possível buscar os horários.");
        else setSlots(json.slots as string[]);
      })
      .catch(() => {
        if (!cancelled) setSlotsError("Sem conexão. Tente novamente.");
      });
    return () => {
      cancelled = true;
    };
  }, [barberId, serviceId, date, slotsVersion]);

  // Depois de gerar o Pix: confere o pagamento a cada 3 segundos.
  useEffect(() => {
    if (!pix || status !== "pending") return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/booking/${pix.bookingId}`);
        if (!res.ok) return;
        const json = (await res.json()) as { status: Status };
        if (json.status !== "pending") setStatus(json.status);
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [pix, status]);

  // Relógio da contagem regressiva.
  useEffect(() => {
    if (!pix || status !== "pending") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pix, status]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId, serviceId, date, time, method, ...form }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível agendar.");
        if (res.status === 409) {
          // Horário foi ocupado por outra pessoa: volta para a escolha de horário.
          setTime(null);
          setSlotsVersion((v) => v + 1);
        }
        return;
      }
      if (json.checkoutUrl) {
        // Cartão: leva o cliente para a página de pagamento do Mercado Pago.
        setRedirecting(true);
        window.location.href = json.checkoutUrl as string;
        return;
      }
      setPix(json as PixData);
      setStatus("pending");
      setNow(Date.now());
    } catch {
      setError("Sem conexão. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  async function copyCode() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* se o navegador bloquear, o cliente pode selecionar o texto manualmente */
    }
  }

  function restart() {
    setPix(null);
    setStatus("pending");
    setTime(null);
    setError("");
    setSlotsVersion((v) => v + 1);
  }

  // ---------- Tela de pagamento / confirmação ----------
  if (pix) {
    const secondsLeft = Math.max(0, Math.floor((new Date(pix.holdExpiresAt).getTime() - now) / 1000));
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const ss = String(secondsLeft % 60).padStart(2, "0");
    const rest = pix.priceCents - pix.amountCents;

    if (status === "confirmed") {
      return (
        <Sheet>
          <div className="stack">
            <div className="seal" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>Horário confirmado</h2>
            <p>
              <strong>{pix.serviceName}</strong> com {barber?.name}
              <br />
              {pix.when}
            </p>
            <p className="muted">
              Pagamento de {formatBRL(pix.amountCents)} recebido.
              {rest > 0 ? ` Você paga o restante (${formatBRL(rest)}) na barbearia.` : ""} Para remarcar, fale
              diretamente com a {shopName}.
            </p>
          </div>
        </Sheet>
      );
    }

    if (status === "conflict") {
      return (
        <Sheet>
          <div className="stack">
            <h2>Pagamento recebido, mas o horário foi ocupado</h2>
            <p>
              Seu Pix chegou depois do prazo e outra pessoa já tinha reservado esse horário. O barbeiro foi avisado e
              vai devolver o valor ou combinar um novo horário com você.
            </p>
          </div>
        </Sheet>
      );
    }

    if (status === "expired" || status === "cancelled") {
      return (
        <Sheet>
          <div className="stack">
            <h2>O tempo para pagar acabou</h2>
            <p>O horário foi liberado. Se você já pagou, o barbeiro será avisado e entrará em contato.</p>
            <div>
              <button className="btn btn-primary" onClick={restart}>
                Escolher outro horário
              </button>
            </div>
          </div>
        </Sheet>
      );
    }

    return (
      <Sheet>
        <div className="stack">
          <div>
            <h2>Pague o sinal para confirmar</h2>
            <p className="muted" style={{ margin: 0 }}>
              {pix.serviceName} com {barber?.name}, {pix.when}
            </p>
          </div>
          <div>
            <div className="amount-big">{formatBRL(pix.amountCents)}</div>
            {rest > 0 ? <p className="muted">Restante de {formatBRL(rest)} na barbearia.</p> : null}
          </div>
          {pix.qrCodeBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="qr" alt="QR Code do Pix" src={`data:image/png;base64,${pix.qrCodeBase64}`} />
          ) : null}
          <div>
            <label>Pix copia e cola</label>
            <div className="code">{pix.qrCode}</div>
          </div>
          <button className="btn btn-primary btn-block" onClick={copyCode}>
            {copied ? "Código copiado" : "Copiar código Pix"}
          </button>
          <div className="row between">
            <span className="muted">Horário reservado por</span>
            <span className="timer">
              {mm}:{ss}
            </span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Quando o pagamento for confirmado, esta tela atualiza sozinha.
          </p>
        </div>
      </Sheet>
    );
  }

  // ---------- Escolhas do agendamento ----------
  const rows: LedgerRow[] = [
    {
      label: "Barbeiro",
      value: barber?.name,
      onClick:
        barber && barbers.length > 1
          ? () => {
              setBarberId(null);
              setServiceId(null);
              setDate(null);
              setTime(null);
            }
          : undefined,
      active: !barber,
    },
    {
      label: "Serviço",
      value: service?.name,
      onClick: service
        ? () => {
            setServiceId(null);
            setDate(null);
            setTime(null);
          }
        : undefined,
      active: !!barber && !service,
    },
    {
      label: "Horário",
      value: date && time ? `${dayParts(date).weekday} ${dayParts(date).day}/${dayParts(date).month} às ${time}` : undefined,
      onClick: time ? () => setTime(null) : undefined,
      active: !!service && !time,
    },
  ];

  return (
    <Sheet>
      <Ledger rows={rows} />

      {service && barber && (
        <div className="totals">
          <div className="t-row">
            <span>Sinal para reservar</span>
            <span className="dots" aria-hidden="true" />
            <span className="amount">{formatBRL(deposit)}</span>
          </div>
          {service.price_cents > deposit && (
            <div className="t-row sub">
              <span>Restante na barbearia</span>
              <span className="dots" aria-hidden="true" />
              <span>{formatBRL(service.price_cents - deposit)}</span>
            </div>
          )}
        </div>
      )}

      {/* 1. Barbeiro */}
      {!barber && (
        <div className="step">
          <h2 className="step-title">Escolha o barbeiro</h2>
          <div className="masters">
            {barbers.map((b) => (
              <button key={b.id} className="master" onClick={() => setBarberId(b.id)}>
                <span className="master-photo">
                  {b.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.photo_url} alt="" />
                  ) : (
                    <span className="master-initials" aria-hidden="true">
                      {initials(b.name)}
                    </span>
                  )}
                </span>
                <span className="master-name">{b.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Serviço */}
      {barber && !service && (
        <div className="step">
          <h2 className="step-title">Escolha o serviço</h2>
          <div className="menu">
            {barber.services.map((s) => (
              <button key={s.id} className="menu-item" onClick={() => setServiceId(s.id)}>
                <span>
                  <span className="name">{s.name}</span>
                  <span className="meta">{s.duration_min} min</span>
                </span>
                <span className="dots" aria-hidden="true" />
                <span className="price">{formatBRL(s.price_cents)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Dia e horário */}
      {barber && service && !time && (
        <div className="step">
          <h2 className="step-title">Escolha o dia e o horário</h2>
          <div>
            <label htmlFor="booking-date">Data do agendamento</label>
            <input
              id="booking-date"
              type="date"
              min={today}
              max={maxDate}
              value={date ?? ""}
              style={{ colorScheme: "dark" }}
              onChange={(e) => {
                const v = e.target.value;
                // Ignora data apagada ou fora do período permitido.
                setDate(v && v >= today && v <= maxDate ? v : null);
              }}
            />
            {date && (
              <p className="muted" style={{ marginTop: 6 }}>
                {dayParts(date).weekday}, {dayParts(date).day} de {dayParts(date).month}
              </p>
            )}
          </div>

          {!date && <p className="muted">Escolha uma data para ver os horários livres.</p>}
          {date && slotsError && <p className="error" role="alert">{slotsError}</p>}
          {date && !slotsError && slots === null && <p className="muted">Carregando horários…</p>}
          {date && slots && slots.length === 0 && (
            <p className="muted">Não há horários livres nesse dia. Escolha outro dia.</p>
          )}
          {date &&
            groups.map(([period, list]) => (
              <div key={period}>
                <div className="period">{period}</div>
                <div className="times">
                  {list.map((t) => (
                    <button key={t} className="time" onClick={() => setTime(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      )}

      {/* 4. Dados do cliente e pagamento */}
      {barber && service && date && time && (
        <form className="step stack" onSubmit={submit}>
          <h2 className="step-title" style={{ marginBottom: 0 }}>
            Seus dados
          </h2>
          <div>
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              required
              minLength={2}
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="phone">WhatsApp, com DDD</label>
            <input
              id="phone"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="71 99999-9999"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="email">E-mail (opcional)</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label id="pay-label">Forma de pagamento</label>
            <div className="pay" role="radiogroup" aria-labelledby="pay-label">
              <button type="button" role="radio" aria-checked={method === "pix"} className="pay-opt" onClick={() => setMethod("pix")}>
                <strong>Pix</strong>
                <span>QR Code ou copia e cola</span>
              </button>
              <button type="button" role="radio" aria-checked={method === "card"} className="pay-opt" onClick={() => setMethod("card")}>
                <strong>Cartão</strong>
                <span>Abre a página segura do Mercado Pago</span>
              </button>
            </div>
          </div>

          <p className="muted" style={{ margin: 0 }}>
            O horário fica reservado por 10 minutos enquanto você paga.
          </p>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={sending || redirecting} type="submit">
            {redirecting
              ? "Abrindo o pagamento…"
              : sending
                ? "Reservando…"
                : method === "card"
                  ? "Reservar e pagar com cartão"
                  : "Reservar e gerar Pix"}
          </button>
        </form>
      )}
    </Sheet>
  );
}
