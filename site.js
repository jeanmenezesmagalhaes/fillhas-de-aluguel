// dias até a próxima revisão de documentos, contados a partir de hoje
function textoFaltam(el) {
  const [a, m, d] = el.dataset.faltam.split('-').map(Number);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(a, m - 1, d) - hoje) / 86400000);
  if (dias > 1) el.textContent = `Faltam ${dias} dias. A data aparece no perfil de cada profissional.`;
  else if (dias === 1) el.textContent = 'Falta 1 dia. A data aparece no perfil de cada profissional.';
  else if (dias === 0) el.textContent = 'A revisão é hoje. A data aparece no perfil de cada profissional.';
}

// Movimento e a contagem da revisão. A página funciona inteira sem este arquivo.
(() => {
  window.__fa = true;
  // chegada de cada seção, uma vez
  const chega = document.querySelectorAll('[data-chega]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) { e.target.classList.add('chegou'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    chega.forEach((el) => io.observe(el));
  } else {
    chega.forEach((el) => el.classList.add('chegou'));
  }

  document.querySelectorAll('[data-faltam]').forEach(textoFaltam);

})();

// peças comuns: há API? (servidor só de páginas responde 404) e qual profissional o portfólio mostra
window.mcSite = (() => {
  let pedido = null;
  const temApi = () => pedido || (pedido = /^https?:$/.test(location.protocol)
    ? fetch('/api/sessao', { credentials: 'same-origin' }).then((r) => r.ok && (r.headers.get('content-type') || '').includes('json')).catch(() => false)
    : Promise.resolve(false));
  // portfolio.html?p=<slug>; sem parâmetro, o exemplo da Ana
  const slug = new URLSearchParams(location.search).get('p') || 'ana-oliveira';
  document.querySelectorAll('[data-slug]').forEach((el) => { el.dataset.slug = slug; });
  return { temApi, slug };
})();

