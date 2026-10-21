# Gera busca.html (listagem de profissionais) a partir dos dados abaixo.
# Pergunta da tela: quem pode ir com minha mãe nesse dia, e quanto custa a hora?
# Achado: quantas estão livres no dia escolhido e a faixa de valor.
# Rosto: disponibilidade no dia escolhido (turnos com contagem + "Livre na quarta de manhã" em cada linha).
import json, re, sys
from pathlib import Path

RAIZ = Path(sys.argv[1])

CABELOS = {
    'lateral': '<path d="M34 49Q20 9 59 9q37 0 28 47L76 34Q49 40 40 28Z" fill="{c}"/>',
    'cachos': ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{{c}}"/>' for x, y, r in [(40,30,13),(52,20,14),(66,20,14),(79,30,13),(36,44,10),(84,44,10)]),
    'grisalho': '<path d="M30 62Q24 12 60 12t30 50h-9q2-24-21-27-23 3-21 27z" fill="{c}"/>',
    'coque': '<circle cx="60" cy="14" r="11" fill="{c}"/><path d="M35 46Q34 22 60 22t25 24q-10-12-25-12T35 46z" fill="{c}"/>',
    'longo': '<path d="M32 74Q22 10 60 10t28 64h-8q4-38-20-42-24 4-20 42z" fill="{c}"/>',
    'franja': '<path d="M30 66Q24 12 60 12t30 54h-8q0-14-4-22-14-8-36-6-4 10-4 28z" fill="{c}"/>',
    'curto': '<path d="M35 42Q34 16 60 16t25 26q-6-12-25-12T35 42z" fill="{c}"/>',
    'calvo': '<path d="M36 54q-4-18 6-28l4 5q-6 9-4 23z" fill="{c}"/><path d="M84 54q4-18-6-28l-4 5q6 9 4 23z" fill="{c}"/>',
}

def retrato(nome, roupa, pele, cabelo, cor):
    return ('<svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Retrato de ' + nome + '">'
            '<rect width="120" height="120" fill="#dce8e0"/>'
            f'<path d="M22 120q0-48 38-48t38 48" fill="{roupa}"/>'
            f'<ellipse cx="60" cy="49" rx="25" ry="31" fill="{pele}"/>'
            + CABELOS[cabelo].replace('{c}', cor) +
            '<path d="M51 60q9 7 18 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
            '<circle cx="50" cy="47" r="2.2" fill="#2e2822"/><circle cx="70" cy="47" r="2.2" fill="#2e2822"/></svg>')

