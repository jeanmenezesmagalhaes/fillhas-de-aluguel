# API da Minha companhia

Contas da família e da profissional, login, sessões, pedidos de serviço e avaliações nos dois sentidos. A mesma API serve as telas estáticas do projeto, na mesma origem: entrar.html, painel.html e pedidos.html usam a API quando abertas por http; abertas como arquivo, ficam na demonstração com dados fixos.

## Rodar

```bash
cd api
npm install
npm run seed     # contas e pedidos de demonstração (só fora de produção)
npm run dev      # http://127.0.0.1:4175 (a 4173 fica para o servidor estático do protótipo)
```

Sem `DATABASE_URL`, o banco é um Postgres embutido (PGlite) gravado em `api/.data/pglite`. O PGlite só aceita um processo por vez: **pare a API antes de rodar `npm run seed`** (ou os scripts `admin` e `aprovar`) e suba de novo depois. Com os dois rodando juntos, a API continua vendo os dados antigos. Para um Postgres de verdade, defina `DATABASE_URL=postgres://…` (ver `.env.example`). As migrations rodam sozinhas ao iniciar.

- `npm test`: testes (banco em memória, relógio controlado)
- `npm run typecheck`
- `npm run db:gerar`: gera uma migration nova em `drizzle/` depois de mudar `src/db/schema.ts`
- `npm run admin -- <email>`: dá acesso de administração a uma conta
- `npm run aprovar -- <slug>`: atalho de desenvolvimento que aprova um perfil sem passar pelos documentos

## Stack

Node 22 + TypeScript (rodando com tsx), Fastify 5, PostgreSQL com Drizzle ORM, Zod para validar entradas, argon2id para senhas.

## Regras

- **Uma pessoa, uma conta.** O papel vem das tabelas ligadas ao usuário: `contratantes` (família) e `profissionais`.
- **Sessão:** cookie `mc_sessao` httpOnly, SameSite=Lax (Secure em produção), válido por 30 dias. O banco guarda só o hash SHA-256 do token. Pedidos que mudam algo vindos de outra origem são recusados.
- **Login:** a mesma mensagem e o mesmo tempo de resposta para senha errada e e-mail sem conta. Cadastro e login aceitam 10 tentativas por minuto por IP.
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
- **Indicações:**
  - Toda conta tem um código (ex.: `ANA-7K2P`) e links de cadastro para profissional e para família.
  - Quem se cadastra com o código fica ligado a quem indicou.
  - Ficam registradas três etapas, que o bônus pode usar quando for definido: cadastro, aprovação (para profissionais) e primeiro serviço feito.
  - Quem indicou vê só o primeiro nome com a inicial de cada pessoa indicada e a etapa em que ela está.
  - O bônus em si (valor, quando paga, limites) ainda não existe.
- **Mensagens:** a interface `Mensageiro` (`src/mensagens.ts`) envia e-mail e WhatsApp. Fora de produção, a mensagem só vai para o log do servidor. Em produção sem provedor, o envio responde 503.
- **Arquivos:** a interface `Armazenamento` (`src/armazenamento.ts`). Em desenvolvimento, os arquivos ficam em disco (`api/.data/arquivos`). Em produção, precisa de um bucket privado (S3 ou R2).
- **Tarefas e mínimo de horas:**
  - A profissional escolhe as tarefas que faz, cada uma com o próprio mínimo de 1 a 12 horas.
  - As tarefas fixas são `consulta` (Consulta ou exame), `banco` (Banco ou cartório), `mercado` (Mercado e farmácia) e `passeio` (Passeio). Ela também pode criar atividades `personalizada`, com nome próprio. Até 20 tarefas, sem repetir tipo fixo nem nome.
  - `aceitaOutras` libera "Outra tarefa · a combinar", com mínimo de 1 h.
  - A lista só pode ficar vazia se ela aceitar outras.
  - `horasMinimas` passa a ser o menor mínimo da lista.
  - No pedido, `tipoTarefa` (mais `nomeTarefa`, se for personalizada) aplica o mínimo daquela tarefa. Sem `tipoTarefa`, ou com o perfil sem lista, vale `horasMinimas`.
- **Pedido de serviço:** o valor da hora fica congelado no pedido e respeita o mínimo de horas da profissional. Pode trazer `local` e `observacoes` (recado para a profissional). Situações: `solicitado`, `proposta_alterada`, `confirmado`, `recusado`, `cancelado`, `realizado`.
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
| GET, POST | `/api/pessoas` | família: pessoas acompanhadas |
| DELETE | `/api/pessoas/:id` | família |
| PATCH | `/api/profissionais/eu` | profissional: valor da hora, mínimo, veículo, bairros, apresentação, `tarefas` e `aceitaOutras` |
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
| POST | `/api/servicos/:id/cancelar` | as duas partes, antes do início |
| POST, GET | `/api/servicos/:id/avaliacoes` | as duas partes |

## Ainda não existe

Provedor real de e-mail e WhatsApp, bucket de arquivos em produção, recuperação de senha, telas de verificação, de indicações e de administração, revisão mensal automática dos documentos, regras do bônus de indicação, pagamentos, a busca pela API (busca.html continua com dados fixos) e o envio do pedido pelo resumo.html. Uma conta ainda não pode ter os dois papéis pelas rotas, embora o banco permita.
