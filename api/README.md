# API da Minha companhia

Contas da família e da profissional, login, sessões, pedidos de serviço e avaliações nos dois sentidos. A mesma API serve as telas estáticas do projeto, na mesma origem: entrar.html, painel.html e pedidos.html usam a API quando abertas por http; abertas como arquivo, ficam na demonstração com dados fixos.

## Rodar

```bash
cd api
npm install
npm run seed     # contas e pedidos de demonstração (só fora de produção)
npm run dev      # http://127.0.0.1:4175 (a 4173 fica para o servidor estático do protótipo)
```

Sem `DATABASE_URL`, o banco é um Postgres embutido (PGlite) gravado em `api/.data/pglite`. O PGlite só aceita um processo por vez: **pare a API antes de rodar `npm run seed`** (ou os scripts `admin` e `aprovar`) e suba de novo depois. Com os dois rodando juntos, a API continua vendo os dados antigos. Para um Postgres de verdade, defina `DATABASE_URL=postgres://…` (ver `.env.example`). As migrations rodam sozinhas ao iniciar (na Vercel, no build).

- `npm test`: testes (banco em memória, relógio controlado)
- `npm run typecheck`
- `npm run db:gerar`: gera uma migration nova em `drizzle/` depois de mudar `src/db/schema.ts`
- `npm run admin -- <email>`: dá acesso de administração a uma conta
- `npm run aprovar -- <slug>`: atalho de desenvolvimento que aprova um perfil sem passar pelos documentos

## Vercel

O projeto na Vercel usa **Root Directory = `api`** e a predefinição Fastify. Tudo vira uma função só, que serve a API e as telas.

- **Entrada:** `index.ts` exporta um handler `(req, res)`. A Vercel escolhe o primeiro arquivo entre `app`, `index`, `server`, `src/app`, `src/index` e `src/server` que importe `fastify`. Sem o `index.ts`, ela pegaria `src/app.ts`, que só monta o app.
- **Build:** `npm run vercel-build` copia as telas para `api/public/` (`montar-public`) e aplica as migrations (`db:migrar`). As telas entram na função porque `src/iniciar.ts` aponta para `public/`.
- **Variáveis:** `DATABASE_URL` (Postgres, obrigatória: sem ela o build e a função param com erro), `SEGREDO_AGENDA`, `RESEND_API_KEY` e `EMAIL_REMETENTE` (para o código de e-mail sair) e, para cobrar de verdade, `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET` e `SITE_URL`. Builds de preview **não** rodam as migrations: com a mesma `DATABASE_URL` da produção, uma migration de branch mudaria o banco real. Com banco próprio no Preview (branch do Neon por preview), ligue `PREVIEW_COM_BANCO_PROPRIO=1` no ambiente Preview. Na Vercel a API roda sempre em modo de produção, mesmo sem `NODE_ENV`.
- **Pacotes só-ESM:** o carregador da Vercel não aceita `require()` de pacote ESM, embora o Node 22 aceite. Por isso as telas não usam o `@fastify/static`: a 9.x tem o desvio do `allowedPath` (GHSA-8pvw-jcv7-9cmj) e a 10.x, que corrige, puxa o `content-disposition` 3, só-ESM, que derruba a função ao carregar. `src/telas.ts` serve só os nomes da lista, conferidos no caminho cru.
- **Arquivos enviados:** o disco da função é só leitura. Documentos e fotos falham até existir um bucket.

## Stack

Node 22 + TypeScript (rodando com tsx), Fastify 5, PostgreSQL com Drizzle ORM, Zod para validar entradas, argon2id para senhas.

## Regras