# dias: 0 = domingo … 6 = sábado. turnos: m (7h às 12h), t (12h às 18h), n (18h às 22h).
# As quatro primeiras repetem os dados da home e do portfólio (PRODUCT.md).
PROS = [
    dict(id='ana', nome='Ana Oliveira', genero='f', bairros=['Cambuí', 'Taquaral'], valor=80, minimo=2, veiculo=True, nota=4.9, avaliacoes=12,
         dias=[1,2,3,4,5], turnos='mt', tarefas=['consulta','banco','mercado','passeio'], anos=6, link='portfolio.html', r=('#2d5e4b','#c68c68','lateral','#3d332b')),
    dict(id='claudia', nome='Cláudia Ramos', genero='f', bairros=['Taquaral'], valor=70, minimo=1, veiculo=False, nota=4.8, avaliacoes=7,
         dias=[1,2,3,4,5,6], turnos='mt', tarefas=['consulta','mercado','passeio'], anos=4, r=('#f28cb1','#8d5a3b','cachos','#1f1a17')),
    dict(id='marta', nome='Marta Ferreira', genero='f', bairros=['Centro', 'Bosque'], valor=75, minimo=3, veiculo=True, nota=5.0, avaliacoes=4,
         dias=[1,2,3,4,5], turnos='m', tarefas=['consulta','banco'], anos=9, r=('#f2c94c','#e0b08f','grisalho','#b9b4ad')),
    dict(id='joana', nome='Joana Prado', genero='f', bairros=['Cambuí'], valor=70, minimo=2, veiculo=False, nota=4.7, avaliacoes=19,
         dias=[2,3,4,5,6], turnos='tn', tarefas=['consulta','mercado','passeio'], anos=3, r=('#24503f','#a86f4c','coque','#2b211b')),
    dict(id='roberto', nome='Roberto Lima', genero='m', bairros=['Barão Geraldo'], valor=80, minimo=2, veiculo=True, nota=4.9, avaliacoes=22,
         dias=[1,2,3,4,5], turnos='mt', tarefas=['consulta','banco','mercado'], anos=8, r=('#10251e','#b07a55','curto','#2a2420')),
    dict(id='luciana', nome='Luciana Alves', genero='f', bairros=['Nova Campinas', 'Cambuí'], valor=85, minimo=3, veiculo=True, nota=4.8, avaliacoes=31,
         dias=[1,2,3,4,5], turnos='mt', tarefas=['consulta','banco','mercado','passeio'], anos=11, r=('#f2c94c','#d9a27e','longo','#6b4a2f')),
    dict(id='patricia', nome='Patrícia Gomes', genero='f', bairros=['Castelo', 'Guanabara'], valor=72, minimo=2, veiculo=False, nota=4.6, avaliacoes=9,
         dias=[0,1,2,3,4,5,6], turnos='m', tarefas=['consulta','mercado'], anos=2, r=('#2d5e4b','#f0c8a8','franja','#c9973f')),
    dict(id='sonia', nome='Sônia Martins', genero='f', bairros=['Sousas'], valor=90, minimo=4, veiculo=True, nota=5.0, avaliacoes=15,
         dias=[1,2,4,5], turnos='mt', tarefas=['consulta','passeio'], anos=14, r=('#f28cb1','#c68c68','grisalho','#e4e0da')),
    dict(id='paulo', nome='Paulo Mendes', genero='m', bairros=['Centro', 'Guanabara'], valor=70, minimo=1, veiculo=True, nota=4.5, avaliacoes=6,
         dias=[1,2,3,4,5,6], turnos='tn', tarefas=['banco','mercado'], anos=5, r=('#24503f','#7a4b30','calvo','#1f1a17')),
    dict(id='renata', nome='Renata Dias', genero='f', bairros=['Taquaral', 'Barão Geraldo'], valor=78, minimo=2, veiculo=False, nota=4.9, avaliacoes=27,
         dias=[1,2,3,4,5], turnos='mtn', tarefas=['consulta','banco','mercado','passeio'], anos=7, r=('#10251e','#e0b08f','longo','#1f1a17')),
    dict(id='vera', nome='Vera Nunes', genero='f', bairros=['Bosque', 'Centro'], valor=74, minimo=2, veiculo=False, nota=4.7, avaliacoes=12,
         dias=[0,3,4,5,6], turnos='t', tarefas=['consulta','passeio'], anos=6, r=('#f2c94c','#8d5a3b','curto','#cfcac3')),
    dict(id='elaine', nome='Elaine Rocha', genero='f', bairros=['Castelo'], valor=82, minimo=2, veiculo=True, nota=4.8, avaliacoes=18,
         dias=[1,3,5,6], turnos='mn', tarefas=['consulta','mercado','passeio'], anos=10, r=('#f28cb1','#a86f4c','franja','#2b211b')),
]
# outras cidades: a plataforma atende o Brasil todo, nas cidades com profissionais cadastrados
PROS += [
    dict(id='fernanda', nome='Fernanda Lopes', genero='f', cidade='São Paulo', uf='SP', bairros=['Pinheiros', 'Vila Madalena'], valor=90, minimo=2, veiculo=False, nota=4.9, avaliacoes=34,
         dias=[1,2,3,4,5], turnos='mt', tarefas=['consulta','banco','mercado','passeio'], anos=9, r=('#f28cb1','#e0b08f','longo','#3d332b')),
    dict(id='carlos', nome='Carlos Henrique Souza', genero='m', cidade='São Paulo', uf='SP', bairros=['Moema', 'Vila Mariana'], valor=95, minimo=3, veiculo=True, nota=4.8, avaliacoes=21,
         dias=[1,2,3,4,5,6], turnos='mt', tarefas=['consulta','banco','mercado'], anos=12, r=('#10251e','#c68c68','curto','#b9b4ad')),
    dict(id='juliana', nome='Juliana Freitas', genero='f', cidade='São Paulo', uf='SP', bairros=['Tatuapé', 'Mooca'], valor=80, minimo=2, veiculo=False, nota=4.7, avaliacoes=16,
         dias=[2,3,4,5,6], turnos='tn', tarefas=['consulta','mercado','passeio'], anos=5, r=('#2d5e4b','#8d5a3b','cachos','#1f1a17')),
    dict(id='adriana', nome='Adriana Matos', genero='f', cidade='Rio de Janeiro', uf='RJ', bairros=['Copacabana', 'Botafogo'], valor=85, minimo=2, veiculo=False, nota=4.9, avaliacoes=28,
         dias=[1,2,3,4,5], turnos='mt', tarefas=['consulta','banco','mercado','passeio'], anos=8, r=('#f2c94c','#a86f4c','franja','#2b211b')),
    dict(id='marcia', nome='Márcia Pinto', genero='f', cidade='Rio de Janeiro', uf='RJ', bairros=['Tijuca'], valor=75, minimo=2, veiculo=True, nota=4.6, avaliacoes=11,
         dias=[1,2,3,4,5,6], turnos='m', tarefas=['consulta','banco'], anos=6, r=('#24503f','#d9a27e','grisalho','#cfcac3')),
    dict(id='cristina', nome='Cristina Barbosa', genero='f', cidade='Belo Horizonte', uf='MG', bairros=['Savassi', 'Funcionários'], valor=78, minimo=2, veiculo=True, nota=4.8, avaliacoes=19,
         dias=[1,2,3,4,5], turnos='mt', tarefas=['consulta','banco','mercado','passeio'], anos=10, r=('#f28cb1','#f0c8a8','coque','#6b4a2f')),
    dict(id='simone', nome='Simone Ribeiro', genero='f', cidade='Curitiba', uf='PR', bairros=['Batel', 'Água Verde'], valor=76, minimo=2, veiculo=False, nota=4.9, avaliacoes=13,
         dias=[1,2,3,4,5], turnos='mt', tarefas=['consulta','mercado','passeio'], anos=7, r=('#10251e','#f0c8a8','lateral','#c9973f')),
    dict(id='lucia', nome='Lúcia Fernandes', genero='f', cidade='Porto Alegre', uf='RS', bairros=['Moinhos de Vento', 'Petrópolis'], valor=74, minimo=2, veiculo=True, nota=4.7, avaliacoes=9,
         dias=[1,2,3,4,5], turnos='mt', tarefas=['consulta','banco'], anos=11, r=('#f2c94c','#e0b08f','curto','#e4e0da')),
    dict(id='jose', nome='José Carlos Araújo', genero='m', cidade='Recife', uf='PE', bairros=['Boa Viagem'], valor=70, minimo=2, veiculo=True, nota=4.8, avaliacoes=14,
         dias=[1,2,3,4,5,6], turnos='mt', tarefas=['consulta','banco','mercado'], anos=6, r=('#2d5e4b','#7a4b30','curto','#1f1a17')),
    dict(id='rita', nome='Rita Santana', genero='f', cidade='Salvador', uf='BA', bairros=['Barra', 'Pituba'], valor=72, minimo=2, veiculo=False, nota=4.9, avaliacoes=17,
         dias=[1,2,3,4,5,6], turnos='mt', tarefas=['consulta','mercado','passeio'], anos=9, r=('#f28cb1','#7a4b30','cachos','#1f1a17')),
    dict(id='tania', nome='Tânia Moreira', genero='f', cidade='Brasília', uf='DF', bairros=['Asa Sul', 'Asa Norte'], valor=88, minimo=3, veiculo=True, nota=5.0, avaliacoes=8,
         dias=[1,2,3,4,5], turnos='mt', tarefas=['consulta','banco'], anos=13, r=('#24503f','#c68c68','longo','#2b211b')),
]
for p in PROS:
    p.setdefault('cidade', 'Campinas'); p.setdefault('uf', 'SP')
