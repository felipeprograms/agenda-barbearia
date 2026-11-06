import Link from "next/link";

export default function Home() {
  return (
    <div className="container stack-lg">
      <header className="hero">
        <h1>Agenda online para barbearias</h1>
        <p>
          O cliente escolhe o barbeiro, paga o sinal pelo Pix ou cartão e o horário fecha sozinho. O barbeiro recebe
          o aviso na hora.
        </p>
        <div className="rule" />
      </header>
      <div className="row">
        <Link className="btn btn-primary" href="/painel">
          Entrar no painel
        </Link>
      </div>
      <p className="muted">
        É cliente? Peça o link de agendamento à sua barbearia. Ele tem o formato <code>/nome-da-barbearia</code>.
      </p>
    </div>
  );
}