- **Uma pessoa, uma conta.** O papel vem das tabelas ligadas ao usuário: `contratantes` (família) e `profissionais`.
- **Sessão:** cookie `mc_sessao` httpOnly, SameSite=Lax (Secure em produção), válido por 30 dias. O banco guarda só o hash SHA-256 do token. Pedidos que mudam algo vindos de outra origem são recusados.
- **Login:** a mesma mensagem e o mesmo tempo de resposta para senha errada e e-mail sem conta. Cadastro e login aceitam 10 tentativas por minuto por IP, contadas no banco (tabela `tentativas`), para valer em todas as instâncias da Vercel. Além disso, 10 tentativas de entrar no mesmo e-mail, de qualquer IP, travam esse e-mail por 15 minutos (também para e-mail sem conta).
- **Chave Pix:** trocar ou tirar pede a senha de novo (os erros somam no limite do login), manda um aviso para o e-mail da conta e a chave nova só recebe repasse 48 horas depois.
- **Senha:** no mínimo 8 caracteres.
- **Profissional:** começa em `rascunho`. O valor da hora é definido depois, no mínimo R$ 70 (7000 centavos, conferido também no banco). O valor não é exigido para entrar na lista de espera. O portfólio público só aparece com o perfil `aprovado` e o valor da hora definido.
- **Verificação e lista de espera:**
  - Para entrar na lista de espera (`em_analise`), a profissional precisa de:
    - e-mail e WhatsApp confirmados por código de 6 dígitos (vale 15 minutos, 5 tentativas, um reenvio por minuto);
    - CPF com dígitos conferidos e único na plataforma;
    - endereço residencial;
    - documento com foto (RG ou CNH) e comprovante de endereço.
  - O CNPJ é opcional. Com ele, pedimos razão social e cartão CNPJ.
  - Quem atende com veículo (`veiculoIncluso`) também envia a CNH, que entra na lista de documentos.
  - Na fila, não dá para passar a oferecer veículo. Depois de aprovada, ela pode mandar a CNH e só passa a oferecer veículo quando a CNH for aprovada.
  - Arquivos aceitos: PDF, JPG, PNG ou HEIC até 10 MB, com o tipo conferido pelos primeiros bytes. Eles ficam fora da pasta pública: só a própria profissional e a administração baixam.
  - Na fila, os dados ficam travados. A administração aprova cada documento, ou recusa com motivo, e depois aprova o perfil (com revisão marcada para um mês depois) ou devolve para correção com motivo.
  - A posição na fila segue a data de envio.
  - Nas respostas da profissional, CPF e CNPJ vão mascarados. Só a ficha da administração mostra completos.
- **Cursos e treinamentos:**
  - A profissional cadastra cada curso com nome, instituição, carga horária e ano (os dois últimos são opcionais), mais o comprovante. Pode fazer isso em qualquer fase.
  - A administração aprova o curso, ou recusa com motivo.
  - Só os aprovados aparecem no portfólio público, com a data da validação.
  - Ela pode apagar um curso, e o comprovante é apagado junto. O limite é de 30 cursos.
- **Foto do perfil:**
  - A profissional envia JPG, PNG, WebP ou HEIC até 10 MB. HEIC só funciona se o sistema conseguir abrir; caso contrário, o erro pede JPG ou PNG.
  - A API regrava a foto: corrige a rotação, limita a 1200 px e salva em WebP. Isso apaga os metadados, inclusive a localização GPS, e só a versão regravada fica guardada.
  - A foto nova entra como enviada e espera a conferência da equipe. A aprovada continua no ar até a nova ser aprovada; aí a antiga é apagada.
  - Foto recusada vem com o motivo.
  - O endereço `/api/fotos/:id` é público só para a foto aprovada de um perfil aprovado (com cache de um dia, porque o endereço muda a cada foto). As outras, só a dona e a administração abrem.
- **Indicações:**
  - Toda conta tem um código (ex.: `ANA-7K2P`) e links de cadastro para profissional e para família.
  - Quem se cadastra com o código fica ligado a quem indicou.
  - Ficam registradas três etapas, que o bônus pode usar quando for definido: cadastro, aprovação (para profissionais) e primeiro serviço feito.
  - Quem indicou vê só o primeiro nome com a inicial de cada pessoa indicada e a etapa em que ela está.
  - O bônus em si (valor, quando paga, limites) ainda não existe.
- **Agenda por assinatura (iCalendar):**
  - Cada conta tem um link `.ics`, que o Google Agenda, o iPhone ou o Outlook assinam. O arquivo é aberto sem sessão: o link é a chave.
  - O token tem 256 bits e sai de um HMAC com `SEGREDO_AGENDA` e um número de versão. Por isso o link é sempre o mesmo; gerar um novo sobe a versão e o antigo para de funcionar.
  - O banco guarda só o hash do token, e o token não aparece no log.
  - O arquivo traz os serviços confirmados ou já feitos da conta, dos dois lados, dos últimos 30 dias em diante. Cancelado e recusado somem; troca de horário aceita muda a data.
  - Cada evento tem UID estável, lembrete 1 hora antes e não traz telefone nem CPF.
  - Limite de 60 leituras por minuto por link.
  - Em produção, sem `SEGREDO_AGENDA`, as rotas respondem 503. Trocar o segredo muda todos os links.
