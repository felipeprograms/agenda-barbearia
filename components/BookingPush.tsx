"use client";

import { useEffect, useState } from "react";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type State = "loading" | "hidden" | "needs-install" | "denied" | "off" | "on";

function keyToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function BookingPush({ bookingId }: { bookingId: string }) {
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
      return setState("hidden");
    }
    if (Notification.permission === "denied") return setState("denied");
    try {
      if (localStorage.getItem(`bp-${bookingId}`) === "1" && Notification.permission === "granted") return setState("on");
    } catch {

    }
    setState("off");
  }, [bookingId]);

  async function enable() {
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
      const res = await fetch(`/api/booking/${bookingId}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(j.error ?? "Não foi possível ativar.");
        return;
      }
      try {
        localStorage.setItem(`bp-${bookingId}`, "1");
      } catch {

      }
      setState("on");
    } catch {
      setMsg("Não foi possível ativar os avisos neste aparelho.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "hidden") return null;

  return (
    <div className="stack" style={{ gap: 8 }}>
      {state === "on" ? (
        <p className="muted">Avisos ativados. Se o barbeiro terminar antes, você recebe uma notificação para chegar mais cedo.</p>
      ) : state === "needs-install" ? (
        <p className="muted">
          No iPhone, para receber o aviso de horário adiantado, toque em <strong>Compartilhar</strong> e em{" "}
          <strong>Adicionar à Tela de Início</strong>, abra pelo ícone e volte a este agendamento.
        </p>
      ) : state === "denied" ? (
        <p className="muted">Os avisos estão bloqueados neste aparelho. Libere em Configurações do navegador.</p>
      ) : (
        <>
          <button type="button" className="btn" onClick={() => void enable()} disabled={busy}>
            Receber avisos deste horário
          </button>
          <p className="muted">Se o barbeiro terminar antes, você é avisado e pode chegar mais cedo. Sem cadastro.</p>
        </>
      )}
      {msg && <p className="error">{msg}</p>}
    </div>
  );
}
