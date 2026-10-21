// Salvar atendimentos na agenda da pessoa: Google, Apple (arquivo .ics) e Outlook.
// Um atendimento: { id, titulo, inicio: Date, fim: Date, local, detalhes }.
// Sem login em nenhum serviço: Google e Outlook abrem a tela de novo evento já preenchida,
// e a Apple recebe um arquivo .ics, que o iPhone e o Mac abrem direto na Agenda.
(() => {
  const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const google = (e) => 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: e.titulo, dates: `${utc(e.inicio)}/${utc(e.fim)}`, details: e.detalhes || '', location: e.local || '',
  });

  const outlook = (e) => 'https://outlook.live.com/calendar/0/action/compose?' + new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent', subject: e.titulo, startdt: e.inicio.toISOString(), enddt: e.fim.toISOString(), body: e.detalhes || '', location: e.local || '',
  });

  // texto do .ics: vírgula, ponto e vírgula e quebra de linha escapados; linhas de até 75 caracteres
  const txt = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const dobra = (linha) => {
    const partes = [];
    for (let i = 0; i < linha.length; i += 73) partes.push((i ? ' ' : '') + linha.slice(i, i + 73));
    return partes.join('\r\n');
  };
  const ics = (eventos, nome) => {
    const agora = utc(new Date());
    const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Minha companhia//Agenda//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${txt(nome || 'Minha companhia')}`];
    eventos.forEach((e) => linhas.push(
      'BEGIN:VEVENT', `UID:${e.id}@minhacompanhia.com.br`, `DTSTAMP:${agora}`, `DTSTART:${utc(e.inicio)}`, `DTEND:${utc(e.fim)}`,
      `SUMMARY:${txt(e.titulo)}`, `LOCATION:${txt(e.local)}`, `DESCRIPTION:${txt(e.detalhes)}`,
      // lembrete uma hora antes
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${txt(e.titulo)}`, 'TRIGGER:-PT1H', 'END:VALARM',
      'END:VEVENT',
    ));
    linhas.push('END:VCALENDAR');
    return linhas.map(dobra).join('\r\n') + '\r\n';
  };
  const baixar = (eventos, arquivo, nome) => {
    const url = URL.createObjectURL(new Blob([ics(eventos, nome)], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: arquivo });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  // menu "Salvar na agenda" ao lado de cada atendimento
  const ICONE = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  let aberto = null;
  const fecha = () => {
    if (!aberto) return;
    aberto.botao.setAttribute('aria-expanded', 'false');
    aberto.menu.hidden = true;
    aberto = null;
  };
  document.addEventListener('click', (ev) => { if (aberto && !aberto.caixa.contains(ev.target)) fecha(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && aberto) { const b = aberto.botao; fecha(); b.focus(); } });

  const menu = (evento, rotulo = 'Salvar na agenda') => {
    const caixa = document.createElement('div');
    caixa.className = 'salvar-agenda';
    const id = `sa-${String(evento.id).replace(/\W/g, '')}`;
    caixa.innerHTML = `<button class="btn btn-secundario sa-botao" type="button" aria-expanded="false" aria-controls="${id}">${ICONE}<span>${rotulo}</span></button>
      <div class="sa-menu" id="${id}" hidden>
        <a href="${google(evento)}" target="_blank" rel="noopener">Google Agenda</a>
        <button type="button" data-apple>Apple (iPhone e Mac)</button>
        <a href="${outlook(evento)}" target="_blank" rel="noopener">Outlook</a>
      </div>`;
    const botao = caixa.querySelector('.sa-botao');
    const lista = caixa.querySelector('.sa-menu');
    botao.addEventListener('click', () => {
      const ja = aberto && aberto.caixa === caixa;
      fecha();
      if (ja) return;
      botao.setAttribute('aria-expanded', 'true');
      lista.hidden = false;
      aberto = { caixa, botao, menu: lista };
      lista.querySelector('a, button').focus();
    });
    caixa.querySelector('[data-apple]').addEventListener('click', () => { baixar([evento], `atendimento-${evento.id}.ics`); fecha(); });
    lista.addEventListener('click', (ev) => { if (ev.target.closest('a')) fecha(); });
    return caixa;
  };

  // lista da agenda por semana: a atividade em destaque, dia e horário numa linha,
  // o status e a ação à direita. Cada item: { id, tarefa, inicio: Date, horas, familia,
  // pessoa, local, valor?, status: [rótulo, classe], acao: 'salvar' | html }.
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const p2 = (n) => String(n).padStart(2, '0');
  const dia = (d) => `${SEM[d.getDay()]}, ${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
  const hora = (d) => `${d.getHours()}h${d.getMinutes() ? p2(d.getMinutes()) : ''}`;
  const segunda = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const fimDe = (a) => new Date(a.inicio.getTime() + a.horas * 3600000);
  const evento = (a) => ({
    id: a.id,
    titulo: `${a.tarefa}${a.pessoa ? ` com ${a.pessoa}` : ''}`,
    inicio: a.inicio,
    fim: fimDe(a),
    local: a.local || '',
    detalhes: `Atendimento pela Minha companhia.\nFamília: ${a.familia}${a.pessoa ? `\nPara: ${a.pessoa}` : ''}\nDetalhes e endereço: ${new URL('painel.html#agenda', location.href).href}`,
  });
  const lista = (caixa, itens) => {
    const hoje = segunda(new Date());
    const grupos = new Map();
    itens.forEach((a) => {
      const n = Math.round((segunda(a.inicio) - hoje) / (7 * 86400000));
      const nome = n <= 0 ? 'Esta semana' : n === 1 ? 'Semana que vem' : 'Mais para a frente';
      if (!grupos.has(nome)) grupos.set(nome, []);
      grupos.get(nome).push(a);
    });
    caixa.innerHTML = [...grupos].map(([nome, doGrupo]) => `<h3 class="ag-grupo">${nome}</h3><ul class="ag-itens">${doGrupo.map((a) => `<li class="ag-item" data-id="${esc(a.id)}">
        <div class="ag-info">
          <p class="ag-tarefa">${esc(a.tarefa)}</p>
          <p class="ag-quando num">${dia(a.inicio)} · ${hora(a.inicio)} às ${hora(fimDe(a))}${a.valor ? ` · ${esc(a.valor)}` : ''}</p>
          <p class="ag-quem">${esc(a.familia)}${a.pessoa ? ` para ${esc(a.pessoa)}` : ''}${a.local ? ` · ${esc(a.local)}` : ''}</p>
        </div>
        <div class="ag-lado">
          <span class="pill ${a.status[1]}">${esc(a.status[0])}</span>
          <div class="ag-acoes">${a.acao === 'salvar' ? '' : a.acao || ''}</div>
        </div>
      </li>`).join('')}</ul>`).join('');
    itens.forEach((a) => {
      if (a.acao !== 'salvar') return;
      const li = [...caixa.querySelectorAll('.ag-item')].find((x) => x.dataset.id === String(a.id));
      li.querySelector('.ag-acoes').append(menu(evento(a)));
    });
  };

  window.mcAgenda = { google, outlook, ics, baixar, menu, lista };
})();