- **Busca:**
  - `GET /api/profissionais` lista só perfis no ar.
  - Filtros:
    - `cidade` e `bairro`: sem diferenciar acento nem maiúscula;
    - `uf`;
    - `tarefa`: `consulta`, `banco`, `mercado`, `passeio` ou `outra` (quem aceita outras a combinar);
    - `veiculo`: `true` ou `false`;
    - `dia` (0 = domingo) ou `data` (AAAA-MM-DD): com `data`, quem está de folga naquele dia fica de fora;
    - `turno`: `m` (7h às 12h), `t` (12h às 18h) ou `n` (18h às 22h).
  - Quem não definiu dias e horários aparece em qualquer dia.
  - `ordem`: `relevancia` (nota revelada), `preco` ou `experiencia`; e `pagina` e `porPagina` (até 50).
  - A resposta traz `total`, a faixa `valorHora` de todas as encontradas e, para cada profissional, tarefas, disponibilidade, `turnos` por dia, nota, foto e datas da revisão. Nunca vai CPF, e-mail ou celular.
  - `GET /api/cidades?q=` lista as cidades atendidas, com o total de profissionais e os bairros de cada uma.
- **Ganhos:**
  - `GET /api/profissionais/eu/ganhos?de=&ate=` traz o extrato da profissional pela data do atendimento. Sem datas, vai dos últimos 30 dias até os próximos 60; o máximo é 13 meses.
  - Cada lançamento traz bruto, desconto dado, taxa, líquido, estado (`previsto`, `aguardando_conclusao`, `programado`, `depositado`) e a data do depósito. A resposta também traz o resumo e os próximos depósitos por dia.
  - Cancelamento em cima da hora feito pela família (menos de `CANCELAMENTO_TARDIO_HORAS` antes) entrava com `CANCELAMENTO_TARDIO_PERCENT` do serviço. Com o pagamento devolvido, que é o caso de todo cancelamento no MVP, ele não entra mais.
  - Serviço pago pelo gateway: fica `depositado` quando o repasse sai, na data do Pix. Antes disso, a data é uma estimativa: o dia útil seguinte à avaliação da família, ou ao fim dos 14 dias para avaliar. `pagamento` traz `{ metodo, parcelas }`.
  - Regras: `TAXA_PLATAFORMA_PERCENT` (12), `PRAZO_DEPOSITO_DIAS_UTEIS` (2, contando os feriados bancários nacionais), `CANCELAMENTO_TARDIO_HORAS` (24) e `CANCELAMENTO_TARDIO_PERCENT` (50).
  - São propostas: a resposta traz `regras.definitivas: false` e `simulado: true`. Serviços sem pagamento pelo gateway (os antigos) seguem a projeção de `PRAZO_DEPOSITO_DIAS_UTEIS`, com `pagamento` null.
- **Pagamentos (MVP com AbacatePay):**
  - A profissional aceita (ou a família aceita a proposta) e o serviço vai para `aguardando_pagamento`. O horário fica reservado, e `respondaAte` vira o prazo para a família pagar (24 h, ou até o início). Sem pagamento no prazo, vira `expirado`.
  - `POST /api/servicos/:id/pagamento` abre o checkout hospedado do AbacatePay (Pix, ou cartão em até 12x com R$ 10 por parcela no mínimo) e devolve a `url`. No cartão, `passFeesToCustomer` faz a família pagar a taxa, inclusive a do parcelamento; o acréscimo fica em `acrescimoCentavos`. Abrir de novo reaproveita a cobrança aberta.
  - A volta do checkout é `pedidos.html?pago=<id>`. A tela chama `GET /api/servicos/:id/pagamento`, que confere a cobrança com o gateway enquanto ela está pendente.
  - O webhook (`POST /api/pagamentos/abacatepay?webhookSecret=…`) só aceita o segredo de `ABACATEPAY_WEBHOOK_SECRET`. O corpo só indica a cobrança: a situação vem sempre de uma consulta ao gateway. Reenvio não muda nada.
  - Pago, o serviço vira `confirmado`. Se o pagamento chega quando o serviço já não espera (expirou ou foi cancelado), ele é devolvido na hora.
  - O dinheiro fica no saldo da plataforma no AbacatePay. Não há split nem retenção do gateway: a retenção é a plataforma não repassar ainda.
  - **Cancelamento:** todo cancelamento antes do início devolve tudo o que a família pagou (estorno integral, com o acréscimo do cartão), quem quer que cancele. Se o gateway recusar (saldo insuficiente, disputa), o serviço fica cancelado, o erro fica em `reembolsoErro`, e a equipe tenta de novo pela administração.
  - **Repasse:** só depois do atendimento feito e da avaliação da família, ou do fim dos 14 dias para avaliar. A equipe libera na aba Pagamentos da administração, e a API manda por Pix (`/pix/send`) o valor do serviço menos a taxa da plataforma para a chave da profissional. Uma trava evita dois Pix com dois cliques. Falha fica como `falhou`, com o motivo, e dá para tentar de novo.
  - A taxa do envio do Pix sai do valor enviado, então a profissional recebe o líquido menos essa taxa.
  - **Chave Pix:** a profissional cadastra em `PATCH /api/profissionais/eu` com `chavePix: { tipo: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM', chave }` (ou null). CPF e CNPJ têm os dígitos conferidos, e o celular vai com DDD, sem +55.
  - **Sem `ABACATEPAY_API_KEY`:** fora de produção, o pagamento é simulado. A cobrança abre `/api/pagamentos/simulado/:id`, uma tela da própria API com Pix e cartão de 1x a 12x, e o Pix do repasse só é registrado. Em produção sem a chave, abrir pagamento responde 503.
  - **Interface `GatewayPagamento`** (`src/pagamentos.ts`): cobrar, consultar, estornar e enviar Pix. Trocar de gateway (Asaas, por exemplo) não mexe nas rotas.
