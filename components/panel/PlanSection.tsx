"use client";

import { useEffect, useRef, useState } from "react";
import PlanCards from "@/components/PlanCards";
import { PLAN_LABEL, type PlanId } from "@/lib/plans";
import { copyText, postAuthed, type ShopBasic } from "@/lib/panelUtils";
import { formatDateBR, shopState } from "@/lib/shopStatus";
import { addDays, todayLocal } from "@/lib/time";

type Pix = { id: string; qrCode: string; qrCodeBase64: string; plan: PlanId };

/** Planos e pagamento da mensalidade pelo Pix ou cartão. A barbearia é liberada sozinha quando o pagamento cai. */
export default function PlanSection({ shop, onChange }: { shop: ShopBasic; onChange: () => void }) {
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [pix, setPix] = useState<Pix | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const state = shopState(shop.status, shop.paid_until);
  const attention = state !== "open" || (shop.paid_until != null && shop.paid_until <= addDays(todayLocal(), 7));

  function stopPolling() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  async function check(id: string): Promise<boolean> {
    const r = await postAuthed("/api/painel/assinatura/status", { id });
    if (r.ok && r.data?.paid === true) {
      stopPolling();
      setPix(null);
      setDone(true);
      onChange();
      return true;
    }
    return false;
  }

  function startPolling(id: string) {
    stopPolling();
    timer.current = setInterval(() => void check(id), 5000);
  }

  // Volta do cartão (/painel?assinatura=<id>)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("assinatura");
    if (id) {
      window.history.replaceState(null, "", window.location.pathname);
      void check(id).then((ok) => {
        if (!ok) startPolling(id);
      });
    }
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pay(plan: PlanId, method: "pix" | "card") {
    setBusy(`${plan}-${method}`);
    setError("");
    setDone(false);
    const r = await postAuthed("/api/painel/assinatura", { plan, method });
    setBusy("");
    if (!r.ok) return setError(r.error ?? "Não foi possível iniciar o pagamento.");
    const id = String(r.data?.id ?? "");
    if (method === "card" && typeof r.data?.url === "string") {
      window.location.href = r.data.url;
      return;
    }
    setPix({ id, qrCode: String(r.data?.qrCode ?? ""), qrCodeBase64: String(r.data?.qrCodeBase64 ?? ""), plan });
    startPolling(id);
  }

  if (state === "suspended") return null;

  const current =
    shop.paid_until != null
      ? `${shop.plan ? `Plano ${PLAN_LABEL[shop.plan] ?? shop.plan} · ` : ""}acesso até ${formatDateBR(shop.paid_until)}`
      : "Acesso sem data de vencimento";

  return (
    <details className="card stack" open={attention || undefined}>
      <summary>
        <strong>Plano e pagamento</strong> <span className="muted">· {current}</span>
      </summary>

      <div className="stack" style={{ marginTop: 14 }}>
        {done && <p className="ok">Pagamento confirmado! Seu acesso foi renovado.</p>}
        {state === "pending" && (
          <p className="muted" style={{ margin: 0 }}>
            Pague a mensalidade e sua página é liberada na hora, sem esperar aprovação.
          </p>
        )}

        {pix ? (
          <div className="stack plan-pix">
            <h3>Pague com Pix</h3>
            <p className="muted" style={{ margin: 0 }}>
              Escaneie o QR Code ou use o “copia e cola”. Esta tela confirma sozinha assim que o pagamento cair.
            </p>
            {pix.qrCodeBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="QR Code do Pix"
                width={220}
                height={220}
                style={{ background: "#fff", padding: 8, borderRadius: 8 }}
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
              />
            )}
            <div className="code" style={{ wordBreak: "break-all" }}>{pix.qrCode}</div>
            <div className="row">
              <button
                className="btn btn-small"
                onClick={async () => {
                  if (await copyText(pix.qrCode)) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? "Copiado!" : "Copiar código Pix"}
              </button>
              <button className="btn btn-small" onClick={() => void check(pix.id)}>
                Já paguei, conferir
              </button>
              <button
                className="btn btn-small"
                onClick={() => {
                  stopPolling();
                  setPix(null);
                }}
              >
                Voltar aos planos
              </button>
            </div>
          </div>
        ) : (
          <PlanCards
            action={(plan) => (
              <div className="plan-actions">
                <button className="plan-cta" disabled={!!busy} onClick={() => pay(plan, "pix")}>
                  {busy === `${plan}-pix` ? "Gerando…" : "Pagar com Pix"}
                </button>
                <button className="plan-cta plan-cta-outline" disabled={!!busy} onClick={() => pay(plan, "card")}>
                  {busy === `${plan}-card` ? "Abrindo…" : "Pagar com cartão"}
                </button>
              </div>
            )}
          />
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </details>
  );
}
