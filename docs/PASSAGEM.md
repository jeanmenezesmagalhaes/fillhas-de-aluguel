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

## Cursos com comprovante e CNH para quem tem veículo (backend) — 20/10/2026
- **Pedido do usuário:**
  - No perfil, a profissional adiciona cursos e treinamentos com comprovante; a plataforma valida, e o que foi validado aparece no portfólio.
  - A CNH é obrigatória para quem atende com veículo.
- **Feito na API:**
  - migration `0003_cnh_e_qualificacoes.sql`, com a tabela `qualificacoes` e o tipo de documento `cnh`;
  - rotas da profissional e da administração para os cursos;
  - o portfólio público traz `qualificacoes` (só as aprovadas);
  - com `veiculoIncluso`, a CNH entra nos documentos exigidos;
  - aprovada sem veículo, ela manda a CNH e só oferece veículo depois de a CNH ser aprovada;
  - na fila, não dá para ligar o veículo.
- **Outros ajustes:**
  - o portfólio público só aparece aprovado e com o valor da hora definido;
  - o painel leva para verificacao.html quem está em rascunho, na fila ou em correção.
- **Seed:** a Ana tem CNH aprovada e dois cursos validados. A Joana tem um curso esperando validação.
- **Testes:** 40 passando.
- **Telas ainda não feitas:** cursos no perfil (painel ou verificação), cursos no portfolio.html, fila de cursos no admin.html, e a pergunta "Atende com veículo?" com a CNH em verificacao.html.

## Veículo com CNH e cursos validados nas telas — 20/10/2026
Pedido da sessão do backend, sobre a API do commit 860fa6f.
- **verificacao.html:**
  - "Atende com veículo?" salva com PATCH /api/profissionais/eu. Antes da fila, a CNH entra nos documentos. Na fila, aparece o 409. Aprovada e sem CNH, aparece o 422, com um cartão para enviar a CNH (tipo=cnh).
  - "Cursos e treinamentos": lista, envio com certificado (multipart) e tirar do perfil.
- **admin.html:** abas Cadastros e Cursos para validar, com validar e recusar com motivo. Na ficha, o veículo e os cursos. O título virou "Conferência".
- **portfolio.html:** seção "Cursos validados", com os dois cursos da Ana. Com a API, a lista vem do perfil público. Os ladrilhos trocaram os cursos por comprovante de endereço e CNH, e o texto "Experiência e qualificações" agora bate com os cursos.
- **Testado com a API em 4174, depois do seed:**
  - portfólio da Ana com os dois cursos da API;
  - a equipe validou o curso da Joana;
  - a Joana, na fila, recebeu o aviso ao ligar o veículo e enviou um curso novo;
  - a Cláudia, aprovada, recebeu o 422, enviou a CNH e, ao tentar de novo, viu "Sua CNH ainda está em análise".
- **Lacuna na API:** a CNH enviada por uma profissional já aprovada não aparece em nenhuma fila da administração. A fila só lista quem está em análise, e a ficha só mostra os documentos exigidos.

## Documentos avulsos na administração — 20/10/2026
- **admin.html:** ganhou a aba "Documentos avulsos", que usa GET /api/admin/documentos (do commit b807440 do backend). A aba mostra só os documentos com avulso: true, como a CNH de uma profissional aprovada. Tem Aprovar e Recusar com motivo.
- **Testado com a API em 4174, depois do seed:**
  1. A Cláudia, aprovada, enviou a CNH.
  2. A equipe a aprovou na aba nova.
  3. A Cláudia marcou "Sim, levo de carro", e o perfil passou a mostrar "Veículo incluso".

