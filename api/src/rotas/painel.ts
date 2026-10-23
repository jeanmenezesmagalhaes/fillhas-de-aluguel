import { and, count, desc, eq, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exigirAdmin } from '../auth.js';
import type { Contexto } from '../contexto.js';
import {
  avaliacoes,
  contratantes,
  convites,
  documentos,
  fotosPerfil,
  pagamentos,
  profissionais,
  qualificacoes,
  servicos,
  sessoes,
  usuarios,
} from '../db/schema.js';
import { dataBrasilia, percentualDaTaxa, REGRAS, taxaDe } from '../financeiro.js';
import { beneficioDaLinha, colunasDoBeneficio } from './convites.js';
import { beneficioDaProfissional } from './pagamentos.js';
import { documentosAtuais, documentosExigidos } from './verificacao.js';

const DIA_MS = 86_400_000;
const POR_PAGINA = 50;

// "2026-10" do mês em Brasília
const mesBrasilia = (d: Date) => dataBrasilia(d).slice(0, 7);
const desde = (d: Date) => sql`${d.toISOString()}::timestamptz`;
const contaSe = (cond: SQL) => sql<number>`count(*) filter (where ${cond})`.mapWith(Number);

const FILTROS = [
  'familias',
  'familias_sem_pedido',
  'profissionais',
  'rascunho',
  'em_analise',
  'correcao',
  'aprovado',
  'vencido',
  'por_convite',
  'email_pendente',
  'admins',
] as const;

const consultaUsuarios = z.object({
  busca: z.string().trim().max(120).optional(),
  filtro: z.enum(FILTROS).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(1000).default(1),
});

const temPedido = sql`exists (select 1 from ${servicos} where ${servicos.contratanteId} = ${usuarios.id})`;

