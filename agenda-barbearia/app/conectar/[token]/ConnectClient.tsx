"use client";

import { useState } from "react";

export default function ConnectClient({
  token,
  mpConnected,
  telegramConnected,
  telegramCode,
  botUsername,
  result,
}: {
  token: string;
  mpConnected: boolean;
  telegramConnected: boolean;
  telegramCode: string;
  botUsername: string;
  result: "ok" | "erro" | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connectMp() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && typeof json.url === "string") {
        window.location.href = json.url;
        return;
      }
      setError(json.error ?? "Não foi possível iniciar a conexão.");
    } catch {
      setError("Sem conexão. Tente novamente.");
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      {result === "ok" && <p className="ok">Mercado Pago conectado com sucesso!</p>}
      {result === "erro" && <p className="error">Não foi possível conectar o Mercado Pago. Tente de novo.</p>}

      <div>
        <h3>
          1. Mercado Pago{" "}
          <span className={`badge ${mpConnected ? "ok" : "warn"}`}>{mpConnected ? "conectado" : "não conectado"}</span>
        </h3>
        <p className="muted">
          Os pagamentos dos clientes (Pix e cartão) caem direto na sua conta. Toque no botão, entre no Mercado Pago com o
          seu login e autorize. Você volta para esta página.
        </p>
        <button className="btn btn-primary" type="button" onClick={connectMp} disabled={busy}>
          {busy ? "Abrindo…" : mpConnected ? "Reconectar Mercado Pago" : "Conectar Mercado Pago"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      <div>
        <h3>
          2. Telegram{" "}
          <span className={`badge ${telegramConnected ? "ok" : "warn"}`}>
            {telegramConnected ? "conectado" : "não conectado"}
          </span>
        </h3>
        <p className="muted">É por ele que você recebe o aviso de cada novo agendamento.</p>
        {botUsername ? (
          <div className="row">
            <a
              className="btn btn-primary"
              href={`https://t.me/${botUsername}?start=${telegramCode}`}
              target="_blank"
              rel="noreferrer"
            >
              {telegramConnected ? "Reconectar Telegram" : "Conectar Telegram"}
            </a>
            <button className="btn" type="button" onClick={() => window.location.reload()}>
              Já conectei, atualizar
            </button>
          </div>
        ) : (
          <p className="error">O bot do Telegram ainda não foi configurado no servidor.</p>
        )}
      </div>
    </div>
  );
}
