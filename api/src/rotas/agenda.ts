import { createHash, createHmac } from 'node:crypto';
import { and, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { exigirUsuario } from '../auth.js';
import type { Contexto } from '../contexto.js';
import { linksAgenda, pessoasAcompanhadas, servicos, usuarios } from '../db/schema.js';
import { ErroApi, naoEncontrado } from '../erros.js';

const JANELA_PASSADO_MS = 30 * 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;

// token de 256 bits em base64url, sempre o mesmo para a mesma conta e versão
function tokenDe(segredo: string, usuarioId: string, versao: number) {
  return createHmac('sha256', segredo).update(`agenda:${usuarioId}:${versao}`).digest('base64url');
}
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const origem = (req: FastifyRequest) => `${req.protocol}://${req.headers.host}`;

// --- iCalendar (RFC 5545) ---

// escapa barra invertida, ponto e vírgula, vírgula e quebra de linha
const texto = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// 20261028T120000Z
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// quebra a linha em pedaços de até 75 bytes, sem cortar um caractere UTF-8 no meio
function dobrar(linha: string): string {
  const partes: string[] = [];
  let atual = '';
  let bytes = 0;
  for (const ch of linha) {
    const n = Buffer.byteLength(ch);
    const limite = partes.length ? 74 : 75; // as continuações começam com um espaço
    if (bytes + n > limite) {
      partes.push(atual);
      atual = '';
      bytes = 0;
    }
    atual += ch;
    bytes += n;
  }
  partes.push(atual);
  return partes.join('\r\n ');
}

export interface Evento {
  id: string;
  inicio: Date;
  fim: Date;
  titulo: string;
  local: string | null;
  descricao: string;
  atualizadoEm: Date;
}

export function montarIcs(eventos: Evento[]): string {
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Minha companhia//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Minha companhia',
    'X-WR-TIMEZONE:America/Sao_Paulo',
    // pedido de atualização a cada hora; cada aplicativo decide se obedece
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  for (const e of eventos) {
    linhas.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@minhacompanhia.com.br`,
      `DTSTAMP:${utc(e.atualizadoEm)}`,
      `LAST-MODIFIED:${utc(e.atualizadoEm)}`,
      `DTSTART:${utc(e.inicio)}`,
      `DTEND:${utc(e.fim)}`,
      `SUMMARY:${texto(e.titulo)}`,
      ...(e.local ? [`LOCATION:${texto(e.local)}`] : []),
      `DESCRIPTION:${texto(e.descricao)}`,
      // lembrete uma hora antes
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${texto(e.titulo)}`,
      'TRIGGER:-PT1H',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  linhas.push('END:VCALENDAR');
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}

// --- rotas ---

const familia = alias(usuarios, 'familia');
const pro = alias(usuarios, 'pro');
const primeiro = (nome: string) => nome.trim().split(/\s+/)[0]!;

export function rotasAgenda(app: FastifyInstance, ctx: Contexto, segredo: string | null) {
  const exigirSegredo = () => {
    if (!segredo) throw new ErroApi(503, 'agenda_indisponivel', 'A assinatura da agenda ainda não está disponível.');
    return segredo;
  };

  const resposta = (req: FastifyRequest, token: string) => {
    const url = `${origem(req)}/api/agenda/${token}.ics`;
    // webcal:// abre direto o "assinar calendário" no iPhone e no Mac
    return { url, webcal: url.replace(/^https?:/, 'webcal:') };
  };

  // o link da conta: criado na primeira chamada, o mesmo nas seguintes
  app.get('/api/agenda/link', async (req) => {
    const u = exigirUsuario(req);
    const chave = exigirSegredo();
    const [atual] = await ctx.db.select({ versao: linksAgenda.versao }).from(linksAgenda).where(eq(linksAgenda.usuarioId, u.id));
    if (atual) return resposta(req, tokenDe(chave, u.id, atual.versao));
    const token = tokenDe(chave, u.id, 1);
    await ctx.db.insert(linksAgenda).values({ usuarioId: u.id, versao: 1, tokenHash: hashToken(token) }).onConflictDoNothing();
    return resposta(req, token);
  });

  // link novo, para quando o antigo vazou ou foi compartilhado sem querer
  app.post('/api/agenda/link/novo', async (req) => {
    const u = exigirUsuario(req);
    const chave = exigirSegredo();
    const [atual] = await ctx.db.select({ versao: linksAgenda.versao }).from(linksAgenda).where(eq(linksAgenda.usuarioId, u.id));
    const versao = (atual?.versao ?? 0) + 1;
    const token = tokenDe(chave, u.id, versao);
    await ctx.db
      .insert(linksAgenda)
      .values({ usuarioId: u.id, versao, tokenHash: hashToken(token), criadoEm: ctx.agora() })
      .onConflictDoUpdate({ target: linksAgenda.usuarioId, set: { versao, tokenHash: hashToken(token), criadoEm: ctx.agora() } });
    return resposta(req, token);
  });

  // O arquivo que o aplicativo de agenda busca de tempos em tempos. Sem sessão: o token é
  // a chave. Vale para os dois lados de cada serviço confirmado ou já feito, dos últimos
  // 30 dias em diante; cancelado e recusado somem do arquivo.
  app.get(
    '/api/agenda/:token.ics',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (req: FastifyRequest) => (req.params as { token?: string }).token ?? req.ip } } },
    async (req, reply) => {
      const lido = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).safeParse(req.params);
      if (!lido.success) throw naoEncontrado('Link de agenda não encontrado.');
      const { token } = lido.data;
      const [link] = await ctx.db.select({ usuarioId: linksAgenda.usuarioId }).from(linksAgenda).where(eq(linksAgenda.tokenHash, hashToken(token)));
      if (!link) throw naoEncontrado('Link de agenda não encontrado.');
      const desde = new Date(ctx.agora().getTime() - JANELA_PASSADO_MS);
      const linhas = await ctx.db
        .select({
          id: servicos.id,
          tarefa: servicos.tarefa,
          local: servicos.local,
          inicio: servicos.inicio,
          horas: servicos.horas,
          atualizadoEm: servicos.atualizadoEm,
          familia: familia.nome,
          profissional: pro.nome,
          pessoa: pessoasAcompanhadas.nome,
        })
        .from(servicos)
        .innerJoin(familia, eq(familia.id, servicos.contratanteId))
        .innerJoin(pro, eq(pro.id, servicos.profissionalId))
        .leftJoin(pessoasAcompanhadas, eq(pessoasAcompanhadas.id, servicos.pessoaAcompanhadaId))
        .where(
          and(
            or(eq(servicos.contratanteId, link.usuarioId), eq(servicos.profissionalId, link.usuarioId)),
            inArray(servicos.situacao, ['confirmado', 'realizado']),
            gte(sql`${servicos.inicio} + make_interval(hours => ${servicos.horas}::int)`, desde),
          ),
        )
        .orderBy(servicos.inicio);
      const site = origem(req);
      const eventos: Evento[] = linhas.map((s) => ({
        id: s.id,
        inicio: s.inicio,
        fim: new Date(s.inicio.getTime() + s.horas * HORA_MS),
        titulo: `${s.tarefa} com ${s.pessoa ? primeiro(s.pessoa) : s.familia}`,
        local: s.local,
        // sem telefone, CPF nem endereço completo: o arquivo pode ficar em servidores de terceiros
        descricao: [
          'Atendimento pela Minha companhia.',
          `Família: ${s.familia}`,
          ...(s.pessoa ? [`Para: ${s.pessoa}`] : []),
          `Profissional: ${s.profissional}`,
          `Detalhes e endereço: ${site}/painel#agenda`,
        ].join('\n'),
        atualizadoEm: s.atualizadoEm,
      }));
      return reply
        .header('content-type', 'text/calendar; charset=utf-8')
        .header('content-disposition', 'inline; filename="minha-companhia.ics"')
        .header('cache-control', 'private, max-age=300')
        .header('x-robots-tag', 'noindex')
        .send(montarIcs(eventos));
    },
  );
}
