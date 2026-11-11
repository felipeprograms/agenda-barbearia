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

## Cadastro de barbeiros pelo dono (sem convite)

No painel, em **Barbeiros da barbearia**, o dono cadastra quantos barbeiros quiser (botão "+ Adicionar mais um barbeiro"), marca "Este barbeiro sou eu" quando também atende e ativa/desativa cada um. Em **Configurar** ele edita foto, sinal, serviços e horários de cada barbeiro.

Para o dinheiro cair na conta de cada barbeiro, o dono envia o **link de conexão** (`/conectar/<código secreto>`): o barbeiro, sem criar conta, conecta o próprio Mercado Pago e o Telegram. O convite com login próprio continua disponível, recolhido, na área da barbearia.

**Obrigatório:** rodar `supabase/migracao-equipe.sql` no Supabase (SQL Editor) antes de publicar.

## Visual da página da barbearia

Fundo em degradê (sem quadriculado), menu flutuando sobre a imagem inicial, barbeiros em fotos redondas ao lado dos serviços, agendamento com cartões que se elevam e seção "Sobre" discreta no fim. A fonte Barlow Condensed e a Anton vêm do Google Fonts (precisam de internet).

## Planos e mensalidade (Mercado Pago)

- Planos públicos: **Mensal R$ 39,90** e **Anual R$ 430,92** (12 × 39,90 = 478,80 com 10% de desconto, equivale a R$ 35,91 por mês). Preços e desconto ficam em `lib/plans.ts`.
- O dono paga em **Painel → Plano e pagamento** (Pix ou cartão). Ao confirmar, o sistema soma os dias ao vencimento e, se a barbearia estava "em análise", libera na hora.
- O **plano de teste não aparece para o público**: só você, no `/admin`, usa "Liberar teste de N dias" nas barbearias em análise.
- Precisa de: `supabase/migracao-assinatura.sql` rodada no Supabase e a variável `PLATFORM_MP_ACCESS_TOKEN` (Access Token de produção da SUA conta do Mercado Pago) na Vercel, seguida de Redeploy.

## Senhas

- **Esqueci minha senha:** na tela de login do painel e do /admin. Envia um link por e-mail que abre `/painel/senha`.
  No Supabase: *Authentication → URL Configuration* precisa ter o endereço do site em **Site URL** e `https://SEU-SITE.vercel.app/**` em **Redirect URLs**.
- **Alterar minha senha:** dentro do painel (donos e barbeiros) e do /admin (administrador), mínimo 8 caracteres.
- **Admin troca a senha de um dono:** em `/admin`, no cartão da barbearia, "Definir uma nova senha para o dono". Útil quando o e-mail do Supabase não chega.

## Limite de requisições (rate limit)

`lib/rateLimit.ts` conta as chamadas por IP (e por e-mail no login) e responde **429** com o cabeçalho **Retry-After**. Os limites de cada rota estão em `LIMITS` no mesmo arquivo. Login, cadastro e "esqueci minha senha" passam por `/api/auth`. Para valer entre todas as instâncias, rode `supabase/migracao-limites.sql` (sem ela, usa um contador em memória por instância). O projeto não tem chamadas de IA; a regra `ai` já existe para quando houver.

## Assistentes em popup e calendário

- Painel: "Assistente de configuração da barbearia" (nome, contato, horário, logo e fundo) e "Assistente de configuração do barbeiro" (foto, serviços, horários, Mercado Pago, Telegram). Abrem sozinhos na primeira vez; cada passo tem (i), "Está certo, continuar", "Voltar" e "Fazer depois".
- Agendamento: calendário com todos os dias do mês e seletor de mês. O limite de antecedência fica em `MAX_DAYS_AHEAD` (`lib/config.ts`, hoje 60 dias).

## Segurança, termos e cancelamento

- **Cabeçalhos de segurança** em `next.config.mjs` (anti-clickjacking, nosniff, HSTS, etc.).
- **Termos de uso** (`/termos`) e **Política de privacidade** (`/privacidade`): textos-modelo, peça revisão de um advogado e preencha seus dados.
- **Cancelamento com devolução do sinal**: o cliente cancela em `/pagamento/{id}` até `CANCEL_MIN_HOURS` (2h, em `lib/config.ts`) antes; o barbeiro/dono cancela a qualquer momento pelo painel ("Cancelar e devolver sinal"). A devolução é feita no Mercado Pago com o token do barbeiro; se falhar, nada é alterado.
- **Limite de armazenamento de fotos**: rode `supabase/migracao-armazenamento.sql` (1 MB por arquivo, 40 arquivos por usuário). O site reduz a foto para até 900 KB antes de enviar.

## Captcha (Cloudflare Turnstile)

1. Em dash.cloudflare.com → Turnstile → Add widget: informe o domínio `agenda-barbearia-beta.vercel.app` (e `localhost` para testes), modo Managed.
2. Copie a **Site Key** para `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Vercel, tipo Config) e a **Secret Key** para o Supabase (Authentication → Attack Protection → Enable Captcha → Cloudflare Turnstile).
3. Faça o Redeploy. Ordem importa: coloque a Site Key na Vercel e publique ANTES de ligar o Captcha no Supabase, senão o login para de funcionar.

## App instalável (PWA)

- `app/manifest.ts`: app do painel (abre em `/painel`). Cada barbearia tem o seu em `/<barbearia>/manifest.webmanifest` (abre em `/<barbearia>`).
- `public/sw.js`: guarda só ícones e arquivos estáticos com hash, mais `public/offline.html`. Nunca guarda páginas, `/api`, login nem pagamentos. Só é registrado em produção.
- Botão "Instalar app" no painel e no rodapé da barbearia (no iPhone mostra o passo a passo do Safari).
- Ícones em `public/icons/`. Para trocar a imagem do app, substitua esses PNGs (192, 512, 512 maskable e 180).
- Rode `supabase/migracao-slugs.sql` para reservar nomes que o sistema já usa (termos, privacidade etc.).

## Avisos no celular (Web Push)

1. `npm install` (adiciona `web-push`).
2. Gere as chaves: `npx web-push generate-vapid-keys`. Coloque na Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Config), `VAPID_PRIVATE_KEY` (Secret) e `VAPID_SUBJECT` (`mailto:seu-email`). Faça o Redeploy (a chave pública é gravada no build).
3. Rode `supabase/migracao-push.sql`.
4. No painel (site publicado, app instalado no iPhone), toque em "Ativar avisos neste celular" e depois em "Enviar teste".
Os avisos saem junto com o Telegram quando um agendamento é confirmado ou cancelado pelo cliente. O barbeiro e o dono da barbearia recebem.
