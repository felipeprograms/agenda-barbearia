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
      <h2>6. Conteúdo publicado pela barbearia</h2>
      <p>
        A barbearia é a única responsável pelos textos, preços, fotos e logotipos que publica, e declara ter autorização das
        pessoas que aparecem nas imagens (direito de imagem) e dos titulares de marcas e fotografias. Podemos remover
        conteúdo ilegal ou que viole direitos de terceiros.
      </p>
      <h2>7. Assinatura, cancelamento e reembolso</h2>
      <p>
        A assinatura (mensal ou anual) é paga adiantada e <strong>não renova sozinha</strong>: para encerrar, basta não pagar
        o período seguinte. Quem contrata pela internet pode desistir em até 7 dias corridos da primeira contratação, com
        reembolso integral, pedindo pelo e-mail de contato. Depois disso, o valor do período já utilizado não é devolvido.
      </p>
      <h2>8. Disponibilidade e limite de responsabilidade</h2>
      <p>
        Trabalhamos para manter o serviço no ar, mas não garantimos funcionamento ininterrupto: podem ocorrer manutenções e
        falhas de serviços de terceiros (hospedagem, banco de dados, Mercado Pago, Telegram). Na extensão permitida pela lei,
        não respondemos por lucros cessantes nem por danos indiretos, e nossa responsabilidade total fica limitada ao valor
        pago pela barbearia pela assinatura nos 12 meses anteriores ao fato. Isso não afasta direitos que a lei garante ao
        consumidor.
      </p>
      <h2>9. Alterações e contato</h2>
      <p>
        Podemos atualizar estes termos; a data acima indica a versão vigente. Dúvidas: escreva para <a href="mailto:felipefernand3sz@gmail.com">felipefernand3sz@gmail.com</a>.
      </p>
      <p className="muted">
        Modelo-base. Antes de começar a vender, peça a revisão de um advogado e complete com razão social, CNPJ/CPF e e-mail
        de contato.
      </p>
    </LegalPage>
  );
}
