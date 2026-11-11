import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <LegalPage title="Política de privacidade" updated="novembro de 2026">
      <p>Esta política explica como tratamos dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>
      <h2>1. Dados que coletamos</h2>
      <p>
        <strong>Clientes que agendam:</strong> nome, telefone, e-mail (opcional), serviço, data e horário e o status do
        pagamento. <strong>Donos e barbeiros:</strong> e-mail, senha (guardada de forma criptografada), dados da barbearia,
        fotos e identificação da conta Mercado Pago conectada.
      </p>
      <h2>2. Para que usamos</h2>
      <p>
        Realizar e confirmar agendamentos, cobrar o sinal, avisar o barbeiro (por exemplo via Telegram), devolver valores
        quando houver cancelamento, cobrar a assinatura e manter a segurança do sistema.
      </p>
      <h2>3. Com quem compartilhamos</h2>
      <p>
        Com a barbearia escolhida (nome e telefone do cliente), com o Mercado Pago (pagamentos) e com provedores que operam o
        sistema (Supabase e Vercel, para banco de dados e hospedagem; Telegram, para avisos). Não vendemos dados.
      </p>
      <p>
        <strong>Quem é quem:</strong> em relação aos dados dos clientes que agendam, a barbearia escolhida decide como usá-los
        (controladora) e a Plataforma os trata em nome dela para operar o agendamento (operadora). Em relação aos dados de
        cadastro de donos e barbeiros, a Plataforma é a controladora.
      </p>
      <p>
        <strong>Transferência internacional:</strong> alguns desses provedores (Supabase, Vercel, Cloudflare, Telegram) podem
        armazenar ou processar dados em servidores fora do Brasil, sempre com as garantias previstas na LGPD. A verificação
        anti-robô é feita pela Cloudflare (Turnstile) no login e no cadastro.
      </p>
      <h2>4. Por quanto tempo guardamos</h2>
      <p>Mantemos os dados enquanto a conta existir e pelo prazo exigido por obrigações legais e fiscais.</p>
      <h2>5. Seus direitos</h2>
      <p>
        Você pode pedir confirmação de tratamento, acesso, correção, anonimização ou exclusão dos seus dados, e revogar o
        consentimento, escrevendo para felipefernand3sz@gmail.com ou falando com a barbearia onde agendou.
      </p>
      <h2>6. Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), controle de acesso por barbearia e limites contra uso abusivo.</p>
      <h2>7. Incidentes e contato</h2>
      <p>Se houver um incidente de segurança que possa causar risco relevante aos titulares, avisaremos os afetados e a ANPD, conforme a lei.</p>
      <p>Encarregado/contato de privacidade: <a href="mailto:felipefernand3sz@gmail.com">felipefernand3sz@gmail.com</a>.</p>
      <p className="muted">
        Modelo-base. Antes de começar a vender, peça a revisão de um advogado e preencha razão social, CNPJ/CPF e e-mail de
        contato.
      </p>
    </LegalPage>
  );
}
