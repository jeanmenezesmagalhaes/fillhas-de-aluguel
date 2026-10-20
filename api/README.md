# API da Minha companhia

Contas da família e da profissional, login, sessões, pedidos de serviço e avaliações nos dois sentidos. A mesma API serve as telas estáticas do projeto, na mesma origem: entrar.html, painel.html e pedidos.html usam a API quando abertas por http; abertas como arquivo, ficam na demonstração com dados fixos.

## Rodar

```bash
cd api
npm install
npm run seed     # contas e pedidos de demonstração (só fora de produção)
npm run dev      # http://127.0.0.1:4173
```

Sem `DATABASE_URL`, o banco é um Postgres embutido (PGlite) gravado em `api/.data/pglite`. Para um Postgres de verdade, defina `DATABASE_URL=postgres://…` (ver `.env.example`). As migrations rodam sozinhas ao iniciar.

- `npm test`: testes (banco em memória, relógio controlado)
- `npm run typecheck`
- `npm run db:gerar`: gera uma migration nova em `drizzle/` depois de mudar `src/db/schema.ts`
- `npm run aprovar -- <slug>`: aprova um perfil profissional enquanto não existe painel administrativo

## Stack

Node 22 + TypeScript (rodando com tsx), Fastify 5, PostgreSQL com Drizzle ORM, Zod para validar entradas, argon2id para senhas.

## Regras

- **Uma pessoa, uma conta.** O papel vem das tabelas ligadas ao usuário: `contratantes` (família) e `profissionais`.
- **Sessão:** cookie `mc_sessao` httpOnly, SameSite=Lax (Secure em produção), válido por 30 dias. O banco guarda só o hash SHA-256 do token. Pedidos que mudam algo vindos de outra origem são recusados.
- **Login:** a mesma mensagem e o mesmo tempo de resposta para senha errada e e-mail sem conta. Cadastro e login aceitam 10 tentativas por minuto por IP.
- **Senha:** no mínimo 8 caracteres.
- **Profissional:** começa em `rascunho`. O valor da hora é definido depois, no mínimo R$ 70 (7000 centavos, conferido também no banco). Vai para `em_analise` só com o valor definido. O portfólio público só aparece quando o perfil está `aprovado`.
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
| PATCH | `/api/profissionais/eu` | profissional: valor da hora, mínimo, veículo, bairros, apresentação |
| POST | `/api/profissionais/eu/analise` | profissional: envia o perfil para análise |
| GET | `/api/profissionais/:slug` | público: portfólio aprovado, com a nota |
| GET | `/api/profissionais/:slug/avaliacoes` | público |
| GET | `/api/contratantes/:id/avaliacoes` | profissional que recebeu pedido da família |
| POST | `/api/servicos` | família pede um serviço |
| GET | `/api/servicos`, `/api/servicos/:id` | as duas partes |
| POST | `/api/servicos/:id/aceitar` · `recusar` · `propor` · `concluir` | profissional |
| POST | `/api/servicos/:id/aceitar-proposta` · `recusar-proposta` | família |
| POST | `/api/servicos/:id/cancelar` | as duas partes, antes do início |
| POST, GET | `/api/servicos/:id/avaliacoes` | as duas partes |

## Ainda não existe

Verificação de e-mail com envio real, recuperação de senha, upload de documentos, painel administrativo (a aprovação usa o script), pagamentos, a busca pela API (busca.html continua com dados fixos) e o envio do pedido pelo resumo.html. Uma conta ainda não pode ter os dois papéis pelas rotas, embora o banco permita.