## Portfólio mais simples, retrato da Ana e avaliações em janela — 20/10/2026
- **Capa:** as condições ficam numa linha cada ("R$ 60/h a partir de 4 h" não quebra mais), e "por atendimento" virou "por pedido". A foto da Lagoa do Taquaral deu lugar a um retrato grande da Ana, em ilustração e fundo rosa, com a legenda "Ana Oliveira · 6 anos acompanhando pessoas idosas". O cabelo do retrato ficou mais longo, para não parecer de homem em tamanho grande. Quando houver foto real da profissional, ela entra nesse lugar.
- **Orçamento:** saíram os blocos e a legenda "Cada bloco é uma hora…". Ficaram o campo de horas, o mais e o menos, e os atalhos 2, 4, 6 e 8 h. O de 12 h saiu.
- **"O que Ana faz" e "Onde e quando":** ícones em SVG no lugar das fotos (menos peso no servidor), com textos curtos. Os bairros, os dias e horários e o veículo viraram três itens.
- **Avaliações:** a seção traz a média e o total, as três mais recentes e o botão "Ver todas as avaliações". Ele abre uma janela (dialog) com todas as avaliações, ordenadas por mais recentes, mais antigas, melhores notas ou piores notas. O exemplo tem 12 avaliações: 11 de 5 e 1 de 4, média 4,9. Com a API, vêm de /api/profissionais/:slug/avaliacoes.
- **Créditos:** como a página ficou só com a foto do ipê, os créditos citam só essa foto. A verificação da taste-skill acusa few-pictures, por escolha do usuário (preferiu ícones e o retrato).

## Mínimo de horas por tarefa — 20/10/2026
- **portfolio.html, "O que Ana faz":** saíram as durações ("2 a 4 h" e outras). Cada tarefa mostra o mínimo que a Ana aceita: consulta ou exame 2 h, banco ou cartório 2 h, mercado e farmácia 1 h, passeio 2 h. Entrou "Outra tarefa · A combinar", para pedidos fora da lista.
- **Capa:** "Mínimo 2 h · por pedido" virou "A partir de 1 h · mínimo varia por tarefa".
- **Orçamento:** antes das horas vem "Para qual tarefa?", com as cinco opções. O mínimo segue a tarefa escolhida, e as horas abaixo dele sobem sozinhas. "Outra tarefa" abre o campo "O que precisa?" e avisa que a Ana confirma o tempo e o valor ao aceitar. O link leva `&tarefa=` para o resumo.
- **Dados de exemplo:** `#profissionais` ganhou `tarefas: {consulta, banco, mercado, passeio, outra}`, cada uma com `nome` e `minimo` (a "outra" tem `aCombinar: true`).
- **Falta:**
  - um lugar para a profissional cadastrar o mínimo de cada tarefa e as outras atividades que faz;
  - na API, o campo para guardar isso. Hoje só existe `horasMinimas`, um único mínimo.
  - o resumo.html ainda não lê `tarefa`.

## Valores e tarefas da profissional — 20/10/2026
- **valores.html** (refeita no estilo das telas de gestão, com valores.js):
  - valor da hora, a partir de R$ 70;
  - as quatro tarefas fixas, cada uma com marcar e o mínimo de 1 a 12 h;
  - "Outras atividades": ela cria, dá nome e define o mínimo, até 20 tarefas no total;
  - "Aceito outros pedidos, a combinar";
  - ao lado, "Como a família vê", que atualiza enquanto ela mexe.
- **Com a API:** lê `usuario.profissional` de /api/eu e salva com PATCH /api/profissionais/eu {valorHoraCentavos, tarefas, aceitaOutras}, no contrato do commit 567428a do backend. Os erros por campo (`tarefas.N.nome`) aparecem na linha certa.
- **Sem a API:** usa a conta de exemplo e guarda em localStorage `mc-valores`.
- **portfolio.html:** com a API, "O que Ana faz", o "A partir de N h" do topo e as opções do orçamento seguem as tarefas cadastradas, incluindo as atividades próprias. O orçamento recebe as tarefas pelo evento `mc:tarefas`.
- **gestao.js:** os erros da API agora trazem `e.campos`.
- **Testado na 4175**, com a conta da Ana do seed: salvar, nome inválido (400) e lista vazia (422). Também o portfólio com tarefas trocadas. Ao final, a Ana voltou ao seed.

## Agenda da profissional — 20/10/2026
- **agenda.html** (com agenda.js): os atendimentos confirmados, separados em "Esta semana", "Semana que vem" e "Mais para a frente". Cada um tem "Salvar na agenda", que abre um menu:
  - Google Agenda: abre o evento já preenchido;
  - Apple (iPhone e Mac): baixa um arquivo .ics;
  - Outlook: abre o evento já preenchido.
