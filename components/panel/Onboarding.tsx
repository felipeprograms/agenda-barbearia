"use client";

import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { slugify } from "@/lib/panelUtils";
import BarberForm from "./BarberForm";

/** Primeiro acesso: criar uma barbearia (dono) ou entrar numa com código de convite (barbeiro). */
export default function Onboarding({ session, onDone }: { session: Session; onDone: () => void }) {
  const [tab, setTab] = useState<"owner" | "invite">("owner");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createShop(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabaseBrowser()
      .from("shops")
      .insert({ owner_user_id: session.user.id, name: name.trim(), slug });
    setBusy(false);
    if (!err) return onDone();
    if (err.code === "23505") setError("Esse endereço já está em uso. Escolha outro.");
    else if (err.code === "23514") setError("Endereço inválido ou reservado. Use 3 a 40 letras minúsculas, números ou hífen.");
    else setError("Não foi possível criar a barbearia.");
  }

  return (
    <div className="card stack">
      <h1>Bem-vindo!</h1>
      <div className="tabs">
        <button className={`btn ${tab === "owner" ? "on" : ""}`} onClick={() => setTab("owner")} type="button">
          Sou dono de barbearia
        </button>
        <button className={`btn ${tab === "invite" ? "on" : ""}`} onClick={() => setTab("invite")} type="button">
          Tenho um convite
        </button>
      </div>

      {tab === "owner" ? (
        <form className="stack" onSubmit={createShop}>
          <div>
            <label htmlFor="sname">Nome da barbearia</label>
            <input
              id="sname"
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
            <label htmlFor="sslug">Endereço do link de agendamento</label>
            <input
              id="sslug"
              required
              minLength={3}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
            <p className="muted">Seu link ficará: /{slug || "nome-da-barbearia"}</p>
          </div>
          {error && <p className="error">{error}</p>}
          <div>
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "Criando…" : "Criar barbearia"}
            </button>
          </div>
        </form>
      ) : (
        <BarberForm invite onDone={onDone} />
      )}
    </div>
  );
}