assert len({p['id'] for p in PROS}) == len(PROS)

DIAS_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
TURNO_NOME = {'m': 'manhã', 't': 'tarde', 'n': 'noite'}

def junta(itens):
    return itens[0] if len(itens) == 1 else ', '.join(itens[:-1]) + ' e ' + itens[-1]

def dias_texto(d):
    d = sorted(d)
    if d == list(range(7)): return 'Todos os dias'
    # sequência contínua: "Seg a sex"
    if d == list(range(d[0], d[-1] + 1)) and len(d) > 2: return f'{DIAS_CURTO[d[0]].capitalize()} a {DIAS_CURTO[d[-1]]}'
    if d[0] == 0 and d[1:] == list(range(d[1], 7)) and len(d) > 2: return f'{DIAS_CURTO[d[1]].capitalize()} a dom'
    return junta([DIAS_CURTO[x] for x in d]).capitalize()

def turnos_texto(t):
    return junta(['de manhã' if x == 'm' else 'à tarde' if x == 't' else 'à noite' for x in t])

def num(v):
    return f'{v:.1f}'.replace('.', ',')

def estrela():
    return '<svg class="pc-estrela" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6L1.3 7.8l6.1-.7z" fill="#e3b53a"/></svg>'

RELOGIO = '<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M11 6v5.5l3.5 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
CARRO = '<svg viewBox="0 0 30 22" aria-hidden="true"><path d="M3 15v-4l3-6h14l4 6h3v4z" fill="currentColor"/><circle cx="9" cy="16" r="3" fill="#fff"/><circle cx="22" cy="16" r="3" fill="#fff"/></svg>'

