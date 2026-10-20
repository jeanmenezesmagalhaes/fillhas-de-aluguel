# Passagem de trabalho — 20/10/2026

## Concluído
Organização das 16 telas e seis fluxos; três amostras HTML responsivas e mapa navegável.

## Decisões
HTML/CSS sem dependências. Direção visual provisória: verde sálvia, terracota, fundo creme e títulos serifados. Ilustrações locais. Navegação de revisão separada dos botões inativos do produto.

## Dados canônicos
Ana Oliveira, Campinas (Cambuí/Taquaral), 6 anos de experiência, carro próprio, seg–sex 8h–18h. R$70/h, mínimo 1h, deslocamento R$20, acompanhamento externo R$15/atendimento. Revisão 01/10/2026, próxima 01/11/2026. Nota 4,9 em 12 avaliações fictícias. Mariana Costa contrata para Helena Costa (78), 28/10/2026, 9h–13h: 280 + 20 + 15 + 15 de taxa ilustrativa = R$330. Recebimento da taxa não definido.

## Pendências e próximo passo
Usuário validar mapa e aparência das três amostras. Depois continuar neste projeto, sem reiniciar, implementando as 13 telas restantes e os estados complementares do contrato. Nenhum aceite do usuário foi presumido. Contrato não concluído nesta entrega inicial.

## Continuação — ajustes do usuário
Busca por cidade agora usa input de busca em vez de select. Painel de valores adicionado em valores.html; mínimo R$70/h e exemplo de erro para valor inferior. Tela 11 parcialmente entregue (valores); cadastro, regiões e disponibilidade continuam pendentes. Portfólio e resumo atualizados. Controles continuam inativos conforme contrato. Próximo passo: validar ajustes e continuar telas pendentes sem reiniciar.

## Ajustes — acesso e pagamento da cuidadora
A visão da cuidadora não exibe a taxa cobrada ao cliente. valores.html mostra somente R$315 em serviços (4×70 + 20 + 15). O resumo do cliente mantém R$330 com a taxa ilustrativa. Acrescentadas login.html, cadastro.html e pagamento.html, todas estáticas. Pagamento solicitado pelo usuário amplia o mapa visual; valor, finalidade, periodicidade, método e relação com publicação aguardam definição. Não foi criado plano, assinatura ou cobrança real. Próximo passo: validar as novas telas e esclarecer as condições comerciais.

## Ajustes de design — 20/10/2026
Criados PRODUCT.md, DESIGN.md e .impeccable/design.json. Crítica das três amostras (24/36) registrada em .impeccable/critique/. Correções aplicadas em index, portfólio e resumo: busca logo após o título no celular; barra fixa "Solicitar atendimento" no portfólio (celular) e lateral de preço fixa (desktop); total do resumo volta a 24px no celular; selo de revisão com data (home, perfil, lateral, resumo); dicas do produto em #5e7068 13px e avisos de protótipo em moldura tracejada; borda de campos com 3:1; etapas em lista com concluídas marcadas; link "Voltar ao perfil de Ana"; títulos sem quebra fixa. Textos gerais em forma neutra ("Área profissional", "Encontrar profissionais"). Classe titulo-pagina substitui o 46px inline em todas as telas. Pendências: sobretítulos (eyebrow) mantidos, aguardando decisão; textos de valores, login, cadastro e pagamento ainda não revisados para gênero neutro.

## Redesign das três amostras — 20/10/2026
Busca (index.html), portfólio e resumo refeitos com a skill taste (direção "Um motivo", semente 1972850519). Ideia: a pasta de documentos revisada todo mês vira a forma única do sistema (aba trapezoidal em capa, seções, fotos e botões). Cores de Campinas: verde-copa, ipê-rosa, ipê-amarelo; fonte Jost local (fonts/). Paleta sorteada (preto e rosa) trocada pelas cores da cidade, mantendo as proporções. Fotos reais de Campinas em assets/ (Wikimedia Commons, créditos no rodapé e em assets/credits.json). Arquivos novos: site.css, site.js, resumo.css. O resumo segue regras de tela de aplicativo (estilo livro-caixa, sem barra lateral). DESIGN.md e .impeccable/design.json reescritos. Valores, login, cadastro, pagamento e mapa continuam no sistema anterior (styles.css) e precisam migrar. Detalhes de amostra novos a confirmar: descrições dos serviços no portfólio, "Centro" e "Bosque" sem profissionais, frases da home.

