import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aceitarEPagar, ambiente, cliente, DIA, familia, HORA, profissionalAprovada, type Ambiente } from './ajuda.js';

// o relógio dos testes começa em 2026-10-20T12:00Z: terça, 9h em Brasília
let amb: Ambiente;
beforeAll(async () => {
  amb = await ambiente();
});
afterAll(() => amb.fechar());

const SEG_A_SEX = [1, 2, 3, 4, 5].map((dia) => ({ dia, inicio: '08:00', fim: '18:00' }));
// horário de Brasília (UTC-3) num dia de outubro/novembro de 2026
const brasilia = (dia: string, hora: number) => new Date(`${dia}T${String(hora + 3).padStart(2, '0')}:00:00Z`).toISOString();

async function familiaNova() {
  const fam = cliente(amb.app);
  await fam.post('/api/contas', familia());
  return fam;
}

describe('dias e horários', () => {
  it('valida as faixas e devolve no perfil', async () => {
    const pro = await profissionalAprovada(amb);
    const ruim = await pro.c.patch('/api/profissionais/eu', {
      disponibilidade: [
        { dia: 1, inicio: '08:00', fim: '12:00' },
        { dia: 1, inicio: '11:00', fim: '14:00' },
        { dia: 2, inicio: '18:00', fim: '08:00' },
        { dia: 3, inicio: '8h', fim: '12:00' },
      ],
    });
    expect(ruim.status).toBe(400);
    expect(ruim.corpo.erro.campos).toMatchObject({
      'disponibilidade.1.inicio': 'Esta faixa se sobrepõe à anterior.',
      'disponibilidade.2.fim': 'O fim precisa ser depois do início.',
      'disponibilidade.3.inicio': expect.stringContaining('08:00'),
    });
    const tres = await pro.c.patch('/api/profissionais/eu', {
      disponibilidade: [{ dia: 6, inicio: '08:00', fim: '09:00' }, { dia: 6, inicio: '10:00', fim: '11:00' }, { dia: 6, inicio: '12:00', fim: '13:00' }],
    });
    expect(tres.corpo.erro.campos['disponibilidade.2.dia']).toBe('Use no máximo duas faixas por dia.');

    const ok = await pro.c.patch('/api/profissionais/eu', { disponibilidade: [...SEG_A_SEX, { dia: 6, inicio: '08:30', fim: '12:00' }] });
    expect(ok.corpo.usuario.profissional.disponibilidade).toHaveLength(6);
    const publico = (await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).corpo.profissional;
    expect(publico.disponibilidade.at(-1)).toEqual({ dia: 6, inicio: '08:30', fim: '12:00' });
  });

  it('recusa pedido fora dos dias e horários', async () => {
    const pro = await profissionalAprovada(amb);
    await pro.c.patch('/api/profissionais/eu', { disponibilidade: SEG_A_SEX });
    const fam = await familiaNova();
    const pedir = (inicio: string, horas = 2) => fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio, horas });

    const cedo = await pedir(brasilia('2026-10-27', 7));
    expect(cedo.corpo.erro).toMatchObject({ codigo: 'fora_da_disponibilidade' });
    expect(cedo.corpo.erro.mensagem).toContain('Na terça, ela atende das 08:00 às 18:00.');
    expect((await pedir(brasilia('2026-10-27', 17))).corpo.erro.codigo).toBe('fora_da_disponibilidade');
    expect((await pedir(brasilia('2026-10-31', 9))).corpo.erro.mensagem).toContain('Ela não atende no sábado.');
    expect((await pedir(brasilia('2026-10-27', 16))).status).toBe(201);
  });
});