def linha(p):
    horas = 'hora' if p['minimo'] == 1 else 'horas'
    veic = (f'<li class="lp-veiculo sim">{CARRO}Veículo incluso</li>' if p['veiculo'] else f'<li class="lp-veiculo nao">{CARRO}Sem veículo</li>')
    acao = (f'<a class="botao escuro lp-acao" href="{p["link"]}">Ver perfil<span class="vh"> de {p["nome"]}</span></a>' if p.get('link')
            else f'<a class="botao escuro lp-acao lp-breve" aria-disabled="true">Perfil em breve<span class="vh"> de {p["nome"]}</span></a>')
    return f'''      <li class="lp" data-id="{p['id']}">
        <span class="lp-retrato">{retrato(p['nome'], *p['r'])}</span>
        <div class="lp-corpo">
          <div class="lp-quem"><h3>{p['nome']}</h3><p class="lp-nota num">{estrela()}<strong>{num(p['nota'])}</strong> <span aria-hidden="true">({p['avaliacoes']})</span><span class="vh"> de 5, {p['avaliacoes']} avaliações</span></p></div>
          <p class="lp-bairro">{junta(p['bairros'])} · {p['cidade']}, {p['uf']}</p>
          <p class="lp-agenda" data-agenda><span class="lp-ponto" aria-hidden="true"></span><span data-agenda-texto>{dias_texto(p['dias'])}, {turnos_texto(p['turnos'])}</span></p>
          <ul class="lp-fatos">
            <li class="num">{RELOGIO}Mínimo de {p['minimo']} {horas}</li>
            {veic}
          </ul>
        </div>
        <div class="lp-preco">
          <p class="num"><strong>R$ {p['valor']}</strong> por hora</p>
          {acao}
        </div>
      </li>'''