export function rotasPainel(app: FastifyInstance, ctx: Contexto) {
  // Números da operação para a primeira tela da administração: contas, cadastros parados,
  // o que espera a equipe, pedidos e dinheiro.
  app.get('/api/admin/resumo', async (req) => {
    exigirAdmin(req);
    const agora = ctx.agora();
    const d7 = new Date(agora.getTime() - 7 * DIA_MS);
    const d30 = new Date(agora.getTime() - 30 * DIA_MS);
    const inicioMes = new Date(`${mesBrasilia(agora)}-01T03:00:00Z`);

    const [contas] = await ctx.db
      .select({
        total: count(),
        novos7: contaSe(sql`${usuarios.criadoEm} >= ${desde(d7)}`),
        novos30: contaSe(sql`${usuarios.criadoEm} >= ${desde(d30)}`),
        emailPendente: contaSe(sql`${usuarios.emailVerificadoEm} is null`),
        familias: contaSe(sql`${contratantes.usuarioId} is not null`),
        familiasSemPedido: contaSe(sql`${contratantes.usuarioId} is not null and not ${temPedido}`),
        profissionais: contaSe(sql`${profissionais.usuarioId} is not null`),
      })
      .from(usuarios)
      .leftJoin(contratantes, eq(contratantes.usuarioId, usuarios.id))
      .leftJoin(profissionais, eq(profissionais.usuarioId, usuarios.id));

    const porSituacao = Object.fromEntries(
      (await ctx.db.select({ s: profissionais.situacao, n: count() }).from(profissionais).groupBy(profissionais.situacao)).map((l) => [l.s, l.n]),
    );
    const daqui7 = dataBrasilia(new Date(agora.getTime() + 7 * DIA_MS));
    const [revisao] = await ctx.db
      .select({ n: count() })
      .from(profissionais)
      .where(and(eq(profissionais.situacao, 'aprovado'), sql`${profissionais.proximaRevisao} <= ${daqui7}`));
    const [semPix] = await ctx.db
      .select({ n: count() })
      .from(profissionais)
      .where(and(eq(profissionais.situacao, 'aprovado'), isNull(profissionais.chavePix)));

    const [docs] = await ctx.db.select({ n: count() }).from(documentos).where(eq(documentos.situacao, 'enviado'));
    const [cursos] = await ctx.db.select({ n: count() }).from(qualificacoes).where(eq(qualificacoes.situacao, 'enviado'));
    const [fotos] = await ctx.db.select({ n: count() }).from(fotosPerfil).where(eq(fotosPerfil.situacao, 'enviado'));

    const pedidosPorSituacao = Object.fromEntries(
      (await ctx.db.select({ s: servicos.situacao, n: count() }).from(servicos).groupBy(servicos.situacao)).map((l) => [l.s, l.n]),
    );
    const [pedidos] = await ctx.db
      .select({
        total: count(),
        novos30: contaSe(sql`${servicos.criadoEm} >= ${desde(d30)}`),
        realizadosMes: contaSe(sql`${servicos.realizadoEm} >= ${desde(inicioMes)}`),
      })
      .from(servicos);
    const [notas] = await ctx.db
      .select({ media: sql<number | null>`round(avg(${avaliacoes.nota})::numeric, 2)`.mapWith((x) => (x == null ? null : Number(x))), n: count() })
      .from(avaliacoes)
      .where(eq(avaliacoes.sentido, 'familia_avalia_profissional'));

    // Dinheiro: uma linha por cobrança. A receita é a taxa da plataforma (a de cada profissional,
    // com o benefício do convite); depois do repasse, é o que ficou de fato.
    const cobrancas = await ctx.db
      .select({
        valor: pagamentos.valorCentavos,
        situacao: pagamentos.situacao,
        pagoEm: pagamentos.pagoEm,
        taxaGateway: pagamentos.taxaGatewayCentavos,
        repasse: pagamentos.repasseSituacao,
        repasseValor: pagamentos.repasseValorCentavos,
        situacaoServico: servicos.situacao,
        inicio: servicos.inicio,
        beneficio: beneficioDaProfissional,
      })
      .from(pagamentos)
      .innerJoin(servicos, eq(servicos.id, pagamentos.servicoId))
      .innerJoin(profissionais, eq(profissionais.usuarioId, servicos.profissionalId));

    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(Number(mesBrasilia(agora).slice(0, 4)), Number(mesBrasilia(agora).slice(5, 7)) - 1 - (5 - i), 15));
      return { mes: d.toISOString().slice(0, 7), recebidoCentavos: 0, receitaCentavos: 0, pagamentos: 0 };
    });
    const f = {
      recebidoCentavos: 0,
      receitaCentavos: 0,
      receitaPrevistaCentavos: 0,
      repassadoCentavos: 0,
      retidoCentavos: 0,
      reembolsadoCentavos: 0,
      aDevolverCentavos: 0,
      custoGatewayCentavos: 0,
      pagamentos: 0,
      cobrancasAbertas: 0,
      cobrancasAbertasCentavos: 0,
      paraRepassar: 0,
      paraRepassarCentavos: 0,
      repassesFalhos: 0,
    };
    for (const c of cobrancas) {
      if (c.situacao === 'pendente') {
        f.cobrancasAbertas++;
        f.cobrancasAbertasCentavos += c.valor;
        continue;
      }
      f.custoGatewayCentavos += c.taxaGateway ?? 0;
      if (c.situacao === 'reembolsado') {
        f.reembolsadoCentavos += c.valor;
        continue;
      }
      const cancelado = ['cancelado', 'expirado', 'recusado'].includes(c.situacaoServico);
      const taxa = c.repasse === 'enviado' && c.repasseValor != null ? c.valor - c.repasseValor : taxaDe(c.valor, percentualDaTaxa(c.beneficio, c.inicio));
      f.recebidoCentavos += c.valor;
      f.pagamentos++;
      if (c.repasse === 'enviado') f.repassadoCentavos += c.repasseValor ?? 0;
      else f.retidoCentavos += c.valor;
      if (c.repasse === 'falhou') f.repassesFalhos++;
      if (cancelado && c.repasse !== 'enviado') f.aDevolverCentavos += c.valor;
      else if (c.situacaoServico === 'realizado') f.receitaCentavos += taxa;
      else f.receitaPrevistaCentavos += taxa;
      if (c.situacaoServico === 'realizado' && c.repasse !== 'enviado') {
        f.paraRepassar++;
        f.paraRepassarCentavos += c.valor - taxa;
      }
      const m = c.pagoEm && meses.find((x) => x.mes === mesBrasilia(c.pagoEm!));
      if (m) {
        m.recebidoCentavos += c.valor;
        m.pagamentos++;
        if (!cancelado) m.receitaCentavos += taxa;
      }
    }

    const [conv] = await ctx.db
      .select({
        ativos: contaSe(
          sql`${convites.canceladoEm} is null and ${convites.usos} < ${convites.usosMaximos} and (${convites.expiraEm} is null or ${convites.expiraEm} > ${desde(agora)})`,
        ),
        total: count(),
      })
      .from(convites);
    const [porConvite] = await ctx.db
      .select({ n: count(), aprovadas: contaSe(sql`${profissionais.situacao} = 'aprovado'`) })
      .from(profissionais)
      .where(isNotNull(profissionais.conviteId));

    const recentes = await ctx.db
      .select({
        id: usuarios.id,
        nome: usuarios.nome,
        criadoEm: usuarios.criadoEm,
        familia: contratantes.usuarioId,
        situacao: profissionais.situacao,
      })
      .from(usuarios)
      .leftJoin(contratantes, eq(contratantes.usuarioId, usuarios.id))
      .leftJoin(profissionais, eq(profissionais.usuarioId, usuarios.id))
      .orderBy(desc(usuarios.criadoEm))
      .limit(8);

    return {
      gateway: ctx.pagamentos.nome,
      taxaPadrao: REGRAS.taxaPercentual,
      contas: contas!,
      profissionais: {
        rascunho: porSituacao.rascunho ?? 0,
        emAnalise: porSituacao.em_analise ?? 0,
        correcao: porSituacao.correcao ?? 0,
        aprovado: porSituacao.aprovado ?? 0,
        vencido: porSituacao.vencido ?? 0,
        revisaoEm7Dias: revisao!.n,
        aprovadasSemPix: semPix!.n,
      },
      conferencia: { fila: porSituacao.em_analise ?? 0, documentos: docs!.n, cursos: cursos!.n, fotos: fotos!.n },
      pedidos: { ...pedidos!, porSituacao: pedidosPorSituacao, avaliacaoMedia: notas!.media, avaliacoes: notas!.n },
      financeiro: { ...f, ticketMedioCentavos: f.pagamentos ? Math.round(f.recebidoCentavos / f.pagamentos) : 0, meses },
      convites: { ativos: conv!.ativos, total: conv!.total, cadastradas: porConvite!.n, aprovadas: porConvite!.aprovadas },
      recentes: recentes.map((r) => ({ id: r.id, nome: r.nome, criadoEm: r.criadoEm, tipo: r.situacao ? 'profissional' : r.familia ? 'familia' : 'conta', situacao: r.situacao })),
    };
  });

  // Todas as contas, com busca e filtros. Para cadastros parados, diz o que falta.
  app.get('/api/admin/usuarios', async (req) => {
    exigirAdmin(req);
    const q = consultaUsuarios.parse(req.query);
    const condicoes: SQL[] = [];
    if (q.busca) {
      const termo = `%${q.busca.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
      const digitos = q.busca.replace(/\D/g, '');
      condicoes.push(
        or(
          sql`${usuarios.nome} ilike ${termo}`,
          sql`${usuarios.email} ilike ${termo}`,
          ...(digitos.length >= 4 ? [sql`${usuarios.celular} like ${`%${digitos}%`}`, sql`${profissionais.cpf} like ${`%${digitos}%`}`] : []),
        )!,
      );
    }
    const filtro: Record<(typeof FILTROS)[number], SQL> = {
      familias: sql`${contratantes.usuarioId} is not null`,
      familias_sem_pedido: sql`${contratantes.usuarioId} is not null and not ${temPedido}`,
      profissionais: sql`${profissionais.usuarioId} is not null`,
      rascunho: eq(profissionais.situacao, 'rascunho'),
      em_analise: eq(profissionais.situacao, 'em_analise'),
      correcao: eq(profissionais.situacao, 'correcao'),
      aprovado: eq(profissionais.situacao, 'aprovado'),
      vencido: eq(profissionais.situacao, 'vencido'),
      por_convite: isNotNull(profissionais.conviteId),
      email_pendente: isNull(usuarios.emailVerificadoEm),
      admins: eq(usuarios.admin, true),
    };
    if (q.filtro) condicoes.push(filtro[q.filtro]);
    const onde = condicoes.length ? and(...condicoes) : undefined;

    const consulta = ctx.db
        .select({
          id: usuarios.id,
          nome: usuarios.nome,
          email: usuarios.email,
          celular: usuarios.celular,
          admin: usuarios.admin,
          emailVerificadoEm: usuarios.emailVerificadoEm,
          celularVerificadoEm: usuarios.celularVerificadoEm,
          criadoEm: usuarios.criadoEm,
          familia: contratantes.usuarioId,
          p: {
            id: profissionais.usuarioId,
            slug: profissionais.slug,
            situacao: profissionais.situacao,
            cidade: profissionais.cidade,
            uf: profissionais.uf,
            valorHoraCentavos: profissionais.valorHoraCentavos,
            cpf: profissionais.cpf,
            cnpj: profissionais.cnpj,
            cep: profissionais.cep,
            veiculoIncluso: profissionais.veiculoIncluso,
            chavePix: profissionais.chavePix,
            motivoCorrecao: profissionais.motivoCorrecao,
            enviadoAnaliseEm: profissionais.enviadoAnaliseEm,
            aprovadoEm: profissionais.aprovadoEm,
            proximaRevisao: profissionais.proximaRevisao,
            ...colunasDoBeneficio,
            convite: convites.codigo,
          },
          pedidos: sql<number>`(select count(*) from ${servicos} where ${servicos.contratanteId} = ${usuarios.id} or ${servicos.profissionalId} = ${usuarios.id})`.mapWith(Number),
          realizados: sql<number>`(select count(*) from ${servicos} where (${servicos.contratanteId} = ${usuarios.id} or ${servicos.profissionalId} = ${usuarios.id}) and ${servicos.situacao} = 'realizado')`.mapWith(Number),
          pagoCentavos: sql<number>`(select coalesce(sum(${pagamentos.valorCentavos}), 0) from ${pagamentos} inner join ${servicos} on ${servicos.id} = ${pagamentos.servicoId} where ${pagamentos.situacao} = 'pago' and (${servicos.contratanteId} = ${usuarios.id} or ${servicos.profissionalId} = ${usuarios.id}))`.mapWith(Number),
          ultimoAcesso: sql<Date | null>`(select max(${sessoes.criadoEm}) from ${sessoes} where ${sessoes.usuarioId} = ${usuarios.id})`.mapWith((x) => (x == null ? null : new Date(x))),
        })
        .from(usuarios)
        .leftJoin(contratantes, eq(contratantes.usuarioId, usuarios.id))
        .leftJoin(profissionais, eq(profissionais.usuarioId, usuarios.id))
        .leftJoin(convites, eq(convites.id, profissionais.conviteId))
        .where(onde);

    const [total] = await ctx.db
      .select({ n: count() })
      .from(usuarios)
      .leftJoin(contratantes, eq(contratantes.usuarioId, usuarios.id))
      .leftJoin(profissionais, eq(profissionais.usuarioId, usuarios.id))
      .where(onde);
    const linhas = await consulta
      .orderBy(desc(usuarios.criadoEm))
      .limit(POR_PAGINA)
      .offset((q.pagina - 1) * POR_PAGINA);

    // o que falta para os cadastros que ainda não chegaram à lista de espera
    const incompletas = linhas.filter((l) => l.p?.id && (l.p.situacao === 'rascunho' || l.p.situacao === 'correcao'));
    const docsPorPro = new Map(await Promise.all(incompletas.map(async (l) => [l.id, await documentosAtuais(ctx.db, l.id)] as const)));

    return {
      pagina: q.pagina,
      porPagina: POR_PAGINA,
      total: total!.n,
      usuarios: linhas.map(({ p, familia, ...u }) => {
        const pro = p?.id ? p : null;
        let falta: string[] = [];
        if (pro && docsPorPro.has(u.id)) {
          const atuais = docsPorPro.get(u.id)!;
          const exigidos = documentosExigidos(!!pro.cnpj, !!pro.veiculoIncluso);
          falta = [
            !u.emailVerificadoEm && 'email',
            !pro.cpf && 'dadosFiscais',
            !pro.cep && 'endereco',
            exigidos.some((t) => !['enviado', 'aprovado'].includes(atuais.get(t)?.situacao ?? '')) && 'documentos',
            !pro.valorHoraCentavos && 'valorHora',
          ].filter((x): x is string => !!x);
        } else if (pro?.situacao === 'aprovado') {
          falta = [!pro.chavePix && 'chavePix', !pro.valorHoraCentavos && 'valorHora'].filter((x): x is string => !!x);
        }
        return {
          ...u,
          papeis: [familia && 'familia', pro && 'profissional', u.admin && 'admin'].filter(Boolean),
          profissional: pro
            ? {
                slug: pro.slug,
                situacao: pro.situacao,
                cidade: pro.cidade,
                uf: pro.uf,
                valorHoraCentavos: pro.valorHoraCentavos,
                temChavePix: !!pro.chavePix,
                motivoCorrecao: pro.motivoCorrecao,
                enviadoAnaliseEm: pro.enviadoAnaliseEm,
                aprovadoEm: pro.aprovadoEm,
                proximaRevisao: pro.proximaRevisao,
                convite: pro.convite,
                beneficio: beneficioDaLinha({ ...pro, prioridadeFila: !!pro.prioridadeFila }),
              }
            : null,
          falta,
        };
      }),
    };
  });
}
