import { randomInt } from 'node:crypto';
import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { exigirAdmin } from '../auth.js';
import type { Contexto } from '../contexto.js';
import type { Db } from '../db/index.js';
import { convites, profissionais, usuarios } from '../db/schema.js';
import { conflito, ErroApi, naoEncontrado } from '../erros.js';
import { maisDias, maisMeses, NOMES_PACOTES, PACOTES, REGRAS, termosDoPacote, type Pacote } from '../financeiro.js';
import * as v from '../validacao.js';

const DIA_MS = 86_400_000;
// sem 0/O e 1/I/L, que se confundem quando a pessoa digita o código
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const codigoConvite = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^MC-[A-Z0-9]{8}$/, 'Confira o código do convite.');

const novoCodigo = () => `MC-${Array.from({ length: 8 }, () => LETRAS[randomInt(LETRAS.length)]).join('')}`;

const vazioParaNada = (x: unknown) => (x === '' || x === null ? undefined : x);
const opcional = <T extends z.ZodType>(t: T) => z.preprocess(vazioParaNada, t.optional());

const pacote = z.enum(NOMES_PACOTES, { error: 'Escolha o pacote do convite.' });

const novoConvite = z
  .object({
    nome: z.string({ error: 'Para quem é o convite?' }).trim().min(2, 'Para quem é o convite?').max(120),
    email: opcional(v.email),
    celular: opcional(v.celular),
    mensagem: opcional(z.string().trim().max(600, 'Use no máximo 600 caracteres.')),
    pacote: pacote.default('boas_vindas'),
    usosMaximos: z.number().int().min(1, 'Pelo menos 1 uso.').max(500, 'No máximo 500 usos.').default(1),
    validadeDias: z.number().int().min(1, 'Pelo menos 1 dia.').max(365, 'No máximo 365 dias.').default(30),
    observacao: opcional(z.string().trim().max(300, 'Use no máximo 300 caracteres.')),
    enviarEmail: z.boolean().default(false),
  })
  .superRefine((d, c) => {
    if (d.enviarEmail && !d.email) c.addIssue({ code: 'custom', path: ['email'], message: 'Informe o e-mail para enviar o convite.' });
  });

// null tira o benefício
const beneficio = z.object({ pacote: pacote.nullable() });

const idParam = z.object({ id: v.uuid });

type Convite = typeof convites.$inferSelect;
type Situacao = 'ativo' | 'usado' | 'expirado' | 'cancelado';

const situacaoDe = (c: Convite, agora: Date): Situacao =>
  c.canceladoEm ? 'cancelado' : c.usos >= c.usosMaximos ? 'usado' : c.expiraEm && c.expiraEm <= agora ? 'expirado' : 'ativo';

export const linkDoConvite = (codigo: string) => `/entrar?perfil=pro&modo=criar&convite=${codigo}`;

interface Termos {
  taxaPercentual: number | null;
  taxaDias: number | null;
  prioridadeFila: boolean;
  isencaoMeses: number | null;
}

// os benefícios em frases, para o e-mail, a tela do cadastro e o painel
export function beneficiosEmTexto(b: Termos): string[] {
  const itens: string[] = [];
  if (b.taxaPercentual != null && b.taxaDias) {
    const taxa = b.taxaPercentual === 0 ? 'sem taxa da plataforma' : `taxa da plataforma de ${b.taxaPercentual}% (no lugar de ${REGRAS.taxaPercentual}%)`;
    itens.push(`${taxa} nos primeiros ${b.taxaDias} dias depois da aprovação`);
  }
  if (b.prioridadeFila) itens.push('prioridade na análise do cadastro');
  if (b.isencaoMeses) itens.push(`cadastro e mensalidade sem custo nos primeiros ${b.isencaoMeses === 1 ? 'mês' : `${b.isencaoMeses} meses`}`);
  return itens;
}

const nomeDoPacote = (p: string | null) => (p && p in PACOTES ? PACOTES[p as Pacote].nome : null);

