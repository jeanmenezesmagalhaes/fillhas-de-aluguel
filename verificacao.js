// Cadastro da profissional: confirmar contatos, dados e endereço, documentos, lista de espera e indicações.
// Com a API (api/), tudo vai para o servidor. Sem ela (arquivo aberto direto ou servidor só de páginas),
// a tela roda o mesmo fluxo com dados de exemplo guardados só nesta aba.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const p2 = (n) => String(n).padStart(2, '0');
  const dataHora = (iso) => { const d = new Date(iso); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} às ${d.getHours()}h${d.getMinutes() ? p2(d.getMinutes()) : ''}`; };
  const hora = (iso) => { const d = new Date(iso); return `${d.getHours()}h${p2(d.getMinutes())}`; };
  const tamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const soDigitos = (s) => String(s || '').replace(/\D/g, '');
  const LIMITE = 10 * 1048576;
  const FALTA = { email: 'Confirmar o e-mail', whatsapp: 'Confirmar o WhatsApp', dadosFiscais: 'Informar o CPF', endereco: 'Informar o endereço', documentos: 'Enviar os documentos' };
  const ETAPA_IND = { cadastrada: 'Fez o cadastro', aprovada: 'Perfil aprovado', primeiro_servico: 'Primeiro atendimento feito' };

  // --- exemplo sem API: o mesmo contrato das rotas, num objeto em memória ---
  const cpfValido = (c) => {
    if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
    const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
  };
  const exemplo = (() => {
    const q = new URLSearchParams(location.search).get('exemplo');
    const doc = (tipo, rotulo, situacao = 'pendente', motivoRecusa = null) => ({ tipo, rotulo, situacao, motivoRecusa, arquivo: situacao === 'pendente' ? null : { id: `ex-${tipo}`, nome: `${tipo}.jpg`, tipoArquivo: 'image/jpeg', tamanho: 845000, enviadoEm: new Date().toISOString() } });
    const v = {
      situacao: 'rascunho',
      contatos: { email: { destino: 'jo•••@exemplo.com', verificado: true }, whatsapp: { destino: '(19) •••••-4521', verificado: false } },
      dadosFiscais: null, endereco: null,
      documentos: [doc('documento_identidade', 'Documento com foto (RG ou CNH)'), doc('comprovante_endereco', 'Comprovante de endereço')],
      falta: [], podeEnviar: false, filaDeEspera: null, motivoCorrecao: null,
    };
    if (q === 'espera' || q === 'correcao') {
      v.contatos.whatsapp.verificado = true;
      v.dadosFiscais = { cpf: '•••.•••.•••-09', cnpj: null, razaoSocial: null };
      v.endereco = { cep: '13025-320', logradouro: 'Rua Maria Monteiro', numero: '120', complemento: null, bairro: 'Cambuí', cidade: 'Campinas', uf: 'SP' };
      v.documentos = [doc('documento_identidade', 'Documento com foto (RG ou CNH)', q === 'correcao' ? 'recusado' : 'enviado', q === 'correcao' ? 'A foto saiu cortada e não dá para ler a data de nascimento.' : null), doc('comprovante_endereco', 'Comprovante de endereço', q === 'correcao' ? 'aprovado' : 'enviado')];
      if (q === 'espera') { v.situacao = 'em_analise'; v.filaDeEspera = { desde: new Date(Date.now() - 2 * 86400000).toISOString(), posicao: 3 }; }
      else { v.situacao = 'correcao'; v.motivoCorrecao = 'Recebemos tudo, mas a foto do seu documento saiu cortada. Envie uma foto nova, mostrando o documento inteiro.'; }
    }
    const ind = { codigo: 'JOA-4F8M', links: { profissional: '/entrar.html?perfil=pro&modo=criar&indicacao=JOA-4F8M', familia: '/entrar.html?modo=criar&indicacao=JOA-4F8M' }, resumo: { cadastradas: 2, aprovadas: 1, comPrimeiroServico: 0 }, indicadas: [{ nome: 'Paula M.', tipo: 'profissional', etapa: 'aprovada' }, { nome: 'Sérgio L.', tipo: 'familia', etapa: 'cadastrada' }] };
    const arquivos = {};
    const recalcula = () => {
      const docsOk = v.documentos.every((d) => d.situacao === 'enviado' || d.situacao === 'aprovado');
      v.falta = Object.entries({ email: v.contatos.email.verificado, whatsapp: v.contatos.whatsapp.verificado, dadosFiscais: !!v.dadosFiscais, endereco: !!v.endereco, documentos: docsOk }).filter(([, ok]) => !ok).map(([k]) => k);
      v.podeEnviar = ['rascunho', 'correcao'].includes(v.situacao) && !v.falta.length;
    };
    recalcula();
    const erro = (status, mensagem, campos) => { const e = new Error(mensagem); e.status = status; e.campos = campos; throw e; };
    const travado = () => { if (!['rascunho', 'correcao'].includes(v.situacao)) erro(409, 'Seu cadastro está em conferência. Os dados ficam travados até a resposta da equipe.'); };
    return {
      arquivos,
      async chamar(metodo, url, corpo) {
        await new Promise((r) => setTimeout(r, 250));
        if (url === '/api/profissionais/eu/verificacao') return { verificacao: structuredClone(v) };
        if (url === '/api/indicacoes/eu') return structuredClone(ind);
        if (url === '/api/eu/verificacoes') return { enviadoPara: v.contatos[corpo.canal].destino, expiraEm: new Date(Date.now() + 15 * 60000).toISOString() };
        if (url === '/api/eu/verificacoes/confirmar') {
          if (!/^\d{6}$/.test(corpo.codigo)) erro(422, 'Código incorreto ou expirado.', { codigo: 'Confira os 6 números do código.' });
          v.contatos[corpo.canal].verificado = true; recalcula(); return { verificado: corpo.canal };
        }
        if (url === '/api/profissionais/eu/dados-fiscais') {
          travado();
          const campos = {};
          if (!cpfValido(soDigitos(corpo.cpf))) campos.cpf = 'Confira o CPF: os números não batem.';
          if (corpo.cnpj && soDigitos(corpo.cnpj).length !== 14) campos.cnpj = 'Confira o CNPJ: os números não batem.';
          if (corpo.cnpj && !corpo.razaoSocial) campos.razaoSocial = 'Informe a razão social do CNPJ.';
          const e = corpo.endereco;
          if (soDigitos(e.cep).length !== 8) campos['endereco.cep'] = 'O CEP tem 8 números.';
          if (!e.logradouro) campos['endereco.logradouro'] = 'Informe a rua.';
          if (!e.numero) campos['endereco.numero'] = 'Informe o número.';
          if (!e.bairro) campos['endereco.bairro'] = 'Informe o bairro.';
          if (!e.cidade) campos['endereco.cidade'] = 'Informe a cidade.';
          if (!/^[A-Za-z]{2}$/.test(e.uf || '')) campos['endereco.uf'] = 'Use a sigla do estado, como SP.';
          if (Object.keys(campos).length) erro(422, 'Confira os campos marcados.', campos);
          const c = soDigitos(corpo.cpf);
          v.dadosFiscais = { cpf: `•••.•••.•••-${c.slice(9)}`, cnpj: corpo.cnpj ? `••.•••.•••/••••-${soDigitos(corpo.cnpj).slice(12)}` : null, razaoSocial: corpo.razaoSocial || null };
          v.endereco = { ...e, uf: e.uf.toUpperCase() };
          if (corpo.cnpj && !v.documentos.some((d) => d.tipo === 'cartao_cnpj')) v.documentos.push({ tipo: 'cartao_cnpj', rotulo: 'Cartão CNPJ', situacao: 'pendente', motivoRecusa: null, arquivo: null });
          if (!corpo.cnpj) v.documentos = v.documentos.filter((d) => d.tipo !== 'cartao_cnpj');
          recalcula(); return { verificacao: structuredClone(v) };
        }
        if (url === '/api/profissionais/eu/documentos') {
          travado();
          const tipo = corpo.get('tipo'); const f = corpo.get('arquivo');
          const d = v.documentos.find((x) => x.tipo === tipo);
          d.situacao = 'enviado'; d.motivoRecusa = null;
          d.arquivo = { id: `ex-${tipo}-${Date.now()}`, nome: f.name, tipoArquivo: f.type, tamanho: f.size, enviadoEm: new Date().toISOString() };
          arquivos[d.arquivo.id] = URL.createObjectURL(f);
          recalcula(); return { documento: d, verificacao: structuredClone(v) };
        }
        if (url === '/api/profissionais/eu/analise') {
          travado();
          if (v.falta.length) erro(422, 'Ainda faltam itens para entrar na lista de espera.', Object.fromEntries(v.falta.map((f) => [f, 'Pendente.'])));
          v.situacao = 'em_analise'; v.motivoCorrecao = null; v.filaDeEspera = { desde: new Date().toISOString(), posicao: 4 };
          recalcula(); return { verificacao: structuredClone(v) };
        }
        erro(404, 'Não encontrado.');
      },
    };
  })();

  // --- chamada à API, com corpo JSON ou multipart; o erro traz a mensagem e os campos ---
  let modoApi = false;
  const chamar = async (metodo, url, corpo) => {
    if (!modoApi) return exemplo.chamar(metodo, url, corpo);
    const multipart = corpo instanceof FormData;
    const r = await fetch(url, { method: metodo, credentials: 'same-origin', headers: corpo && !multipart ? { 'content-type': 'application/json' } : {}, body: corpo ? (multipart ? corpo : JSON.stringify(corpo)) : undefined });
    const dados = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) {
      const e = new Error((dados && dados.erro && dados.erro.mensagem) || 'Não foi possível concluir. Tente de novo.');
      e.status = r.status; e.campos = dados && dados.erro && dados.erro.campos; throw e;
    }
    return dados;
  };

  let v = null;
  const editavel = () => ['rascunho', 'correcao'].includes(v.situacao);

  // --- desenho da tela a partir da verificação ---
  const desenha = () => {
    const c = v.contatos;
    const prontas = { contatos: c.email.verificado && c.whatsapp.verificado, dados: !!(v.dadosFiscais && v.endereco), documentos: v.documentos.every((d) => d.situacao === 'enviado' || d.situacao === 'aprovado') };
    const nProntas = Object.values(prontas).filter(Boolean).length;
    const naFila = v.situacao === 'em_analise';
    const aprovada = !['rascunho', 'correcao', 'em_analise'].includes(v.situacao);

    $('[data-correcao]').hidden = v.situacao !== 'correcao';
    $('[data-motivo-correcao]').textContent = v.motivoCorrecao || '';
    $('[data-espera]').hidden = !naFila;
    $('[data-aprovada]').hidden = !aprovada;
    $('[data-etapas-area]').hidden = naFila || aprovada;

    if (naFila) {
      $('[data-titulo]').textContent = 'Cadastro em conferência';
      $('[data-achado]').textContent = 'Recebemos tudo. Agora é com a nossa equipe.';
      $('[data-espera-posicao]').innerHTML = `<span>${v.filaDeEspera.posicao}º</span> na fila`;
      $('[data-espera-desde]').textContent = `Enviado em ${dataHora(v.filaDeEspera.desde)}. Você recebe a resposta por e-mail e WhatsApp.`;
    } else if (aprovada) {
      $('[data-titulo]').textContent = 'Cadastro aprovado';
      $('[data-achado]').textContent = 'Seus documentos foram conferidos.';
    } else {
      const faltam = 3 - nProntas;
      $('[data-titulo]').textContent = v.situacao === 'correcao' ? 'Corrija seu cadastro' : 'Complete seu cadastro';
      $('[data-achado]').textContent = faltam ? `${faltam === 1 ? 'Falta 1 etapa' : `Faltam ${faltam} etapas`} para você entrar na lista de espera.` : 'Tudo pronto. Agora é só enviar para a conferência.';
    }
    $('[data-progresso-rot]').textContent = `${nProntas} de 3 etapas prontas`;
    $('[data-progresso]').style.width = `${(nProntas / 3) * 100}%`;

    // marca de cada etapa: pronta, a próxima a fazer, ou à espera
    const ordem = ['contatos', 'dados', 'documentos'];
    const proxima = ordem.find((e) => !prontas[e]) || 'enviar';
    ['contatos', 'dados', 'documentos', 'enviar'].forEach((e) => {
      const li = $(`[data-etapa="${e}"]`);
      li.classList.toggle('pronta', !!prontas[e]);
      li.classList.toggle('agora', e === proxima);
    });

    // contatos
    ['email', 'whatsapp'].forEach((canal) => {
      const box = $(`[data-canal="${canal}"]`);
      const k = c[canal];
      $('[data-destino]', box).textContent = k.destino;
      const pill = $('[data-estado-canal]', box);
      pill.className = `pill ${k.verificado ? 'pill-ok' : ''}`;
      pill.textContent = k.verificado ? 'Confirmado' : 'Falta confirmar';
      $('[data-canal-acao]', box).hidden = k.verificado || !$('[data-form-codigo]', box).hidden;
      if (k.verificado) $('[data-form-codigo]', box).hidden = true;
    });

    // dados
    const resumo = $('[data-dados-resumo]');
    const form = $('[data-form-dados]');
    if (prontas.dados && !form.dataset.editando) {
      const e = v.endereco; const f = v.dadosFiscais;
      resumo.innerHTML = `<dl class="linhas linhas-curtas"><div><dt>CPF</dt><dd class="num">${esc(f.cpf)}</dd></div>${f.cnpj ? `<div><dt>CNPJ</dt><dd class="num">${esc(f.cnpj)}<small>${esc(f.razaoSocial)}</small></dd></div>` : ''}<div><dt>Endereço</dt><dd>${esc(e.logradouro)}, ${esc(e.numero)}${e.complemento ? ` · ${esc(e.complemento)}` : ''}<small>${esc(e.bairro)}, ${esc(e.cidade)}/${esc(e.uf)} · CEP ${esc(e.cep)}</small></dd></div></dl>${editavel() ? '<button class="link" type="button" data-alterar-dados>Alterar dados</button>' : ''}`;
      resumo.hidden = false; form.hidden = true;
      const alt = $('[data-alterar-dados]', resumo);
      if (alt) alt.addEventListener('click', () => { form.dataset.editando = '1'; preenche(); desenha(); form.cpf.focus(); });
    } else {
      resumo.hidden = true; form.hidden = !editavel();
    }

    // documentos
    const SIT = { pendente: ['', 'Falta enviar'], enviado: ['', 'Enviado, em conferência'], aprovado: ['pill-ok', 'Aprovado'], recusado: ['pill-aviso', 'Precisa enviar de novo'] };
    $('[data-docs]').innerHTML = v.documentos.map((d) => {
      const [cl, rot] = SIT[d.situacao] || ['', d.situacao];
      const pode = editavel() && d.situacao !== 'aprovado';
      const verUrl = d.arquivo ? (modoApi ? `/api/profissionais/eu/documentos/${encodeURIComponent(d.arquivo.id)}/arquivo` : exemplo.arquivos[d.arquivo.id]) : null;
      return `<li class="doc${d.situacao === 'recusado' ? ' doc-recusado' : ''}" data-tipo="${esc(d.tipo)}">
        <div class="doc-cab"><p class="doc-nome">${esc(d.rotulo)}</p><span class="pill ${cl}">${rot}</span></div>
        ${d.motivoRecusa ? `<p class="doc-motivo">${esc(d.motivoRecusa)}</p>` : ''}
        ${d.arquivo ? `<p class="doc-arquivo num">${esc(d.arquivo.nome)} · ${tamanho(d.arquivo.tamanho)}${verUrl ? ` · <a href="${esc(verUrl)}" target="_blank" rel="noopener">Ver o que enviei</a>` : ''}</p>` : ''}
        ${pode ? `<div class="doc-acoes">
          <label class="btn btn-primario doc-botao"><input type="file" accept="image/*" capture="environment" data-arquivo>Tirar foto</label>
          <label class="btn btn-secundario doc-botao"><input type="file" accept="application/pdf,image/jpeg,image/png,image/heic,.heic,.pdf" data-arquivo>${d.arquivo ? 'Trocar arquivo' : 'Escolher arquivo'}</label>
        </div>` : ''}
        <p class="campo-erro" data-erro-doc hidden></p>
        <p class="doc-enviando" data-enviando hidden>Enviando…</p>
      </li>`;
    }).join('');
    $$('[data-docs] [data-arquivo]').forEach((inp) => inp.addEventListener('change', () => enviaDoc(inp)));

    // enviar
    $('[data-falta]').innerHTML = v.falta.length ? v.falta.map((f) => `<li>${FALTA[f] || f}</li>`).join('') : '';
    $('[data-falta]').hidden = !v.falta.length;
    $('[data-enviar-sub]').textContent = v.falta.length ? 'Ainda falta:' : 'Tudo pronto. Ao enviar, você entra na lista de espera e a equipe começa a conferência.';
    $('[data-enviar-analise]').disabled = !v.podeEnviar;
    $('[data-enviar-analise]').textContent = v.situacao === 'correcao' ? 'Enviar de novo para a conferência' : 'Entrar na lista de espera';
  };

  const preenche = () => {
    const f = $('[data-form-dados]'); const e = v.endereco || {};
    f.cpf.value = ''; f.cpf.placeholder = v.dadosFiscais ? `Digite de novo (termina em ${v.dadosFiscais.cpf.slice(-2)})` : '000.000.000-00';
    ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].forEach((k) => { f[k].value = e[k] || ''; });
    const temCnpj = !!(v.dadosFiscais && v.dadosFiscais.cnpj);
    f.temCnpj.checked = temCnpj; $('[data-cnpj-campos]').hidden = !temCnpj;
    f.razaoSocial.value = (v.dadosFiscais && v.dadosFiscais.razaoSocial) || '';
  };

  // --- códigos de confirmação ---
  const relogios = {};
  const pedeCodigo = async (canal) => {
    const box = $(`[data-canal="${canal}"]`);
    const form = $('[data-form-codigo]', box);
    const reenviar = $('[data-reenviar]', box);
    const erro = $('[data-erro]', box);
    try {
      const r = await chamar('POST', '/api/eu/verificacoes', { canal });
      $('[data-canal-acao]', box).hidden = true; form.hidden = false; erro.hidden = true;
      $('[data-codigo-info]', box).textContent = `Enviamos para ${r.enviadoPara}. Vale até ${hora(r.expiraEm)}.`;
      form.codigo.value = ''; form.codigo.focus();
      let s = 60; reenviar.disabled = true; reenviar.textContent = `Reenviar em ${s} s`;
      clearInterval(relogios[canal]);
      relogios[canal] = setInterval(() => { s -= 1; if (s <= 0) { clearInterval(relogios[canal]); reenviar.disabled = false; reenviar.textContent = 'Reenviar código'; } else reenviar.textContent = `Reenviar em ${s} s`; }, 1000);
    } catch (e) {
      form.hidden = false; erro.textContent = e.message; erro.hidden = false;
    }
  };
  $$('[data-canal]').forEach((box) => {
    const canal = box.dataset.canal;
    $('[data-enviar-codigo]', box).addEventListener('click', () => pedeCodigo(canal));
    $('[data-reenviar]', box).addEventListener('click', () => pedeCodigo(canal));
    const form = $('[data-form-codigo]', box);
    form.codigo.addEventListener('input', () => { form.codigo.value = soDigitos(form.codigo.value).slice(0, 6); if (form.codigo.value.length === 6) form.requestSubmit(); });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const erro = $('[data-erro]', box);
      const codigo = soDigitos(form.codigo.value);
      if (codigo.length !== 6) { erro.textContent = 'O código tem 6 números.'; erro.hidden = false; return; }
      const b = $('[type="submit"]', form); b.disabled = true;
      try {
        await chamar('POST', '/api/eu/verificacoes/confirmar', { canal, codigo });
        clearInterval(relogios[canal]);
        v = (await chamar('GET', '/api/profissionais/eu/verificacao')).verificacao;
        desenha();
      } catch (e) {
        erro.textContent = (e.campos && e.campos.codigo) || e.message; erro.hidden = false; form.codigo.select();
      } finally { b.disabled = false; }
    });
  });

  // --- dados e endereço ---
  const mascara = (inp, fmt) => inp.addEventListener('input', () => { inp.value = fmt(soDigitos(inp.value)); });
  const f = $('[data-form-dados]');
  mascara(f.cpf, (d) => d.slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2'));
  mascara(f.cnpj, (d) => d.slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2'));
  mascara(f.cep, (d) => d.slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2'));
  f.uf.addEventListener('input', () => { f.uf.value = f.uf.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 2); });
  $('[data-tem-cnpj]').addEventListener('change', (ev) => { $('[data-cnpj-campos]').hidden = !ev.target.checked; });
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    $$('[data-erro-campo]', f).forEach((p) => { p.hidden = true; });
    $$('[aria-invalid]', f).forEach((i) => i.removeAttribute('aria-invalid'));
    const geral = $('[data-erro-geral]', f); geral.hidden = true;
    const corpo = {
      cpf: f.cpf.value,
      ...(f.temCnpj.checked ? { cnpj: f.cnpj.value, razaoSocial: f.razaoSocial.value.trim() || undefined } : {}),
      endereco: { cep: f.cep.value, logradouro: f.logradouro.value.trim(), numero: f.numero.value.trim(), complemento: f.complemento.value.trim() || undefined, bairro: f.bairro.value.trim(), cidade: f.cidade.value.trim(), uf: f.uf.value.trim() },
    };
    const b = $('[type="submit"]', f); b.disabled = true; b.textContent = 'Salvando…';
    try {
      v = (await chamar('PUT', '/api/profissionais/eu/dados-fiscais', corpo)).verificacao;
      delete f.dataset.editando;
      desenha();
    } catch (e) {
      const campos = e.campos || {};
      let primeiro = null;
      Object.entries(campos).forEach(([k, msg]) => {
        const p = $(`[data-erro-campo="${k}"]`, f) || $(`[data-erro-campo="endereco.${k}"]`, f);
        if (!p) return;
        p.textContent = msg; p.hidden = false;
        const inp = p.previousElementSibling; if (inp) { inp.setAttribute('aria-invalid', 'true'); primeiro = primeiro || inp; }
      });
      if (!primeiro) { geral.textContent = e.message; geral.hidden = false; } else primeiro.focus();
    } finally { b.disabled = false; b.textContent = 'Salvar dados'; }
  });

  // --- documentos ---
  const enviaDoc = async (inp) => {
    const li = inp.closest('[data-tipo]');
    const arq = inp.files && inp.files[0];
    const erro = $('[data-erro-doc]', li);
    if (!arq) return;
    erro.hidden = true;
    if (arq.size > LIMITE) { erro.textContent = 'O arquivo passa de 10 MB. Tire a foto de novo ou escolha um arquivo menor.'; erro.hidden = false; return; }
    const fd = new FormData(); fd.append('tipo', li.dataset.tipo); fd.append('arquivo', arq, arq.name || 'foto.jpg');
    $('[data-enviando]', li).hidden = false; $$('.doc-botao', li).forEach((l) => l.classList.add('ocupado'));
    try {
      v = (await chamar('POST', '/api/profissionais/eu/documentos', fd)).verificacao;
      desenha();
    } catch (e) {
      $('[data-enviando]', li).hidden = true; $$('.doc-botao', li).forEach((l) => l.classList.remove('ocupado'));
      erro.textContent = e.message; erro.hidden = false;
    }
  };

  // --- entrar na lista de espera ---
  $('[data-enviar-analise]').addEventListener('click', async (ev) => {
    const b = ev.currentTarget; const erro = $('[data-erro-enviar]');
    b.disabled = true; erro.hidden = true;
    try {
      v = (await chamar('POST', '/api/profissionais/eu/analise')).verificacao;
      desenha(); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { erro.textContent = e.message; erro.hidden = false; b.disabled = !v.podeEnviar; }
  });

  // --- indicações ---
  const indica = (ind) => {
    const abs = (u) => new URL(u, location.href).href;
    const links = { pro: abs(ind.links.profissional), familia: abs(ind.links.familia) };
    $('[data-codigo-ind]').textContent = ind.codigo;
    $('[data-link-pro]').textContent = links.pro.replace(/^https?:\/\//, '');
    $('[data-link-familia]').textContent = links.familia.replace(/^https?:\/\//, '');
    const msg = {
      pro: `Estou me cadastrando na Minha companhia para acompanhar pessoas idosas em consultas, banco e passeios. Se você também trabalha com isso, faça seu cadastro por este link: ${links.pro}`,
      familia: `Conhece a Minha companhia? Lá você encontra profissionais verificadas para acompanhar sua mãe ou seu pai em consultas, banco e mercado. Cadastre-se por este link: ${links.familia}`,
    };
    $$('[data-whats]').forEach((a) => { a.href = `https://wa.me/?text=${encodeURIComponent(msg[a.dataset.whats])}`; });
    $$('[data-copiar]').forEach((b) => b.addEventListener('click', async () => {
      const t = { codigo: ind.codigo, pro: links.pro, familia: links.familia }[b.dataset.copiar];
      const antes = b.textContent;
      try { await navigator.clipboard.writeText(t); b.textContent = 'Copiado'; } catch (_) { b.textContent = 'Copie acima'; }
      setTimeout(() => { b.textContent = antes; }, 2200);
    }));
    const r = ind.resumo;
    $('[data-ind-resumo]').innerHTML = `<p><strong>${r.cadastradas}</strong><span>${r.cadastradas === 1 ? 'pessoa fez' : 'pessoas fizeram'} o cadastro</span></p><p><strong>${r.aprovadas}</strong><span>${r.aprovadas === 1 ? 'profissional aprovada' : 'profissionais aprovadas'}</span></p><p><strong>${r.comPrimeiroServico}</strong><span>com o primeiro atendimento feito</span></p>`;
    $('[data-ind-lista]').innerHTML = ind.indicadas.length
      ? ind.indicadas.map((i) => `<li><span class="il-nome">${esc(i.nome)}</span><span class="il-tipo">${i.tipo === 'familia' ? 'Família' : 'Profissional'}</span><span class="pill ${i.etapa === 'cadastrada' ? '' : 'pill-ok'}">${ETAPA_IND[i.etapa] || esc(i.etapa)}</span></li>`).join('')
      : '<li class="vazio">Ninguém se cadastrou com o seu código ainda.</li>';
    $('[data-indicacoes]').hidden = false;
  };

  // --- início: com API, confere a sessão; sem API, usa o exemplo com a sessão de demonstração ---
  const fora = () => { $('[data-gestao]').remove(); $('[data-fora]').hidden = false; $('.topo-conta').hidden = true; };
  const comeca = async (nome, sair) => {
    $('[data-fora]').remove();
    $('[data-gestao]').hidden = false;
    $('[data-nome-conta]').textContent = nome;
    $('[data-sair]').addEventListener('click', sair);
    try {
      v = (await chamar('GET', '/api/profissionais/eu/verificacao')).verificacao;
      preenche(); desenha();
    } catch (e) { $('[data-achado]').textContent = e.message; return; }
    try { indica(await chamar('GET', '/api/indicacoes/eu')); } catch (_) { /* indicações aparecem quando a API responder */ }
  };
  (async () => {
    const http = location.protocol === 'http:' || location.protocol === 'https:';
    let r = null;
    if (http) { try { r = await fetch('/api/eu', { credentials: 'same-origin' }); } catch (_) { r = null; } }
    const temApi = r && r.status !== 404 && (r.headers.get('content-type') || '').includes('json');
    if (temApi) {
      modoApi = true;
      const eu = r.ok ? (await r.json()).usuario : null;
      if (!eu || !eu.papeis.includes('profissional')) { fora(); return; }
      comeca(eu.nome, () => (window.mc ? mc.sair('mc-pro', 'profissional.html') : (location.href = 'profissional.html')));
      return;
    }
    let conta = null;
    try { conta = JSON.parse(localStorage.getItem('mc-pro')); } catch (_) { /* sem armazenamento */ }
    if (!conta) { fora(); return; }
    comeca(conta.nome || 'Joana Prado', () => { try { localStorage.removeItem('mc-pro'); } catch (_) { /* sem armazenamento */ } location.href = 'profissional.html'; });
  })();

  // menu no celular
  const topo = $('[data-topo]'); const botao = $('.menu-botao', topo);
  botao.addEventListener('click', () => botao.setAttribute('aria-expanded', String(topo.classList.toggle('menu-aberto'))));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { topo.classList.remove('menu-aberto'); botao.setAttribute('aria-expanded', 'false'); } });
})();
