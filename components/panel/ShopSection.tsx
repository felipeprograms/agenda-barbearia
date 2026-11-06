"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { copyText, type ShopBasic } from "@/lib/panelUtils";

type Invite = { code: string; used_by: string | null };
type Member = { id: string; name: string; slug: string; active: boolean; mp_connected: boolean };

/** Área do dono: link da barbearia, convites e lista de barbeiros. */
export default function ShopSection({ shop }: { shop: ShopBasic }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [team, setTeam] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shopLink = `${origin}/${shop.slug}`;

  const load = useCallback(async () => {
    const db = supabaseBrowser();
    const [inv, mem] = await Promise.all([
      db.from("invites").select("code,used_by").eq("shop_id", shop.id).order("created_at", { ascending: false }),
      db.from("barbers").select("id,name,slug,active,mp_connected").eq("shop_id", shop.id).order("name"),
    ]);
    setInvites((inv.data ?? []) as Invite[]);
    setTeam((mem.data ?? []) as Member[]);
  }, [shop.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function flash(label: string, text: string) {
    if (await copyText(text)) {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    }
  }

  async function createInvite() {
    setError("");
    const { error: err } = await supabaseBrowser().from("invites").insert({ shop_id: shop.id });
    if (err) setError("Não foi possível gerar o convite.");
    await load();
  }

  async function deleteInvite(code: string) {
    await supabaseBrowser().from("invites").delete().eq("code", code);
    await load();
  }

  async function toggle(m: Member) {
    await supabaseBrowser().from("barbers").update({ active: !m.active }).eq("id", m.id);
    await load();
  }

  return (
    <div className="card stack">
      <div>
        <h2>{shop.name}</h2>
        <p className="muted">Link de agendamento da barbearia (passe para seus clientes):</p>
        <div className="code">{shopLink}</div>
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-small" onClick={() => flash("shop", shopLink)}>
            {copied === "shop" ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      </div>

      <div>
        <h3>Barbeiros</h3>
        {team.length === 0 && <p className="muted">Nenhum barbeiro ainda. Gere um convite abaixo.</p>}
        {team.map((m) => (
          <div className="item" key={m.id}>
            <div>
              <strong>{m.name}</strong>{" "}
              <span className={`badge ${m.mp_connected ? "ok" : "warn"}`}>
                {m.mp_connected ? "Pix ativo" : "falta conectar Mercado Pago"}
              </span>
              <div className="muted">
                {origin}/{shop.slug}/{m.slug}
              </div>
            </div>
            <button className="btn btn-small" onClick={() => toggle(m)}>
              {m.active ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
      </div>

      <div>
        <h3>Convidar barbeiro</h3>
        <p className="muted">
          Gere um código e envie ao barbeiro. Ele cria a própria conta em /painel, escolhe “Tenho um convite” e conecta o
          próprio Mercado Pago, assim o Pix cai direto na conta dele. Cada código vale para uma pessoa.
        </p>
        <button className="btn btn-primary" onClick={createInvite}>
          Gerar convite
        </button>
        {error && <p className="error">{error}</p>}
        {invites.map((i) => (
          <div className="item" key={i.code}>
            <div>
              <code>{i.code}</code> {i.used_by ? <span className="badge ok">usado</span> : <span className="badge">disponível</span>}
            </div>
            {!i.used_by && (
              <div className="row">
                <button
                  className="btn btn-small"
                  onClick={() =>
                    flash(
                      i.code,
                      `Entre em ${origin}/painel, crie sua conta, escolha "Tenho um convite" e use o código ${i.code}`,
                    )
                  }
                >
                  {copied === i.code ? "Copiado!" : "Copiar mensagem"}
                </button>
                <button className="btn btn-small" onClick={() => deleteInvite(i.code)}>
                  Excluir
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
