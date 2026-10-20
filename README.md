# Fillhas de aluguel

Protótipo estático privado. Nome da solução: **Minha companhia** (antes, provisório: Filha de Aluguel). Marca: direção "Lado a lado" (`docs/marca/direcoes.html`).

## Primeira entrega
- `index.html`: página inicial e busca.
- `portfolio.html`: portfólio público de Ana Oliveira.
- `resumo.html`: revisão da solicitação.
- `valores.html`: painel do cuidador com valor mínimo de R$ 70/h.
- `mapa.html`: mapa das 16 telas e fluxos.

Abra `index.html` no navegador. Não há instalação, dependências, backend ou coleta de dados. Um JavaScript pequeno (`site.js`) cuida do movimento, da prévia das tarefas, da contagem de dias até a próxima revisão e do orçamento por horas (que só calcula na tela e não envia nada); sem ele as páginas continuam completas, com o total de cada hora escrito nas barras. Para visualização local opcional: `python3 -m http.server 4173 --bind 127.0.0.1`.

Links de revisão navegam entre as amostras. Botões, filtros e campos do produto são representações inativas. Todos os personagens, valores, documentos e avaliações são fictícios; retratos são ilustrações, não fotografias de pessoas reais.

## Etapas e aceite
1. Validar mapa dos fluxos e informações.
2. Validar busca, portfólio e resumo: estilo, legibilidade, organização e tom.
3. Após aprovação, aplicar a direção às demais telas, incluindo estados vazios, proposta alterada, documentos e administração.
4. Incorporar retorno e obter aprovação final como referência para planejamento técnico futuro.

Não publicar como serviço operacional. Não implementar uploads, WhatsApp, tracking, pagamentos, e-mails, chat ou operações administrativas.

## Backend (a partir de 20/10/2026)
A pedido do usuário, começou o backend em `api/`: contas da família e da profissional, login com sessão, pedidos de serviço e avaliação nos dois sentidos, por serviço. Node + Fastify + PostgreSQL (Drizzle). Ver `api/README.md`. Com a API rodando (`cd api && npm run dev`), as telas abrem em http://127.0.0.1:4175 (a 4173 continua para o servidor estático, sem API) e `entrar.html` cria contas e entra de verdade; aberta direto do arquivo, a tela continua só lembrando o nome no navegador. Isso vai além do escopo de `docs/CONTRATO.txt`, que previa só telas.

A taxa de R$ 15 é somente exemplo. O modelo de recebimento permanece pendente.

Ver `docs/CONTRATO.txt`, `docs/MAPA-DE-TELAS.md` e `docs/PASSAGEM.md`.

## Ajuste solicitado em 20/10/2026
Cidade representada por campo de busca textual. Painel estático para configurar valor/hora (mínimo R$ 70), deslocamento e adicional. Exemplo de validação abaixo do mínimo incluído. Valor canônico atualizado para R$70/h e total de 4h para R$330.

## Ajustes — acesso e pagamento da cuidadora
A visão da cuidadora não exibe a taxa cobrada ao cliente. valores.html mostra somente R$315 em serviços (4×70 + 20 + 15). O resumo do cliente mantém R$330 com a taxa ilustrativa. Acrescentadas login.html, cadastro.html e pagamento.html, todas estáticas. Pagamento solicitado pelo usuário amplia o mapa visual; valor, finalidade, periodicidade, método e relação com publicação aguardam definição. Não foi criado plano, assinatura ou cobrança real. Próximo passo: validar as novas telas e esclarecer as condições comerciais.
