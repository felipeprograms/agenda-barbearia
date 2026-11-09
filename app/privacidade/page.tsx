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
      <h2>4. Por quanto tempo guardamos</h2>
      <p>Mantemos os dados enquanto a conta existir e pelo prazo exigido por obrigações legais e fiscais.</p>
      <h2>5. Seus direitos</h2>
      <p>
        Você pode pedir confirmação de tratamento, acesso, correção, anonimização ou exclusão dos seus dados, e revogar o
        consentimento, entrando em contato com o responsável pela Plataforma ou com a barbearia onde agendou.
      </p>
      <h2>6. Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), controle de acesso por barbearia e limites contra uso abusivo.</p>
      <h2>7. Contato</h2>
      <p>Encarregado/contato de privacidade: informe aqui o e-mail do responsável.</p>
      <p className="muted">
        Modelo-base. Antes de começar a vender, peça a revisão de um advogado e preencha razão social, CNPJ/CPF e e-mail de
        contato.
      </p>
    </LegalPage>
  );
}
