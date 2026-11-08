# Agenda Barbearia

Sistema de agendamento para barbearias. Cada **barbearia** tem um link (`/nome-da-barbearia`) e cada **barbeiro** tem
cadastro próprio, com a própria conta do Mercado Pago (o dinheiro cai direto nele) e o próprio Telegram.

Fluxo do cliente: abre o link → escolhe barbeiro, serviço, dia e horário → paga o sinal (**Pix** ou **cartão**) →
o horário some da lista e o barbeiro recebe o aviso no Telegram.

> ⚠️ O código foi escrito sem conseguir rodar `npm install`/`npm run build` (o ambiente onde foi criado bloqueia o npm).
> A lógica de horários foi testada e os tipos foram conferidos, mas **o primeiro build é o seu**. Se der erro, me mande
> a mensagem que eu corrijo.

## Custos

| Item | Custo |
|---|---|
| Vercel (hospedagem) | grátis no plano Hobby |
| Supabase (banco e login) | grátis no plano Free |
| Telegram | grátis |
| Mercado Pago | sem mensalidade; cobra taxa por pagamento (cartão costuma ser mais caro que Pix, **confira as taxas atuais** na conta do barbeiro) |
| Domínio próprio (opcional) | cerca de R$ 40/ano no Registro.br |

## Passo a passo

### 1. Supabase
1. Crie um projeto em supabase.com.
2. **SQL Editor → New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
   Depois, em uma **nova query**, cole o conteúdo de `supabase/migracao-vitrine.sql` e clique em **Run**. Ele cria os campos da página da barbearia (logo, capa, endereço, galeria) e o local onde as fotos são guardadas.
3. **Project Settings → API**: copie `Project URL`, `anon public` e `service_role` (esta é secreta).
4. **Authentication → Providers → Email**: para testar mais rápido, desligue “Confirm email”. Em produção, deixe ligado.

### 2. Bot do Telegram
1. No Telegram, converse com **@BotFather** → `/newbot` → guarde o **token** e o **username** do bot (sem o @).
2. Invente um texto secreto qualquer (ex.: `x9k2m4p7q1`) para `TELEGRAM_WEBHOOK_SECRET`.
3. Depois do deploy (passo 4), registre o webhook trocando os 3 valores:
   ```
   curl "https://api.telegram.org/botSEU_TOKEN/setWebhook" \
     -d "url=https://SEU-SITE/api/telegram" \
     -d "secret_token=SEU_SEGREDO"
   ```

### 3. Variáveis de ambiente
Copie `.env.example` para `.env.local` (teste local) e cadastre as mesmas no Vercel
(**Settings → Environment Variables**). `APP_URL` é o endereço público do site, com `https://` e sem barra no final.

> O Mercado Pago só avisa o pagamento por webhook e só aceita retorno do cartão em **https**. Mesmo sem webhook o
> sistema confere o pagamento sozinho a cada 3 segundos enquanto o cliente está na tela, mas só em https o fluxo
> completo funciona (principalmente o cartão, que sai do site e volta).

### 4. Publicar no Vercel
1. Suba a pasta para um repositório no GitHub.
2. No vercel.com: **Add New → Project** → escolha o repositório → cadastre as variáveis → **Deploy**.
3. Faça o passo 2.3 (webhook do Telegram) com o endereço que o Vercel gerou.

### 5. Primeiro uso (você ou o cliente que vai testar)
1. Abra `/painel`, crie a conta e escolha **Sou dono de barbearia** → defina o endereço do link.
2. Em **Você também atende clientes?**, crie seu cadastro de barbeiro.
3. No cadastro de barbeiro:
   - **Mercado Pago**: cole o **Access Token** da aplicação do barbeiro (developers do Mercado Pago → Suas integrações → credenciais de produção). Para testar sem dinheiro de verdade, use as credenciais de teste.
   - **Telegram**: clique em *Conectar Telegram* e toque em *Iniciar* no bot.
   - **Serviços** e **Horários**: cadastre (há um botão que preenche segunda a sábado, 9h às 19h).