## Revisão do público e do orçamento — 20/10/2026
O usuário corrigiu o caso de uso: quem contrata é a filha, para que uma profissional acompanhe a mãe ou o pai em uma tarefa (consulta, banco, mercado, passeio). A home passa a falar só com ela; a profissional tem um botão "Área profissional" no topo e links no rodapé. Contratação por orçamento de horas: valor da hora definido pela profissional, tempo mínimo opcional (ex.: 2 h), desconto progressivo como hipótese não validada, e veículo incluso visível antes de contratar. Mudanças: home (título "Quando você não pode ir junto", busca por tarefa, "Para qual tarefa" com durações típicas, "Monte o orçamento" com Ana e Cláudia), portfólio (condições na capa, orçamento só com Ana, tarefas) e resumo (4 h × R$ 60 = R$ 240, veículo R$ 0, taxa em definição fora do total). O orçamento é a única peça que responde ao toque; não envia nada. Visual: mesmo motivo da pasta, agora em fundo branco e título em caixa normal. Proposta a validar: deslocamento e acompanhamento externo deixam de existir como cobranças, porque o veículo entra na hora. Dados novos de amostra: Ana com mínimo 2 h e R$ 60/h a partir de 4 h; Cláudia Ramos (R$ 65/h, mínimo 1 h, sem veículo); durações típicas das tarefas; descrições das tarefas. Pendente: valores.html e pagamento.html ainda usam o modelo antigo (R$ 330/R$ 315).

## Home como marketplace e horas sem teto — 20/10/2026
Validação com usuária: a lógica de pastas confundiu e não ficava claro que é um marketplace. Home refeita: título "Escolha quem acompanha sua mãe", busca (cidade, tarefa, data), atalhos de tarefa com foto que filtram a lista e quatro cartões de acompanhantes (Ana, Cláudia, e as novas Marta Ferreira e Joana Prado) com valor da hora, desconto, mínimo, veículo, nota, revisão de documentos e o exemplo de 4 horas. Depois: como contratar e por que confiar. A pilha de pastas e o orçamento completo saíram da home; cores mantidas. Portfólio: seletor de horas sem teto (mais e menos, campo editável, atalhos), mínimo e desconto valem para qualquer quantidade; o botão leva ao resumo com ?horas=N, e o resumo recalcula. Só Ana tem perfil na amostra; os outros cartões mostram "Perfil fora da amostra".

## Menu, busca no topo e marca Minha companhia — 20/10/2026
Menu de navegação (Acompanhantes, Como contratar, Por que confiar, Meu pedido, Área profissional) na home, no portfólio e no resumo; no celular vira botão "Menu". Na home, o topo some ao rolar para baixo e volta ao rolar para cima, trazendo uma busca compacta quando a busca grande já saiu da tela. Nome definido pelo usuário: Minha companhia. Três direções de logo em docs/marca/direcoes.html; escolhida a A (Lado a lado: duas abas de pasta que se apoiam). Aplicada em todas as telas, inclusive as que ainda usam styles.css (valores, login, cadastro, pagamento, mapa), além de favicon.svg e da marca em blocos do rodapé.

## Cartões da home simplificados — 20/10/2026
O usuário achou os cartões poluídos. Ficaram só nome, nota, valor da hora, bairro, mínimo e veículo, mais o botão. Saíram do cartão: data de revisão de documentos, lista de tarefas, linha de desconto, exemplo de 4 horas e anos de experiência (continuam no perfil).

## Como contratar e verificação na home — 20/10/2026
Textos das três etapas reescritos em linguagem simples, cada uma com número (1, 2, 3) numa aba ipê-amarela. A home agora diz que só há profissionais verificadas: uma linha com escudo abaixo da frase de apoio, a contagem da lista ("4 acompanhantes verificadas") e o primeiro motivo de "Por que confiar" ("Só entra quem é verificada"). Corrigido o texto que dizia que a data de revisão aparece no cartão; agora diz que aparece no perfil.

## Textos da home pensados para a filha — 20/10/2026
A home inteira foi reescrita como uma história para quem contrata:
- Abertura: "Para os dias em que você não pode ir junto…".
- Botão do cartão: "Conhecer a Ana".
- A nota da lista explica o que aparece no perfil.
- Etapas: "Diga quanto tempo a tarefa deve levar", e a terceira termina em "Pronto: sua mãe já tem companhia".
- "Por que você pode confiar": "Só entra quem é verificada", "Quem já contratou conta como foi" e "Você sabe quanto vai pagar". A taxa em definição ficou numa nota de amostra.

