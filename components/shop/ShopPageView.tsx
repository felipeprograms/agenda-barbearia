import type { PublicBarber, PublicShop } from "@/lib/shopData";
import { formatPhone, instagramLink, mapsLink, whatsappLink } from "@/lib/links";
import { MAX_DAYS_AHEAD } from "@/lib/config";
import { formatBRL, todayLocal } from "@/lib/time";
import BookingFlow from "@/components/BookingFlow";
import { Icon } from "./Icons";
import PhotoStack, { type StackItem } from "./PhotoStack";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Junta os serviços de todos os barbeiros: mesmo nome vira um item só, com o menor preço. */
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

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Página pública completa da barbearia, no formato de site. */
export default function ShopPageView({ shop, focusBarber = false }: { shop: PublicShop; focusBarber?: boolean }) {
  const hasBarbers = shop.barbers.length > 0;
  const services = groupServices(shop.barbers);
  const policies = (shop.policies_text ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6);
  const hasContact = Boolean(shop.phone || shop.instagram);
  const hasVisit = Boolean(shop.hours_text || shop.address || hasContact);
  const minDeposit = hasBarbers ? Math.min(...shop.barbers.map((b) => b.deposit_percent)) : 0;
  const showServices = hasBarbers && services.length > 0;
  const showBarbers = hasBarbers && !focusBarber;

  // As 3 primeiras fotos da galeria vão em "Sobre"; as 3 seguintes em "Serviços".
  const aboutPhotos: StackItem[] = shop.gallery.slice(0, 3).map((src) => ({ src }));
  const servicePhotos: StackItem[] = shop.gallery.slice(3, 6).map((src) => ({ src }));
  const hasAbout = Boolean(shop.about) || aboutPhotos.length > 0;

  const barberStacks = chunk<StackItem>(
    shop.barbers.map((b) => ({
      src: b.photo_url,
      label: b.name,
      initials: initials(b.name),
      href: `/${shop.slug}/${b.slug}#agendar`,
    })),
    3,
  );

  const tagline = shop.tagline ?? "Escolha o barbeiro, o serviço e o horário. O sinal pelo Pix ou cartão garante a sua vaga.";

  return (
    <>
      {/* Menu */}
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
            {hasAbout && <a href="#sobre">Sobre</a>}
            {showBarbers && <a href="#barbeiros">Barbeiros</a>}
            {showServices && <a href="#servicos">Serviços</a>}
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

      {/* Tela inicial: "Agende seu horário" */}
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

      {/* Sobre: texto + fotos sobrepostas */}
      {hasAbout && (
        <section className="section sobre" id="sobre">
          <div className={`wrap duo${aboutPhotos.length > 0 ? "" : " duo-solo"}`}>
            <div className="duo-text">
              <div className="ornament" aria-hidden="true">
                <span />
                <Icon name="scissors" />
                <span />
              </div>
              <h2 className="section-title">Sobre a barbearia</h2>
              {shop.about && <p className="about-text pre">{shop.about}</p>}
              {hasBarbers && (
                <a className="btn btn-primary" href="#agendar">
                  Agendar horário
                </a>
              )}
            </div>
            {aboutPhotos.length > 0 && (
              <div className="duo-photos">
                <PhotoStack items={aboutPhotos} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Barbeiros: fotos sobrepostas, um grupo de até 3 por composição */}
      {showBarbers && (
        <section className="section alt" id="barbeiros">
          <div className="wrap">
            <h2 className="section-title">Nossos barbeiros</h2>
            <p className="section-sub">Toque na foto de um barbeiro para agendar direto com ele.</p>
            <div className="stacks">
              {barberStacks.map((group, i) => (
                <PhotoStack key={i} items={group} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Serviços: fotos sobrepostas + lista de preços */}
      {showServices && (
        <section className="section sobre" id="servicos">
          <div className={`wrap duo duo-flip${servicePhotos.length > 0 ? "" : " duo-solo"}`}>
            {servicePhotos.length > 0 && (
              <div className="duo-photos">
                <PhotoStack items={servicePhotos} />
              </div>
            )}
            <div className="duo-text">
              <h2 className="section-title">Serviços</h2>
              <ul className="price-list">
                {services.map((s) => (
                  <li key={s.name}>
                    <span className="pl-name">
                      {s.name}
                      <small>{s.duration} min</small>
                    </span>
                    <span className="pl-dots" aria-hidden="true" />
                    <span className="pl-price">
                      {s.min !== s.max && <small>a partir de</small>}
                      {formatBRL(s.min)}
                    </span>
                  </li>
                ))}
              </ul>
              <a className="btn btn-primary" href="#agendar">
                Agendar horário
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Faixa dourada */}
      {hasBarbers && (
        <section className="band">
          <div className="wrap band-in">
            <div>
              <h2>
                {minDeposit < 100
                  ? `Garanta o seu horário com um sinal de ${minDeposit}%`
                  : "Pague pelo Pix ou cartão e garanta o seu horário"}
              </h2>
              <p>
                {minDeposit < 100
                  ? "Pague o sinal pelo Pix ou cartão e acerte o restante na barbearia."
                  : "O horário fica reservado assim que o pagamento é confirmado."}
              </p>
            </div>
            <a className="btn btn-dark" href="#agendar">
              Agendar agora
            </a>
          </div>
        </section>
      )}

      {/* Agendamento */}
      <section className="section" id="agendar">
        <div className="wrap wrap-narrow">
          <h2 className="section-title">Agende seu horário</h2>
          <p className="section-sub">Escolha o barbeiro, o serviço, o dia e o horário.</p>
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

      {/* Horário, endereço e contato */}
      {hasVisit && (
        <section className="section alt" id="visita">
          <div className="wrap">
            <h2 className="section-title">Venha nos visitar</h2>
            <div className="visit">
              {shop.hours_text && (
                <div className="visit-item">
                  <div className="ring">
                    <Icon name="clock" />
                  </div>
                  <h3>Horário de funcionamento</h3>
                  <p className="pre">{shop.hours_text}</p>
                </div>
              )}
              {shop.address && (
                <div className="visit-item">
                  <div className="ring">
                    <Icon name="pin" />
                  </div>
                  <h3>Onde fica</h3>
                  <p>{shop.address}</p>
                  <a className="btn btn-small" href={mapsLink(shop.address)} target="_blank" rel="noreferrer">
                    Abrir no mapa
                  </a>
                </div>
              )}
              {hasContact && (
                <div className="visit-item">
                  <div className="ring">
                    <Icon name="phone" />
                  </div>
                  <h3>Contato</h3>
                  <div className="visit-links">
                    {shop.phone && (
                      <a className="btn btn-small" href={whatsappLink(shop.phone)} target="_blank" rel="noreferrer">
                        WhatsApp {formatPhone(shop.phone)}
                      </a>
                    )}
                    {shop.instagram && (
                      <a className="btn btn-small" href={instagramLink(shop.instagram)} target="_blank" rel="noreferrer">
                        @{shop.instagram}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Regras */}
      {policies.length > 0 && (
        <section className="section" id="regras">
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

      <footer className="foot">
        <div className="wrap foot-in">
          <span>{shop.name}</span>
          <a href="#topo">Voltar ao topo</a>
        </div>
      </footer>
    </>
  );
}
