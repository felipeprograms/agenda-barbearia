"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function InstallButton({ label = "Instalar app" }: { label?: string }) {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!evt && !ios)) return null;

  async function click() {
    if (evt) {
      await evt.prompt();
      await evt.userChoice.catch(() => null);
      setEvt(null);
    } else {
      setHelp((v) => !v);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-small" onClick={() => void click()}>
        {label}
      </button>
      {help && (
        <p className="muted" style={{ marginTop: 8 }}>
          No iPhone: toque em <strong>Compartilhar</strong> (quadrado com seta) e depois em{" "}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}
    </div>
  );
}
