"use client";

import { useCallback, useEffect, useState } from "react";
import { postAuthed } from "@/lib/panelUtils";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type State = "loading" | "hidden" | "needs-install" | "unsupported" | "denied" | "off" | "on";

function keyToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {

    if (!KEY || process.env.NODE_ENV !== "production") return setState("hidden");
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios && !standalone) return setState("needs-install");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setState("unsupported");
    }
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub && Notification.permission === "granted" ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(KEY) as unknown as BufferSource,
        }));
      const r = await postAuthed("/api/painel/push", { action: "subscribe", subscription: sub.toJSON() });
      if (!r.ok) {
        setMsg(r.error ?? "Não foi possível ativar.");
        return;
      }
      setState("on");
      setMsg("Avisos ativados neste aparelho.");
    } catch {
      setMsg("Não foi possível ativar os avisos neste aparelho.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await postAuthed("/api/painel/push", { action: "unsubscribe", endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setMsg("Não foi possível desativar agora.");
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(async () => {
    setBusy(true);
    const r = await postAuthed("/api/painel/push", { action: "test" });
    setMsg(r.ok ? "Aviso de teste enviado. Olhe a barra de notificações." : (r.error ?? "Não foi possível enviar."));
    setBusy(false);
  }, []);

  if (state === "loading" || state === "hidden") return null;

  return (
    <div className="stack" style={{ gap: 8 }}>
      {state === "needs-install" && (
        <p className="muted">
          Para receber avisos no iPhone, instale o app: toque em <strong>Compartilhar</strong> e em{" "}
          <strong>Adicionar à Tela de Início</strong>, abra o app pelo ícone e ative os avisos aqui.
        </p>
      )}
      {state === "unsupported" && <p className="muted">Este navegador não permite avisos no celular.</p>}
      {state === "denied" && (
        <p className="muted">
          Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador (Notificações) e volte aqui.
        </p>
      )}
      {state === "off" && (
        <div>
          <button type="button" className="btn btn-small" onClick={() => void enable()} disabled={busy}>
            Ativar avisos neste celular
          </button>
        </div>
      )}
      {state === "on" && (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="badge">avisos ativados</span>
          <button type="button" className="btn btn-small" onClick={() => void test()} disabled={busy}>
            Enviar teste
          </button>
          <button type="button" className="btn btn-small" onClick={() => void disable()} disabled={busy}>
            Desativar
          </button>
        </div>
      )}
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
