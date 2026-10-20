import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ambiente, cliente, DIA, familia, profissional, type Ambiente } from './ajuda.js';

let amb: Ambiente;
beforeAll(async () => {
  amb = await ambiente();
});
afterAll(() => amb.fechar());

describe('cadastro da família', () => {
  it('cria a conta, já entra e guarda a pessoa acompanhada', async () => {
    const c = cliente(amb.app);
    const r = await c.post('/api/contas', familia({ pessoaAcompanhada: { nome: 'Helena Costa', dataNascimento: '1948-03-02' } }));
    expect(r.status).toBe(201);
    expect(r.corpo.usuario).toMatchObject({ nome: 'Mariana Costa', celular: '19999990000', papeis: ['contratante'], profissional: null });
    expect(r.corpo.usuario).not.toHaveProperty('senhaHash');

    const cookie = r.resposta.cookies.find((k) => k.name === 'mc_sessao')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');

    const eu = await c.get('/api/eu');
    expect(eu.status).toBe(200);
    const pessoas = await c.get('/api/pessoas');
    expect(pessoas.corpo.pessoas).toEqual([expect.objectContaining({ nome: 'Helena Costa', dataNascimento: '1948-03-02' })]);
  });

  it('recusa e-mail repetido, sem diferenciar maiúsculas', async () => {
    const dados = familia();
    await cliente(amb.app).post('/api/contas', dados);
    const r = await cliente(amb.app).post('/api/contas', { ...dados, email: dados.email.toUpperCase() });
    expect(r.status).toBe(409);
    expect(r.corpo.erro.codigo).toBe('email_em_uso');
  });

  it('explica cada campo inválido', async () => {
    const r = await cliente(amb.app).post('/api/contas', { nome: 'M', email: 'sem-arroba', celular: '123', senha: 'curta', aceitaTermos: false });
    expect(r.status).toBe(400);
    expect(Object.keys(r.corpo.erro.campos).sort()).toEqual(['aceitaTermos', 'celular', 'email', 'nome', 'senha']);
    expect(r.corpo.erro.campos.senha).toBe('A senha precisa ter pelo menos 8 caracteres.');
  });
});

describe('cadastro da profissional', () => {
  it('começa em rascunho, com endereço de portfólio próprio', async () => {
    const a = await cliente(amb.app).post('/api/profissionais', profissional({ nome: 'Joana Prado' }));
    const b = await cliente(amb.app).post('/api/profissionais', profissional({ nome: 'Joana Prado' }));
    expect(a.status).toBe(201);
    expect(a.corpo.usuario.papeis).toEqual(['profissional']);
    expect(a.corpo.usuario.profissional).toMatchObject({ slug: 'joana-prado', situacao: 'rascunho', uf: 'SP', valorHoraCentavos: null });
    expect(b.corpo.usuario.profissional.slug).toBe('joana-prado-2');
  });

  it('não aceita hora abaixo de R$ 70', async () => {
    const c = cliente(amb.app);
    await c.post('/api/profissionais', profissional());
    const r = await c.patch('/api/profissionais/eu', { valorHoraCentavos: 6500 });
    expect(r.status).toBe(400);
    expect(r.corpo.erro.campos.valorHoraCentavos).toBe('O valor mínimo da hora é R$ 70.');
    const ok = await c.patch('/api/profissionais/eu', { valorHoraCentavos: 7000, horasMinimas: 2 });
    expect(ok.corpo.usuario.profissional).toMatchObject({ valorHoraCentavos: 7000, horasMinimas: 2 });
  });

  it('só vai para análise com o valor da hora definido', async () => {
    const c = cliente(amb.app);
    await c.post('/api/profissionais', profissional());
    expect((await c.post('/api/profissionais/eu/analise')).status).toBe(422);
    await c.patch('/api/profissionais/eu', { valorHoraCentavos: 8000 });
    const r = await c.post('/api/profissionais/eu/analise');
    expect(r.corpo.usuario.profissional.situacao).toBe('em_analise');
  });

  it('perfil fora do ar não aparece para o público', async () => {
    const c = cliente(amb.app);
    const r = await c.post('/api/profissionais', profissional({ nome: 'Vera Nunes' }));
    const slug = r.corpo.usuario.profissional.slug;
    expect((await cliente(amb.app).get(`/api/profissionais/${slug}`)).status).toBe(404);
    expect((await c.get(`/api/profissionais/${slug}`)).status).toBe(200);
  });

  it('família não edita perfil profissional', async () => {
    const c = cliente(amb.app);
    await c.post('/api/contas', familia());
    const r = await c.patch('/api/profissionais/eu', { valorHoraCentavos: 9000 });
    expect(r.status).toBe(403);
  });
});

describe('sessão', () => {
  it('entra com e-mail e senha e sai', async () => {
    const dados = familia();
    await cliente(amb.app).post('/api/contas', dados);
    const c = cliente(amb.app);
    expect((await c.get('/api/eu')).status).toBe(401);
    const r = await c.post('/api/sessoes', { email: `  ${dados.email.toUpperCase()} `, senha: dados.senha });
    expect(r.status).toBe(201);
    expect((await c.get('/api/eu')).corpo.usuario.email).toBe(dados.email);
    expect((await c.delete('/api/sessoes/atual')).status).toBe(204);
    expect((await c.get('/api/eu')).status).toBe(401);
  });

  it('mesma mensagem para senha errada e e-mail sem conta', async () => {
    const dados = familia();
    await cliente(amb.app).post('/api/contas', dados);
    const errada = await cliente(amb.app).post('/api/sessoes', { email: dados.email, senha: 'outra-senha' });
    const semConta = await cliente(amb.app).post('/api/sessoes', { email: 'ninguem@exemplo.com', senha: 'outra-senha' });
    expect(errada.status).toBe(401);
    expect(semConta.status).toBe(401);
    expect(errada.corpo).toEqual(semConta.corpo);
  });

  it('expira depois de 30 dias', async () => {
    const c = cliente(amb.app);
    await c.post('/api/contas', familia());
    amb.relogio.avancar(31 * DIA);
    expect((await c.get('/api/eu')).status).toBe(401);
  });

  it('recusa pedido de outra origem', async () => {
    const r = await amb.app.inject({
      method: 'POST',
      url: '/api/sessoes',
      headers: { origin: 'https://site-estranho.example', host: 'localhost' },
      payload: { email: 'a@b.com', senha: 'x' },
    });
    expect(r.statusCode).toBe(403);
  });
});

describe('limite de tentativas', () => {
  it('bloqueia muitas tentativas de login seguidas', async () => {
    const outro = await ambiente({ limiteTentativas: 3 });
    try {
      const c = cliente(outro.app);
      const tentar = () => c.post('/api/sessoes', { email: 'a@exemplo.com', senha: 'errada' });
      for (let i = 0; i < 3; i++) expect((await tentar()).status).toBe(401);
      const r = await tentar();
      expect(r.status).toBe(429);
      expect(r.corpo.erro.codigo).toBe('muitas_tentativas');
    } finally {
      await outro.fechar();
    }
  });
});
