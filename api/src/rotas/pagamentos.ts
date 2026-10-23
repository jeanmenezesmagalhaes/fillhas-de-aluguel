import { timingSafeEqual } from 'node:crypto';
import { and, desc, eq, gt, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { exigirAdmin, exigirContratante, exigirUsuario } from '../auth.js';
import { PRAZO_AVALIACAO_MS } from '../avaliacoes.js';
import type { Contexto } from '../contexto.js';
import { avaliacoes, pagamentos, profissionais, servicos, usuarios } from '../db/schema.js';
import { expirarVencidos } from '../disponibilidade.js';
import { conflito, ErroApi, naoEncontrado } from '../erros.js';
import { percentualDaTaxa, REGRAS, taxaDe } from '../financeiro.js';
import { carenciaDaChave } from './contas.js';
import { acrescimoCartao, maxParcelas, type Cobranca, type GatewaySimulado } from '../pagamentos.js';
import * as v from '../validacao.js';

const idParam = z.object({ id: v.uuid });

// o que muda a taxa da plataforma para a profissional (convite especial)
export const beneficioDaProfissional = {
  taxaEspecialPercentual: profissionais.taxaEspecialPercentual,
  taxaEspecialMeses: profissionais.taxaEspecialMeses,
  taxaEspecialAte: profissionais.taxaEspecialAte,
};
const DIA_MS = 86_400_000;

type Pagamento = typeof pagamentos.$inferSelect;

const mensagemDe = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 500);

// erro do gateway vira uma mensagem para a tela; o detalhe fica no log
function falhaDoGateway(req: FastifyRequest, err: unknown, mensagem: string): never {
  if (err instanceof ErroApi) throw err;
  req.log.error({ err }, 'gateway de pagamento');
  throw new ErroApi(502, 'gateway_indisponivel', mensagem);
}

// o que as duas partes veem do pagamento
const resumo = (p: Pagamento) => ({
  situacao: p.situacao,
  valorCentavos: p.valorCentavos,
  metodo: p.metodo,
  parcelas: p.parcelas,
  acrescimoCentavos: p.acrescimoCentavos,
  pagoEm: p.pagoEm,
  reembolsadoEm: p.reembolsadoEm,
  repasseSituacao: p.repasseSituacao,
  repassadoEm: p.repassadoEm,
  url: p.situacao === 'pendente' ? p.url : null,
});

// Devolve o dinheiro de um pagamento, inteiro. Se o gateway recusar, guarda o motivo para a
// equipe tentar de novo pela administração e responde false.
async function estornar(ctx: Contexto, pag: Pick<Pagamento, 'id' | 'cobrancaId'>, motivo: string): Promise<boolean> {
  const agora = ctx.agora();
  try {
    await ctx.pagamentos.reembolsar(pag.cobrancaId, motivo);
  } catch (err) {
    await ctx.db.update(pagamentos).set({ reembolsoErro: mensagemDe(err), atualizadoEm: agora }).where(eq(pagamentos.id, pag.id));
    return false;
  }
  await ctx.db
    .update(pagamentos)
    .set({ situacao: 'reembolsado', reembolsadoEm: agora, reembolsoErro: null, atualizadoEm: agora })
    .where(and(eq(pagamentos.id, pag.id), eq(pagamentos.situacao, 'pago')));
  return true;
}

// Serviço cancelado: se a família já pagou, devolve tudo.
export async function estornarDoServico(ctx: Contexto, servicoId: string, motivo: string) {
  const [pag] = await ctx.db
    .select()
    .from(pagamentos)
    .where(and(eq(pagamentos.servicoId, servicoId), eq(pagamentos.situacao, 'pago')));
  if (pag) await estornar(ctx, pag, motivo);
}

