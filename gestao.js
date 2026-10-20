// Peças comuns das telas de gestão (painel.html e pedidos.html) quando ligadas à API.
// Abertas direto do arquivo, sem servidor, as telas ficam na demonstração com dados fixos.
(() => {
  const comApi = location.protocol === 'http:' || location.protocol === 'https:';

  // tudo o que veio de pessoas (nomes, tarefas, recados) entra na página escapado
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  async function api(metodo, url, corpo) {
    const r = await fetch(url, {
      method: metodo,
      credentials: 'same-origin',
      headers: corpo ? { 'content-type': 'application/json' } : {},
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const dados = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) {
      const e = new Error((dados && dados.erro && dados.erro.mensagem) || 'Não foi possível concluir. Tente de novo.');
      e.status = r.status;
      throw e;
    }
    return dados;
  }

  const SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const p2 = (n) => String(n).padStart(2, '0');
  const dia = (d) => { d = new Date(d); return `${SEM[d.getDay()]}, ${p2(d.getDate())}/${p2(d.getMonth() + 1)}`; };
  const hora = (d) => { d = new Date(d); return `${d.getHours()}h${d.getMinutes() ? p2(d.getMinutes()) : ''}`; };
  const faixa = (inicio, horas) => `${hora(inicio)} às ${hora(new Date(new Date(inicio).getTime() + horas * 3600000))}`;
  const dataCurta = (iso) => { const [a, m, d] = iso.split('-'); return { dm: `${d}/${m}`, dma: `${d}/${m}/${a}` }; };
  const brl = (c) => 'R$ ' + (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
  const primeiro = (nome) => String(nome || '').trim().split(/\s+/)[0];
  const idade = (iso) => {
    if (!iso) return null;
    const [a, m, d] = iso.split('-').map(Number);
    const h = new Date();
    return h.getFullYear() - a - (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d) ? 1 : 0);
  };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const ESTRELA = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6L1.3 7.8l6.1-.7z" fill="currentColor"/></svg>';
  const estrelas = (n) => `<span class="estrelas" role="img" aria-label="Você avaliou com ${n} de 5">${ESTRELA.repeat(n)}${ESTRELA.replace('<svg', '<svg class="apagada"').repeat(5 - n)}</span>`;

  // confirma em dois toques: o primeiro troca o texto do botão, o segundo executa
  const doisToques = (botao, texto, acao) => botao.addEventListener('click', () => {
    if (botao.dataset.confirmar) { acao(); return; }
    botao.dataset.confirmar = '1';
    botao.textContent = texto;
  });

  // formulário de nota (1 a 5) e comentário logo abaixo da linha do serviço
  function abrirAvaliacao(linha, servicoId, pergunta, dica, aoEnviar) {
    if (linha.nextElementSibling && linha.nextElementSibling.matches('.avaliacao')) return;
    linha.insertAdjacentHTML('afterend', `<li class="avaliacao"><form data-form-avaliacao><fieldset class="notas"><legend>${esc(pergunta)}</legend>${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="nota" value="${n}"${n === 5 ? ' checked' : ''}><span class="nota-estrela" aria-hidden="true">${ESTRELA}</span><span class="vh">${n} de 5</span></label>`).join('')}</fieldset><label class="pn-msg">Comentário (opcional)<textarea name="texto" rows="2" maxlength="1000" placeholder="${esc(dica)}"></textarea></label><p class="campo-erro" data-erro-avaliacao role="alert" hidden></p><div class="pn-acoes"><button class="btn btn-primario" type="submit">Enviar avaliação</button></div></form></li>`);
    const f = linha.nextElementSibling.querySelector('form');
    f.querySelector('input:checked').focus();
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const botao = f.querySelector('[type="submit"]');
      botao.disabled = true;
      try {
        await api('POST', `/api/servicos/${servicoId}/avaliacoes`, { nota: Number(f.nota.value), comentario: f.texto.value.trim() || undefined });
        aoEnviar(Number(f.nota.value));
      } catch (e) {
        const p = f.querySelector('[data-erro-avaliacao]');
        p.textContent = e.message;
        p.hidden = false;
        botao.disabled = false;
      }
    });
  }

  async function sair(chave, destino) {
    try { await api('DELETE', '/api/sessoes/atual'); } catch (_) { /* a sessão some do mesmo jeito ao expirar */ }
    try { localStorage.removeItem(chave); } catch (_) { /* sem armazenamento */ }
    location.href = destino;
  }

  // sem sessão (ou sem o papel certo), a tela mostra o convite para entrar
  async function entrar(papel) {
    const gestao = document.querySelector('[data-gestao]');
    const fora = document.querySelector('[data-fora]');
    gestao.hidden = true;
    let eu = null;
    try { eu = (await api('GET', '/api/eu')).usuario; } catch (_) { /* sem sessão */ }
    if (!eu || !eu.papeis.includes(papel)) {
      gestao.remove();
      fora.hidden = false;
      document.querySelector('.topo-conta').hidden = true;
      return null;
    }
    fora.remove();
    return eu;
  }

  window.mc = { comApi, esc, api, dia, hora, faixa, dataCurta, brl, primeiro, idade, plural, estrelas, doisToques, abrirAvaliacao, sair, entrar };
})();
