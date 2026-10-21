---
name: Minha companhia
description: Profissionais para acompanhar o pai ou a mãe idoso em Campinas; a pasta de documentos revisada todo mês como forma única do sistema, em fundo claro.
colors:
  chao: "#ffffff"
  copa: "#10251e"
  copa-clara: "#163229"
  folha: "#2d5e4b"
  folha-escura: "#24503f"
  ipe-rosa: "#f28cb1"
  ipe-rosa-claro: "#f6a9c5"
  ipe-amarelo: "#f2c94c"
  salvia: "#dce8e0"
  salvia-funda: "#c3d6ca"
  papel: "#ffffff"
  liquen-claro: "#b3c7bd"
  liquen: "#55695f"
  liquen-salvia: "#4d6359"
  ipe-escuro: "#e3b53a"
  ipe-texto: "#5a4a12"
  folha-texto: "#c9dad1"
  app-chao: "#f2f5f2"
  app-borda: "#e3e8e4"
  app-linha: "#eef1ee"
  app-dado: "#c2366f"
typography:
  display:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "clamp(3rem, 6.4vw, 6.5rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.3rem + 3.2vw, 4rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "clamp(0.875rem, 0.85rem + 0.1vw, 0.9375rem)"
    fontWeight: 400
    lineHeight: 1.5
  app-title:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
  app-body:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.47
rounded:
  pagina: "0px"
  app-cartao: "8px"
  app-controle: "6px"
spacing:
  margem: "clamp(16px, 3vw, 48px)"
  recuo-pasta: "7vw"
  aba: "40px"
  secao: "clamp(96px, 10vw, 160px)"
  app-gap: "16px"
  app-cartao: "24px"
components:
  botao-primario:
    backgroundColor: "{colors.ipe-rosa}"
    textColor: "{colors.copa}"
    typography: "{typography.body}"
    rounded: "{rounded.pagina}"
    height: "52px"
    padding: "0 32px"
  botao-escuro:
    backgroundColor: "{colors.copa}"
    textColor: "{colors.papel}"
    rounded: "{rounded.pagina}"
    height: "52px"
    padding: "0 32px"
  pasta-frente:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.copa}"
    rounded: "{rounded.pagina}"
  pasta-salvia:
    backgroundColor: "{colors.salvia}"
    textColor: "{colors.copa}"
  pasta-folha:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.papel}"
  pasta-ipe:
    backgroundColor: "{colors.ipe-amarelo}"
    textColor: "{colors.copa}"
  botao-area-profissional:
    backgroundColor: "{colors.salvia}"
    textColor: "{colors.copa}"
    height: "44px"
    padding: "0 20px"
  barra-hora:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.copa}"
    padding: "18px 12px 12px"
  barra-hora-escolhida:
    backgroundColor: "{colors.copa}"
    textColor: "{colors.papel}"
  barra-hora-abaixo-minimo:
    backgroundColor: "{colors.ipe-escuro}"
    textColor: "{colors.ipe-texto}"
  campo:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.copa}"
    rounded: "{rounded.pagina}"
    height: "52px"
    padding: "0 16px"
  ladrilho:
    backgroundColor: "{colors.salvia}"
    textColor: "{colors.copa}"
    padding: "24px"
  app-cartao:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.copa}"
    rounded: "{rounded.app-cartao}"
    padding: "24px"
  app-botao-primario:
    backgroundColor: "{colors.copa}"
    textColor: "{colors.papel}"
    rounded: "{rounded.app-controle}"
    height: "40px"
    padding: "0 16px"
---

# Design System: Minha companhia

## Overview

**Creative North Star: "A pasta de documentos"**

A pessoa que decide é a filha que contrata uma profissional para levar a mãe ou o pai a uma consulta, ao banco ou ao mercado, quase sempre pelo celular e de dia. O que separa este serviço dos outros é que os documentos de cada profissional são revisados todo mês. A pasta onde eles ficam deu a forma do sistema: a aba trapezoidal recorta fotos, retratos, botões e blocos. Na home ela ficou só como detalhe: a validação com uma usuária mostrou que a pilha de pastas confundia e escondia o essencial, que ali se escolhe e se contrata uma profissional. A home agora é um marketplace: título que diz isso, busca, atalhos de tarefa com foto e a lista de profissionais com preço, mínimo, veículo e avaliações já na primeira tela.

