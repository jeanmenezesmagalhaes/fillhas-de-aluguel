import { and, asc, count, desc, eq, exists, gt, inArray, isNotNull, lt, notExists, or, sql, type SQL } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { avaliacaoRevelada } from '../avaliacoes.js';
import type { Contexto } from '../contexto.js';
import type { Db } from '../db/index.js';
import { avaliacoes, bloqueiosAgenda, disponibilidade, fotosPerfil, profissionais, servicos, tarefasProfissional, usuarios } from '../db/schema.js';
import { NOME_TAREFA, TIPOS_FIXOS } from '../tarefas.js';

// turnos da listagem, em minutos desde a meia-noite (horário de Brasília)
export const TURNOS = { m: [7 * 60, 12 * 60], t: [12 * 60, 18 * 60], n: [18 * 60, 22 * 60] } as const;
type Turno = keyof typeof TURNOS;

// compara sem acento e sem maiúscula: "sao paulo" acha "São Paulo"
const semAcento = (col: SQL | unknown) =>
  sql`translate(lower(${col}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`;
const normalizar = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const filtros = z.object({
  cidade: z.string().trim().max(80).optional(),
  uf: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
  bairro: z.string().trim().max(80).optional(),
  tarefa: z.enum([...TIPOS_FIXOS, 'outra']).optional(),
  veiculo: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  // um dia da semana (0 = domingo) ou uma data; com a data, folgas daquele dia também contam
  dia: z.coerce.number().int().min(0).max(6).optional(),
  data: z.iso.date().optional(),
  turno: z.enum(['m', 't', 'n']).optional(),
  ordem: z.enum(['relevancia', 'preco', 'experiencia']).default('relevancia'),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(20),
});

// "2026-10-28" no horário de Brasília → dia da semana e o intervalo do dia (ou do turno) em UTC
function janelaDaData(data: string, turno?: Turno) {
  const [ini, fim] = turno ? TURNOS[turno] : [0, 24 * 60];
  const meiaNoite = new Date(`${data}T03:00:00Z`);
  return {
    dia: new Date(`${data}T12:00:00Z`).getUTCDay(),
    inicio: new Date(meiaNoite.getTime() + ini * 60_000),
    fim: new Date(meiaNoite.getTime() + fim * 60_000),
  };
}

// notas reveladas de várias profissionais numa só consulta
async function notasDe(db: Db, ids: string[], agora: Date) {
  if (!ids.length) return new Map<string, { media: number | null; total: number }>();
  const linhas = await db
    .select({ id: avaliacoes.avaliadoId, total: sql<number>`count(*)::int`, media: sql<string>`round(avg(${avaliacoes.nota}), 1)::text` })
    .from(avaliacoes)
    .innerJoin(servicos, eq(servicos.id, avaliacoes.servicoId))
    .where(and(inArray(avaliacoes.avaliadoId, ids), eq(avaliacoes.sentido, 'familia_avalia_profissional'), avaliacaoRevelada(agora)))
    .groupBy(avaliacoes.avaliadoId);
  return new Map(linhas.map((l) => [l.id, { media: Number(l.media), total: l.total }]));
}

