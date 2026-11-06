import type { PublicBarber, PublicShop } from "@/lib/shopData";
import { formatPhone, instagramLink, mapsLink, whatsappLink } from "@/lib/links";
import { MAX_DAYS_AHEAD } from "@/lib/config";
import { formatBRL, todayLocal } from "@/lib/time";
import BookingFlow from "@/components/BookingFlow";
import { Icon, type IconName } from "./Icons";

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

function serviceIcon(name: string): IconName {
  return /corte|cabelo|degrad|social|infantil|tesoura/i.test(name) ? "scissors" : "comb";
}

/** Página pública completa da barbearia, no formato de site. */
export default function ShopPageView({ shop, focusBarber = false }: { shop: PublicShop; focusBarber?: boolean }) {
  const hasBarbers = shop.barbers.length > 0;
  const services = groupServices(shop.barbers);
  const policies = (shop.policies_text ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6);
  const hasContact = Boolean(shop.phone || shop.instagram);
  const hasVisit = Boolean(shop.hours_text || shop.address || hasContact);
  const hasAbout = Boolean(shop.about || shop.gallery.length > 0);
  const minDeposit = hasBarbers ? Math.min(...shop.barbers.map((b) => b.deposit_percent)) : 0;
  const showServices = hasBarbers && services.length > 0;
  const showBarbers = hasBarbers && !focusBarber;

  const tagline =
    shop.tagline ?? "Escolha o barbeiro, o serviço e o horário. O sinal pelo Pix ou cartão garante a sua vaga.";

  return (
    <>
      {/* Menu */}
      <nav className="nav" aria-label="Menu principal">
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
            {showServices && <a href="#servicos">Serviços</a>}
            {showBarbers && <a href="#barbeiros">Barbeiros</a>}
            {hasAbout && <a href="#sobre">Sobre</a>}
            {hasVisit && <a href="#visita">Contato</a>}
          </div>
          <a className="btn btn-small nav-cta" href="#agendar">
            Agendar horário
          </a>
        </div>
      </nav>

      {/* Capa */}
      <header className="hero-full" id="topo">
        {shop.cover_url && (
          <div className="hero-bg" style={{ backgroundImage: `url(${JSON.stringify(shop.cover_url)})` }} aria-hidden="true" />
        )}
        <div className="hero-content">
          {!shop.logo_url && (
            <div className="hero-ornament" aria-hidden="true">
              <span />
              <Icon name="scissors" />
              <span />
            </div>
          )}
          <h1 className={shop.logo_url ? "sr-only" : "wordmark"}>{shop.name}</h1>
          {shop.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hero-logo" src={shop.logo_url} alt="" />
          )}
          <p className="hero-tag">{tagline}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#agendar">
              Agendar horário
            </a>
            {showServices && (
              <a className="btn" href="#servicos">
                Ver serviços
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Serviços */}
      {showServices && (
        <section className="section" id="servicos">
          <div className="wrap">
            <h2 className="section-title">Serviços</h2>
            <p className="section-sub">Escolha o que combina com você e reserve o horário em poucos toques.</p>
            <ul className="svc-grid">
              {services.map((s) => (
                <li className="svc" key={s.name}>
                  <Icon name={serviceIcon(s.name)} className="svc-icon" />
                  <h3>{s.name}</h3>
                  <p className="muted">{s.duration} min</p>
                  <div className="svc-price">
                    {s.min !== s.max && <small>a partir de</small>}
                    {formatBRL(s.min)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Barbeiros */}
      {showBarbers && (
        <section className="section alt" id="barbeiros">
          <div className="wrap">
            <h2 className="section-title">Nossos barbeiros</h2>
            <p className="section-sub">Toque em um barbeiro para agendar direto com ele.</p>
            <ul className="barber-grid">
              {shop.barbers.map((b) => (
                <li key={b.id}>
                  <a className="barber-card" href={`/${shop.slug}/${b.slug}#agendar`}>
                    <span className="barber-photo">
                      {b.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.photo_url} alt="" loading="lazy" />
                      ) : (
                        <span className="barber-initials" aria-hidden="true">
                          {initials(b.name)}
                        </span>
                      )}
                    </span>
                    <span className="barber-name">{b.name}</span>
                    <span className="btn btn-small">Agendar</span>
                  </a>
                </li>
              ))}
            </ul>
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

      {/* Sobre e galeria */}
      {hasAbout && (
        <section className="section alt" id="sobre">
          <div className="wrap">
            <h2 className="section-title">Sobre a barbearia</h2>
            {shop.about && <p className="about-text pre">{shop.about}</p>}
            {shop.gallery.length > 0 && (
              <div className="gallery gallery-wide">
                {shop.gallery.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" aria-label="Abrir foto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" loading="lazy" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Horário, endereço e contato */}
      {hasVisit && (
        <section className="section" id="visita">
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
        <section className="section alt" id="regras">
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