As cores vêm de Campinas: o verde-escuro da copa das tipuanas e do Bosque dos Jequitibás como tinta e campo forte, os dois ipês da cidade (o rosa para a ação, o amarelo para o orçamento) e a sálvia como papel. O chão é branco: a filha lê preço e condições de dia, no celular, e o fundo escuro anterior gritava demais para esse momento. Fotos reais da cidade, de acervos abertos e com crédito no rodapé, mostram onde o cuidado acontece; pessoas continuam sendo ilustração. A tipografia é uma família só, Jost, em caixa normal, com o título da capa em peso 700.

Rejeições confirmadas: nada de hospital ou clínica (branco frio, azul hospitalar, cruz médica) e nada de clichê de asilo (fotos de banco de imagem, mãos enrugadas, velhice como tristeza).

O resumo da solicitação é uma tela de trabalho e segue regras próprias: chão de sálvia, cartões brancos com borda de 1px, título de 24px e uma cor só nos dados (as horas de Ana em rosa escurecido).

Aplicado hoje em `index.html`, `portfolio.html` (`site.css`, `site.js`) e `resumo.html` (`resumo.css`). As telas do primeiro protótipo (login, cadastro, pagamento e mapa), que usavam o sistema anterior (`styles.css`), foram apagadas.

**Key Characteristics:**
- Chão branco e tinta verde-copa; campos de cor separam as seções.
- Home de marketplace: lista de cartões de profissionais logo abaixo da busca.
- O orçamento é a peça viva do perfil: seletor de horas sem teto, com mínimo, desconto e veículo.
- Uma forma só (a aba), em escalas muito diferentes: capa, seções, fotos, botões, marcadores.
- Jost em cinco tamanhos: display, título, destaque, corpo, nota.
- Cantos retos em todo o site; a aba é a única quebra da geometria.
- Fotos reais de Campinas com crédito; pessoas só em ilustração.
- Sem sombras, sem degradês, sem linhas finas; separação por campo de cor.

## Colors

Verde-copa como chão, dois ipês como acento e campos, sálvia e branco como papéis.

### Primary
- **Ipê-rosa** (`ipe-rosa`): botão principal, a pasta grande dos documentos, a faixa final "Buscar", a marca. Texto em verde-copa sobre ele (7,0:1).
- **Ipê-rosa claro** (`ipe-rosa-claro`): hover do botão principal.

### Secondary
- **Ipê-amarelo** (`ipe-amarelo`): a pasta do orçamento. Texto em verde-copa (10,1:1). **Ipê escuro** (`ipe-escuro`) marca as horas abaixo do mínimo e o botão de profissional não escolhido.
- **Folha** (`folha`) / **Folha escura** (`folha-escura`): a pasta "Como funciona", o painel de apresentação do portfólio e o terceiro degrau de valores. Texto branco (7,5:1); texto secundário em `folha-texto` (5,1:1).

### Neutral
- **Chão** (`chao`): fundo da página.
- **Copa** (`copa`): cor do texto (16:1), a pasta das tarefas, o quadro do total do orçamento, a faixa do protótipo e o rodapé.
- **Copa clara** (`copa-clara`): reserva para o botão desativado sobre fundo escuro.
- **Papel** (`papel`): campos da busca, barras de horas, quadros de condições.
- **Sálvia** (`salvia`) / **Sálvia funda** (`salvia-funda`): pasta da frente (busca e documentos), ficha do portfólio, ladrilhos, botão da área profissional.
- **Líquen claro** (`liquen-claro`): texto secundário sobre o chão (9,1:1).
- **Líquen** (`liquen`) / **Líquen-sálvia** (`liquen-salvia`): texto secundário sobre papel (5,9:1) e sobre sálvia (5,1:1).
- **App** (`app-chao`, `app-borda`, `app-linha`, `app-dado`): só na tela de resumo. `app-dado` aparece apenas nas horas de atendimento (barra de composição, faixa do dia, marcador).

