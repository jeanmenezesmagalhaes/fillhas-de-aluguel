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