A contagem "Faltam N dias para a próxima revisão de Ana" saiu da home e do site.js; a contagem do portfólio continua. Frases novas a confirmar com o cliente.

## Fim do termo "acompanhante" — 20/10/2026
O usuário apontou que "acompanhante" remete a garota de programa. O termo saiu de todas as telas, do site.js, da página de marca e da documentação, e virou regra no PRODUCT.md: nunca usar.
- Quem presta o serviço agora é "profissional", e no perfil "profissional verificada" (selo do portfólio, ficha da home, resumo).
- No menu, "Encontrar profissional", para não se confundir com "Área profissional".
- A âncora da lista mudou de #acompanhantes para #escolher.
- O verbo "acompanhar" continua. As entradas antigas deste registro mantêm o termo como histórico.

## Listagem de profissionais (busca.html) — 20/10/2026
Tela nova, pronta para o consumidor final e sem a faixa de protótipo. Estilo de tela de trabalho "livro-caixa" (semente 890403131). O trilho de ícones sorteado foi trocado pelo topo do site, a pedido do usuário.
- **Busca do topo:** cidade, tarefa e data definem quem pode ir. O dia da semana da data filtra pela agenda de cada profissional.
- **Filtros:**
  - bairro da mãe;
  - valor da hora: controle deslizante de mínimo e máximo, de R$ 65 a R$ 90 em degraus de R$ 5, com barras de quantas cobram cada valor; parâmetros vmin e vmax na URL;
  - mulher ou homem;
  - veículo incluso;
  - turno, como cartões com contagem.
- **Ordenação:**
  - "Mais relevante" usa a nota ponderada pelo número de avaliações.
  - "Menor valor" e "Maior valor" desempatam pela relevância.
- **Ligações:** a busca da home deixou de ser representação e envia para busca.html (GET). O menu "Encontrar profissional" das três telas leva para lá. A home ganhou "Ver todas as profissionais", e a chamada final também abre a listagem.
- **Gerador:** busca.html é gerada por `docs/gera_busca.py` (rodar `python3 docs/gera_busca.py .` na raiz); a lógica fica no fim de site.js e os estilos em busca.css.
- **Pendências:**
  - os 11 perfis além do de Ana;
  - mapa.html e docs/MAPA-DE-TELAS.md ainda não listam a tela;
  - a frase "Só profissionais verificadas" da home está no feminino, embora a lista tenha dois homens.

## Dia do acompanhamento e caminhos para a listagem — 20/10/2026
- **Campo:** "Data" virou "Dia do acompanhamento" na home e na listagem.
- **Sem dia escolhido:** a listagem pergunta "Para qual dia?" e oferece atalhos para os próximos seis dias, contados a partir de hoje, cada um com quantas profissionais estão livres. "Outro dia" abre o calendário.
- **Com dia escolhido:** o achado mostra o dia e um "Trocar o dia". Mudar a data aplica na hora.
- **Busca compacta do celular:** na listagem, mostra o dia.
- **Home:** ganhou caminhos para busca.html:
  - "Ou veja todos os profissionais de Campinas", abaixo da busca;
  - "Ver todos", no cabeçalho da lista;
  - "Ver todos os profissionais", abaixo dos cartões;
  - "Escolher profissional", no fim de "Como contratar".

## Atalhos de tarefa sem foto — 20/10/2026
O usuário achou os ladrilhos com foto pesados e poluídos. Viraram botões de filtro, com o nome da tarefa, a contagem e o ativo preenchido em verde-copa. Com as fotos, saíram da home a duração típica e os créditos do rodapé. Os arquivos em assets/ continuam, e o portfólio segue usando a foto da Lagoa do Taquaral.

A home ficou sem nenhuma fotografia. A verificação da taste-skill acusa "few-pictures" (exige pelo menos 4), por escolha do usuário.

## Avisos de protótipo removidos — 20/10/2026
A pedido do usuário, as telas não mostram mais que são uma amostra.
- **Removido em todas as telas:**
  - a faixa "Protótipo para validação…" do topo;
  - as colunas "Protótipo" e "Sobre esta amostra" do rodapé e o botão "Ver mapa das telas";
  - a barra "Navegação de revisão";
  - as notas "fictício", "ilustrativo" e "demonstrativo".
