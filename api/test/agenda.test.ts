import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { montarIcs } from '../src/rotas/agenda.js';
import { ambiente, cliente, DIA, familia, HORA, profissionalAprovada, type Ambiente } from './ajuda.js';

let amb: Ambiente;
beforeAll(async () => {
  amb = await ambiente();
});
afterAll(() => amb.fechar());

const caminho = (url: string) => new URL(url).pathname;
const assinar = (url: string) => amb.app.inject({ method: 'GET', url: caminho(url), headers: { host: 'localhost' } });

describe('link de assinatura', () => {
  it('é o mesmo a cada pedido e um novo invalida o antigo', async () => {
    const c = cliente(amb.app);
    expect((await c.get('/api/agenda/link')).status).toBe(401);
    await c.post('/api/contas', familia());
    const a = (await c.get('/api/agenda/link')).corpo;
    expect(a.url).toMatch(/\/api\/agenda\/[A-Za-z0-9_-]{43}\.ics$/);
    expect(a.webcal).toMatch(/^webcal:/);
    expect((await c.get('/api/agenda/link')).corpo.url).toBe(a.url);
    expect((await assinar(a.url)).statusCode).toBe(200);

    const b = (await c.post('/api/agenda/link/novo')).corpo;
    expect(b.url).not.toBe(a.url);
    expect((await assinar(a.url)).statusCode).toBe(404);
    expect((await assinar(b.url)).statusCode).toBe(200);
    expect((await c.get('/api/agenda/link')).corpo.url).toBe(b.url);
    expect((await amb.app.inject({ method: 'GET', url: '/api/agenda/curto.ics' })).statusCode).toBe(404);
  });
});

describe('arquivo da agenda', () => {
  it('traz só os serviços confirmados ou feitos, para as duas partes', async () => {
    const pro = await profissionalAprovada(amb);
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia({ pessoaAcompanhada: { nome: 'Helena Costa' } }));
    const [helena] = (await fam.get('/api/pessoas')).corpo.pessoas;
    // um horário diferente para cada pedido: dois confirmados no mesmo horário dão conflito
    let n = 0;
    const pedir = async (tarefa: string, extra: Record<string, unknown> = {}) => {
      const inicio = new Date(amb.relogio.agora.getTime() + DIA + 3 * HORA * n++).toISOString();
      return (await fam.post('/api/servicos', { profissional: pro.slug, tarefa, inicio, horas: 2, ...extra })).corpo.servico.id as string;
    };

    const consulta = await pedir('Consulta', { pessoaAcompanhadaId: helena.id, local: 'Clínica Viva Mais, Centro' });
    const banco = await pedir('Banco');
    const mercado = await pedir('Mercado');
    const esperando = await pedir('Passeio');
    await pro.c.post(`/api/servicos/${consulta}/aceitar`);
    await pro.c.post(`/api/servicos/${banco}/aceitar`);
    await pro.c.post(`/api/servicos/${mercado}/aceitar`);
    await fam.post(`/api/servicos/${mercado}/cancelar`);

    const daPro = (await assinar((await pro.c.get('/api/agenda/link')).corpo.url));
    const daFamilia = (await assinar((await fam.get('/api/agenda/link')).corpo.url)).body;
    expect(daPro.headers['content-type']).toBe('text/calendar; charset=utf-8');
    expect(daPro.headers['cache-control']).toBe('private, max-age=300');
    for (const ics of [daPro.body, daFamilia]) {
      expect(ics).toContain(`UID:${consulta}@minhacompanhia.com.br`);
      expect(ics).toContain(`UID:${banco}@minhacompanhia.com.br`);
      expect(ics).not.toContain(mercado);
      expect(ics).not.toContain(esperando);
    }
    expect(daFamilia).toContain('SUMMARY:Consulta com Helena');
    expect(daFamilia).toContain('SUMMARY:Banco com Mariana Costa');
    expect(daFamilia).toContain('LOCATION:Clínica Viva Mais\\, Centro');
    expect(daFamilia).toContain('TRIGGER:-PT1H');
    expect(daFamilia).toMatch(/DTSTART:20261021T120000Z/);
    expect(daFamilia).toMatch(/DTEND:20261021T140000Z/);
    // sem telefone nem CPF
    expect(daFamilia).not.toMatch(/\d{10,11}/);
    for (const linha of daFamilia.split('\r\n')) expect(Buffer.byteLength(linha)).toBeLessThanOrEqual(75);
    expect(daFamilia.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('troca de horário aceita muda o evento; o feito fica por 30 dias', async () => {
    const pro = await profissionalAprovada(amb);
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const amanha = new Date(amb.relogio.agora.getTime() + DIA);
    const { id } = (await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Exame', inicio: amanha.toISOString(), horas: 2 })).corpo.servico;
    await pro.c.post(`/api/servicos/${id}/propor`, { inicio: new Date(amanha.getTime() + 2 * HORA).toISOString(), horas: 3 });
    const link = (await fam.get('/api/agenda/link')).corpo.url;
    expect((await assinar(link)).body).not.toContain(id);
    await fam.post(`/api/servicos/${id}/aceitar-proposta`);
    const ics = (await assinar(link)).body;
    const inicio = new Date(amanha.getTime() + 2 * HORA).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    expect(ics).toContain(`DTSTART:${inicio}`);

    amb.relogio.avancar(DIA + 6 * HORA);
    await pro.c.post(`/api/servicos/${id}/concluir`);
    expect((await assinar(link)).body).toContain(id);
    amb.relogio.avancar(31 * DIA);
    expect((await assinar(link)).body).not.toContain(id);
  });
});

describe('montagem do iCalendar', () => {
  it('escapa o texto e dobra linhas longas sem cortar acentos', () => {
    const ics = montarIcs([
      {
        id: 'x',
        inicio: new Date('2026-10-28T12:00:00Z'),
        fim: new Date('2026-10-28T16:00:00Z'),
        titulo: 'Consulta; exame, retorno',
        local: null,
        descricao: `Linha um\nação `.repeat(20),
        atualizadoEm: new Date('2026-10-20T12:00:00Z'),
      },
    ]);
    expect(ics).toContain('SUMMARY:Consulta\\; exame\\, retorno');
    expect(ics).not.toContain('LOCATION');
    const linhas = ics.split('\r\n');
    for (const l of linhas) expect(Buffer.byteLength(l)).toBeLessThanOrEqual(75);
    const desdobrado = ics.replace(/\r\n /g, '');
    expect(desdobrado).toContain(`DESCRIPTION:${'Linha um\\nação '.repeat(20)}`);
  });
});