4. Abra `/nome-da-barbearia` no celular e faça um agendamento de teste.
5. Para convidar outros barbeiros: no painel, **Gerar convite** → envie o código → o barbeiro cria conta em `/painel`, escolhe **Tenho um convite** e conecta o próprio Mercado Pago.

## Visual, fotos e página da barbearia

O tema (preto e ouro) fica nas variáveis do início de `app/globals.css`.

Cada barbearia monta a própria página pelo painel, na seção **Página da barbearia**: foto de capa, galeria (até 8 fotos),

**Logo:** em *Página da barbearia → Logo da barbearia*, envie um PNG com fundo transparente e letras claras (o fundo da capa é escuro). Ele substitui o nome em letras grandes no topo e no menu. Se você já tinha rodado `migracao-vitrine.sql` antes, rode de novo: ele é seguro de repetir e acrescenta o campo do logo.

A página pública é um site completo (menu, serviços, barbeiros, agendamento, galeria, horário, endereço e regras) e se adapta ao celular e ao computador. Fotos de exemplo não vêm no projeto: cada barbearia usa as próprias.
frase de apresentação, sobre, endereço, WhatsApp, Instagram, horário de funcionamento e regras. Cada barbeiro envia a
própria foto em **Sua foto**. As fotos são reduzidas no navegador antes do envio (máximo de 1600 px) e guardadas no Supabase.
A página só mostra o que foi preenchido.

Use fotos suas ou de bancos gratuitos que permitam uso comercial (por exemplo Unsplash e Pexels). Não use imagens
copiadas de outros sites ou de modelos de design.

Para um fundo de página com foto, salve uma imagem como `public/fundo.jpg`. Sem ela, o site usa `public/fundo-padrao.svg`.
As fontes vêm do Google Fonts, então precisam de internet para carregar.

## Como funciona por dentro

- **Sem horário duplicado**: o banco impede, por regra própria, dois agendamentos sobrepostos do mesmo barbeiro. Se duas pessoas tentarem o mesmo horário ao mesmo tempo, só uma consegue.
- **Reserva de 10 minutos**: ao gerar o Pix (ou abrir o cartão), o horário fica preso por 10 minutos. Sem pagamento, ele volta a ficar livre.
- **Confirmação segura**: o sistema nunca confia no aviso recebido; ele sempre consulta o pagamento no Mercado Pago com o token do barbeiro e confere o valor.
- **Pagou tarde**: se o cliente pagar depois dos 10 minutos e o horário ainda estiver livre, confirma; se outra pessoa já pegou, o barbeiro recebe um aviso para devolver o valor.
- **Token do Mercado Pago**: fica numa tabela que o navegador não consegue ler (só o servidor).
- **Cartão**: abre a página do Mercado Pago só com cartão, à vista (sem parcelas), e volta para `/pagamento/<id>`.

## O que ainda não existe (ideias para depois)

- Cancelar/remarcar pelo cliente (hoje é combinado direto com o barbeiro).
- Devolução automática do Pix/cartão (hoje o barbeiro devolve pelo app do Mercado Pago).
- Aviso por WhatsApp (a API oficial é paga por mensagem; o Telegram resolve de graça por enquanto).
- Cobrança da mensalidade das barbearias (hoje você cobra por fora, por Pix ou boleto).
- Bloquear folgas e feriados específicos (hoje só existe o horário semanal fixo).

## Painel do administrador (liberar barbearias e cobrar mensalidade)

Novas barbearias nascem **aguardando liberação**: a página pública fica fora do ar e o dono não consegue gerar convites até você liberar. Quem libera é o administrador, em `/admin`.

1. No Supabase (SQL Editor), rode `supabase/migracao-admin.sql` (depois do schema e da vitrine). As barbearias que já existiam continuam no ar.
2. Torne a sua conta administradora, rodando no SQL Editor (troque pelo seu e-mail de login):
   ```sql
   insert into platform_admins (user_id)
   select id from auth.users where email = 'SEU-EMAIL@exemplo.com'
   on conflict do nothing;
   ```
