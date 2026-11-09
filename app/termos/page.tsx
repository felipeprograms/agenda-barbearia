import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <LegalPage title="Termos de uso" updated="novembro de 2026">
      <p>
        Estes termos valem para o uso da plataforma de agendamento para barbearias (&quot;Plataforma&quot;). Ao criar uma conta
        ou fazer um agendamento, você concorda com eles.
      </p>
      <h2>1. O que a Plataforma faz</h2>
      <p>
        Oferece a cada barbearia uma página de agendamento, um painel de gestão e a cobrança de sinal (entrada) por Pix ou
        cartão, repassada diretamente à conta Mercado Pago do barbeiro. A Plataforma não presta o serviço de barbearia e não
        é parte do contrato entre cliente e barbeiro.
      </p>
      <h2>2. Cadastro e responsabilidades da barbearia</h2>
      <p>
        O dono da barbearia é responsável pelas informações cadastradas (serviços, preços, horários), pela segurança da sua
        senha e pelo atendimento prestado. A assinatura mensal ou anual dá acesso à Plataforma enquanto estiver em dia; o
        acesso pode ser suspenso em caso de atraso ou uso indevido.
      </p>
      <h2>3. Agendamento, sinal e cancelamento</h2>
      <p>
        O horário fica reservado por 10 minutos para o pagamento do sinal. Depois de pago, o agendamento é confirmado. O
        cliente pode cancelar pela página do agendamento com antecedência mínima definida pela Plataforma; nesse caso o sinal é
        devolvido integralmente pelo mesmo meio de pagamento. Cancelamentos fora do prazo devem ser tratados diretamente com a
        barbearia. Se a barbearia cancelar, o sinal é sempre devolvido.
      </p>
      <h2>4. Pagamentos</h2>
      <p>
        Os pagamentos são processados pelo Mercado Pago, sujeitos aos termos e taxas dele. A Plataforma não armazena dados de
        cartão.
      </p>
      <h2>5. Uso adequado</h2>
      <p>
        É proibido tentar acessar dados de outras barbearias, sobrecarregar o sistema, enviar conteúdo ilegal ou usar a
        Plataforma para fraude.
      </p>
      <h2>6. Disponibilidade</h2>
      <p>
        Trabalhamos para manter o serviço no ar, mas não garantimos funcionamento ininterrupto. Podem ocorrer manutenções e
        falhas de serviços de terceiros (hospedagem, banco de dados, Mercado Pago, Telegram).
      </p>
      <h2>7. Alterações e contato</h2>
      <p>
        Podemos atualizar estes termos; a data acima indica a versão vigente. Dúvidas: use o contato informado pelo
        responsável pela Plataforma.
      </p>
      <p className="muted">
        Modelo-base. Antes de começar a vender, peça a revisão de um advogado e complete com razão social, CNPJ/CPF e e-mail
        de contato.
      </p>
    </LegalPage>
  );
}
