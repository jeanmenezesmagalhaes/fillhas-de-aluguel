import { randomUUID } from 'node:crypto';
import { and, asc, count, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exigirAdmin, exigirProfissional } from '../auth.js';
import type { Contexto } from '../contexto.js';
import type { Db } from '../db/index.js';
import { qualificacoes, usuarios } from '../db/schema.js';
import { conflito, ErroApi, naoEncontrado } from '../erros.js';
import * as v from '../validacao.js';
import { enviarArquivo, lerEnvio } from './verificacao.js';

const MAX_QUALIFICACOES = 30;

// os números chegam como texto no formulário; vazio vale como não informado
const numeroOpcional = (min: number, max: number, msg: string) =>
  z.preprocess((x) => (x === '' || x == null ? undefined : Number(x)), z.number({ error: msg }).int(msg).min(min, msg).max(max, msg).optional());

const curso = z.object({
  titulo: z.string({ error: 'Informe o nome do curso.' }).trim().min(3, 'Informe o nome do curso.').max(160),
  instituicao: z.string({ error: 'Informe onde você fez o curso.' }).trim().min(2, 'Informe onde você fez o curso.').max(160),
  cargaHorariaHoras: numeroOpcional(1, 5000, 'Informe a carga horária em horas.'),
  anoConclusao: numeroOpcional(1950, new Date().getFullYear(), 'Informe o ano em que terminou.'),
});

const idParam = z.object({ id: v.uuid });
const motivo = z.object({
  motivo: z.string({ error: 'Explique o motivo.' }).trim().min(5, 'Explique o motivo para a profissional.').max(500),
});

const colunas = {
  id: qualificacoes.id,
  titulo: qualificacoes.titulo,
  instituicao: qualificacoes.instituicao,
  cargaHorariaHoras: qualificacoes.cargaHorariaHoras,
  anoConclusao: qualificacoes.anoConclusao,
  situacao: qualificacoes.situacao,
  motivoRecusa: qualificacoes.motivoRecusa,
  enviadoEm: qualificacoes.enviadoEm,
  revisadoEm: qualificacoes.revisadoEm,
  arquivo: { nome: qualificacoes.nomeOriginal, tipoArquivo: qualificacoes.tipoArquivo, tamanho: qualificacoes.tamanho },
};

// o que aparece no portfólio: nome, instituição, carga, ano e a data da validação
export async function qualificacoesPublicas(db: Db, profissionalId: string) {
  return db
    .select({
      titulo: qualificacoes.titulo,
      instituicao: qualificacoes.instituicao,
      cargaHorariaHoras: qualificacoes.cargaHorariaHoras,
      anoConclusao: qualificacoes.anoConclusao,
      verificadoEm: qualificacoes.revisadoEm,
    })
    .from(qualificacoes)
    .where(and(eq(qualificacoes.profissionalId, profissionalId), eq(qualificacoes.situacao, 'aprovado')))
    .orderBy(desc(qualificacoes.anoConclusao), asc(qualificacoes.titulo));
}

