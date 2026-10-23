import { and, asc, eq, gt, inArray, lt, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from './db/index.js';
import { bloqueiosAgenda, disponibilidade, servicos } from './db/schema.js';
import { ErroApi } from './erros.js';

export const FUSO = 'America/Sao_Paulo';
const HORA_MS = 60 * 60 * 1000;
const DIAS = ['no domingo', 'na segunda', 'na terça', 'na quarta', 'na quinta', 'na sexta', 'no sábado'];

const hhmm = z
  .string({ error: 'Use o horário no formato 08:00.' })
  .regex(/^([01]\d|2[0-4]):(00|30)$/, 'Use horas cheias ou meias, como 08:00 ou 08:30.')
  .transform((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)))
  .refine((m) => m <= 1440, 'O horário vai até 24:00.');

const faixa = z.object({
  dia: z.number({ error: 'Escolha o dia.' }).int().min(0, 'Escolha o dia.').max(6, 'Escolha o dia.'),
  inicio: hhmm,
  fim: hhmm,
});

// até duas faixas por dia, sem se sobrepor, com o fim depois do início
export const listaDeDisponibilidade = z
  .array(faixa)
  .max(14, 'Use no máximo duas faixas por dia.')
  .superRefine((lista, c) => {
    lista.forEach((f, i) => {
      if (f.fim <= f.inicio) c.addIssue({ code: 'custom', path: [i, 'fim'], message: 'O fim precisa ser depois do início.' });
    });
    for (let dia = 0; dia < 7; dia++) {
      const doDia = lista.map((f, i) => ({ ...f, i })).filter((f) => f.dia === dia).sort((a, b) => a.inicio - b.inicio);
      if (doDia.length > 2) c.addIssue({ code: 'custom', path: [doDia[2]!.i, 'dia'], message: 'Use no máximo duas faixas por dia.' });
      for (let k = 1; k < doDia.length; k++) {
        if (doDia[k]!.inicio < doDia[k - 1]!.fim) c.addIssue({ code: 'custom', path: [doDia[k]!.i, 'inicio'], message: 'Esta faixa se sobrepõe à anterior.' });
      }
    }
  });

const texto = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export async function disponibilidadeDe(db: Db, profissionalId: string) {
  const linhas = await db
    .select({ dia: disponibilidade.dia, inicioMin: disponibilidade.inicioMin, fimMin: disponibilidade.fimMin })
    .from(disponibilidade)
    .where(eq(disponibilidade.profissionalId, profissionalId))
    .orderBy(asc(disponibilidade.dia), asc(disponibilidade.inicioMin));
  return linhas.map((l) => ({ dia: l.dia, inicio: texto(l.inicioMin), fim: texto(l.fimMin) }));
}

export async function salvarDisponibilidade(tx: Db, profissionalId: string, lista: z.infer<typeof listaDeDisponibilidade>) {
  await tx.delete(disponibilidade).where(eq(disponibilidade.profissionalId, profissionalId));
  if (lista.length) {
    await tx.insert(disponibilidade).values(lista.map((f) => ({ profissionalId, dia: f.dia, inicioMin: f.inicio, fimMin: f.fim })));
  }
}

// dia da semana e minutos desde a meia-noite, no horário de Brasília
function noFuso(d: Date) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: FUSO, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partes.weekday!);
  return { dia, minutos: Number(partes.hour) * 60 + Number(partes.minute) };
}

// Confere se o horário cabe na agenda dela: dentro de uma faixa do dia (se ela definiu os
// horários), fora das folgas e sem bater com outro atendimento confirmado.
export async function conferirHorario(
  db: Db,
  profissionalId: string,
  inicio: Date,
  horas: number,
  op: { ignorarServico?: string; conferirFaixas?: boolean } = {},
) {
  const fim = new Date(inicio.getTime() + horas * HORA_MS);
  if (op.conferirFaixas !== false) {
    const faixas = await db
      .select({ dia: disponibilidade.dia, inicioMin: disponibilidade.inicioMin, fimMin: disponibilidade.fimMin })
      .from(disponibilidade)
      .where(eq(disponibilidade.profissionalId, profissionalId));
    if (faixas.length) {
      const a = noFuso(inicio);
      const fimMin = a.minutos + horas * 60;
      const cabe = faixas.some((f) => f.dia === a.dia && f.inicioMin <= a.minutos && fimMin <= f.fimMin);
      if (!cabe) {
        const doDia = faixas.filter((f) => f.dia === a.dia).sort((x, y) => x.inicioMin - y.inicioMin);
        const quando = doDia.length
          ? `${DIAS[a.dia]![0]!.toUpperCase()}${DIAS[a.dia]!.slice(1)}, ela atende ${doDia.map((f) => `das ${texto(f.inicioMin)} às ${texto(f.fimMin)}`).join(' e ')}.`
          : `Ela não atende ${DIAS[a.dia]}.`;
        throw new ErroApi(422, 'fora_da_disponibilidade', `Este horário está fora dos dias e horários da profissional. ${quando}`, {
          inicio: 'Escolha um horário dentro da agenda dela.',
        });
      }
    }
  }
  const [bloqueio] = await db
    .select({ id: bloqueiosAgenda.id })
    .from(bloqueiosAgenda)
    .where(and(eq(bloqueiosAgenda.profissionalId, profissionalId), lt(bloqueiosAgenda.inicio, fim), gt(bloqueiosAgenda.fim, inicio)))
    .limit(1);
  if (bloqueio) {
    throw new ErroApi(422, 'horario_indisponivel', 'A profissional não atende neste período. Escolha outro dia ou horário.', { inicio: 'Período indisponível.' });
  }
  const [ocupado] = await db
    .select({ id: servicos.id })
    .from(servicos)
    .where(
      and(
        eq(servicos.profissionalId, profissionalId),
        // o aceito que espera o pagamento da família já segura o horário
        inArray(servicos.situacao, ['aguardando_pagamento', 'confirmado']),
        lt(servicos.inicio, fim),
        sql`${servicos.inicio} + make_interval(hours => ${servicos.horas}::int) > ${inicio}`,
        ...(op.ignorarServico ? [ne(servicos.id, op.ignorarServico)] : []),
      ),
    )
    .limit(1);
  if (ocupado) {
    throw new ErroApi(409, 'horario_ocupado', 'A profissional já tem um atendimento confirmado neste horário.', { inicio: 'Horário ocupado.' });
  }
}

// Pedidos e propostas que passaram do prazo sem resposta, e aceites que a família não
// pagou no prazo. Roda antes de ler ou mudar
// serviços, para não precisar de uma tarefa agendada.
export async function expirarVencidos(db: Db, agora: Date) {
  await db
    .update(servicos)
    .set({ situacao: 'expirado', atualizadoEm: agora })
    .where(and(inArray(servicos.situacao, ['solicitado', 'proposta_alterada', 'aguardando_pagamento']), lt(servicos.respondaAte, agora)));
}

// prazo para responder: 24 horas, ou até o início se ele vier antes
export const PRAZO_RESPOSTA_MS = 24 * HORA_MS;
export const prazoDeResposta = (agora: Date, inicio: Date) => new Date(Math.min(agora.getTime() + PRAZO_RESPOSTA_MS, inicio.getTime()));
