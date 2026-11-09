"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { formatBRL } from "@/lib/time";

type Info = {
  status: "pending" | "confirmed" | "expired" | "conflict" | "cancelled";
  serviceName: string;
  barberName: string;
  when: string;
  amountCents: number;
  priceCents: number;
  canCancel?: boolean;
  cancelHours?: number;
};

function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="sheet-wrap">
      <div className="sheet stack">{children}</div>
    </div>
  );
}

/** Página para onde o cliente volta depois de pagar no Mercado Pago (cartão). */
export default function PagamentoPage() {
  const { id } = useParams<{ id: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [failed, setFailed] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");

  async function cancel() {
    if (!window.confirm("Cancelar este horário? O sinal será devolvido.")) return;
    setCancelBusy(true);
    setCancelMsg("");
    try {
      const res = await fetch(`/api/booking/${id}/cancel`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) setInfo((i) => (i ? { ...i, status: "cancelled", canCancel: false } : i));
      else setCancelMsg(json.error ?? "Não foi possível cancelar.");
    } catch {
      setCancelMsg("Sem conexão. Tente novamente.");
    } finally {
      setCancelBusy(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    let stop = false;
    async function check() {
      try {
        const res = await fetch(`/api/booking/${id}`);
        if (!res.ok) {
          if (!stop) setFailed(true);
          return;
        }
        const json = (await res.json()) as Info;
        if (!stop) setInfo(json);
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }
    void check();
    const timer = setInterval(() => {
      if (info?.status && info.status !== "pending") return;
      void check();
    }, 3000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [id, info?.status]);

  if (failed) {
    return (
      <div className="container stack-lg">
        <header className="hero">
          <h1>Agendamento não encontrado</h1>
          <p>Confira o link ou fale com a barbearia.</p>
          <div className="rule" />
        </header>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="container stack-lg">
        <header className="hero">
          <h1>Verificando o pagamento</h1>
          <div className="rule" />
        </header>
      </div>
    );
  }

  const rest = info.priceCents - info.amountCents;

  let content: ReactNode;
  if (info.status === "confirmed") {
    content = (
      <>
        <div className="seal" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>Horário confirmado</h2>
        <p>
          <strong>{info.serviceName}</strong> com {info.barberName}
          <br />
          {info.when}
        </p>
        <p className="muted">
          Pagamento de {formatBRL(info.amountCents)} recebido.
          {rest > 0 ? ` Você paga o restante (${formatBRL(rest)}) na barbearia.` : ""}
        </p>
        {info.canCancel ? (
          <div className="stack">
            <button className="btn" onClick={() => void cancel()} disabled={cancelBusy}>
              {cancelBusy ? "Cancelando…" : "Cancelar e receber o sinal de volta"}
            </button>
            <p className="muted">Disponível até {info.cancelHours} horas antes do horário.</p>
          </div>
        ) : (
          <p className="muted">Para cancelar ou remarcar agora, fale com a barbearia.</p>
        )}
        {cancelMsg && <p className="error">{cancelMsg}</p>}
      </>
    );
  } else if (info.status === "conflict") {
    content = (
      <>
        <h2>Pagamento recebido, mas o horário foi ocupado</h2>
        <p>O barbeiro foi avisado e vai devolver o valor ou combinar um novo horário com você.</p>
      </>
    );
  } else if (info.status === "cancelled") {
    content = (
      <>
        <h2>Agendamento cancelado</h2>
        <p className="muted">O horário foi liberado e o sinal foi devolvido pelo mesmo meio de pagamento (pode levar alguns dias para aparecer na fatura ou na conta).</p>
      </>
    );
  } else if (info.status === "expired") {
    content = (
      <>
        <h2>Esse horário foi liberado</h2>
        <p className="muted">
          Se você pagou e o valor foi cobrado, o barbeiro será avisado e entrará em contato. Se não pagou, faça um novo
          agendamento.
        </p>
      </>
    );
  } else {
    content = (
      <>
        <h2>Aguardando a confirmação do pagamento</h2>
        <p className="muted">
          {info.serviceName} com {info.barberName}, {info.when}. Esta tela atualiza sozinha quando o cartão for
          aprovado.
        </p>
      </>
    );
  }

  return (
    <div className="container stack-lg">
      <header className="hero">
        <h1>Seu agendamento</h1>
        <div className="rule" />
      </header>
      <Sheet>{content}</Sheet>
    </div>
  );
}
