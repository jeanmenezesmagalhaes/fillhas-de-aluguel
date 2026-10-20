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

  // dias até a próxima revisão de documentos, contados a partir de hoje
  document.querySelectorAll('[data-faltam]').forEach((el) => {
    const [a, m, d] = el.dataset.faltam.split('-').map(Number);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dias = Math.round((new Date(a, m - 1, d) - hoje) / 86400000);
    if (dias > 1) el.textContent = `Faltam ${dias} dias. A data aparece no perfil de cada profissional.`;
    else if (dias === 1) el.textContent = 'Falta 1 dia. A data aparece no perfil de cada profissional.';
    else if (dias === 0) el.textContent = 'A revisão é hoje. A data aparece no perfil de cada profissional.';
  });

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
  const atual = () => pros[(raiz.querySelector('input[name="quem"]:checked') || {}).value || raiz.dataset.orcamento];
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

  const blocos = (p, h) => {
    const caixa = $('[data-blocos]');
    if (!caixa) return;
    const comDesconto = p.desconto && h >= p.desconto.aPartir;
    const limite = 48;
    caixa.innerHTML = '';
    for (let i = 0; i < Math.min(h, limite); i++) { const b = document.createElement('span'); b.className = 'bh' + (comDesconto ? '' : ' cheia'); caixa.append(b); }
    if (h > limite) { const m = document.createElement('span'); m.className = 'blocos-mais'; m.textContent = `+ ${h - limite} h`; caixa.append(m); }
    raiz.querySelector('.blocos-legenda .bh').className = 'bh' + (comDesconto ? '' : ' cheia');
    $('[data-legenda]').textContent = comDesconto
      ? `Cada bloco é uma hora a ${brl2(p.desconto.valor)}, valor de ${p.nome} a partir de ${horas(p.desconto.aPartir)}.`
      : `Cada bloco é uma hora a ${brl2(p.valor)}.`;
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
    $('[data-minimo]').textContent = `${p.nome} atende a partir de ${horas(p.minimo)}.`;
    const d = $('[data-desconto]');
    if (!p.desconto) d.textContent = `${p.nome} cobra o mesmo valor por hora, seja qual for a duração.`;
    else if (h >= p.desconto.aPartir) d.textContent = `A partir de ${horas(p.desconto.aPartir)}, a hora de ${p.nome} cai para ${brl2(p.desconto.valor)}. Você economiza ${brl2(h * p.valor - t)}.`;
    else d.textContent = `A partir de ${horas(p.desconto.aPartir)}, a hora de ${p.nome} cai para ${brl2(p.desconto.valor)}.`;
    $('[data-veiculo]').textContent = p.veiculo ? `Veículo incluso: ${p.nome} busca em casa, leva e traz de volta.` : 'Sem veículo: combine táxi ou aplicativo para a ida e a volta.';
    raiz.querySelector('[data-veiculo-icone]').dataset.tem = p.veiculo ? 'sim' : 'nao';
    const acao = $('[data-acao]');
    if (p.link) { acao.href = `${p.link}?horas=${h}`; acao.textContent = `Pedir ${horas(h)} com ${p.nome}`; acao.removeAttribute('aria-disabled'); acao.classList.remove('inativo'); }
    else { acao.removeAttribute('href'); acao.textContent = `Perfil de ${p.nome} em breve`; acao.setAttribute('aria-disabled', 'true'); acao.classList.add('inativo'); }
    blocos(p, h);
  };

  raiz.addEventListener('change', () => desenha(true));
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
  const cartoes = lista.querySelectorAll('.pc');
  const conta = lista.querySelector('[data-conta-lista]');
  const vazia = lista.querySelector('[data-vazia]');
  botoes.forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.t;
    botoes.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    let n = 0;
    cartoes.forEach((c) => { const ok = t === 'todas' || c.dataset.tarefas.split(' ').includes(t); c.hidden = !ok; if (ok) n++; });
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
  const pros = JSON.parse(fonte.textContent);
  const lista = document.querySelector('[data-lista]');
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
  // sem dia escolhido, a tela pede o dia com atalhos para os próximos seis dias
  const pedeDia = document.querySelector('[data-pede-dia]');
  const trocar = document.querySelector('[data-trocar-dia]');
  const CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const abreData = () => { busca.data.focus({ preventScroll: true }); busca.scrollIntoView({ block: 'start', behavior: 'smooth' }); try { busca.data.showPicker(); } catch (_) { /* navegador sem seletor nativo */ } };
  const chips = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(hoje); d.setDate(d.getDate() + i);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dia'; b.dataset.iso = iso(d); b.dataset.semana = d.getDay();
    b.innerHTML = `<span class="dia-nome">${i === 1 ? 'Amanhã' : `${CURTO[d.getDay()][0].toUpperCase()}${CURTO[d.getDay()].slice(1)}`}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}</span><span class="dia-conta num"></span>`;
    chips.push(b);
  }
  const outra = document.createElement('button');
  outra.type = 'button'; outra.className = 'dia dia-outra'; outra.textContent = 'Outro dia';
  document.querySelector('[data-dias]').append(...chips, outra);
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
    ['', 'm', 't', 'n'].forEach((t) => conta(`turno:${t}`, base.filter((p) => passa(p, e, 'turno') && (!t || p.turnos.includes(t))).length));
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
    if (n) {
      const vs = ver_.map((p) => p.valor); const min = Math.min(...vs); const max = Math.max(...vs);
      const nCidades = new Set(ver_.map((p) => p.cidade)).size;
      const onde = e.cidade ? '' : ` em ${plural(nCidades, 'cidade', 'cidades')}`;
      const quem = dia ? `${plural(n, 'profissional livre', 'profissionais livres')}${onde} ${quando}` : `${plural(n, 'profissional verificada', 'profissionais verificadas')}${onde}`;
      achado.textContent = `${quem}${e.tarefa ? `${dia ? ',' : ''} para ${TAREFAS[e.tarefa]}` : ''}, ${min === max ? `por R$ ${min}` : `de R$ ${min} a R$ ${max}`} por hora.`;
    } else achado.textContent = 'Nenhuma profissional encontrada.';

    pedeDia.hidden = !!dia; trocar.hidden = !dia;
    chips.forEach((b) => {
      const k = naCidade.filter((p) => (!e.tarefa || p.tarefas.includes(e.tarefa)) && p.dias.includes(Number(b.dataset.semana)) && passa(p, e)).length;
      b.querySelector('.dia-conta').textContent = plural(k, 'livre', 'livres');
    });
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
  chips.forEach((b) => b.addEventListener('click', () => { buscas.forEach((f) => { f.data.value = b.dataset.iso; }); desenha(); }));
  outra.addEventListener('click', abreData);
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
