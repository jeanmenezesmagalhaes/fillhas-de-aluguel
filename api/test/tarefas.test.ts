import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ambiente, cliente, DIA, familia, profissionalAprovada, type Ambiente } from './ajuda.js';

let amb: Ambiente;
beforeAll(async () => {
  amb = await ambiente();
});
afterAll(() => amb.fechar());

const TAREFAS_ANA = [
  { tipo: 'consulta', minimoHoras: 2 },
  { tipo: 'banco', minimoHoras: 2 },
  { tipo: 'mercado', minimoHoras: 1 },
  { tipo: 'passeio', minimoHoras: 2 },
  { tipo: 'personalizada', nome: 'Companhia em casa', minimoHoras: 3 },
];

describe('tarefas da profissional', () => {
  it('guarda o mínimo de cada tarefa e deriva o mínimo geral', async () => {
    const pro = await profissionalAprovada(amb);
    const r = await pro.c.patch('/api/profissionais/eu', { tarefas: TAREFAS_ANA, aceitaOutras: true });
    expect(r.status).toBe(200);
    expect(r.corpo.usuario.profissional).toMatchObject({
      aceitaOutras: true,
      horasMinimas: 1,
      tarefas: [
        { tipo: 'consulta', nome: 'Consulta ou exame', minimoHoras: 2 },
        { tipo: 'banco', nome: 'Banco ou cartório', minimoHoras: 2 },
        { tipo: 'mercado', nome: 'Mercado e farmácia', minimoHoras: 1 },
        { tipo: 'passeio', nome: 'Passeio', minimoHoras: 2 },
        { tipo: 'personalizada', nome: 'Companhia em casa', minimoHoras: 3 },
      ],
    });
    const publico = (await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).corpo.profissional;
    expect(publico.aceitaOutras).toBe(true);
    expect(publico.tarefas).toHaveLength(5);
  });

  it('recusa tarefa repetida, atividade sem nome e lista vazia sem aceitar outras', async () => {
    const pro = await profissionalAprovada(amb);
    const repetida = await pro.c.patch('/api/profissionais/eu', { tarefas: [{ tipo: 'banco', minimoHoras: 1 }, { tipo: 'banco', minimoHoras: 2 }] });
    expect(repetida.status).toBe(400);
    expect(repetida.corpo.erro.campos['tarefas.1.tipo']).toBe('Esta tarefa já está na lista.');
    const semNome = await pro.c.patch('/api/profissionais/eu', { tarefas: [{ tipo: 'mercado', minimoHoras: 1 }, { tipo: 'personalizada', minimoHoras: 2 }] });
    expect(semNome.corpo.erro.campos['tarefas.1.nome']).toContain('nome');
    const nomeRepetido = await pro.c.patch('/api/profissionais/eu', {
      tarefas: [{ tipo: 'personalizada', nome: 'Leitura', minimoHoras: 1 }, { tipo: 'personalizada', nome: 'leitura', minimoHoras: 2 }],
    });
    expect(nomeRepetido.corpo.erro.campos['tarefas.1.nome']).toContain('já tem');
    const foraDaFaixa = await pro.c.patch('/api/profissionais/eu', { tarefas: [{ tipo: 'passeio', minimoHoras: 13 }] });
    expect(foraDaFaixa.corpo.erro.campos['tarefas.0.minimoHoras']).toBeDefined();

    const vazia = await pro.c.patch('/api/profissionais/eu', { tarefas: [], aceitaOutras: false });
    expect(vazia.status).toBe(422);
    expect(vazia.corpo.erro.campos.tarefas).toBe('Escolha ao menos uma tarefa ou aceite outras a combinar.');
    const soOutras = await pro.c.patch('/api/profissionais/eu', { tarefas: [], aceitaOutras: true });
    expect(soOutras.corpo.usuario.profissional).toMatchObject({ tarefas: [], aceitaOutras: true, horasMinimas: 1 });
    // desligar "outras" com a lista vazia salva também não passa
    expect((await pro.c.patch('/api/profissionais/eu', { aceitaOutras: false })).status).toBe(422);
  });
});

describe('pedido por tarefa', () => {
  it('vale o mínimo da tarefa escolhida', async () => {
    const pro = await profissionalAprovada(amb);
    await pro.c.patch('/api/profissionais/eu', { tarefas: TAREFAS_ANA, aceitaOutras: false });
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const inicio = new Date(amb.relogio.agora.getTime() + DIA).toISOString();
    const pedir = (extra: Record<string, unknown>) => fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Pedido', inicio, ...extra });

    const curto = await pedir({ tipoTarefa: 'consulta', horas: 1 });
    expect(curto.status).toBe(422);
    expect(curto.corpo.erro).toMatchObject({ codigo: 'abaixo_do_minimo', mensagem: 'Para consulta ou exame, esta profissional atende a partir de 2 horas.' });
    const mercado = await pedir({ tipoTarefa: 'mercado', horas: 1 });
    expect(mercado.status).toBe(201);
    expect(mercado.corpo.servico.tipoTarefa).toBe('mercado');

    const casa = await pedir({ tipoTarefa: 'personalizada', nomeTarefa: 'companhia em casa', horas: 2 });
    expect(casa.corpo.erro.mensagem).toBe('Para companhia em casa, esta profissional atende a partir de 3 horas.');
    expect((await pedir({ tipoTarefa: 'personalizada', nomeTarefa: 'Companhia em casa', horas: 3 })).status).toBe(201);
    expect((await pedir({ tipoTarefa: 'personalizada', nomeTarefa: 'Pintura', horas: 3 })).corpo.erro.codigo).toBe('tarefa_nao_oferecida');

    expect((await pedir({ tipoTarefa: 'outra', horas: 1 })).corpo.erro.codigo).toBe('tarefa_nao_oferecida');
    await pro.c.patch('/api/profissionais/eu', { aceitaOutras: true });
    expect((await pedir({ tipoTarefa: 'outra', horas: 1 })).status).toBe(201);
  });

  it('tarefa que ela não faz é recusada', async () => {
    const pro = await profissionalAprovada(amb);
    await pro.c.patch('/api/profissionais/eu', { tarefas: [{ tipo: 'banco', minimoHoras: 1 }] });
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const inicio = new Date(amb.relogio.agora.getTime() + DIA).toISOString();
    const r = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Passeio no parque', tipoTarefa: 'passeio', inicio, horas: 2 });
    expect(r.corpo.erro.codigo).toBe('tarefa_nao_oferecida');
  });
});
