# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Contratante (foco da home):** a filha. Validação com usuária (20/10/2026): a home precisa deixar claro de imediato que é um marketplace, onde ela escolhe e contrata uma profissional. A filha que quer contratar uma profissional para acompanhar a mãe ou o pai idoso em alguma tarefa (consulta, exame, banco, compras, passeio). É ela quem decide e contrata. Exemplo canônico: Mariana Costa contrata para Helena Costa (78). Muitas vezes decide sem tempo ou à distância, pelo celular.
- **Pessoa acompanhada:** a mãe ou o pai idoso. Recebe o acompanhamento, mas não opera a contratação.
- **Profissional (acompanhante):** publica portfólio, define o valor da própria hora e, se quiser, um tempo mínimo de contratação; envia documentos, recebe e responde solicitações. A home só oferece um botão de acesso à área profissional.
- **Administração:** analisa perfis e documentos, revisões mensais, denúncias e métricas.

## Product Purpose

Plataforma web que liga a filha a profissionais verificadas para acompanhar o pai ou a mãe idoso em tarefas. Organiza a sequência de contratação: busca, portfólio, orçamento por horas, solicitação, aceite (com possível proposta alterada), confirmação, avaliação e denúncia.

Fase atual: **protótipo estático para validação**. O objetivo é o usuário (contratante do projeto) validar fluxos, informações, estilo, legibilidade, organização e tom. Sucesso nesta fase = protótipo aprovado como referência para futuro planejamento técnico. Ver `docs/CONTRATO.txt`.

## Positioning

- **Verificação mensal:** documentos da cuidadora revisados todo mês, com data da última e da próxima revisão visíveis no portfólio (ex.: 01/10/2026 e 01/11/2026).
- **Portfólio compartilhável:** cada cuidadora tem página pública própria, adequada para divulgar o link como portfólio profissional, não só como ficha de catálogo.

## Operating Context

- Uso no celular e no computador; contrato exige as duas representações.
- Fluxos: busca → resultados → portfólio → WhatsApp ilustrativo; portfólio → identificação → solicitação → resumo → aguardando aceite → confirmação; solicitação → alteração da cuidadora → novo aceite; cadastro da cuidadora → documentos → aprovação → portfólio publicado; contratação realizada → avaliação; denúncia → análise administrativa.
- 16 telas mapeadas em `docs/MAPA-DE-TELAS.md`; `mapa.html` é a navegação de revisão.
- Trabalho passa entre agentes; cada passagem registra estado em `docs/PASSAGEM.md` e continua sem reiniciar.

## Capabilities and Constraints

- HTML/CSS estático, sem dependências, backend ou coleta de dados. JavaScript só para apresentação (movimento, prévia de fotos, contagem de dias até a revisão), nunca para ações do produto.
- Botões, filtros e campos do produto são representações inativas. Exceções propostas em 20/10/2026: o orçamento por horas calcula na tela (horas sem teto, mínimo e desconto) e o filtro por tarefa da home mostra e esconde perfis; nada é enviado. Links de revisão (navegação entre amostras) ficam separados dos controles do produto.
- Não implementar: autenticação, banco, upload real, WhatsApp, tracking, pagamentos, e-mails, chat, operações administrativas, contratações reais, publicação como serviço operacional.
- Todos os dados são demonstrativos e as telas devem identificá-los assim.
- Busca por cidade é campo textual; cidades são dinâmicas conforme cobertura das cuidadoras.
- **Orçamento por horas:** a profissional define o valor da hora; a contratante escolhe as horas estimadas (1 h, 2 h, 3 h…). Algumas profissionais definem um tempo mínimo (ex.: 2 h) e o orçamento precisa respeitá-lo. Valor mínimo da hora na plataforma: R$70/h.
- **Hipótese não validada:** desconto progressivo por volume (ex.: a partir de 4 h a hora fica mais barata). O orçamento considera, mas o fluxo não depende disso.
- **Veículo:** a contratante precisa saber, antes de contratar, se o veículo da profissional está incluso. Pesa na decisão.
- **Proposta de modelo (20/10/2026, a validar):** o valor da hora já cobre o veículo quando ele é incluso; deslocamento e acompanhamento externo deixam de ser cobranças separadas.
- A visão da cuidadora não exibe a taxa cobrada ao cliente.
- **Indefinido:** modelo de recebimento da taxa da plataforma (R$15 é só exemplo, nunca apresentar como decidido); valor, finalidade, periodicidade, método e relação com publicação do pagamento da cuidadora (`pagamento.html`).
- **Nome definido (20/10/2026):** "Minha companhia". Substitui o provisório "Filha de Aluguel"; marca em escolha entre três direções (`docs/marca/direcoes.html`).