export function rotasBusca(app: FastifyInstance, ctx: Contexto) {
  // Listagem pública: só perfis no ar (aprovados e com valor da hora).
  app.get('/api/profissionais', async (req) => {
    const f = filtros.parse(req.query);
    const condicoes: SQL[] = [eq(profissionais.situacao, 'aprovado'), isNotNull(profissionais.valorHoraCentavos)];
    if (f.cidade) condicoes.push(sql`${semAcento(profissionais.cidade)} = ${normalizar(f.cidade)}`);
    if (f.uf) condicoes.push(eq(profissionais.uf, f.uf));
    if (f.bairro) condicoes.push(sql`exists (select 1 from unnest(${profissionais.bairros}) b where ${semAcento(sql`b`)} = ${normalizar(f.bairro)})`);
    if (f.veiculo !== undefined) condicoes.push(eq(profissionais.veiculoIncluso, f.veiculo));
    if (f.tarefa === 'outra') condicoes.push(eq(profissionais.aceitaOutras, true));
    else if (f.tarefa) {
      condicoes.push(
        exists(
          ctx.db
            .select({ x: sql`1` })
            .from(tarefasProfissional)
            .where(and(eq(tarefasProfissional.profissionalId, profissionais.usuarioId), eq(tarefasProfissional.tipo, f.tarefa))),
        ),
      );
    }
    const janela = f.data ? janelaDaData(f.data, f.turno) : null;
    const dia = janela?.dia ?? f.dia;
    if (dia !== undefined) {
      const [ini, fim] = f.turno ? TURNOS[f.turno] : [0, 24 * 60];
      // sem dias e horários definidos, ela não tem restrição; com eles, precisa atender no dia (e turno)
      const temFaixas = ctx.db.select({ x: sql`1` }).from(disponibilidade).where(eq(disponibilidade.profissionalId, profissionais.usuarioId));
      const atende = ctx.db
        .select({ x: sql`1` })
        .from(disponibilidade)
        .where(and(eq(disponibilidade.profissionalId, profissionais.usuarioId), eq(disponibilidade.dia, dia), lt(disponibilidade.inicioMin, fim), gt(disponibilidade.fimMin, ini)));
      condicoes.push(or(notExists(temFaixas), exists(atende))!);
    }
    if (janela) {
      condicoes.push(
        notExists(
          ctx.db
            .select({ x: sql`1` })
            .from(bloqueiosAgenda)
            .where(and(eq(bloqueiosAgenda.profissionalId, profissionais.usuarioId), lt(bloqueiosAgenda.inicio, janela.fim), gt(bloqueiosAgenda.fim, janela.inicio))),
        ),
      );
    }
    const onde = and(...condicoes);

    const [resumo] = await ctx.db
      .select({ total: count(), min: sql<number | null>`min(${profissionais.valorHoraCentavos})`, max: sql<number | null>`max(${profissionais.valorHoraCentavos})` })
      .from(profissionais)
      .where(onde);

    // relevância: nota revelada (maior primeiro), depois quem tem mais avaliações
    const agora = ctx.agora();
    const notaSql = sql`(select avg(a.nota) from ${avaliacoes} a join ${servicos} s on s.id = a.servico_id
      where a.avaliado_id = ${profissionais.usuarioId} and a.sentido = 'familia_avalia_profissional'
      and (exists (select 1 from ${avaliacoes} o where o.servico_id = a.servico_id and o.sentido <> a.sentido) or s.realizado_em <= ${new Date(agora.getTime() - 14 * 86_400_000)}))`;
    const ordem =
      f.ordem === 'preco'
        ? [asc(profissionais.valorHoraCentavos), asc(usuarios.nome)]
        : f.ordem === 'experiencia'
          ? [sql`${profissionais.anosExperiencia} desc nulls last`, asc(usuarios.nome)]
          : [sql`${notaSql} desc nulls last`, asc(usuarios.nome)];

    const pagina = await ctx.db
      .select({
        id: profissionais.usuarioId,
        slug: profissionais.slug,
        nome: usuarios.nome,
        cidade: profissionais.cidade,
        uf: profissionais.uf,
        bairros: profissionais.bairros,
        valorHoraCentavos: profissionais.valorHoraCentavos,
        descontoAPartirHoras: profissionais.descontoAPartirHoras,
        valorHoraDescontoCentavos: profissionais.valorHoraDescontoCentavos,
        horasMinimas: profissionais.horasMinimas,
        veiculoIncluso: profissionais.veiculoIncluso,
        aceitaOutras: profissionais.aceitaOutras,
        anosExperiencia: profissionais.anosExperiencia,
        revisadoEm: profissionais.revisadoEm,
        proximaRevisao: profissionais.proximaRevisao,
      })
      .from(profissionais)
      .innerJoin(usuarios, eq(usuarios.id, profissionais.usuarioId))
      .where(onde)
      .orderBy(...ordem)
      .limit(f.porPagina)
      .offset((f.pagina - 1) * f.porPagina);

    const ids = pagina.map((p) => p.id);
    const [notas, tarefas, faixas, fotos] = await Promise.all([
      notasDe(ctx.db, ids, agora),
      ids.length
        ? ctx.db
            .select({ id: tarefasProfissional.profissionalId, tipo: tarefasProfissional.tipo, nome: tarefasProfissional.nome, minimoHoras: tarefasProfissional.minimoHoras, ordem: tarefasProfissional.ordem })
            .from(tarefasProfissional)
            .where(inArray(tarefasProfissional.profissionalId, ids))
        : [],
      ids.length
        ? ctx.db
            .select({ id: disponibilidade.profissionalId, dia: disponibilidade.dia, inicioMin: disponibilidade.inicioMin, fimMin: disponibilidade.fimMin })
            .from(disponibilidade)
            .where(inArray(disponibilidade.profissionalId, ids))
        : [],
      ids.length
        ? ctx.db
            .select({ id: fotosPerfil.profissionalId, foto: fotosPerfil.id })
            .from(fotosPerfil)
            .where(and(inArray(fotosPerfil.profissionalId, ids), eq(fotosPerfil.situacao, 'aprovado')))
        : [],
    ]);

    const posicao = (t: { tipo: string; ordem: number }) => {
      const i = (TIPOS_FIXOS as readonly string[]).indexOf(t.tipo);
      return i >= 0 ? i : TIPOS_FIXOS.length + t.ordem;
    };
    const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const fotoDe = new Map(fotos.map((x) => [x.id, `/api/fotos/${x.foto}`]));

    return {
      total: resumo?.total ?? 0,
      pagina: f.pagina,
      porPagina: f.porPagina,
      // faixa de valor da hora entre todas as encontradas (não só desta página)
      valorHora: { minCentavos: resumo?.min ?? null, maxCentavos: resumo?.max ?? null },
      profissionais: pagina.map(({ id, ...p }) => {
        const minhas = faixas.filter((x) => x.id === id);
        // turnos em que ela atende em cada dia, para "Livre na quarta de manhã"
        const turnosPorDia = Object.fromEntries(
          [0, 1, 2, 3, 4, 5, 6].map((d) => [
            d,
            (Object.keys(TURNOS) as Turno[]).filter((t) => minhas.some((x) => x.dia === d && x.inicioMin < TURNOS[t][1] && x.fimMin > TURNOS[t][0])),
          ]),
        );
        return {
          ...p,
          nota: notas.get(id) ?? { media: null, total: 0 },
          fotoUrl: fotoDe.get(id) ?? null,
          tarefas: tarefas
            .filter((t) => t.id === id)
            .sort((a, b) => posicao(a) - posicao(b))
            .map((t) => ({ tipo: t.tipo, nome: t.tipo === 'personalizada' ? t.nome! : NOME_TAREFA[t.tipo], minimoHoras: t.minimoHoras })),
          disponibilidade: minhas
            .sort((a, b) => a.dia - b.dia || a.inicioMin - b.inicioMin)
            .map((x) => ({ dia: x.dia, inicio: hhmm(x.inicioMin), fim: hhmm(x.fimMin) })),
          // null quando ela não definiu dias e horários (atende a combinar)
          turnos: minhas.length ? turnosPorDia : null,
        };
      }),
    };
  });

  // Cidades com profissionais no ar, para as sugestões do campo de busca, com os bairros de cada uma.
  app.get('/api/cidades', async (req) => {
    const { q } = z.object({ q: z.string().trim().max(80).optional() }).parse(req.query);
    const linhas = await ctx.db
      .select({ cidade: profissionais.cidade, uf: profissionais.uf, bairros: profissionais.bairros })
      .from(profissionais)
      .where(
        and(
          eq(profissionais.situacao, 'aprovado'),
          isNotNull(profissionais.valorHoraCentavos),
          ...(q ? [sql`${semAcento(profissionais.cidade)} like ${`%${normalizar(q).replace(/[%_\\]/g, '')}%`}`] : []),
        ),
      );
    const porCidade = new Map<string, { cidade: string; uf: string; total: number; bairros: Set<string> }>();
    for (const l of linhas) {
      const chave = `${normalizar(l.cidade)}|${l.uf}`;
      const c = porCidade.get(chave) ?? { cidade: l.cidade, uf: l.uf, total: 0, bairros: new Set<string>() };
      c.total++;
      l.bairros.forEach((b) => c.bairros.add(b));
      porCidade.set(chave, c);
    }
    const cidades = [...porCidade.values()]
      .sort((a, b) => b.total - a.total || a.cidade.localeCompare(b.cidade, 'pt-BR'))
      .map((c) => ({ ...c, bairros: [...c.bairros].sort((a, b) => a.localeCompare(b, 'pt-BR')) }));
    return { cidades };
  });
}