- **Home e portfólio:** os botões "Perfil fora da amostra" viraram "Perfil em breve". O rodapé ficou igual ao da listagem (Famílias, Profissionais, Onde atendemos). O portfólio mantém os créditos das fotos, que as licenças exigem.
- **Resumo:**
  - saiu a linha "Taxa da plataforma, em definição";
  - o aviso do desconto agora diz quanto a pessoa economiza;
  - "Clínica Exemplo" virou "Clínica Viva Mais" e "Rua Exemplo, 120" virou "Rua Maria Monteiro, 120" (ambos fictícios);
  - "Enviar pedido" continua inativo.
- **Telas antigas (login, cadastro, valores, pagamento):** saíram a faixa, a barra de revisão, o rodapé de amostra e as notas. O menu delas aponta para busca.html.
- **mapa.html:** continua existindo, sem link no site.
- **PRODUCT.md:** o princípio "Protótipo honesto" foi trocado por "Pronto para o consumidor".

## Cobertura nacional — 20/10/2026
O usuário definiu que a Minha companhia é para o Brasil todo.
- **Listagem:**
  - 23 profissionais em 9 cidades: Campinas, São Paulo, Rio de Janeiro, Belo Horizonte, Curitiba, Porto Alegre, Recife, Salvador e Brasília.
  - Sem cidade, mostra o Brasil todo. O campo de cidade sugere as cidades atendidas e aceita "sao paulo, sp".
  - O bairro só abre depois da cidade.
  - Cidade sem profissionais: "Ainda não há profissionais cadastradas em …", com o botão "Ver todas as cidades".
- **No celular:** os turnos viraram uma grade de 2 × 2, porque a rolagem lateral cortava o texto.
- **Home:**
  - a busca começa sem cidade ("Digite a cidade");
  - o apoio diz "da sua cidade";
  - "Profissionais em Campinas" virou "Profissionais em destaque", e os cartões mostram "· Campinas, SP";
  - os links "ver todos" e a chamada final não fixam mais a cidade.
- **Rodapés:** "Onde atendemos" agora diz só "Em todo o Brasil, nas cidades com profissionais cadastradas."
- **O que fica com Campinas:** só o perfil, o resumo e os valores de Ana, que mora lá.

## Abertura da home com mais ar — 20/10/2026
O usuário achou a abertura colada e pesada ("menos é mais").
- **Espaços:** o título desceu (56 a 104 px abaixo do menu). A frase de apoio está a 32 px do título, e a busca a 56 px.
- **Textos:** a frase de apoio ficou mais curta ("…Compare profissionais da sua cidade e contrate pelo site."). O selo de verificação virou uma linha só, em verde-folha.
- **Título:** o espaço entre as linhas aumentou para as letras não se encostarem.

## Área profissional e ajuste da lista da home — 20/10/2026
- **Home:** saiu a frase "4 profissionais verificadas para todas as tarefas". Ela continua só para leitores de tela. "Ver todos" foi para a mesma linha dos filtros, à direita; no celular, fica abaixo deles.
- **profissional.html (nova):**
  - banner verde-copa "Uma nova renda para quem cuida", com a pilha de pastas da marca e um pedido de exemplo na pasta da frente;
  - calculadora "Quanto você pode ganhar" (valor da hora × horas por semana, em 4 semanas, antes da taxa da plataforma);
  - "Como funciona" em três etapas;
  - "Quem decide é você": preço, agenda e perfil, com recortes da tela;
  - chamada "Cadastrar".
- **Links:** "Área profissional" agora leva para a nova página em todas as telas. A página aponta para cadastro.html e login.html, que ainda estão no visual antigo.
- **Fotos:** busquei nas coleções abertas, sem nada honesto sobre o tema. A verificação acusa "few-pictures" nesta página, como na home.
- **Cuidado com o texto:** a página não diz que o cadastro é gratuito, porque o pagamento da profissional ainda está indefinido.