## Brand Commitments

- Nome: **Minha companhia** (antes, provisório: Filha de Aluguel). As telas ainda mostram o nome antigo até a escolha da marca.
- Tom de voz: **acolhedor e respeitoso**. Próximo e calmo, como alguém de confiança da família. Nunca infantilizar o idoso.
- Textos em português do Brasil.
- Termo de gênero: textos gerais usam forma neutra ("profissional", "acompanhante"); perfis individuais seguem a pessoa. Decidido em 20/10/2026.
- Termo do serviço (proposta, 20/10/2026): "acompanhante" e "acompanhar em tarefas", no lugar de "cuidado em casa".

## Evidence on Hand

Dados canônicos fictícios, consistentes entre telas (fonte: `docs/PASSAGEM.md`):

- Ana Oliveira, Campinas (Cambuí/Taquaral), 6 anos de experiência, carro próprio incluso, seg–sex 8h–18h. Revisão 01/10/2026, próxima 01/11/2026. Nota 4,9 em 12 avaliações fictícias.
- Proposta nas amostras redesenhadas (20/10/2026): R$70/h, mínimo de 2 h, a partir de 4 h R$60/h (hipótese de desconto), veículo incluso.
- Cláudia Ramos (amostra nova, Taquaral): R$65/h, mínimo de 1 h, sem desconto, sem veículo.
- Marta Ferreira (amostra nova, Centro e Bosque, 9 anos): R$75/h, mínimo de 3 h, R$68/h a partir de 3 h, veículo incluso, 5,0 em 4 avaliações, revisão 08/10/2026.
- Joana Prado (amostra nova, Cambuí, 3 anos): R$70/h, mínimo de 2 h, sem desconto, sem veículo, 4,7 em 19 avaliações, revisão 29/09/2026.
- Cláudia: 4,8 em 7 avaliações, revisão 05/10/2026, Taquaral, 4 anos.
- Mariana Costa contrata Ana para levar Helena Costa (78) a uma consulta, 28/10/2026, 9h–13h: 4 h × R$60 = R$240; taxa da plataforma em definição, fora do total.
- Dados anteriores (R$330 com deslocamento R$20, acompanhamento externo R$15 e taxa R$15; visão da cuidadora R$315) seguem nas telas ainda não revisadas (valores.html, pagamento.html).

Retratos são ilustrações locais, não fotografias de pessoas reais. Não existem clientes, depoimentos, métricas ou parcerias reais; não inventar.

## Product Principles

1. **Confiança visível.** Verificação, datas de revisão e avaliações aparecem onde a decisão acontece, não escondidas.
2. **Valores abertos.** O orçamento mostra horas, valor da hora, mínimo e veículo antes de qualquer contratação; nada indefinido aparece como decidido.
3. **A profissional como profissional.** O portfólio é dela e precisa funcionar fora da plataforma, como link próprio.
4. **Respeito ao idoso e à família.** Linguagem calma, sem urgência artificial nem tom infantil.
5. **Protótipo honesto.** Dados demonstrativos sempre identificados; controles inativos nunca fingem ação real.

## Accessibility & Inclusion

Contrato exige textos legíveis e navegação visual clara no celular e no computador. Nenhum padrão formal (ex.: WCAG nível) foi definido ainda.
