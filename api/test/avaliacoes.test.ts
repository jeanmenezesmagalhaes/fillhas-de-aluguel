import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ambiente, cliente, DIA, familia, HORA, profissionalAprovada, type Ambiente } from './ajuda.js';

let amb: Ambiente;
beforeAll(async () => {
  amb = await ambiente();
});
afterAll(() => amb.fechar());

// família pede, profissional aceita, o horário passa e a profissional conclui
async function servicoRealizado() {
  const pro = await profissionalAprovada(amb);
  const fam = cliente(amb.app);
  const conta = await fam.post('/api/contas', familia({ pessoaAcompanhada: { nome: 'Helena Costa', parentesco: 'filha' } }));
  const [pessoa] = (await fam.get('/api/pessoas')).corpo.pessoas;
  const inicio = new Date(amb.relogio.agora.getTime() + DIA).toISOString();
  const pedido = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Consulta', inicio, horas: 4, pessoaAcompanhadaId: pessoa.id });
  expect(pedido.status).toBe(201);
  const id = pedido.corpo.servico.id as string;
  expect((await pro.c.post(`/api/servicos/${id}/aceitar`)).corpo.servico.situacao).toBe('confirmado');
  amb.relogio.avancar(DIA + 4 * HORA);
  expect((await pro.c.post(`/api/servicos/${id}/concluir`)).corpo.servico.situacao).toBe('realizado');
  return { pro, fam, id, familiaId: conta.corpo.usuario.id as string };
}

describe('pedido de serviço', () => {
  it('congela o valor da hora e respeita o mínimo de horas', async () => {
    const pro = await profissionalAprovada(amb);
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const inicio = new Date(amb.relogio.agora.getTime() + DIA).toISOString();
    const curto = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio, horas: 1 });
    expect(curto.status).toBe(422);
    expect(curto.corpo.erro.codigo).toBe('abaixo_do_minimo');
    const ok = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio, horas: 3 });
    expect(ok.corpo.servico).toMatchObject({ situacao: 'solicitado', valorHoraCentavos: 7000, totalCentavos: 21000, papel: 'contratante' });
    await pro.c.patch('/api/profissionais/eu', { valorHoraCentavos: 9000 });
    const visto = await pro.c.get(`/api/servicos/${ok.corpo.servico.id}`);
    expect(visto.corpo.servico).toMatchObject({ valorHoraCentavos: 7000, papel: 'profissional' });
  });

  it('só a profissional aceita, e ninguém de fora vê o pedido', async () => {
    const pro = await profissionalAprovada(amb);
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const inicio = new Date(amb.relogio.agora.getTime() + DIA).toISOString();
    const { id } = (await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Exame', inicio, horas: 2 })).corpo.servico;
    expect((await fam.post(`/api/servicos/${id}/aceitar`)).status).toBe(403);
    const estranha = cliente(amb.app);
    await estranha.post('/api/contas', familia());
    expect((await estranha.get(`/api/servicos/${id}`)).status).toBe(404);
    expect((await pro.c.post(`/api/servicos/${id}/recusar`)).corpo.servico.situacao).toBe('recusado');
    expect((await pro.c.post(`/api/servicos/${id}/aceitar`)).status).toBe(409);
  });
});