dados = [{k: p[k] for k in ('id','nome','genero','cidade','uf','bairros','valor','minimo','veiculo','nota','avaliacoes','dias','turnos','tarefas')} for p in PROS]
cidades = sorted({(p['cidade'], p['uf']) for p in PROS})
opcoes_cidade = ''.join(f'<option value="{c}">{c}, {u}</option>' for c, u in cidades)
bairros = sorted({b for p in PROS for b in p['bairros']})

vmin = min(p['valor'] for p in PROS); vmax = max(p['valor'] for p in PROS)
contagem = lambda f: sum(1 for p in PROS if f(p))
# slider de valor: limites arredondados a R$ 5 a partir dos dados, um degrau por R$ 5
lim_min = vmin // 5 * 5; lim_max = -(-vmax // 5) * 5
degraus = list(range(lim_min, lim_max + 1, 5))
def barra(b):
    n = contagem(lambda p: b <= p['valor'] < b + 5 or (b == lim_max and p['valor'] == lim_max))
    return n
_qts = [barra(b) for b in degraus]
barras_valor = ''.join(f'<span class="dentro" style="--h:{n / max(_qts):.2f}" data-degrau="{b}"></span>' for b, n in zip(degraus, _qts))
assert sum(contagem(lambda p, b=b: b <= p['valor'] < b + 5 or (b == lim_max and p['valor'] == lim_max)) for b in degraus) == len(PROS)
generos = [('', 'Tanto faz', lambda p: True), ('f', 'Mulher', lambda p: p['genero'] == 'f'), ('m', 'Homem', lambda p: p['genero'] == 'm')]
turnos = [('', 'Qualquer turno', '', lambda p: True), ('m', 'Manhã', '7h às 12h', lambda p: 'm' in p['turnos']),
          ('t', 'Tarde', '12h às 18h', lambda p: 't' in p['turnos']), ('n', 'Noite', '18h às 22h', lambda p: 'n' in p['turnos'])]

def radios(nome, itens):
    out = []
    for i, (v, rot, f) in enumerate(itens):
        out.append(f'<label class="op"><input type="radio" name="{nome}" value="{v}"{" checked" if i == 0 else ""}><span>{rot}</span><span class="op-conta num" data-conta="{nome}:{v}">{contagem(f)}</span></label>')
    return '\n            '.join(out)

hora_html = lambda h: f'<span class="turno-hora">, {h}</span>' if h else ''
# turno nos filtros, sem contagem: só o nome e o horário
hora_turno = lambda h: f'<span class="op-hora">{h}</span>' if h else ''
radios_turno = '\n            '.join(
    f'<label class="op"><input type="radio" name="turno" value="{v}"{" checked" if i == 0 else ""}><span>{"Qualquer horário" if not v else rot}</span>{hora_turno(hora)}</label>'
    for i, (v, rot, hora, f) in enumerate(turnos))

opcoes_bairro = '\n              '.join(f'<option value="{b}">{b}</option>' for b in bairros)

TAREFAS = [('', 'Qualquer tarefa'), ('consulta', 'Consulta ou exame'), ('banco', 'Banco ou cartório'), ('mercado', 'Mercado e farmácia'), ('passeio', 'Passeio')]
def opcoes_tarefa():
    return ''.join(f'<option value="{v}">{t}</option>' for v, t in TAREFAS)

home = (RAIZ / 'index.html').read_text()
marca = re.search(r'<a class="marca" href="index.html">.*?</a>', home, re.S).group(0)
menu_botao = re.search(r'<button class="menu-botao".*?</button>', home, re.S).group(0)
blocos = re.search(r'<div class="blocos" aria-hidden="true">.*?</div>', home, re.S).group(0)

html = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<title>Encontrar profissional · Minha companhia</title>
<meta name="description" content="Compare profissionais verificadas para acompanhar sua mãe ou seu pai em consultas, banco, mercado e passeios, em todo o Brasil.">
<link rel="preload" href="fonts/jost-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="site.css">
<link rel="stylesheet" href="busca.css?v=3">
<script>document.documentElement.classList.add('js');setTimeout(function(){{if(!window.__fa)document.documentElement.classList.remove('js')}},2500)</script>
</head>
<body class="pagina-busca">
<a class="pular" href="#resultados">Pular para os resultados</a>

<header class="site-topo" data-topo>
  <div class="site-barra">
    {marca}
    {menu_botao}
    <nav class="site-nav" id="menu-principal" aria-label="Principal"><a href="busca.html" aria-current="page">Encontrar profissional</a><a href="pedidos.html">Meus pedidos</a><a class="botao-linha" href="profissional.html">Área profissional</a></nav>
  </div>
  <form class="busca-fixa" role="search" aria-label="Busca rápida" action="busca.html" method="get" data-busca>
    <label class="vh" for="cidade-fixa">Cidade</label><input id="cidade-fixa" name="cidade" type="search" placeholder="Sua cidade" list="cidades" autocomplete="address-level2">
    <label class="vh" for="tarefa-fixa">Tarefa</label><select id="tarefa-fixa" name="tarefa">{opcoes_tarefa()}</select>
    <label class="vh" for="data-fixa">Dia do acompanhamento</label><input id="data-fixa" name="data" type="date">
    <button class="botao" type="submit">Buscar</button>
  </form>
</header>

<form class="busca busca-home busca-topo" role="search" aria-label="Busca" action="busca.html" method="get" data-busca>
  <div><label for="cidade">Cidade</label><input id="cidade" name="cidade" type="search" placeholder="Digite a cidade" list="cidades" autocomplete="address-level2"></div>
  <div><label for="tarefa">Tarefa</label><select id="tarefa" name="tarefa">{opcoes_tarefa()}</select></div>
  <div><label for="data">Dia do acompanhamento</label><input id="data" name="data" type="date"></div>
  <button class="botao" type="submit">Buscar</button>
</form>
<datalist id="cidades">{opcoes_cidade}</datalist>

