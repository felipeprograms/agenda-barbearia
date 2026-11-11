"use client";

import { useEffect, useState, type ReactNode } from "react";

export type WizardStep = {
  id: string;
  title: string;

  info: string;
  content: ReactNode;

  onConfirm?: () => Promise<string | null>;
};

export default function Wizard({
  title,
  steps,
  onClose,
}: {
  title: string;
  steps: WizardStep[];

  onClose: (finished: boolean) => void;
}) {
  const [i, setI] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const step = steps[i];
  const last = i === steps.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function go(n: number) {
    setError("");
    setShowInfo(false);
    if (n >= steps.length) return onClose(true);
    setI(Math.max(0, n));
  }

  async function confirm() {
    setError("");
    if (step.onConfirm) {
      setBusy(true);
      const err = await step.onConfirm();
      setBusy(false);
      if (err) return setError(err);
    }
    go(i + 1);
  }

  return (
    <div className="wz-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="wz" role="dialog" aria-modal="true" aria-labelledby="wz-title">
        <div className="wz-top">
          <span className="wz-kicker">
            {title} · passo {i + 1} de {steps.length}
          </span>
          <button className="wz-x" type="button" aria-label="Fechar e fazer depois" onClick={() => onClose(false)}>
            ×
          </button>
        </div>
        <div className="wz-bar" aria-hidden="true">
          <span style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="wz-body">
          <div className="wz-title-row">
            <h2 id="wz-title">{step.title}</h2>
            <button
              className="wz-i"
              type="button"
              aria-expanded={showInfo}
              aria-label="O que é este passo?"
              onClick={() => setShowInfo((v) => !v)}
            >
              i
            </button>
          </div>
          {showInfo && <p className="wz-info">{step.info}</p>}
          <div className="wz-content stack">{step.content}</div>
          {error && <p className="error" role="alert">{error}</p>}
        </div>

        <div className="wz-foot">
          <button className="btn btn-small" type="button" disabled={i === 0 || busy} onClick={() => go(i - 1)}>
            Voltar
          </button>
          <button className="btn btn-small" type="button" disabled={busy} onClick={() => (last ? onClose(false) : go(i + 1))}>
            Fazer depois
          </button>
          <button className="btn btn-primary" type="button" disabled={busy} onClick={confirm}>
            {busy ? "Salvando…" : last ? "Concluir" : "Está certo, continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