3. Entre em `/admin` com essa conta. Para cada barbearia você pode **liberar por N dias**, **renovar +N dias**, **suspender/reativar**, ver barbeiros prontos para receber e agendamentos pagos nos últimos 30 dias, e guardar uma anotação.
4. Mensalidade: você cobra por fora (Pix, por exemplo) e, ao receber, clica em **Renovar +30 dias**. Quando o vencimento passa, a página sai do ar e o dono vê o aviso no painel. "Sem vencimento" serve para contas de teste ou parceiros.
5. Opcional: `NEXT_PUBLIC_SUPPORT_WHATSAPP` (só números, com 55 e DDD) cria o botão "Falar com o suporte" nos avisos.

O dono da barbearia não consegue mexer em situação, vencimento nem endereço (slug): isso é bloqueado no banco, não só na tela.

## Nome do sistema e imagens de fundo

- O nome do sistema (página inicial, painel, administração e aba do navegador) vem de `lib/brand.ts`. O padrão é "Agenda Barbearia". Para trocar sem mexer no código, crie `NEXT_PUBLIC_APP_NAME` na Vercel e faça Redeploy.
- O nome de cada barbearia é editado no painel, em **Página da barbearia → Nome da barbearia**.
- Imagens de fundo: o projeto já traz um desenho próprio (poste, tesoura, pente e navalha em `public/hero-home.svg`). Para usar fotos suas:
  - `public/hero.jpg`: foto do topo da página inicial do sistema (aparece escurecida por cima do desenho).
  - `public/fundo.jpg`: fundo de todas as páginas (painel, administração e agendamento).
  - Use fotos suas ou gratuitas e liberadas (Unsplash, Pexels), horizontais, com 1600 px de largura e menos de 400 KB.
  - A capa de cada barbearia continua sendo enviada pelo dono, no painel. Sem capa, a página da barbearia usa o desenho padrão.

## Botão "Conectar com Mercado Pago" (OAuth)

Com ele o barbeiro não precisa entrar no painel de desenvolvedores: clica, entra com o login dele do Mercado Pago, autoriza e volta conectado. O sistema guarda a autorização só no servidor e renova sozinho quando faltarem menos de 7 dias para vencer (a validade padrão é 180 dias).

Configuração, uma vez só, por você (dono da plataforma):

1. No Supabase (SQL Editor), rode `supabase/migracao-oauth.sql`.
2. Em Mercado Pago Developers, abra a sua aplicação, vá em **Detalhes da aplicação** e preencha **URLs de redirecionamento** com exatamente `https://SEU-SITE.vercel.app/api/mp/callback` (o mesmo endereço do `APP_URL`, mais `/api/mp/callback`, sem barra no final).
3. Em **Credenciais de produção**, copie o **Client ID** (também chamado de número da aplicação) e o **Client Secret**.
4. Na Vercel, crie `MP_CLIENT_ID` e `MP_CLIENT_SECRET` com esses valores e faça Redeploy. O `APP_URL` precisa estar com `https://`.
5. No painel do barbeiro, o botão **Conectar com Mercado Pago** passa a funcionar. A opção de colar o token continua disponível em "Avançado".

Se as variáveis não estiverem configuradas, o botão avisa e o barbeiro usa a opção de colar o token.


## Tela inicial da barbearia ("Agende seu horário")

No painel, em **Perfil da barbearia**, há dois campos:
- **Logo**: aparece acima da frase "Agende seu horário" (e no menu).
- **Imagem de fundo da tela inicial**: aparece desfocada e escurecida atrás da frase.

Fotos da galeria (até 6): as 3 primeiras ficam em "Sobre a barbearia" e as 3 seguintes em "Serviços", em composição de fotos sobrepostas. Os barbeiros aparecem em grupos de 3 fotos sobrepostas. A fonte Anton da frase é carregada do Google Fonts (precisa de internet). Não há migração nova no Supabase para esta mudança.
