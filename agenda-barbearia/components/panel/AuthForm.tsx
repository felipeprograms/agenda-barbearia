"use client";

import { useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  /** Chama /api/auth e devolve { ok, json, wait } (wait = segundos de espera quando bloqueado por limite). */
  async function callAuth(payload: Record<string, unknown>) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    } catch {
      return { ok: false, status: 0, json: { error: "Sem conexão. Tente novamente." } };
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    const r = await callAuth({ action: mode, email, password });
    if (!r.ok) {
      setError(r.json.error ?? "Não foi possível continuar.");
    } else if (r.json.session) {
      await supabaseBrowser().auth.setSession(r.json.session);
    } else if (r.json.needsConfirm) {
      setInfo("Enviamos um e-mail de confirmação. Abra o link dele e depois entre.");
    }
    setBusy(false);
  }

  async function forgot() {
    setError("");
    setInfo("");
    if (!email) return setError("Digite o seu e-mail acima e toque em “Esqueci minha senha” de novo.");
    setBusy(true);
    const r = await callAuth({ action: "reset", email });
    setBusy(false);
    if (r.ok) setInfo("Se este e-mail tiver conta, enviamos um link para criar uma nova senha. Olhe também o spam.");
    else setError(r.json.error ?? "Não foi possível enviar o e-mail agora.");
  }

  return (
    <div className="card stack">
      <h1>Painel</h1>
      <div className="tabs">
        <button className={`btn ${mode === "login" ? "on" : ""}`} onClick={() => setMode("login")} type="button">
          Entrar
        </button>
        <button className={`btn ${mode === "signup" ? "on" : ""}`} onClick={() => setMode("signup")} type="button">
          Criar conta
        </button>
      </div>
      <form className="stack" onSubmit={submit}>
        <div>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password">Senha (mínimo 8 caracteres)</label>
          <input
            id="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : 1}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <div className="row">
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
          {mode === "login" && (
            <button className="btn-link" type="button" onClick={forgot} disabled={busy}>
              Esqueci minha senha
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