// orçamento: horas estimadas × valor da hora, respeitando o mínimo e o desconto de cada profissional.
// Seletor de horas sem teto, no portfólio.
(() => {
  const raiz = document.querySelector('[data-orcamento]');
  const fonte = document.getElementById('profissionais');
  if (!raiz || !fonte) return;
  const pros = JSON.parse(fonte.textContent);
  const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
  const brl2 = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const valorHora = (p, h) => (p.desconto && h >= p.desconto.aPartir ? p.desconto.valor : p.valor);
  const total = (p, h) => h * valorHora(p, h);
  const horas = (h) => `${h} ${h === 1 ? 'hora' : 'horas'}`;
  const $ = (s) => raiz.querySelector(s);
  // o mínimo vem da tarefa escolhida, quando a profissional define um por tarefa
  const atual = () => {
    const p = pros[(raiz.querySelector('input[name="quem"]:checked') || {}).value || raiz.dataset.orcamento];
    const chave = (raiz.querySelector('input[name="tarefa"]:checked') || {}).value;
    const t = p.tarefas && chave ? p.tarefas[chave] : null;
    return t ? { ...p, minimo: t.minimo, tarefa: chave, tarefaNome: t.nome, aCombinar: !!t.aCombinar } : p;
  };
  const campo = $('#horas-qtd');

  // lê a quantidade escolhida; no seletor, corrige para o mínimo e avisa
  const escolhidas = (p, corrigir) => {
    if (campo) {
      const n = Math.floor(Number(campo.value));
      const ajuda = $('[data-ajuda]');
      const padrao = `Mínimo de ${horas(p.minimo)}, sem limite máximo. Digite o número ou use os botões.`;
      if (!campo.value || !Number.isFinite(n) || n < 1) {
        campo.setAttribute('aria-invalid', 'true');
        ajuda.textContent = 'Informe quantas horas a tarefa deve levar, em números inteiros.';
        ajuda.classList.add('alerta');
        return null;
      }
      if (n < p.minimo) {
        if (corrigir) { campo.value = p.minimo; ajuda.textContent = `${p.nome} atende a partir de ${horas(p.minimo)}. Ajustamos para ${p.minimo}.`; ajuda.classList.add('alerta'); campo.removeAttribute('aria-invalid'); return p.minimo; }
        campo.setAttribute('aria-invalid', 'true');
        ajuda.textContent = `${p.nome} atende a partir de ${horas(p.minimo)}.`;
        ajuda.classList.add('alerta');
        return null;
      }
      campo.removeAttribute('aria-invalid');
      ajuda.classList.remove('alerta');
      ajuda.textContent = n > 10 ? `${horas(n)}. Se a tarefa ocupar mais de um dia, combine as datas no pedido.` : padrao;
      return n;
    }
    return null;
  };

  // atalhos de horas e o botão de menos, que não deixa passar do mínimo
  const blocos = (p, h) => {
    raiz.querySelectorAll('.atalhos button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.h) === h)));
    raiz.querySelectorAll('.passo-btn[data-passo="-1"]').forEach((b) => { b.disabled = h <= p.minimo; });
  };

  const desenha = (corrigir) => {
    const p = atual();
    const h = escolhidas(p, corrigir);
    if (h == null) return;
    const vh = valorHora(p, h);
    const t = total(p, h);
    const totalEl = $('[data-total]');
    totalEl.textContent = brl2(t);
    totalEl.classList.add('muda');
    requestAnimationFrame(() => requestAnimationFrame(() => totalEl.classList.remove('muda')));
    $('[data-conta]').textContent = `${horas(h)} × ${brl2(vh)} por hora`;
    $('[data-minimo]').textContent = p.aCombinar ? `Para outras tarefas, ${p.nome} confirma o tempo e o valor quando aceitar o pedido.` : p.tarefaNome ? `Para ${p.tarefaNome.toLowerCase()}, ${p.nome} atende a partir de ${horas(p.minimo)}.` : `${p.nome} atende a partir de ${horas(p.minimo)}.`;
    const d = $('[data-desconto]');
    if (!p.desconto) d.textContent = `${p.nome} cobra o mesmo valor por hora, seja qual for a duração.`;
    else if (h >= p.desconto.aPartir) d.textContent = `A partir de ${horas(p.desconto.aPartir)}, a hora de ${p.nome} cai para ${brl2(p.desconto.valor)}. Você economiza ${brl2(h * p.valor - t)}.`;
    else d.textContent = `A partir de ${horas(p.desconto.aPartir)}, a hora de ${p.nome} cai para ${brl2(p.desconto.valor)}.`;
    $('[data-veiculo]').textContent = p.veiculo ? `Veículo incluso: ${p.nome} busca em casa, leva e traz de volta.` : 'Sem veículo: combine táxi ou aplicativo para a ida e a volta.';
    raiz.querySelector('[data-veiculo-icone]').dataset.tem = p.veiculo ? 'sim' : 'nao';
    const acao = $('[data-acao]');
    if (p.link) { acao.href = `${p.link}?horas=${h}${p.tarefa ? `&tarefa=${encodeURIComponent(p.tarefa)}` : ''}${p.slug ? `&p=${encodeURIComponent(p.slug)}` : ''}`; acao.textContent = `Pedir ${horas(h)} com ${p.nome}`; acao.removeAttribute('aria-disabled'); acao.classList.remove('inativo'); }
    else { acao.removeAttribute('href'); acao.textContent = `Perfil de ${p.nome} em breve`; acao.setAttribute('aria-disabled', 'true'); acao.classList.add('inativo'); }
    blocos(p, h);
  };

  raiz.addEventListener('change', (ev) => {
    if (ev.target.name === 'tarefa') { const outra = raiz.querySelector('[data-tarefa-outra]'); if (outra) outra.hidden = ev.target.value !== 'outra'; }
    desenha(true);
  });
  // com a API, valor, desconto e veículo vêm do perfil público (evento disparado abaixo)
  raiz.addEventListener('mc:perfil', (ev) => { Object.assign(pros[raiz.dataset.orcamento], ev.detail); desenha(false); });
  // com a API, as tarefas e os mínimos vêm do perfil público (evento disparado abaixo)
  raiz.addEventListener('mc:tarefas', (ev) => {
    const p = pros[raiz.dataset.orcamento];
    p.tarefas = ev.detail;
    const ops = raiz.querySelector('[data-tarefa-ops]');
    if (!ops) return;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    ops.innerHTML = Object.entries(ev.detail).map(([chave, t], i) => `<label><input type="radio" name="tarefa" value="${esc(chave)}"${i ? '' : ' checked'}><span>${esc(t.nome)}</span></label>`).join('');
    const outra = raiz.querySelector('[data-tarefa-outra]');
    if (outra) outra.hidden = true;
    desenha(true);
  });
  if (campo) {
    campo.addEventListener('input', () => desenha(false));
    raiz.querySelectorAll('.passo-btn').forEach((b) => b.addEventListener('click', () => {
      const p = atual();
      const n = Math.max(p.minimo, (Math.floor(Number(campo.value)) || p.minimo) + Number(b.dataset.passo));
      campo.value = n; desenha(true);
    }));
    raiz.querySelectorAll('.atalhos button').forEach((b) => b.addEventListener('click', () => { campo.value = b.dataset.h; desenha(true); }));
  }
  desenha(true);
})();

// home: filtro por tarefa na lista de profissionais
(() => {
  const lista = document.querySelector('.lista');
  if (!lista) return;
  const nomes = { todas: 'todas as tarefas', consulta: 'consulta ou exame', banco: 'banco ou cartório', mercado: 'mercado e farmácia', passeio: 'passeio' };
  const botoes = lista.querySelectorAll('.ft');
  const conta = lista.querySelector('[data-conta-lista]');
  const vazia = lista.querySelector('[data-vazia]');
  // as contagens de cada botão seguem os cartões que estão na página
  const recontar = () => botoes.forEach((b) => {
    const t = b.dataset.t;
    const n = [...lista.querySelectorAll('.pc')].filter((c) => t === 'todas' || c.dataset.tarefas.split(' ').includes(t)).length;
    const el = b.querySelector('.ft-conta'); if (el) el.textContent = n;
  });
  // com a API, cada destaque mostra os dados do perfil no ar (valor, nota, bairros, mínimo, veículo, tarefas)
  // e leva ao portfólio dela; quem não está no ar sai da lista
  mcSite.temApi().then(async (api) => {
    if (!api) return;
    let pros = [];
    try { const r = await fetch('/api/profissionais?porPagina=50', { credentials: 'same-origin' }); if (!r.ok) return; pros = (await r.json()).profissionais; } catch (_) { return; }
    const juntaE = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} e ${a[a.length - 1]}`);
    lista.querySelectorAll('.pc').forEach((c) => {
      const p = pros.find((x) => x.nome === c.querySelector('h3').textContent);
      if (!p) { c.remove(); return; }
      const nota = c.querySelector('.pc-nota');
      if (nota) {
        if (p.nota && p.nota.total) { nota.querySelector('strong').textContent = p.nota.media.toFixed(1).replace('.', ','); nota.querySelector('span[aria-hidden]').textContent = `(${p.nota.total})`; nota.querySelector('.vh').textContent = ` de 5, ${p.nota.total} ${p.nota.total === 1 ? 'avaliação' : 'avaliações'}`; }
        else nota.innerHTML = 'Nova na plataforma';
      }
      c.querySelector('.pc-preco strong').textContent = `R$ ${(p.valorHoraCentavos / 100).toLocaleString('pt-BR')}`;
      c.querySelector('.pc-bairro').textContent = `${juntaE(p.bairros || [])} · ${p.cidade}, ${p.uf}`;
      const fatos = c.querySelectorAll('.pc-fatos li');
      if (fatos[0]) fatos[0].lastChild.textContent = `Mínimo de ${p.horasMinimas} ${p.horasMinimas === 1 ? 'hora' : 'horas'}`;
      if (fatos[1]) { fatos[1].className = `pc-veiculo ${p.veiculoIncluso ? 'sim' : 'nao'}`; fatos[1].lastChild.textContent = p.veiculoIncluso ? 'Veículo incluso' : 'Sem veículo'; }
      c.dataset.tarefas = (p.tarefas || []).map((t) => t.tipo).join(' ');
      const acao = c.querySelector('.pc-acao');
      const link = document.createElement('a');
      link.className = 'botao escuro pc-acao'; link.href = `portfolio.html?p=${encodeURIComponent(p.slug)}`;
      link.textContent = acao.tagName === 'A' ? acao.textContent : 'Ver perfil';
      acao.replaceWith(link);
    });
    recontar();
    const ativo = lista.querySelector('.ft[aria-pressed="true"]'); if (ativo) ativo.click();
  });
  botoes.forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.t;
    botoes.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    let n = 0;
    lista.querySelectorAll('.pc').forEach((c) => { const ok = t === 'todas' || c.dataset.tarefas.split(' ').includes(t); c.hidden = !ok; if (ok) n++; });
    conta.textContent = `${n} ${n === 1 ? 'profissional verificada' : 'profissionais verificadas'} para ${nomes[t]}`;
    vazia.hidden = n > 0;
  }));
})();

// topo: some ao rolar para baixo, volta ao rolar para cima; a busca rápida aparece quando a busca grande sai da tela
(() => {
  const topo = document.querySelector('[data-topo]');
  if (!topo) return;
  const botao = topo.querySelector('.menu-botao');
  const fecha = () => { topo.classList.remove('menu-aberto'); botao.setAttribute('aria-expanded', 'false'); };
  botao.addEventListener('click', () => {
    const aberto = topo.classList.toggle('menu-aberto');
    botao.setAttribute('aria-expanded', String(aberto));
    if (aberto) topo.classList.remove('escondido');
  });
  topo.querySelectorAll('.site-nav a').forEach((a) => a.addEventListener('click', fecha));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });

  const grande = document.querySelector('.busca-home');
  if (grande && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => topo.classList.toggle('com-busca', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(grande);
  }

  let ultimo = window.scrollY;
  let pendente = false;
  const olha = () => {
    pendente = false;
    const y = window.scrollY;
    const delta = y - ultimo;
    if (Math.abs(delta) < 6) return;
    if (topo.classList.contains('menu-aberto')) { ultimo = y; return; }
    topo.classList.toggle('escondido', delta > 0 && y > topo.offsetHeight + 40);
    ultimo = y;
  };
  window.addEventListener('scroll', () => { if (!pendente) { pendente = true; requestAnimationFrame(olha); } }, { passive: true });
  topo.addEventListener('focusin', () => topo.classList.remove('escondido'));
})();

// listagem de profissionais: a busca do topo (cidade, tarefa, data) define quem pode ir;
// os filtros ao lado refinam, sem repetir esses três campos. Tudo volta para a URL.
(() => {
  const filtros = document.querySelector('[data-filtros]');
  const fonte = document.getElementById('dados-profissionais');
  if (!filtros || !fonte) return;
  const lista = document.querySelector('[data-lista]');
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // com a API, a lista vem de GET /api/profissionais (todas as páginas) e os filtros seguem na tela;
  // os retratos desenhados da página continuam valendo para quem tem o mesmo nome
  const CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const juntaE = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} e ${a[a.length - 1]}`);
  const diasTexto = (d) => {
    if (d.length === 7) return 'Todos os dias';
    if (d.length > 2 && d.every((x, i) => !i || x === d[i - 1] + 1)) return `${CURTO[d[0]][0].toUpperCase()}${CURTO[d[0]].slice(1)} a ${CURTO[d[d.length - 1]]}`;
    const t = juntaE(d.map((x) => CURTO[x])); return t[0].toUpperCase() + t.slice(1);
  };
  const turnosTexto = (t) => juntaE([...t].map((x) => ({ m: 'de manhã', t: 'à tarde', n: 'à noite' })[x]));
  const daApi = (p) => {
    const dias = p.disponibilidade && p.disponibilidade.length ? [...new Set(p.disponibilidade.map((f) => f.dia))].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6];
    const turnos = p.turnos ? ['m', 't', 'n'].filter((t) => Object.values(p.turnos).some((l) => l.includes(t))).join('') : 'mtn';
    return {
      id: p.slug, nome: p.nome, genero: null, cidade: p.cidade, uf: p.uf, bairros: p.bairros || [], valor: p.valorHoraCentavos / 100,
      minimo: p.horasMinimas || 1, veiculo: !!p.veiculoIncluso, nota: p.nota && p.nota.total ? p.nota.media : 0, avaliacoes: p.nota ? p.nota.total : 0,
      dias, turnos: turnos || 'mtn', tarefas: [...(p.tarefas || []).map((t) => t.tipo), ...(p.aceitaOutras ? ['outra'] : [])], fotoUrl: p.fotoUrl,
    };
  };
  const montaLinhas = (pros) => {
    const retratos = new Map([...lista.querySelectorAll('.lp')].map((li) => [li.querySelector('h3').textContent, li.querySelector('.lp-retrato').innerHTML]));
    const relogio = (lista.querySelector('.lp-fatos li svg') || {}).outerHTML || '';
    const carro = (lista.querySelector('.lp-veiculo svg') || {}).outerHTML || '';
    const estrela = (lista.querySelector('.pc-estrela') || {}).outerHTML || '';
    lista.innerHTML = pros.map((p) => `<li class="lp" data-id="${esc(p.id)}">
        <span class="lp-retrato">${p.fotoUrl ? `<img src="${esc(p.fotoUrl)}" alt="" loading="lazy">` : retratos.get(p.nome) || `<span class="lp-iniciais" aria-hidden="true">${esc(p.nome.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase())}</span>`}</span>
        <div class="lp-corpo">
          <div class="lp-quem"><h3>${esc(p.nome)}</h3>${p.avaliacoes ? `<p class="lp-nota num">${estrela}<strong>${p.nota.toFixed(1).replace('.', ',')}</strong> <span aria-hidden="true">(${p.avaliacoes})</span><span class="vh"> de 5, ${p.avaliacoes} avaliações</span></p>` : '<p class="lp-nota lp-nova">Nova na plataforma</p>'}</div>
          <p class="lp-bairro">${esc(juntaE(p.bairros))} · ${esc(p.cidade)}, ${esc(p.uf)}</p>
          <p class="lp-agenda" data-agenda><span class="lp-ponto" aria-hidden="true"></span><span data-agenda-texto>${diasTexto(p.dias)}, ${turnosTexto(p.turnos)}</span></p>
          <ul class="lp-fatos">
            <li class="num">${relogio}Mínimo de ${p.minimo} ${p.minimo === 1 ? 'hora' : 'horas'}</li>
            <li class="lp-veiculo ${p.veiculo ? 'sim' : 'nao'}">${carro}${p.veiculo ? 'Veículo incluso' : 'Sem veículo'}</li>
          </ul>
        </div>
        <div class="lp-preco">
          <p class="num"><strong>R$ ${String(p.valor).replace('.', ',')}</strong> por hora</p>
          <a class="botao escuro lp-acao" href="portfolio.html?p=${encodeURIComponent(p.id)}">Ver perfil<span class="vh"> de ${esc(p.nome)}</span></a>
        </div>
      </li>`).join('');
  };
  const carregaApi = async () => {
    const todas = [];
    for (let pagina = 1; pagina <= 20; pagina++) {
      const r = await fetch(`/api/profissionais?porPagina=50&pagina=${pagina}`, { credentials: 'same-origin' });
      if (!r.ok) throw new Error('lista');
      const d = await r.json();
      todas.push(...d.profissionais);
      if (todas.length >= d.total || !d.profissionais.length) break;
    }
    return todas.map(daApi);
  };
  mcSite.temApi().then(async (api) => {
    if (!api) { inicia(JSON.parse(fonte.textContent)); return; }
    let pros;
    try { pros = await carregaApi(); } catch (_) { inicia(JSON.parse(fonte.textContent)); return; }
    montaLinhas(pros);
    // a API não guarda gênero: o filtro sai
    const gen = filtros.querySelector('input[name="genero"]');
    if (gen) gen.closest('fieldset').hidden = true;
    inicia(pros);
  });

  function inicia(pros) {
  const linhas = new Map([...lista.querySelectorAll('.lp')].map((li) => [li.dataset.id, li]));
  const textoAgenda = new Map([...linhas].map(([id, li]) => [id, li.querySelector('[data-agenda-texto]').textContent]));
  const buscas = document.querySelectorAll('[data-busca]');
  const params = new URLSearchParams(location.search);
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const TAREFAS = { consulta: 'consulta ou exame', banco: 'banco ou cartório', mercado: 'mercado e farmácia', passeio: 'passeio' };
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const TURNOS = { m: 'de manhã', t: 'à tarde', n: 'à noite' };
  const junta = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} e ${a[a.length - 1]}`);
  // nota ponderada pelo número de avaliações: 5,0 em 4 avaliações não passa à frente de 4,9 em 22
  const relevancia = (p) => (p.avaliacoes * p.nota + 5 * 4.6) / (p.avaliacoes + 5);

  // campos da busca: preenchidos pela URL; a data começa em hoje
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  buscas.forEach((f) => {
    if (params.has('cidade')) f.cidade.value = params.get('cidade');
    f.tarefa.value = TAREFAS[params.get('tarefa')] ? params.get('tarefa') : '';
    f.data.min = iso(hoje);
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('data') || '')) f.data.value = params.get('data');
  });
  const busca = buscas[buscas.length - 1];
  // o dia vem do campo da busca no topo; "Trocar o dia" leva até ele
  const trocar = document.querySelector('[data-trocar-dia]');
  const abreData = () => { busca.data.focus({ preventScroll: true }); busca.scrollIntoView({ block: 'start', behavior: 'smooth' }); try { busca.data.showPicker(); } catch (_) { /* navegador sem seletor nativo */ } };
  const c = filtros.elements;
  // os bairros dependem da cidade; o pedido da URL espera as opções existirem
  let bairroPedido = params.get('bairro') || null;
  // slider de valor: dois controles sobre o mesmo trilho, sempre com mínimo ≤ máximo
  const faixa = filtros.querySelector('[data-faixa]');
  const LIM = [Number(c.vmin.min), Number(c.vmin.max)];
  const prende = (v) => Math.min(LIM[1], Math.max(LIM[0], Math.round(Number(v) / 5) * 5));
  if (params.has('vmin')) c.vmin.value = prende(params.get('vmin'));
  if (params.has('vmax')) c.vmax.value = prende(params.get('vmax'));
  if (Number(c.vmin.value) > Number(c.vmax.value)) [c.vmin.value, c.vmax.value] = [c.vmax.value, c.vmin.value];
  ['genero', 'turno'].forEach((n) => { const v = params.get(n) || ''; const r = [...c[n]].find((i) => i.value === v); if (r) r.checked = true; });
  c.veiculo.checked = params.get('veiculo') === 'sim';
  if (['menor', 'maior'].includes(params.get('ordem'))) c.ordem.value = params.get('ordem');

  const estado = () => ({
    cidade: busca.cidade.value.trim(), tarefa: busca.tarefa.value, data: busca.data.value,
    bairro: c.bairro.value, vmin: Number(c.vmin.value), vmax: Number(c.vmax.value), genero: c.genero.value, turno: c.turno.value,
    veiculo: c.veiculo.checked, ordem: c.ordem.value,
  });
  const passa = (p, e, ignora) =>
    (ignora === 'bairro' || !e.bairro || p.bairros.includes(e.bairro))
    && (ignora === 'preco' || (p.valor >= e.vmin && p.valor <= e.vmax))
    && (ignora === 'genero' || !e.genero || p.genero === e.genero)
    && (ignora === 'turno' || !e.turno || p.turnos.includes(e.turno))
    && (ignora === 'veiculo' || !e.veiculo || p.veiculo);

  const titulo = document.querySelector('[data-titulo]');
  const achado = document.querySelector('[data-achado]');
  const vazio = document.querySelector('[data-vazio]');
  const vazioTexto = document.querySelector('[data-vazio-texto]');
  const vazioBotao = vazio.querySelector('button');
  const notaOrdem = document.querySelector('[data-nota-ordem]');
  const qtd = document.querySelector('[data-qtd-filtros]');
  const ver = filtros.querySelector('[data-ver]');
  const conta = (sel, n) => { const el = document.querySelector(`[data-conta="${sel}"]`); if (el) { el.textContent = sel.startsWith('turno') ? plural(n, 'profissional', 'profissionais') : n; el.closest('label').classList.toggle('vazia', n === 0); } };

  const desenha = () => {
    const e = estado();
    const dia = e.data ? new Date(`${e.data}T12:00:00`) : null;
    const quando = dia ? `${dia.getDay() === 0 || dia.getDay() === 6 ? 'no' : 'na'} ${DIAS[dia.getDay()]}, ${e.data.slice(8)}/${e.data.slice(5, 7)}` : '';
    // "Campinas, SP" e "campinas" valem a mesma cidade
    const naCidade = pros.filter((p) => !e.cidade || norm(p.cidade) === norm(e.cidade.split(',')[0]));
    const base = naCidade.filter((p) => (!e.tarefa || p.tarefas.includes(e.tarefa)) && (!dia || p.dias.includes(dia.getDay())));
    const cidadeAtual = e.cidade && naCidade.length ? naCidade[0].cidade : '';
    if (c.bairro.dataset.cidade !== cidadeAtual) {
      const quer = bairroPedido || c.bairro.value; bairroPedido = null;
      const bs = [...new Set(naCidade.flatMap((p) => p.bairros))].sort((a, b) => a.localeCompare(b, 'pt'));
      c.bairro.replaceChildren(new Option(cidadeAtual ? 'Todos os bairros' : 'Escolha a cidade antes', ''), ...(cidadeAtual ? bs.map((b) => new Option(b, b)) : []));
      c.bairro.disabled = !cidadeAtual;
      c.bairro.value = cidadeAtual && bs.includes(quer) ? quer : '';
      c.bairro.dataset.cidade = cidadeAtual;
      e.bairro = c.bairro.value;
    }
    const ver_ = base.filter((p) => passa(p, e));

    // contagens: cada filtro conta o que sobraria se só ele mudasse
    const fr = (v) => (v - LIM[0]) / (LIM[1] - LIM[0]);
    faixa.style.setProperty('--a', fr(e.vmin)); faixa.style.setProperty('--b', fr(e.vmax));
    c.vmin.style.zIndex = fr(e.vmin) > 0.5 ? 2 : ''; // com os dois no topo, o mínimo fica por cima para poder voltar
    c.vmin.setAttribute('aria-valuetext', `R$ ${e.vmin}`); c.vmax.setAttribute('aria-valuetext', `R$ ${e.vmax}`);
    filtros.querySelector('[data-faixa-texto]').textContent = e.vmin === e.vmax ? `R$ ${e.vmin}` : `De R$ ${e.vmin} a R$ ${e.vmax}`;
    const naFaixa = base.filter((p) => passa(p, e)).length;
    filtros.querySelector('[data-faixa-conta]').textContent = `${plural(naFaixa, 'profissional', 'profissionais')} nessa faixa`;
    const outras = base.filter((p) => passa(p, e, 'preco'));
    const degraus = [...filtros.querySelectorAll('[data-degrau]')];
    const qts = degraus.map((b) => { const d = Number(b.dataset.degrau); return outras.filter((p) => (p.valor >= d && p.valor < d + 5) || (d === LIM[1] && p.valor === d)).length; });
    const maior = Math.max(1, ...qts);
    degraus.forEach((b, i) => {
      const d = Number(b.dataset.degrau);
      b.style.setProperty('--h', qts[i] / maior);
      b.classList.toggle('dentro', d >= e.vmin && d <= e.vmax);
    });
    ['', 'f', 'm'].forEach((g) => conta(`genero:${g}`, base.filter((p) => passa(p, e, 'genero') && (!g || p.genero === g)).length));
    conta('veiculo:sim', base.filter((p) => passa(p, e, 'veiculo') && p.veiculo).length);
    if (cidadeAtual) [...c.bairro.options].forEach((o) => {
      const n = base.filter((p) => passa(p, e, 'bairro') && (!o.value || p.bairros.includes(o.value))).length;
      o.textContent = `${o.value || 'Todos os bairros'} (${n})`;
    });

    const ordem = { relevancia: (a, b) => relevancia(b) - relevancia(a), menor: (a, b) => a.valor - b.valor || relevancia(b) - relevancia(a), maior: (a, b) => b.valor - a.valor || relevancia(b) - relevancia(a) }[e.ordem];
    ver_.sort(ordem);
    const mostra = new Set(ver_.map((p) => p.id));
    pros.forEach((p) => {
      const li = linhas.get(p.id);
      li.hidden = !mostra.has(p.id);
      li.querySelector('[data-agenda-texto]').textContent = dia ? `Livre ${quando}, ${junta([...p.turnos].map((t) => TURNOS[t]))}` : textoAgenda.get(p.id);
    });
    ver_.forEach((p) => lista.append(linhas.get(p.id)));

    titulo.textContent = !e.cidade ? 'Profissionais em todo o Brasil' : `Profissionais em ${cidadeAtual || e.cidade}`;
    const n = ver_.length;
    // uma frase curta: quantas e, se houver, o dia e a tarefa
    achado.textContent = n
      ? `${dia ? `${plural(n, 'profissional livre', 'profissionais livres')} ${quando}` : plural(n, 'profissional verificada', 'profissionais verificadas')}${e.tarefa ? `${dia ? ',' : ''} para ${TAREFAS[e.tarefa]}` : ''}.`
      : 'Nenhuma profissional encontrada.';
    trocar.hidden = !dia;
    vazio.hidden = n > 0;
    if (!naCidade.length) { vazioTexto.textContent = `Ainda não há profissionais cadastradas em ${e.cidade}. Estamos chegando a novas cidades: veja onde já atendemos.`; vazioBotao.textContent = 'Ver todas as cidades'; vazioBotao.dataset.acao = 'cidades'; }
    else if (!base.length) { vazioTexto.textContent = `Ninguém livre ${quando || 'nessa data'}${e.tarefa ? ` para ${TAREFAS[e.tarefa]}` : ''}. Tente outro dia.`; vazioBotao.textContent = 'Ver qualquer data'; vazioBotao.dataset.acao = 'data'; }
    else { vazioTexto.textContent = 'Nenhuma profissional com esses filtros. Tire um deles para ver mais opções.'; vazioBotao.textContent = 'Limpar filtros'; vazioBotao.dataset.acao = 'limpar'; }
    notaOrdem.hidden = e.ordem !== 'relevancia' || n < 2;

    const ativos = [e.bairro, e.vmin > LIM[0] || e.vmax < LIM[1], e.genero, e.turno, e.veiculo].filter(Boolean).length;
    qtd.hidden = !ativos; qtd.textContent = ativos;
    if (ver) ver.textContent = n ? `Ver ${plural(n, 'profissional', 'profissionais')}` : 'Nenhuma profissional';

    const url = new URLSearchParams();
    Object.entries(e).forEach(([k, v]) => { if (v && !(k === 'ordem' && v === 'relevancia') && !(k === 'vmin' && v === LIM[0]) && !(k === 'vmax' && v === LIM[1])) url.set(k, v === true ? 'sim' : v); });
    history.replaceState(null, '', `${location.pathname}${url.toString() ? `?${url}` : ''}`);
  };

  filtros.addEventListener('change', desenha);
  trocar.addEventListener('click', abreData);
  buscas.forEach((f) => f.data.addEventListener('change', () => { buscas.forEach((o) => { o.data.value = f.data.value; }); desenha(); }));
  // ao arrastar, um controle empurra o outro em vez de cruzar
  [c.vmin, c.vmax].forEach((r) => r.addEventListener('input', () => {
    if (Number(c.vmin.value) > Number(c.vmax.value)) (r === c.vmin ? c.vmax : c.vmin).value = r.value;
    desenha();
  }));
  filtros.addEventListener('reset', () => setTimeout(desenha));
  vazioBotao.addEventListener('click', () => {
    const acao = vazioBotao.dataset.acao;
    if (acao === 'cidades') buscas.forEach((f) => { f.cidade.value = ''; });
    if (acao === 'data') buscas.forEach((f) => { f.data.value = ''; });
    if (acao === 'limpar') filtros.reset(); else desenha();
  });
  // a busca do topo refaz a lista sem recarregar e mantém os filtros
  buscas.forEach((f) => f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    buscas.forEach((o) => { if (o !== f) { o.cidade.value = f.cidade.value; o.tarefa.value = f.tarefa.value; o.data.value = f.data.value; } });
    if (f !== busca) { busca.cidade.value = f.cidade.value; busca.tarefa.value = f.tarefa.value; busca.data.value = f.data.value; }
    desenha();
    document.getElementById('resultados').scrollIntoView({ block: 'start' });
  }));

  // folha de filtros no celular e no tablet
  const abrir = document.querySelector('[data-abrir-filtros]');
  const fecha = () => { document.body.classList.remove('filtros-aberto'); abrir.setAttribute('aria-expanded', 'false'); };
  abrir.addEventListener('click', () => {
    document.body.classList.add('filtros-aberto'); abrir.setAttribute('aria-expanded', 'true');
    filtros.querySelector('.filtros-fechar').focus();
  });
  filtros.querySelectorAll('[data-fechar-filtros]').forEach((b) => b.addEventListener('click', () => { fecha(); abrir.focus(); }));
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && document.body.classList.contains('filtros-aberto')) { fecha(); abrir.focus(); } });

  desenha();
  }
})();

// área profissional: quanto rende o valor da hora em 4 semanas
(() => {
  const calc = document.querySelector('[data-calc]');
  if (!calc) return;
  const hora = calc.querySelector('#calc-hora');
  const semana = calc.querySelector('#calc-semana');
  const brl = (v) => `R$ ${v.toLocaleString('pt-BR')}`;
  const horas = (h) => `${h} ${h === 1 ? 'hora' : 'horas'}`;
  const desenha = () => {
    const v = Number(hora.value); const h = Number(semana.value); const mes = h * 4;
    calc.querySelector('[data-calc-hora]').textContent = brl(v);
    calc.querySelector('[data-calc-semana]').textContent = horas(h);
    hora.setAttribute('aria-valuetext', `${brl(v)} por hora`);
    semana.setAttribute('aria-valuetext', `${horas(h)} por semana`);
    calc.querySelector('[data-calc-total]').textContent = brl(mes * v);
    calc.querySelector('[data-calc-nota]').textContent = `${horas(mes)} × ${brl(v)}, antes da taxa da plataforma.`;
  };
  calc.addEventListener('input', desenha);
  desenha();
})();

// portfólio: com a API, os cursos validados e as tarefas vêm do perfil público; sem ela, fica o que está na página
(() => {
  const sec = document.querySelector('[data-cursos-validados]');
  if (!sec || !/^https?:$/.test(location.protocol)) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const dd = (iso) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  // "O que Ana faz" e o orçamento seguem as tarefas que ela cadastrou: as fixas que ela faz,
  // as atividades próprias (chave "personalizada:Nome") e "Outra tarefa", se aceitar outras
  const tarefasDaApi = (p) => {
    if (!Array.isArray(p.tarefas)) return;
    const lista = document.querySelector('.perfil-servicos .cardapio-itens');
    const outraLi = lista && lista.querySelector('[data-tarefa="outra"]');
    const porChave = {};
    p.tarefas.forEach((t) => { porChave[t.tipo === 'personalizada' ? `personalizada:${t.nome}` : t.tipo] = { nome: t.nome, minimo: t.minimoHoras }; });
    if (p.aceitaOutras) porChave.outra = { nome: 'Outra tarefa', minimo: 1, aCombinar: true };
    if (lista && outraLi) {
      lista.querySelectorAll('[data-tarefa]').forEach((li) => {
        const t = porChave[li.dataset.tarefa];
        if (li.dataset.tarefa.startsWith('personalizada:')) { li.remove(); return; }
        li.hidden = !t;
        if (t && !t.aCombinar) li.querySelector('.item-linha span').textContent = `Mínimo ${t.minimo} h`;
      });
      p.tarefas.filter((t) => t.tipo === 'personalizada').forEach((t) => {
        const li = outraLi.cloneNode(true);
        li.dataset.tarefa = `personalizada:${t.nome}`;
        li.hidden = false;
        li.classList.add('chegou');
        li.querySelector('.icone-tarefa').innerHTML = '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 6v16M6 14h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
        li.querySelector('.item-linha strong').textContent = t.nome;
        li.querySelector('.item-linha span').textContent = `Mínimo ${t.minimoHoras} h`;
        const texto = li.querySelector('.item-linha + p');
        if (texto) texto.remove();
        lista.insertBefore(li, outraLi);
      });
    }
    const minimos = p.tarefas.map((t) => t.minimoHoras);
    const cond = document.querySelector('[data-cond-minimo]');
    if (cond) cond.textContent = `A partir de ${minimos.length ? Math.min(...minimos) : 1} h`;
    const orc = document.querySelector('[data-orcamento]');
    if (orc && Object.keys(porChave).length) orc.dispatchEvent(new CustomEvent('mc:tarefas', { detail: porChave }));
  };
  // foto, anos, valor e desconto, veículo, bairros e dias e horários do perfil público
  const DIAS = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']];
  const hh = (t) => { const [h, m] = t.split(':'); return `${Number(h)}h${m === '00' ? '' : m}`; };
  const resumoDias = (disp) => {
    if (!disp.length) return 'Combine no pedido';
    const grupos = [];
    DIAS.forEach(([dia, curto]) => {
      const txt = disp.filter((f) => f.dia === dia).map((f) => `${hh(f.inicio)} às ${hh(f.fim)}`).join(' e ');
      const ult = grupos[grupos.length - 1];
      if (txt && ult && ult.txt === txt && ult.seguido) { ult.fim = curto; return; }
      if (txt) grupos.push({ ini: curto, fim: null, txt, seguido: true });
      else if (ult) ult.seguido = false;
    });
    return grupos.map((g) => `${g.ini}${g.fim ? ` a ${g.fim.toLowerCase()}` : ''}, ${g.txt}`).join(' · ');
  };
  // troca "Ana Oliveira" e "Ana" nos textos fixos da página pelo nome de quem está sendo vista
  const trocaNome = (completo, primeiro) => {
    if (completo === 'Ana Oliveira') return;
    const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (andar.nextNode()) nos.push(andar.currentNode);
    nos.forEach((n) => {
      if (n.parentElement.closest('script, .site-topo, .rodape')) return;
      const t = n.nodeValue.replace(/Ana Oliveira/g, completo).replace(/\bAna\b/g, primeiro);
      if (t !== n.nodeValue) n.nodeValue = t;
    });
    document.querySelectorAll('[aria-label*="Ana"]').forEach((el) => el.setAttribute('aria-label', el.getAttribute('aria-label').replace(/Ana Oliveira/g, completo).replace(/\bAna\b/g, primeiro)));
  };
  const naoEncontrada = () => {
    const main = document.querySelector('main');
    document.querySelector('.perfil-capa').remove();
    main.innerHTML = '<section class="perfil-sumiu"><h1 class="cabeca">Não encontramos esta profissional</h1><p>O perfil pode ter saído do ar ou o endereço está incompleto.</p><a class="botao" href="busca.html">Ver todos os profissionais</a></section>';
    document.title = 'Profissional não encontrada · Minha companhia';
  };
  const perfilDaApi = (p) => {
    const txt = (sel, t) => { const el = document.querySelector(sel); if (el) el.textContent = t; };
    const dma = (iso) => { const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
    const juntaE = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}` : l[0] || '');
    const primeiroDe = String(p.nome || '').split(' ')[0];
    document.documentElement.dataset.primeiro = primeiroDe;
    trocaNome(p.nome, primeiroDe);
    document.title = `${p.nome}, profissional verificada em ${p.cidade} · Minha companhia`;
    txt('.perfil-nome .linha', p.nome);
    // frase de apoio montada com o que ela faz, onde e se leva de carro
    const FAZ = { consulta: 'à consulta', banco: 'ao banco', mercado: 'ao mercado', passeio: 'para passear' };
    const faz = (p.tarefas || []).map((t) => FAZ[t.tipo]).filter(Boolean);
    const onde = Array.isArray(p.bairros) && p.bairros.length ? juntaE(p.bairros) : p.cidade;
    txt('.perfil-apoio', `Leva sua mãe ou seu pai ${faz.length ? juntaE(faz) : 'aonde for preciso'}. Atende ${onde}${p.veiculoIncluso ? ', com carro próprio' : ''}.`);
    if (p.revisadoEm) { const selo = document.querySelector('.perfil-selo span'); if (selo) selo.innerHTML = `<strong>Profissional verificada.</strong> Documentos revisados em ${dma(p.revisadoEm)}.`; }
    // "Como acompanho" e "Experiência": a apresentação dela e os cursos validados
    const textos = document.querySelectorAll('.perfil-sobre-textos > div p');
    if (textos[0]) textos[0].textContent = p.apresentacao || `${primeiroDe} ainda não escreveu a apresentação.`;
    if (textos[1]) {
      const cursos = (p.qualificacoes || []).map((c) => `${c.titulo}${c.cargaHorariaHoras ? `, ${c.cargaHorariaHoras} horas` : ''}${c.anoConclusao ? `, em ${c.anoConclusao}` : ''}`);
      textos[1].textContent = [cursos.length ? `${cursos.length === 1 ? 'Curso' : 'Cursos'} de ${juntaE(cursos)}, ${cursos.length === 1 ? 'validado' : 'validados'} pela equipe.` : '', p.anosExperiencia ? `${p.anosExperiencia} ${p.anosExperiencia === 1 ? 'ano' : 'anos'} acompanhando pessoas idosas.` : '', p.veiculoIncluso ? 'Carro próprio, que já entra no valor da hora.' : ''].filter(Boolean).join(' ') || 'Experiência conferida pela equipe na entrevista.';
    }
    // ladrilhos de documentos: revisão, próxima revisão, CNH só de quem leva de carro, nota
    const lad = [...document.querySelectorAll('.perfil-docs .ladrilho')];
    const ladDe = (rot) => lad.find((l) => (l.querySelector('strong') || {}).textContent === rot);
    const cnh = ladDe('CNH'); if (cnh) cnh.hidden = !p.veiculoIncluso;
    // identidade e comprovante são exigidos para aprovar; antes disso, só ela vê o perfil e eles ainda podem faltar
    ['Identidade', 'Comprovante de endereço'].forEach((rot) => { const l = ladDe(rot); if (l) l.hidden = p.situacao !== 'aprovado'; });
    const rev = ladDe('Revisão'); if (rev) rev.hidden = !p.revisadoEm;
    if (rev && p.revisadoEm) rev.querySelector('span').textContent = dma(p.revisadoEm);
    const prox = ladDe('Próxima'); if (prox) prox.hidden = !p.proximaRevisao;
    if (prox && p.proximaRevisao) { prox.querySelector('span').textContent = dma(p.proximaRevisao); const f = prox.querySelector('[data-faltam]'); if (f) { f.dataset.faltam = String(p.proximaRevisao).slice(0, 10); textoFaltam(f); } }
    const notaLad = lad[lad.length - 1];
    if (notaLad && p.nota) notaLad.innerHTML = p.nota.total ? `<strong>${String(p.nota.media.toFixed(1)).replace('.', ',')} de 5</strong><span>${p.nota.total} ${p.nota.total === 1 ? 'avaliação' : 'avaliações'}</span>` : '<strong>Nova na plataforma</strong><span>Ainda sem avaliações</span>';
    // sem foto, as iniciais no lugar do retrato desenhado da Ana
    if (!p.fotoUrl && p.slug !== 'ana-oliveira') {
      const fig = document.querySelector('[data-retrato]');
      const svgRetrato = fig && fig.querySelector('svg');
      if (svgRetrato) svgRetrato.outerHTML = `<span class="retrato-iniciais" aria-hidden="true">${esc(String(p.nome).split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase())}</span>`;
    }
    const reais = (c) => `R$ ${(c / 100).toLocaleString('pt-BR')}`;
    const primeiro = String(p.nome || '').split(' ')[0];
    if (p.fotoUrl) {
      const fig = document.querySelector('[data-retrato]');
      const svgRetrato = fig && fig.querySelector('svg');
      if (svgRetrato) svgRetrato.outerHTML = `<img src="${esc(p.fotoUrl)}" alt="Foto de ${esc(p.nome)}">`;
      if (fig) fig.classList.add('com-foto');
    }
    if (p.anosExperiencia) txt('[data-legenda-retrato]', `${p.nome} · ${p.anosExperiencia} ${p.anosExperiencia === 1 ? 'ano' : 'anos'} acompanhando pessoas idosas`);
    if (p.valorHoraCentavos) {
      txt('[data-cond-valor]', `${reais(p.valorHoraCentavos)}/h`);
      const temDesconto = p.descontoAPartirHoras && p.valorHoraDescontoCentavos;
      txt('[data-cond-desconto]', temDesconto ? `${reais(p.valorHoraDescontoCentavos)}/h a partir de ${p.descontoAPartirHoras} h` : 'por hora');
      const orc = document.querySelector('[data-orcamento]');
      if (orc) orc.dispatchEvent(new CustomEvent('mc:perfil', { detail: { nome: primeiro, completo: p.nome, slug: p.slug, minimo: p.horasMinimas || 1, valor: p.valorHoraCentavos / 100, desconto: temDesconto ? { aPartir: p.descontoAPartirHoras, valor: p.valorHoraDescontoCentavos / 100 } : null, veiculo: !!p.veiculoIncluso } }));
    }
    const cv = document.querySelector('[data-cond-veiculo]');
    if (cv) cv.innerHTML = p.veiculoIncluso ? '<strong>Veículo incluso</strong><span>busca e traz de volta</span>' : `<strong>Sem veículo</strong><span>${esc(primeiro)} vai até a casa</span>`;
    txt('[data-onde-veiculo]', p.veiculoIncluso ? 'Incluso' : 'Sem veículo');
    txt('[data-onde-veiculo-texto]', p.veiculoIncluso ? 'Carro próprio, sem cobrança à parte.' : 'O deslocamento é combinado com a família.');
    if (Array.isArray(p.bairros) && p.bairros.length) txt('[data-onde-bairros]', p.bairros.length > 1 ? `${p.bairros.slice(0, -1).join(', ')} e ${p.bairros[p.bairros.length - 1]}` : p.bairros[0]);
    if (Array.isArray(p.disponibilidade)) txt('[data-onde-dias]', resumoDias(p.disponibilidade));
  };
  fetch(`/api/profissionais/${encodeURIComponent(sec.dataset.slug)}`, { credentials: 'same-origin' })
    .then((r) => {
      const json = (r.headers.get('content-type') || '').includes('json');
      if (r.status === 404 && json) { naoEncontrada(); return null; }
      return r.ok && json ? r.json() : null;
    })
    .then((dados) => {
      if (dados && dados.profissional) { tarefasDaApi(dados.profissional); perfilDaApi(dados.profissional); }
      const lista = dados && (dados.qualificacoes || (dados.profissional && dados.profissional.qualificacoes));
      if (!Array.isArray(lista)) return;
      if (!lista.length) { sec.hidden = true; return; }
      sec.querySelector('[data-lista-cursos]').innerHTML = lista.map((c) => `<li class="chegou"><strong>${esc(c.titulo)}</strong><span>${esc(c.instituicao)}</span><span class="num">${[c.cargaHorariaHoras ? `${c.cargaHorariaHoras} horas` : null, c.anoConclusao].filter(Boolean).join(' · ')}</span>${c.verificadoEm ? `<span class="curso-ok num">Validado em ${dd(c.verificadoEm)}</span>` : ''}</li>`).join('');
    })
    .catch(() => { /* sem a API, fica a lista da página */ });
})();

