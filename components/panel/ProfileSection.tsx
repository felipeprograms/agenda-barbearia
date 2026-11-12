"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { removePhoto, uploadPhoto } from "@/lib/photos";
import type { Shop } from "@/lib/panelUtils";
import AddressField, { type GeoValue } from "./AddressField";

const MAX_GALLERY = 8;

function cleanInstagram(v: string): string {
  return v
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

export default function ProfileSection({ shop, onChange }: { shop: Shop; onChange: () => void }) {
  const [f, setF] = useState({
    name: shop.name,
    tagline: shop.tagline ?? "",
    about: shop.about ?? "",
    address: shop.address ?? "",
    phone: shop.phone ?? "",
    instagram: shop.instagram ?? "",
    hours_text: shop.hours_text ?? "",
    policies_text: shop.policies_text ?? "",
  });
  const [geo, setGeo] = useState<GeoValue>({
    address: shop.address ?? "",
    cep: shop.cep ?? null,
    lat: shop.lat ?? null,
    lng: shop.lng ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<"" | "cover" | "logo" | "gallery">("");

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    const shopName = f.name.trim();
    if (shopName.length < 2 || shopName.length > 80) {
      return setMsg({ ok: false, text: "O nome da barbearia deve ter de 2 a 80 letras." });
    }
    const phone = f.phone.replace(/\D/g, "");
    if (phone && (phone.length < 10 || phone.length > 13)) {
      return setMsg({ ok: false, text: "Informe o WhatsApp com DDD, por exemplo 71 99999-9999." });
    }
    const instagram = cleanInstagram(f.instagram);
    if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
      return setMsg({ ok: false, text: "O Instagram deve ser só o nome de usuário, como @minhabarbearia." });
    }

    setSaving(true);
    const { error } = await supabaseBrowser()
      .from("shops")
      .update({
        name: shopName,
        tagline: f.tagline.trim() || null,
        about: f.about.trim() || null,
        address: geo.address.trim() || null,
        cep: geo.cep,
        lat: geo.lat,
        lng: geo.lng,
        phone: phone || null,
        instagram: instagram || null,
        hours_text: f.hours_text.trim() || null,
        policies_text: f.policies_text.trim() || null,
      })
      .eq("id", shop.id);
    setSaving(false);

    if (error) {
      const hint = /column|schema cache/i.test(error.message)
        ? " Confira se você rodou o arquivo migracao-vitrine.sql e o migracao-novidades.sql no Supabase."
        : "";
      return setMsg({ ok: false, text: `Não foi possível salvar.${hint}` });
    }
    setMsg({ ok: true, text: "Perfil salvo. Já aparece na página dos clientes." });
    onChange();
  }

  async function onLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg(null);
    setBusy("logo");
    try {
      const url = await uploadPhoto(file, { logo: true });
      const { error } = await supabaseBrowser().from("shops").update({ logo_url: url }).eq("id", shop.id);
      if (error) {
        throw new Error("Não foi possível salvar o logo. Confira se você rodou o arquivo migracao-vitrine.sql.");
      }
      if (shop.logo_url) await removePhoto(shop.logo_url);
      onChange();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro ao enviar o logo." });
    } finally {
      setBusy("");
    }
  }

  async function removeLogo() {
    if (!shop.logo_url) return;
    await supabaseBrowser().from("shops").update({ logo_url: null }).eq("id", shop.id);
    await removePhoto(shop.logo_url);
    onChange();
  }

  async function onCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg(null);
    setBusy("cover");
    try {
      const url = await uploadPhoto(file);
      const { error } = await supabaseBrowser().from("shops").update({ cover_url: url }).eq("id", shop.id);
      if (error) throw new Error("Não foi possível salvar a capa.");
      if (shop.cover_url) await removePhoto(shop.cover_url);
      onChange();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro ao enviar a foto." });
    } finally {
      setBusy("");
    }
  }

  async function removeCover() {
    if (!shop.cover_url) return;
    await supabaseBrowser().from("shops").update({ cover_url: null }).eq("id", shop.id);
    await removePhoto(shop.cover_url);
    onChange();
  }

  async function onGallery(e: ChangeEvent<HTMLInputElement>) {
    const files: File[] = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setMsg(null);
    setBusy("gallery");
    try {
      let next = [...shop.gallery];
      for (const file of files) {
        if (next.length >= MAX_GALLERY) break;
        next = [...next, await uploadPhoto(file)];
      }
      const { error } = await supabaseBrowser().from("shops").update({ gallery: next }).eq("id", shop.id);
      if (error) throw new Error("Não foi possível salvar a galeria.");
      onChange();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro ao enviar a foto." });
    } finally {
      setBusy("");
    }
  }

  async function removeFromGallery(url: string) {
    const next = shop.gallery.filter((u) => u !== url);
    await supabaseBrowser().from("shops").update({ gallery: next }).eq("id", shop.id);
    await removePhoto(url);
    onChange();
  }

  return (
    <div className="card stack">
      <div>
        <h2>Página da barbearia</h2>
        <p className="muted" style={{ margin: 0 }}>
          Fotos e informações que seus clientes veem no link de agendamento.
        </p>
      </div>

      <div>
        <h3>Logo da barbearia</h3>
        <p className="muted">
          Aparece em cima da frase “Agende seu horário” e no menu do site. Prefira PNG com fundo transparente e letras
          claras (o fundo é escuro). Sem logo, o site mostra o nome da barbearia.
        </p>
        {shop.logo_url && (
          <div className="logo-preview">

            <img src={shop.logo_url} alt="Logo atual da barbearia" />
          </div>
        )}
        <div className="row">
          <label className="btn btn-small file-btn">
            {busy === "logo" ? "Enviando…" : shop.logo_url ? "Trocar logo" : "Enviar logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogo} disabled={busy !== ""} hidden />
          </label>
          {shop.logo_url && (
            <button type="button" className="btn btn-small" onClick={removeLogo}>
              Remover
            </button>
          )}
        </div>
      </div>

      <div>
        <h3>Imagem de fundo da tela inicial</h3>
        <p className="muted">
          Fica atrás da frase “Agende seu horário”, com um leve desfoque e escurecida para o texto aparecer bem. Use
          uma foto da fachada, do salão ou de um corte. Qualquer formato serve; no computador ela aparece mais larga e
          no celular mais alta.
        </p>
        {shop.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumb-cover" src={shop.cover_url} alt="Capa atual da barbearia" />
        )}
        <div className="row">
          <label className="btn btn-small file-btn">
            {busy === "cover" ? "Enviando…" : shop.cover_url ? "Trocar imagem de fundo" : "Enviar imagem de fundo"}
            <input type="file" accept="image/*" onChange={onCover} disabled={busy !== ""} hidden />
          </label>
          {shop.cover_url && (
            <button type="button" className="btn btn-small" onClick={removeCover}>
              Remover
            </button>
          )}
        </div>
      </div>

      <div>
        <h3>Galeria ({shop.gallery.length} de {MAX_GALLERY})</h3>
        <p className="muted">
          Cortes, barbas, o ambiente. Até 3 fotos aparecem sobrepostas na seção “Sobre”, no fim da página. Você pode escolher várias de uma vez.
        </p>
        {shop.gallery.length > 0 && (
          <div className="thumbs">
            {shop.gallery.map((url) => (
              <div className="thumb" key={url}>

                <img src={url} alt="" />
                <button type="button" aria-label="Remover foto" onClick={() => removeFromGallery(url)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {shop.gallery.length < MAX_GALLERY && (
          <label className="btn btn-small file-btn">
            {busy === "gallery" ? "Enviando…" : "Adicionar fotos"}
            <input type="file" accept="image/*" multiple onChange={onGallery} disabled={busy !== ""} hidden />
          </label>
        )}
      </div>

      <form className="stack" onSubmit={save}>
        <div>
          <label htmlFor="p-name">Nome da barbearia</label>
          <input
            id="p-name"
            required
            minLength={2}
            maxLength={80}
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="p-tagline">Frase de apresentação</label>
          <input
            id="p-tagline"
            maxLength={90}
            placeholder="Corte, barba e cuidado de verdade"
            value={f.tagline}
            onChange={(e) => setF({ ...f, tagline: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="p-about">Sobre a barbearia</label>
          <textarea
            id="p-about"
            rows={4}
            maxLength={600}
            value={f.about}
            onChange={(e) => setF({ ...f, about: e.target.value })}
          />
        </div>
        <div className="stack">
          <strong>Endereço</strong>
          <AddressField value={geo} onChange={setGeo} />
        </div>
        <div>
          <label htmlFor="p-phone">WhatsApp da barbearia, com DDD</label>
          <input
            id="p-phone"
            type="tel"
            inputMode="tel"
            placeholder="71 99999-9999"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="p-insta">Instagram</label>
          <input
            id="p-insta"
            placeholder="@minhabarbearia"
            value={f.instagram}
            onChange={(e) => setF({ ...f, instagram: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="p-hours">Horário de funcionamento</label>
          <textarea
            id="p-hours"
            rows={3}
            maxLength={400}
            placeholder={"Segunda a sexta: 9h às 19h\nSábado: 9h às 17h"}
            value={f.hours_text}
            onChange={(e) => setF({ ...f, hours_text: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="p-policies">Regras de agendamento</label>
          <textarea
            id="p-policies"
            rows={3}
            maxLength={600}
            placeholder={"O sinal garante o horário.\nAtrasos acima de 15 minutos podem perder a vaga."}
            value={f.policies_text}
            onChange={(e) => setF({ ...f, policies_text: e.target.value })}
          />
        </div>
        {msg && <p className={msg.ok ? "ok" : "error"} role="status">{msg.text}</p>}
        <div>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? "Salvando…" : "Salvar informações"}
          </button>
        </div>
      </form>
    </div>
  );
}
