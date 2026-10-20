import { and, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exigirProfissional } from '../auth.js';
import { avaliacoesRecebidas } from '../avaliacoes.js';
import type { Contexto } from '../contexto.js';
import { profissionais, servicos, usuarios } from '../db/schema.js';
import { ErroApi, naoEncontrado, proibido } from '../erros.js';
import * as v from '../validacao.js';
import { dadosDaConta } from './contas.js';

const perfil = z
  .object({
    apresentacao: z.string().trim().max(2000, 'Use no máximo 2000 caracteres.').nullable(),
    bairros: z.array(z.string().trim().min(2).max(80)).max(30, 'Liste no máximo 30 bairros.'),
    valorHoraCentavos: v.valorHoraCentavos,
    horasMinimas: z.number().int().min(1, 'O mínimo é 1 hora.').max(12, 'O mínimo pode ser de até 12 horas.'),
    veiculoIncluso: z.boolean(),
  })
  .partial()
  .strict();

const slugParam = z.object({ slug: z.string().min(1).max(80) });

// no ar para o público: aprovado e com o valor da hora definido (sem valor não dá para contratar)
const noAr = (p: { situacao: string; valorHoraCentavos: number | null }) => p.situacao === 'aprovado' && p.valorHoraCentavos != null;

export function rotasProfissionais(app: FastifyInstance, ctx: Contexto) {
  // a própria profissional edita preço, mínimo, veículo, bairros e apresentação
  app.patch('/api/profissionais/eu', async (req) => {
    const u = exigirProfissional(req);
    const dados = perfil.parse(req.body);
    if (Object.keys(dados).length) {
      await ctx.db
        .update(profissionais)
        .set({ ...dados, atualizadoEm: ctx.agora() })
        .where(eq(profissionais.usuarioId, u.id));
    }
    return { usuario: await dadosDaConta(ctx.db, u.id) };
  });

  // portfólio público: só perfis aprovados (a própria profissional vê o seu em qualquer situação)
  app.get('/api/profissionais/:slug', async (req) => {
    const { slug } = slugParam.parse(req.params);
    const [p] = await ctx.db
      .select({
        usuarioId: profissionais.usuarioId,
        slug: profissionais.slug,
        nome: usuarios.nome,
        cidade: profissionais.cidade,
        uf: profissionais.uf,
        bairros: profissionais.bairros,
        apresentacao: profissionais.apresentacao,
        valorHoraCentavos: profissionais.valorHoraCentavos,
        horasMinimas: profissionais.horasMinimas,
        veiculoIncluso: profissionais.veiculoIncluso,
        situacao: profissionais.situacao,
        revisadoEm: profissionais.revisadoEm,
        proximaRevisao: profissionais.proximaRevisao,
      })
      .from(profissionais)
      .innerJoin(usuarios, eq(usuarios.id, profissionais.usuarioId))
      .where(eq(profissionais.slug, slug));
    if (!p || (!noAr(p) && req.usuario?.id !== p.usuarioId)) throw naoEncontrado('Profissional não encontrada.');
    const { usuarioId, ...publico } = p;
    const notas = await avaliacoesRecebidas(ctx.db, usuarioId, 'familia_avalia_profissional', ctx.agora());
    return { profissional: { ...publico, nota: { media: notas.media, total: notas.total } } };
  });

  app.get('/api/profissionais/:slug/avaliacoes', async (req) => {
    const { slug } = slugParam.parse(req.params);
    const [p] = await ctx.db
      .select({ usuarioId: profissionais.usuarioId, situacao: profissionais.situacao, valorHoraCentavos: profissionais.valorHoraCentavos })
      .from(profissionais)
      .where(eq(profissionais.slug, slug));
    if (!p || (!noAr(p) && req.usuario?.id !== p.usuarioId)) throw naoEncontrado('Profissional não encontrada.');
    return avaliacoesRecebidas(ctx.db, p.usuarioId, 'familia_avalia_profissional', ctx.agora());
  });

  // a nota da família não é pública: só a vê a profissional que recebeu um pedido dela
  app.get('/api/contratantes/:id/avaliacoes', async (req) => {
    const u = exigirProfissional(req);
    const { id } = z.object({ id: v.uuid }).parse(req.params);
    const [vinculo] = await ctx.db
      .select({ id: servicos.id })
      .from(servicos)
      .where(
        and(
          eq(servicos.contratanteId, id),
          eq(servicos.profissionalId, u.id),
          inArray(servicos.situacao, ['solicitado', 'proposta_alterada', 'confirmado', 'realizado']),
        ),
      )
      .limit(1);
    if (!vinculo) throw proibido('Você só vê a avaliação de famílias que pediram um serviço a você.');
    return avaliacoesRecebidas(ctx.db, id, 'profissional_avalia_familia', ctx.agora());
  });
}
