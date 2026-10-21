import { and, asc, eq, gt, lt } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exigirProfissional } from '../auth.js';
import type { Contexto } from '../contexto.js';
import { bloqueiosAgenda, servicos } from '../db/schema.js';
import { ErroApi, naoEncontrado } from '../erros.js';
import * as v from '../validacao.js';

const DIA_MS = 24 * 60 * 60 * 1000;

const bloqueio = z.object({
  inicio: z.iso.datetime({ offset: true, error: 'Informe o início.' }),
  fim: z.iso.datetime({ offset: true, error: 'Informe o fim.' }),
  motivo: z.string().trim().max(120, 'Use no máximo 120 caracteres.').optional(),
});

// Folgas, férias e compromissos da profissional. Novos pedidos que caem nesses períodos
// são recusados; atendimentos já confirmados não mudam sozinhos e voltam em `conflitos`.
export function rotasBloqueios(app: FastifyInstance, ctx: Contexto) {
  app.get('/api/profissionais/eu/bloqueios', async (req) => {
    const u = exigirProfissional(req);
    const lista = await ctx.db
      .select({ id: bloqueiosAgenda.id, inicio: bloqueiosAgenda.inicio, fim: bloqueiosAgenda.fim, motivo: bloqueiosAgenda.motivo })
      .from(bloqueiosAgenda)
      .where(and(eq(bloqueiosAgenda.profissionalId, u.id), gt(bloqueiosAgenda.fim, ctx.agora())))
      .orderBy(asc(bloqueiosAgenda.inicio));
    return { bloqueios: lista };
  });

  app.post('/api/profissionais/eu/bloqueios', async (req, reply) => {
    const u = exigirProfissional(req);
    const dados = bloqueio.parse(req.body);
    const inicio = new Date(dados.inicio);
    const fim = new Date(dados.fim);
    if (fim <= inicio) throw new ErroApi(422, 'periodo_invalido', 'O fim precisa ser depois do início.', { fim: 'O fim precisa ser depois do início.' });
    if (fim <= ctx.agora()) throw new ErroApi(422, 'periodo_passado', 'Escolha um período a partir de agora.', { fim: 'Este período já passou.' });
    if (fim.getTime() - inicio.getTime() > 366 * DIA_MS) {
      throw new ErroApi(422, 'periodo_longo', 'Bloqueie no máximo um ano de cada vez.', { fim: 'Período longo demais.' });
    }
    const [novo] = await ctx.db
      .insert(bloqueiosAgenda)
      .values({ profissionalId: u.id, inicio, fim, motivo: dados.motivo || null, criadoEm: ctx.agora() })
      .returning({ id: bloqueiosAgenda.id, inicio: bloqueiosAgenda.inicio, fim: bloqueiosAgenda.fim, motivo: bloqueiosAgenda.motivo });
    const conflitos = await ctx.db
      .select({ id: servicos.id, tarefa: servicos.tarefa, inicio: servicos.inicio, horas: servicos.horas })
      .from(servicos)
      .where(and(eq(servicos.profissionalId, u.id), eq(servicos.situacao, 'confirmado'), lt(servicos.inicio, fim), gt(servicos.inicio, new Date(inicio.getTime() - 24 * 60 * 60 * 1000))))
      .orderBy(asc(servicos.inicio));
    const batem = conflitos.filter((s) => s.inicio.getTime() + s.horas * 60 * 60 * 1000 > inicio.getTime());
    return reply.status(201).send({ bloqueio: novo, conflitos: batem });
  });

  app.delete('/api/profissionais/eu/bloqueios/:id', async (req, reply) => {
    const u = exigirProfissional(req);
    const { id } = z.object({ id: v.uuid }).parse(req.params);
    const apagados = await ctx.db
      .delete(bloqueiosAgenda)
      .where(and(eq(bloqueiosAgenda.id, id), eq(bloqueiosAgenda.profissionalId, u.id)))
      .returning({ id: bloqueiosAgenda.id });
    if (!apagados.length) throw naoEncontrado('Bloqueio não encontrado.');
    return reply.status(204).send();
  });
}
