import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  abrirSessao,
  carregarUsuario,
  conferirSenha,
  encerrarSessao,
  exigirContratante,
  exigirUsuario,
  gerarHashSenha,
} from '../auth.js';
import type { Contexto } from '../contexto.js';
import type { Db } from '../db/index.js';
import { contratantes, pessoasAcompanhadas, profissionais, usuarios } from '../db/schema.js';
import { conflito, ErroApi, violouUnico } from '../erros.js';
import * as v from '../validacao.js';
import { codigoIndicacao, registrarIndicacao } from './indicacoes.js';
import { tarefasDe } from '../tarefas.js';

const pessoa = z.object({
  nome: v.nome,
  dataNascimento: v.dataIso.optional(),
  observacoes: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.').optional(),
});

const cadastroBase = z.object({
  nome: v.nome,
  email: v.email,
  celular: v.celular,
  senha: v.senhaNova,
  aceitaTermos: v.aceitaTermos,
  // código de quem indicou, vindo do link (?indicacao=ANA-7K2P)
  codigoIndicacao: z.preprocess((x) => (x === '' ? undefined : x), codigoIndicacao.optional()),
});

const cadastroContratante = cadastroBase.extend({
  // quem vai receber o acompanhamento; pode ficar para depois
  pessoaAcompanhada: pessoa.optional(),
});

const cadastroProfissional = cadastroBase.extend({
  cidade: z.string({ error: 'Informe a cidade de atendimento.' }).trim().min(2, 'Informe a cidade de atendimento.').max(80),
  uf: z
    .string({ error: 'Informe o estado.' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Use a sigla do estado, como SP.'),
});

const login = z.object({
  email: v.email,
  senha: z.string({ error: 'Digite sua senha.' }).min(1, 'Digite sua senha.').max(200),
});

const emailEmUso = () =>
  conflito('email_em_uso', 'Já existe uma conta com este e-mail. Entre com sua senha.', {
    email: 'Já existe uma conta com este e-mail.',
  });

export function slugDoNome(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'profissional'
  );
}

async function slugLivre(db: Db, nome: string): Promise<string> {
  const base = slugDoNome(nome);
  const usados = new Set(
    (
      await db
        .select({ slug: profissionais.slug })
        .from(profissionais)
        .where(or(eq(profissionais.slug, base), like(profissionais.slug, `${base}-%`)))
    ).map((l) => l.slug),
  );
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function dadosDaConta(db: Db, usuarioId: string) {
  const [linha] = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      celular: usuarios.celular,
      admin: usuarios.admin,
      emailVerificado: usuarios.emailVerificadoEm,
      celularVerificado: usuarios.celularVerificadoEm,
      contratante: contratantes.usuarioId,
      profissional: {
        slug: profissionais.slug,
        situacao: profissionais.situacao,
        cidade: profissionais.cidade,
        uf: profissionais.uf,
        valorHoraCentavos: profissionais.valorHoraCentavos,
        horasMinimas: profissionais.horasMinimas,
        veiculoIncluso: profissionais.veiculoIncluso,
        aceitaOutras: profissionais.aceitaOutras,
      },
    })
    .from(usuarios)
    .leftJoin(contratantes, eq(contratantes.usuarioId, usuarios.id))
    .leftJoin(profissionais, eq(profissionais.usuarioId, usuarios.id))
    .where(eq(usuarios.id, usuarioId));
  if (!linha) return null;
  const papeis = [
    ...(linha.contratante ? ['contratante'] : []),
    ...(linha.profissional ? ['profissional'] : []),
    ...(linha.admin ? ['admin'] : []),
  ];
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    celular: linha.celular,
    emailVerificado: !!linha.emailVerificado,
    celularVerificado: !!linha.celularVerificado,
    papeis,
    profissional: linha.profissional ? { ...linha.profissional, tarefas: await tarefasDe(db, linha.id) } : null,
  };
}

