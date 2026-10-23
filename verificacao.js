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
      veiculoIncluso: false,
      situacao: 'rascunho',
      contatos: { email: { destino: 'jo•••@exemplo.com', verificado: true }, whatsapp: { destino: '(19) •••••-4521', verificado: false, exigido: false } },
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
    if (q === 'aprovada') { v.situacao = 'aprovado'; v.contatos.whatsapp.verificado = true; v.dadosFiscais = { cpf: '•••.•••.•••-09', cnpj: null, razaoSocial: null }; v.endereco = { cep: '13025-320', logradouro: 'Rua Maria Monteiro', numero: '120', complemento: null, bairro: 'Cambuí', cidade: 'Campinas', uf: 'SP' }; v.documentos.forEach((d) => { d.situacao = 'aprovado'; d.arquivo = { id: `ex-${d.tipo}`, nome: `${d.tipo}.jpg`, tipoArquivo: 'image/jpeg', tamanho: 845000, enviadoEm: new Date().toISOString() }; }); }
    let cnhAvulsa = null;
    const cursos = [
      { id: 'c1', titulo: 'Cuidador de idosos', instituicao: 'Senac Campinas', cargaHorariaHoras: 160, anoConclusao: 2022, situacao: 'aprovado', motivoRecusa: null, enviadoEm: new Date(Date.now() - 9 * 86400000).toISOString(), revisadoEm: new Date(Date.now() - 8 * 86400000).toISOString(), arquivo: { nome: 'certificado-cuidador.pdf', tipoArquivo: 'application/pdf', tamanho: 412000 } },
      { id: 'c2', titulo: 'Primeiros socorros', instituicao: 'Cruz Vermelha Brasileira', cargaHorariaHoras: 16, anoConclusao: 2024, situacao: 'enviado', motivoRecusa: null, enviadoEm: new Date(Date.now() - 86400000).toISOString(), revisadoEm: null, arquivo: { nome: 'primeiros-socorros.jpg', tipoArquivo: 'image/jpeg', tamanho: 630000 } },
    ];
    const ind = { codigo: 'JOA-4F8M', links: { profissional: '/entrar?perfil=pro&modo=criar&indicacao=JOA-4F8M', familia: '/entrar?modo=criar&indicacao=JOA-4F8M' }, resumo: { cadastradas: 2, aprovadas: 1, comPrimeiroServico: 0 }, indicadas: [{ nome: 'Paula M.', tipo: 'profissional', etapa: 'aprovada' }, { nome: 'Sérgio L.', tipo: 'familia', etapa: 'cadastrada' }] };
    const arquivos = {};
    const recalcula = () => {
      const docsOk = v.documentos.every((d) => d.situacao === 'enviado' || d.situacao === 'aprovado');
      v.falta = Object.entries({ email: v.contatos.email.verificado, whatsapp: !v.contatos.whatsapp.exigido || v.contatos.whatsapp.verificado, dadosFiscais: !!v.dadosFiscais, endereco: !!v.endereco, documentos: docsOk }).filter(([, ok]) => !ok).map(([k]) => k);
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
        if (url === '/api/profissionais/eu' && metodo === 'PATCH') {
          if (corpo.veiculoIncluso && !v.veiculoIncluso) {
            if (v.situacao === 'em_analise') erro(409, 'Seu cadastro está na lista de espera. Depois da aprovação, você pode passar a oferecer veículo.');
            if (v.situacao === 'aprovado' && (!cnhAvulsa || cnhAvulsa.situacao !== 'aprovado')) erro(422, 'Para oferecer veículo, envie sua CNH. Ela passa pela nossa análise e, aprovada, o veículo aparece no seu perfil.', { veiculoIncluso: cnhAvulsa ? 'Sua CNH ainda está em análise.' : 'Envie sua CNH primeiro.' });
          }
          v.veiculoIncluso = !!corpo.veiculoIncluso;
          if (['rascunho', 'correcao'].includes(v.situacao)) {
            if (v.veiculoIncluso && !v.documentos.some((d) => d.tipo === 'cnh')) v.documentos.push({ tipo: 'cnh', rotulo: 'CNH (para quem atende com veículo)', situacao: 'pendente', motivoRecusa: null, arquivo: null });
            if (!v.veiculoIncluso) v.documentos = v.documentos.filter((d) => d.tipo !== 'cnh');
            recalcula();
          }
          return { usuario: {} };
        }
        if (url === '/api/profissionais/eu/qualificacoes' && metodo === 'GET') return { qualificacoes: structuredClone(cursos) };
        if (url === '/api/profissionais/eu/qualificacoes' && metodo === 'POST') {
          const campos = {};
          if ((corpo.get('titulo') || '').trim().length < 3) campos.titulo = 'Informe o nome do curso.';
          if ((corpo.get('instituicao') || '').trim().length < 2) campos.instituicao = 'Informe onde você fez o curso.';
          if (Object.keys(campos).length) erro(422, 'Confira os campos marcados.', campos);
          const f2 = corpo.get('arquivo');
          const c = { id: `c${Date.now()}`, titulo: corpo.get('titulo'), instituicao: corpo.get('instituicao'), cargaHorariaHoras: Number(corpo.get('cargaHorariaHoras')) || null, anoConclusao: Number(corpo.get('anoConclusao')) || null, situacao: 'enviado', motivoRecusa: null, enviadoEm: new Date().toISOString(), revisadoEm: null, arquivo: { nome: f2.name, tipoArquivo: f2.type, tamanho: f2.size } };
          arquivos[`curso-${c.id}`] = URL.createObjectURL(f2);
          cursos.unshift(c); return { qualificacao: c };
        }
        const mc2 = url.match(/^\/api\/profissionais\/eu\/qualificacoes\/([^/]+)$/);
        if (mc2 && metodo === 'DELETE') { const i = cursos.findIndex((c) => c.id === mc2[1]); if (i >= 0) cursos.splice(i, 1); return null; }
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
          const tipo = corpo.get('tipo'); const f = corpo.get('arquivo');
          if (tipo === 'cnh' && v.situacao === 'aprovado') { cnhAvulsa = { situacao: 'enviado', nome: f.name, tamanho: f.size }; return { documento: { tipo, situacao: 'enviado' }, verificacao: structuredClone(v) }; }
          travado();
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
    const prontas = { contatos: c.email.verificado && (!c.whatsapp.exigido || c.whatsapp.verificado), dados: !!(v.dadosFiscais && v.endereco), documentos: v.documentos.every((d) => d.situacao === 'enviado' || d.situacao === 'aprovado') };
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

    // contatos: o WhatsApp só aparece quando a plataforma exige o código dele
    $('[data-canal="whatsapp"]').hidden = !c.whatsapp.exigido;
    $('[data-contatos-titulo]').textContent = c.whatsapp.exigido ? 'Confirme seu e-mail e WhatsApp' : 'Confirme seu e-mail';
    $('[data-contatos-sub]').textContent = c.whatsapp.exigido ? 'Mandamos um código de 6 números para cada um.' : 'Mandamos um código de 6 números para ele.';
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


  // --- veículo e CNH ---
  const veiculoMsg = $('[data-veiculo-msg]');
  const cnhCard = $('[data-cnh-avulsa]');
  const marcaVeiculo = () => {
    $$('[name="veiculo"]').forEach((r) => { r.checked = (r.value === 'sim') === !!v.veiculoIncluso; });
    const pill = $('[data-veiculo-pill]');
    pill.className = `pill ${v.veiculoIncluso ? 'pill-ok' : ''}`;
    pill.textContent = v.veiculoIncluso ? 'Veículo incluso' : 'Sem veículo';
  };
  $$('[name="veiculo"]').forEach((r) => r.addEventListener('change', async () => {
    const quer = r.value === 'sim';
    if (quer === !!v.veiculoIncluso) return;
    veiculoMsg.textContent = 'Salvando…'; veiculoMsg.className = 'ex-msg';
    try {
      await chamar('PATCH', '/api/profissionais/eu', { veiculoIncluso: quer });
      v = (await chamar('GET', '/api/profissionais/eu/verificacao')).verificacao;
      if (v.veiculoIncluso === undefined) v.veiculoIncluso = quer;
      desenha(); marcaVeiculo();
      veiculoMsg.textContent = quer
        ? (editavel() ? 'Pronto. A CNH entrou na lista de documentos, na etapa 3.' : 'Pronto. O veículo aparece no seu perfil.')
        : 'Pronto. Seu perfil mostra que você atende sem veículo.';
    } catch (e) {
      marcaVeiculo();
      const emAnalise = e.campos && /análise/.test(e.campos.veiculoIncluso || '');
      veiculoMsg.textContent = emAnalise ? 'Sua CNH ainda está em análise. Quando a equipe aprovar, você pode marcar que leva de carro.' : e.message;
      veiculoMsg.className = 'ex-msg ex-aviso';
      // aprovada sem CNH: ela pode mandar a CNH por aqui; o veículo libera quando a equipe aprovar
      if (e.status === 422 && e.campos && /Envie/.test(e.campos.veiculoIncluso || '')) cnhCard.hidden = false;
    }
  }));
  $$('[data-cnh-arquivo-input]').forEach((inp) => inp.addEventListener('change', async () => {
    const arq = inp.files && inp.files[0]; const erro = $('[data-cnh-erro]');
    if (!arq) return;
    erro.hidden = true;
    if (arq.size > LIMITE) { erro.textContent = 'O arquivo passa de 10 MB. Tire a foto de novo ou escolha um arquivo menor.'; erro.hidden = false; return; }
    const fd = new FormData(); fd.append('tipo', 'cnh'); fd.append('arquivo', arq, arq.name || 'cnh.jpg');
    try {
      await chamar('POST', '/api/profissionais/eu/documentos', fd);
      $('[data-cnh-pill]').textContent = 'Enviada, em conferência';
      const info = $('[data-cnh-arquivo]'); info.textContent = `${arq.name} · ${tamanho(arq.size)}`; info.hidden = false;
      $$('.doc-acoes', cnhCard).forEach((d) => { d.hidden = true; });
      veiculoMsg.textContent = 'Recebemos sua CNH. Quando a equipe aprovar, marque "Sim, levo de carro" de novo.'; veiculoMsg.className = 'ex-msg';
    } catch (e) { erro.textContent = e.message; erro.hidden = false; }
  }));

  // --- cursos e treinamentos ---
  const SIT_CURSO = { enviado: ['', 'Em validação'], aprovado: ['pill-ok', 'Validado'], recusado: ['pill-aviso', 'Recusado'] };
  let cursos = [];
  const desenhaCursos = () => {
    const validados = cursos.filter((c) => c.situacao === 'aprovado').length;
    $('[data-cursos-conta]').textContent = cursos.length ? `${validados} de ${cursos.length} ${cursos.length === 1 ? 'validado' : 'validados'}` : '';
    $('[data-cursos]').innerHTML = cursos.length ? cursos.map((c) => {
      const [cl, rot] = SIT_CURSO[c.situacao] || ['', c.situacao];
      const ver = modoApi ? `/api/profissionais/eu/qualificacoes/${encodeURIComponent(c.id)}/arquivo` : exemplo.arquivos[`curso-${c.id}`];
      const detalhes = [c.instituicao, c.cargaHorariaHoras ? `${c.cargaHorariaHoras} h` : null, c.anoConclusao].filter(Boolean).map(esc).join(' · ');
      return `<li class="curso${c.situacao === 'recusado' ? ' doc-recusado' : ''}" data-curso="${esc(c.id)}">
        <div class="doc-cab"><p class="doc-nome">${esc(c.titulo)}</p><span class="pill ${cl}">${rot}</span></div>
        <p class="curso-det num">${detalhes}</p>
        ${c.motivoRecusa ? `<p class="doc-motivo">${esc(c.motivoRecusa)}</p>` : ''}
        <p class="doc-arquivo num">${c.arquivo ? `${esc(c.arquivo.nome)} · ${tamanho(c.arquivo.tamanho)}` : ''}${ver ? ` · <a href="${esc(ver)}" target="_blank" rel="noopener">Ver certificado</a>` : ''} · <button class="link curso-tirar" type="button" data-tirar>Tirar do perfil</button></p>
        <p class="campo-erro" data-erro-tirar hidden></p>
      </li>`;
    }).join('') : '<li class="vazio">Nenhum curso enviado ainda. Cursos validados deixam seu perfil mais forte para as famílias.</li>';
    $$('[data-curso]').forEach((li) => {
      const b = $('[data-tirar]', li);
      b.addEventListener('click', async () => {
        if (!b.dataset.confirmar) { b.dataset.confirmar = '1'; b.textContent = 'Confirmar: tirar este curso'; return; }
        try { await chamar('DELETE', `/api/profissionais/eu/qualificacoes/${encodeURIComponent(li.dataset.curso)}`); cursos = cursos.filter((c) => c.id !== li.dataset.curso); desenhaCursos(); }
        catch (e) { const p = $('[data-erro-tirar]', li); p.textContent = e.message; p.hidden = false; }
      });
    });
  };
  const fc = $('[data-form-curso]');
  let arquivoCurso = null;
  $('[data-novo-curso]').addEventListener('click', (ev) => { fc.hidden = false; ev.currentTarget.hidden = true; fc.titulo.focus(); });
  $('[data-cancelar-curso]').addEventListener('click', () => { fc.hidden = true; fc.reset(); arquivoCurso = null; $('[data-curso-escolhido]').hidden = true; $('[data-novo-curso]').hidden = false; });
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
    if (!arquivoCurso) { geral.textContent = 'Anexe o certificado do curso.'; geral.hidden = false; return; }
    if (arquivoCurso.size > LIMITE) { geral.textContent = 'O certificado passa de 10 MB. Escolha um arquivo menor.'; geral.hidden = false; return; }
    const fd = new FormData();
    fd.append('titulo', fc.titulo.value.trim()); fd.append('instituicao', fc.instituicao.value.trim());
    if (fc.cargaHorariaHoras.value) fd.append('cargaHorariaHoras', fc.cargaHorariaHoras.value);
    if (fc.anoConclusao.value) fd.append('anoConclusao', fc.anoConclusao.value);
    fd.append('arquivo', arquivoCurso, arquivoCurso.name || 'certificado.jpg');
    const b = $('[type="submit"]', fc); b.disabled = true; b.textContent = 'Enviando…';
    try {
      const { qualificacao } = await chamar('POST', '/api/profissionais/eu/qualificacoes', fd);
      cursos.unshift(qualificacao); desenhaCursos();
      fc.reset(); arquivoCurso = null; $('[data-curso-escolhido]').hidden = true; fc.hidden = true; $('[data-novo-curso]').hidden = false;
    } catch (e) {
      let algum = false;
      Object.entries(e.campos || {}).forEach(([k, msg]) => { const p = $(`[data-erro-curso="${k}"]`, fc); if (p) { p.textContent = msg; p.hidden = false; algum = true; } });
      if (!algum) { geral.textContent = e.message; geral.hidden = false; }
    } finally { b.disabled = false; b.textContent = 'Enviar para validação'; }
  });

  // --- início: com API, confere a sessão; sem API, usa o exemplo com a sessão de demonstração ---
  const fora = () => { $('[data-gestao]').remove(); $('[data-fora]').hidden = false; $('.topo-conta').hidden = true; };
  const comeca = async (nome, sair) => {
    $('[data-fora]').remove();
    $('[data-gestao]').hidden = false;
    $('[data-nome-conta]').textContent = nome;
    $('[data-sair]').addEventListener('click', sair);
    try {
      v = (await chamar('GET', '/api/profissionais/eu/verificacao')).verificacao;
      preenche(); desenha(); marcaVeiculo();
      $('[data-extras]').hidden = false;
    } catch (e) { $('[data-achado]').textContent = e.message; return; }
    try { cursos = (await chamar('GET', '/api/profissionais/eu/qualificacoes')).qualificacoes; desenhaCursos(); } catch (_) { /* cursos aparecem quando a API responder */ }
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
      comeca(eu.nome, () => (window.mc ? mc.sair('mc-pro', 'profissional') : (location.href = 'profissional')));
      return;
    }
    let conta = null;
    try { conta = JSON.parse(localStorage.getItem('mc-pro')); } catch (_) { /* sem armazenamento */ }
    if (!conta) { fora(); return; }
    comeca(conta.nome || 'Joana Prado', () => { try { localStorage.removeItem('mc-pro'); } catch (_) { /* sem armazenamento */ } location.href = 'profissional'; });
  })();

  // menu no celular
  const topo = $('[data-topo]'); const botao = $('.menu-botao', topo);
  botao.addEventListener('click', () => botao.setAttribute('aria-expanded', String(topo.classList.toggle('menu-aberto'))));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { topo.classList.remove('menu-aberto'); botao.setAttribute('aria-expanded', 'false'); } });
})();