// portfólio: avaliações das famílias. Três na página e todas numa janela, com ordenação.
// Com a API, vêm de /api/profissionais/:slug/avaliacoes; sem ela, ficam as de exemplo da página.
(() => {
  const sec = document.querySelector('[data-avaliacoes]');
  const janela = document.querySelector('[data-av-janela]');
  if (!sec || !janela) return;
  const primeiroNome = () => document.documentElement.dataset.primeiro || 'Ana';
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ESTRELA = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6L1.3 7.8l6.1-.7z" fill="currentColor"/></svg>';
  const estrelas = (n) => `<span class="estrelas-av" role="img" aria-label="Nota ${n} de 5">${ESTRELA.repeat(n)}${ESTRELA.replace('<svg', '<svg class="apagada"').repeat(5 - n)}</span>`;
  // no horário daqui, não no UTC: uma avaliação das 22h não aparece com a data do dia seguinte
  const data = (iso) => { const d = iso.length > 10 ? new Date(iso) : new Date(`${iso}T12:00:00`); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const item = (a) => `<li><div class="av-cab"><span class="av-quem">${esc(a.autor)}${a.relacao ? `, ${esc(a.relacao.toLowerCase())}` : ''} · <span class="num">${data(a.criadoEm)}</span></span>${estrelas(a.nota)}</div>${a.comentario ? `<p class="av-texto">“${esc(a.comentario)}”</p>` : '<p class="av-texto av-sem">Deu a nota sem comentário.</p>'}${a.resposta ? `<p class="av-resposta"><strong>Resposta de ${esc(primeiroNome())}:</strong> ${esc(a.resposta)}</p>` : ''}</li>`;
  let lista = [];
  try { lista = JSON.parse(document.getElementById('avaliacoes-exemplo').textContent); } catch (_) { lista = []; }
  const media = () => (lista.length ? lista.reduce((s, a) => s + a.nota, 0) / lista.length : 0);
  const resumo = () => {
    const m = media().toFixed(1).replace('.', ',');
    sec.querySelector('[data-av-media]').textContent = m;
    sec.querySelector('[data-av-total]').textContent = `${lista.length} ${lista.length === 1 ? 'avaliação' : 'avaliações'} de quem contratou ${primeiroNome()}`;
    janela.querySelector('[data-av-janela-sub]').textContent = `${m} de 5 · ${lista.length} ${lista.length === 1 ? 'avaliação' : 'avaliações'}`;
  };
  const ORDENS = {
    recentes: (a, b) => b.criadoEm.localeCompare(a.criadoEm),
    antigas: (a, b) => a.criadoEm.localeCompare(b.criadoEm),
    melhores: (a, b) => b.nota - a.nota || b.criadoEm.localeCompare(a.criadoEm),
    piores: (a, b) => a.nota - b.nota || b.criadoEm.localeCompare(a.criadoEm),
  };
  const todas = (ordem) => { janela.querySelector('[data-av-todas]').innerHTML = [...lista].sort(ORDENS[ordem]).map(item).join(''); };
  janela.querySelectorAll('[data-ordem]').forEach((b) => b.addEventListener('click', () => {
    janela.querySelectorAll('[data-ordem]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    todas(b.dataset.ordem);
    janela.querySelector('[data-av-todas]').scrollTop = 0;
  }));
  const abrir = sec.querySelector('[data-av-abrir]');
  abrir.addEventListener('click', () => {
    todas(janela.querySelector('[data-ordem][aria-pressed="true"]').dataset.ordem);
    if (janela.showModal) janela.showModal(); else janela.setAttribute('open', '');
    document.documentElement.classList.add('janela-aberta');
  });
  const fecha = () => { if (janela.close) janela.close(); else janela.removeAttribute('open'); };
  janela.querySelector('[data-av-fechar]').addEventListener('click', fecha);
  janela.addEventListener('click', (ev) => { if (ev.target === janela) fecha(); });
  janela.addEventListener('close', () => { document.documentElement.classList.remove('janela-aberta'); abrir.focus(); });
  resumo();

  if (!/^https?:$/.test(location.protocol)) return;
  fetch(`/api/profissionais/${encodeURIComponent(sec.dataset.slug)}/avaliacoes`, { credentials: 'same-origin' })
    .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
    .then((d) => {
      if (!d || !Array.isArray(d.avaliacoes)) return;
      if (!d.avaliacoes.length) { sec.hidden = true; return; }
      lista = d.avaliacoes.map((a) => ({ nota: a.nota, autor: a.autor, criadoEm: a.criadoEm, comentario: a.comentario, resposta: a.resposta || null, relacao: a.relacao || null }));
      resumo();
      sec.querySelector('[data-av-destaque]').innerHTML = [...lista].sort(ORDENS.recentes).slice(0, 3).map(item).join('');
    })
    .catch(() => { /* sem a API, ficam as avaliações da página */ });
})();