// os pacotes como estão hoje, para a tela de convites escolher e mostrar
export const pacotesHoje = () =>
  NOMES_PACOTES.map((id) => {
    const t = termosDoPacote(id);
    return { id, nome: PACOTES[id].nome, ...t, beneficios: beneficiosEmTexto(t) };
  });

// os campos do benefício na profissional, com o pacote e as datas de fim
export const beneficioDaLinha = (p: {
  beneficioPacote: string | null;
  taxaEspecialPercentual: number | null;
  taxaEspecialDias: number | null;
  taxaEspecialAte: Date | null;
  prioridadeFila: boolean;
  isencaoMeses: number | null;
  isencaoAte: Date | null;
}) =>
  p.beneficioPacote || p.taxaEspecialPercentual != null || p.prioridadeFila
    ? {
        pacote: p.beneficioPacote,
        nome: nomeDoPacote(p.beneficioPacote),
        taxaPercentual: p.taxaEspecialPercentual,
        taxaDias: p.taxaEspecialDias,
        taxaAte: p.taxaEspecialAte,
        prioridadeFila: p.prioridadeFila,
        isencaoMeses: p.isencaoMeses,
        isencaoAte: p.isencaoAte,
        beneficios: beneficiosEmTexto({ taxaPercentual: p.taxaEspecialPercentual, taxaDias: p.taxaEspecialDias, prioridadeFila: p.prioridadeFila, isencaoMeses: p.isencaoMeses }),
      }
    : null;

export const colunasDoBeneficio = {
  beneficioPacote: profissionais.beneficioPacote,
  taxaEspecialPercentual: profissionais.taxaEspecialPercentual,
  taxaEspecialDias: profissionais.taxaEspecialDias,
  taxaEspecialAte: profissionais.taxaEspecialAte,
  prioridadeFila: profissionais.prioridadeFila,
  isencaoMeses: profissionais.isencaoMeses,
  isencaoAte: profissionais.isencaoAte,
};

const dataBr = (d: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);

async function enviarPorEmail(ctx: Contexto, c: Convite, origem: string) {
  const itens = beneficiosEmTexto(c);
  const texto = [
    `Olá, ${c.nome.trim().split(/\s+/)[0]}!`,
    '',
    ...(c.mensagem ? [c.mensagem, ''] : []),
    'Você recebeu um convite especial para atender pela Minha companhia, acompanhando pais e mães idosos em consultas, banco, mercado e passeios.',
    ...(itens.length ? ['', `Com o convite ${nomeDoPacote(c.pacote) ?? 'especial'} você tem:`, ...itens.map((i) => `- ${i}`)] : []),
    '',
    `Crie sua conta por este link: ${origem}${linkDoConvite(c.codigo)}`,
    ...(c.expiraEm ? ['', `O convite vale até ${dataBr(c.expiraEm)}.`] : []),
    '',
    'Equipe Minha companhia',
  ].join('\n');
  await ctx.mensageiro.enviar({ canal: 'email', destino: c.email!, assunto: 'Seu convite para a Minha companhia', texto });
}

// Usado no cadastro da profissional, dentro da mesma transação: conta o uso e devolve os
// benefícios que vão para o perfil. O update só passa se o convite ainda vale para este e-mail.
export async function usarConvite(tx: Db, codigo: string | undefined, email: string, agora: Date) {
  if (!codigo) return null;
  const [c] = await tx
    .update(convites)
    .set({ usos: sql`${convites.usos} + 1` })
    .where(
      and(
        eq(convites.codigo, codigo),
        isNull(convites.canceladoEm),
        lt(convites.usos, convites.usosMaximos),
        or(isNull(convites.expiraEm), gt(convites.expiraEm, agora)),
        or(isNull(convites.email), sql`lower(${convites.email}) = ${email.toLowerCase()}`),
      ),
    )
    .returning();
  if (!c) {
    const [existe] = await tx.select({ email: convites.email }).from(convites).where(eq(convites.codigo, codigo));
    const msg = !existe
      ? 'Não encontramos este convite. Confira o link que você recebeu.'
      : existe.email && existe.email.toLowerCase() !== email.toLowerCase()
        ? 'Este convite é para outro e-mail. Use o e-mail em que você recebeu o convite.'
        : 'Este convite não vale mais. Fale com a equipe da Minha companhia.';
    throw new ErroApi(422, 'convite_invalido', msg, existe?.email ? { email: msg } : undefined);
  }
  return {
    conviteId: c.id,
    beneficioPacote: c.pacote,
    taxaEspecialPercentual: c.taxaPercentual,
    taxaEspecialDias: c.taxaDias,
    prioridadeFila: c.prioridadeFila,
    isencaoMeses: c.isencaoMeses,
  };
}