export function rotasContas(app: FastifyInstance, ctx: Contexto, limite: { max: number; timeWindow: string }) {
  const config = { rateLimit: limite };

  // conta da família
  app.post('/api/contas', { config }, async (req, reply) => {
    const dados = cadastroContratante.parse(req.body);
    const senhaHash = await gerarHashSenha(dados.senha);
    let id: string;
    try {
      id = await ctx.db.transaction(async (tx) => {
        const [u] = await tx
          .insert(usuarios)
          .values({ nome: dados.nome, email: dados.email, celular: dados.celular, senhaHash, termosAceitosEm: ctx.agora() })
          .returning({ id: usuarios.id });
        await tx.insert(contratantes).values({ usuarioId: u!.id });
        await registrarIndicacao(tx as unknown as Db, dados.codigoIndicacao, u!.id);
        if (dados.pessoaAcompanhada) {
          await tx.insert(pessoasAcompanhadas).values({ contratanteId: u!.id, ...dados.pessoaAcompanhada });
        }
        return u!.id;
      });
    } catch (err) {
      if (violouUnico(err, 'usuarios_email_unico')) throw emailEmUso();
      throw err;
    }
    await abrirSessao(ctx, req, reply, id);
    return reply.status(201).send({ usuario: await dadosDaConta(ctx.db, id) });
  });

  // conta da profissional: começa em rascunho; preço, bairros e documentos vêm depois
  app.post('/api/profissionais', { config }, async (req, reply) => {
    const dados = cadastroProfissional.parse(req.body);
    const senhaHash = await gerarHashSenha(dados.senha);
    let id: string;
    try {
      id = await ctx.db.transaction(async (tx) => {
        const [u] = await tx
          .insert(usuarios)
          .values({ nome: dados.nome, email: dados.email, celular: dados.celular, senhaHash, termosAceitosEm: ctx.agora() })
          .returning({ id: usuarios.id });
        await tx.insert(profissionais).values({
          usuarioId: u!.id,
          slug: await slugLivre(tx as unknown as Db, dados.nome),
          cidade: dados.cidade,
          uf: dados.uf,
        });
        await registrarIndicacao(tx as unknown as Db, dados.codigoIndicacao, u!.id);
        return u!.id;
      });
    } catch (err) {
      if (violouUnico(err, 'usuarios_email_unico')) throw emailEmUso();
      if (violouUnico(err, 'profissionais_slug_unique')) {
        throw new ErroApi(409, 'tente_de_novo', 'Não conseguimos criar seu endereço de portfólio. Tente de novo.');
      }
      throw err;
    }
    await abrirSessao(ctx, req, reply, id);
    return reply.status(201).send({ usuario: await dadosDaConta(ctx.db, id) });
  });

  app.post('/api/sessoes', { config }, async (req, reply) => {
    const dados = login.parse(req.body);
    const [u] = await ctx.db
      .select({ id: usuarios.id, senhaHash: usuarios.senhaHash })
      .from(usuarios)
      .where(sql`lower(${usuarios.email}) = ${dados.email}`)
      .limit(1);
    if (!(await conferirSenha(u?.senhaHash, dados.senha)) || !u) {
      throw new ErroApi(401, 'credenciais_invalidas', 'E-mail ou senha incorretos.');
    }
    await abrirSessao(ctx, req, reply, u.id);
    return reply.status(201).send({ usuario: await dadosDaConta(ctx.db, u.id) });
  });

  app.delete('/api/sessoes/atual', async (req, reply) => {
    const u = req.usuario ?? (await carregarUsuario(ctx, req));
    if (u) await encerrarSessao(ctx, reply, u.sessaoId);
    return reply.status(204).send();
  });

  app.get('/api/eu', async (req) => {
    const u = exigirUsuario(req);
    return { usuario: await dadosDaConta(ctx.db, u.id) };
  });

  // pessoas acompanhadas pela família (mãe, pai)
  app.get('/api/pessoas', async (req) => {
    const u = exigirContratante(req);
    const lista = await ctx.db
      .select({
        id: pessoasAcompanhadas.id,
        nome: pessoasAcompanhadas.nome,
        dataNascimento: pessoasAcompanhadas.dataNascimento,
        observacoes: pessoasAcompanhadas.observacoes,
      })
      .from(pessoasAcompanhadas)
      .where(eq(pessoasAcompanhadas.contratanteId, u.id))
      .orderBy(asc(pessoasAcompanhadas.criadoEm));
    return { pessoas: lista };
  });

  app.post('/api/pessoas', async (req, reply) => {
    const u = exigirContratante(req);
    const dados = pessoa.parse(req.body);
    const [p] = await ctx.db
      .insert(pessoasAcompanhadas)
      .values({ contratanteId: u.id, ...dados })
      .returning({
        id: pessoasAcompanhadas.id,
        nome: pessoasAcompanhadas.nome,
        dataNascimento: pessoasAcompanhadas.dataNascimento,
        observacoes: pessoasAcompanhadas.observacoes,
      });
    return reply.status(201).send({ pessoa: p });
  });

  app.delete('/api/pessoas/:id', async (req, reply) => {
    const u = exigirContratante(req);
    const { id } = z.object({ id: v.uuid }).parse(req.params);
    const apagadas = await ctx.db
      .delete(pessoasAcompanhadas)
      .where(and(eq(pessoasAcompanhadas.id, id), eq(pessoasAcompanhadas.contratanteId, u.id)))
      .returning({ id: pessoasAcompanhadas.id });
    if (!apagadas.length) throw new ErroApi(404, 'nao_encontrado', 'Pessoa não encontrada.');
    return reply.status(204).send();
  });
}