## Resumo do pedido enxuto e rodapé da lista — 20/10/2026
- **Home:** "Ver todos os profissionais" e a nota do perfil ficaram na mesma linha. O vão até "Como contratar" caiu para 72 px (56 px no celular).
- **resumo.html:** reescrito com o essencial.
  - Cartão do pedido: Ana, tarefa, quando, quem vai, saída e volta, recado.
  - Cartão do total, fixo ao rolar: total, conta, "Enviar pedido", "Mudar as horas" e uma nota de aceite.
  - Saíram a trilha, as etapas, a faixa de disponibilidade, a barra de composição, "Quem contrata", o tempo mínimo, o aviso de desconto e "Depois do envio".
  - O script só recalcula o total e o horário a partir de ?horas=N.
  - "Enviar pedido" continua inativo.

## Conta obrigatória para enviar o pedido — 20/10/2026
O usuário apontou que dava para enviar sem cadastro. Agora não dá mais.
- **resumo.html:** o cartão do total tem três estados (sem conta, com conta, enviado). Os espaçamentos foram refeitos e o link do CSS ganhou ?v=5, porque o navegador estava usando o CSS antigo.
- **entrar.html (nova):** entrar ou criar conta da família, com validação e volta ao pedido (?volta=, só para páginas .html do próprio site).
- **Sessão:** só no navegador, em localStorage "mc-conta" ({nome, email}). Não há autenticação real.
- **Testado no navegador:** sem conta, criar conta, voltar logada, enviar e ver "Pedido enviado para Ana". Usei os dados de teste Mariana Costa / mariana@exemplo.com e apaguei a sessão no fim.
- **login.html:** continua sendo a entrada antiga da profissional.

## Telas de gestão da profissional e da família — 20/10/2026
- **painel.html (profissional):**
  - Pedidos novos de Rafael Souza (vence hoje, 20h) e de Mariana Costa. "Aceitar" leva o pedido para a agenda e para o mês; "Propor mudança" abre início e horas; "Recusar" pede confirmação.
  - Próximos atendimentos.
  - Outubro: R$ 940 feitos em 14 h e 5 atendimentos, barras por semana e R$ 1.290 com os confirmados. As somas saem dos dados da página.
  - Seu perfil: nota, valor, documentos e link com "Copiar link".
- **pedidos.html (família):**
  - Em andamento: a proposta de Cláudia (sáb, 31/10, 10h às 12h em vez de 9h às 11h), que pode ser aceita ou recusada, e o pedido para Ana, que pode ser cancelado.
  - Confirmados: começa vazio e recebe o pedido aceito.
  - Anteriores: banco com Ana, com "Avaliar" (1 a 5 e comentário), e passeio com Joana, já avaliado com 5.
  - Sua conta.
- **entrar.html:** ganhou ?perfil=pro, que entra no painel e leva para cadastro.html em vez de criar conta. Sem volta, a família vai para pedidos.html.
- **Ligações:**
  - O menu "Meu pedido" virou "Meus pedidos" e leva para pedidos.html.
  - O resumo enviado ganhou "Ver meus pedidos".
  - "Já tenho cadastro: entrar" da área profissional abre entrar.html?perfil=pro.
- **Testado no navegador:** entrar, aceitar, propor, recusar, aceitar a proposta e avaliar. As sessões de teste foram apagadas no fim.
- **Pendências:**
  - valores.html, cadastro.html e login.html continuam no visual antigo;
  - "Agenda" do painel aponta para a seção da própria página;
  - os dados são fixos, com a data de hoje em 20/10/2026.

## Mais respiro nas telas de gestão — 20/10/2026
- **Espaços entre blocos:** cartões a 24 px de distância, com 28 px de margem interna (22 a 20 px no celular). O título de cada cartão fica a 20 px do conteúdo.
- **Dentro dos pedidos:** cada pedido tem 28 px acima e abaixo. O recado fica a 12 px do horário e o valor com os botões a 20 px do recado. As caixas de troca de horário ficaram mais largas por dentro (14 × 16 px).
- **Agenda:** as linhas têm 16 px acima e abaixo.
- **Onde vale:** painel.html e pedidos.html, pelo gestao.css (?v=2).

