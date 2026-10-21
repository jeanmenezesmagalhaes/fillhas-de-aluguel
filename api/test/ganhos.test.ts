import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { diasUteisDepois, feriados } from '../src/financeiro.js';
import { ambiente, cliente, DIA, familia, HORA, profissionalAprovada, type Ambiente } from './ajuda.js';

// o relógio dos testes começa em 2026-10-20T12:00Z: terça, 9h em Brasília
let amb: Ambiente;
beforeAll(async () => {
  amb = await ambiente();
});
afterAll(() => amb.fechar());

describe('dias úteis e feriados', () => {
  it('conhece os feriados bancários nacionais, inclusive os móveis', () => {
    const f = feriados(2026);
    for (const d of ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04', '2026-10-12', '2026-11-20']) expect(f.has(d), d).toBe(true);
  });
  it('pula fim de semana e feriado', () => {
    expect(diasUteisDepois('2026-10-09', 2)).toBe('2026-10-14'); // sexta; 12/10 é feriado
    expect(diasUteisDepois('2026-10-16', 2)).toBe('2026-10-20');
    expect(diasUteisDepois('2026-12-24', 1)).toBe('2026-12-28');
  });
});

describe('extrato de ganhos', () => {
  it('mostra bruto, desconto, taxa, líquido e quando cai na conta', async () => {
    const pro = await profissionalAprovada(amb);
    await pro.c.patch('/api/profissionais/eu', { valorHoraCentavos: 8000, descontoAPartirHoras: 4, valorHoraDescontoCentavos: 7000 });
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia({ nome: 'Mariana Costa', pessoaAcompanhada: { nome: 'Helena Costa' } }));
    const [helena] = (await fam.get('/api/pessoas')).corpo.pessoas;
    const em = (h: number) => new Date(amb.relogio.agora.getTime() + h * HORA).toISOString();
    const pedir = async (tarefa: string, inicio: string, horas: number) => {
      const { id } = (await fam.post('/api/servicos', { profissional: pro.slug, tarefa, inicio, horas, pessoaAcompanhadaId: helena.id })).corpo.servico;
      await pro.c.post(`/api/servicos/${id}/aceitar`);
      return id as string;
    };

    const consulta = await pedir('Consulta', em(24), 4); // quarta, 9h às 13h, com desconto
    const banco = await pedir('Banco', em(72), 2); // sexta
    const mercado = await pedir('Mercado', em(30), 2); // quarta, 15h: a família cancela em cima da hora
    const passeio = await pedir('Passeio', em(120), 2); // domingo: a família cancela com folga
    const exame = await pedir('Exame', em(96), 2); // sábado: a profissional cancela
    await pro.c.post(`/api/servicos/${exame}/cancelar`);
    await fam.post(`/api/servicos/${passeio}/cancelar`);
    amb.relogio.avancar(20 * HORA);
    await fam.post(`/api/servicos/${mercado}/cancelar`); // 10 h antes
    amb.relogio.avancar(10 * HORA); // quarta, 15h em Brasília
    await pro.c.post(`/api/servicos/${consulta}/concluir`);

    const g = (await pro.c.get('/api/profissionais/eu/ganhos')).corpo;
    expect(g.simulado).toBe(true);
    expect(g.regras).toMatchObject({ taxaPercentual: 12, prazoDepositoDiasUteis: 2, definitivas: false });
    const por = (id: string) => g.lancamentos.find((l: { servicoId: string }) => l.servicoId === id);
    expect(por(consulta)).toMatchObject({
      tipo: 'atendimento', estado: 'programado', para: 'Helena', horas: 4, valorHoraCentavos: 7000,
      descontoCentavos: 4000, brutoCentavos: 28000, taxaCentavos: 3360, liquidoCentavos: 24640, depositoEm: '2026-10-23', pagamento: null,
    });
    expect(por(banco)).toMatchObject({ estado: 'previsto', brutoCentavos: 16000, depositoEm: '2026-10-27' });
    expect(por(mercado)).toMatchObject({ tipo: 'cancelamento_tardio', brutoCentavos: 8000, taxaCentavos: 960, liquidoCentavos: 7040, descontoCentavos: 0 });
    expect(por(passeio)).toBeUndefined();
    expect(por(exame)).toBeUndefined();
    expect(g.resumo).toMatchObject({
      atendimentosFeitos: 1, horasFeitas: 4,
      brutoCentavos: 28000 + 16000 + 8000, taxaCentavos: 3360 + 1920 + 960,
      programadoCentavos: 24640 + 7040, previstoCentavos: 14080, depositadoCentavos: 0,
    });
    expect(g.proximosDepositos[0]).toMatchObject({ data: '2026-10-23', liquidoCentavos: 24640 + 7040, lancamentos: 2 });

    // passado o prazo, o depósito conta como feito; atendimento passado sem conclusão espera
    amb.relogio.avancar(4 * DIA);
    const depois = (await pro.c.get('/api/profissionais/eu/ganhos')).corpo;
    expect(depois.lancamentos.find((l: { servicoId: string }) => l.servicoId === consulta).estado).toBe('depositado');
    expect(depois.lancamentos.find((l: { servicoId: string }) => l.servicoId === banco)).toMatchObject({ estado: 'aguardando_conclusao', depositoEm: null });
    expect(depois.resumo.depositadoCentavos).toBe(24640 + 7040);
  });

  it('só a profissional vê os próprios ganhos, num período válido', async () => {
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    expect((await fam.get('/api/profissionais/eu/ganhos')).status).toBe(403);
    const pro = await profissionalAprovada(amb);
    expect((await pro.c.get('/api/profissionais/eu/ganhos?de=2026-11-01&ate=2026-10-01')).status).toBe(422);
    expect((await pro.c.get('/api/profissionais/eu/ganhos?de=2026-10-01&ate=2026-10-31')).corpo).toMatchObject({ periodo: { de: '2026-10-01', ate: '2026-10-31' }, lancamentos: [] });
  });
});
