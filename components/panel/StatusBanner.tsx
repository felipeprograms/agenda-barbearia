import { shopState, formatDateBR } from "@/lib/shopStatus";
import { todayLocal, addDays } from "@/lib/time";

/** Aviso no topo do painel quando a barbearia ainda não foi liberada, venceu ou está perto de vencer. */
export default function StatusBanner({ status, paidUntil }: { status: string; paidUntil: string | null }) {
  const state = shopState(status, paidUntil);
  const whatsapp = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");
  const contact = whatsapp ? (
    <>
      {" "}
      <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
        Falar com o suporte
      </a>
      .
    </>
  ) : null;

  if (state === "pending") {
    return (
      <div className="card notice" role="status">
        <h3>Cadastro em análise</h3>
        <p className="muted" style={{ margin: 0 }}>
          Sua página fica no ar assim que o administrador liberar o acesso. Enquanto isso, você já pode enviar o logo, a
          capa e preencher as informações.{contact}
        </p>
      </div>
    );
  }
  if (state === "suspended") {
    return (
      <div className="card notice" role="status">
        <h3>Acesso suspenso</h3>
        <p className="muted" style={{ margin: 0 }}>
          A página de agendamento está fora do ar. Fale com o administrador para regularizar.{contact}
        </p>
      </div>
    );
  }
  if (state === "expired" && paidUntil) {
    return (
      <div className="card notice" role="status">
        <h3>Mensalidade vencida</h3>
        <p className="muted" style={{ margin: 0 }}>
          O acesso venceu em {formatDateBR(paidUntil)} e a página de agendamento está fora do ar. Ela volta assim que a
          renovação for confirmada.{contact}
        </p>
      </div>
    );
  }
  if (state === "open" && paidUntil && paidUntil <= addDays(todayLocal(), 5)) {
    return (
      <div className="card notice" role="status">
        <h3>Renovação próxima</h3>
        <p className="muted" style={{ margin: 0 }}>
          Seu acesso vence em {formatDateBR(paidUntil)}. Renove para a página não sair do ar.{contact}
        </p>
      </div>
    );
  }
  return null;
}
