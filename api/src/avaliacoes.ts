import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db } from './db/index.js';
import { avaliacoes, pessoasAcompanhadas, servicos, usuarios } from './db/schema.js';

// Avaliação às cegas: nenhuma das duas partes vê a nota da outra até as duas
// avaliarem ou até o prazo acabar. Depois do prazo, não se avalia mais.
export const PRAZO_AVALIACAO_DIAS = 14;
export const PRAZO_AVALIACAO_MS = PRAZO_AVALIACAO_DIAS * 24 * 60 * 60 * 1000;

export type Sentido = 'familia_avalia_profissional' | 'profissional_avalia_familia';

const outra = alias(avaliacoes, 'outra');

export function avaliacaoRevelada(agora: Date): SQL {
  const limite = new Date(agora.getTime() - PRAZO_AVALIACAO_MS);
  return sql`(exists (select 1 from ${avaliacoes} as ${outra} where ${outra.servicoId} = ${avaliacoes.servicoId} and ${outra.sentido} <> ${avaliacoes.sentido}) or ${servicos.realizadoEm} <= ${limite})`;
}

// "Mariana Costa" vira "Mariana C.": o público vê quem avaliou sem o sobrenome completo.
export function nomeCurto(nome: string): string {
  const [primeiro, ...resto] = nome.trim().split(/\s+/);
  const ultimo = resto.at(-1);
  return ultimo ? `${primeiro} ${ultimo[0]!.toUpperCase()}.` : primeiro!;
}

const autor = alias(usuarios, 'autor');

const recebidasReveladas = (avaliadoId: string, sentido: Sentido, agora: Date) =>
  and(eq(avaliacoes.avaliadoId, avaliadoId), eq(avaliacoes.sentido, sentido), avaliacaoRevelada(agora));

// Média e total das avaliações recebidas e já reveladas.
export async function notaRecebida(db: Db, avaliadoId: string, sentido: Sentido, agora: Date) {
  const [resumo] = await db
    .select({
      total: sql<number>`count(*)::int`,
      media: sql<string | null>`round(avg(${avaliacoes.nota}), 1)::text`,
    })
    .from(avaliacoes)
    .innerJoin(servicos, eq(servicos.id, avaliacoes.servicoId))
    .where(recebidasReveladas(avaliadoId, sentido, agora));
  return { total: resumo?.total ?? 0, media: resumo?.media == null ? null : Number(resumo.media) };
}

// Avaliações recebidas e já reveladas, com a média calculada só sobre elas.
export async function avaliacoesRecebidas(db: Db, avaliadoId: string, sentido: Sentido, agora: Date) {
  const filtro = recebidasReveladas(avaliadoId, sentido, agora);
  const nota = await notaRecebida(db, avaliadoId, sentido, agora);
  const lista = await db
    .select({
      id: avaliacoes.id,
      nota: avaliacoes.nota,
      comentario: avaliacoes.comentario,
      criadoEm: avaliacoes.criadoEm,
      tarefa: servicos.tarefa,
      autorNome: autor.nome,
      parentesco: pessoasAcompanhadas.parentesco,
      resposta: avaliacoes.resposta,
      respondidoEm: avaliacoes.respondidoEm,
    })
    .from(avaliacoes)
    .innerJoin(servicos, eq(servicos.id, avaliacoes.servicoId))
    .innerJoin(autor, eq(autor.id, avaliacoes.autorId))
    .leftJoin(pessoasAcompanhadas, eq(pessoasAcompanhadas.id, servicos.pessoaAcompanhadaId))
    .where(filtro)
    .orderBy(desc(avaliacoes.criadoEm))
    .limit(50);
  return {
    ...nota,
    // `relacao` é como a família se apresenta ("Filha"), sem o nome de quem foi acompanhado
    avaliacoes: lista.map(({ autorNome, parentesco, ...a }) => ({
      ...a,
      autor: nomeCurto(autorNome),
      relacao: parentesco ? parentesco[0]!.toLocaleUpperCase('pt-BR') + parentesco.slice(1) : null,
    })),
  };
}