- **Mensagens:** a interface `Mensageiro` (`src/mensagens.ts`) envia e-mail e WhatsApp.
  - **E-mail:** com `RESEND_API_KEY` e `EMAIL_REMETENTE` (de um domínio verificado no Resend), sai pelo Resend. Se o Resend recusar, o pedido responde 500 e o motivo vai para o log.
  - **WhatsApp:** ainda sem provedor. A verificação por código fica desligada; `VERIFICAR_WHATSAPP=1` volta a exigi-la no cadastro profissional.
  - **Sem provedor:** fora de produção, a mensagem só vai para o log do servidor. Em produção, o envio responde 503.
- **Arquivos:** a interface `Armazenamento` (`src/armazenamento.ts`). Em desenvolvimento, os arquivos ficam em disco (`api/.data/arquivos`). Em produção, precisa de um bucket privado (S3 ou R2).
- **Tarefas e mínimo de horas:**
  - A profissional escolhe as tarefas que faz, cada uma com o próprio mínimo de 1 a 12 horas.
  - As tarefas fixas são `consulta` (Consulta ou exame), `banco` (Banco ou cartório), `mercado` (Mercado e farmácia) e `passeio` (Passeio). Ela também pode criar atividades `personalizada`, com nome próprio. Até 10 tarefas no total (fixas mais personalizadas), sem repetir tipo fixo nem nome.
  - `aceitaOutras` libera "Outra tarefa · a combinar", com mínimo de 1 h.
  - A lista só pode ficar vazia se ela aceitar outras.
  - `horasMinimas` passa a ser o menor mínimo da lista.
  - No pedido, `tipoTarefa` (mais `nomeTarefa`, se for personalizada) aplica o mínimo daquela tarefa. Sem `tipoTarefa`, ou com o perfil sem lista, vale `horasMinimas`.
- **Dias e horários, folgas e conflitos:**
  - `disponibilidade` (no PATCH do perfil): `[{ dia: 0-6 (0 = domingo), inicio: "08:00", fim: "18:00" }]`, em horas cheias ou meias, até duas faixas por dia, sem sobrepor. A lista substitui a anterior, e vazia significa sem restrição de horário.
  - Com faixas definidas, o pedido precisa caber inteiro numa faixa do dia, no horário de Brasília. Fora disso, o erro é 422 `fora_da_disponibilidade`, com os horários daquele dia na mensagem.
  - Folgas e bloqueios (`/api/profissionais/eu/bloqueios`) recusam pedidos novos no período com 422 `horario_indisponivel`. A família não vê o motivo.
  - Criar uma folga devolve em `conflitos` os atendimentos confirmados que batem com ela. Eles não mudam sozinhos.
  - Pedido novo, aceite, proposta e aceite da proposta não podem sobrepor outro atendimento confirmado: o erro é 409 `horario_ocupado`.
- **Prazo de resposta:**
  - Pedido e proposta ganham `respondaAte`: 24 horas depois do envio, ou o início do atendimento, se vier antes.
  - Sem resposta no prazo, o serviço passa a `expirado` e não pode mais ser aceito. Isso é conferido sempre que serviços são lidos ou alterados, sem tarefa agendada.
