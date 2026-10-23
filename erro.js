// Páginas de erro. Na 404, a fila de suspeitos troca a ficha (e um suspeito diferente abre
// a cada visita). Na 500, a página tenta de novo sozinha depois de 20 s, no máximo três vezes.
(function () {
  var raiz = document.documentElement;
  raiz.classList.add('js');

  // seções que entram ao aparecer; sem IntersectionObserver ficam como estão
  if ('IntersectionObserver' in window) {
    var secoes = document.querySelectorAll('main > section:not(:first-child) > *');
    var olho = new IntersectionObserver(function (vistas) {
      vistas.forEach(function (v) {
        if (!v.isIntersecting) return;
        v.target.classList.add('visto');
        olho.unobserve(v.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    secoes.forEach(function (el, i) {
      el.classList.add('entra');
      el.style.transitionDelay = (i % 3) * 80 + 'ms';
      olho.observe(el);
    });
    raiz.classList.add('anima');
  }

  var ficha = document.querySelector('[data-ficha]');
  var suspeitos = document.querySelectorAll('.suspeito');
  if (ficha && suspeitos.length) {
    var foto = ficha.querySelector('[data-ficha-foto]');
    var nome = ficha.querySelector('[data-ficha-nome]');
    var alibi = ficha.querySelector('[data-ficha-alibi]');
    var escolher = function (botao, rolar) {
      suspeitos.forEach(function (b) { b.setAttribute('aria-pressed', String(b === botao)); });
      foto.src = botao.dataset.foto;
      foto.width = Number(botao.dataset.l);
      foto.height = Number(botao.dataset.a);
      foto.alt = botao.dataset.alt;
      foto.style.objectPosition = botao.dataset.pos;
      nome.textContent = botao.dataset.nome;
      alibi.textContent = botao.dataset.alibi;
      ficha.classList.remove('trocando');
      void ficha.offsetWidth;
      ficha.classList.add('trocando');
      if (rolar && ficha.getBoundingClientRect().bottom < 0) ficha.scrollIntoView({ block: 'center' });
    };
    suspeitos.forEach(function (b) {
      b.addEventListener('click', function () { escolher(b, true); });
    });
    escolher(suspeitos[Math.floor(Math.random() * suspeitos.length)], false);
    ficha.classList.remove('trocando');
  }

  var tentar = document.querySelector('[data-tentar]');
  if (tentar) {
    var recarregar = function () { location.reload(); };
    tentar.addEventListener('click', recarregar);

    var relogio = document.querySelector('[data-relogio]');
    var chave = 'erro500:' + location.pathname + location.search;
    var tentativas = 0;
    try { tentativas = Number(sessionStorage.getItem(chave)) || 0; } catch (e) {}
    if (tentativas >= 3) {
      relogio.querySelector('[data-relogio-texto]').textContent = 'Já tentamos três vezes. Espere alguns minutos antes de tentar de novo.';
      relogio.querySelector('[data-parar]').hidden = true;
      return;
    }
    var segundos = 20;
    var mostrador = relogio.querySelector('[data-segundos]');
    var conta = setInterval(function () {
      segundos -= 1;
      mostrador.textContent = segundos;
      if (segundos > 0) return;
      clearInterval(conta);
      try { sessionStorage.setItem(chave, String(tentativas + 1)); } catch (e) {}
      recarregar();
    }, 1000);
    relogio.querySelector('[data-parar]').addEventListener('click', function () {
      clearInterval(conta);
      relogio.querySelector('[data-relogio-texto]').textContent = 'Tudo bem, a gente espera você tentar.';
      this.hidden = true;
    });
  }
})();