// Aplica o que o gateway diz da cobrança. Pago: confirma o serviço. Se o serviço não espera
// mais o pagamento (venceu o prazo ou foi cancelado enquanto a família pagava), devolve.
async function aplicarCobranca(ctx: Contexto, pag: Pagamento, c: Cobranca) {
  const agora = ctx.agora();
  if (c.situacao === 'pago' && pag.situacao === 'pendente') {
    const [marcado] = await ctx.db
      .update(pagamentos)
      .set({
        situacao: 'pago',
        metodo: c.metodo,
        parcelas: c.parcelas,
        acrescimoCentavos: c.acrescimoCentavos,
        taxaGatewayCentavos: c.taxaGatewayCentavos,
        comprovanteUrl: c.comprovanteUrl,
        pagoEm: agora,
        atualizadoEm: agora,
      })
      .where(and(eq(pagamentos.id, pag.id), eq(pagamentos.situacao, 'pendente')))
      .returning({ id: pagamentos.id });
    if (!marcado) return;
    const [confirmado] = await ctx.db
      .update(servicos)
      .set({ situacao: 'confirmado', respondaAte: null, atualizadoEm: agora })
      .where(and(eq(servicos.id, pag.servicoId), eq(servicos.situacao, 'aguardando_pagamento')))
      .returning({ id: servicos.id });
    if (!confirmado) await estornar(ctx, pag, 'O pedido não esperava mais o pagamento.');
  } else if (c.situacao === 'reembolsado' && pag.situacao === 'pago') {
    // devolvido por fora (pelo painel do gateway, por exemplo)
    await ctx.db
      .update(pagamentos)
      .set({ situacao: 'reembolsado', reembolsadoEm: agora, reembolsoErro: null, atualizadoEm: agora })
      .where(and(eq(pagamentos.id, pag.id), eq(pagamentos.situacao, 'pago')));
  }
}

const pagamentoDoServico = async (ctx: Contexto, servicoId: string) =>
  (await ctx.db.select().from(pagamentos).where(eq(pagamentos.servicoId, servicoId)))[0];

// Confere com o gateway um pagamento ainda pendente: cobre o webhook que atrasou ou não chegou
// (em desenvolvimento, sem endereço público, ele nunca chega).
async function sincronizar(ctx: Contexto, pag: Pagamento) {
  if (pag.situacao !== 'pendente') return pag;
  await aplicarCobranca(ctx, pag, await ctx.pagamentos.consultarCobranca(pag.cobrancaId));
  return (await pagamentoDoServico(ctx, pag.servicoId))!;
}

// Pagamento chegou por uma cobrança que não é a atual do serviço (a família abriu duas).
// Se o serviço ainda espera pagamento, essa passa a valer; se já está pago, devolve.
async function aplicarCobrancaAntiga(ctx: Contexto, pag: Pagamento, cobrancaId: string) {
  const c = await ctx.pagamentos.consultarCobranca(cobrancaId);
  if (c.situacao !== 'pago') return;
  if (pag.situacao !== 'pendente') {
    await ctx.pagamentos.reembolsar(cobrancaId, 'Pagamento em dobro do mesmo serviço.');
    return;
  }
  await ctx.db.update(pagamentos).set({ cobrancaId, url: c.url || pag.url }).where(eq(pagamentos.id, pag.id));
  await aplicarCobranca(ctx, { ...pag, cobrancaId }, c);
}

const segredoConfere = (recebido: unknown, esperado: string) => {
  if (typeof recebido !== 'string') return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
};

const familiaAlias = alias(usuarios, 'familia');
const proAlias = alias(usuarios, 'pro');
const daFamilia = alias(avaliacoes, 'da_familia');

type Etapa = 'aguardando_atendimento' | 'aguardando_avaliacao' | 'liberar' | 'repassado' | 'estornar';