- **Desconto e experiência:** `descontoAPartirHoras` (2 a 12) e `valorHoraDescontoCentavos` (no mínimo R$ 70 e menor que a hora) vão sempre juntos; mande os dois como null para tirar o desconto. O pedido com horas suficientes congela a hora com desconto. `anosExperiencia` vai de 0 a 60.
- **Sem contato por fora:** telefone, e-mail ou link são recusados (400, "Não coloque telefone, e-mail ou link aqui.") nos textos que a outra parte lê: tarefa, observações, recado da proposta, comentário e resposta de avaliação, apresentação e nome das atividades. O `local` (endereço) pode ter números.
- **Pedido de serviço:** o valor da hora fica congelado no pedido e respeita o mínimo de horas da profissional. Pode trazer `local` e `observacoes` (recado para a profissional). Situações: `solicitado`, `proposta_alterada`, `aguardando_pagamento`, `confirmado`, `recusado`, `cancelado`, `realizado`, `expirado`. Cada serviço traz `pagamento` (situação, forma, parcelas, acréscimo e situação do repasse) ou null.
- **Proposta de outro horário:** a profissional propõe outro início ou outra duração, com recado; o pedido fica em `proposta_alterada` até a família aceitar (o novo horário passa a valer e o pedido é confirmado) ou recusar (o pedido se encerra).
- **Lista de serviços:** cada item traz `papel` (de quem pergunta), `minhaNota`, `podeAvaliar` e, nos pedidos recebidos pela profissional, `notaFamilia`.
- **Avaliação:**
  - Cada serviço realizado recebe até duas avaliações: a família avalia a profissional e a profissional avalia a família. A nota vai de 1 a 5, com comentário opcional.
  - É às cegas: ninguém vê a nota da outra parte até as duas avaliarem ou até passarem 14 dias da conclusão. Depois desse prazo não se avalia mais.
  - A média pública da profissional conta só as avaliações já reveladas. Nas avaliações públicas, o nome de quem avaliou aparece abreviado ("Mariana C.").
  - A nota da família não é pública: só a vê a profissional que recebeu um pedido dela.

## Rotas

Todas respondem JSON. Erros vêm como `{ "erro": { "codigo", "mensagem", "campos"? } }`, com mensagens prontas para a tela. Valores são em centavos.