### Named Rules
**A Regra dos Dois Ipês.** Rosa é ação e motivo; amarelo é orçamento. Nenhum dos dois vira texto corrido, e só o rosa preenche botões.

**A Regra da Pasta.** Toda seção do site é uma pasta: um campo de cor, recuado, com aba. Nunca uma linha ou uma sombra separando blocos.

## Typography

**Display Font:** Jost (com system-ui), arquivo local em `fonts/jost-latin.woff2`
**Body Font:** Jost

**Character:** Geometria circular dos anos 1920, firme no título da capa e calma no texto de leitura. Uma família, cinco tamanhos.

### Hierarchy
- **Display** (700, 44 a 76px, 0.98, -0.035em, caixa normal): só o título da home ("Escolha quem acompanha sua mãe"); em escala maior, a palavra da chamada ("Escolher"). A marca em blocos do rodapé é a única caixa alta.
- **Headline** (700, 36–64px, 1.0, -0.03em): títulos das seções, nomes das tarefas, total do orçamento, nome de Ana.
- **Lead** (500, 20–26px, 1.3): frase de apoio, lista de documentos, títulos de cartões e degraus.
- **Body** (400, 17–19px, 1.5): texto corrido, máximo 60ch.
- **Small** (400, 14–15px): notas, legendas, créditos, rótulos de campo.
- **App** (24px de título, 15px de corpo, 13px de meta): só no resumo.

### Named Rules
**A Regra da Caixa Alta Única.** Caixa alta só na marca em blocos do rodapé e no carimbo da ficha. Nenhum rótulo pequeno em caixa alta, nenhum sobretítulo acima de título.

## Layout

Página branca com margens iguais de 16 a 48px; as pastas ficam recuadas 7vw (0 no celular, onde ocupam toda a largura). Seções separadas por 96 a 160px de chão mais a altura da aba (40px; 32px no celular).

- **Home, abertura:** respira. O título fica de 56 a 104 px abaixo do menu. A frase de apoio é curta, a 32 px do título. Abaixo dela vem uma linha folha com escudo, "Só profissionais verificadas, com documentos conferidos todo mês.". A busca fica a 56 px. No celular, as distâncias são 32, 20 e 32 px.
- **Home, lista:** título curto e contagem ao lado; atalhos de tarefa (Todas + quatro fotos de Campinas com véu verde e duração típica) que filtram a lista; quatro cartões em grade (2 no tablet, 1 no celular). No computador, os retratos aparecem na primeira tela.
- **Home, como contratar:** campo folha com três etapas numeradas. Cada uma tem o número numa aba ipê-amarela (trapézio da pasta), o verbo grande (Escolha, Faça o orçamento, Confirme) e uma frase curta em linguagem simples.
- **Home, verificação:** abaixo da frase de apoio, um escudo folha com "Só profissionais verificadas." e o que é conferido. A contagem da lista diz "profissionais verificadas", e o primeiro motivo de confiança é "Só entra quem é verificada".
- **Home, história:** os textos seguem a filha do problema à decisão. A abertura começa por "Para os dias em que você não pode ir junto". A lista mostra quem pode ir. As três etapas terminam em "Pronto: sua mãe já tem companhia". "Por que você pode confiar" traz verificação, a voz de quem já contratou e "Você sabe quanto vai pagar". A chamada final volta à consulta marcada. As notas de amostra ficam em texto pequeno e cinza, sem contagem de dias.
- **Home, por que confiar:** pasta rosa com a ficha de Ana fixa à esquerda e três motivos à direita.
- **Como funciona:** diagrama de quadradinhos (dispersos, comprimidos, ordenados em rosa) e três colunas embaixo.
- **Portfólio:** capa dividida 50/50 (ficha sálvia com condições e foto fixa), painel verde de apresentação, orçamento só com Ana (seletor sem teto), cardápio de tarefas e de onde e quando, ladrilhos de documentos, depoimento deslocado.
- **Resumo:** coluna de 920px, com o pedido à esquerda e o total de 320px à direita.

