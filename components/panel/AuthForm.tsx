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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    const auth = supabaseBrowser().auth;
    if (mode === "login") {
      const { error: err } = await auth.signInWithPassword({ email, password });
      if (err) setError("E-mail ou senha incorretos.");
    } else {
      const { data, error: err } = await auth.signUp({ email, password });
      if (err) setError(err.message);
      else if (!data.session) setInfo("Enviamos um e-mail de confirmação. Confirme e depois entre.");
    }
    setBusy(false);
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
          <label htmlFor="password">Senha (mínimo 6 caracteres)</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <div>
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </div>
      </form>
    </div>
  );
}