export function rotasConvites(app: FastifyInstance, ctx: Contexto, op: { limite: { max: number; timeWindow: string }; siteUrl?: string }) {
  const origemDe = (req: FastifyRequest) => op.siteUrl ?? `${req.protocol}://${req.host}`;

  // a tela de cadastro mostra o convite (para quem é e o que traz) antes de a pessoa criar a conta
  app.get('/api/convites/:codigo', { config: { rateLimit: op.limite } }, async (req) => {
    const { codigo } = z.object({ codigo: codigoConvite }).parse(req.params);
    const [c] = await ctx.db.select().from(convites).where(eq(convites.codigo, codigo));
    if (!c) throw naoEncontrado('Convite não encontrado.');
    const situacao = situacaoDe(c, ctx.agora());
    if (situacao !== 'ativo') throw new ErroApi(410, 'convite_encerrado', 'Este convite não vale mais. Fale com a equipe da Minha companhia.');
    return {
      convite: {
        codigo,
        nome: c.nome.trim().split(/\s+/)[0],
        mensagem: c.mensagem,
        pacote: nomeDoPacote(c.pacote),
        // com e-mail, a tela já sabe qual usar
        emailExigido: !!c.email,
        beneficios: beneficiosEmTexto(c),
        expiraEm: c.expiraEm,
      },
    };
  });

  app.get('/api/admin/convites', async (req) => {
    exigirAdmin(req);
    const agora = ctx.agora();
    const lista = await ctx.db
      .select({ c: convites, criadoPor: usuarios.nome })
      .from(convites)
      .leftJoin(usuarios, eq(usuarios.id, convites.criadoPor))
      .orderBy(desc(convites.criadoEm))
      .limit(300);
    const ids = lista.map((l) => l.c.id);
    const quem = ids.length
      ? await ctx.db
          .select({ conviteId: profissionais.conviteId, id: profissionais.usuarioId, nome: usuarios.nome, situacao: profissionais.situacao })
          .from(profissionais)
          .innerJoin(usuarios, eq(usuarios.id, profissionais.usuarioId))
          .where(inArray(profissionais.conviteId, ids))
      : [];
    const itens = lista.map(({ c, criadoPor }) => ({
      ...c,
      situacao: situacaoDe(c, agora),
      link: linkDoConvite(c.codigo),
      beneficios: beneficiosEmTexto(c),
      nomePacote: nomeDoPacote(c.pacote),
      criadoPor,
      cadastradas: quem.filter((q) => q.conviteId === c.id).map(({ id, nome, situacao }) => ({ id, nome, situacao })),
    }));
    return {
      taxaPadrao: REGRAS.taxaPercentual,
      pacotes: pacotesHoje(),
      resumo: {
        ativos: itens.filter((i) => i.situacao === 'ativo').length,
        cadastradas: quem.length,
        aprovadas: quem.filter((q) => q.situacao === 'aprovado').length,
      },
      convites: itens,
    };
  });

  app.post('/api/admin/convites', async (req, reply) => {
    const adm = exigirAdmin(req);
    const d = novoConvite.parse(req.body);
    const agora = ctx.agora();
    let c: Convite | undefined;
    for (let tentativa = 0; !c && tentativa < 5; tentativa++) {
      [c] = await ctx.db
        .insert(convites)
        .values({
          codigo: novoCodigo(),
          nome: d.nome,
          email: d.email ?? null,
          celular: d.celular ?? null,
          mensagem: d.mensagem ?? null,
          ...termosDoPacote(d.pacote),
          usosMaximos: d.usosMaximos,
          expiraEm: new Date(agora.getTime() + d.validadeDias * DIA_MS),
          observacao: d.observacao ?? null,
          criadoPor: adm.id,
        })
        .onConflictDoNothing({ target: convites.codigo })
        .returning();
    }
    if (!c) throw new ErroApi(500, 'erro_interno', 'Não conseguimos criar o código agora. Tente de novo.');
    let envio: { ok: boolean; erro?: string } | null = null;
    if (d.enviarEmail) {
      envio = await enviar(c, req);
      if (envio.ok) c.enviadoEm = agora;
    }
    return reply.status(201).send({ convite: { ...c, situacao: situacaoDe(c, agora), link: linkDoConvite(c.codigo), beneficios: beneficiosEmTexto(c), nomePacote: nomeDoPacote(c.pacote), cadastradas: [] }, envio });
  });

  // um e-mail que falha não desfaz o convite: a tela mostra o erro e o link para mandar de outro jeito
  async function enviar(c: Convite, req: FastifyRequest) {
    try {
      await enviarPorEmail(ctx, c, origemDe(req));
      await ctx.db.update(convites).set({ enviadoEm: ctx.agora() }).where(eq(convites.id, c.id));
      return { ok: true };
    } catch (err) {
      req.log.error({ err }, 'envio do convite');
      return { ok: false, erro: err instanceof ErroApi ? err.message : 'O e-mail não saiu. Copie o link e mande por WhatsApp.' };
    }
  }

  app.post('/api/admin/convites/:id/enviar', async (req) => {
    exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const [c] = await ctx.db.select().from(convites).where(eq(convites.id, id));
    if (!c) throw naoEncontrado('Convite não encontrado.');
    if (!c.email) throw new ErroApi(422, 'sem_email', 'Este convite não tem e-mail. Copie o link e mande por WhatsApp.');
    if (situacaoDe(c, ctx.agora()) !== 'ativo') throw conflito('convite_encerrado', 'Este convite não vale mais.');
    const envio = await enviar(c, req);
    if (!envio.ok) throw new ErroApi(502, 'envio_falhou', envio.erro!);
    return { ok: true };
  });

  app.post('/api/admin/convites/:id/cancelar', async (req) => {
    exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const [c] = await ctx.db
      .update(convites)
      .set({ canceladoEm: ctx.agora() })
      .where(and(eq(convites.id, id), isNull(convites.canceladoEm)))
      .returning({ id: convites.id });
    if (!c) throw conflito('ja_cancelado', 'Este convite já foi cancelado.');
    return { ok: true };
  });

  // Pacote dado direto a uma profissional já cadastrada (sem convite), ou retirado com null. Já
  // aprovada, os prazos começam agora; senão, começam na aprovação.
  app.put('/api/admin/profissionais/:id/beneficio', async (req) => {
    exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const b = beneficio.parse(req.body);
    const [p] = await ctx.db.select({ aprovadoEm: profissionais.aprovadoEm }).from(profissionais).where(eq(profissionais.usuarioId, id));
    if (!p) throw naoEncontrado('Profissional não encontrada.');
    const agora = ctx.agora();
    const t = b.pacote ? termosDoPacote(b.pacote) : null;
    const [r] = await ctx.db
      .update(profissionais)
      .set({
        beneficioPacote: t?.pacote ?? null,
        taxaEspecialPercentual: t?.taxaPercentual ?? null,
        taxaEspecialDias: t?.taxaDias ?? null,
        taxaEspecialAte: t && p.aprovadoEm ? maisDias(agora, t.taxaDias) : null,
        prioridadeFila: t?.prioridadeFila ?? false,
        isencaoMeses: t?.isencaoMeses ?? null,
        isencaoAte: t && p.aprovadoEm ? maisMeses(agora, t.isencaoMeses) : null,
        atualizadoEm: agora,
      })
      .where(eq(profissionais.usuarioId, id))
      .returning(colunasDoBeneficio);
    return { beneficio: beneficioDaLinha(r!) };
  });
}
