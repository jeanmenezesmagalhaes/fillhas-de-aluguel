// Meu perfil da profissional: foto, apresentação e bairros, valor da hora, tarefas com o
// mínimo de cada uma, veículo e cursos. Apresentação, bairros, valor e tarefas saem juntos
// no "Salvar" (PATCH /api/profissionais/eu); foto, veículo e cursos salvam na hora.
// Aberta como arquivo ou num servidor só de páginas, usa a conta de exemplo.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const horas = (n) => `${n} h`;
  const tamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const soDigitos = (s) => String(s || '').replace(/\D/g, '');
  const LIMITE = 10 * 1048576;

  const svg = (d) => `<svg viewBox="0 0 28 28" aria-hidden="true">${d}</svg>`;
  const FIXAS = [
    { tipo: 'consulta', nome: 'Consulta ou exame', icone: svg('<rect x="6" y="5" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10 5V3h8v2M14 10v8M10 14h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>') },
    { tipo: 'banco', nome: 'Banco ou cartório', icone: svg('<path d="M4 11L14 4l10 7M6 11v10M11 11v10M17 11v10M22 11v10M3 24h22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>') },
    { tipo: 'mercado', nome: 'Mercado e farmácia', icone: svg('<path d="M3 5h3l3 13h12l3-9H8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="22.5" r="1.8" fill="currentColor"/><circle cx="20" cy="22.5" r="1.8" fill="currentColor"/>') },
    { tipo: 'passeio', nome: 'Passeio', icone: svg('<path d="M14 25v-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M14 3c-5 0-8 4-8 8s3 7 8 7 8-3 8-7-3-8-8-8z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5 25h18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>') },
  ];
  const ICONE_PROPRIA = svg('<path d="M14 6v16M6 14h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>');
  const MIN = 1, MAX = 12, MAX_TAREFAS = 10, MAX_BAIRROS = 30;
  // dias da semana na ordem de leitura (segunda primeiro); 0 é domingo, como na API
  const DIAS = [[1, 'Segunda', 'Seg'], [2, 'Terça', 'Ter'], [3, 'Quarta', 'Qua'], [4, 'Quinta', 'Qui'], [5, 'Sexta', 'Sex'], [6, 'Sábado', 'Sáb'], [0, 'Domingo', 'Dom']];
  const HORARIOS = Array.from({ length: 33 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
  const hh = (t) => { const [h, m] = t.split(':'); return `${Number(h)}h${m === '00' ? '' : m}`; };

  // exemplo: o mesmo que o portfólio da Ana mostra
  const EXEMPLO = {
    nome: 'Ana Oliveira',
    apresentacao: 'Acompanho pessoas idosas em consultas, exames, banco e compras há 6 anos. Sou calma, pontual e gosto de conversar no caminho.',
    bairros: ['Cambuí', 'Taquaral'],
    valorHoraCentavos: 8000,
    tarefas: [
      { tipo: 'consulta', minimoHoras: 2 },
      { tipo: 'banco', minimoHoras: 2 },
      { tipo: 'mercado', minimoHoras: 1 },
      { tipo: 'passeio', minimoHoras: 2 },
    ],
    aceitaOutras: true,
    anosExperiencia: 6,
    descontoAPartirHoras: 4,
    valorHoraDescontoCentavos: 7000,
    disponibilidade: [1, 2, 3, 4, 5].map((dia) => ({ dia, inicio: '08:00', fim: '18:00' })),
    veiculoIncluso: true,
    cursos: [
      { id: 'c1', titulo: 'Cuidador de idosos', instituicao: 'Senac Campinas', cargaHorariaHoras: 160, anoConclusao: 2022, situacao: 'aprovado', motivoRecusa: null, arquivo: { nome: 'certificado-cuidador.pdf', tamanho: 412000 } },
      { id: 'c2', titulo: 'Primeiros socorros', instituicao: 'Cruz Vermelha Brasileira', cargaHorariaHoras: 16, anoConclusao: 2024, situacao: 'aprovado', motivoRecusa: null, arquivo: { nome: 'primeiros-socorros.jpg', tamanho: 630000 } },
    ],
  };

  const form = $('[data-form-valores]');
  const listaFixas = $('[data-fixas]');
  const listaProprias = $('[data-proprias]');
  const msg = $('[data-msg]');
  let modoApi = false;
  let bairros = [];
  let veiculo = false;
  let cursos = [];
  let siglas = '';

  // chamada com arquivo (multipart): no exemplo, finge que a API aceitou
  const envia = async (url, fd) => {
    if (!modoApi) return null;
    const r = await fetch(url, { method: 'POST', credentials: 'same-origin', body: fd });
    const dados = await r.json().catch(() => null);
    if (!r.ok) {
      const e = new Error((dados && dados.erro && dados.erro.mensagem) || 'Não foi possível enviar. Tente de novo.');
      e.status = r.status; e.campos = (dados && dados.erro && dados.erro.campos) || null;
      throw e;
    }
    return dados;
  };

  // --- foto ---
  const marcaFoto = (url, situacao, motivo) => {
    const m = $('[data-foto-motivo]');
    m.textContent = situacao === 'recusada' && motivo ? `A equipe não aprovou: ${motivo} Envie outra.` : '';
    m.hidden = !m.textContent;
    const quadro = $('[data-foto-quadro]');
    quadro.innerHTML = url ? `<img src="${esc(url)}" alt="Sua foto">` : `<span>${esc(siglas)}</span>`;
    const pill = $('[data-foto-pill]');
    const [rot, cor] = { aprovada: ['No perfil', 'pill-ok'], enviada: ['Em conferência', ''], recusada: ['Recusada', 'pill-aviso'] }[situacao] || ['Sem foto', ''];
    pill.textContent = rot; pill.className = `pill ${cor}`.trim();
  };
  $$('[data-foto-input]').forEach((inp) => inp.addEventListener('change', async () => {
    const arq = inp.files && inp.files[0];
    const erro = $('[data-foto-erro]');
    if (!arq) return;
    erro.hidden = true;
    if (arq.size > LIMITE) { erro.textContent = 'A foto passa de 10 MB. Tire de novo ou escolha uma menor.'; erro.hidden = false; return; }
    const fd = new FormData(); fd.append('arquivo', arq, arq.name || 'foto.jpg');
    try {
      const r = await envia('/api/profissionais/eu/foto', fd);
      const foto = r && (r.foto || (r.profissional && r.profissional.foto) || (r.usuario && r.usuario.profissional && r.usuario.profissional.foto));
      marcaFoto(foto ? foto.url : URL.createObjectURL(arq), 'enviada');
    } catch (e) {
      erro.textContent = e.status === 404 ? 'Não deu para enviar a foto agora. Tente de novo mais tarde.' : e.message;
      erro.hidden = false;
    }
    inp.value = '';
  }));

  // --- bairros ---
  const desenhaBairros = () => {
    $('[data-bairros]').innerHTML = bairros.map((b, i) => `<li><span>${esc(b)}</span><button type="button" data-tirar-bairro="${i}" aria-label="Tirar ${esc(b)}">×</button></li>`).join('');
    previa();
  };
  const incluiBairro = () => {
    const campo = $('[data-bairro-novo]');
    const nome = campo.value.trim().replace(/\s+/g, ' ');
    const erro = $('[data-erro="bairros"]');
    erro.hidden = true;
    if (nome.length < 2) { campo.focus(); return; }
    if (bairros.some((b) => b.toLowerCase() === nome.toLowerCase())) { erro.textContent = 'Esse bairro já está na lista.'; erro.hidden = false; return; }
    if (bairros.length >= MAX_BAIRROS) { erro.textContent = `Liste no máximo ${MAX_BAIRROS} bairros.`; erro.hidden = false; return; }
    bairros.push(nome); campo.value = ''; campo.focus();
    msg.textContent = '';
    desenhaBairros();
  };
  $('[data-bairro-add]').addEventListener('click', incluiBairro);
  $('[data-bairro-novo]').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); incluiBairro(); } });
  $('[data-bairros]').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-tirar-bairro]');
    if (!b) return;
    bairros.splice(Number(b.dataset.tirarBairro), 1);
    msg.textContent = '';
    desenhaBairros();
    $('[data-bairro-novo]').focus();
  });

  // --- dias e horários: até dois horários por dia ---
  const opcoes = (sel) => HORARIOS.map((h) => `<option value="${h}"${h === sel ? ' selected' : ''}>${hh(h)}</option>`).join('');
  const faixa = (f, i, rotulo) => `<div class="faixa">
      <label class="vh" for="ini-${rotulo}-${i}">Início</label><select id="ini-${rotulo}-${i}" data-inicio>${opcoes(f.inicio)}</select>
      <span aria-hidden="true">às</span>
      <label class="vh" for="fim-${rotulo}-${i}">Fim</label><select id="fim-${rotulo}-${i}" data-fim>${opcoes(f.fim)}</select>
      ${i ? '<button class="link" type="button" data-tira-faixa>Tirar</button>' : ''}
    </div>`;
  function desenhaDias(disp) {
    $('[data-dias]').innerHTML = DIAS.map(([dia, nome, curto]) => {
      const doDia = disp.filter((f) => f.dia === dia);
      const faixas = doDia.length ? doDia : [{ inicio: '08:00', fim: '18:00' }];
      return `<li class="dia${doDia.length ? '' : ' dia-off'}" data-dia="${dia}">
        <label class="dia-nome"><input type="checkbox" data-atende${doDia.length ? ' checked' : ''}><span>${nome}</span></label>
        <div class="dia-faixas">${faixas.map((f, i) => faixa(f, i, curto)).join('')}${faixas.length < 2 ? '<button class="link dia-mais" type="button" data-mais-faixa>+ outro horário</button>' : ''}</div>
        <span class="dia-folga">Não atende</span>
        <p class="campo-erro" data-erro-dia hidden></p>
      </li>`;
    }).join('');
  }
  // "Seg a sex, 8h às 18h · Sáb, 8h às 12h"
  function resumoDias(disp) {
    if (!disp.length) return 'Qualquer dia e horário';
    const grupos = [];
    DIAS.forEach(([dia, , curto]) => {
      const txt = disp.filter((f) => f.dia === dia).map((f) => `${hh(f.inicio)} às ${hh(f.fim)}`).join(' e ');
      const ult = grupos[grupos.length - 1];
      if (txt && ult && ult.txt === txt && ult.seguido) { ult.fim = curto; return; }
      if (txt) grupos.push({ ini: curto, fim: null, txt, seguido: true });
      else if (ult) ult.seguido = false;
    });
    return grupos.map((g) => `${g.ini}${g.fim ? ` a ${g.fim.toLowerCase()}` : ''}, ${g.txt}`).join(' · ');
  }
  $('[data-dias]').addEventListener('change', (ev) => {
    if (!ev.target.matches('[data-atende]')) return;
    ev.target.closest('li').classList.toggle('dia-off', !ev.target.checked);
  });
  $('[data-dias]').addEventListener('click', (ev) => {
    const li = ev.target.closest('li[data-dia]');
    if (ev.target.closest('[data-mais-faixa]')) {
      const fim = $('.faixa:last-of-type [data-fim]', li).value;
      const ini = HORARIOS.includes(fim) ? HORARIOS[Math.min(HORARIOS.indexOf(fim) + 2, HORARIOS.length - 2)] : '14:00';
      ev.target.closest('[data-mais-faixa]').insertAdjacentHTML('beforebegin', faixa({ inicio: ini, fim: HORARIOS[Math.min(HORARIOS.indexOf(ini) + 8, HORARIOS.length - 1)] }, 1, li.dataset.dia));
      ev.target.closest('[data-mais-faixa]').remove();
      previa();
    }
    if (ev.target.closest('[data-tira-faixa]')) {
      ev.target.closest('.faixa').remove();
      $('.dia-faixas', li).insertAdjacentHTML('beforeend', '<button class="link dia-mais" type="button" data-mais-faixa>+ outro horário</button>');
      previa();
    }
  });

  // --- desconto em pedidos longos ---
  $('[data-desconto-liga]').addEventListener('change', (ev) => {
    $('[data-desconto]').hidden = !ev.target.checked;
    if (ev.target.checked && !form.descontoValor.value) form.descontoValor.focus();
  });

  // --- tarefas ---
  const passos = (rotulo, n, desligado) => `<div class="tf-passos" role="group" aria-label="Mínimo de horas para ${esc(rotulo)}">
      <button type="button" data-passo="-1" aria-label="Uma hora a menos"${desligado || n <= MIN ? ' disabled' : ''}>−</button>
      <output class="num" data-min="${n}">${horas(n)}</output>
      <button type="button" data-passo="1" aria-label="Uma hora a mais"${desligado || n >= MAX ? ' disabled' : ''}>+</button>
    </div>`;

  const linhaFixa = (f, t) => `<li class="tf${t ? '' : ' tf-off'}" data-tipo="${f.tipo}">
      <label class="tf-nome"><input type="checkbox" data-faz${t ? ' checked' : ''}><span class="tf-icone">${f.icone}</span><span>${esc(f.nome)}</span></label>
      ${passos(f.nome, t ? t.minimoHoras : 2, !t)}
    </li>`;

  const linhaPropria = (t) => `<li class="tf tf-propria" data-tipo="personalizada">
      <div class="tf-nome"><span class="tf-icone">${ICONE_PROPRIA}</span><input class="tf-campo" data-nome-propria maxlength="60" value="${esc(t.nome || '')}" placeholder="Nome da atividade" aria-label="Nome da atividade"></div>
      ${passos(t.nome || 'esta atividade', t.minimoHoras || 1)}
      <button class="link tf-tirar" type="button" data-tirar>Tirar</button>
      <p class="campo-erro" data-erro-nome hidden></p>
    </li>`;

  // o que está no formulário, no formato que a API recebe
  const lerTela = () => {
    const tarefas = [];
    $$('li[data-tipo]', listaFixas).forEach((li) => {
      if ($('[data-faz]', li).checked) tarefas.push({ tipo: li.dataset.tipo, minimoHoras: Number($('output', li).dataset.min) });
    });
    $$('li[data-tipo]', listaProprias).forEach((li) => {
      tarefas.push({ tipo: 'personalizada', nome: $('[data-nome-propria]', li).value.trim(), minimoHoras: Number($('output', li).dataset.min) });
    });
    const reais = Number(soDigitos(form.valorHora.value));
    const anos = soDigitos(form.anosExperiencia.value);
    const comDesconto = $('[data-desconto-liga]').checked;
    const descHoras = Number(soDigitos(form.descontoHoras.value));
    const descReais = Number(soDigitos(form.descontoValor.value));
    const disponibilidade = [];
    $$('li[data-dia]', $('[data-dias]')).forEach((li) => {
      if (!$('[data-atende]', li).checked) return;
      $$('.faixa', li).forEach((f) => disponibilidade.push({ dia: Number(li.dataset.dia), inicio: $('[data-inicio]', f).value, fim: $('[data-fim]', f).value }));
    });
    return {
      apresentacao: form.apresentacao.value.trim() || null,
      anosExperiencia: anos === '' ? null : Number(anos),
      bairros: [...bairros],
      valorHoraCentavos: reais ? reais * 100 : null,
      descontoAPartirHoras: comDesconto ? descHoras || null : null,
      valorHoraDescontoCentavos: comDesconto ? (descReais ? descReais * 100 : null) : null,
      tarefas,
      aceitaOutras: $('[data-aceita-outras]').checked,
      disponibilidade,
    };
  };

  const nomeDe = (t) => (t.tipo === 'personalizada' ? t.nome : (FIXAS.find((f) => f.tipo === t.tipo) || {}).nome);

  const previa = () => {
    const d = lerTela();
    $('[data-previa-hora]').innerHTML = (d.valorHoraCentavos ? `<strong>R$ ${d.valorHoraCentavos / 100}</strong> por hora` : 'Defina o valor da hora')
      + (d.descontoAPartirHoras && d.valorHoraDescontoCentavos ? `<small>R$ ${d.valorHoraDescontoCentavos / 100}/h a partir de ${d.descontoAPartirHoras} h</small>` : '');
    const itens = d.tarefas.filter((t) => nomeDe(t)).map((t) => `<li><span>${esc(nomeDe(t))}</span><span class="num">Mínimo ${horas(t.minimoHoras)}</span></li>`);
    if (d.aceitaOutras) itens.push('<li><span>Outra tarefa</span><span>A combinar</span></li>');
    $('[data-previa]').innerHTML = itens.join('') || '<li class="previa-vazia">Nenhuma tarefa marcada ainda.</li>';
    const validados = cursos.filter((c) => c.situacao === 'aprovado').length;
    $('[data-previa-extra]').textContent = [
      resumoDias(d.disponibilidade),
      d.bairros.length ? d.bairros.join(', ') : 'Nenhum bairro listado',
      veiculo ? 'Veículo incluso' : 'Sem veículo',
      validados ? `${validados} ${validados === 1 ? 'curso validado' : 'cursos validados'}` : '',
    ].filter(Boolean).join(' · ');
    const n = d.tarefas.length;
    $('[data-conta-tarefas]').textContent = `${n} de ${MAX_TAREFAS} tarefas${d.aceitaOutras ? ', e outras a combinar' : ''}`;
    // no limite, não dá para marcar nem criar outra: ela tira uma antes
    const cheio = n >= MAX_TAREFAS;
    $('[data-nova]').disabled = cheio;
    $$('[data-faz]', listaFixas).forEach((c) => { if (!c.checked) c.disabled = cheio; });
    $('[data-limite]').hidden = !cheio;
  };

  const desenha = (dados) => {
    form.apresentacao.value = dados.apresentacao || '';
    form.anosExperiencia.value = dados.anosExperiencia ?? '';
    const temDesconto = !!(dados.descontoAPartirHoras && dados.valorHoraDescontoCentavos);
    $('[data-desconto-liga]').checked = temDesconto;
    $('[data-desconto]').hidden = !temDesconto;
    form.descontoHoras.value = dados.descontoAPartirHoras || 4;
    form.descontoValor.value = dados.valorHoraDescontoCentavos ? dados.valorHoraDescontoCentavos / 100 : '';
    desenhaDias(dados.disponibilidade || []);
    bairros = [...(dados.bairros || [])];
    form.valorHora.value = dados.valorHoraCentavos ? dados.valorHoraCentavos / 100 : '';
    const tarefas = dados.tarefas || [];
    listaFixas.innerHTML = FIXAS.map((f) => linhaFixa(f, tarefas.find((t) => t.tipo === f.tipo))).join('');
    listaProprias.innerHTML = tarefas.filter((t) => t.tipo === 'personalizada').map(linhaPropria).join('');
    $('[data-aceita-outras]').checked = !!dados.aceitaOutras;
    veiculo = !!dados.veiculoIncluso;
    marcaVeiculo();
    desenhaBairros();
  };

  const limpaErros = () => {
    $$('.campo-erro', form).forEach((p) => { p.hidden = true; p.textContent = ''; });
    $$('[aria-invalid]', form).forEach((c) => c.removeAttribute('aria-invalid'));
  };
  const marcaErro = (onde, texto, campo) => {
    if (!onde) return;
    onde.textContent = texto; onde.hidden = false;
    if (campo) campo.setAttribute('aria-invalid', 'true');
  };

  // a mesma regra da API, para avisar antes de enviar
  const confere = (d) => {
    let ok = true;
    if (!d.valorHoraCentavos || d.valorHoraCentavos < 7000) { marcaErro($('[data-erro="valorHora"]'), 'Informe um valor de pelo menos R$ 70 por hora.', form.valorHora); ok = false; }
    const vistos = new Set(FIXAS.map((f) => f.nome.toLowerCase()));
    $$('li[data-tipo]', listaProprias).forEach((li) => {
      const campo = $('[data-nome-propria]', li);
      const nome = campo.value.trim();
      const erro = $('[data-erro-nome]', li);
      if (nome.length < 2) { marcaErro(erro, 'Escreva o nome da atividade.', campo); ok = false; return; }
      if (vistos.has(nome.toLowerCase())) { marcaErro(erro, 'Essa atividade já está na lista.', campo); ok = false; return; }
      vistos.add(nome.toLowerCase());
    });
    if (d.anosExperiencia != null && d.anosExperiencia > 60) { marcaErro($('[data-erro="anosExperiencia"]'), 'Informe de 0 a 60 anos.', form.anosExperiencia); ok = false; }
    if ($('[data-desconto-liga]').checked) {
      const erro = $('[data-erro="desconto"]');
      if (!d.descontoAPartirHoras || d.descontoAPartirHoras < 2 || d.descontoAPartirHoras > 12) { marcaErro(erro, 'Escolha de 2 a 12 horas.', form.descontoHoras); ok = false; }
      else if (!d.valorHoraDescontoCentavos || d.valorHoraDescontoCentavos < 7000) { marcaErro(erro, 'O valor menor também precisa ser de pelo menos R$ 70.', form.descontoValor); ok = false; }
      else if (d.valorHoraCentavos && d.valorHoraDescontoCentavos >= d.valorHoraCentavos) { marcaErro(erro, 'O valor menor precisa ficar abaixo do valor da hora.', form.descontoValor); ok = false; }
    }
    $$('li[data-dia]', $('[data-dias]')).forEach((li) => {
      if (!$('[data-atende]', li).checked) return;
      const faixas = $$('.faixa', li).map((f) => [$('[data-inicio]', f).value, $('[data-fim]', f).value]).sort();
      const erro = $('[data-erro-dia]', li);
      if (faixas.some(([a, b]) => b <= a)) { marcaErro(erro, 'O fim precisa ser depois do início.'); ok = false; return; }
      if (faixas.length === 2 && faixas[1][0] < faixas[0][1]) { marcaErro(erro, 'Os dois horários do dia não podem se cruzar.'); ok = false; }
    });
    if (d.tarefas.length > MAX_TAREFAS) { marcaErro($('[data-erro="tarefas"]'), `Escolha no máximo ${MAX_TAREFAS} tarefas.`); ok = false; }
    if (!d.tarefas.length && !d.aceitaOutras) { marcaErro($('[data-erro="tarefas"]'), 'Escolha ao menos uma tarefa ou aceite outras a combinar.'); ok = false; }
    return ok;
  };

  form.addEventListener('click', (ev) => {
    const passo = ev.target.closest('[data-passo]');
    if (passo) {
      const caixa = passo.closest('.tf-passos');
      const out = $('output', caixa);
      const n = Math.min(MAX, Math.max(MIN, Number(out.dataset.min) + Number(passo.dataset.passo)));
      out.dataset.min = n; out.textContent = horas(n);
      $('[data-passo="-1"]', caixa).disabled = n <= MIN;
      $('[data-passo="1"]', caixa).disabled = n >= MAX;
      if (passo.disabled) $(`[data-passo="${-passo.dataset.passo}"]`, caixa).focus();
      msg.textContent = '';
      previa();
      return;
    }
    if (ev.target.closest('[data-tirar]')) { ev.target.closest('li').remove(); previa(); $('[data-nova]').focus(); return; }
    if (ev.target.closest('[data-nova]')) {
      listaProprias.insertAdjacentHTML('beforeend', linhaPropria({ minimoHoras: 1 }));
      $('li:last-child [data-nome-propria]', listaProprias).focus();
      previa();
    }
  });

  form.addEventListener('change', (ev) => {
    if (ev.target.matches('[data-faz]')) {
      const li = ev.target.closest('li');
      li.classList.toggle('tf-off', !ev.target.checked);
      const out = $('output', li);
      $('[data-passo="-1"]', li).disabled = !ev.target.checked || Number(out.dataset.min) <= MIN;
      $('[data-passo="1"]', li).disabled = !ev.target.checked || Number(out.dataset.min) >= MAX;
    }
    previa();
  });
  form.addEventListener('input', () => { msg.textContent = ''; previa(); });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpaErros();
    const d = lerTela();
    if (!confere(d)) { msg.textContent = 'Confira os campos marcados.'; msg.className = 'tf-msg tf-aviso'; const p = $('[aria-invalid="true"]', form); if (p) p.focus(); return; }
    const botao = $('[type="submit"]', form);
    botao.disabled = true; msg.textContent = 'Salvando…'; msg.className = 'tf-msg';
    try {
      if (modoApi) await mc.api('PATCH', '/api/profissionais/eu', d);
      else { try { localStorage.setItem('mc-perfil', JSON.stringify(d)); } catch (_) { /* sem armazenamento */ } }
      msg.textContent = 'Salvo. Seu perfil já mostra as mudanças.';
    } catch (e) {
      msg.textContent = e.message; msg.className = 'tf-msg tf-aviso';
      // erros por campo vêm como "tarefas.2.nome"; a ordem é a mesma de lerTela()
      Object.entries(e.campos || {}).forEach(([chave, texto]) => {
        const m = chave.match(/^tarefas\.(\d+)/);
        if (m) {
          const li = [...$$('li[data-tipo]', listaFixas).filter((x) => $('[data-faz]', x).checked), ...$$('li[data-tipo]', listaProprias)][Number(m[1])];
          marcaErro(li && ($('[data-erro-nome]', li) || $('[data-erro="tarefas"]')), texto, li && $('[data-nome-propria]', li));
        } else if (chave === 'valorHoraCentavos') marcaErro($('[data-erro="valorHora"]'), texto, form.valorHora);
        else if (chave.startsWith('bairros')) marcaErro($('[data-erro="bairros"]'), texto);
        else if (chave === 'anosExperiencia') marcaErro($('[data-erro="anosExperiencia"]'), texto, form.anosExperiencia);
        else if (/^(descontoAPartirHoras|valorHoraDescontoCentavos)/.test(chave)) marcaErro($('[data-erro="desconto"]'), texto);
        else if (chave.startsWith('disponibilidade')) {
          // "disponibilidade.N.campo": a ordem é a mesma de lerTela()
          const n = Number((chave.match(/^disponibilidade\.(\d+)/) || [])[1]);
          const item = lerTela().disponibilidade[n];
          const li = item && $(`li[data-dia="${item.dia}"]`, $('[data-dias]'));
          marcaErro((li && $('[data-erro-dia]', li)) || $('[data-erro="disponibilidade"]'), texto);
        }
        else if (chave === 'apresentacao') marcaErro($('[data-erro="apresentacao"]'), texto, form.apresentacao);
        else marcaErro($('[data-erro="tarefas"]'), texto);
      });
    } finally {
      botao.disabled = false;
    }
  });

  // --- chave Pix do repasse: salva sozinha ---
  const formPix = $('[data-form-pix]');
  const ROTULO_PIX = { CPF: 'CPF', PHONE: 'Celular', EMAIL: 'E-mail', CNPJ: 'CNPJ', RANDOM: 'Chave aleatória' };
  const EXEMPLO_PIX = { CPF: '000.000.000-00', PHONE: '(19) 99999-0000', EMAIL: 'voce@exemplo.com', CNPJ: '00.000.000/0000-00', RANDOM: '0a1b2c3d-…' };
  function marcaPix(pix) {
    const pill = $('[data-pix-pill]');
    pill.className = `pill ${pix ? 'pill-ok' : 'pill-aviso'}`;
    pill.textContent = pix ? `${ROTULO_PIX[pix.tipo]} cadastrado` : 'Falta cadastrar';
    if (pix) { formPix.tipo.value = pix.tipo; formPix.chave.value = pix.chave; }
    formPix.chave.placeholder = EXEMPLO_PIX[formPix.tipo.value];
  }
  formPix.tipo.addEventListener('change', () => { formPix.chave.placeholder = EXEMPLO_PIX[formPix.tipo.value]; });
  formPix.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const msg = $('[data-pix-msg]');
    const erro = $('[data-erro="pix"]', formPix);
    const erroSenha = $('[data-erro="pix-senha"]', formPix);
    erro.hidden = true; erroSenha.hidden = true;
    formPix.senhaAtual.removeAttribute('aria-invalid');
    const pix = { tipo: formPix.tipo.value, chave: formPix.chave.value.trim() };
    if (!pix.chave) { erro.textContent = 'Informe a chave Pix.'; erro.hidden = false; return; }
    msg.textContent = 'Salvando…'; msg.className = 'ex-msg';
    try {
      const salvo = modoApi ? (await mc.api('PATCH', '/api/profissionais/eu', { chavePix: pix, senhaAtual: formPix.senhaAtual.value || undefined })).usuario.profissional.chavePix : pix;
      marcaPix(salvo);
      formPix.senhaAtual.value = '';
      msg.textContent = salvo && salvo.recebeAPartirDe
        ? `Pronto. Por segurança, esta chave recebe repasses a partir de ${new Date(salvo.recebeAPartirDe).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}. Enviamos um aviso para o seu e-mail.`
        : 'Pronto. Os próximos repasses vão para esta chave.';
    } catch (e) {
      msg.textContent = '';
      if (e.campos && e.campos.senhaAtual) {
        erroSenha.textContent = e.campos.senhaAtual; erroSenha.hidden = false;
        formPix.senhaAtual.setAttribute('aria-invalid', 'true'); formPix.senhaAtual.focus();
        return;
      }
      erro.textContent = (e.campos && (e.campos['chavePix.chave'] || e.campos['chavePix.tipo'])) || e.message;
      erro.hidden = false;
    }
  });

  // --- veículo e CNH: salva ao escolher ---
  const veiculoMsg = $('[data-veiculo-msg]');
  const cnh = $('[data-cnh]');
  function marcaVeiculo() {
    $$('[name="veiculo"]').forEach((r) => { r.checked = (r.value === 'sim') === veiculo; });
    const pill = $('[data-veiculo-pill]');
    pill.className = `pill ${veiculo ? 'pill-ok' : ''}`;
    pill.textContent = veiculo ? 'Veículo incluso' : 'Sem veículo';
  }
  $$('[name="veiculo"]').forEach((r) => r.addEventListener('change', async () => {
    const quer = r.value === 'sim';
    if (quer === veiculo) return;
    veiculoMsg.textContent = 'Salvando…'; veiculoMsg.className = 'ex-msg';
    try {
      if (modoApi) await mc.api('PATCH', '/api/profissionais/eu', { veiculoIncluso: quer });
      veiculo = quer;
      veiculoMsg.textContent = quer ? 'Pronto. O veículo aparece no seu perfil.' : 'Pronto. Seu perfil mostra que você atende sem veículo.';
    } catch (e) {
      const emAnalise = e.campos && /análise/.test(e.campos.veiculoIncluso || '');
      veiculoMsg.textContent = emAnalise ? 'Sua CNH ainda está em análise. Quando a equipe aprovar, você pode marcar que leva de carro.' : e.message;
      veiculoMsg.className = 'ex-msg ex-aviso';
      // sem CNH aprovada: ela manda por aqui, e o veículo libera quando a equipe aprovar
      if (e.status === 422 && e.campos && /Envie/.test(e.campos.veiculoIncluso || '')) cnh.hidden = false;
    }
    marcaVeiculo();
    previa();
  }));
  $$('[data-cnh-input]').forEach((inp) => inp.addEventListener('change', async () => {
    const arq = inp.files && inp.files[0];
    const erro = $('[data-cnh-erro]');
    if (!arq) return;
    erro.hidden = true;
    if (arq.size > LIMITE) { erro.textContent = 'O arquivo passa de 10 MB. Tire a foto de novo ou escolha um arquivo menor.'; erro.hidden = false; return; }
    const fd = new FormData(); fd.append('tipo', 'cnh'); fd.append('arquivo', arq, arq.name || 'cnh.jpg');
    try {
      await envia('/api/profissionais/eu/documentos', fd);
      $('[data-cnh-pill]').textContent = 'Enviada, em conferência';
      const info = $('[data-cnh-arquivo]'); info.textContent = `${arq.name} · ${tamanho(arq.size)}`; info.hidden = false;
      $('[data-cnh-acoes]').hidden = true;
      veiculoMsg.textContent = 'Recebemos sua CNH. Quando a equipe aprovar, marque "Sim, levo de carro" de novo.'; veiculoMsg.className = 'ex-msg';
    } catch (e) { erro.textContent = e.message; erro.hidden = false; }
  }));

  // --- cursos ---
  const SIT_CURSO = { enviado: ['', 'Em validação'], aprovado: ['pill-ok', 'Validado'], recusado: ['pill-aviso', 'Recusado'] };
  const desenhaCursos = () => {
    const validados = cursos.filter((c) => c.situacao === 'aprovado').length;
    $('[data-cursos-conta]').textContent = cursos.length ? `${validados} de ${cursos.length} ${cursos.length === 1 ? 'validado' : 'validados'}` : '';
    $('[data-cursos]').innerHTML = cursos.length ? cursos.map((c) => {
      const [cl, rot] = SIT_CURSO[c.situacao] || ['', c.situacao];
      const ver = modoApi ? `/api/profissionais/eu/qualificacoes/${encodeURIComponent(c.id)}/arquivo` : null;
      const detalhes = [c.instituicao, c.cargaHorariaHoras ? `${c.cargaHorariaHoras} h` : null, c.anoConclusao].filter(Boolean).map(esc).join(' · ');
      return `<li class="curso${c.situacao === 'recusado' ? ' doc-recusado' : ''}" data-curso="${esc(c.id)}">
        <div class="doc-cab"><p class="doc-nome">${esc(c.titulo)}</p><span class="pill ${cl}">${rot}</span></div>
        <p class="curso-det num">${detalhes}</p>
        ${c.motivoRecusa ? `<p class="doc-motivo">${esc(c.motivoRecusa)}</p>` : ''}
        <p class="doc-arquivo num">${c.arquivo ? `${esc(c.arquivo.nome)} · ${tamanho(c.arquivo.tamanho)}` : ''}${ver ? ` · <a href="${esc(ver)}" target="_blank" rel="noopener">Ver certificado</a>` : ''} · <button class="link curso-tirar" type="button" data-tirar-curso>Tirar do perfil</button></p>
        <p class="campo-erro" data-erro-tirar hidden></p>
      </li>`;
    }).join('') : '<li class="vazio">Nenhum curso enviado ainda. Cursos validados deixam seu perfil mais forte para as famílias.</li>';
    $$('[data-curso]').forEach((li) => {
      const b = $('[data-tirar-curso]', li);
      b.addEventListener('click', async () => {
        if (!b.dataset.confirmar) { b.dataset.confirmar = '1'; b.textContent = 'Confirmar: tirar este curso'; return; }
        try {
          if (modoApi) await mc.api('DELETE', `/api/profissionais/eu/qualificacoes/${encodeURIComponent(li.dataset.curso)}`);
          cursos = cursos.filter((c) => String(c.id) !== li.dataset.curso);
          desenhaCursos();
        } catch (e) { const p = $('[data-erro-tirar]', li); p.textContent = e.message; p.hidden = false; }
      });
    });
    previa();
  };
  const fc = $('[data-form-curso]');
  let arquivoCurso = null;
  const fechaCurso = () => { fc.hidden = true; fc.reset(); arquivoCurso = null; $('[data-curso-escolhido]').hidden = true; $('[data-novo-curso]').hidden = false; };
  $('[data-novo-curso]').addEventListener('click', (ev) => { fc.hidden = false; ev.currentTarget.hidden = true; fc.titulo.focus(); });
  $('[data-cancelar-curso]').addEventListener('click', fechaCurso);
  $$('[data-curso-arquivo]').forEach((inp) => inp.addEventListener('change', () => {
    const arq = inp.files && inp.files[0]; if (!arq) return;
    arquivoCurso = arq;
    const p = $('[data-curso-escolhido]'); p.textContent = `${arq.name} · ${tamanho(arq.size)}`; p.hidden = false;
  }));
  fc.anoConclusao.addEventListener('input', () => { fc.anoConclusao.value = soDigitos(fc.anoConclusao.value).slice(0, 4); });
  fc.cargaHorariaHoras.addEventListener('input', () => { fc.cargaHorariaHoras.value = soDigitos(fc.cargaHorariaHoras.value).slice(0, 4); });
  fc.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    $$('[data-erro-curso]', fc).forEach((p) => { p.hidden = true; });
    const geral = $('[data-erro-curso="geral"]', fc);
    const erroCampo = (k, t) => { const p = $(`[data-erro-curso="${k}"]`, fc); p.textContent = t; p.hidden = false; };
    if (fc.titulo.value.trim().length < 3) { erroCampo('titulo', 'Informe o nome do curso.'); return; }
    if (fc.instituicao.value.trim().length < 2) { erroCampo('instituicao', 'Informe onde você fez o curso.'); return; }
    if (!arquivoCurso) { geral.textContent = 'Anexe o certificado do curso.'; geral.hidden = false; return; }
    if (arquivoCurso.size > LIMITE) { geral.textContent = 'O certificado passa de 10 MB. Escolha um arquivo menor.'; geral.hidden = false; return; }
    const fd = new FormData();
    fd.append('titulo', fc.titulo.value.trim()); fd.append('instituicao', fc.instituicao.value.trim());
    if (fc.cargaHorariaHoras.value) fd.append('cargaHorariaHoras', fc.cargaHorariaHoras.value);
    if (fc.anoConclusao.value) fd.append('anoConclusao', fc.anoConclusao.value);
    fd.append('arquivo', arquivoCurso, arquivoCurso.name || 'certificado.jpg');
    const b = $('[type="submit"]', fc); b.disabled = true; b.textContent = 'Enviando…';
    try {
      const r = await envia('/api/profissionais/eu/qualificacoes', fd);
      cursos.unshift(r ? r.qualificacao : { id: `n${Date.now()}`, titulo: fc.titulo.value.trim(), instituicao: fc.instituicao.value.trim(), cargaHorariaHoras: Number(fc.cargaHorariaHoras.value) || null, anoConclusao: Number(fc.anoConclusao.value) || null, situacao: 'enviado', motivoRecusa: null, arquivo: { nome: arquivoCurso.name, tamanho: arquivoCurso.size } });
      desenhaCursos();
      fechaCurso();
    } catch (e) {
      let algum = false;
      Object.entries(e.campos || {}).forEach(([k, t]) => { const p = $(`[data-erro-curso="${k}"]`, fc); if (p) { p.textContent = t; p.hidden = false; algum = true; } });
      if (!algum) { geral.textContent = e.message; geral.hidden = false; }
    } finally { b.disabled = false; b.textContent = 'Enviar para validação'; }
  });

  // menu no celular
  const topo = $('[data-topo]');
  const menu = $('.menu-botao', topo);
  menu.addEventListener('click', () => menu.setAttribute('aria-expanded', String(topo.classList.toggle('menu-aberto'))));

  const iniciais = (nome) => String(nome || '').trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  // servidor só de páginas, sem a API: fica o exemplo
  const semApi = async () => {
    if (!(window.mc && mc.comApi)) return true;
    try {
      const r = await fetch('/api/eu', { credentials: 'same-origin' });
      return r.status === 404 || !(r.headers.get('content-type') || '').includes('json');
    } catch (_) { return true; }
  };

  (async () => {
    if (!(await semApi())) {
      const eu = await mc.entrar('profissional');
      if (!eu) return;
      $('[data-gestao]').hidden = false;
      modoApi = true;
      $('[data-nome-conta]').textContent = eu.nome;
      siglas = iniciais(eu.nome); marcaFoto(null);
      $('[data-sair]').addEventListener('click', () => mc.sair('mc-pro', 'profissional'));
      const p = eu.profissional || {};
      // apresentação e bairros vêm do perfil público (a própria profissional vê o seu em qualquer situação)
      let publico = {};
      try { publico = (await mc.api('GET', `/api/profissionais/${encodeURIComponent(p.slug)}`)).profissional; } catch (_) { /* fica em branco */ }
      desenha({ ...publico, ...p, tarefas: p.tarefas || publico.tarefas || [], aceitaOutras: p.aceitaOutras ?? publico.aceitaOutras ?? true });
      marcaPix(p.chavePix || null);
      // a foto nova (em conferência ou recusada) aparece para ela; senão, a que está no ar
      if (p.foto) marcaFoto(p.foto.url, p.foto.situacao, p.foto.motivoRecusa);
      else if (p.fotoUrl || publico.fotoUrl) marcaFoto(p.fotoUrl || publico.fotoUrl, 'aprovada');
      try { cursos = (await mc.api('GET', '/api/profissionais/eu/qualificacoes')).qualificacoes; } catch (_) { cursos = []; }
      desenhaCursos();
      return;
    }
    let conta = null;
    try { conta = JSON.parse(localStorage.getItem('mc-pro')); } catch (_) { /* sem armazenamento */ }
    if (!conta) { $('[data-gestao]').remove(); $('[data-fora]').hidden = false; $('.topo-conta').hidden = true; return; }
    $('[data-fora]').remove();
    $('[data-nome-conta]').textContent = conta.nome;
    siglas = iniciais(conta.nome); marcaFoto(null);
    $('[data-sair]').addEventListener('click', () => { try { localStorage.removeItem('mc-pro'); } catch (_) { /* sem armazenamento */ } location.href = 'profissional'; });
    let salvo = null;
    try { salvo = JSON.parse(localStorage.getItem('mc-perfil')); } catch (_) { /* sem armazenamento */ }
    desenha({ ...EXEMPLO, ...(salvo || {}) });
    marcaPix(null);
    cursos = EXEMPLO.cursos.map((c) => ({ ...c }));
    desenhaCursos();
  })();
})();