## Backend de contas, login e avaliações — 20/10/2026
O usuário pediu o backend de cadastro e login das profissionais e das famílias, com avaliação de uma pela outra a cada serviço. Isso vai além de `docs/CONTRATO.txt` (que previa só telas); README e PRODUCT.md foram ajustados.
- **Stack aprovada pelo usuário:** Node 22 + TypeScript, Fastify 5, PostgreSQL com Drizzle, Zod, argon2id. Em desenvolvimento e testes, o banco é PGlite (Postgres embutido), porque a máquina não tem Docker nem Postgres. Em produção, `DATABASE_URL` aponta para um Postgres gerenciado.
- **Onde está:** `api/` (detalhes em `api/README.md`). Migration inicial em `api/drizzle/0000_inicial.sql`. A API também serve as telas, só os arquivos .html/.css/.js/.svg da raiz e `assets/`/`fonts/`.
- **Padrões decididos:**
  - avaliação às cegas por 14 dias;
  - nota da família visível só para a profissional que recebeu pedido dela;
  - a profissional começa em rascunho, o valor da hora é de no mínimo R$ 70, conferido também no banco;
  - aprovação de perfil por script (`npm run aprovar -- <slug>`) até existir o painel administrativo.
- **Telas ligadas:**
  - entrar.html cria a conta da família, cria a conta da profissional (?perfil=pro, aba "Criar conta", com cidade e estado) e entra pela API.
  - Se uma conta da família tenta entrar na área profissional, a tela avisa e sai.
  - Aberta como arquivo, sem a API, entrar.html mantém o comportamento antigo.
- **Testes:** 19 testes de API passando (`cd api && npm test`). No navegador: cadastro profissional até o painel, login com senha errada e conta da família recusada na área profissional. As contas de teste ficaram só no banco local, que foi apagado.
- **Pendências:**
  - cadastro.html e login.html continuam no visual antigo, sem API; os links "Quero me cadastrar" ainda apontam para cadastro.html;
  - painel.html e pedidos.html ainda usam dados fixos, não a API;
  - faltam verificação de e-mail, recuperação de senha, documentos, proposta alterada e painel administrativo.

## Painel e pedidos ligados à API — 20/10/2026
- **API:**
  - O pedido ganhou `local`, `observacoes` e a proposta de outro horário (`propor`, `aceitar-proposta`, `recusar-proposta`), na migration `0001_proposta_e_recado.sql`.
  - A lista de serviços traz a nota que a pessoa deu (`minhaNota`), se ainda pode avaliar (`podeAvaliar`) e, para a profissional, a nota da família (`notaFamilia`).
  - 22 testes passando.
- **gestao.js (novo):** peças comuns das duas telas: chamadas à API, escape de todo texto vindo de pessoas, datas, valores e o formulário de avaliação.
- **pedidos.html:** em andamento (aceitar ou recusar a proposta, cancelar), confirmados (cancelar antes do início), anteriores (avaliar com 1 a 5, ou ver a nota dada) e "Quem você acompanha" vêm do banco.
- **painel.html:**
  - Pedidos novos trazem a nota da família, com aceitar, propor (dia, início, horas e recado) e recusar.
  - Próximos atendimentos têm "Marcar como feito" depois do início.
  - Seção nova "Feitos recentemente" para avaliar as famílias em até 14 dias.
  - O mês, por semana, e o perfil (situação, nota, valor, documentos, link) saem do banco.
  - "Quero me cadastrar" agora leva para entrar.html?perfil=pro&modo=criar.
- **Sem API:** abertas como arquivo, as duas telas continuam na demonstração antiga. A API só é usada em http/https.
- **Seed:** `npm run seed` cria Ana e Cláudia (profissionais), Mariana e Rafael (famílias) e pedidos em todas as situações, com datas contadas a partir de hoje. A Cláudia ficou com R$ 70/h, porque R$ 65 está abaixo do mínimo da plataforma.
- **Testado no navegador:**
  - Família: aceitar proposta, cancelar e avaliar.
  - Profissional: avaliar família, marcar como feito, recusar, aceitar e propor.
  - A nota só apareceu quando as duas partes avaliaram (4,5 em 2).
  - Texto com HTML em tarefa e recado aparece escapado.
- **Pendências:**
  - resumo.html ainda não envia o pedido pela API;
  - textos que prometem aviso por e-mail continuam, mas o e-mail não existe;
  - valores.html (editar valor e agenda) ainda não usa `PATCH /api/profissionais/eu`.