describe('proposta de outro horário', () => {
  async function pedidoNovo() {
    const pro = await profissionalAprovada(amb);
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const inicio = new Date(amb.relogio.agora.getTime() + 2 * DIA).toISOString();
    const r = await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Mercado', local: 'Rua Maria Monteiro, 120', observacoes: 'Levar a lista.', inicio, horas: 2 });
    expect(r.corpo.servico).toMatchObject({ local: 'Rua Maria Monteiro, 120', observacoes: 'Levar a lista.', proposta: null });
    return { pro, fam, id: r.corpo.servico.id as string, inicio };
  }

  it('família aceita o novo horário, que passa a valer', async () => {
    const { pro, fam, id, inicio } = await pedidoNovo();
    const novoInicio = new Date(new Date(inicio).getTime() + HORA).toISOString();
    expect((await fam.post(`/api/servicos/${id}/propor`, { inicio: novoInicio, horas: 3 })).status).toBe(403);
    const p = await pro.c.post(`/api/servicos/${id}/propor`, { inicio: novoInicio, horas: 3, recado: 'Às 9h tenho outro atendimento.' });
    expect(p.corpo.servico).toMatchObject({ situacao: 'proposta_alterada', horas: 2, proposta: { horas: 3, recado: 'Às 9h tenho outro atendimento.' } });
    expect(new Date(p.corpo.servico.inicio).toISOString()).toBe(inicio);
    expect((await pro.c.post(`/api/servicos/${id}/aceitar-proposta`)).status).toBe(403);
    const a = await fam.post(`/api/servicos/${id}/aceitar-proposta`);
    expect(a.corpo.servico).toMatchObject({ situacao: 'confirmado', horas: 3, totalCentavos: 21000, proposta: null });
    expect(new Date(a.corpo.servico.inicio).toISOString()).toBe(novoInicio);
  });

  it('família recusa a proposta e o pedido se encerra', async () => {
    const { pro, fam, id, inicio } = await pedidoNovo();
    await pro.c.post(`/api/servicos/${id}/propor`, { inicio, horas: 4 });
    expect((await fam.post(`/api/servicos/${id}/recusar-proposta`)).corpo.servico.situacao).toBe('recusado');
  });

  it('proposta precisa de horário futuro', async () => {
    const { pro, id } = await pedidoNovo();
    const r = await pro.c.post(`/api/servicos/${id}/propor`, { inicio: new Date(amb.relogio.agora.getTime() - HORA).toISOString(), horas: 2 });
    expect(r.status).toBe(422);
  });
});