<main class="busca-tela" id="resultados">
  <div class="res-cab">
    <div>
      <h1 data-titulo>Profissionais em todo o Brasil</h1>
      <p class="res-achado num"><span data-achado aria-live="polite">{len(PROS)} profissionais verificadas.</span> <button class="trocar-dia so-js" type="button" data-trocar-dia hidden>Trocar o dia</button></p>
    </div>
    <div class="res-acoes">
      <button class="filtros-abrir so-js" type="button" aria-controls="filtros" aria-expanded="false" data-abrir-filtros><svg viewBox="0 0 22 22" aria-hidden="true"><path d="M3 6h16M6 11h10M9 16h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Filtros<span class="filtros-qtd num" data-qtd-filtros hidden></span></button>
      <div class="res-ordem">
      <label for="ordem">Ordenar por</label>
      <select id="ordem" name="ordem" form="filtros">
        <option value="relevancia">Mais relevante</option>
        <option value="menor">Menor valor</option>
        <option value="maior">Maior valor</option>
      </select>
      </div>
    </div>
  </div>

  <div class="res-corpo">
    <form class="filtros" id="filtros" aria-labelledby="t-filtros" action="busca.html" method="get" data-filtros>
      <div class="filtros-cab">
        <h2 id="t-filtros">Filtros</h2>
        <button class="filtros-fechar so-js" type="button" data-fechar-filtros><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" fill="none" stroke="currentColor" stroke-width="2.4"/></svg><span class="vh">Fechar filtros</span></button>
      </div>
      <div class="filtros-campos">
        <div class="filtro-grupo">
          <label class="filtro-titulo" for="bairro">Bairro da sua mãe</label>
          <select id="bairro" name="bairro" disabled>
              <option value="">Escolha a cidade antes</option>
          </select>
        </div>
        <fieldset class="filtro-grupo">
          <legend class="filtro-titulo">Horário</legend>
          <div class="ops">
            {radios_turno}
          </div>
        </fieldset>
        <fieldset class="filtro-grupo">
          <legend class="filtro-titulo">Valor da hora</legend>
          <p class="faixa-texto num" data-faixa-texto>De R$ {lim_min} a R$ {lim_max}</p>
          <div class="faixa-barras" aria-hidden="true" data-faixa-barras>{barras_valor}</div>
          <div class="faixa-trilho" data-faixa style="--a:0;--b:1">
            <input type="range" name="vmin" min="{lim_min}" max="{lim_max}" step="5" value="{lim_min}" aria-label="Valor mínimo da hora" aria-valuetext="R$ {lim_min}">
            <input type="range" name="vmax" min="{lim_min}" max="{lim_max}" step="5" value="{lim_max}" aria-label="Valor máximo da hora" aria-valuetext="R$ {lim_max}">
          </div>
          <div class="faixa-limites num" aria-hidden="true"><span>R$ {lim_min}</span><span>R$ {lim_max}</span></div>
          <p class="filtro-ajuda num" data-faixa-conta>{len(PROS)} profissionais nessa faixa</p>
        </fieldset>
        <fieldset class="filtro-grupo">
          <legend class="filtro-titulo">Prefere mulher ou homem?</legend>
          <div class="ops">
            {radios('genero', generos)}
          </div>
        </fieldset>
        <div class="filtro-grupo">
          <p class="filtro-titulo">Transporte</p>
          <label class="op op-caixa"><input type="checkbox" name="veiculo" value="sim"><span>Com veículo incluso</span><span class="op-conta num" data-conta="veiculo:sim">{contagem(lambda p: p['veiculo'])}</span></label>
          <p class="filtro-ajuda">A profissional busca em casa e leva de carro, sem custo à parte.</p>
        </div>
      </div>
      <div class="filtros-pe">
        <button class="filtros-limpar" type="reset" data-limpar>Limpar filtros</button>
        <button class="botao escuro filtros-ver so-js" type="button" data-fechar-filtros data-ver>Ver {len(PROS)} profissionais</button>
        <noscript><button class="botao escuro" type="submit">Aplicar filtros</button></noscript>
      </div>
    </form>

    <section class="res-lista" aria-labelledby="t-lista">
      <h2 class="vh" id="t-lista">Resultados</h2>
      <ul class="lps" data-lista>
{chr(10).join(linha(p) for p in PROS)}
      </ul>
      <div class="res-vazio" data-vazio hidden>
        <p data-vazio-texto>Nenhuma profissional com esses filtros.</p>
        <button class="botao-linha" type="button" data-limpar-tudo>Limpar filtros</button>
      </div>
      <p class="res-nota" data-nota-ordem>Em “Mais relevante”, aparecem primeiro as notas mais altas com mais avaliações.</p>
    </section>
  </div>
</main>

<script type="application/json" id="dados-profissionais">{json.dumps(dados, ensure_ascii=False)}</script>

<footer class="rodape">
  {blocos}
  <p class="vh">Minha companhia</p>
  <div class="rodape-colunas">
    <div><h2>Famílias</h2><ul><li><a href="busca.html">Encontrar profissional</a></li><li><a href="index.html#como-contratar">Como contratar</a></li><li><a href="index.html#confianca">Por que confiar</a></li><li><a href="pedidos.html">Meus pedidos</a></li></ul></div>
    <div><h2>Profissionais</h2><ul><li><a href="profissional.html">Área profissional</a></li><li><a href="entrar.html?perfil=pro&amp;modo=criar">Quero me cadastrar</a></li></ul></div>
    <div class="contato"><h2>Onde atendemos</h2><p>Em todo o Brasil, nas cidades com profissionais cadastradas.</p></div>
  </div>
  <div class="rodape-fim"><span>Minha companhia · 2026</span></div>
</footer>
<script src="site.js" defer></script>
</body>
</html>
'''
(RAIZ / 'busca.html').write_text(html)
print('ok', len(html))