## Ganhos e extrato da profissional — 20/10/2026
- **ganhos.html (nova)**, ligada pelo menu "Ganhos" e por "Ver extrato e depósitos" no painel. Pede a entrada "mc-pro".
- **Dados:** 8 linhas de outubro, que somam com o painel. São 5 atendimentos feitos (R$ 980 em horas, menos R$ 40 de desconto), 1 cancelamento em cima da hora (R$ 70) e 2 atendimentos confirmados. A taxa de 12% dá R$ 121,20, e ela recebe R$ 888,80: R$ 827,20 já na conta e R$ 61,60 programados. Há mais R$ 308,00 previstos. O script confere as somas (console.assert).
- **Pagamentos das famílias:** Pix, cartão em 1x, 2x e 3x. Os depósitos caem dois dias úteis depois do atendimento, e o feriado de 12/10 é considerado.
- **Telas:** o extrato tem detalhes por linha, filtro e CSV. Há seis dúvidas que se abrem e um e-mail de ajuda.
- **Testado no navegador:** somas, filtro, detalhes, conteúdo do CSV (sem baixar o arquivo), computador e celular. A inspeção só vê a tela de entrar, porque não tem sessão.
- **A confirmar com o cliente:** 12%, D+2 úteis, recebimento integral no parcelado e 50% no cancelamento em cima da hora são propostas. O e-mail ajuda@minhacompanhia.com.br é de exemplo.

## Ganhos ligados à API, com exemplo de reserva — 20/10/2026
**Com a API rodando** (cd api && npm run dev), ganhos.html usa gestao.js. Ela confere /api/eu, que exige o papel profissional, e lê /api/servicos.
- Entram os serviços "realizado" e "confirmado" do mês corrente. O valor de cada um é horas × valorHoraCentavos, congelado no pedido.
- As regras propostas são aplicadas na tela: taxa de 12%, depósito dois dias úteis depois do atendimento, com os feriados nacionais de 2026, e 50% no cancelamento em cima da hora.
- Um serviço confirmado cuja data já passou aparece como "Marque como feito no painel". O depósito só vale depois de concluir.
- A API ainda não tem pagamentos. Por isso a forma de pagamento aparece como "—" (no CSV, "Não registrado"), a chave Pix fica oculta e a linha do tempo não mostra o pagamento.

**Sem a API** (arquivo, ou servidor só de páginas que responde 404 em /api/eu), a página mostra o mês de exemplo de outubro, com a sessão de demonstração "mc-pro".

**Testado:** com a API em outra porta (PORT=4174) e a conta de demonstração ana@demo, que tem 2 feitos, 1 a concluir e 1 previsto. Também testado no servidor só de páginas (8 linhas de exemplo).

**Falta na API:** forma de pagamento, parcelas, desconto separado do valor da hora, horário do cancelamento e o depósito de fato.

## Extrato em linguagem simples — 20/10/2026
O usuário achou a tabela difícil para pessoas leigas.
- **A tabela virou uma lista em três grupos com soma:** "Já caiu na sua conta" (R$ 827,20), "Vai cair nos próximos dias" (R$ 61,60) e "Depois dos próximos atendimentos" (R$ 308,00).
- **Cada item:** "Tarefa com [pessoa]" e o valor que fica para ela; o dia, o horário e a família; uma frase com o que a família pagou e a taxa; o estado com um ponto colorido; e "Ver a conta".
- **Ficou de fora:** as colunas, o filtro e a linha de total.
- **CSV:** não mudou.
- **Modo API:** a mesma lista. Sem forma de pagamento, a frase fica em "A família pagou R$ X."

## Extrato de volta em tabela, com filtro de período — 20/10/2026
O usuário preferiu a tabela à lista em frases, mas com mais respiro e com filtros de período.
- **Tabela:** linhas mais altas e menos texto por célula. O serviço mostra só a família. O pagamento aparece como "Pix", "Cartão, à vista" ou "Cartão, 3x · 3 × R$ 80,00".
- **Filtros:** último dia, 7, 30 (padrão), 365 dias e todo o período, contados pela data do atendimento até hoje.
- **O que muda com o filtro:** "Como chegamos ao valor", as caixas de recebido e programado, o total da tabela e o CSV. "Previsto" e "Próximos depósitos" não mudam.
- **Exemplo:** ganhou meses anteriores (setembro e julho de 2026, março de 2026, novembro e agosto de 2025), para os filtros longos terem conteúdo.
- **Somas conferidas por período:** 61,60 / 369,60 / 1.100,00 / 1.839,20 / 1.962,40.
- **Modo API:** não filtra mais só o mês corrente, porque usa os mesmos períodos.

