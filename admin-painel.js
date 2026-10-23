// Painel da equipe: a visão geral da operação, todas as contas (com o que falta em cada cadastro)
// e os convites especiais para profissionais. Cada tela tem o próprio endereço (#visao, #usuarios,
// #convites). Usa as rotas /api/admin; aberto sem a API, mostra dados de exemplo.
(() => {
  const { esc, plural } = window.mc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const p2 = (n) => String(n).padStart(2, '0');
  const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const data = (iso) => { const d = new Date(iso); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const ha = (iso) => {
    if (!iso) return 'nunca entrou';
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : dias < 60 ? `há ${dias} dias` : data(iso);
  };
  const fone = (c) => { const d = String(c || '').replace(/\D/g, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : c || '—'; };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SIT_PRO = {
    rascunho: ['aviso', 'Cadastro não finalizado'],
    correcao: ['aviso', 'Em correção'],
    em_analise: ['', 'Na lista de espera'],
    aprovado: ['ok', 'No ar'],
    vencido: ['ruim', 'Revisão vencida'],
  };
  const FALTA = { email: 'e-mail', dadosFiscais: 'CPF', endereco: 'endereço', documentos: 'documentos', valorHora: 'valor da hora', chavePix: 'chave Pix' };
  const SIT_CONVITE = { ativo: ['ok', 'Ativo'], usado: ['', 'Usado'], expirado: ['', 'Vencido'], cancelado: ['ruim', 'Cancelado'] };
  // cada pessoa com um tom pálido fixo, tirado do id, para reconhecer de relance
  const tom = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${Math.round(h / 45) * 45} 40% 90%)`; };
  const inicial = (u) => `<span class="inicial" style="background:${tom(u.id)}" aria-hidden="true">${esc(String(u.nome).trim()[0] || '?').toUpperCase()}</span>`;

  // --- exemplo sem API ---
  const exemplo = (() => {
    const dia = (n) => new Date(Date.now() - n * 86400000).toISOString();
    const mes = (n) => { const d = new Date(); d.setDate(15); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 7); };
    const meses = [5, 4, 3, 2, 1, 0].map((n, i) => ({ mes: mes(n), recebidoCentavos: [96000, 168000, 252000, 336000, 448000, 291200][i], receitaCentavos: [11520, 20160, 30240, 40320, 53760, 31280][i], pagamentos: [4, 7, 10, 13, 17, 11][i] }));
    const recebido = meses.reduce((t, m) => t + m.recebidoCentavos, 0);
    const resumo = {
      gateway: 'simulado', taxaPadrao: 12,
      contas: { total: 64, novos7: 6, novos30: 19, emailPendente: 7, familias: 41, familiasSemPedido: 17, profissionais: 22 },
      profissionais: { rascunho: 8, emAnalise: 3, correcao: 1, aprovado: 9, vencido: 1, revisaoEm7Dias: 2, aprovadasSemPix: 1 },
      conferencia: { fila: 3, documentos: 5, cursos: 2, fotos: 1 },
      pedidos: { total: 81, novos30: 24, realizadosMes: 9, porSituacao: { solicitado: 3, proposta_alterada: 1, aguardando_pagamento: 2, confirmado: 6, realizado: 58, cancelado: 7, recusado: 2, expirado: 2 }, avaliacaoMedia: 4.8, avaliacoes: 41 },
      financeiro: {
        recebidoCentavos: recebido, receitaCentavos: 168000, receitaPrevistaCentavos: 19280, repassadoCentavos: 1232000, retidoCentavos: 359200, reembolsadoCentavos: 28000, aDevolverCentavos: 0,
        custoGatewayCentavos: 5680, pagamentos: 62, cobrancasAbertas: 2, cobrancasAbertasCentavos: 42000, paraRepassar: 4, paraRepassarCentavos: 98560, repassesFalhos: 1, ticketMedioCentavos: Math.round(recebido / 62), meses,
      },
      convites: { ativos: 2, total: 4, cadastradas: 3, aprovadas: 1 },
      recentes: [
        { id: 'u1', nome: 'Rita Moraes', criadoEm: dia(0), tipo: 'profissional', situacao: 'rascunho' },
        { id: 'u2', nome: 'Carla Mendes', criadoEm: dia(1), tipo: 'familia', situacao: null },
        { id: 'u3', nome: 'Patrícia Gomes', criadoEm: dia(2), tipo: 'profissional', situacao: 'em_analise' },
        { id: 'u6', nome: 'Sérgio Lima', criadoEm: dia(3), tipo: 'familia', situacao: null },
        { id: 'u7', nome: 'Joana Prado', criadoEm: dia(4), tipo: 'profissional', situacao: 'correcao' },
      ],
    };
    const usuarios = [
      { id: 'u1', nome: 'Rita Moraes', email: 'rita.moraes@exemplo.com', celular: '19977774321', admin: false, emailVerificadoEm: null, celularVerificadoEm: null, criadoEm: dia(0), papeis: ['profissional'], pedidos: 0, realizados: 0, pagoCentavos: 0, ultimoAcesso: dia(0), profissional: { slug: 'rita-moraes', situacao: 'rascunho', cidade: 'Campinas', uf: 'SP', valorHoraCentavos: null, temChavePix: false, convite: 'MC-7K2P9QXA', beneficio: { taxaPercentual: 5, taxaMeses: 6, taxaAte: null, prioridadeFila: true } }, falta: ['email', 'dadosFiscais', 'endereco', 'documentos', 'valorHora'] },
      { id: 'u2', nome: 'Carla Mendes', email: 'carla.mendes@exemplo.com', celular: '19988881234', admin: false, emailVerificadoEm: dia(1), celularVerificadoEm: null, criadoEm: dia(1), papeis: ['familia'], pedidos: 0, realizados: 0, pagoCentavos: 0, ultimoAcesso: dia(1), profissional: null, falta: [] },
      { id: 'u3', nome: 'Patrícia Gomes', email: 'patricia.gomes@exemplo.com', celular: '19988776655', admin: false, emailVerificadoEm: dia(5), celularVerificadoEm: dia(5), criadoEm: dia(2), papeis: ['profissional'], pedidos: 0, realizados: 0, pagoCentavos: 0, ultimoAcesso: dia(1), profissional: { slug: 'patricia-gomes', situacao: 'em_analise', cidade: 'Campinas', uf: 'SP', valorHoraCentavos: 8000, temChavePix: true, convite: null, beneficio: null }, falta: [] },
      { id: 'u4', nome: 'Ana Oliveira', email: 'ana.oliveira@exemplo.com', celular: '19988880000', admin: false, emailVerificadoEm: dia(90), celularVerificadoEm: dia(90), criadoEm: dia(90), papeis: ['profissional'], pedidos: 34, realizados: 31, pagoCentavos: 868000, ultimoAcesso: dia(2), profissional: { slug: 'ana-oliveira', situacao: 'aprovado', cidade: 'Campinas', uf: 'SP', valorHoraCentavos: 7000, temChavePix: true, aprovadoEm: dia(80), proximaRevisao: dia(-10).slice(0, 10), convite: null, beneficio: null }, falta: [] },
      { id: 'u5', nome: 'Mariana Costa', email: 'mariana.costa@exemplo.com', celular: '19999990000', admin: false, emailVerificadoEm: dia(60), celularVerificadoEm: null, criadoEm: dia(60), papeis: ['familia'], pedidos: 12, realizados: 10, pagoCentavos: 268000, ultimoAcesso: dia(5), profissional: null, falta: [] },
    ];
    let convites = [
      { id: 'c1', codigo: 'MC-7K2P9QXA', nome: 'Rita Moraes', email: 'rita.moraes@exemplo.com', celular: '19977774321', mensagem: null, taxaPercentual: 5, taxaMeses: 6, prioridadeFila: true, usosMaximos: 1, usos: 1, expiraEm: dia(-20), observacao: 'Feira de Campinas', criadoEm: dia(10), enviadoEm: dia(10), canceladoEm: null, situacao: 'usado', link: '/entrar?perfil=pro&modo=criar&convite=MC-7K2P9QXA', beneficios: ['taxa da plataforma de 5% (no lugar de 12%) nos primeiros 6 meses depois da aprovação', 'prioridade na análise do cadastro'], criadoPor: 'Equipe', cadastradas: [{ id: 'u1', nome: 'Rita Moraes', situacao: 'rascunho' }] },
      { id: 'c2', codigo: 'MC-SNC4Q8TB', nome: 'Turma do Senac', email: null, celular: null, mensagem: 'Bem-vindas!', taxaPercentual: 0, taxaMeses: 3, prioridadeFila: false, usosMaximos: 20, usos: 2, expiraEm: dia(-25), observacao: 'Parceria com o Senac', criadoEm: dia(5), enviadoEm: null, canceladoEm: null, situacao: 'ativo', link: '/entrar?perfil=pro&modo=criar&convite=MC-SNC4Q8TB', beneficios: ['sem taxa da plataforma nos primeiros 3 meses depois da aprovação'], criadoPor: 'Equipe', cadastradas: [{ id: 'u8', nome: 'Lúcia Ferraz', situacao: 'aprovado' }, { id: 'u9', nome: 'Denise Rocha', situacao: 'rascunho' }] },
    ];
    const erro = (status, mensagem) => { const e = new Error(mensagem); e.status = status; throw e; };
    return {
      async chamar(metodo, url, corpo) {
        await new Promise((r) => setTimeout(r, 120));
        if (url === '/api/admin/resumo') return resumo;
        if (url.startsWith('/api/admin/usuarios')) {
          const q = new URLSearchParams(url.split('?')[1] || '');
          const busca = (q.get('busca') || '').toLowerCase();
          const f = q.get('filtro');
          const lista = usuarios.filter((u) => (!busca || u.nome.toLowerCase().includes(busca) || u.email.includes(busca))
            && (!f || (f === 'familias' && u.papeis.includes('familia')) || (f === 'profissionais' && u.profissional) || (u.profissional && u.profissional.situacao === f) || (f === 'admins' && u.admin)));
          return { pagina: 1, porPagina: 50, total: lista.length, usuarios: lista };
        }
        if (url === '/api/admin/convites' && metodo === 'GET') return { taxaPadrao: 12, resumo: { ativos: convites.filter((c) => c.situacao === 'ativo').length, cadastradas: 3, aprovadas: 1 }, convites };
        if (url === '/api/admin/convites') {
          const c = { ...corpo, email: corpo.email || null, celular: corpo.celular || null, id: `c${Date.now()}`, codigo: 'MC-EXEMPLO2', usos: 0, situacao: 'ativo', link: '/entrar?perfil=pro&modo=criar&convite=MC-EXEMPLO2', beneficios: beneficiosEmTexto(corpo, 12), criadoEm: new Date().toISOString(), expiraEm: new Date(Date.now() + corpo.validadeDias * 86400000).toISOString(), cadastradas: [] };
          convites = [c, ...convites];
          return { convite: c, envio: corpo.enviarEmail ? { ok: true } : null };
        }
        const m = url.match(/\/api\/admin\/convites\/([^/]+)\/(cancelar|enviar)$/);
        if (m) { if (m[2] === 'cancelar') convites = convites.map((c) => (c.id === m[1] ? { ...c, situacao: 'cancelado' } : c)); return { ok: true }; }
        if (/\/api\/admin\/profissionais\/[^/]+\/beneficio$/.test(url)) return { beneficio: corpo };
        erro(404, 'Não encontrado.');
      },
    };
  })();

  let modoApi = false;
  const chamar = (metodo, url, corpo) => (modoApi ? window.mc.api(metodo, url, corpo) : exemplo.chamar(metodo, url, corpo));
  const origem = () => (location.origin && location.origin !== 'null' ? location.origin : 'https://minhacompanhia.com.br');
  let taxaPadrao = 12;

  // os benefícios em frases, iguais às do e-mail que a API manda
  function beneficiosEmTexto(b, padrao = taxaPadrao) {
    const itens = [];
    if (b.taxaPercentual != null) {
      const taxa = b.taxaPercentual === 0 ? 'sem taxa da plataforma' : `taxa da plataforma de ${b.taxaPercentual}% (no lugar de ${padrao}%)`;
      itens.push(b.taxaMeses ? `${taxa} nos primeiros ${b.taxaMeses === 1 ? 'mês' : `${b.taxaMeses} meses`} depois da aprovação` : taxa);
    }
    if (b.prioridadeFila) itens.push('prioridade na análise do cadastro');
    return itens;
  }

  // --- telas ---
  const TITULOS = { visao: 'Visão geral', usuarios: 'Usuários', convites: 'Convites' };
  const carregou = new Set();
  const menu = $('[data-lateral]');
  const fechaMenu = () => { menu.classList.remove('aberta'); $('[data-menu]').setAttribute('aria-expanded', 'false'); };
  const mostra = () => {
    const nome = TITULOS[location.hash.slice(1)] ? location.hash.slice(1) : 'visao';
    $$('[data-tela]').forEach((s) => { s.hidden = s.dataset.tela !== nome; });
    $$('[data-nav]').forEach((a) => { if (a.dataset.nav === nome) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('[data-titulo-curto]').textContent = TITULOS[nome];
    document.title = `${TITULOS[nome]} · Painel da equipe · Minha companhia`;
    fechaMenu();
    if (!carregou.has(nome)) { carregou.add(nome); ({ visao: carregaResumo, usuarios: carregaUsuarios, convites: carregaConvites })[nome](); }
  };
  window.addEventListener('hashchange', () => { mostra(); window.scrollTo(0, 0); });
  $('[data-menu]').addEventListener('click', () => { menu.classList.add('aberta'); $('[data-menu]').setAttribute('aria-expanded', 'true'); $('[data-fechar-menu]').hidden = false; $('[data-fechar-menu]').focus(); });
  $('[data-fechar-menu]').addEventListener('click', () => { fechaMenu(); $('[data-menu]').focus(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && menu.classList.contains('aberta')) { fechaMenu(); $('[data-menu]').focus(); } });

  // atalhos para a lista de contas já filtrada
  const irParaUsuarios = ({ filtro = '', grupo = '', busca = '' } = {}) => {
    const f = $('[data-filtros]');
    f.busca.value = busca;
    f.filtro.value = filtro;
    grupoAtual = grupo;
    marcaGrupo();
    pagina = 1;
    carregou.add('usuarios');
    if (location.hash !== '#usuarios') location.hash = 'usuarios';
    carregaUsuarios();
  };
  $('[data-busca-topo]').addEventListener('submit', (ev) => { ev.preventDefault(); irParaUsuarios({ busca: ev.target.busca.value.trim() }); });

  const carimbo = () => { const d = new Date(); $('[data-carimbo]').textContent = `Atualizado às ${d.getHours()}h${p2(d.getMinutes())}`; };
  $('[data-atualizar]').addEventListener('click', () => {
    const nome = TITULOS[location.hash.slice(1)] ? location.hash.slice(1) : 'visao';
    ({ visao: carregaResumo, usuarios: carregaUsuarios, convites: carregaConvites })[nome]();
  });

  // --- visão geral ---
  const linhaLista = (rotulo, n, { sub, alvo, ruim } = {}) => {
    const cl = `linha${n ? (ruim ? ' ruim' : '') : ' zero'}`;
    const corpo = `<span class="rotulo">${rotulo}${sub ? `<small>${sub}</small>` : ''}</span><span class="valor num">${n}</span>`;
    if (alvo && alvo.startsWith('filtro:')) return `<li><button type="button" class="${cl}" data-filtro-ir="${alvo.slice(7)}">${corpo}</button></li>`;
    if (alvo) return `<li><a class="${cl}" href="${alvo}">${corpo}</a></li>`;
    return `<li><div class="${cl}">${corpo}</div></li>`;
  };
  const chave = (dt, dd, sub, forte) => `<div${forte ? ' class="forte"' : ''}><dt>${dt}${sub ? `<small>${sub}</small>` : ''}</dt><dd class="num">${dd}</dd></div>`;

  const desenhaResumo = (r) => {
    taxaPadrao = r.taxaPadrao;
    const f = r.financeiro;
    const atual = f.meses[f.meses.length - 1];
    const anterior = f.meses[f.meses.length - 2];
    const nomeMes = (m) => MESES_LONGOS[Number(m.mes.slice(5, 7)) - 1];
    const esperando = r.conferencia.fila + r.conferencia.documentos + r.conferencia.cursos + r.conferencia.fotos;

    // o achado: o que pede a equipe agora, em uma frase
    const partes = [];
    if (r.conferencia.fila) partes.push(`<strong>${plural(r.conferencia.fila, 'cadastro espera', 'cadastros esperam')}</strong> a conferência`);
    if (f.paraRepassar) partes.push(`<strong>${brl(f.paraRepassarCentavos)}</strong> ${f.paraRepassar === 1 ? 'está pronto' : 'estão prontos'} para repassar`);
    if (f.repassesFalhos) partes.push(`<strong>${plural(f.repassesFalhos, 'repasse falhou', 'repasses falharam')}</strong>`);
    $('[data-achado]').innerHTML = partes.length ? `${partes.join(', ').replace(/, ([^,]*)$/, ' e $1')}.` : 'Nada esperando a equipe agora.';

    const base = anterior ? `${brl(anterior.recebidoCentavos)} em ${nomeMes(anterior)}` : '—';
    $('[data-kpis]').innerHTML = [
      [`Recebido em ${nomeMes(atual)}`, brl(atual.recebidoCentavos), `${plural(atual.pagamentos, 'pagamento', 'pagamentos')} · ${base}`],
      [`Receita em ${nomeMes(atual)}`, brl(atual.receitaCentavos), `taxa da plataforma · ${brl(f.receitaCentavos)} no total`],
      ['Contas', String(r.contas.total), r.contas.novos7 ? `+${r.contas.novos7} nos últimos 7 dias` : 'nenhuma nos últimos 7 dias'],
      ['Profissionais no ar', String(r.profissionais.aprovado), `${plural(r.profissionais.emAnalise, 'na fila', 'na fila')} de análise`],
    ].map(([dt, dd, sub]) => `<div class="kpi"><dt>${dt}</dt><dd class="num">${dd}</dd><dd>${sub}</dd></div>`).join('');

    const rot = (m) => `${MESES[Number(m.mes.slice(5, 7)) - 1]}/${m.mes.slice(2, 4)}`;
    const grafico = $('[data-grafico-fat]');
    grafico.innerHTML = '';
    if (window.Charts) {
      Charts.bars(grafico, {
        labels: f.meses.map(rot),
        values: f.meses.map((m) => m.recebidoCentavos / 100),
        highlight: f.meses.length - 1,
        height: 210,
        format: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
        tickFormat: (v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(v)),
      });
    }
    $('[data-fin]').innerHTML = [
      chave('Recebido no total', brl(f.recebidoCentavos), plural(f.pagamentos, 'pagamento', 'pagamentos'), true),
      chave('Retido', brl(f.retidoCentavos), 'pago, ainda sem repasse'),
      chave('Repassado', brl(f.repassadoCentavos), 'para as profissionais'),
      chave('Devolvido', brl(f.reembolsadoCentavos), 'às famílias'),
      f.aDevolverCentavos ? chave('A devolver', brl(f.aDevolverCentavos), 'serviços cancelados') : '',
      chave('Custos do gateway', brl(f.custoGatewayCentavos), 'Pix e cartão'),
      chave('Cobranças em aberto', brl(f.cobrancasAbertasCentavos), plural(f.cobrancasAbertas, 'família não pagou', 'famílias não pagaram')),
    ].join('');

    // caminho da profissional: onde cada uma está entre criar a conta e atender
    const p = r.profissionais;
    const etapas = [
      ['rascunho', 'Cadastro não finalizado', p.rascunho, ''],
      ['correcao', 'Em correção', p.correcao, ''],
      ['em_analise', 'Na fila de análise', p.emAnalise, ''],
      ['aprovado', 'No ar', p.aprovado, 'no-ar'],
      ['vencido', 'Revisão vencida', p.vencido, 'parado'],
    ];
    const totalPro = etapas.reduce((t, e) => t + e[2], 0);
    $('[data-caminho-meta]').textContent = plural(totalPro, 'profissional', 'profissionais');
    $('[data-caminho-barra]').innerHTML = totalPro ? etapas.filter((e) => e[2]).map((e) => `<i class="${e[3]}" style="flex:${e[2]}"></i>`).join('') : '<i style="flex:1"></i>';
    $('[data-etapas]').innerHTML = etapas.map(([filtro, rotulo, n, cl]) => `<button type="button" class="etapa" data-filtro-ir="${filtro}"><strong class="num">${n}</strong><span><i class="${cl}"></i>${rotulo}</span></button>`).join('');
    $('[data-acompanhar]').innerHTML = [
      linhaLista('Aprovadas sem chave Pix', p.aprovadasSemPix, { sub: 'não recebem o repasse', alvo: 'filtro:aprovado', ruim: true }),
      linhaLista('Revisão nos próximos 7 dias', p.revisaoEm7Dias, { alvo: 'filtro:aprovado' }),
      linhaLista('E-mail não confirmado', r.contas.emailPendente, { sub: 'famílias e profissionais', alvo: 'filtro:email_pendente' }),
      linhaLista('Famílias sem nenhum pedido', r.contas.familiasSemPedido, { sub: `de ${r.contas.familias} famílias`, alvo: 'filtro:familias_sem_pedido' }),
    ].join('');

    $('[data-espera-meta]').textContent = esperando ? plural(esperando, 'item', 'itens') : '';
    $('[data-n-conferencia]').textContent = esperando || '';
    $('[data-n-repasses]').textContent = f.paraRepassar + f.repassesFalhos || '';
    $('[data-espera]').innerHTML = [
      linhaLista('Cadastros na fila', r.conferencia.fila, { alvo: 'admin' }),
      linhaLista('Documentos para conferir', r.conferencia.documentos, { alvo: 'admin#docs' }),
      linhaLista('Cursos para validar', r.conferencia.cursos, { alvo: 'admin#cursos' }),
      linhaLista('Fotos para aprovar', r.conferencia.fotos, { alvo: 'admin#fotos' }),
      linhaLista('Repasses para liberar', f.paraRepassar, { sub: f.paraRepassar ? `${brl(f.paraRepassarCentavos)} para as profissionais` : null, alvo: 'admin#pagamentos' }),
      linhaLista('Repasses que falharam', f.repassesFalhos, { alvo: 'admin#pagamentos', ruim: true }),
    ].join('');

    const s = r.pedidos.porSituacao;
    const n = (k) => s[k] || 0;
    $('[data-pedidos-meta]').textContent = `${r.pedidos.total} no total`;
    $('[data-pedidos]').innerHTML = [
      chave('Esperando a profissional', n('solicitado'), 'responder o pedido'),
      chave('Esperando a família', n('proposta_alterada') + n('aguardando_pagamento'), 'aceitar proposta ou pagar'),
      chave('Confirmados', n('confirmado'), 'pagos, ainda por acontecer'),
      chave('Realizados', n('realizado'), `${r.pedidos.realizadosMes} neste mês`),
      chave('Não aconteceram', n('cancelado') + n('recusado') + n('expirado'), 'cancelados, recusados ou expirados'),
      chave('Nota das famílias', r.pedidos.avaliacaoMedia == null ? '—' : `${String(r.pedidos.avaliacaoMedia).replace('.', ',')} de 5`, plural(r.pedidos.avaliacoes, 'avaliação', 'avaliações')),
    ].join('');

    $('[data-recentes]').innerHTML = r.recentes.length ? r.recentes.slice(0, 5).map((u) => {
      const [cl, rotulo] = u.situacao ? SIT_PRO[u.situacao] || ['', u.situacao] : ['', u.tipo === 'familia' ? 'Família' : 'Conta'];
      return `<li class="recente"><span><strong>${esc(u.nome)}</strong><small>${ha(u.criadoEm)}</small></span><span class="pill ${cl}">${rotulo}</span></li>`;
    }).join('') : '<li class="vazio">Nenhum cadastro ainda.</li>';

    $$('[data-filtro-ir]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.filtroIr;
      if (['rascunho', 'admins', 'familias', 'profissionais'].includes(v)) irParaUsuarios({ grupo: v });
      else irParaUsuarios({ filtro: v });
    }));
    carimbo();
  };
  const carregaResumo = async () => {
    try { desenhaResumo(await chamar('GET', '/api/admin/resumo')); } catch (e) { $('[data-achado]').innerHTML = `<span class="erro">Não carregou: ${esc(e.message)}</span> <button class="acao" type="button" onclick="location.reload()">Tentar de novo</button>`; }
  };

  // --- usuários ---
  let pagina = 1;
  let grupoAtual = '';
  const marcaGrupo = () => $$('[data-grupo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.grupo === grupoAtual)));
  $$('[data-grupo]').forEach((b) => b.addEventListener('click', () => { grupoAtual = b.dataset.grupo; $('[data-filtros]').filtro.value = ''; marcaGrupo(); pagina = 1; carregaUsuarios(); }));

  const beneficioTexto = (b) => {
    if (!b || (b.taxaPercentual == null && !b.prioridadeFila)) return 'Nenhum';
    const partes = [];
    if (b.taxaPercentual != null) partes.push(`taxa de ${b.taxaPercentual}%${b.taxaMeses ? ` por ${plural(b.taxaMeses, 'mês', 'meses')}${b.taxaAte ? ` (até ${data(b.taxaAte)})` : ' depois da aprovação'}` : ''}`);
    if (b.prioridadeFila) partes.push('prioridade na fila');
    return partes.join(' · ');
  };
  const linhaUsuario = (u) => {
    const pro = u.profissional;
    const [cl, rot] = pro ? SIT_PRO[pro.situacao] || ['', pro.situacao] : u.admin ? ['', 'Equipe'] : ['', 'Família'];
    const sub = u.falta.length ? `<span class="sub falta">Falta ${u.falta.map((f) => FALTA[f] || f).join(', ')}</span>` : `<span class="sub">${esc(u.email)}</span>`;
    const ok = (v) => (v ? `confirmado em ${data(v)}` : 'não confirmado');
    const det = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
    return `<tr class="linha-usuario" data-usuario="${esc(u.id)}" aria-expanded="false">
        <td><button type="button" class="quem" data-abrir aria-expanded="false" aria-controls="det-${esc(u.id)}">${inicial(u)}<span><strong>${esc(u.nome)}</strong>${sub}</span></button></td>
        <td class="cel-situacao"><span class="pill ${cl}">${rot}</span>${pro && pro.convite ? ' <span class="pill">Convite</span>' : ''}</td>
        <td class="so-mesa">${pro ? `${esc(pro.cidade)}/${esc(pro.uf)}` : '<span class="sub">—</span>'}</td>
        <td class="n cel-pedidos num">${u.pedidos}<span class="sub">${u.realizados} feitos</span></td>
        <td class="n so-mesa num">${u.pagoCentavos ? brl(u.pagoCentavos) : '<span class="sub">—</span>'}<span class="sub">${pro ? 'recebido' : 'pago'}</span></td>
        <td class="n so-mesa">${ha(u.ultimoAcesso)}<span class="sub num">desde ${data(u.criadoEm)}</span></td>
        <td class="cel-seta"><svg class="seta" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></td>
      </tr>
      <tr class="detalhe" id="det-${esc(u.id)}" hidden><td colspan="7">
        <div class="detalhe-blocos">
          <div class="bloco"><h3>Contato</h3><dl class="chave">
            ${det('E-mail', `${esc(u.email)}<span class="sub">${ok(u.emailVerificadoEm)}</span>`)}
            ${det('WhatsApp', `<span class="num">${esc(fone(u.celular))}</span><span class="sub">${ok(u.celularVerificadoEm)}</span>`)}
            ${det('Conta criada', `<span class="num">${data(u.criadoEm)}</span>`)}
          </dl></div>
          <div class="bloco"><h3>${pro ? 'Atendimento' : 'Pedidos'}</h3><dl class="chave">
            ${det('Pedidos', `<span class="num">${u.pedidos} · ${u.realizados} feitos</span>`)}
            ${det(pro ? 'Recebido' : 'Pago', `<span class="num">${brl(u.pagoCentavos)}</span>`)}
            ${pro ? det('Valor da hora', pro.valorHoraCentavos ? `<span class="num">${brl(pro.valorHoraCentavos)}</span>` : 'não definido') : ''}
            ${pro ? det('Chave Pix', pro.temChavePix ? 'cadastrada' : 'não cadastrada') : ''}
            ${pro && pro.proximaRevisao ? det('Próxima revisão', `<span class="num">${pro.proximaRevisao.split('-').reverse().join('/')}</span>`) : ''}
          </dl></div>
          ${pro ? `<div class="bloco"><h3>Benefício</h3>
            <p data-beneficio-texto>${esc(beneficioTexto(pro.beneficio))}</p>
            ${pro.convite ? `<p class="sub num">convite ${esc(pro.convite)}</p>` : ''}
            ${pro.motivoCorrecao && pro.situacao === 'correcao' ? `<p class="sub">Correção pedida: ${esc(pro.motivoCorrecao)}</p>` : ''}
            <form class="form-beneficio" data-form-beneficio hidden novalidate>
              <label>Taxa<select class="entrada" name="taxaPercentual">${opcoesTaxa(pro.beneficio && pro.beneficio.taxaPercentual)}</select></label>
              <label>Por quanto tempo<select class="entrada" name="taxaMeses">${[['', 'Sem prazo'], ['1', '1 mês'], ['3', '3 meses'], ['6', '6 meses'], ['12', '12 meses']].map(([v, t]) => `<option value="${v}"${String((pro.beneficio && pro.beneficio.taxaMeses) || '') === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
              <label class="marcar"><input type="checkbox" name="prioridadeFila"${pro.beneficio && pro.beneficio.prioridadeFila ? ' checked' : ''}> Prioridade na fila</label>
              <p class="erro" data-erro-beneficio hidden></p>
              <div class="botoes"><button class="btn primario pequeno" type="submit">Salvar benefício</button><button class="acao" type="button" data-cancelar>Cancelar</button></div>
            </form>
            <div class="detalhe-acoes"><button class="acao" type="button" data-editar-beneficio>Mudar benefício</button></div>
          </div>` : ''}
        </div>
        <div class="detalhe-acoes">
          ${pro && pro.situacao === 'aprovado' ? `<a class="acao" href="portfolio?p=${encodeURIComponent(pro.slug)}" target="_blank" rel="noopener">Ver portfólio</a>` : ''}
          ${pro && pro.situacao === 'em_analise' ? '<a class="acao" href="admin">Conferir o cadastro</a>' : ''}
          <a class="acao" href="mailto:${esc(u.email)}">Mandar e-mail</a>
          <a class="acao" href="https://wa.me/55${esc(String(u.celular).replace(/\D/g, ''))}" target="_blank" rel="noopener">Chamar no WhatsApp</a>
        </div>
      </td></tr>`;
  };
  function opcoesTaxa(atual) {
    const ops = [['', `Padrão (${taxaPadrao}%)`], ['0', 'Isenta (0%)'], ...Array.from({ length: Math.max(0, taxaPadrao - 1) }, (_, i) => [String(i + 1), `${i + 1}%`])];
    return ops.map(([v, t]) => `<option value="${v}"${String(atual ?? '') === v ? ' selected' : ''}>${t}</option>`).join('');
  }
  const ligaUsuarios = (corpo) => $$('tr[data-usuario]', corpo).forEach((tr) => {
    const det = tr.nextElementSibling;
    const abre = () => {
      const aberto = det.hidden;
      det.hidden = !aberto;
      tr.setAttribute('aria-expanded', String(aberto));
      tr.classList.toggle('aberta', aberto);
      $('[data-abrir]', tr).setAttribute('aria-expanded', String(aberto));
    };
    $('[data-abrir]', tr).addEventListener('click', abre);
    $('.cel-seta', tr).addEventListener('click', abre);
    const f = $('[data-form-beneficio]', det);
    if (!f) return;
    const erro = $('[data-erro-beneficio]', f);
    const editar = $('[data-editar-beneficio]', det);
    editar.addEventListener('click', () => { f.hidden = false; editar.hidden = true; f.taxaPercentual.focus(); });
    $('[data-cancelar]', f).addEventListener('click', () => { f.hidden = true; editar.hidden = false; });
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      erro.hidden = true;
      const num = (v) => (v === '' ? null : Number(v));
      const corpo = { taxaPercentual: num(f.taxaPercentual.value), taxaMeses: num(f.taxaMeses.value), prioridadeFila: f.prioridadeFila.checked };
      if (corpo.taxaPercentual == null) corpo.taxaMeses = null;
      const botao = $('[type="submit"]', f);
      botao.disabled = true;
      try {
        const { beneficio: b } = await chamar('PUT', `/api/admin/profissionais/${encodeURIComponent(tr.dataset.usuario)}/beneficio`, corpo);
        $('[data-beneficio-texto]', det).textContent = beneficioTexto(b);
        f.hidden = true; editar.hidden = false;
      } catch (e) {
        erro.textContent = e.campos ? Object.values(e.campos)[0] : e.message;
        erro.hidden = false;
      } finally { botao.disabled = false; }
    });
  });

  const carregaUsuarios = async () => {
    const f = $('[data-filtros]');
    const q = new URLSearchParams();
    if (f.busca.value.trim()) q.set('busca', f.busca.value.trim());
    const filtro = f.filtro.value || grupoAtual;
    if (filtro) q.set('filtro', filtro);
    if (pagina > 1) q.set('pagina', String(pagina));
    const corpo = $('[data-usuarios]');
    corpo.setAttribute('aria-busy', 'true');
    try {
      const r = await chamar('GET', `/api/admin/usuarios${q.toString() ? `?${q}` : ''}`);
      const filtrado = f.busca.value.trim() || filtro;
      const de = (r.pagina - 1) * r.porPagina;
      $('[data-total]').textContent = r.total > r.porPagina ? `${de + 1}–${de + r.usuarios.length} de ${r.total}` : plural(r.total, 'conta', 'contas');
      corpo.innerHTML = r.usuarios.length ? r.usuarios.map(linhaUsuario).join('')
        : `<tr><td colspan="7"><p class="vazio">${filtrado ? 'Nenhuma conta com estes filtros.' : 'Nenhuma conta ainda.'}${filtrado ? ' <button class="acao" type="button" data-limpar>Limpar filtros</button>' : ''}</p></td></tr>`;
      const limpar = $('[data-limpar]', corpo);
      if (limpar) limpar.addEventListener('click', () => irParaUsuarios());
      ligaUsuarios(corpo);
      const paginas = Math.ceil(r.total / r.porPagina);
      $('[data-paginas]').hidden = paginas <= 1;
      $('[data-pagina-atual]').textContent = `página ${r.pagina} de ${paginas}`;
      $('[data-pagina="-1"]').disabled = r.pagina <= 1;
      $('[data-pagina="1"]').disabled = r.pagina >= paginas;
      carimbo();
    } catch (e) {
      corpo.innerHTML = `<tr><td colspan="7"><p class="erro">Não carregou: ${esc(e.message)}</p></td></tr>`;
    } finally { corpo.removeAttribute('aria-busy'); }
  };
  let espera;
  $('[data-filtros]').addEventListener('input', (ev) => {
    clearTimeout(espera);
    espera = setTimeout(() => { pagina = 1; carregaUsuarios(); }, ev.target.name === 'busca' ? 300 : 0);
  });
  $('[data-filtros]').addEventListener('submit', (ev) => { ev.preventDefault(); pagina = 1; carregaUsuarios(); });
  $$('[data-pagina]').forEach((b) => b.addEventListener('click', () => { pagina += Number(b.dataset.pagina); carregaUsuarios(); window.scrollTo(0, 0); }));

  // --- convites ---
  const form = $('[data-form-convite]');
  const textoConvite = (c, link) => {
    const nome = (c.nome || '').trim().split(/\s+/)[0] || '[nome]';
    const bs = c.beneficios && c.beneficios.length ? `\n\nCom este convite você tem:\n${c.beneficios.map((b) => `• ${b}`).join('\n')}` : '';
    return `Olá, ${nome}! Você recebeu um convite especial para atender pela Minha companhia, acompanhando pais e mães idosos em consultas, banco, mercado e passeios.${c.mensagem ? `\n\n${c.mensagem}` : ''}${bs}\n\nCrie sua conta por aqui: ${link}`;
  };
  const whatsapp = (c) => `https://wa.me/${c.celular ? `55${String(c.celular).replace(/\D/g, '')}` : ''}?text=${encodeURIComponent(textoConvite(c, origem() + c.link))}`;
  const copiar = async (texto, botao) => {
    try { await navigator.clipboard.writeText(texto); } catch (_) {
      const t = document.createElement('textarea'); t.value = texto; document.body.append(t); t.select();
      try { document.execCommand('copy'); } catch (__) { /* sem área de transferência */ }
      t.remove();
    }
    const antes = botao.textContent; botao.textContent = 'Link copiado'; setTimeout(() => { botao.textContent = antes; }, 1800);
  };
  const lerForm = () => {
    const num = (el) => (el.value.trim() === '' ? undefined : Number(el.value));
    return {
      nome: form.nome.value.trim(),
      email: form.email.value.trim() || undefined,
      celular: form.celular.value.trim() || undefined,
      taxaPercentual: num(form.taxaPercentual),
      taxaMeses: form.taxaPercentual.value === '' ? undefined : num(form.taxaMeses),
      prioridadeFila: form.prioridadeFila.checked,
      usosMaximos: num(form.usosMaximos) ?? 1,
      validadeDias: num(form.validadeDias) ?? 30,
      mensagem: form.mensagem.value.trim() || undefined,
      observacao: form.observacao.value.trim() || undefined,
      enviarEmail: form.enviarEmail.checked,
    };
  };
  // mostra a mensagem como ela vai chegar, enquanto a equipe escreve
  const previa = () => {
    const c = lerForm();
    $('[data-previa]').textContent = textoConvite({ ...c, beneficios: beneficiosEmTexto(c) }, `${origem()}/entrar?…convite=MC-…`);
    form.taxaMeses.disabled = form.taxaPercentual.value === '';
  };
  form.addEventListener('input', previa);
  form.addEventListener('change', previa);
  const preencheTaxa = () => { const atual = form.taxaPercentual.value; form.taxaPercentual.innerHTML = opcoesTaxa(atual).replace(`Padrão (${taxaPadrao}%)`, `Padrão (${taxaPadrao}%), sem desconto`); };

  const SIT_CADASTRO = { rascunho: 'não finalizou', correcao: 'em correção', em_analise: 'na fila', aprovado: 'no ar', vencido: 'revisão vencida' };
  const linhaConvite = (c) => {
    const [cl, rot] = SIT_CONVITE[c.situacao] || ['', c.situacao];
    const contato = [c.email, c.celular ? fone(c.celular) : null].filter(Boolean).map(esc).join(' · ') || 'sem contato: mande o link';
    const quem = c.cadastradas.length ? `<span class="sub">${c.cadastradas.map((p) => `${esc(p.nome)} (${SIT_CADASTRO[p.situacao] || esc(p.situacao)})`).join(', ')}</span>` : '';
    return `<tr class="linha-convite" data-convite="${esc(c.id)}">
      <td><strong>${esc(c.nome)}</strong><span class="sub">${contato}</span>${c.observacao ? `<span class="sub">${esc(c.observacao)}</span>` : ''}</td>
      <td class="cel-situacao"><span class="pill ${cl}">${rot}</span></td>
      <td class="so-mesa">${c.beneficios.length ? `<ul class="beneficio">${c.beneficios.map((b) => `<li>${esc(b[0].toUpperCase() + b.slice(1))}</li>`).join('')}</ul>` : '<span class="sub">só o convite</span>'}</td>
      <td class="n so-mesa num">${c.usos} de ${c.usosMaximos}${quem}</td>
      <td class="n so-mesa num">${c.expiraEm ? data(c.expiraEm) : '—'}<span class="sub">${c.enviadoEm ? `e-mail em ${data(c.enviadoEm)}` : 'sem e-mail'}</span></td>
      <td class="cel-acoes">${c.situacao === 'ativo' ? `<div class="acoes">
        <button class="acao" type="button" data-copiar>Copiar link</button>
        <a class="acao" href="${esc(whatsapp(c))}" target="_blank" rel="noopener">WhatsApp</a>
        ${c.email ? '<button class="acao" type="button" data-reenviar>Reenviar e-mail</button>' : ''}
        <button class="acao perigo" type="button" data-cancelar-convite>Cancelar</button>
      </div><p class="erro" data-erro-convite hidden></p>` : ''}</td>
    </tr>`;
  };
  let convites = [];
  const carregaConvites = async () => {
    const corpo = $('[data-convites]');
    try {
      const r = await chamar('GET', '/api/admin/convites');
      convites = r.convites;
      taxaPadrao = r.taxaPadrao;
      preencheTaxa(); previa();
      $('[data-convites-sub]').innerHTML = `Links de cadastro com taxa menor e prioridade na análise. <strong>${plural(r.resumo.ativos, 'ativo', 'ativos')}</strong>, ${plural(r.resumo.cadastradas, 'profissional cadastrada', 'profissionais cadastradas')} por convite, ${plural(r.resumo.aprovadas, 'já no ar', 'já no ar')}.`;
      $('[data-convites-meta]').textContent = plural(convites.length, 'convite', 'convites');
      corpo.innerHTML = convites.length ? convites.map(linhaConvite).join('') : '<tr><td colspan="6"><p class="vazio">Nenhum convite criado ainda. O primeiro sai pelo formulário acima.</p></td></tr>';
      carimbo();
    } catch (e) { corpo.innerHTML = `<tr><td colspan="6"><p class="erro">Não carregou: ${esc(e.message)}</p></td></tr>`; return; }
    $$('[data-convite]', corpo).forEach((tr) => {
      const c = convites.find((x) => x.id === tr.dataset.convite);
      const erro = $('[data-erro-convite]', tr);
      const falha = (e) => { erro.textContent = e.message; erro.hidden = false; };
      const cp = $('[data-copiar]', tr);
      if (cp) cp.addEventListener('click', () => copiar(origem() + c.link, cp));
      const re = $('[data-reenviar]', tr);
      if (re) re.addEventListener('click', async () => {
        re.disabled = true; erro.hidden = true;
        try { await chamar('POST', `/api/admin/convites/${encodeURIComponent(c.id)}/enviar`); re.textContent = 'E-mail enviado'; } catch (e) { falha(e); re.disabled = false; }
      });
      const ca = $('[data-cancelar-convite]', tr);
      if (ca) window.mc.doisToques(ca, 'Confirmar cancelamento', async () => {
        try { await chamar('POST', `/api/admin/convites/${encodeURIComponent(c.id)}/cancelar`); carregaConvites(); } catch (e) { falha(e); }
      });
    });
  };

  const erroCampo = (campo, msg) => {
    const p = $(`[data-erro="${campo}"]`, form);
    if (!p) return false;
    p.textContent = msg; p.hidden = !msg;
    const el = form.elements[campo];
    if (el) { el.setAttribute('aria-invalid', String(!!msg)); if (msg) { p.id = `erro-c-${campo}`; el.setAttribute('aria-describedby', p.id); } else el.removeAttribute('aria-describedby'); }
    return true;
  };
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    $$('[data-erro]', form).forEach((p) => erroCampo(p.dataset.erro, ''));
    const geral = $('[data-erro-geral]', form); geral.hidden = true;
    const corpo = lerForm();
    if (corpo.nome.length < 2) { erroCampo('nome', 'Para quem é o convite?'); form.nome.focus(); return; }
    if (corpo.enviarEmail && !corpo.email) { erroCampo('email', 'Informe o e-mail para enviar o convite.'); form.email.focus(); return; }
    const botao = $('[data-criar]', form);
    botao.disabled = true;
    try {
      const { convite: c, envio } = await chamar('POST', '/api/admin/convites', corpo);
      const pronto = $('[data-pronto]');
      const link = origem() + c.link;
      pronto.innerHTML = `<p><strong>Convite criado para ${esc(c.nome)}.</strong> ${envio ? (envio.ok ? `O e-mail foi para ${esc(c.email)}.` : `O e-mail não saiu: ${esc(envio.erro)}`) : 'Agora mande o link para ela.'}</p>
        <code class="num">${esc(link)}</code>
        <div class="botoes"><button class="btn pequeno" type="button" data-copiar-novo>Copiar link</button><a class="btn primario pequeno" href="${esc(whatsapp(c))}" target="_blank" rel="noopener">Mandar por WhatsApp</a></div>`;
      pronto.hidden = false;
      $('[data-copiar-novo]', pronto).addEventListener('click', (e) => copiar(link, e.currentTarget));
      form.reset();
      preencheTaxa(); previa();
      carregaConvites();
      pronto.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      let foco = null;
      for (const [campo, msg] of Object.entries(e.campos || {})) if (erroCampo(campo, msg)) foco = foco || form.elements[campo];
      if (foco) foco.focus(); else { geral.textContent = e.message; geral.hidden = false; }
    } finally { botao.disabled = false; }
  });

  // --- início ---
  const comeca = (nome, sair) => {
    $('[data-nome-conta]').textContent = nome;
    $('[data-sair]').addEventListener('click', sair);
    $('[data-fora]').remove();
    $('[data-gestao]').hidden = false;
    preencheTaxa(); previa();
    mostra();
    // o resumo também alimenta as contagens da barra lateral, em qualquer tela
    if (!carregou.has('visao')) { carregou.add('visao'); carregaResumo(); }
  };
  const fora = () => { $('[data-gestao]').remove(); $('[data-fora]').hidden = false; };
  (async () => {
    if (window.mc.comApi) {
      let r = null;
      try { r = await fetch('/api/eu', { credentials: 'same-origin' }); } catch (_) { r = null; }
      const temApi = r && r.status !== 404 && (r.headers.get('content-type') || '').includes('json');
      if (temApi) {
        modoApi = true;
        const eu = r.ok ? (await r.json()).usuario : null;
        if (!eu || !eu.papeis.includes('admin')) { fora(); return; }
        comeca(eu.nome, () => window.mc.sair('mc-admin', '/'));
        return;
      }
    }
    comeca('Equipe', () => { location.href = '/'; });
  })();
})();