export function rotasQualificacoes(app: FastifyInstance, ctx: Contexto) {
  app.get('/api/profissionais/eu/qualificacoes', async (req) => {
    const u = exigirProfissional(req);
    const lista = await ctx.db.select(colunas).from(qualificacoes).where(eq(qualificacoes.profissionalId, u.id)).orderBy(desc(qualificacoes.enviadoEm));
    return { qualificacoes: lista };
  });

  // curso ou treinamento com o comprovante (multipart: titulo, instituicao, cargaHorariaHoras,
  // anoConclusao e arquivo). Pode ser enviado em qualquer fase do cadastro.
  app.post('/api/profissionais/eu/qualificacoes', async (req, reply) => {
    const u = exigirProfissional(req);
    const { campos, arquivo } = await lerEnvio(req);
    const dados = curso.parse(campos);
    const [total] = await ctx.db.select({ n: count() }).from(qualificacoes).where(eq(qualificacoes.profissionalId, u.id));
    if ((total?.n ?? 0) >= MAX_QUALIFICACOES) throw new ErroApi(422, 'limite_qualificacoes', `Você pode cadastrar até ${MAX_QUALIFICACOES} cursos.`);
    const chave = randomUUID();
    await ctx.armazenamento.salvar(chave, arquivo.dados);
    const [q] = await ctx.db
      .insert(qualificacoes)
      .values({
        profissionalId: u.id,
        ...dados,
        arquivoChave: chave,
        nomeOriginal: arquivo.nome,
        tipoArquivo: arquivo.tipoArquivo,
        tamanho: arquivo.tamanho,
        sha256: arquivo.sha256,
        enviadoEm: ctx.agora(),
      })
      .returning({ id: qualificacoes.id });
    const [completa] = await ctx.db.select(colunas).from(qualificacoes).where(eq(qualificacoes.id, q!.id));
    return reply.status(201).send({ qualificacao: completa });
  });

  app.get('/api/profissionais/eu/qualificacoes/:id/arquivo', async (req, reply) => {
    const u = exigirProfissional(req);
    const { id } = idParam.parse(req.params);
    const [q] = await ctx.db
      .select({ chave: qualificacoes.arquivoChave, tipoArquivo: qualificacoes.tipoArquivo, nome: qualificacoes.nomeOriginal })
      .from(qualificacoes)
      .where(and(eq(qualificacoes.id, id), eq(qualificacoes.profissionalId, u.id)));
    if (!q) throw naoEncontrado('Curso não encontrado.');
    return enviarArquivo(ctx, reply, q);
  });

  // ela pode tirar um curso do perfil; o comprovante é apagado junto
  app.delete('/api/profissionais/eu/qualificacoes/:id', async (req, reply) => {
    const u = exigirProfissional(req);
    const { id } = idParam.parse(req.params);
    const [q] = await ctx.db
      .delete(qualificacoes)
      .where(and(eq(qualificacoes.id, id), eq(qualificacoes.profissionalId, u.id)))
      .returning({ chave: qualificacoes.arquivoChave });
    if (!q) throw naoEncontrado('Curso não encontrado.');
    await ctx.armazenamento.remover(q.chave);
    return reply.status(204).send();
  });

  // administração: cursos esperando validação, do mais antigo ao mais novo
  app.get('/api/admin/qualificacoes', async (req) => {
    exigirAdmin(req);
    const lista = await ctx.db
      .select({ ...colunas, profissional: { id: usuarios.id, nome: usuarios.nome } })
      .from(qualificacoes)
      .innerJoin(usuarios, eq(usuarios.id, qualificacoes.profissionalId))
      .where(eq(qualificacoes.situacao, 'enviado'))
      .orderBy(asc(qualificacoes.enviadoEm));
    return { qualificacoes: lista };
  });

  app.get('/api/admin/qualificacoes/:id/arquivo', async (req, reply) => {
    exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const [q] = await ctx.db
      .select({ chave: qualificacoes.arquivoChave, tipoArquivo: qualificacoes.tipoArquivo, nome: qualificacoes.nomeOriginal })
      .from(qualificacoes)
      .where(eq(qualificacoes.id, id));
    if (!q) throw naoEncontrado('Curso não encontrado.');
    return enviarArquivo(ctx, reply, q);
  });

  const revisar = (rota: 'aprovar' | 'recusar') =>
    app.post(`/api/admin/qualificacoes/:id/${rota}`, async (req) => {
      const admin = exigirAdmin(req);
      const { id } = idParam.parse(req.params);
      const dados = rota === 'recusar' ? motivo.parse(req.body) : null;
      const [q] = await ctx.db
        .update(qualificacoes)
        .set({ situacao: rota === 'aprovar' ? 'aprovado' : 'recusado', motivoRecusa: dados?.motivo ?? null, revisadoEm: ctx.agora(), revisadoPor: admin.id })
        .where(and(eq(qualificacoes.id, id), eq(qualificacoes.situacao, 'enviado')))
        .returning({ id: qualificacoes.id, situacao: qualificacoes.situacao, motivoRecusa: qualificacoes.motivoRecusa });
      if (!q) throw conflito('ja_revisado', 'Este curso já foi revisado.');
      return { qualificacao: q };
    });
  revisar('aprovar');
  revisar('recusar');
}
