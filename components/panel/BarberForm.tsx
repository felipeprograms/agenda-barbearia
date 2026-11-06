"use client";

import { useState, type FormEvent } from "react";
import { postAuthed, slugify } from "@/lib/panelUtils";

/**
 * Cadastro de barbeiro.
 *  - invite = true: o barbeiro entra numa barbearia usando o código de convite;
 *  - invite = false: o dono da barbearia cria o próprio cadastro de barbeiro.
 */
export default function BarberForm({ invite, onDone }: { invite: boolean; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await postAuthed("/api/painel/barber", {
      name,
      slug,
      ...(invite ? { code } : {}),
    });
    setBusy(false);
    if (result.ok) onDone();
    else setError(result.error ?? "Erro ao salvar.");
  }

  return (
    <form className="stack" onSubmit={submit}>
      {invite && (
        <div>
          <label htmlFor="code">Código de convite (enviado pelo dono da barbearia)</label>
          <input id="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC123DEF456" />
        </div>
      )}
      <div>
        <label htmlFor="bname">Seu nome</label>
        <input
          id="bname"
          required
          minLength={2}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </div>
      <div>
        <label htmlFor="bslug">Apelido do seu link (letras minúsculas, números e hífen)</label>
        <input
          id="bslug"
          required
          minLength={2}
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Salvando…" : invite ? "Entrar na barbearia" : "Criar meu cadastro de barbeiro"}
        </button>
      </div>
    </form>
  );
}