## Detalhe do extrato e o termo do cancelamento — 20/10/2026
- **Texto saindo da caixa:** era um white-space: nowrap da primeira célula. O detalhe agora são duas caixas brancas lado a lado ("A conta" e "O caminho do dinheiro"), uma embaixo da outra no celular.
- **Linha do tempo mais curta:** "Você aceitou o pedido.", "A família pagou R$ X por Pix.", "Atendimento feito: 9h às 11h." e "Caiu R$ X no seu Pix." ou "R$ X vai cair no seu Pix.".
- **"Em cima da hora" saiu da tela.** No lugar entrou "Cancelado com menos de 24 h de antecedência" (no resumo, "você recebe metade do valor"). No detalhe e nos depósitos ficou "cancelado com menos de 24 h".

## Verificação da profissional, lista de espera e indicações (backend) — 20/10/2026
- **Pedido do usuário:** para atender, a profissional manda os documentos que comprovam quem ela é: comprovante de endereço, CPF ou CNPJ para receber, WhatsApp e e-mail. Depois espera a aprovação, e enquanto espera pode indicar outras pessoas (bônus a definir). A tela de cadastro fica para depois, com a sessão Impeccable.
- **Feito na API (migration `0002_verificacao_documentos_indicacoes.sql`):**
  - código de 6 dígitos para confirmar e-mail e WhatsApp;
  - CPF e CNPJ com dígitos conferidos, CPF único, e endereço;
  - upload de documentos (RG ou CNH, comprovante, cartão CNPJ), com tipo conferido pelo conteúdo e limite de 10 MB;
  - checklist do que falta, entrada na fila com posição, dados travados durante a análise;
  - administração: fila, ficha completa, aprovar ou recusar documento com motivo, aprovar perfil ou pedir correção;
  - indicações com código, links e as etapas cadastro → aprovação → primeiro serviço.
- **Ainda sem provedor:** e-mail e WhatsApp só aparecem no log do servidor, e os arquivos ficam em `api/.data/arquivos`. Para produção faltam provedor de mensagens e bucket privado.
- **Seed:** Joana Prado na fila, com dois documentos e indicada pela Ana (código ANA-DEMO). Conta de administração equipe@demo.minhacompanhia.test.
- **Testes:** 34 passando (`cd api && npm test`).
- **Decidido:** o documento com foto (RG ou CNH) é obrigatório.
- **A decidir com o cliente:**
  - regras do bônus de indicação;
  - se indicar faz a pessoa subir na fila;
  - se a profissional aprovada pode indicar famílias também (hoje pode).

## Telas de verificação, lista de espera, indicações e administração — 20/10/2026
Pedido da sessão do backend, em nome do usuário, sobre a API do commit fb524cc.
- **verificacao.html, verificacao.js e verificacao.css** (profissional):
  - confirmação de e-mail e WhatsApp por código;
  - CPF, CNPJ opcional com razão social, e endereço;
  - documentos, com foto pela câmera ou arquivo de até 10 MB;
  - envio para a lista de espera, posição na fila, correção pedida e aprovada;
  - indicações com código, links, contagens e pessoas indicadas.
- **admin.html e admin.js** (equipe): fila e ficha, aprovar ou recusar cada documento com motivo, aprovar o perfil e pedir correção.
- **Modo de cada tela:** com a API, usam as rotas /api/profissionais/eu/verificacao, /api/eu/verificacoes, /api/indicacoes/eu e /api/admin/*. Sem a API, rodam o mesmo fluxo com dados de exemplo em memória. Na verificação, ?exemplo=espera e ?exemplo=correcao mostram esses estados.
- **entrar.html:** a profissional que cria a conta vai para verificacao.html. O texto de voltar só diz "pedido" quando volta para o resumo.
- **Links de cadastro:** "Quero me cadastrar" (área profissional, rodapés e ganhos) agora abre entrar.html?perfil=pro&modo=criar, no lugar do cadastro.html antigo. O rodapé da área profissional deixou de apontar para login.html.
- **Testado com a API em PORT=4174:**
  - a equipe recusou o RG da Joana e pediu correção;
  - a Joana viu o aviso e o motivo, reenviou uma imagem e voltou para a fila (1º);
  - uma conta nova foi criada com ?indicacao=ANA-DEMO e caiu na verificação;
  - o código errado deu erro, e o código do log confirmou o e-mail.
- **Dados de teste:** a conta de teste (teste.verificacao@exemplo.test) ficou no banco local api/.data. O seed não a apaga.
- **Não commitado.** O checkout está no branch backend-contas-avaliacoes.