Pontos de quebra: 760px (telefone) e 1100px (tablet, onde grades de quatro viram duas e o cardápio vira uma coluna).

## Elevation & Depth

Sistema plano. Profundidade vem da sobreposição das pastas (z-index crescente da mais distante à da frente) e da troca de campo de cor. Nenhuma sombra no site. No resumo, cartões brancos com borda de 1px sobre o chão de sálvia.

### Named Rules
**A Regra da Pilha.** O que está mais perto da pessoa fica na frente e é mais claro: a pasta branca da busca cobre todas as outras.

## Shapes

Cantos retos. A única forma é a aba trapezoidal: `clip-path: polygon(16px 0, calc(100% - 16px) 0, 100% 100%, 0 100%)`, 40px de altura (32px no celular). Ela aparece no topo de cada pasta, como recorte superior das fotos (um degrau de aba de 40px), nos botões (trapézio de 12px), nos marcadores do cardápio e na marca. O resumo usa cantos de 8px nos cartões e 6px nos controles, como uma tela de trabalho.

## Components

### Buttons
- **Primário:** trapézio rosa (`ipe-rosa`), texto verde-copa 500, 52px de altura. Pressionar reduz para 97%. Os botões do produto ficam `disabled` por contrato, com opacidade total.
- **Foco:** anel de 3px por dentro do recorte (offset -7px), porque o `clip-path` cortaria um anel externo.
- **Resumo:** primário quase preto (`copa`), secundário em cinza-sálvia, 40px (44px no celular).

### Cards / Containers
- **Pasta:** campo de cor reto, padding de 40 a 72px, aba no topo. Fica no portfólio (orçamento) e na chamada final; a home não usa mais a pilha. Abas das seções não levam texto; as da capa levam o nome da seção e são links.
- **Ladrilho:** campo sálvia, proporção 3:2, título em destaque e status em líquen-sálvia.

### Inputs / Fields
- **Campo:** fundo branco sobre a pasta sálvia, sem borda, 52px, texto verde-copa; rótulo em pergunta acima, dica abaixo. Desabilitados por contrato, com cor de texto forçada.

### Navigation
- **Topo:** ver "Menu e busca que acompanham a rolagem".
- **Rodapé:** marca construída em blocos coloridos (letras recortadas no verde), quatro colunas de links de revisão, créditos das fotos e o botão "Ver mapa das telas".

### Marca
Direção "Lado a lado", escolhida em 20/10/2026 entre três (`docs/marca/direcoes.html`): duas abas de pasta que se apoiam, a primeira em ipê-rosa e a segunda em verde-copa (branca sobre fundo escuro), seguidas de "minha companhia" em Jost 500, minúsculas. Símbolo de 32 × 22px no topo, com 10px até o nome. Favicon em `favicon.svg`: o símbolo sobre um quadrado sálvia com cantos de 14px. No rodapé, o nome volta construído em blocos coloridos (MINHA / COMPANHIA no celular).

### Menu e busca que acompanham a rolagem
Topo fixo em branco: marca à esquerda, links (Encontrar profissional, Como contratar, Por que confiar, Meu pedido) e o botão sálvia "Área profissional". Some ao rolar para baixo e volta ao rolar para cima (transformação de 320ms). Na home, quando a busca grande sai da tela, o topo traz junto uma busca compacta numa faixa sálvia (no celular, só tarefa e botão). Abaixo de 900px, os links viram um botão "Menu" que abre a lista por cima da página, com sombra por ser uma camada que flutua. No resumo, o mesmo menu em estilo de tela de trabalho, com uma faixa de caminho abaixo ("Perfil de Ana / Pedido para Helena Costa").

