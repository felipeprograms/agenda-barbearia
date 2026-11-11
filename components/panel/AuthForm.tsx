"use client";

import { useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import Captcha, { CAPTCHA_SITE_KEY } from "@/components/Captcha";

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const needCaptcha = Boolean(CAPTCHA_SITE_KEY);

  async function callAuth(payload: Record<string, unknown>) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, captchaToken: captcha || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    } catch {
      return { ok: false, status: 0, json: { error: "Sem conexão. Tente novamente." } };
    } finally {

      if (needCaptcha) setCaptchaReset((n) => n + 1);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (mode === "signup" && !accepted) return setError("Marque que você leu e aceita os Termos e a Política de privacidade.");
    if (needCaptcha && !captcha) return setError("Marque a caixa “Não sou um robô” e tente de novo.");
    setBusy(true);
    const r = await callAuth({ action: mode, email, password, acceptTerms: mode === "signup" ? accepted : undefined });
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
    if (needCaptcha && !captcha) return setError("Marque a caixa “Não sou um robô” e tente de novo.");
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
        {mode === "signup" && (
          <label className="row" style={{ alignItems: "flex-start", gap: 8, fontWeight: 400 }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ width: "auto", marginTop: 4 }} />
            <span>
              Li e aceito os <a href="/termos" target="_blank" rel="noreferrer">Termos de uso</a> e a{" "}
              <a href="/privacidade" target="_blank" rel="noreferrer">Política de privacidade</a>.
            </span>
          </label>
        )}
        <Captcha onToken={setCaptcha} resetKey={captchaReset} />
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