| Método | Rota | Quem |
| --- | --- | --- |
| POST | `/api/contas` | cadastro da família (pode já trazer `pessoaAcompanhada`) |
| POST | `/api/profissionais` | cadastro da profissional |
| POST | `/api/sessoes` | login |
| DELETE | `/api/sessoes/atual` | sair |
| GET | `/api/eu` | conta da sessão |
| GET | `/api/sessao` | sempre 200: a conta, ou `usuario: null` sem sessão (para as telas públicas) |
| GET, POST | `/api/pessoas` | família: pessoas acompanhadas |
| DELETE | `/api/pessoas/:id` | família |
| PATCH | `/api/profissionais/eu` | profissional: valor da hora, desconto, experiência, veículo, bairros, apresentação, `tarefas`, `aceitaOutras`, `disponibilidade` e `chavePix` |
| POST | `/api/profissionais/eu/foto` | profissional: envia foto (multipart `arquivo`) |
| GET | `/api/fotos/:id` | a foto (pública quando aprovada) |
| GET | `/api/admin/fotos` | administração: fotos esperando conferência |
| POST | `/api/admin/fotos/:id/aprovar` · `recusar` | administração (`recusar` pede `motivo`) |
| GET, POST | `/api/profissionais/eu/bloqueios` | profissional: folgas e bloqueios futuros; criar devolve `conflitos` |
| DELETE | `/api/profissionais/eu/bloqueios/:id` | profissional |
| POST | `/api/avaliacoes/:id/resposta` | profissional: responde uma vez à avaliação recebida, depois de ela aparecer |
| POST | `/api/eu/verificacoes` | pede código por `email` ou `whatsapp` |
| POST | `/api/eu/verificacoes/confirmar` | confirma o código |
| GET | `/api/profissionais/eu/verificacao` | profissional: o que falta, documentos, posição na fila |
| PUT | `/api/profissionais/eu/dados-fiscais` | profissional: CPF, CNPJ, razão social e endereço |
| POST | `/api/profissionais/eu/documentos` | profissional: envia um arquivo (multipart: `tipo` e `arquivo`) |
| GET | `/api/profissionais/eu/documentos/:id/arquivo` | profissional: baixa o que enviou |
| POST | `/api/profissionais/eu/analise` | profissional: entra na lista de espera |
| GET, POST | `/api/profissionais/eu/qualificacoes` | profissional: lista e envia curso (multipart: `titulo`, `instituicao`, `cargaHorariaHoras`, `anoConclusao`, `arquivo`) |
| GET | `/api/profissionais/eu/qualificacoes/:id/arquivo` | profissional: baixa o comprovante |
| DELETE | `/api/profissionais/eu/qualificacoes/:id` | profissional: tira o curso do perfil |
| GET | `/api/admin/qualificacoes` | administração: cursos esperando validação |
| GET | `/api/admin/qualificacoes/:id/arquivo` | administração: baixa o comprovante |
| POST | `/api/admin/qualificacoes/:id/aprovar` · `recusar` | administração (`recusar` pede `motivo`) |
| GET | `/api/profissionais` | público: busca com filtros, ordem e página |
| GET | `/api/cidades` | público: cidades atendidas e seus bairros |
| GET | `/api/profissionais/eu/ganhos` | profissional: extrato, resumo e próximos depósitos |
| GET | `/api/agenda/link` | link de assinatura da agenda (`url` e `webcal`) |
| POST | `/api/agenda/link/novo` | troca o link; o antigo deixa de funcionar |
| GET | `/api/agenda/:token.ics` | público com o token: o arquivo da agenda |
| GET | `/api/indicacoes/eu` | código, links, resumo e pessoas indicadas |
| GET | `/api/indicacoes/:codigo` | público: de quem é o código ("Ana O.") |
| GET | `/api/admin/fila` | administração: lista de espera em ordem |
| GET | `/api/admin/profissionais/:id` | administração: ficha completa e histórico de documentos |
| GET | `/api/admin/documentos` | administração: documentos esperando análise; `avulso` marca os de quem está fora da fila (ex.: a CNH de uma aprovada) |
| GET | `/api/admin/documentos/:id/arquivo` | administração: baixa o documento |
| POST | `/api/admin/documentos/:id/aprovar` · `recusar` | administração (`recusar` pede `motivo`) |
| POST | `/api/admin/profissionais/:id/aprovar` · `correcao` | administração (`correcao` pede `motivo`) |
| GET | `/api/profissionais/:slug` | público: portfólio aprovado, com a nota e os cursos validados |
| GET | `/api/profissionais/:slug/avaliacoes` | público |
| GET | `/api/contratantes/:id/avaliacoes` | profissional que recebeu pedido da família |
| POST | `/api/servicos` | família pede um serviço |
| GET | `/api/servicos`, `/api/servicos/:id` | as duas partes |
| POST | `/api/servicos/:id/aceitar` · `recusar` · `propor` · `concluir` | profissional |
| POST | `/api/servicos/:id/aceitar-proposta` · `recusar-proposta` | família |
| POST | `/api/servicos/:id/cancelar` | as duas partes, antes do início; devolve o que a família pagou |
| POST | `/api/servicos/:id/pagamento` | família: abre (ou reaproveita) o checkout de um serviço aceito |
| GET | `/api/servicos/:id/pagamento` | as duas partes: situação do pagamento, conferida com o gateway enquanto pendente |
| POST | `/api/pagamentos/abacatepay?webhookSecret=` | webhook do AbacatePay |
| GET, POST | `/api/pagamentos/simulado/:id` · `/pagar` | só sem chave do AbacatePay, fora de produção: a tela de pagamento simulado |
| GET | `/api/admin/pagamentos` | administração: pagos e retidos, por etapa (`aguardando_atendimento`, `aguardando_avaliacao`, `liberar`, `estornar`, `repassado`) |
| POST | `/api/admin/pagamentos/:id/repassar` · `estornar` | administração: envia o repasse por Pix; tenta de novo a devolução de um serviço cancelado |
| POST, GET | `/api/servicos/:id/avaliacoes` | as duas partes |

## Ainda não existe

Provedor real de e-mail e WhatsApp, bucket de arquivos em produção, recuperação de senha, telas de verificação, de indicações e de administração, revisão mensal automática dos documentos, regras do bônus de indicação, split e retenção pelo próprio gateway, devolução parcial, nota fiscal, a busca pela API (busca.html continua com dados fixos) e o envio do pedido pelo resumo.html. Uma conta ainda não pode ter os dois papéis pelas rotas, embora o banco permita.