### Cartão de profissional
Só o que a filha usa para comparar e escolher. Campo sálvia sem borda. No topo, retrato ilustrado num campo de 132px com recorte de aba na base. Depois: nome (destaque) com a nota à direita (estrela amarela, nota e número de avaliações), valor da hora em título, bairro em líquen e duas linhas brancas com ícone: "Mínimo de N horas" e "Veículo incluso" ou "Sem veículo" (carrinho riscado de rosa). Fecha com o botão verde-copa "Ver perfil e orçar"; perfis fora da amostra levam um botão sálvia desativado. Desconto por volume, revisão de documentos, tarefas e experiência ficam no perfil, não no cartão.

### Atalho de tarefa
Os atalhos são botões de filtro simples, sem foto: o nome da tarefa e a contagem em cinza. A borda é sálvia; o botão ativo fica preenchido em verde-copa, com texto branco. No computador ficam lado a lado numa linha que quebra se precisar. No celular, "Todas as tarefas" ocupa a largura toda e os outros ficam em duas colunas. Saíram as fotos de Campinas, o véu escuro e a duração típica.

### Orçamento por horas
A peça viva do perfil. Seletor de horas sem teto num campo ipê-amarelo: botões trapezoidais verde-copa de menos e mais, número grande editável, atalhos de 2, 4, 6, 8 e 12 h e uma fileira de blocos com recorte de aba, um por hora (até 48, depois "+ N h"), brancos no valor cheio e verde-copa no valor com desconto. Abaixo do mínimo, o menos trava e o número é corrigido com aviso. Ao lado, o quadro verde-copa mostra o total em título, a conta ("4 horas × R$ 60,00 por hora"), o mínimo, o desconto (com a economia, quando vale) e o veículo, com um carrinho amarelo que ganha um risco rosa quando não está incluso. Sem script, o campo continua editável e o quadro mostra o exemplo de 4 horas.

### Condições na capa do portfólio
Três quadros brancos em linha: valor da hora (com o valor com desconto embaixo), mínimo e veículo. Aparecem antes do botão "Fazer orçamento".

### Ficha de documentos
Desenho de uma folha levemente girada com nome, linhas de documento e carimbo redondo "REVISADO 01 OUT 2026" em verde. Fica dentro da pasta rosa da home e é a ilustração do diferencial.

### Contagem da revisão
Texto calculado a cada visita ("Faltam 12 dias…") a partir de 01/11/2026, com frase fixa como reserva sem script.

### Listagem de profissionais (busca.html)
É uma tela de trabalho (estilo livro-caixa) dentro do topo do site, e responde a uma pergunta: quem pode ir com minha mãe nesse dia, e quanto custa a hora?
- **Brasil todo:** sem cidade, o título é "Profissionais em todo o Brasil" e a frase de achado conta as cidades. O campo de cidade sugere as cidades atendidas. Cada linha mostra "bairros · Cidade, UF". O filtro de bairro fica inativo ("Escolha a cidade antes") até haver uma cidade.
- **Topo:** a busca da home (cidade, tarefa, data) vale para a lista inteira. Quando ela sai da tela, aparece a busca compacta no topo.
- **Título e ordenação:** título de 32 px "Profissionais em {cidade}" (ou "em todo o Brasil"), com uma frase que diz quantas estão livres no dia e a faixa de valor. "Ordenar por" fica à direita.
- **Filtros (sálvia, 280 px):**
  - bairro da mãe;
  - valor da hora: um controle deslizante de mínimo e máximo (degraus de R$ 5, limites tirados dos dados) sobre barras que mostram quantas profissionais cobram cada valor; as barras dentro da faixa ficam folha;
  - mulher ou homem;
  - veículo incluso.
  Cada opção mostra quantas sobrariam se só ela mudasse. Os filtros não repetem a cidade, a tarefa nem a data da busca do topo.
