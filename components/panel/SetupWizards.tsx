"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { uploadPhoto, removePhoto } from "@/lib/photos";
import { copyText, type Barber, type Shop, type ShopBasic } from "@/lib/panelUtils";
import Wizard, { type WizardStep } from "./Wizard";
import { Hours, Integrations, PhotoCard, Services } from "./BarberSection";

function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}
function mark(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sem problema */
  }
}
function cleanInstagram(v: string): string {
  return v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
}

/** Cartão com o botão do assistente da barbearia (abre sozinho na primeira vez). */
export function ShopWizardLauncher({ shop, onChange }: { shop: Shop; onChange: () => void }) {
  const key = `wz-shop-${shop.id}`;
  const empty = !shop.tagline && !shop.address && !shop.phone && !shop.logo_url;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (empty && !seen(key)) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="card row between">
        <div>
          <strong>Assistente de configuração da barbearia</strong>
          <p className="muted" style={{ margin: 0 }}>Preencha o nome, contato, horário e visual em poucos passos.</p>
        </div>
        <button className="btn btn-primary btn-small" onClick={() => setOpen(true)}>
          Abrir assistente
        </button>
      </div>
      {open && (
        <ShopWizard
          shop={shop}
          onChange={onChange}
          onClose={(finished) => {
            mark(key, finished ? "done" : "later");
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function ShopWizard({ shop, onChange, onClose }: { shop: Shop; onChange: () => void; onClose: (finished: boolean) => void }) {
  const [f, setF] = useState({
    name: shop.name,
    tagline: shop.tagline ?? "",
    phone: shop.phone ?? "",
    instagram: shop.instagram ?? "",
    address: shop.address ?? "",
    hours_text: shop.hours_text ?? "",
  });
  const [uploading, setUploading] = useState("");
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  async function save(patch: Record<string, unknown>): Promise<string | null> {
    const { error } = await supabaseBrowser().from("shops").update(patch).eq("id", shop.id);
    if (error) return "Não foi possível salvar agora. Tente de novo.";
    onChange();
    return null;
  }

  async function onImage(kind: "logo" | "cover", e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadPhoto(file, { logo: kind === "logo" });
      const col = kind === "logo" ? "logo_url" : "cover_url";
      const old = kind === "logo" ? shop.logo_url : shop.cover_url;
      const err = await save({ [col]: url });
      if (!err && old) await removePhoto(old);
    } finally {
      setUploading("");
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/${shop.slug}`;

  const steps: WizardStep[] = [
    {
      id: "nome",
      title: "Nome e frase de destaque",
      info: "O nome aparece no menu da sua página. A frase fica logo abaixo de “Agende seu horário”, na tela inicial.",
      content: (
        <>
          <div>
            <label htmlFor="wz-name">Nome da barbearia</label>
            <input id="wz-name" value={f.name} maxLength={80} onChange={set("name")} />
          </div>
          <div>
            <label htmlFor="wz-tag">Frase de destaque (opcional)</label>
            <input id="wz-tag" value={f.tagline} maxLength={120} placeholder="Ex.: Corte e barba na régua" onChange={set("tagline")} />
          </div>
        </>
      ),
      onConfirm: async () => {
        const name = f.name.trim();
        if (name.length < 2 || name.length > 80) return "O nome deve ter de 2 a 80 letras.";
        return save({ name, tagline: f.tagline.trim() || null });
      },
    },
    {
      id: "contato",
      title: "Contato e endereço",
      info: "O WhatsApp e o Instagram viram ícones no menu e no fim da página. O endereço abre o mapa para o cliente.",
      content: (
        <>
          <div>
            <label htmlFor="wz-phone">WhatsApp com DDD</label>
            <input id="wz-phone" inputMode="tel" placeholder="71 99999-9999" value={f.phone} onChange={set("phone")} />
          </div>
          <div>
            <label htmlFor="wz-ig">Instagram (só o usuário)</label>
            <input id="wz-ig" placeholder="@minhabarbearia" value={f.instagram} onChange={set("instagram")} />
          </div>
          <div>
            <label htmlFor="wz-addr">Endereço</label>
            <input id="wz-addr" placeholder="Rua, número, bairro, cidade" value={f.address} onChange={set("address")} />
          </div>
        </>
      ),
      onConfirm: async () => {
        const phone = f.phone.replace(/\D/g, "");
        if (phone && (phone.length < 10 || phone.length > 13)) return "Informe o WhatsApp com DDD, por exemplo 71 99999-9999.";
        const instagram = cleanInstagram(f.instagram);
        if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return "O Instagram deve ser só o usuário, como @minhabarbearia.";
        return save({ phone: phone || null, instagram: instagram || null, address: f.address.trim() || null });
      },
    },
    {
      id: "horario",
      title: "Horário de funcionamento",
      info: "É só um texto para o cliente ler. Os horários realmente disponíveis para agendar são os de cada barbeiro.",
      content: (
        <div>
          <label htmlFor="wz-hours">Dias e horários</label>
          <textarea id="wz-hours" rows={4} placeholder={"Seg a Sex: 9h às 19h\nSábado: 9h às 17h"} value={f.hours_text} onChange={set("hours_text")} />
        </div>
      ),
      onConfirm: () => save({ hours_text: f.hours_text.trim() || null }),
    },
    {
      id: "visual",
      title: "Logo e imagem de fundo",
      info: "A imagem de fundo aparece desfocada atrás da frase “Agende seu horário”. A logo fica logo acima da frase. Use fotos suas ou de bancos gratuitos.",
      content: (
        <>
          <div>
            <label htmlFor="wz-logo">Logo (PNG com fundo transparente é o ideal)</label>
            {shop.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logo_url} alt="Logo atual" style={{ maxHeight: 80, display: "block", marginBottom: 8 }} />
            )}
            <input id="wz-logo" type="file" accept="image/*" disabled={!!uploading} onChange={(e) => onImage("logo", e)} />
            {uploading === "logo" && <p className="muted">Enviando…</p>}
          </div>
          <div>
            <label htmlFor="wz-cover">Imagem de fundo</label>
            {shop.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="thumb-cover" src={shop.cover_url} alt="Imagem de fundo atual" />
            )}
            <input id="wz-cover" type="file" accept="image/*" disabled={!!uploading} onChange={(e) => onImage("cover", e)} />
            {uploading === "cover" && <p className="muted">Enviando…</p>}
          </div>
        </>
      ),
    },
    {
      id: "pronto",
      title: "Pronto! Divulgue o seu link",
      info: "Este é o endereço que o cliente abre para agendar. Coloque no Instagram e no WhatsApp. O próximo passo é cadastrar os barbeiros, mais abaixo no painel.",
      content: (
        <>
          <div className="code">{link}</div>
          <div>
            <button
              className="btn btn-small"
              type="button"
              onClick={async () => {
                if (await copyText(link)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
            >
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Falta cadastrar os barbeiros e conectar o Mercado Pago de cada um. Você faz isso em “Barbeiros da barbearia”.
          </p>
        </>
      ),
    },
  ];

  return <Wizard title="Barbearia" steps={steps} onClose={onClose} />;
}

/** Cartão com o botão do assistente do barbeiro (abre sozinho na primeira vez, se ainda falta conectar o pagamento). */
export function BarberWizardLauncher({ barber, shop, onChange }: { barber: Barber; shop: ShopBasic | null; onChange: () => void }) {
  const key = `wz-barber-${barber.id}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!barber.mp_connected && !seen(key)) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps: WizardStep[] = [
    {
      id: "foto",
      title: "Sua foto",
      info: "A foto aparece redonda na página da barbearia, para o cliente reconhecer você. É opcional.",
      content: <PhotoCard barber={barber} onChange={onChange} />,
    },
    {
      id: "servicos",
      title: "Seus serviços e preços",
      info: "Cadastre cada serviço com preço e duração. O cliente só consegue agendar o que estiver nesta lista.",
      content: <Services barber={barber} />,
    },
    {
      id: "horarios",
      title: "Seus horários de atendimento",
      info: "Escolha os dias da semana e o intervalo em que você atende. Se atende de manhã e à tarde, adicione dois intervalos no mesmo dia.",
      content: <Hours barber={barber} />,
    },
    {
      id: "pagamento",
      title: "Pagamento e avisos",
      info: "Conecte o seu Mercado Pago para o sinal cair direto na sua conta, defina quanto cobrar de sinal e ligue o Telegram para receber o aviso de cada agendamento. Sem o Mercado Pago você não aparece na página.",
      content: <Integrations barber={barber} onChange={onChange} />,
    },
    {
      id: "pronto",
      title: "Tudo certo!",
      info: "Você pode reabrir este assistente quando quiser para mudar qualquer coisa.",
      content: (
        <p className="muted" style={{ margin: 0 }}>
          {barber.mp_connected
            ? `Você já aparece na página${shop ? ` da ${shop.name}` : ""}. Os agendamentos pagos chegam no seu Telegram e no painel.`
            : "Falta conectar o Mercado Pago para aparecer na página. Você pode fazer isso depois, em “Pagamento e avisos”."}
        </p>
      ),
    },
  ];

  return (
    <>
      <div className="card row between">
        <div>
          <strong>Assistente de configuração do barbeiro</strong>
          <p className="muted" style={{ margin: 0 }}>Foto, serviços, horários, Mercado Pago e Telegram, um passo de cada vez.</p>
        </div>
        <button className="btn btn-primary btn-small" onClick={() => setOpen(true)}>
          Abrir assistente
        </button>
      </div>
      {open && (
        <Wizard
          title="Barbeiro"
          steps={steps}
          onClose={(finished) => {
            mark(key, finished ? "done" : "later");
            setOpen(false);
            onChange();
          }}
        />
      )}
    </>
  );
}
