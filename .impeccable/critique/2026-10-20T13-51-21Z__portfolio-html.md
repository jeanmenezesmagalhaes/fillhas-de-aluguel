---
target: index.html portfolio.html resumo.html
total_score: 24
max_score: 36
na_heuristics: 9
p0_count: 0
p1_count: 3
target_identity: "file:/Users/jeanmenezes/code/fillhas-de-aluguel/portfolio.html"
target_fingerprint: "sha256:adb9c39a1af0505a0d8a20cdb9b889417ac49b367b2a29774875cae55e494211"
target_path: /Users/jeanmenezes/code/fillhas-de-aluguel/portfolio.html
timestamp: 2026-10-20T13-51-21Z
slug: portfolio-html
closed: true
---
# Crítica: index.html, portfolio.html, resumo.html

Method: dual-agent (A: revisão de design · B: detector + navegador)

## Design Health Score
| # | Heurística | Nota | Problema principal |
|---|---|---|---|
| 1 | Visibilidade do estado | 3 | Etapas sem marca de concluído nem aria-current; nav do topo sem página atual |
| 2 | Mundo real | 3 | "cuidador/profissional" na index vs "cuidadora" no resto; "Acompanhamento externo" sem explicação no resumo |
| 3 | Controle e liberdade | 2 | Resumo sem voltar/cancelar; migalha não é link |
| 4 | Consistência | 2 | h1 46px inline anula breakpoint; total cai p/ 14px no celular; R$ 20 vs R$ 20,00; mesma pílula p/ andaime e selo |
| 5 | Prevenção de erros | 3 | Composição clara; falta dizer quando paga e como cancela |
| 6 | Reconhecer vs lembrar | 3 | Resumo não repete rosto/verificação da Ana |
| 7 | Flexibilidade | 2 | Só WhatsApp e compartilhar como atalhos |
| 8 | Estética e minimalismo | 3 | Calmo; 6 notas de 12px + banner + rodapé repetem aviso |
| 9 | Recuperação de erros | n/a | Nenhum estado de erro nestas três amostras |
| 10 | Ajuda | 3 | "E depois?" bom; nada explica a verificação |
| **Total** | | **24/36** | **Aceitável (topo da faixa)** |

## Design Specificity Verdict
Parcialmente específico. Paleta, Georgia sobre creme, ilustração em arco e tom são do produto. Composição é de marketplace genérico (hero 2 colunas + busca + 3 cartões numerados; perfil com lateral de preço). Diferencial (verificação mensal) não tem forma visual; aparece como texto no 3º cartão do portfólio e não está na home.
Detector: 28 achados (18 low-contrast, 3 tiny-text, 3 kicker-above-heading, 1 tight-leading, 1 design-system-radius, 1 flat-type-hierarchy, 1 skipped-heading). Navegador: + 2 straggler no portfólio. Falsos positivos leves: tiny-text só na faixa de protótipo; radius 80/120px é o arco intencional.

## Priority Issues
- [P1] Total do resumo cai para 14px no celular. Causa: `@media(max-width:760px){.line{font-size:14px}}` vence `.total{font-size:24px}`. No desktop 1024px, "R$ / 330,00" quebra em 2 linhas. Fix: `.line.total{font-size:24px}`, `white-space:nowrap` no valor. /impeccable polish
- [P1] Ações principais enterradas no celular: busca em y≈1065 (tela 812); preço e "Solicitar atendimento" do portfólio em y≈2190 de 3345. Fix: ordem título → busca → arte reduzida; resumo compacto de preço sob o perfil; barra fixa com ação no rodapé; aside sticky no desktop. /impeccable adapt
- [P1] Confiança longe da decisão: verificação no 3º cartão; espaço de selo ocupado por "Perfil demonstrativo"; lateral de preço e resumo sem verificação; hero sem menção. Fix: componente "selo de revisão" com data, sob o nome, na lateral, no resumo e no hero. /impeccable bolder
- [P2] Contraste e andaime misturado ao produto: .hint #748078 3,5–4,1:1, .muted 4,1:1, borda de campo 1,36:1; avisos de protótipo e microtexto do produto no mesmo estilo. Fix: microtexto do produto em Líquen 13px; avisos de protótipo num marcador próprio; borda ≥3:1. /impeccable audit
- [P2] Texto inconsistente: gênero cuidador/cuidadora; seta ↗; "Quem recebeu cuidado conta" (autora é a filha); h1 "cuidado combinado" em tela de solicitação; "Endereço fictício"/"Total ilustrativo" dentro de rótulos; `<br>` fixos geram palavras sozinhas; h1→h3 no resumo. /impeccable clarify

## Persona Red Flags
- Mariana (filha à distância, celular, chega por link do WhatsApp): ~165px de cabeçalho, migalha de busca que não fez, "Perfil demonstrativo" no lugar de "verificada", 2,7 telas até o preço, total sem peso, sem saber cancelamento/pagamento.
- Casey (celular distraído): links do topo 19px de altura, barra de revisão 20px; nada na zona do polegar.
- Sam (acessibilidade): contrastes acima; h1→h3; etapas em span sem aria-current; "★★★★★" lido caractere a caractere.
- Jordan (primeira vez): "Acompanhamento externo" sem definição; não entende "verificado".

## Minor Observations
- Busca desktop: campo cidade ~25px acima do select (align-items:end pega a dica).
- "+ R$ 15" com sinal, "R$ 20" sem; dica "Adicional por atendimento" após todas as linhas.
- "4 · Aguardando aceite" é estado, não passo.
- system-ui varia por SO; validadores veem amostras diferentes.
- Straggler: "pontual.”" e "ilustrativos." sozinhos na última linha.
- Rodapé repete a faixa de protótipo.

## Questions to Consider
- Se a verificação mensal é o diferencial, qual forma visual a família reconhece em todas as telas e na prévia do link?
- Como seria a versão "link próprio da Ana", sem migalha nem navegação de plataforma, com contato no topo?
- Onde Helena aparece como pessoa com vontade própria antes do resumo?
