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
import { qualificacoesPublicas } from './qualificacoes.js';
import { documentosAtuais } from './verificacao.js';
import { listaDeTarefas, salvarTarefas, tarefasDe } from '../tarefas.js';
import { disponibilidadeDe, listaDeDisponibilidade, salvarDisponibilidade } from '../disponibilidade.js';
import { fotoPublica } from './fotos.js';
import type { Db } from '../db/index.js';

const perfil = z
  .object({
    apresentacao: v.semContato(z.string().trim().max(2000, 'Use no máximo 2000 caracteres.').nullable()),
    anosExperiencia: z.number().int('Use anos inteiros.').min(0, 'Informe de 0 a 60 anos.').max(60, 'Informe de 0 a 60 anos.').nullable(),
    // desconto por volume: os dois juntos, ou os dois null para tirar
    descontoAPartirHoras: z.number().int('Use horas inteiras.').min(2, 'O desconto vale a partir de 2 a 12 horas.').max(12, 'O desconto vale a partir de 2 a 12 horas.').nullable(),
    valorHoraDescontoCentavos: v.valorHoraCentavos.nullable(),
    bairros: z.array(z.string().trim().min(2).max(80)).max(30, 'Liste no máximo 30 bairros.'),
    valorHoraCentavos: v.valorHoraCentavos,
    horasMinimas: z.number().int().min(1, 'O mínimo é 1 hora.').max(12, 'O mínimo pode ser de até 12 horas.'),
    veiculoIncluso: z.boolean(),
    // tarefas que ela faz, cada uma com o mínimo de horas; trocam a lista inteira
    tarefas: listaDeTarefas,
    aceitaOutras: z.boolean(),
    // dias e horários: [{ dia: 0-6, inicio: '08:00', fim: '18:00' }]; troca a lista inteira
    disponibilidade: listaDeDisponibilidade,
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
    // oferecer veículo exige CNH: antes da fila ela entra na lista de documentos;
    // depois de aprovada, só com a CNH já aprovada
    if (dados.veiculoIncluso) {
      const [p] = await ctx.db
        .select({ situacao: profissionais.situacao, veiculo: profissionais.veiculoIncluso })
        .from(profissionais)
        .where(eq(profissionais.usuarioId, u.id));
      if (!p!.veiculo && p!.situacao === 'em_analise') {
        throw new ErroApi(409, 'em_analise', 'Seu cadastro está na lista de espera. Depois da aprovação, você pode passar a oferecer veículo.');
      }
      if (!p!.veiculo && (p!.situacao === 'aprovado' || p!.situacao === 'vencido')) {
        const cnh = (await documentosAtuais(ctx.db, u.id)).get('cnh');
        if (cnh?.situacao !== 'aprovado') {
          throw new ErroApi(422, 'cnh_pendente', 'Para oferecer veículo, envie sua CNH. Ela passa pela nossa análise e, aprovada, o veículo aparece no seu perfil.', {
            veiculoIncluso: cnh ? 'Sua CNH ainda está em análise.' : 'Envie sua CNH primeiro.',
          });
        }
      }
    }
    const { tarefas, disponibilidade: faixas, ...campos } = dados;
    if (campos.descontoAPartirHoras !== undefined || campos.valorHoraDescontoCentavos !== undefined || campos.valorHoraCentavos !== undefined) {
      const [atual] = await ctx.db
        .select({ aPartir: profissionais.descontoAPartirHoras, desconto: profissionais.valorHoraDescontoCentavos, valor: profissionais.valorHoraCentavos })
        .from(profissionais)
        .where(eq(profissionais.usuarioId, u.id));
      const aPartir = campos.descontoAPartirHoras !== undefined ? campos.descontoAPartirHoras : atual!.aPartir;
      const desconto = campos.valorHoraDescontoCentavos !== undefined ? campos.valorHoraDescontoCentavos : atual!.desconto;
      const valor = campos.valorHoraCentavos ?? atual!.valor;
      if ((aPartir == null) !== (desconto == null)) {
        const falta = aPartir == null ? 'descontoAPartirHoras' : 'valorHoraDescontoCentavos';
        throw new ErroApi(422, 'desconto_incompleto', 'Informe a partir de quantas horas e o valor da hora com desconto.', {
          [falta]: falta === 'descontoAPartirHoras' ? 'A partir de quantas horas?' : 'Qual o valor da hora com desconto?',
        });
      }
      if (desconto != null && (valor == null || desconto >= valor)) {
        throw new ErroApi(422, 'desconto_maior', 'A hora com desconto precisa ser menor que o valor da hora.', {
          valorHoraDescontoCentavos: 'Precisa ser menor que o valor da hora.',
        });
      }
    }
    if (tarefas !== undefined || campos.aceitaOutras !== undefined) {
      const [atual] = await ctx.db.select({ aceitaOutras: profissionais.aceitaOutras }).from(profissionais).where(eq(profissionais.usuarioId, u.id));
      const lista = tarefas ?? (await tarefasDe(ctx.db, u.id));
      const aceitaOutras = campos.aceitaOutras ?? atual!.aceitaOutras;
      if (!lista.length && !aceitaOutras) {
        throw new ErroApi(422, 'sem_tarefas', 'Escolha ao menos uma tarefa ou aceite outras a combinar.', {
          tarefas: 'Escolha ao menos uma tarefa ou aceite outras a combinar.',
        });
      }
      // o mínimo geral passa a ser o menor mínimo entre as tarefas dela
      if (tarefas) campos.horasMinimas = tarefas.length ? Math.min(...tarefas.map((t) => t.minimoHoras)) : 1;
    }
    await ctx.db.transaction(async (tx) => {
      if (tarefas) await salvarTarefas(tx as unknown as Db, u.id, tarefas);
      if (faixas) await salvarDisponibilidade(tx as unknown as Db, u.id, faixas);
      if (Object.keys(campos).length) {
        await tx
          .update(profissionais)
          .set({ ...campos, atualizadoEm: ctx.agora() })
          .where(eq(profissionais.usuarioId, u.id));
      }
    });
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
        aceitaOutras: profissionais.aceitaOutras,
        descontoAPartirHoras: profissionais.descontoAPartirHoras,
        valorHoraDescontoCentavos: profissionais.valorHoraDescontoCentavos,
        anosExperiencia: profissionais.anosExperiencia,
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
    return {
      profissional: {
        ...publico,
        nota: { media: notas.media, total: notas.total },
        tarefas: await tarefasDe(ctx.db, usuarioId),
        disponibilidade: await disponibilidadeDe(ctx.db, usuarioId),
        fotoUrl: await fotoPublica(ctx.db, usuarioId),
        // só cursos com o comprovante aprovado pela administração
        qualificacoes: await qualificacoesPublicas(ctx.db, usuarioId),
      },
    };
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
