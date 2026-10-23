import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { profissionais } from '../src/db/schema.js';
import type { FastifyInstance } from 'fastify';
import { criarApp } from '../src/app.js';
import { ambiente, cliente, DIA, familia, profissional, profissionalAprovada, type Ambiente } from './ajuda.js';

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
  const login = (app: FastifyInstance, ip: string, email: string, senha = 'errada') =>
    app.inject({ method: 'POST', url: '/api/sessoes', remoteAddress: ip, payload: { email, senha } });

  it('o limite por IP vale para todas as instâncias da API (o contador fica no banco)', async () => {
    // duas instâncias sobre o mesmo banco, como as da Vercel
    const [a, b] = await Promise.all([1, 2].map(() => criarApp({ db: amb.banco.db, agora: () => amb.relogio.agora, site: false, limiteTentativas: 3 })));
    try {
      const email = 'ninguem-ip@exemplo.com';
      expect((await login(a!, '203.0.113.7', email)).statusCode).toBe(401);
      expect((await login(b!, '203.0.113.7', email)).statusCode).toBe(401);
      expect((await login(a!, '203.0.113.7', email)).statusCode).toBe(401);
      const r = await login(b!, '203.0.113.7', email);
      expect(r.statusCode).toBe(429);
      expect(r.json().erro.codigo).toBe('muitas_tentativas');
      // outro IP segue livre; passado o minuto, este também
      expect((await login(b!, '203.0.113.8', email)).statusCode).toBe(401);
      amb.relogio.avancar(61_000);
      expect((await login(a!, '203.0.113.7', email)).statusCode).toBe(401);
    } finally {
      await Promise.all([a!.close(), b!.close()]);
    }
  });

  it('atrás do Cloudflare conta o IP do visitante, e só confia no cabeçalho vindo do Cloudflare', async () => {
    const app = await criarApp({ db: amb.banco.db, agora: () => amb.relogio.agora, site: false, limiteTentativas: 2, producao: true });
    // na Vercel, o x-forwarded-for traz quem conectou nela
    const via = (conectou: string, visitante: string) =>
      app.inject({
        method: 'POST',
        url: '/api/sessoes',
        headers: { 'x-forwarded-for': conectou, 'cf-connecting-ip': visitante },
        payload: { email: 'ninguem-cf@exemplo.com', senha: 'errada' },
      });
    try {
      expect((await via('172.64.10.1', '198.51.100.1')).statusCode).toBe(401);
      expect((await via('104.16.0.9', '198.51.100.1')).statusCode).toBe(401);
      expect((await via('172.64.10.1', '198.51.100.1')).statusCode).toBe(429);
      // outro visitante, pelo mesmo Cloudflare, segue livre
      expect((await via('172.64.10.1', '198.51.100.2')).statusCode).toBe(401);
      // direto na Vercel, trocar o cabeçalho não escapa do limite
      expect((await via('203.0.113.9', '198.51.100.3')).statusCode).toBe(401);
      expect((await via('203.0.113.9', '198.51.100.4')).statusCode).toBe(401);
      expect((await via('203.0.113.9', '198.51.100.5')).statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });

  it('trava o e-mail depois de 10 tentativas, venham de que IP vierem, e solta em 15 minutos', async () => {
    const dados = familia();
    await cliente(amb.app).post('/api/contas', dados);
    for (let i = 0; i < 10; i++) expect((await login(amb.app, `198.51.100.${i}`, dados.email)).statusCode).toBe(401);
    // nem a senha certa entra enquanto está travado
    const travado = await login(amb.app, '198.51.100.200', dados.email, dados.senha);
    expect(travado.statusCode).toBe(429);
    expect(travado.json().erro.codigo).toBe('muitas_tentativas');
    amb.relogio.avancar(15 * 60 * 1000);
    expect((await login(amb.app, '198.51.100.200', dados.email, dados.senha)).statusCode).toBe(201);
  });

  it('e-mail sem conta trava do mesmo jeito, para não revelar quais têm conta', async () => {
    for (let i = 0; i < 10; i++) expect((await login(amb.app, `198.51.101.${i}`, 'sem-conta@exemplo.com')).statusCode).toBe(401);
    expect((await login(amb.app, '198.51.101.200', 'sem-conta@exemplo.com')).statusCode).toBe(429);
  });

  it('entrar com a senha certa zera as falhas', async () => {
    const dados = familia();
    await cliente(amb.app).post('/api/contas', dados);
    for (let i = 0; i < 9; i++) await login(amb.app, `198.51.102.${i}`, dados.email);
    expect((await login(amb.app, '198.51.102.100', dados.email, dados.senha)).statusCode).toBe(201);
    for (let i = 0; i < 10; i++) expect((await login(amb.app, `198.51.102.${i}`, dados.email)).statusCode).toBe(401);
  });
});

describe('portfólio público', () => {
  it('aprovado sem valor da hora ainda não aparece', async () => {
    const pro = await profissionalAprovada(amb);
    expect((await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).status).toBe(200);
    await amb.banco.db.update(profissionais).set({ valorHoraCentavos: null }).where(eq(profissionais.slug, pro.slug));
    expect((await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).status).toBe(404);
    expect((await pro.c.get(`/api/profissionais/${pro.slug}`)).status).toBe(200);
  });
});

describe('sessão para telas públicas', () => {
  it('responde 200 com a conta ou null', async () => {
    const c = cliente(amb.app);
    const sem = await c.get('/api/sessao');
    expect(sem).toMatchObject({ status: 200, corpo: { usuario: null } });
    await c.post('/api/contas', familia());
    const com = await c.get('/api/sessao');
    expect(com.corpo.usuario.papeis).toEqual(['contratante']);
    expect(com.resposta.headers['cache-control']).toBe('no-store');
  });
});