describe('avaliação nos dois sentidos', () => {
  it('não avalia antes de o serviço ser realizado', async () => {
    const pro = await profissionalAprovada(amb);
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const inicio = new Date(amb.relogio.agora.getTime() + DIA).toISOString();
    const { id } = (await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Compras', inicio, horas: 2 })).corpo.servico;
    const r = await fam.post(`/api/servicos/${id}/avaliacoes`, { nota: 5 });
    expect(r.status).toBe(422);
    expect(r.corpo.erro.codigo).toBe('servico_nao_realizado');
  });

  it('esconde a nota até as duas partes avaliarem', async () => {
    const { pro, fam, id, familiaId } = await servicoRealizado();

    expect((await fam.post(`/api/servicos/${id}/avaliacoes`, { nota: 5, comentario: 'Pontual e atenciosa.' })).status).toBe(201);
    expect((await fam.post(`/api/servicos/${id}/avaliacoes`, { nota: 4 })).status).toBe(409);

    // a profissional sabe que foi avaliada, mas não vê a nota; o público também não
    const antes = await pro.c.get(`/api/servicos/${id}/avaliacoes`);
    expect(antes.corpo).toMatchObject({ minha: null, recebida: null, outraParteAvaliou: true, podeAvaliar: true });
    expect((await cliente(amb.app).get(`/api/profissionais/${pro.slug}/avaliacoes`)).corpo).toMatchObject({ total: 0, media: null });

    expect((await pro.c.post(`/api/servicos/${id}/avaliacoes`, { nota: 4, comentario: 'Família organizada.' })).status).toBe(201);

    const depois = await pro.c.get(`/api/servicos/${id}/avaliacoes`);
    expect(depois.corpo.recebida).toMatchObject({ nota: 5, comentario: 'Pontual e atenciosa.', sentido: 'familia_avalia_profissional' });
    expect(depois.corpo.minha).toMatchObject({ nota: 4, sentido: 'profissional_avalia_familia' });
    expect(depois.corpo.podeAvaliar).toBe(false);

    const publico = await cliente(amb.app).get(`/api/profissionais/${pro.slug}/avaliacoes`);
    expect(publico.corpo).toMatchObject({ total: 1, media: 5 });
    expect(publico.corpo.avaliacoes[0]).toMatchObject({ autor: 'Mariana C.', tarefa: 'Consulta' });
    expect(JSON.stringify(publico.corpo)).not.toContain('Costa');

    // na lista, cada parte vê a própria nota; a profissional vê também a nota da família
    const daPro = (await pro.c.get('/api/servicos')).corpo.servicos.find((s: { id: string }) => s.id === id);
    expect(daPro).toMatchObject({ minhaNota: 4, podeAvaliar: false, notaFamilia: { media: 4, total: 1 } });
    const daFamilia = (await fam.get('/api/servicos')).corpo.servicos.find((s: { id: string }) => s.id === id);
    expect(daFamilia).toMatchObject({ minhaNota: 5, podeAvaliar: false });
    expect(daFamilia).not.toHaveProperty('notaFamilia');

    const perfil = await cliente(amb.app).get(`/api/profissionais/${pro.slug}`);
    expect(perfil.corpo.profissional.nota).toEqual({ media: 5, total: 1 });

    // a nota da família só para a profissional que atendeu
    const notaFamilia = await pro.c.get(`/api/contratantes/${familiaId}/avaliacoes`);
    expect(notaFamilia.corpo).toMatchObject({ total: 1, media: 4 });
    const outraPro = await profissionalAprovada(amb);
    expect((await outraPro.c.get(`/api/contratantes/${familiaId}/avaliacoes`)).status).toBe(403);
    expect((await fam.get(`/api/contratantes/${familiaId}/avaliacoes`)).status).toBe(403);
  });

  it('revela a nota depois de 14 dias, e então não se avalia mais', async () => {
    const { pro, fam, id } = await servicoRealizado();
    await pro.c.post(`/api/servicos/${id}/avaliacoes`, { nota: 2 });
    expect((await fam.get(`/api/servicos/${id}/avaliacoes`)).corpo.recebida).toBeNull();

    amb.relogio.avancar(14 * DIA + HORA);
    const r = await fam.get(`/api/servicos/${id}/avaliacoes`);
    expect(r.corpo.recebida).toMatchObject({ nota: 2 });
    expect(r.corpo.podeAvaliar).toBe(false);
    const tarde = await fam.post(`/api/servicos/${id}/avaliacoes`, { nota: 1 });
    expect(tarde.status).toBe(422);
    expect(tarde.corpo.erro.codigo).toBe('prazo_encerrado');
  });

  it('nota fora de 1 a 5 é recusada', async () => {
    const { fam, id } = await servicoRealizado();
    const r = await fam.post(`/api/servicos/${id}/avaliacoes`, { nota: 6 });
    expect(r.status).toBe(400);
    expect(r.corpo.erro.campos.nota).toBe('Escolha uma nota de 1 a 5.');
  });
});

describe('resposta da profissional', () => {
  it('responde uma vez, só depois de a avaliação aparecer, e mostra a relação da família', async () => {
    const { pro, fam, id } = await servicoRealizado();
    const pessoa = (await fam.get('/api/pessoas')).corpo.pessoas[0];
    expect(pessoa).toHaveProperty('parentesco');
    await fam.post(`/api/servicos/${id}/avaliacoes`, { nota: 5, comentario: 'Muito cuidadosa.' });
    // ainda escondida: a profissional não avaliou
    const lista = async () => (await cliente(amb.app).get(`/api/profissionais/${pro.slug}/avaliacoes`)).corpo.avaliacoes;
    expect(await lista()).toEqual([]);
    const { rows } = await amb.banco.db.execute<{ id: string }>(sql`select id from avaliacoes where servico_id = ${id}`) as unknown as { rows: { id: string }[] };
    const avaliacaoId = rows[0]!.id;
    expect((await pro.c.post(`/api/avaliacoes/${avaliacaoId}/resposta`, { resposta: 'Obrigada!' })).status).toBe(409);

    await pro.c.post(`/api/servicos/${id}/avaliacoes`, { nota: 5 });
    expect((await fam.post(`/api/avaliacoes/${avaliacaoId}/resposta`, { resposta: 'Oi' })).status).toBe(404);
    expect((await pro.c.post(`/api/avaliacoes/${avaliacaoId}/resposta`, { resposta: 'Me chame no 19 99999-0000' })).status).toBe(400);
    const r = await pro.c.post(`/api/avaliacoes/${avaliacaoId}/resposta`, { resposta: 'Obrigada, foi um prazer acompanhar a Helena.' });
    expect(r.status).toBe(200);
    expect((await pro.c.post(`/api/avaliacoes/${avaliacaoId}/resposta`, { resposta: 'De novo' })).status).toBe(409);
    expect((await lista())[0]).toMatchObject({ resposta: 'Obrigada, foi um prazer acompanhar a Helena.', relacao: 'Filha' });
  });
});
