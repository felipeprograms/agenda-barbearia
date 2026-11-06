import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Icon, type IconName } from "@/components/shop/Icons";

const STEPS = [
  { title: "Cadastre a barbearia", text: "Crie sua conta no painel, escolha o endereço do seu link e envie o logo e as fotos. Depois o administrador libera o acesso." },
  { title: "Convide os barbeiros", text: "Gere um código por barbeiro. Cada um cria a própria conta, define serviços e horários e conecta o próprio Mercado Pago." },
  { title: "Divulgue o link", text: "Coloque o link da barbearia no Instagram e no WhatsApp. O cliente escolhe, paga o sinal e o horário fecha sozinho." },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "link", title: "Link e visual próprios", text: "Cada barbearia tem seu endereço, logo, capa, galeria, horários e regras." },
  { icon: "wallet", title: "Pix ou cartão direto ao barbeiro", text: "O sinal cai na conta do Mercado Pago de quem vai atender, sem passar por você." },
  { icon: "clock", title: "Horário protegido", text: "O horário fica reservado por 10 minutos e some da agenda assim que o pagamento é confirmado." },
  { icon: "bell", title: "Aviso no Telegram", text: "O barbeiro é avisado na hora, com nome do cliente, serviço e horário." },
];

export default function Home() {
  return (
    <>
      <div className="home-hero">
        <nav className="nav" aria-label="Menu principal">
          <div className="wrap nav-in">
            <Link className="brand" href="/">
              <Icon name="scissors" />
              {BRAND}
            </Link>
            <div className="nav-links">
              <a href="#como-funciona">Como funciona</a>
              <a href="#vantagens">Vantagens</a>
            </div>
            <Link className="btn btn-small nav-cta" href="/painel">
              Entrar no painel
            </Link>
          </div>
        </nav>

        <header className="hero-full">
          <div className="hero-content">
            <div className="home-brand">
              <Icon name="scissors" />
              {BRAND}
            </div>
            <h1 className="home-title">Agenda online para barbearias</h1>
            <p className="hero-tag">
              O cliente escolhe o barbeiro, paga o sinal pelo Pix ou cartão e o horário fecha sozinho. O barbeiro recebe o
              aviso na hora.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/painel">
                Cadastrar minha barbearia
              </Link>
              <a className="btn" href="#como-funciona">
                Ver como funciona
              </a>
            </div>
          </div>
        </header>
      </div>

      <section className="section" id="como-funciona">
        <div className="wrap">
          <h2 className="section-title">Como funciona</h2>
          <p className="section-sub">Do cadastro ao primeiro horário pago, em três passos.</p>
          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section alt" id="vantagens">
        <div className="wrap">
          <h2 className="section-title">Feito para a rotina da barbearia</h2>
          <ul className="features" style={{ marginTop: 36 }}>
            {FEATURES.map((f) => (
              <li key={f.title}>
                <div className="ring">
                  <Icon name={f.icon} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band">
        <div className="wrap band-in">
          <div>
            <h2>É cliente de uma barbearia?</h2>
            <p>Peça o link de agendamento a ela. Ele tem o formato /nome-da-barbearia.</p>
          </div>
          <Link className="btn btn-dark" href="/painel">
            Sou dono de barbearia
          </Link>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot-in">
          <span>{BRAND}</span>
          <Link href="/painel">Entrar no painel</Link>
        </div>
      </footer>
    </>
  );
}
