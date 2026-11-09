"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { copyText, type ShopBasic } from "@/lib/panelUtils";
import { isShopOpen } from "@/lib/shopStatus";

type Invite = { code: string; used_by: string | null };

/** Área do dono: link da barbearia e convites opcionais. */
export default function ShopSection({ shop }: { shop: ShopBasic }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shopLink = `${origin}/${shop.slug}`;
  const open = isShopOpen(shop.status, shop.paid_until);

  const load = useCallback(async () => {
    const db = supabaseBrowser();
    const inv = await db
      .from("invites")
      .select("code,used_by")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });
    setInvites((inv.data ?? []) as Invite[]);
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

      <details>
        <summary><strong>Prefere que o barbeiro tenha login próprio? Gerar convite</strong></summary>
        {!open && (
          <p className="muted">
            Os convites ficam disponíveis quando a barbearia estiver liberada e com a mensalidade em dia.
          </p>
        )}
        <p className="muted">
          Gere um código e envie ao barbeiro. Ele cria a própria conta em /painel, escolhe “Tenho um convite” e conecta o
          próprio Mercado Pago, assim o Pix cai direto na conta dele. Cada código vale para uma pessoa.
        </p>
        <button className="btn btn-primary" onClick={createInvite} disabled={!open}>
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
      </details>
    </div>
  );
}