export function rotasPagamentos(app: FastifyInstance, ctx: Contexto, op: { segredoWebhook: string | null; siteUrl?: string }) {
  // A família abre o pagamento de um serviço aceito. Reaproveita a cobrança aberta, se ainda
  // vale; senão, cria outra. Responde com a url do checkout.
  app.post('/api/servicos/:id/pagamento', async (req) => {
    const u = exigirContratante(req);
    const { id } = idParam.parse(req.params);
    await expirarVencidos(ctx.db, ctx.agora());
    const [s] = await ctx.db
      .select({
        id: servicos.id,
        situacao: servicos.situacao,
        tarefa: servicos.tarefa,
        inicio: servicos.inicio,
        horas: servicos.horas,
        valorHora: servicos.valorHoraCentavos,
        profissional: usuarios.nome,
      })
      .from(servicos)
      .innerJoin(usuarios, eq(usuarios.id, servicos.profissionalId))
      .where(and(eq(servicos.id, id), eq(servicos.contratanteId, u.id)));
    if (!s) throw naoEncontrado('Serviço não encontrado.');
    let pag = await pagamentoDoServico(ctx, s.id);
    if (pag && pag.situacao !== 'pendente') return { pagamento: resumo(pag) };
    if (s.situacao !== 'aguardando_pagamento') {
      throw conflito('sem_pagamento_pendente', s.situacao === 'expirado' ? 'O prazo para pagar este pedido terminou. Faça um pedido novo.' : 'Este serviço não está esperando pagamento.');
    }
    const valor = s.horas * s.valorHora;
    try {
      if (pag && pag.valorCentavos === valor) {
        const c = await ctx.pagamentos.consultarCobranca(pag.cobrancaId);
        if (c.situacao === 'pendente') return { pagamento: resumo({ ...pag, url: c.url || pag.url }) };
        if (c.situacao === 'pago') {
          await aplicarCobranca(ctx, pag, c);
          return { pagamento: resumo((await pagamentoDoServico(ctx, s.id))!) };
        }
        // vencida ou cancelada: segue para uma cobrança nova
      }
      const origem = op.siteUrl ?? `${req.protocol}://${req.host}`;
      const quando = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(s.inicio);
      const c = await ctx.pagamentos.criarCobranca({
        referencia: s.id,
        descricao: `${s.tarefa} com ${s.profissional}, ${quando} (${s.horas} h)`,
        valorCentavos: valor,
        voltarUrl: `${origem}/pedidos`,
        concluirUrl: `${origem}/pedidos?pago=${s.id}`,
      });
      const agora = ctx.agora();
      [pag] = await ctx.db
        .insert(pagamentos)
        .values({ servicoId: s.id, gateway: ctx.pagamentos.nome, cobrancaId: c.id, url: c.url, valorCentavos: valor })
        .onConflictDoUpdate({
          target: pagamentos.servicoId,
          set: { gateway: ctx.pagamentos.nome, cobrancaId: c.id, url: c.url, valorCentavos: valor, atualizadoEm: agora },
          where: eq(pagamentos.situacao, 'pendente'),
        })
        .returning();
      if (!pag) throw conflito('situacao_mudou', 'Este pagamento mudou de situação. Atualize a página.');
      return { pagamento: resumo(pag) };
    } catch (err) {
      falhaDoGateway(req, err, 'Não conseguimos abrir o pagamento agora. Tente de novo em alguns minutos.');
    }
  });

  // Situação do pagamento, para as duas partes. Pendente: confere com o gateway antes (é o que
  // a tela chama quando a família volta do checkout).
  app.get('/api/servicos/:id/pagamento', async (req) => {
    const u = exigirUsuario(req);
    const { id } = idParam.parse(req.params);
    const [s] = await ctx.db
      .select({ id: servicos.id })
      .from(servicos)
      .where(and(eq(servicos.id, id), or(eq(servicos.contratanteId, u.id), eq(servicos.profissionalId, u.id))));
    if (!s) throw naoEncontrado('Serviço não encontrado.');
    let pag = await pagamentoDoServico(ctx, s.id);
    if (pag) {
      try {
        pag = await sincronizar(ctx, pag);
      } catch (err) {
        req.log.warn({ err }, 'não deu para conferir o pagamento com o gateway');
      }
    }
    const [atual] = await ctx.db.select({ situacao: servicos.situacao }).from(servicos).where(eq(servicos.id, s.id));
    return { pagamento: pag ? resumo(pag) : null, situacaoServico: atual!.situacao };
  });

  // Webhook do AbacatePay. O segredo na URL prova a origem; o corpo só diz qual cobrança mudou,
  // e a situação vem sempre de uma consulta ao gateway. Responde 200 ao que não é nosso, para
  // não haver reenvio; erro nosso responde 500 e o AbacatePay tenta de novo (até ~18 h).
  app.post('/api/pagamentos/abacatepay', async (req, reply) => {
    if (!op.segredoWebhook) throw new ErroApi(503, 'webhook_desligado', 'Webhook não configurado.');
    if (!segredoConfere((req.query as Record<string, unknown>).webhookSecret, op.segredoWebhook)) {
      throw new ErroApi(401, 'nao_autorizado', 'Segredo do webhook inválido.');
    }
    const corpo = (req.body ?? {}) as { event?: string; data?: { checkout?: { id?: string; externalId?: string } } };
    const checkout = corpo.data?.checkout;
    if (!corpo.event?.startsWith('checkout.') || !checkout?.id) return reply.send({ ok: true });
    let [pag] = await ctx.db.select().from(pagamentos).where(eq(pagamentos.cobrancaId, checkout.id));
    if (!pag && checkout.externalId && v.uuid.safeParse(checkout.externalId).success) {
      pag = await pagamentoDoServico(ctx, checkout.externalId);
      if (pag) {
        await aplicarCobrancaAntiga(ctx, pag, checkout.id);
        return reply.send({ ok: true });
      }
    }
    if (pag) await sincronizar(ctx, pag);
    return reply.send({ ok: true });
  });

  // --- administração: o dinheiro retido, o que liberar e o que devolver ---

  app.get('/api/admin/pagamentos', async (req) => {
    exigirAdmin(req);
    const agora = ctx.agora();
    const linhas = await ctx.db
      .select({
        pagamento: pagamentos,
        servico: {
          id: servicos.id,
          tarefa: servicos.tarefa,
          inicio: servicos.inicio,
          horas: servicos.horas,
          situacao: servicos.situacao,
          realizadoEm: servicos.realizadoEm,
          canceladoEm: servicos.canceladoEm,
        },
        familia: familiaAlias.nome,
        profissional: { nome: proAlias.nome, chavePix: profissionais.chavePix, tipoChavePix: profissionais.tipoChavePix },
        beneficio: beneficioDaProfissional,
        avaliacao: { nota: daFamilia.nota, criadoEm: daFamilia.criadoEm },
      })
      .from(pagamentos)
      .innerJoin(servicos, eq(servicos.id, pagamentos.servicoId))
      .innerJoin(familiaAlias, eq(familiaAlias.id, servicos.contratanteId))
      .innerJoin(proAlias, eq(proAlias.id, servicos.profissionalId))
      .innerJoin(profissionais, eq(profissionais.usuarioId, servicos.profissionalId))
      .leftJoin(daFamilia, and(eq(daFamilia.servicoId, servicos.id), eq(daFamilia.sentido, 'familia_avalia_profissional')))
      .where(
        or(
          eq(pagamentos.situacao, 'pago'),
          // repassados nos últimos 30 dias, para conferência
          and(eq(pagamentos.repasseSituacao, 'enviado'), gt(pagamentos.repassadoEm, new Date(agora.getTime() - 30 * DIA_MS))),
        ),
      )
      .orderBy(desc(pagamentos.pagoEm))
      .limit(500);

    const itens = linhas.map(({ pagamento: p, servico: s, familia, profissional, beneficio, avaliacao }) => {
      const liberaEm = s.realizadoEm ? new Date(s.realizadoEm.getTime() + PRAZO_AVALIACAO_MS) : null;
      let etapa: Etapa;
      if (p.repasseSituacao === 'enviado') etapa = 'repassado';
      else if (['cancelado', 'expirado', 'recusado'].includes(s.situacao)) etapa = 'estornar';
      else if (s.situacao !== 'realizado') etapa = 'aguardando_atendimento';
      else if (avaliacao?.nota != null || (liberaEm && agora >= liberaEm)) etapa = 'liberar';
      else etapa = 'aguardando_avaliacao';
      const taxaPercentual = percentualDaTaxa(beneficio, s.inicio);
      const taxa = taxaDe(p.valorCentavos, taxaPercentual);
      return {
        id: p.id,
        etapa,
        servico: s,
        familia,
        profissional,
        avaliacao: avaliacao?.nota != null ? avaliacao : null,
        // sem avaliação da família, o repasse fica liberado quando o prazo de avaliar termina
        liberaEm: avaliacao?.nota != null ? null : liberaEm,
        valorCentavos: p.valorCentavos,
        taxaCentavos: taxa,
        // diferente da taxa padrão quando a profissional tem benefício de convite
        taxaPercentual,
        repasseCentavos: p.repasseValorCentavos ?? p.valorCentavos - taxa,
        metodo: p.metodo,
        parcelas: p.parcelas,
        acrescimoCentavos: p.acrescimoCentavos,
        pagoEm: p.pagoEm,
        comprovanteUrl: p.comprovanteUrl,
        reembolsoErro: p.reembolsoErro,
        repasse: { situacao: p.repasseSituacao, erro: p.repasseErro, comprovanteUrl: p.repasseComprovanteUrl, repassadoEm: p.repassadoEm },
      };
    });
    const retido = itens.filter((i) => i.etapa !== 'repassado');
    return {
      gateway: ctx.pagamentos.nome,
      regras: { taxaPercentual: REGRAS.taxaPercentual, prazoAvaliacaoDias: PRAZO_AVALIACAO_MS / DIA_MS },
      resumo: {
        retidoCentavos: retido.reduce((t, i) => t + i.valorCentavos, 0),
        liberarCentavos: itens.filter((i) => i.etapa === 'liberar').reduce((t, i) => t + i.repasseCentavos, 0),
      },
      pagamentos: itens,
    };
  });

  // Libera o repasse: envia por Pix o valor do serviço menos a taxa da plataforma. Só depois do
  // atendimento feito e avaliado pela família (ou com o prazo de avaliar encerrado).
  app.post('/api/admin/pagamentos/:id/repassar', async (req) => {
    const adm = exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const agora = ctx.agora();
    const [l] = await ctx.db
      .select({
        pagamento: pagamentos,
        situacaoServico: servicos.situacao,
        inicio: servicos.inicio,
        realizadoEm: servicos.realizadoEm,
        beneficio: beneficioDaProfissional,
        nome: usuarios.nome,
        chavePix: profissionais.chavePix,
        tipoChavePix: profissionais.tipoChavePix,
        chavePixAlteradaEm: profissionais.chavePixAlteradaEm,
        nota: daFamilia.nota,
      })
      .from(pagamentos)
      .innerJoin(servicos, eq(servicos.id, pagamentos.servicoId))
      .innerJoin(usuarios, eq(usuarios.id, servicos.profissionalId))
      .innerJoin(profissionais, eq(profissionais.usuarioId, servicos.profissionalId))
      .leftJoin(daFamilia, and(eq(daFamilia.servicoId, servicos.id), eq(daFamilia.sentido, 'familia_avalia_profissional')))
      .where(eq(pagamentos.id, id));
    if (!l) throw naoEncontrado('Pagamento não encontrado.');
    const p = l.pagamento;
    if (p.situacao !== 'pago') throw conflito('nao_pago', 'Este pagamento não está retido: não foi pago ou já foi devolvido.');
    if (p.repasseSituacao === 'enviado') throw conflito('ja_repassado', 'Este repasse já foi enviado.');
    if (l.situacaoServico !== 'realizado' || !l.realizadoEm) {
      throw new ErroApi(422, 'servico_nao_realizado', 'O repasse só sai depois que a profissional marca o atendimento como feito.');
    }
    const liberaEm = new Date(l.realizadoEm.getTime() + PRAZO_AVALIACAO_MS);
    if (l.nota == null && agora < liberaEm) {
      const data = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(liberaEm);
      throw new ErroApi(422, 'aguardando_avaliacao', `A família ainda não avaliou. O repasse fica liberado com a avaliação ou em ${data}.`);
    }
    if (!l.chavePix || !l.tipoChavePix) {
      throw new ErroApi(422, 'sem_chave_pix', `${l.nome.split(' ')[0]} ainda não cadastrou a chave Pix no perfil.`);
    }
    const carencia = carenciaDaChave(l.chavePixAlteradaEm, agora);
    if (carencia) {
      const quando = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(carencia);
      throw new ErroApi(422, 'chave_pix_recente', `${l.nome.split(' ')[0]} trocou a chave Pix há pouco. Por segurança, o repasse para a chave nova sai a partir de ${quando}.`);
    }
    const valor = p.valorCentavos - taxaDe(p.valorCentavos, percentualDaTaxa(l.beneficio, l.inicio));
    // trava antes de chamar o gateway: dois cliques não mandam dois Pix
    const [trava] = await ctx.db
      .update(pagamentos)
      .set({ repasseSituacao: 'enviando', repasseValorCentavos: valor, repassadoPor: adm.id, repasseErro: null, atualizadoEm: agora })
      .where(and(eq(pagamentos.id, id), eq(pagamentos.situacao, 'pago'), inArray(pagamentos.repasseSituacao, ['aguardando', 'falhou'])))
      .returning({ id: pagamentos.id });
    if (!trava) throw conflito('repasse_em_andamento', 'Este repasse já está sendo enviado. Atualize a página.');
    try {
      const r = await ctx.pagamentos.enviarPix({
        referencia: `repasse-${id}-${agora.getTime()}`,
        descricao: `Minha companhia: repasse do atendimento de ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(l.realizadoEm)}`,
        valorCentavos: valor,
        chave: l.chavePix,
        tipo: l.tipoChavePix,
      });
      await ctx.db
        .update(pagamentos)
        .set({ repasseSituacao: 'enviado', repasseId: r.id, repasseComprovanteUrl: r.comprovanteUrl, repassadoEm: ctx.agora(), atualizadoEm: ctx.agora() })
        .where(eq(pagamentos.id, id));
    } catch (err) {
      await ctx.db.update(pagamentos).set({ repasseSituacao: 'falhou', repasseErro: mensagemDe(err), atualizadoEm: ctx.agora() }).where(eq(pagamentos.id, id));
      req.log.error({ err }, 'repasse por Pix');
      throw new ErroApi(502, 'repasse_falhou', `O Pix não foi enviado: ${mensagemDe(err)}`);
    }
    const [depois] = await ctx.db.select().from(pagamentos).where(eq(pagamentos.id, id));
    return { pagamento: { id, repasseSituacao: depois!.repasseSituacao, repasseValorCentavos: depois!.repasseValorCentavos, repassadoEm: depois!.repassadoEm } };
  });

  // Tenta de novo o estorno de um serviço cancelado (ou vencido) que ficou com o dinheiro retido.
  app.post('/api/admin/pagamentos/:id/estornar', async (req) => {
    exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const [l] = await ctx.db
      .select({ pagamento: pagamentos, situacaoServico: servicos.situacao })
      .from(pagamentos)
      .innerJoin(servicos, eq(servicos.id, pagamentos.servicoId))
      .where(eq(pagamentos.id, id));
    if (!l) throw naoEncontrado('Pagamento não encontrado.');
    if (l.pagamento.situacao !== 'pago') throw conflito('nao_pago', 'Não há valor retido neste pagamento.');
    if (!['cancelado', 'expirado', 'recusado'].includes(l.situacaoServico)) {
      throw new ErroApi(422, 'servico_ativo', 'Só devolvemos o pagamento de serviço cancelado.');
    }
    if (!(await estornar(ctx, l.pagamento, 'Serviço cancelado.'))) {
      const [p] = await ctx.db.select({ erro: pagamentos.reembolsoErro }).from(pagamentos).where(eq(pagamentos.id, id));
      throw new ErroApi(502, 'estorno_falhou', `O estorno não foi feito: ${p?.erro ?? 'erro do gateway'}`);
    }
    return { pagamento: { id, situacao: 'reembolsado' } };
  });

  // --- pagamento simulado (sem chave do AbacatePay, fora de produção) ---
  if (ctx.pagamentos.nome !== 'simulado') return;
  const simulado = ctx.pagamentos as GatewaySimulado;
  const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const escapa = (t: string) => t.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

  app.get('/api/pagamentos/simulado/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().regex(/^sim_[\w-]+$/) }).parse(req.params);
    const c = simulado.cobrancas.get(id);
    if (!c) throw naoEncontrado('Cobrança simulada não encontrada. Volte e gere o pagamento de novo.');
    const opcoes = Array.from({ length: maxParcelas(c.valorCentavos) }, (_, i) => i + 1)
      .map((n) => {
        const total = c.valorCentavos + acrescimoCartao(c.valorCentavos, n);
        return `<button data-metodo="CARD" data-parcelas="${n}">Cartão ${n}x de ${brl(Math.ceil(total / n))} <small>total ${brl(total)}</small></button>`;
      })
      .join('');
    reply.type('text/html; charset=utf-8');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Pagamento simulado</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:440px;margin:40px auto;padding:0 16px;color:#10251e;background:#fff}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 16px}.aviso{background:#fff4d6;border:1px dashed #c99a1a;padding:10px 12px;border-radius:8px;font-size:14px}button{display:flex;justify-content:space-between;align-items:baseline;width:100%;padding:12px 14px;margin:0 0 8px;font:inherit;border:1px solid #9fb3aa;border-radius:8px;background:#fff;cursor:pointer;text-align:left}button:hover{border-color:#10251e}button.pix{background:#10251e;color:#fff;border-color:#10251e}small{opacity:.75;font-size:13px}a{color:#10251e}</style></head>
<body><p class="aviso">Pagamento simulado: nenhum dinheiro é cobrado. Com a chave do AbacatePay configurada, aqui abre o checkout de verdade.</p>
<h1>${escapa(brl(c.valorCentavos))}</h1><p>${escapa(c.descricao)}</p>
<button class="pix" data-metodo="PIX" data-parcelas="1">Pagar com Pix <small>${escapa(brl(c.valorCentavos))}</small></button>${c.situacao === 'pendente' ? opcoes : ''}
<p><a href="${escapa(c.voltarUrl)}">Voltar sem pagar</a></p>
<script>document.querySelectorAll('button').forEach(function(b){b.addEventListener('click',async function(){b.disabled=true;var r=await fetch(location.pathname+'/pagar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({metodo:b.dataset.metodo,parcelas:Number(b.dataset.parcelas)})});var d=await r.json();location.href=d.volta||${JSON.stringify(c.voltarUrl)};});});</script>
</body></html>`;
  });

  app.post('/api/pagamentos/simulado/:id/pagar', async (req) => {
    const { id } = z.object({ id: z.string().regex(/^sim_[\w-]+$/) }).parse(req.params);
    const { metodo, parcelas } = z.object({ metodo: z.enum(['PIX', 'CARD']), parcelas: z.number().int().min(1).max(12).default(1) }).parse(req.body);
    const c = simulado.pagar(id, metodo, parcelas);
    const [pag] = await ctx.db.select().from(pagamentos).where(eq(pagamentos.cobrancaId, id));
    if (pag) await aplicarCobranca(ctx, pag, c);
    return { volta: c.concluirUrl };
  });
}
