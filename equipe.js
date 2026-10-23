// Moldura das telas da equipe (painel e conferência): o menu no celular, a busca de contas da barra
// do topo e as contagens da barra lateral. O painel desenha as contagens com o próprio resumo; as
// outras telas buscam o resumo aqui.
(() => {
  const $ = (s) => document.querySelector(s);
  const menu = $('[data-lateral]');
  if (!menu) return;
  const botao = $('[data-menu]');
  const fechar = $('[data-fechar-menu]');
  const abreMenu = () => { menu.classList.add('eq-aberta'); botao.setAttribute('aria-expanded', 'true'); fechar.hidden = false; fechar.focus(); };
  const fechaMenu = () => { menu.classList.remove('eq-aberta'); botao.setAttribute('aria-expanded', 'false'); };
  botao.addEventListener('click', abreMenu);
  fechar.addEventListener('click', () => { fechaMenu(); botao.focus(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && menu.classList.contains('eq-aberta')) { fechaMenu(); botao.focus(); } });
  // um link do menu para a própria página (outra aba, outra tela do painel) também fecha o menu
  menu.addEventListener('click', (ev) => { if (ev.target.closest('a[href]')) fechaMenu(); });

  // contagens só de filas que pedem ação: a conferência e os repasses
  const contagens = (r) => {
    const conferir = r.conferencia.fila + r.conferencia.documentos + r.conferencia.cursos + r.conferencia.fotos;
    const repasses = r.financeiro.paraRepassar + r.financeiro.repassesFalhos;
    $('[data-n-conferencia]').textContent = conferir || '';
    $('[data-n-repasses]').textContent = repasses || '';
  };
  window.equipe = { fechaMenu, contagens };

  // no painel, a própria tela filtra a lista; nas outras, a busca abre a lista de usuários
  const painel = !!$('[data-tela]');
  const busca = $('[data-busca-topo]');
  if (busca && !painel) {
    busca.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const q = busca.busca.value.trim();
      location.href = `admin-painel${q ? `?busca=${encodeURIComponent(q)}` : ''}#usuarios`;
    });
  }
  if (!painel && /^https?:$/.test(location.protocol)) {
    fetch('/api/admin/resumo', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => { if (r) contagens(r); })
      .catch(() => { /* sem as contagens, o menu segue funcionando */ });
  }
})();
