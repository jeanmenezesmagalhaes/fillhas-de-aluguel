// Administração: a lista de espera em ordem de envio e a ficha de cada profissional, com a conferência
// documento por documento. Com a API, usa as rotas /api/admin; sem ela, roda com dados de exemplo.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const p2 = (n) => String(n).padStart(2, '0');
  const dataHora = (iso) => { const d = new Date(iso); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} às ${d.getHours()}h${d.getMinutes() ? p2(d.getMinutes()) : ''}`; };
  const ha = (iso) => { const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); return dias <= 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`; };
  const tamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const cpf = (c) => (c && c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c || '—');
  const cnpj = (c) => (c && c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : c || '—');
  const fone = (c) => { const d = String(c || '').replace(/\D/g, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : c || '—'; };
  const cep = (c) => (c && c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c || '');
  const SIT_DOC = { enviado: ['', 'Para conferir'], aprovado: ['pill-ok', 'Aprovado'], recusado: ['pill-aviso', 'Recusado'], substituido: ['', 'Substituído'] };

  // --- exemplo sem API ---
  const exemplo = (() => {
    const dia = (n, h) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 12, 0, 0); return d.toISOString(); };
    const img = (t) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#f2f5f2"/><rect x="40" y="40" width="560" height="320" rx="16" fill="#fff" stroke="#cfd6d0"/><text x="80" y="120" font-family="sans-serif" font-size="28" fill="#10251e">${t}</text><text x="80" y="170" font-family="sans-serif" font-size="18" fill="#55695f">Arquivo de exemplo</text></svg>`)}`;
    const doc = (id, tipo, nome, situacao, enviadoEm, motivoRecusa = null) => ({ id, tipo, nomeOriginal: nome, tipoArquivo: 'image/jpeg', tamanho: 845000 + id.length * 1000, situacao, motivoRecusa, enviadoEm, revisadoEm: situacao === 'enviado' ? null : enviadoEm, url: img(nome) });
    const pros = {
      p1: { id: 'p1', nome: 'Patrícia Gomes', email: 'patricia@exemplo.com', celular: '19988776655', emailVerificadoEm: dia(5, 9), celularVerificadoEm: dia(5, 9), situacao: 'em_analise', cidadeAtendimento: 'Campinas/SP', cpf: '52998224725', cnpj: null, razaoSocial: null, endereco: { cep: '13084760', logradouro: 'Rua Guilherme da Motta Correa', numero: '450', complemento: null, bairro: 'Castelo', cidade: 'Campinas', uf: 'SP' }, enviadoAnaliseEm: dia(4, 15), indicadoPor: null, documentosExigidos: [{ tipo: 'documento_identidade', rotulo: 'Documento com foto (RG ou CNH)' }, { tipo: 'comprovante_endereco', rotulo: 'Comprovante de endereço' }], documentos: [doc('d1', 'documento_identidade', 'rg-frente-verso.jpg', 'aprovado', dia(4, 14)), doc('d2', 'comprovante_endereco', 'conta-de-luz.pdf', 'enviado', dia(4, 14))] },
      p2: { id: 'p2', nome: 'Joana Prado', email: 'joana@exemplo.com', celular: '19991234521', emailVerificadoEm: dia(3, 10), celularVerificadoEm: dia(3, 10), situacao: 'em_analise', cidadeAtendimento: 'Campinas/SP', cpf: '11144477735', cnpj: '11222333000181', razaoSocial: 'Joana Prado Acompanhamentos MEI', endereco: { cep: '13025320', logradouro: 'Rua Maria Monteiro', numero: '87', complemento: 'apto 12', bairro: 'Cambuí', cidade: 'Campinas', uf: 'SP' }, enviadoAnaliseEm: dia(2, 11), indicadoPor: { nome: 'Ana Oliveira', codigo: 'ANA-DEMO' }, documentosExigidos: [{ tipo: 'documento_identidade', rotulo: 'Documento com foto (RG ou CNH)' }, { tipo: 'comprovante_endereco', rotulo: 'Comprovante de endereço' }, { tipo: 'cartao_cnpj', rotulo: 'Cartão CNPJ' }], documentos: [doc('d3', 'documento_identidade', 'cnh.jpg', 'enviado', dia(2, 10)), doc('d4', 'comprovante_endereco', 'conta-de-agua.jpg', 'enviado', dia(2, 10)), doc('d5', 'cartao_cnpj', 'cartao-cnpj.pdf', 'enviado', dia(2, 10))] },
      p3: { id: 'p3', nome: 'Roberto Lima', email: 'roberto@exemplo.com', celular: '19977665544', emailVerificadoEm: dia(1, 8), celularVerificadoEm: dia(1, 8), situacao: 'em_analise', cidadeAtendimento: 'Campinas/SP', cpf: '39053344705', cnpj: null, razaoSocial: null, endereco: { cep: '13083970', logradouro: 'Avenida Albino J. B. de Oliveira', numero: '1200', complemento: null, bairro: 'Barão Geraldo', cidade: 'Campinas', uf: 'SP' }, enviadoAnaliseEm: dia(0, 9), indicadoPor: null, documentosExigidos: [{ tipo: 'documento_identidade', rotulo: 'Documento com foto (RG ou CNH)' }, { tipo: 'comprovante_endereco', rotulo: 'Comprovante de endereço' }], documentos: [doc('d6', 'documento_identidade', 'rg.jpg', 'recusado', dia(1, 8), 'A foto saiu escura e não dá para ler o número.'), doc('d7', 'documento_identidade', 'rg-nova-foto.jpg', 'enviado', dia(0, 8)), doc('d8', 'comprovante_endereco', 'fatura-celular.pdf', 'enviado', dia(0, 8))] },
    };
    const erro = (status, mensagem) => { const e = new Error(mensagem); e.status = status; throw e; };
    return {
      async chamar(metodo, url, corpo) {
        await new Promise((r) => setTimeout(r, 200));
        if (url === '/api/admin/fila') {
          const fila = Object.values(pros).filter((p) => p.situacao === 'em_analise').sort((a, b) => a.enviadoAnaliseEm.localeCompare(b.enviadoAnaliseEm));
          return { fila: fila.map((p, i) => ({ id: p.id, nome: p.nome, cidade: p.cidadeAtendimento.split('/')[0], uf: p.cidadeAtendimento.split('/')[1], enviadoEm: p.enviadoAnaliseEm, indicadoPor: p.indicadoPor ? p.indicadoPor.nome : null, posicao: i + 1 })) };
        }
        let m = url.match(/^\/api\/admin\/profissionais\/([^/]+)$/);
        if (m) return { profissional: structuredClone(pros[m[1]]) };
        m = url.match(/^\/api\/admin\/documentos\/([^/]+)\/(aprovar|recusar)$/);
        if (m) {
          const d = Object.values(pros).flatMap((p) => p.documentos).find((x) => x.id === m[1]);
          if (!d || d.situacao !== 'enviado') erro(409, 'Este documento já foi revisado ou foi substituído.');
          d.situacao = m[2] === 'aprovar' ? 'aprovado' : 'recusado'; d.motivoRecusa = corpo && corpo.motivo ? corpo.motivo : null; d.revisadoEm = new Date().toISOString();
          return { documento: d };
        }
        m = url.match(/^\/api\/admin\/profissionais\/([^/]+)\/(aprovar|correcao)$/);
        if (m) {
          const p = pros[m[1]];
          if (m[2] === 'aprovar') {
            const pend = p.documentosExigidos.filter((t) => { const atual = [...p.documentos].reverse().find((d) => d.tipo === t.tipo && d.situacao !== 'substituido'); return !atual || atual.situacao !== 'aprovado'; });
            if (pend.length) erro(422, `Aprove antes: ${pend.map((t) => t.rotulo).join(', ')}.`);
            p.situacao = 'aprovado';
          } else { p.situacao = 'correcao'; p.motivoCorrecao = corpo.motivo; }
          return { ok: true };
        }
        erro(404, 'Não encontrado.');
      },
      url: (id) => Object.values(pros).flatMap((p) => p.documentos).find((d) => d.id === id)?.url,
    };
  })();

  let modoApi = false;
  const chamar = async (metodo, url, corpo) => {
    if (!modoApi) return exemplo.chamar(metodo, url, corpo);
    const r = await fetch(url, { method: metodo, credentials: 'same-origin', headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined });
    const dados = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) { const e = new Error((dados && dados.erro && dados.erro.mensagem) || 'Não foi possível concluir. Tente de novo.'); e.status = r.status; throw e; }
    return dados;
  };
  const urlArquivo = (id) => (modoApi ? `/api/admin/documentos/${encodeURIComponent(id)}/arquivo` : exemplo.url(id));

  let fila = [];
  let atual = null;

  const desenhaFila = () => {
    $('[data-conta-fila]').textContent = `${fila.length} ${fila.length === 1 ? 'profissional' : 'profissionais'}`;
    $('[data-achado]').textContent = fila.length
      ? `${fila.length === 1 ? '1 profissional espera' : `${fila.length} profissionais esperam`} a conferência. A primeira enviou ${ha(fila[0].enviadoEm)}.`
      : 'Ninguém esperando a conferência agora.';
    $('[data-fila]').innerHTML = fila.length ? fila.map((p) => `<li><button type="button" class="fila-item${atual === p.id ? ' ativa' : ''}" data-abrir="${esc(p.id)}" aria-pressed="${atual === p.id}">
        <span class="fi-pos num">${p.posicao}º</span>
        <span class="fi-quem"><strong>${esc(p.nome)}</strong><small>${esc(p.cidade)}/${esc(p.uf)}${p.indicadoPor ? ` · indicada por ${esc(p.indicadoPor)}` : ''}</small></span>
        <span class="fi-quando num">${ha(p.enviadoEm)}</span>
      </button></li>`).join('') : '<li class="vazio">A lista de espera está vazia.</li>';
    $$('[data-abrir]').forEach((b) => b.addEventListener('click', () => abre(b.dataset.abrir)));
  };

  const abre = async (id) => {
    atual = id; desenhaFila();
    const corpo = $('[data-ficha-corpo]');
    try {
      const { profissional: p } = await chamar('GET', `/api/admin/profissionais/${encodeURIComponent(id)}`);
      desenhaFicha(p);
      if (matchMedia('(max-width: 900px)').matches) $('[data-ficha]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { corpo.hidden = false; $('[data-sem-ficha]').hidden = true; corpo.innerHTML = `<p class="campo-erro">${esc(e.message)}</p>`; }
  };

  const desenhaFicha = (p) => {
    const corpo = $('[data-ficha-corpo]');
    // documento atual de cada tipo exigido: o envio mais recente que não foi substituído
    const atualDe = (tipo) => [...p.documentos].filter((d) => d.tipo === tipo && d.situacao !== 'substituido').sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm))[0];
    const exigidos = p.documentosExigidos.map((t) => ({ ...t, doc: atualDe(t.tipo) }));
    const todosOk = exigidos.every((t) => t.doc && t.doc.situacao === 'aprovado');
    const anteriores = p.documentos.filter((d) => !exigidos.some((t) => t.doc && t.doc.id === d.id));
    const e = p.endereco || {};
    const ok = (v) => (v ? '<span class="pill pill-ok">Confirmado</span>' : '<span class="pill pill-aviso">Não confirmado</span>');
    corpo.innerHTML = `
      <div class="ficha-topo">
        <div><p class="ficha-nome">${esc(p.nome)}</p><p class="ficha-sub num">Atende em ${esc(p.cidadeAtendimento)} · enviou em ${p.enviadoAnaliseEm ? dataHora(p.enviadoAnaliseEm) : '—'}</p></div>
        ${p.indicadoPor ? `<span class="pill">Indicada por ${esc(p.indicadoPor.nome)} · ${esc(p.indicadoPor.codigo)}</span>` : ''}
      </div>
      <div class="ficha-blocos">
        <div class="ficha-bloco"><h3>Contatos</h3><dl class="linhas linhas-curtas">
          <div><dt>E-mail</dt><dd>${esc(p.email)} ${ok(p.emailVerificadoEm)}</dd></div>
          <div><dt>WhatsApp</dt><dd class="num">${esc(fone(p.celular))} ${ok(p.celularVerificadoEm)}</dd></div>
        </dl></div>
        <div class="ficha-bloco"><h3>Dados e endereço</h3><dl class="linhas linhas-curtas">
          <div><dt>CPF</dt><dd class="num">${cpf(p.cpf)}</dd></div>
          ${p.cnpj ? `<div><dt>CNPJ</dt><dd class="num">${cnpj(p.cnpj)}<small>${esc(p.razaoSocial)}</small></dd></div>` : ''}
          <div><dt>Endereço</dt><dd>${esc(e.logradouro)}, ${esc(e.numero)}${e.complemento ? ` · ${esc(e.complemento)}` : ''}<small>${esc(e.bairro)}, ${esc(e.cidade)}/${esc(e.uf)} · CEP ${cep(e.cep)}</small></dd></div>
        </dl></div>
      </div>
      <h3 class="ficha-h3">Documentos</h3>
      <ul class="docs">${exigidos.map((t) => {
        const d = t.doc;
        if (!d) return `<li class="doc"><div class="doc-cab"><p class="doc-nome">${esc(t.rotulo)}</p><span class="pill pill-aviso">Não enviado</span></div></li>`;
        const [cl, rot] = SIT_DOC[d.situacao] || ['', d.situacao];
        return `<li class="doc${d.situacao === 'recusado' ? ' doc-recusado' : ''}" data-doc="${esc(d.id)}">
          <div class="doc-cab"><p class="doc-nome">${esc(t.rotulo)}</p><span class="pill ${cl}">${rot}</span></div>
          <p class="doc-arquivo num">${esc(d.nomeOriginal)} · ${tamanho(d.tamanho)} · enviado em ${dataHora(d.enviadoEm)} · <a href="${esc(urlArquivo(d.id))}" target="_blank" rel="noopener">Abrir documento</a></p>
          ${d.motivoRecusa ? `<p class="doc-motivo">Motivo: ${esc(d.motivoRecusa)}</p>` : ''}
          ${d.situacao === 'enviado' ? `<div class="doc-acoes"><button class="btn btn-primario" type="button" data-aprovar-doc>Aprovar</button><button class="btn btn-secundario" type="button" data-recusar-doc>Recusar</button></div>
          <form class="motivo" data-form-recusa hidden><label>Por que recusar? A profissional vai ler este texto.<textarea name="motivo" rows="2" maxlength="500" placeholder="Ex.: A foto saiu cortada e não dá para ler a data de nascimento."></textarea></label><div class="doc-acoes"><button class="btn btn-primario" type="submit">Recusar documento</button><button class="link" type="button" data-cancelar>Cancelar</button></div></form>` : ''}
          <p class="campo-erro" data-erro-doc hidden></p>
        </li>`;
      }).join('')}</ul>
      ${anteriores.length ? `<details class="historico"><summary>Envios anteriores (${anteriores.length})</summary><ul>${anteriores.map((d) => `<li class="num">${esc(d.nomeOriginal)} · ${dataHora(d.enviadoEm)} · ${(SIT_DOC[d.situacao] || ['', d.situacao])[1]}${d.motivoRecusa ? ` · ${esc(d.motivoRecusa)}` : ''} · <a href="${esc(urlArquivo(d.id))}" target="_blank" rel="noopener">Abrir</a></li>`).join('')}</ul></details>` : ''}
      <div class="decisao">
        <h3 class="ficha-h3">Decisão</h3>
        <p class="decisao-sub">${todosOk ? 'Todos os documentos foram aprovados. Ao aprovar, o perfil vai ao ar e a próxima revisão fica marcada para daqui a um mês.' : 'Para aprovar o perfil, aprove antes todos os documentos.'}</p>
        <div class="doc-acoes"><button class="btn btn-primario" type="button" data-aprovar-perfil${todosOk ? '' : ' disabled'}>Aprovar perfil</button><button class="btn btn-secundario" type="button" data-pedir-correcao>Pedir correção</button></div>
        <form class="motivo" data-form-correcao hidden><label>O que ela precisa corrigir? Ela recebe este texto por e-mail e na tela do cadastro.<textarea name="motivo" rows="3" maxlength="800" placeholder="Ex.: Recebemos tudo, mas a foto do seu documento saiu cortada. Envie uma foto nova, mostrando o documento inteiro."></textarea></label><div class="doc-acoes"><button class="btn btn-primario" type="submit">Devolver para correção</button><button class="link" type="button" data-cancelar>Cancelar</button></div></form>
        <p class="campo-erro" data-erro-decisao hidden></p>
      </div>`;
    corpo.hidden = false; $('[data-sem-ficha]').hidden = true;

    const recarrega = async (sairDaFila) => {
      fila = (await chamar('GET', '/api/admin/fila')).fila;
      if (sairDaFila) { atual = null; $('[data-ficha-corpo]').hidden = true; $('[data-sem-ficha]').hidden = false; $('[data-sem-ficha]').textContent = sairDaFila; desenhaFila(); return; }
      desenhaFila(); abre(p.id);
    };
    $$('[data-doc]', corpo).forEach((li) => {
      const id = li.dataset.doc; const erro = $('[data-erro-doc]', li);
      const falha = (e) => { erro.textContent = e.message; erro.hidden = false; };
      const ap = $('[data-aprovar-doc]', li); const rc = $('[data-recusar-doc]', li); const fr = $('[data-form-recusa]', li);
      if (ap) ap.addEventListener('click', async () => { ap.disabled = true; try { await chamar('POST', `/api/admin/documentos/${encodeURIComponent(id)}/aprovar`); recarrega(); } catch (e) { falha(e); ap.disabled = false; } });
      if (rc) rc.addEventListener('click', () => { fr.hidden = false; fr.motivo.focus(); });
      if (fr) {
        $('[data-cancelar]', fr).addEventListener('click', () => { fr.hidden = true; });
        fr.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const motivo = fr.motivo.value.trim();
          if (motivo.length < 5) { erro.textContent = 'Escreva o motivo para a profissional entender o que mudar.'; erro.hidden = false; return; }
          try { await chamar('POST', `/api/admin/documentos/${encodeURIComponent(id)}/recusar`, { motivo }); recarrega(); } catch (e) { falha(e); }
        });
      }
    });
    const erroD = $('[data-erro-decisao]', corpo);
    $('[data-aprovar-perfil]', corpo).addEventListener('click', async (ev) => {
      ev.currentTarget.disabled = true;
      try { await chamar('POST', `/api/admin/profissionais/${encodeURIComponent(p.id)}/aprovar`); recarrega(`${p.nome} foi aprovada. O perfil já está no ar.`); } catch (e) { erroD.textContent = e.message; erroD.hidden = false; ev.currentTarget.disabled = false; }
    });
    const fc = $('[data-form-correcao]', corpo);
    $('[data-pedir-correcao]', corpo).addEventListener('click', () => { fc.hidden = false; fc.motivo.focus(); });
    $('[data-cancelar]', fc).addEventListener('click', () => { fc.hidden = true; });
    fc.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const motivo = fc.motivo.value.trim();
      if (motivo.length < 5) { erroD.textContent = 'Escreva o que ela precisa corrigir.'; erroD.hidden = false; return; }
      try { await chamar('POST', `/api/admin/profissionais/${encodeURIComponent(p.id)}/correcao`, { motivo }); recarrega(`O cadastro de ${p.nome} voltou para correção. Ela recebe o aviso.`); } catch (e) { erroD.textContent = e.message; erroD.hidden = false; }
    });
  };

  const comeca = async (nome, sair) => {
    $('[data-fora]').remove(); $('[data-gestao]').hidden = false;
    $('[data-nome-conta]').textContent = nome;
    $('[data-sair]').addEventListener('click', sair);
    try { fila = (await chamar('GET', '/api/admin/fila')).fila; desenhaFila(); if (fila[0] && matchMedia('(min-width: 901px)').matches) abre(fila[0].id); } catch (e) { $('[data-achado]').textContent = e.message; }
  };
  (async () => {
    const http = location.protocol === 'http:' || location.protocol === 'https:';
    let r = null;
    if (http) { try { r = await fetch('/api/eu', { credentials: 'same-origin' }); } catch (_) { r = null; } }
    const temApi = r && r.status !== 404 && (r.headers.get('content-type') || '').includes('json');
    if (temApi) {
      modoApi = true;
      const eu = r.ok ? (await r.json()).usuario : null;
      if (!eu || !eu.papeis.includes('admin')) { $('[data-gestao]').remove(); $('[data-fora]').hidden = false; $('.topo-conta').hidden = true; return; }
      comeca(eu.nome, () => (window.mc ? mc.sair('mc-admin', 'index.html') : (location.href = 'index.html')));
      return;
    }
    comeca('Equipe', () => { location.href = 'index.html'; });
  })();
})();
