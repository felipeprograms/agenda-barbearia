"use client";

import { useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

/** Define uma senha nova para a conta que está logada (também usada depois do link "esqueci minha senha"). */
export default function PasswordForm({ onDone }: { onDone?: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);
    if (pw.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (pw !== pw2) return setError("As duas senhas não são iguais.");
    setBusy(true);
    const { error: err } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (err) {
      setError(
        /same|different/i.test(err.message)
          ? "Escolha uma senha diferente da atual."
          : "Não foi possível trocar a senha. Entre de novo e tente outra vez.",
      );
      return;
    }
    setPw("");
    setPw2("");
    setOk(true);
    onDone?.();
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div>
        <label htmlFor="new-pw">Nova senha (mínimo 8 caracteres)</label>
        <input id="new-pw" type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>
      <div>
        <label htmlFor="new-pw2">Repita a nova senha</label>
        <input id="new-pw2" type="password" required minLength={8} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {ok && <p className="ok">Senha alterada com sucesso!</p>}
      <div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Salvando…" : "Salvar nova senha"}
        </button>
      </div>
    </form>
  );
}
