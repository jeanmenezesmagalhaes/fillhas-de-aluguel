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
    else { acao.removeAttribute('href'); acao.textContent = `Perfil de ${p.nome} não faz parte da amostra`; acao.setAttribute('aria-disabled', 'true'); acao.classList.add('inativo'); }
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