- Cada evento leva um lembrete uma hora antes.
- **agenda-salvar.js:** peça comum (`mcAgenda.menu`, `ics`, `baixar`), para usar também nos pedidos da família.
- **"Na agenda do seu celular":**
  - Com GET /api/agenda/link: Google, Apple (webcal://) e Outlook assinam o link e se atualizam sozinhos. Tem também "copiar link" e "gere um novo", que invalida o antigo.
  - As rotas estão no commit e640b95 do backend: /api/agenda/link devolve {url, webcal}, /api/agenda/link/novo troca o token e /api/agenda/:token.ics entrega o arquivo. O arquivo traz os atendimentos confirmados e os feitos dos últimos 30 dias.
  - Sem as rotas (404, ou 503 em produção sem SEGREDO_AGENDA), fica "Baixar todos" (.ics).
  - Testado na 4175: a tela mostra os três botões, o arquivo traz os eventos e o link antigo dá 404 depois de "gere um novo".
  - O navegador guarda o .ics por 5 minutos (max-age=300). Por isso, logo depois de trocar o link, o antigo ainda pode abrir do cache.
- Corrigido: entrando pela API, valores.html e agenda.html ficavam em branco, porque `mc.entrar` esconde a tela e nada a mostrava de novo.
- **Menus:** painel.html e ganhos.html apontam "Agenda" para agenda.html, e o painel ganhou "Ver agenda e salvar no celular".
- **Falta:**
  - resumo.html ainda não lê `?tarefa=` nem envia `tipoTarefa`;
  - os pedidos da família ainda não têm "Salvar na agenda";
  - os dias e horários em que a profissional atende ainda não têm onde ser editados.
- **Agenda refeita a pedido do usuário:**
  - Cada linha destaca a atividade, com data e horário juntos ("Qui, 22/10 · 8h às 11h") e, abaixo, a família, a pessoa e o local.
  - À direita fica o status (Confirmado, Novo pedido ou Esperando a família) e, abaixo dele, a ação. No confirmado é "Salvar na agenda". No pedido novo são Aceitar e Recusar (este com dois toques), por POST /api/servicos/:id/aceitar e /recusar.
  - Saíram os avisos da coluna da direita. "Na agenda do seu celular" ficou só com os botões, ou só com "Baixar todos os confirmados" quando não há o link.
- **Saiu o quadro "Na agenda do seu celular"**, a pedido do usuário, junto com a assinatura e o "Baixar todos". A agenda ficou numa coluna só, e salvar no Google, na Apple ou no Outlook continua em cada atendimento. As rotas /api/agenda/link do backend seguem prontas, mas o front não usa mais.

## Área profissional em três abas — 20/10/2026
- **Menu:** Painel, Meu perfil e Ganhos. Saíram as abas Agenda, Valores e Meu perfil público.
- **painel.html:** "Próximos atendimentos" virou "Agenda", no formato novo:
  - separada por semana;
  - em cada item, a atividade em destaque, dia, horário e valor numa linha, e o status com a ação.
  - Antes de começar, o status é "Confirmado", com "Salvar na agenda". Depois do início, "Acontecendo agora" ou "Já passou", com "Marcar como feito".
  - A lista é desenhada por `mcAgenda.lista`, em agenda-salvar.js.
  - Os pedidos novos continuam no topo, com aceitar, propor mudança e recusar.
- **perfil.html + perfil.js (Meu perfil):**
  - foto, com tirar ou escolher arquivo;
  - sobre você: apresentação e bairros em etiquetas;
  - valor da hora;
  - tarefas, até 10;
  - veículo, com a CNH quando a API pedir;
  - cursos.
  - Ao lado, "Como a família vê", fixo na tela. No topo, "Ver como a família vê" abre o portfólio.
  - Apresentação, bairros, valor e tarefas saem juntos no "Salvar", que fica preso no pé da tela. Foto, veículo e cursos salvam na hora.
  - Testado na 4175 com a Ana: carregou os dados e salvou um bairro (desfeito depois).
- **Foto:** o front chama POST /api/profissionais/eu/foto (multipart, campo `arquivo`) e lê `profissional.foto {url, situacao}` de /api/eu, ou `fotoUrl` do perfil público. A API ainda não tem essa rota. Até ela existir, a foto fica só na tela, no exemplo, e na API aparece "Não deu para enviar a foto agora".
- **Arquivos:** agenda.html, agenda.js e valores.js foram apagados. valores.html agora só redireciona para perfil.html.
- A verificação (verificacao.html) continua com veículo e cursos, para quem ainda está no cadastro.

## Menu do site mais curto — 20/10/2026
- **No topo das páginas das famílias** ficaram só "Encontrar profissional", "Meus pedidos" e o botão "Área profissional". Saíram "Como contratar" e "Por que confiar".
- **Páginas mudadas:** index, busca (e docs/gera_busca.py), portfolio, profissional, resumo, pedidos e entrar.
- **Continuam como estavam:** as seções "Como contratar" e "Por que confiar" na home, e os mesmos links no rodapé.
- **"Meus pedidos"** leva para pedidos.html. Sem login, a página convida a entrar.

## Perfil completo ligado à API — 20/10/2026 (backend 466c678 a ec1888c)
- **perfil.html:**
  - "Há quantos anos você acompanha pessoas idosas?" (anosExperiencia);
  - "Cobrar menos em pedidos longos" (descontoAPartirHoras e valorHoraDescontoCentavos, ou os dois null);
  - seção "Dias e horários": dia por dia, com até 2 horários, de meia em meia hora, das 6h às 22h (disponibilidade);
  - foto: aceita JPG, PNG e WebP, mostra a situação (No perfil, Em conferência, Recusada) e o motivo da recusa.
  - Tudo sai no mesmo "Salvar", e a prévia ao lado mostra o desconto e o resumo dos dias ("Seg a sex, 8h às 18h").
- **painel.html e pedidos.html:**
  - o selo mostra o prazo real (`respondaAte`): "Responda até amanhã, 18h" ou "Ana responde até…";
  - o pedido 'expirado' vai para "Anteriores" como "Sem resposta no prazo" e some do painel;
  - o "mc.prazo" fica em gestao.js.
- **admin.html:** aba "Fotos" (GET /api/admin/fotos, aprovar, recusar com motivo).
- **portfolio.html** (com a API): passa a ler do perfil a foto (no lugar do retrato desenhado), os anos na legenda, o valor e o desconto (no topo e no orçamento), o veículo, os bairros e os dias e horários. Nas avaliações, mostra o parentesco ("Rafael S., filho"), e as datas saem no horário daqui.
- **Testado na 4175:**
  - salvar valor, desconto, anos e horários (a Ana depois voltou ao seed);
  - enviar uma foto de teste, que a equipe recusou;
  - prazo no painel e nos pedidos;
  - portfólio.
- **Pendente de decisão:** no exemplo fixo do portfólio, "R$ 60/h a partir de 4 h" é impossível, porque o mínimo é R$ 70. Com a API, a Ana aparece sem desconto.
- **Ainda sem tela:**
  - folgas e bloqueios (/api/profissionais/eu/bloqueios);
  - resposta da profissional a uma avaliação (POST /api/avaliacoes/:id/resposta);
  - parentesco no cadastro da pessoa acompanhada.

## Listagem mais leve — 20/10/2026
- **busca.html** (gerada por `python3 docs/gera_busca.py .`):
  - saiu a caixa "Para qual dia?", com os seis dias e as contagens; o dia fica só no campo da busca no topo, e "Trocar o dia" leva até ele;
  - saíram os cartões de turno com contagem acima da lista. O turno virou o filtro "Horário" na coluna de filtros (Qualquer horário, Manhã, Tarde e Noite, com o horário ao lado e sem contagem);
  - a frase do resultado encurtou: "23 profissionais verificadas." ou "10 profissionais livres no sábado, 24/10, para consulta ou exame.", sem a faixa de preço.
- **Dados:** a Cláudia passou de R$ 65 para R$ 70, porque R$ 65 fica abaixo do mínimo da plataforma.

## Ana a R$ 80, com R$ 70 a partir de 4 h — 20/10/2026 (decisão do usuário, repassada pelo backend)
- **Exemplos atualizados:**
  - portfólio: dados do orçamento, condições no topo e total inicial (4 h × R$ 70 = R$ 280);
  - resumo;
  - painel: pedidos novos, atendimentos, mês (R$ 1.080 feitos e R$ 1.480 com os confirmados) e o cartão "Seu perfil";
  - pedidos da família;
  - ganhos: R$ 80 a hora, com o desconto de R$ 40 nos pedidos de 4 h, e o texto das dúvidas;
  - perfil.js (exemplo);
  - home: cartão da Ana;
  - listagem.
- **Backend:** o seed é do commit 6d0ff02.

## Topo igual ao da home em pedidos, resumo e entrar — 20/10/2026
- **Problema:** pedidos.html, resumo.html e entrar.html usavam o topo das telas internas, com letra menor, altura de 60px e largura de 1100px. Em pedidos ainda faltava "Área profissional".
- **Correção:**
  - as três páginas usam `header class="topo topo-site"`, um modificador em resumo.css com os mesmos tamanhos da home: marca no step-lead, links no step-body, altura de 72px, largura total e "Área profissional" como aba de pasta;
  - em pedidos, "Área profissional" voltou ao menu;
  - resumo.css foi para v=7 nessas páginas.
- As telas internas (painel, perfil, ganhos, admin) continuam com o topo compacto.
- **Convite para entrar** (pedidos, painel, perfil, ganhos): o cartão "Entre para…" agora fica centralizado em qualquer largura. Antes, entre 640px e 1160px, ele encostava à esquerda.
- **Pulo ao abrir:** essas telas mostravam por um instante o conteúdo de exemplo antes do convite para entrar. Agora gestao.js esconde a tela e o convite (classe `carregando`) até a página tirar um dos dois, com limite de 4 s.
- **Ainda piscava com a API:** o navegador desenhava a página de exemplo antes de gestao.js rodar. Agora a classe `carregando` já vem no `<head>`, em pedidos, painel, ganhos, perfil e admin, e esconde também o nome da conta no topo. Com login, a tela aparece já com os dados da conta.
- **Piscada com login:** a tela só aparece quando os dados da conta já chegaram (gestao.js espera o `[data-gestao]` deixar de ficar `hidden`). Se demorar mais de 0,3 s, aparece um "Carregando…" discreto no meio. Medido na 4175: de 50 a 90 ms até a tela pronta.

## Foto do ipê sem crédito — 20/10/2026
- **portfolio.html:** a foto "Ipê rei" (CC BY 2.0, que exigia crédito) foi trocada por "Paisagem com ipê amarelo florido", de renalteix no Flickr (https://www.flickr.com/photos/40124183@N02/6330129969). Ela tem a marca de domínio público, que não exige crédito.
  - Arquivo: assets/ipe-amarelo-campo-1024.webp, com 1024 × 683 px.
  - O texto alternativo passou a ser "Ipê-amarelo florido no meio de um campo"; o antigo citava Campinas, mas a foto nova não é de lá.
- **Crédito:** a linha "Foto: …" saiu do rodapé do portfólio.
- **Arquivos antigos:** os ipe-rei-3831844709* continuam em assets/, sem uso. Podem ser apagados.

## Limpeza do primeiro protótipo — 20/10/2026
- **Apagados a pedido do usuário:**
  - cadastro.html, login.html, pagamento.html e mapa.html;
  - o styles.css antigo;
  - as fotos assets/ipe-rei-3831844709 (.jpg, -800.webp e -1600.webp).
- Nenhuma tela atual apontava para eles.
- **assets/credits.json:** saiu o ipê-rei e entrou a foto nova, de domínio público.
- **README, PRODUCT e DESIGN:** atualizados. O README agora lista as telas atuais.
- **Não mexi em docs/MAPA-DE-TELAS.md**, que descreve as 16 telas antigas. Ele ficou desatualizado.
