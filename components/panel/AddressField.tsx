"use client";

import { useEffect, useRef, useState } from "react";
import MiniMap from "@/components/MiniMap";
import { postAuthed } from "@/lib/panelUtils";

export type GeoValue = { address: string; cep: string | null; lat: number | null; lng: number | null };

function maskCep(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function compose(p: { street: string; number: string; complement: string; neighborhood: string; city: string; uf: string; cep: string }): string {
  const line1 = [p.street, p.number].filter(Boolean).join(", ");
  const withComp = p.complement ? `${line1} (${p.complement})` : line1;
  const place = [p.city, p.uf].filter(Boolean).join(" - ");
  return [withComp, p.neighborhood, place, p.cep ? `CEP ${p.cep}` : ""].filter(Boolean).join(", ");
}

export default function AddressField({ value, onChange }: { value: GeoValue; onChange: (v: GeoValue) => void }) {
  const [p, setP] = useState({ cep: value.cep ? maskCep(value.cep) : "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "" });
  const [pos, setPos] = useState<{ lat: number | null; lng: number | null }>({ lat: value.lat, lng: value.lng });
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const cb = useRef(onChange);
  cb.current = onChange;
  const lastCep = useRef("");
  const numberTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function patch(next: Partial<typeof p>) {
    setTouched(true);
    setP((cur) => ({ ...cur, ...next }));
  }

  useEffect(() => {
    if (!touched) return;
    const digits = p.cep.replace(/\D/g, "");
    cb.current({ address: compose(p).slice(0, 160), cep: digits.length === 8 ? digits : null, lat: pos.lat, lng: pos.lng });
  }, [p, pos, touched]);

  async function lookupCep(masked: string) {
    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8 || lastCep.current === digits) return;
    lastCep.current = digits;
    setBusy(true);
    setStatus(null);
    const r = await postAuthed("/api/geo", { cep: digits });
    setBusy(false);
    if (!r.ok) {
      lastCep.current = "";
      return setStatus({ ok: false, text: r.error ?? "Não foi possível consultar o CEP." });
    }
    const d = r.data ?? {};
    setP((cur) => ({
      ...cur,
      street: String(d.street ?? ""),
      neighborhood: String(d.neighborhood ?? ""),
      city: String(d.city ?? ""),
      uf: String(d.uf ?? ""),
    }));
    setTouched(true);
    setPos({ lat: typeof d.lat === "number" ? d.lat : null, lng: typeof d.lng === "number" ? d.lng : null });
    setStatus({ ok: true, text: "Endereço encontrado. Complete o número." });
  }

  async function refreshMap() {
    const q = [[p.street, p.number].filter(Boolean).join(" "), p.neighborhood, p.city, p.uf, "Brasil"].filter(Boolean).join(", ");
    if (q.length < 8) return setStatus({ ok: false, text: "Preencha a rua e a cidade antes de atualizar o mapa." });
    setBusy(true);
    const r = await postAuthed("/api/geo", { q });
    setBusy(false);
    const d = r.data ?? {};
    if (r.ok && typeof d.lat === "number" && typeof d.lng === "number") {
      setPos({ lat: d.lat, lng: d.lng });
      setStatus({ ok: true, text: "Mapa atualizado. Confira se o ponto está no lugar certo." });
    } else setStatus({ ok: false, text: "Não achei esse endereço no mapa. Confira a rua e o número." });
  }

  function onNumber(v: string) {
    patch({ number: v });
    clearTimeout(numberTimer.current);
    if (v.trim() && p.street && p.city) {
      numberTimer.current = setTimeout(() => void refreshMap(), 1200);
    }
  }
  useEffect(() => () => clearTimeout(numberTimer.current), []);

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div>
        <label htmlFor="ad-cep">CEP</label>
        <input
          id="ad-cep"
          inputMode="numeric"
          placeholder="00000-000"
          maxLength={9}
          value={p.cep}
          onChange={(e) => {
            const m = maskCep(e.target.value);
            patch({ cep: m });
            void lookupCep(m);
          }}
        />
      </div>

      {value.address && !touched && (
        <p className="muted" style={{ margin: 0 }}>
          Endereço atual: <strong>{value.address}</strong>. Digite um CEP para trocar.
        </p>
      )}

      {(touched || !value.address) && (
        <>
          <div>
            <label htmlFor="ad-street">Rua</label>
            <input id="ad-street" maxLength={120} value={p.street} onChange={(e) => patch({ street: e.target.value })} />
          </div>
          <div className="row">
            <div style={{ flex: "1 1 90px" }}>
              <label htmlFor="ad-num">Número</label>
              <input id="ad-num" maxLength={10} value={p.number} onChange={(e) => onNumber(e.target.value)} />
            </div>
            <div style={{ flex: "2 1 160px" }}>
              <label htmlFor="ad-comp">Complemento (opcional)</label>
              <input id="ad-comp" maxLength={40} placeholder="Sala 2, loja B…" value={p.complement} onChange={(e) => patch({ complement: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="ad-bairro">Bairro</label>
            <input id="ad-bairro" maxLength={80} value={p.neighborhood} onChange={(e) => patch({ neighborhood: e.target.value })} />
          </div>
          <div className="row">
            <div style={{ flex: "3 1 160px" }}>
              <label htmlFor="ad-city">Cidade</label>
              <input id="ad-city" maxLength={80} value={p.city} onChange={(e) => patch({ city: e.target.value })} />
            </div>
            <div style={{ flex: "1 1 60px" }}>
              <label htmlFor="ad-uf">UF</label>
              <input id="ad-uf" maxLength={2} value={p.uf} onChange={(e) => patch({ uf: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn btn-small" onClick={() => void refreshMap()} disabled={busy}>
              {busy ? "Buscando…" : "Atualizar mapa"}
            </button>
          </div>
        </>
      )}

      {status && <p className={status.ok ? "ok" : "error"} style={{ margin: 0 }}>{status.text}</p>}

      {pos.lat !== null && pos.lng !== null && (
        <div className="stack" style={{ gap: 6 }}>
          <MiniMap lat={pos.lat} lng={pos.lng} height={190} />
          <p className="muted" style={{ margin: 0 }}>Confira se o ponto está no lugar certo. Dá para arrastar e dar zoom no mapa.</p>
        </div>
      )}
    </div>
  );
}
