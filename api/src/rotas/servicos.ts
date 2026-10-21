import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias, type PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exigirContratante, exigirUsuario, type UsuarioSessao } from '../auth.js';
import { avaliacaoRevelada, notaRecebida, PRAZO_AVALIACAO_MS, type Sentido } from '../avaliacoes.js';
import type { Contexto } from '../contexto.js';
import { avaliacoes, pessoasAcompanhadas, profissionais, servicos, usuarios } from '../db/schema.js';
import { conflito, ErroApi, naoEncontrado, violouUnico } from '../erros.js';
import * as v from '../validacao.js';
import { marcarPrimeiroServico } from './indicacoes.js';
import { conferirHorario, expirarVencidos, prazoDeResposta } from '../disponibilidade.js';
import { mensagemAbaixoDoMinimo, NOME_TAREFA, TIPOS_FIXOS, tarefasDe } from '../tarefas.js';

type Situacao = (typeof servicos.$inferSelect)['situacao'];
type Papel = 'contratante' | 'profissional';

const inicioFuturo = z.iso.datetime({ offset: true, error: 'Informe data e horário de início.' });
const horas = z.number({ error: 'Informe quantas horas.' }).int('Use horas inteiras.').min(1, 'O mínimo é 1 hora.').max(24);
const textoCurto = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`).optional();
// texto que a outra parte lê: sem telefone, e-mail ou link
const textoLivre = (max: number) => v.semContato(textoCurto(max));

const pedido = z.object({
  profissional: z.string({ error: 'Escolha a profissional.' }).min(1).max(80),
  tarefa: v.semContato(z.string({ error: 'Conte qual é a tarefa.' }).trim().min(2, 'Conte qual é a tarefa.').max(200)),
  // tarefa da lista da profissional; 'outra' é a combinar, se ela aceitar
  tipoTarefa: z.enum([...TIPOS_FIXOS, 'personalizada', 'outra'], { error: 'Escolha a tarefa.' }).optional(),
  // nome da atividade personalizada, como está no perfil dela
  nomeTarefa: z.string().trim().max(60).optional(),
  local: textoCurto(200),
  observacoes: textoLivre(1000),
  inicio: inicioFuturo,
  horas,
  pessoaAcompanhadaId: v.uuid.optional(),
});

const proposta = z.object({ inicio: inicioFuturo, horas, recado: textoLivre(500) });

const avaliacao = z.object({
  nota: z.number({ error: 'Escolha uma nota de 1 a 5.' }).int().min(1, 'Escolha uma nota de 1 a 5.').max(5, 'Escolha uma nota de 1 a 5.'),
  comentario: v.semContato(z.string().trim().max(1000, 'Use no máximo 1000 caracteres.').optional()),
});

const idParam = z.object({ id: v.uuid });

const familia = alias(usuarios, 'familia');
const pro = alias(usuarios, 'pro');
const minha = alias(avaliacoes, 'minha');

const colunasServico = {
  id: servicos.id,
  tarefa: servicos.tarefa,
  tipoTarefa: servicos.tipoTarefa,
  local: servicos.local,
  observacoes: servicos.observacoes,
  inicio: servicos.inicio,
  horas: servicos.horas,
  valorHoraCentavos: servicos.valorHoraCentavos,
  totalCentavos: sql<number>`(${servicos.horas} * ${servicos.valorHoraCentavos})::int`,
  situacao: servicos.situacao,
  proposta: { inicio: servicos.propostaInicio, horas: servicos.propostaHoras, recado: servicos.propostaRecado },
  realizadoEm: servicos.realizadoEm,
  respondaAte: servicos.respondaAte,
  contratanteId: servicos.contratanteId,
  contratante: { id: familia.id, nome: familia.nome },
  profissional: { id: pro.id, nome: pro.nome, slug: profissionais.slug, veiculoIncluso: profissionais.veiculoIncluso },
  pessoaAcompanhada: { id: pessoasAcompanhadas.id, nome: pessoasAcompanhadas.nome, dataNascimento: pessoasAcompanhadas.dataNascimento },
  minhaNota: minha.nota,
};

type LinhaServico = Awaited<ReturnType<ReturnType<typeof consultaServicos>['where']>>[number];

// `minhaNota` é a avaliação que quem pergunta deu ao serviço, se já deu.
function consultaServicos(ctx: Contexto, usuarioId: string) {
  return ctx.db
    .select(colunasServico)
    .from(servicos)
    .innerJoin(familia, eq(familia.id, servicos.contratanteId))
    .innerJoin(pro, eq(pro.id, servicos.profissionalId))
    .innerJoin(profissionais, eq(profissionais.usuarioId, servicos.profissionalId))
    .leftJoin(pessoasAcompanhadas, eq(pessoasAcompanhadas.id, servicos.pessoaAcompanhadaId))
    .leftJoin(minha, and(eq(minha.servicoId, servicos.id), eq(minha.autorId, usuarioId)));
}

function paraResposta(ctx: Contexto, usuarioId: string, s: LinhaServico) {
  const { contratanteId, proposta: p, ...resto } = s;
  const prazo = s.realizadoEm ? s.realizadoEm.getTime() + PRAZO_AVALIACAO_MS : 0;
  return {
    ...resto,
    papel: (contratanteId === usuarioId ? 'contratante' : 'profissional') as Papel,
    proposta: s.situacao === 'proposta_alterada' ? p : null,
    podeAvaliar: s.situacao === 'realizado' && s.minhaNota == null && ctx.agora().getTime() <= prazo,
  };
}

async function servicoCompleto(ctx: Contexto, u: UsuarioSessao, id: string) {
  const [s] = await consultaServicos(ctx, u.id).where(eq(servicos.id, id));
  return paraResposta(ctx, u.id, s!);
}

// O serviço só existe para as duas partes; para qualquer outra pessoa, ele não existe.
async function servicoDaParte(ctx: Contexto, u: UsuarioSessao, id: string) {
  const [s] = await ctx.db
    .select({
      id: servicos.id,
      contratanteId: servicos.contratanteId,
      profissionalId: servicos.profissionalId,
      situacao: servicos.situacao,
      inicio: servicos.inicio,
      horas: servicos.horas,
      propostaInicio: servicos.propostaInicio,
      propostaHoras: servicos.propostaHoras,
      realizadoEm: servicos.realizadoEm,
    })
    .from(servicos)
    .where(and(eq(servicos.id, id), or(eq(servicos.contratanteId, u.id), eq(servicos.profissionalId, u.id))));
  if (!s) throw naoEncontrado('Serviço não encontrado.');
  return { ...s, papel: (s.contratanteId === u.id ? 'contratante' : 'profissional') as Papel };
}

const soDa = (quem: Papel) =>
  new ErroApi(403, 'outra_parte', quem === 'profissional' ? 'Quem responde ao pedido é a profissional.' : 'Esta ação é da família.');

export function rotasServicos(app: FastifyInstance, ctx: Contexto) {
  app.post('/api/servicos', async (req, reply) => {
    const u = exigirContratante(req);
    const dados = pedido.parse(req.body);
    const [p] = await ctx.db
      .select({
        usuarioId: profissionais.usuarioId,
        situacao: profissionais.situacao,
        valor: profissionais.valorHoraCentavos,
        horasMinimas: profissionais.horasMinimas,
        aceitaOutras: profissionais.aceitaOutras,
        descontoAPartir: profissionais.descontoAPartirHoras,
        valorDesconto: profissionais.valorHoraDescontoCentavos,
      })
      .from(profissionais)
      .where(eq(profissionais.slug, dados.profissional));
    if (!p || p.situacao !== 'aprovado' || !p.valor) throw naoEncontrado('Profissional não encontrada.');
    if (p.usuarioId === u.id) throw new ErroApi(422, 'proprio_perfil', 'Você não pode contratar o seu próprio perfil.');
    // com a tarefa escolhida, vale o mínimo dela; sem tarefa (ou perfil sem lista), o mínimo geral
    const lista = dados.tipoTarefa ? await tarefasDe(ctx.db, p.usuarioId) : [];
    let minimo = { nome: '', horas: p.horasMinimas };
    if (dados.tipoTarefa && (lista.length || p.aceitaOutras)) {
      if (dados.tipoTarefa === 'outra') {
        if (!p.aceitaOutras) {
          throw new ErroApi(422, 'tarefa_nao_oferecida', 'Esta profissional não aceita outras tarefas a combinar.', { tipoTarefa: 'Escolha uma das tarefas do perfil.' });
        }
        minimo = { nome: '', horas: 1 };
      } else {
        const t = lista.find((x) =>
          x.tipo === dados.tipoTarefa &&
          (x.tipo !== 'personalizada' || x.nome.toLocaleLowerCase('pt-BR') === (dados.nomeTarefa ?? '').toLocaleLowerCase('pt-BR')),
        );
        if (!t) {
          throw new ErroApi(422, 'tarefa_nao_oferecida', 'Esta profissional não faz esta tarefa.', { tipoTarefa: 'Escolha uma das tarefas do perfil.' });
        }
        minimo = { nome: t.tipo === 'personalizada' ? t.nome : NOME_TAREFA[t.tipo], horas: t.minimoHoras };
      }
    }
    if (dados.horas < minimo.horas) {
      const plural = minimo.horas === 1 ? 'hora' : 'horas';
      throw new ErroApi(
        422,
        'abaixo_do_minimo',
        minimo.nome ? mensagemAbaixoDoMinimo(minimo.nome, minimo.horas) : `Esta profissional atende a partir de ${minimo.horas} ${plural}.`,
        { horas: `O mínimo é de ${minimo.horas} ${plural}.` },
      );
    }
    const inicio = new Date(dados.inicio);
    if (inicio <= ctx.agora()) {
      throw new ErroApi(422, 'inicio_no_passado', 'Escolha um horário a partir de agora.', { inicio: 'Escolha um horário futuro.' });
    }
    // dentro dos dias e horários dela, fora das folgas e sem bater com outro atendimento
    await conferirHorario(ctx.db, p.usuarioId, inicio, dados.horas);
    if (dados.pessoaAcompanhadaId) {
      const [dela] = await ctx.db
        .select({ id: pessoasAcompanhadas.id })
        .from(pessoasAcompanhadas)
        .where(and(eq(pessoasAcompanhadas.id, dados.pessoaAcompanhadaId), eq(pessoasAcompanhadas.contratanteId, u.id)));
      if (!dela) throw new ErroApi(422, 'pessoa_invalida', 'Escolha uma das pessoas da sua conta.', { pessoaAcompanhadaId: 'Pessoa não encontrada.' });
    }
    const [novo] = await ctx.db
      .insert(servicos)
      .values({
        contratanteId: u.id,
        profissionalId: p.usuarioId,
        pessoaAcompanhadaId: dados.pessoaAcompanhadaId,
        tarefa: dados.tarefa,
        tipoTarefa: dados.tipoTarefa ?? null,
        local: dados.local || null,
        observacoes: dados.observacoes || null,
        inicio,
        horas: dados.horas,
        respondaAte: prazoDeResposta(ctx.agora(), inicio),
        // a partir de N horas vale a hora com desconto, se ela oferece
        valorHoraCentavos: p.descontoAPartir && p.valorDesconto && dados.horas >= p.descontoAPartir ? p.valorDesconto : p.valor,
        valorHoraCheioCentavos: p.descontoAPartir && p.valorDesconto && dados.horas >= p.descontoAPartir ? p.valor : null,
      })
      .returning({ id: servicos.id });
    return reply.status(201).send({ servico: await servicoCompleto(ctx, u, novo!.id) });
  });

  // pedidos da família e pedidos recebidos pela profissional, do mais recente ao mais antigo.
  // Nos pedidos recebidos vem também a nota da família, para a profissional decidir.
  app.get('/api/servicos', async (req) => {
    const u = exigirUsuario(req);
    await expirarVencidos(ctx.db, ctx.agora());
    const linhas = await consultaServicos(ctx, u.id)
      .where(or(eq(servicos.contratanteId, u.id), eq(servicos.profissionalId, u.id)))
      .orderBy(desc(servicos.inicio))
      .limit(200);
    const lista = linhas.map((s) => paraResposta(ctx, u.id, s));
    const familias = [...new Set(lista.filter((s) => s.papel === 'profissional').map((s) => s.contratante.id))];
    const notas = new Map(
      await Promise.all(
        familias.map(async (id) => [id, await notaRecebida(ctx.db, id, 'profissional_avalia_familia', ctx.agora())] as const),
      ),
    );
    return {
      servicos: lista.map((s) => (s.papel === 'profissional' ? { ...s, notaFamilia: notas.get(s.contratante.id) } : s)),
    };
  });

  app.get('/api/servicos/:id', async (req) => {
    const u = exigirUsuario(req);
    const { id } = idParam.parse(req.params);
    await expirarVencidos(ctx.db, ctx.agora());
    const s = await servicoDaParte(ctx, u, id);
    return { servico: await servicoCompleto(ctx, u, s.id) };
  });

  // Mudança de situação numa só instrução: só muda se ainda estiver numa situação de origem,
  // então dois cliques ao mesmo tempo não aceitam e recusam o mesmo pedido.
  const transicao = (
    rota: string,
    quem: Papel | 'qualquer',
    de: Situacao[],
    para: Situacao,
    op: {
      validar?: (s: Awaited<ReturnType<typeof servicoDaParte>>, corpo: unknown) => void | Promise<void>;
      campos?: (agora: Date, corpo: unknown, s: Awaited<ReturnType<typeof servicoDaParte>>) => PgUpdateSetSource<typeof servicos>;
      depois?: (s: Awaited<ReturnType<typeof servicoDaParte>>, agora: Date) => Promise<void>;
    } = {},
  ) =>
    app.post(`/api/servicos/:id/${rota}`, async (req) => {
      const u = exigirUsuario(req);
      const { id } = idParam.parse(req.params);
      // pedido ou proposta sem resposta no prazo não pode mais ser aceito
      await expirarVencidos(ctx.db, ctx.agora());
      const s = await servicoDaParte(ctx, u, id);
      if (quem !== 'qualquer' && s.papel !== quem) throw soDa(quem);
      await op.validar?.(s, req.body);
      const agora = ctx.agora();
      const mudou = await ctx.db
        .update(servicos)
        .set({ situacao: para, atualizadoEm: agora, ...op.campos?.(agora, req.body, s) })
        .where(and(eq(servicos.id, id), inArray(servicos.situacao, de)))
        .returning({ id: servicos.id });
      if (!mudou.length) throw conflito('situacao_mudou', 'Este serviço mudou de situação. Atualize a página.');
      await op.depois?.(s, agora);
      return { servico: await servicoCompleto(ctx, u, id) };
    });

  const antesDoInicio = (s: { inicio: Date }) => {
    if (s.inicio <= ctx.agora()) throw new ErroApi(422, 'ja_comecou', 'O horário do serviço já começou; ele não pode mais mudar.');
  };

  // aceitar não pode bater com outro atendimento já confirmado (os horários dela ela mesma conhece)
  transicao('aceitar', 'profissional', ['solicitado'], 'confirmado', {
    validar: (s) => conferirHorario(ctx.db, s.profissionalId, s.inicio, s.horas, { conferirFaixas: false, ignorarServico: s.id }),
    campos: () => ({ respondaAte: null }),
  });
  transicao('recusar', 'profissional', ['solicitado'], 'recusado');
  // a profissional propõe outro horário ou outra duração; o pedido espera o novo aceite da família
  transicao('propor', 'profissional', ['solicitado'], 'proposta_alterada', {
    validar: async (s, corpo) => {
      antesDoInicio(s);
      const p = proposta.parse(corpo);
      if (new Date(p.inicio) <= ctx.agora()) {
        throw new ErroApi(422, 'inicio_no_passado', 'Proponha um horário a partir de agora.', { inicio: 'Escolha um horário futuro.' });
      }
      await conferirHorario(ctx.db, s.profissionalId, new Date(p.inicio), p.horas, { conferirFaixas: false, ignorarServico: s.id });
    },
    // a família tem o mesmo prazo para responder à proposta
    campos: (agora, corpo) => {
      const p = proposta.parse(corpo);
      const inicio = new Date(p.inicio);
      return { propostaInicio: inicio, propostaHoras: p.horas, propostaRecado: p.recado || null, respondaAte: prazoDeResposta(agora, inicio) };
    },
  });
  transicao('aceitar-proposta', 'contratante', ['proposta_alterada'], 'confirmado', {
    validar: (s) =>
      conferirHorario(ctx.db, s.profissionalId, s.propostaInicio!, s.propostaHoras!, { conferirFaixas: false, ignorarServico: s.id }),
    campos: () => ({
      respondaAte: null,
      inicio: sql`${servicos.propostaInicio}`,
      horas: sql`${servicos.propostaHoras}`,
      propostaInicio: null,
      propostaHoras: null,
    }),
  });
  transicao('recusar-proposta', 'contratante', ['proposta_alterada'], 'recusado');
  // quem cancelou e quando: cancelamento da família em cima da hora entra nos ganhos dela
  transicao('cancelar', 'qualquer', ['solicitado', 'proposta_alterada', 'confirmado'], 'cancelado', {
    validar: antesDoInicio,
    campos: (agora, _corpo, s) => ({ canceladoEm: agora, canceladoPor: s.papel }),
  });
  transicao('concluir', 'profissional', ['confirmado'], 'realizado', {
    validar: (s) => {
      if (s.inicio > ctx.agora()) throw new ErroApi(422, 'ainda_nao_comecou', 'O serviço só pode ser concluído depois do horário de início.');
    },
    campos: (agora) => ({ realizadoEm: agora }),
    // etapa das indicações: primeiro serviço feito da família e da profissional
    depois: (s, agora) => marcarPrimeiroServico(ctx.db, [s.contratanteId, s.profissionalId], agora),
  });

  // avaliação de um serviço realizado: cada parte avalia a outra uma vez
  app.post('/api/servicos/:id/avaliacoes', async (req, reply) => {
    const u = exigirUsuario(req);
    const { id } = idParam.parse(req.params);
    const dados = avaliacao.parse(req.body);
    const s = await servicoDaParte(ctx, u, id);
    if (s.situacao !== 'realizado' || !s.realizadoEm) {
      throw new ErroApi(422, 'servico_nao_realizado', 'Só dá para avaliar depois que o serviço for realizado.');
    }
    if (ctx.agora().getTime() > s.realizadoEm.getTime() + PRAZO_AVALIACAO_MS) {
      throw new ErroApi(422, 'prazo_encerrado', 'O prazo de 14 dias para avaliar este serviço terminou.');
    }
    const sentido: Sentido = s.papel === 'contratante' ? 'familia_avalia_profissional' : 'profissional_avalia_familia';
    try {
      const [a] = await ctx.db
        .insert(avaliacoes)
        .values({
          servicoId: s.id,
          autorId: u.id,
          avaliadoId: s.papel === 'contratante' ? s.profissionalId : s.contratanteId,
          sentido,
          nota: dados.nota,
          comentario: dados.comentario || null,
        })
        .returning({ id: avaliacoes.id, nota: avaliacoes.nota, comentario: avaliacoes.comentario, sentido: avaliacoes.sentido, criadoEm: avaliacoes.criadoEm });
      return reply.status(201).send({ avaliacao: a });
    } catch (err) {
      if (violouUnico(err, 'avaliacao_unica_por_sentido')) throw conflito('ja_avaliado', 'Você já avaliou este serviço.');
      throw err;
    }
  });

  // a profissional responde, uma vez e em público, à avaliação que recebeu da família
  app.post('/api/avaliacoes/:id/resposta', async (req) => {
    const u = exigirUsuario(req);
    const { id } = idParam.parse(req.params);
    const { resposta } = z
      .object({ resposta: v.semContato(z.string({ error: 'Escreva a resposta.' }).trim().min(2, 'Escreva a resposta.').max(500, 'Use no máximo 500 caracteres.')) })
      .parse(req.body);
    const agora = ctx.agora();
    const [a] = await ctx.db
      .select({ avaliadoId: avaliacoes.avaliadoId, sentido: avaliacoes.sentido, resposta: avaliacoes.resposta, revelada: sql<boolean>`${avaliacaoRevelada(agora)}` })
      .from(avaliacoes)
      .innerJoin(servicos, eq(servicos.id, avaliacoes.servicoId))
      .where(eq(avaliacoes.id, id));
    if (!a || a.avaliadoId !== u.id || a.sentido !== 'familia_avalia_profissional') throw naoEncontrado('Avaliação não encontrada.');
    if (!a.revelada) throw conflito('avaliacao_escondida', 'Você poderá responder quando a avaliação aparecer no seu perfil.');
    const [feita] = await ctx.db
      .update(avaliacoes)
      .set({ resposta, respondidoEm: agora })
      .where(and(eq(avaliacoes.id, id), isNull(avaliacoes.resposta)))
      .returning({ id: avaliacoes.id, resposta: avaliacoes.resposta, respondidoEm: avaliacoes.respondidoEm });
    if (!feita) throw conflito('ja_respondida', 'Você já respondeu a esta avaliação.');
    return { avaliacao: feita };
  });

  // as duas avaliações do serviço, do ponto de vista de quem pergunta: a minha sempre;
  // a da outra parte só depois de revelada
  app.get('/api/servicos/:id/avaliacoes', async (req) => {
    const u = exigirUsuario(req);
    const { id } = idParam.parse(req.params);
    const s = await servicoDaParte(ctx, u, id);
    const agora = ctx.agora();
    const linhas = await ctx.db
      .select({
        id: avaliacoes.id,
        autorId: avaliacoes.autorId,
        sentido: avaliacoes.sentido,
        nota: avaliacoes.nota,
        comentario: avaliacoes.comentario,
        criadoEm: avaliacoes.criadoEm,
        revelada: sql<boolean>`${avaliacaoRevelada(agora)}`,
      })
      .from(avaliacoes)
      .innerJoin(servicos, eq(servicos.id, avaliacoes.servicoId))
      .where(eq(avaliacoes.servicoId, s.id));
    const daPessoa = linhas.find((a) => a.autorId === u.id);
    const daOutra = linhas.find((a) => a.autorId !== u.id);
    const limpa = ({ autorId, revelada, ...a }: (typeof linhas)[number]) => a;
    const fimDoPrazo = s.realizadoEm ? new Date(s.realizadoEm.getTime() + PRAZO_AVALIACAO_MS) : null;
    return {
      minha: daPessoa ? limpa(daPessoa) : null,
      // `recebida` fica nula enquanto escondida; `outraParteAvaliou` diz só que existe
      recebida: daOutra?.revelada ? limpa(daOutra) : null,
      outraParteAvaliou: !!daOutra,
      podeAvaliar: s.situacao === 'realizado' && !daPessoa && !!fimDoPrazo && agora <= fimDoPrazo,
      prazoAte: fimDoPrazo,
    };
  });
}