- **Turnos:** quatro cartões com contagem que filtram. O escolhido ganha borda e fundo folha.
- **Linhas da lista:** retrato de 112 px, nome com a nota, bairros, "Livre na quarta, 28/10, de manhã" com ponto folha, mínimo e veículo. O valor da hora fica sempre na borda direita, com o botão logo abaixo.
- **Cor:** só nos dados, ou seja, a disponibilidade e o turno escolhido.
- **Abaixo de 1000 px:** os filtros viram uma folha aberta pelo botão "Filtros", que mostra quantos filtros estão ativos. No celular, os turnos rolam na horizontal.
- **Dia do acompanhamento** (antes, só "Data"):
  - Sem dia escolhido, um aviso pergunta "Para qual dia?" e oferece atalhos para os próximos seis dias, cada um com quantas profissionais estão livres, além de "Outro dia", que abre o calendário. No celular aparecem três atalhos e "Outro dia".
  - Com dia escolhido, a frase de achado mostra o dia e um "Trocar o dia".
  - Mudar a data aplica na hora, sem precisar apertar Buscar.
  - Na busca compacta do celular, o dia aparece junto da tarefa.
- **Sem resultado:** cidade sem atendimento, dia sem ninguém livre ou filtros demais. Cada caso tem uma frase e uma ação.
- **URL:** filtros e ordenação ficam na URL.

### Caminhos da home para a listagem
- Botão da busca: "Ver profissionais", que envia cidade, tarefa e dia.
- Link "Ou veja todos os profissionais de Campinas", abaixo da busca.
- Link "Ver todos", no cabeçalho da lista.
- Botão "Ver todos os profissionais", abaixo dos cartões, com texto fixo.
- Botão rosa "Escolher profissional", no fim de "Como contratar".
- A chamada final e o menu.

### Área profissional (profissional.html)
Página para quem quer trabalhar acompanhando pessoas idosas.
- **Banner:** campo verde-copa dentro das margens. À esquerda, "Uma nova renda para quem cuida", a frase de apoio, o botão rosa "Quero me cadastrar" e o link "Já tenho cadastro: entrar". À direita, a camada da marca: quatro pastas empilhadas (rosa, ipê, sálvia, folha), cada uma com sua aba trapezoidal. Na pasta da frente fica o pedido como ele chega, com quem pede, a tarefa, o dia, as horas × o valor, o total, "Aceitar" e "Propor mudança".
- **Quanto você pode ganhar:** calculadora em campo sálvia. O total de 4 semanas vem primeiro; abaixo, dois controles deslizantes, valor da hora (R$ 70 a R$ 150) e horas por semana (2 a 40). Uma nota diz que o valor é antes da taxa da plataforma.
- **Como funciona:** título à esquerda e três etapas com o número na aba ipê.
- **Quem decide é você:** campo ipê com três linhas (preço, agenda, perfil). Cada linha traz um recorte da tela de perfil da profissional.
- **Final:** chamada rosa "Cadastrar".
- Todos os links "Área profissional" levam para esta página.

### Lista da home
Os atalhos de tarefa e o link "Ver todos" dividem a mesma linha, com o link à direita. A contagem "4 profissionais verificadas…" saiu da tela e ficou só para leitores de tela.

### Resumo do pedido (resumo.html, enxuto)
Tem só o essencial para enviar o pedido.
- **Topo:** link "Perfil de Ana", título "Revise o pedido" e uma frase.
- **Cartão do pedido:** a profissional (retrato, nome, "Profissional verificada") e cinco linhas: tarefa, quando, quem vai, saída e volta, recado para a profissional.
- **Cartão do total**, que fica fixo ao rolar: o total e a conta (horas × valor, veículo incluso), seguidos de um de três estados:
  - **Sem conta:** "Entrar para enviar", "Primeira vez aqui? Criar conta" e uma nota.
  - **Com conta:** "Enviando como Mariana Costa. Sair", "Enviar pedido" e a nota de aceite.
  - **Enviado:** "Pedido enviado para Ana", com o e-mail da resposta.
  "Mudar as horas" fica abaixo e some depois do envio.
- **Entrar (entrar.html):** cartão de 480 px com "Entrar" e "Criar conta" lado a lado.
  - Para entrar: e-mail e senha.
  - Para criar conta: também nome e celular com WhatsApp.
  - Os erros aparecem abaixo de cada campo.
  - O botão diz "Entrar e voltar ao pedido" quando há um pedido esperando.
- **Saíram:** a trilha, as etapas, a faixa de disponibilidade, a barra de composição, "Quem contrata", o tempo mínimo, o aviso de desconto e "Depois do envio".

