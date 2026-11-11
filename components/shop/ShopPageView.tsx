import type { PublicBarber, PublicShop } from "@/lib/shopData";
import { formatPhone, instagramLink, mapsLink, whatsappLink } from "@/lib/links";
import { MAX_DAYS_AHEAD } from "@/lib/config";
import { formatBRL, todayLocal } from "@/lib/time";
import BookingFlow from "@/components/BookingFlow";
import { Icon } from "./Icons";
import InstallButton from "@/components/InstallButton";
import PhotoStack, { type StackItem } from "./PhotoStack";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function groupServices(barbers: PublicBarber[]) {
  const map = new Map<string, { name: string; min: number; max: number; duration: number }>();
  for (const b of barbers) {
    for (const s of b.services) {
      const key = s.name.trim().toLowerCase();
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { name: s.name, min: s.price_cents, max: s.price_cents, duration: s.duration_min });
      } else {
        cur.min = Math.min(cur.min, s.price_cents);
        cur.max = Math.max(cur.max, s.price_cents);
      }
    }
  }
  return [...map.values()];
}

export default function ShopPageView({ shop, focusBarber = false }: { shop: PublicShop; focusBarber?: boolean }) {
  const hasBarbers = shop.barbers.length > 0;
  const services = groupServices(shop.barbers);
  const policies = (shop.policies_text ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6);
  const hasContact = Boolean(shop.phone || shop.instagram);
  const hasVisit = Boolean(shop.hours_text || shop.address || hasContact);
  const minDeposit = hasBarbers ? Math.min(...shop.barbers.map((b) => b.deposit_percent)) : 0;
  const showServices = hasBarbers && services.length > 0;
  const showBarbers = hasBarbers && !focusBarber;

  const aboutPhotos: StackItem[] = shop.gallery.slice(0, 3).map((src) => ({ src }));
  const hasAbout = Boolean(shop.about) || aboutPhotos.length > 0;
  const showTeam = showBarbers || showServices;

  const tagline = shop.tagline ?? "Escolha o barbeiro, o serviço e o horário. O sinal pelo Pix ou cartão garante a sua vaga.";

  return (
    <div className="shop-root">

      <nav className="nav nav-shop" aria-label="Menu principal">
        <div className="wrap nav-in">
          <a className="nav-brand" href="#topo" aria-label={shop.name}>
            {shop.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="nav-logo" src={shop.logo_url} alt="" />
            ) : (
              <span className="nav-name">{shop.name}</span>
            )}
          </a>
          <div className="nav-links">
            <a className="is-active" href="#topo">
              Início
            </a>
            {showBarbers && <a href="#barbeiros">Barbeiros</a>}
            {showServices && <a href="#servicos">Serviços</a>}
            {hasAbout && <a href="#sobre">Sobre</a>}
            {hasVisit && <a href="#visita">Contato</a>}
          </div>
          <div className="nav-social">
            {shop.instagram && (
              <a href={instagramLink(shop.instagram)} target="_blank" rel="noreferrer" aria-label="Instagram">
                <Icon name="instagram" />
              </a>
            )}
            {shop.phone && (
              <a href={whatsappLink(shop.phone)} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <Icon name="whatsapp" />
              </a>
            )}
          </div>
          <a className="btn btn-small nav-cta" href="#agendar">
            Agendar
          </a>
        </div>
      </nav>

      <header className="hero-agenda" id="topo">
        {shop.cover_url && (
          <div className="hero-bg" style={{ backgroundImage: `url(${JSON.stringify(shop.cover_url)})` }} aria-hidden="true" />
        )}
        <div className="hero-agenda-in">
          {shop.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="agenda-logo" src={shop.logo_url} alt="" />
          ) : (
            <div className="agenda-brand">
              <Icon name="scissors" />
              <span>{shop.name}</span>
            </div>
          )}
          <h1 className="agende">
            <span className="sr-only">{shop.name}: </span>
            <span className="agende-top">Agende seu</span>
            <span className="agende-main">Horário</span>
            <span className="agende-ref" aria-hidden="true">
              Horário
            </span>
          </h1>
          <p className="agende-tag">{tagline}</p>
          <a className="btn-marcar" href="#agendar">
            <Icon name="link" />
            Marcar horário
          </a>
        </div>
      </header>

      {showTeam && (
        <section className="section team" id="equipe">
          <div className={`wrap bs-grid${showBarbers && showServices ? "" : " bs-solo"}`}>
            {showBarbers && (
              <div className="bs-col" id="barbeiros">
                <h2 className="section-title">Nossos barbeiros</h2>
                <p className="bs-sub">Toque em um barbeiro para agendar direto com ele.</p>
                <ul className="bc-list">
                  {shop.barbers.map((b) => (
                    <li key={b.id}>
                      <a className="bcircle" href={`/${shop.slug}/${b.slug}#agendar`}>
                        <span className="bc-ring">
                          <span className="bc-photo">
                            {b.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={b.photo_url} alt={`Foto de ${b.name}`} loading="lazy" />
                            ) : (
                              <span className="bc-initials" aria-hidden="true">
                                {initials(b.name)}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="bc-name">{b.name}</span>
                        <span className="bc-go">Agendar</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showServices && (
              <div className="bs-col svc-panel" id="servicos">
                <h2 className="section-title">Serviços</h2>
                <ul className="price-list">
                  {services.map((s) => (
                    <li key={s.name}>
                      <a className="pl-row" href="#agendar">
                        <span className="pl-name">
                          {s.name}
                          <small>{s.duration} min</small>
                        </span>
                        <span className="pl-dots" aria-hidden="true" />
                        <span className="pl-price">
                          {s.min !== s.max && <small>a partir de</small>}
                          {formatBRL(s.min)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <a className="btn-marcar btn-marcar-sm" href="#agendar">
                  Agendar horário
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section agendar" id="agendar">
        <div className="wrap wrap-narrow">
          <h2 className="section-title">Agende seu horário</h2>
          <p className="section-sub">
            {hasBarbers && minDeposit < 100
              ? `Escolha o barbeiro, o serviço, o dia e o horário. Um sinal de ${minDeposit}% pelo Pix ou cartão garante a sua vaga.`
              : "Escolha o barbeiro, o serviço, o dia e o horário."}
          </p>
          {hasBarbers ? (
            <BookingFlow shopName={shop.name} barbers={shop.barbers} today={todayLocal()} maxDays={MAX_DAYS_AHEAD} />
          ) : (
            <div className="card">
              <h2>Agenda online ainda não aberta</h2>
              <p className="muted" style={{ margin: 0 }}>
                Esta barbearia ainda não está recebendo agendamentos pelo site. Volte em breve.
              </p>
            </div>
          )}
        </div>
      </section>

      {policies.length > 0 && (
        <section className="section rules" id="regras">
          <div className="wrap">
            <h2 className="section-title">Regras de agendamento</h2>
            <ul className="policies">
              {policies.map((p) => (
                <li key={p}>
                  <Icon name="check" className="policy-icon" />
                  <p>{p}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {hasAbout && (
        <section className="section about-min" id="sobre">
          <div className={`wrap about-grid${aboutPhotos.length > 0 ? "" : " about-solo"}`}>
            <div className="about-copy">
              <h2 className="section-title">Sobre</h2>
              {shop.about && <p className="about-text pre">{shop.about}</p>}
            </div>
            {aboutPhotos.length > 0 && (
              <div className="about-photos">
                <PhotoStack items={aboutPhotos} />
              </div>
            )}
          </div>
        </section>
      )}

      {hasVisit && (
        <section className="section visit-min" id="visita">
          <div className="wrap">
            <h2 className="section-title">Contato</h2>
            <ul className="vm-list">
              {shop.address && (
                <li>
                  <Icon name="pin" />
                  <div>
                    <span className="vm-label">Endereço</span>
                    <a href={mapsLink(shop.address)} target="_blank" rel="noreferrer">
                      {shop.address}
                    </a>
                  </div>
                </li>
              )}
              {shop.hours_text && (
                <li>
                  <Icon name="clock" />
                  <div>
                    <span className="vm-label">Funcionamento</span>
                    <span className="pre">{shop.hours_text}</span>
                  </div>
                </li>
              )}
              {shop.phone && (
                <li>
                  <Icon name="whatsapp" />
                  <div>
                    <span className="vm-label">WhatsApp</span>
                    <a href={whatsappLink(shop.phone)} target="_blank" rel="noreferrer">
                      {formatPhone(shop.phone)}
                    </a>
                  </div>
                </li>
              )}
              {shop.instagram && (
                <li>
                  <Icon name="instagram" />
                  <div>
                    <span className="vm-label">Instagram</span>
                    <a href={instagramLink(shop.instagram)} target="_blank" rel="noreferrer">
                      @{shop.instagram}
                    </a>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </section>
      )}

      <footer className="foot">
        <div className="wrap foot-in">
          <span>{shop.name}</span>
          <InstallButton label="Instalar app" />
          <span>
            <a href="/termos">Termos</a> · <a href="/privacidade">Privacidade</a> · <a href="#topo">Voltar ao topo</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
