import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { temContato } from '../src/validacao.js';
import { ambiente, cliente, DIA, familia, profissionalAprovada, type Ambiente } from './ajuda.js';

let amb: Ambiente;
beforeAll(async () => {
  amb = await ambiente();
});
afterAll(() => amb.fechar());

describe('desconto por horas', () => {
  it('salva os dois campos juntos e aplica no pedido a partir das horas', async () => {
    const pro = await profissionalAprovada(amb);
    expect((await pro.c.patch('/api/profissionais/eu', { descontoAPartirHoras: 4 })).corpo.erro.campos.valorHoraDescontoCentavos).toBeDefined();
    expect((await pro.c.patch('/api/profissionais/eu', { descontoAPartirHoras: 4, valorHoraDescontoCentavos: 7000 })).corpo.erro.codigo).toBe('desconto_maior');
    expect((await pro.c.patch('/api/profissionais/eu', { valorHoraCentavos: 8000, descontoAPartirHoras: 4, valorHoraDescontoCentavos: 6500 })).status).toBe(400);
    const ok = await pro.c.patch('/api/profissionais/eu', { valorHoraCentavos: 8000, descontoAPartirHoras: 4, valorHoraDescontoCentavos: 7000, anosExperiencia: 6 });
    expect(ok.corpo.usuario.profissional).toMatchObject({ valorHoraCentavos: 8000, descontoAPartirHoras: 4, valorHoraDescontoCentavos: 7000, anosExperiencia: 6 });
    // baixar o valor da hora para baixo do desconto não passa
    expect((await pro.c.patch('/api/profissionais/eu', { valorHoraCentavos: 7000 })).corpo.erro.codigo).toBe('desconto_maior');

    const publico = (await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).corpo.profissional;
    expect(publico).toMatchObject({ descontoAPartirHoras: 4, valorHoraDescontoCentavos: 7000, anosExperiencia: 6 });

    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const inicio = new Date(amb.relogio.agora.getTime() + DIA).toISOString();
    const tres = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio, horas: 3 });
    expect(tres.corpo.servico).toMatchObject({ valorHoraCentavos: 8000, totalCentavos: 24000 });
    const quatro = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Consulta', inicio, horas: 4 });
    expect(quatro.corpo.servico).toMatchObject({ valorHoraCentavos: 7000, totalCentavos: 28000 });

    const tira = await pro.c.patch('/api/profissionais/eu', { descontoAPartirHoras: null, valorHoraDescontoCentavos: null });
    expect(tira.corpo.usuario.profissional).toMatchObject({ descontoAPartirHoras: null, valorHoraDescontoCentavos: null });
  });
});

describe('telefone, e-mail ou link em texto livre', () => {
  it('reconhece contato e deixa passar o resto', () => {
    for (const t of ['me liga 19 99999-0000', '(19) 98888 1234', 'ana@gmail.com', 'www.site.com', 'https://x.io', 'instagram.com/ana']) {
      expect(temContato(t), t).toBe(true);
    }
    for (const t of ['Consulta às 9h, levar exames de 2024', 'Rua Maria Monteiro, 120, apto 12', '4 horas no Taquaral', 'Dra. Ana Lúcia']) {
      expect(temContato(t), t).toBe(false);
    }
  });

  it('barra no pedido, no recado, na atividade e na apresentação', async () => {
    const pro = await profissionalAprovada(amb);
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const inicio = new Date(amb.relogio.agora.getTime() + DIA).toISOString();
    const r = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', observacoes: 'Me chama no 19 99999-0000', inicio, horas: 2 });
    expect(r.status).toBe(400);
    expect(r.corpo.erro.campos.observacoes).toBe('Não coloque telefone, e-mail ou link aqui.');
    const atividade = await pro.c.patch('/api/profissionais/eu', { tarefas: [{ tipo: 'personalizada', nome: 'Aulas ana@x.com', minimoHoras: 1 }] });
    expect(atividade.corpo.erro.campos['tarefas.0.nome']).toBe('Não coloque telefone, e-mail ou link aqui.');
    expect((await pro.c.patch('/api/profissionais/eu', { apresentacao: 'Veja meu site www.ana.com.br' })).corpo.erro.campos.apresentacao).toBeDefined();
    // o local (endereço) pode ter número e CEP
    expect((await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', local: 'Rua X, 120, CEP 13025-320', inicio, horas: 2 })).status).toBe(201);
  });
});