### Telas de gestão (painel.html e pedidos.html, gestao.css)
Seguem o estilo livro-caixa do resumo: chão sálvia, cartões brancos e coluna de 1100 px, com 2/3 para o conteúdo principal e 360 px para a lateral.
- **Pedidos que pedem ação:** cada um traz quem pede, a tarefa, o dia, as horas × o valor e o total. Os botões são um primário, um secundário e "Recusar" como link. Recusar pede confirmação. O resultado aparece no próprio pedido.
- **Proposta:** na profissional, campos de início e horas, mais um recado. Na família, "Você pediu", riscado, ao lado de "propôs", em verde-claro.
- **Agenda e anteriores:** linhas com dia, horário, o quê e o valor ou a ação, sempre nas mesmas colunas.
- **O mês:** o número grande, depois barras por semana (feito em folha, confirmado em cinza, na mesma escala) e o total com os confirmados.
- **Selos:** pequenos e em tom claro (cinza, rosa para prazo, verde para "No ar").
- **Estrelas:** desenhadas em SVG.
- **Sem entrada:** um cartão de entrar no lugar da tela.

### Portfólio (portfolio.html)
- **Capa:** a ficha sálvia à esquerda e, à direita, o retrato da profissional numa pasta rosa. As condições ficam em três quadros brancos, cada texto numa linha.
- **Orçamento:** só o campo de horas, o mais e o menos e os atalhos 2, 4, 6 e 8 h. A leitura do total fica ao lado.
- **Tarefas e onde/quando:** um ícone de linha na aba sálvia, o título, a duração ou o valor à direita e uma frase curta.
- **Avaliações:** a média grande, as três mais recentes em lista e "Ver todas" numa janela com quatro ordens.

### Ganhos (ganhos.html)
Extrato para a profissional não precisar do suporte.
- **Título:** a frase diz quanto já caiu e o próximo depósito.
- **"Como chegamos ao valor":** a conta do mês linha por linha (atendimentos, desconto, cancelamento, taxa e "Você recebe"), cada uma com a regra em cinza. Embaixo, três caixas: "Já na sua conta", "Programado" e "Previsto".
- **Próximos depósitos:** dia e valor, com o motivo, e a chave Pix.
- **Extrato:** tabela arejada, com 20 px por célula e no máximo uma linha de apoio em cada uma. As colunas são atendimento, serviço com a família, pagamento ("Pix", "Cartão, 3x" com o valor das parcelas), valor, taxa, o que ela recebe e o depósito.
  - Os filtros de período são "Último dia", "7 dias", "30 dias" (o padrão), "365 dias" e "Todo o período". Eles valem só para atendimentos que já aconteceram e mudam também "Como chegamos ao valor" e o total da tabela, que batem entre si.
  - Os atendimentos que ainda vão acontecer ficam em "Próximos depósitos".
  - "Ver conta" abre a soma e o caminho do dinheiro.
  - "Baixar extrato" baixa o período escolhido.
  - No celular, a tabela vira lista.
- **Dúvidas sobre pagamento:** seis perguntas que se abrem e um e-mail de ajuda com o assunto já preenchido.

### Cadastro da profissional (verificacao.html, verificacao.js, verificacao.css)
O celular vem primeiro, com uma coluna só e etapas numeradas pela posição. A etapa atual tem borda escura; as prontas ganham um ✓ verde, desenhado em CSS. Uma barra mostra "N de 3 etapas prontas".
1. **E-mail e WhatsApp:** cada canal mostra o destino mascarado, "Enviar código" e um campo de 6 números (one-time-code). Quando o sexto número entra, o código é confirmado sozinho; o reenvio só libera depois de 60 s.
2. **Dados e endereço:**
   - CPF com máscara, e a opção "Também trabalho com CNPJ" abre CNPJ e razão social. O endereço vai numa grade de 6 colunas.
   - Depois de salvo, vira um resumo com "Alterar dados".
3. **Documentos:**
   - Um cartão por documento exigido, com "Tirar foto" (câmera traseira) e "Escolher arquivo".
   - Mostra o nome, o tamanho e "Ver o que enviei".
   - Um documento recusado fica em rosa, com o motivo.
