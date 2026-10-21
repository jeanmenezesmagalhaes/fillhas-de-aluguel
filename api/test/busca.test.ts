import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ambiente, cliente, profissionalAprovada, type Ambiente } from './ajuda.js';

let amb: Ambiente;
const publico = () => cliente(amb.app);
const buscar = async (q: string) => (await publico().get(`/api/profissionais${q}`)).corpo;

beforeAll(async () => {
  amb = await ambiente();
  // Ana: Campinas, com veículo, consulta e banco, seg a sex de manhã e tarde
  const ana = await profissionalAprovada(amb, { nome: 'Ana Oliveira', cidade: 'Campinas', uf: 'SP' });
  await ana.c.patch('/api/profissionais/eu', {
    valorHoraCentavos: 8000, bairros: ['Cambuí', 'Taquaral'], anosExperiencia: 6,
    tarefas: [{ tipo: 'consulta', minimoHoras: 2 }, { tipo: 'banco', minimoHoras: 2 }],
    disponibilidade: [1, 2, 3, 4, 5].map((dia) => ({ dia, inicio: '08:00', fim: '18:00' })),
  });
  // Cláudia: Campinas, sem veículo, mercado, só sábado de manhã; aceita outras
  const claudia = await profissionalAprovada(amb, { nome: 'Cláudia Ramos', cidade: 'Campinas', uf: 'SP' });
  await claudia.c.patch('/api/profissionais/eu', {
    veiculoIncluso: false, valorHoraCentavos: 7000, bairros: ['Taquaral'], anosExperiencia: 4, aceitaOutras: true,
    tarefas: [{ tipo: 'mercado', minimoHoras: 1 }],
    disponibilidade: [{ dia: 6, inicio: '08:00', fim: '12:00' }],
  });
  // Fernanda: São Paulo, sem dias definidos (atende a combinar)
  const fernanda = await profissionalAprovada(amb, { nome: 'Fernanda Lopes', cidade: 'São Paulo', uf: 'SP' });
  await fernanda.c.patch('/api/profissionais/eu', { valorHoraCentavos: 9000, anosExperiencia: 12, tarefas: [{ tipo: 'passeio', minimoHoras: 2 }] });
  // fora do ar: rascunho não aparece
  await publico().post('/api/profissionais', { nome: 'Rascunho Teste', email: 'rascunho@exemplo.com', celular: '19911110000', senha: 'senha-de-teste-9', aceitaTermos: true, cidade: 'Campinas', uf: 'SP' });
  // folga da Ana na quarta, 28/10
  await ana.c.post('/api/profissionais/eu/bloqueios', { inicio: '2026-10-28T03:00:00Z', fim: '2026-10-29T03:00:00Z' });
});
afterAll(() => amb.fechar());

const nomes = (r: { profissionais: { nome: string }[] }) => r.profissionais.map((p) => p.nome);

describe('listagem de profissionais', () => {
  it('só perfis no ar, com faixa de valor e dados do cartão', async () => {
    const r = await buscar('');
    expect(r.total).toBe(3);
    expect(nomes(r)).not.toContain('Rascunho Teste');
    expect(r.valorHora).toEqual({ minCentavos: 7000, maxCentavos: 9000 });
    const ana = r.profissionais.find((p: { nome: string }) => p.nome === 'Ana Oliveira');
    expect(ana).toMatchObject({ slug: 'ana-oliveira', cidade: 'Campinas', veiculoIncluso: true, anosExperiencia: 6, fotoUrl: null, nota: { media: null, total: 0 } });
    expect(ana.tarefas.map((t: { nome: string }) => t.nome)).toEqual(['Consulta ou exame', 'Banco ou cartório']);
    expect(ana.turnos['3']).toEqual(['m', 't']);
    expect(ana).not.toHaveProperty('id');
    expect(JSON.stringify(r)).not.toMatch(/cpf|email|celular/i);
    expect(r.profissionais.find((p: { nome: string }) => p.nome === 'Fernanda Lopes').turnos).toBeNull();
  });

  it('filtra por cidade sem acento, bairro, tarefa e veículo', async () => {
    expect(nomes(await buscar('?cidade=sao%20paulo'))).toEqual(['Fernanda Lopes']);
    expect(nomes(await buscar('?cidade=Campinas&ordem=preco'))).toEqual(['Cláudia Ramos', 'Ana Oliveira']);
    expect(nomes(await buscar('?cidade=Campinas&bairro=cambui'))).toEqual(['Ana Oliveira']);
    expect(nomes(await buscar('?tarefa=mercado'))).toEqual(['Cláudia Ramos']);
    expect(nomes(await buscar('?tarefa=outra'))).toEqual(['Cláudia Ramos']);
    expect(nomes(await buscar('?veiculo=false'))).toEqual(['Cláudia Ramos']);
    expect(nomes(await buscar('?veiculo=true')).sort()).toEqual(['Ana Oliveira', 'Fernanda Lopes']);
  });

  it('filtra por dia, turno e data (com folga)', async () => {
    // sábado de manhã: Cláudia, e Fernanda que não definiu horários
    expect(nomes(await buscar('?dia=6&turno=m')).sort()).toEqual(['Cláudia Ramos', 'Fernanda Lopes']);
    expect(nomes(await buscar('?dia=6&turno=t'))).toEqual(['Fernanda Lopes']);
    // terça, 27/10: Ana atende; quarta, 28/10: Ana de folga
    expect(nomes(await buscar('?data=2026-10-27&cidade=Campinas'))).toEqual(['Ana Oliveira']);
    expect(nomes(await buscar('?data=2026-10-28&cidade=Campinas'))).toEqual([]);
  });

  it('ordena e pagina', async () => {
    expect(nomes(await buscar('?ordem=experiencia'))).toEqual(['Fernanda Lopes', 'Ana Oliveira', 'Cláudia Ramos']);
    const p1 = await buscar('?ordem=preco&porPagina=2');
    const p2 = await buscar('?ordem=preco&porPagina=2&pagina=2');
    expect(p1).toMatchObject({ total: 3, pagina: 1, porPagina: 2 });
    expect([...nomes(p1), ...nomes(p2)]).toEqual(['Cláudia Ramos', 'Ana Oliveira', 'Fernanda Lopes']);
    expect((await publico().get('/api/profissionais?porPagina=500')).status).toBe(400);
  });
});

describe('cidades atendidas', () => {
  it('lista cidades com bairros e filtra pelo começo do nome', async () => {
    const { cidades } = (await publico().get('/api/cidades')).corpo;
    expect(cidades[0]).toEqual({ cidade: 'Campinas', uf: 'SP', total: 2, bairros: ['Cambuí', 'Taquaral'] });
    expect(cidades.map((c: { cidade: string }) => c.cidade)).toEqual(['Campinas', 'São Paulo']);
    expect((await publico().get('/api/cidades?q=sao')).corpo.cidades.map((c: { cidade: string }) => c.cidade)).toEqual(['São Paulo']);
  });
});
