import type { ReactNode } from "react";
import Link from "next/link";
import { PLANS, type PlanId } from "@/lib/plans";
import { formatBRL } from "@/lib/time";
import { Icon } from "@/components/shop/Icons";

const FEATURES = [
  "Página própria, com o seu link, logo e fotos",
  "Vários barbeiros, cada um com agenda e serviços",
  "Sinal por Pix ou cartão direto na conta do barbeiro",
  "Horário reservado e protegido contra duplicidade",
  "Aviso no Telegram a cada novo agendamento",
];

function Price({ cents, small }: { cents: number; small?: boolean }) {
  const [reais, centavos] = formatBRL(cents).replace("R$", "").trim().split(",");
  return (
    <span className={`plan-price${small ? " plan-price-sm" : ""}`}>
      <span className="plan-cur">R$</span> {reais}
      <sup>,{centavos}</sup>
    </span>
  );
}

export default function PlanCards({ action }: { action?: (plan: PlanId) => ReactNode }) {
  const m = PLANS.mensal;
  const a = PLANS.anual;
  return (
    <div className="plans">
      <article className="plan plan-featured">
        <span className="plan-tag">Recomendado</span>
        <h3 className="plan-name">Mensal</h3>
        <Price cents={m.cents} />
        <p className="plan-per">por mês, sem fidelidade</p>
        <ul className="plan-list">
          {FEATURES.map((f) => (
            <li key={f}>
              <Icon name="check" />
              {f}
            </li>
          ))}
        </ul>
        {action ? action("mensal") : (
          <Link className="plan-cta" href="/painel">
            Assinar agora
          </Link>
        )}
      </article>

      <article className="plan">
        <span className="plan-tag plan-tag-dark">Economize 10%</span>
        <h3 className="plan-name">Anual</h3>
        <div className="plan-was">
          <span className="plan-strike">{formatBRL(a.fullCents ?? a.cents).replace("R$", "").trim()}</span>
          <span className="plan-off">10%</span>
        </div>
        <Price cents={a.cents} />
        <p className="plan-per">
          por ano, equivale a {formatBRL(a.perMonthCents)} por mês
        </p>
        <ul className="plan-list">
          <li>
            <Icon name="check" />
            Tudo do plano mensal
          </li>
          <li>
            <Icon name="check" />
            12 meses de acesso com 10% de desconto
          </li>
          <li>
            <Icon name="check" />
            Preço travado durante o ano inteiro
          </li>
        </ul>
        {action ? action("anual") : (
          <Link className="plan-cta plan-cta-outline" href="/painel">
            Assinar agora
          </Link>
        )}
      </article>
    </div>
  );
}