4. **Enviar:** a lista do que falta e o botão "Entrar na lista de espera".

**Estados da tela:**
- **Correção:** um aviso rosa com o motivo no topo, e o botão vira "Enviar de novo".
- **Na fila:** a posição em número grande ("3º na fila"), três passos (enviado, conferência, perfil no ar) e os dados travados.
- **Aprovada:** link para o painel.

**Indicações:** o código, os links para profissionais e para famílias (copiar ou enviar no WhatsApp), três contagens e as pessoas indicadas com a etapa. Uma nota diz que as regras de recompensa ainda estão sendo definidas.

- **Veículo e cursos:** dois cartões abaixo das etapas, que valem em qualquer fase.
  - "Atende com veículo?" tem duas opções e salva na hora. Ligar o veículo põe a CNH na etapa 3. Na fila, ligar dá aviso. Aprovada e sem CNH, abre um cartão para enviar a CNH.
  - "Cursos e treinamentos" lista cada curso com Em validação, Validado ou Recusado (com o motivo), "Ver certificado" e "Tirar do perfil" (pede confirmação). O formulário pede nome, onde fez, carga horária, ano e certificado.

### Administração (admin.html, admin.js)
- **Fila:** à esquerda, em ordem de envio, com posição, nome, cidade, quem indicou e há quanto tempo.
- **Ficha:** à direita, com contatos (confirmado ou não), CPF e CNPJ completos, endereço e os documentos atuais com "Abrir documento", "Aprovar" e "Recusar" (pede o motivo).
- **Envios anteriores:** ficam num details.
- **Decisão:** "Aprovar perfil" só libera com todos os documentos aprovados; "Pedir correção" pede o motivo.
- **Abas:** "Cadastros", "Cursos para validar" e "Documentos avulsos" (por exemplo, a CNH de quem já foi aprovada), cada uma com a contagem. Antes, eram só "Cadastros" e "Cursos para validar", cada uma com a contagem. A segunda mostra os cursos do mais antigo ao mais novo, com Validar e Recusar (pede o motivo). A ficha mostra se a profissional atende com veículo e os cursos dela.
- **Portfólio:** a seção "Cursos validados" fica depois dos documentos, com um campo sálvia por curso (nome, instituição, horas e ano) e o selo "Validado em…". Com a API, a lista vem de /api/profissionais/:slug.
- **No celular:** a fila vem antes da ficha.

## Do's and Don'ts

### Do:
- **Do** mostrar pessoas e preços na primeira tela da home; ela é um marketplace.
- **Do** usar o ipê-rosa no botão principal e no motivo grande, e o ipê-amarelo só para o orçamento.
- **Do** mostrar valor da hora, mínimo e veículo antes de qualquer botão de pedido.
- **Do** mostrar a data da revisão de documentos onde a família decide: capa, perfil, ladrilhos, resumo.
- **Do** usar fotos reais de Campinas com crédito no rodapé, nunca como se fossem da profissional ou da família.
- **Do** manter a faixa de protótipo, a navegação de revisão no rodapé e as notas de dado fictício.
- **Do** manter títulos em até duas linhas em qualquer largura.

### Don't:
- **Don't** usar visual de hospital ou clínica, nem clichê de asilo.
- **Don't** colocar sobretítulo, rótulo em caixa alta pequena, numeração 01/02/03 ou pílula acima de título.
- **Don't** usar sombras, degradês, linhas finas de separação ou caixas com contorno no site.
- **Don't** usar fotos de pessoas; Ana e as famílias aparecem só em ilustração.
- **Don't** apresentar a taxa da plataforma, o desconto por volume ou o pagamento da profissional como decididos.
- **Don't** dar à profissional mais que um botão na home: a página fala com a filha.
- **Don't** voltar à pilha de pastas na home: na validação, a metáfora confundiu.
- **Don't** misturar o estilo do site com o do resumo: o resumo é tela de trabalho (24px, bordas de 1px, cantos de 8px).