describe('folgas e conflito de horário', () => {
  it('folga bloqueia pedidos novos e avisa dos confirmados que batem', async () => {
    const pro = await profissionalAprovada(amb);
    const fam = await familiaNova();
    const { id } = (await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Consulta', inicio: brasilia('2026-11-03', 10), horas: 2 })).corpo.servico;
    await aceitarEPagar(pro.c, fam, id);

    const folga = await pro.c.post('/api/profissionais/eu/bloqueios', { inicio: brasilia('2026-11-03', 0), fim: brasilia('2026-11-04', 0), motivo: 'Consulta médica minha' });
    expect(folga.status).toBe(201);
    expect(folga.corpo.conflitos.map((c: { id: string }) => c.id)).toEqual([id]);
    expect((await pro.c.get('/api/profissionais/eu/bloqueios')).corpo.bloqueios).toHaveLength(1);

    const outro = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio: brasilia('2026-11-03', 15), horas: 2 });
    expect(outro.corpo.erro.codigo).toBe('horario_indisponivel');
    // a família não vê o motivo
    expect(JSON.stringify(outro.corpo)).not.toContain('Consulta médica minha');

    expect((await pro.c.post('/api/profissionais/eu/bloqueios', { inicio: brasilia('2026-11-05', 10), fim: brasilia('2026-11-05', 9) })).status).toBe(422);
    await pro.c.delete(`/api/profissionais/eu/bloqueios/${folga.corpo.bloqueio.id}`);
    expect((await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio: brasilia('2026-11-03', 15), horas: 2 })).status).toBe(201);
  });

  it('não confirma dois atendimentos no mesmo horário', async () => {
    const pro = await profissionalAprovada(amb);
    const a = await familiaNova();
    const b = await familiaNova();
    const inicio = brasilia('2026-11-10', 9);
    const pa = (await a.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio, horas: 3 })).corpo.servico.id;
    const pb = (await b.post('/api/servicos', { profissional: pro.slug, tarefa: 'Mercado', inicio: brasilia('2026-11-10', 11), horas: 2 })).corpo.servico.id;
    await pro.c.post(`/api/servicos/${pa}/aceitar`);
    const segundo = await pro.c.post(`/api/servicos/${pb}/aceitar`);
    expect(segundo.status).toBe(409);
    expect(segundo.corpo.erro.codigo).toBe('horario_ocupado');
    // pedido novo no horário confirmado já é recusado na hora
    expect((await b.post('/api/servicos', { profissional: pro.slug, tarefa: 'Passeio', inicio: brasilia('2026-11-10', 10), horas: 2 })).corpo.erro.codigo).toBe('horario_ocupado');
    // logo depois, sem sobrepor, passa
    expect((await b.post('/api/servicos', { profissional: pro.slug, tarefa: 'Passeio', inicio: brasilia('2026-11-10', 12), horas: 2 })).status).toBe(201);
  });
});

describe('prazo de resposta', () => {
  it('pedido sem resposta em 24 horas expira e não pode mais ser aceito', async () => {
    const pro = await profissionalAprovada(amb);
    const fam = await familiaNova();
    const r = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio: brasilia('2026-11-20', 10), horas: 2 });
    expect(new Date(r.corpo.servico.respondaAte).getTime()).toBe(amb.relogio.agora.getTime() + DIA);
    amb.relogio.avancar(DIA + HORA);
    expect((await pro.c.get(`/api/servicos/${r.corpo.servico.id}`)).corpo.servico.situacao).toBe('expirado');
    expect((await pro.c.post(`/api/servicos/${r.corpo.servico.id}/aceitar`)).status).toBe(409);
  });

  it('pedido em cima da hora tem prazo até o início; proposta dá prazo à família', async () => {
    const pro = await profissionalAprovada(amb);
    const fam = await familiaNova();
    const inicio = new Date(amb.relogio.agora.getTime() + 5 * HORA).toISOString();
    const r = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Farmácia', inicio, horas: 2 });
    expect(r.corpo.servico.respondaAte).toBe(inicio);

    const outro = (await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio: new Date(amb.relogio.agora.getTime() + 3 * DIA).toISOString(), horas: 2 })).corpo.servico;
    const p = await pro.c.post(`/api/servicos/${outro.id}/propor`, { inicio: new Date(amb.relogio.agora.getTime() + 4 * DIA).toISOString(), horas: 2 });
    expect(new Date(p.corpo.servico.respondaAte).getTime()).toBe(amb.relogio.agora.getTime() + DIA);
    amb.relogio.avancar(DIA + HORA);
    expect((await fam.post(`/api/servicos/${outro.id}/aceitar-proposta`)).status).toBe(409);
    expect((await fam.get(`/api/servicos/${outro.id}`)).corpo.servico.situacao).toBe('expirado');
  });
});
