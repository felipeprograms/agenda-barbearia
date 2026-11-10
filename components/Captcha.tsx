"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Caixa "não sou um robô" (Cloudflare Turnstile). Só aparece se NEXT_PUBLIC_TURNSTILE_SITE_KEY existir.
 * O token vale para uma única tentativa: depois de cada envio, mude "resetKey" para gerar outro.
 */
export default function Captcha({ onToken, resetKey }: { onToken: (token: string) => void; resetKey: number }) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!CAPTCHA_SITE_KEY || !box.current) return;
    let cancelled = false;

    function draw() {
      if (cancelled || !box.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(box.current, {
        sitekey: CAPTCHA_SITE_KEY,
        theme: "dark",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(""),
        "error-callback": () => cb.current(""),
      });
    }

    if (window.turnstile) draw();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      if (!s) {
        s = document.createElement("script");
        s.src = SRC;
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener("load", draw);
    }
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (resetKey > 0 && widgetId.current && window.turnstile) {
      cb.current("");
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  if (!CAPTCHA_SITE_KEY) return null;
  return <div ref={box} />;
}
