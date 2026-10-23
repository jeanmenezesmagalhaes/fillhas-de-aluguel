import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exigirAdmin } from '../auth.js';
import type { Contexto } from '../contexto.js';
import { documentos, indicacoes, profissionais, qualificacoes, usuarios } from '../db/schema.js';
import { conflito, ErroApi, naoEncontrado } from '../erros.js';
import { maisMeses } from '../financeiro.js';
import * as v from '../validacao.js';
import { documentosAtuais, documentosExigidos, enviarArquivo, ROTULO_DOCUMENTO } from './verificacao.js';

const idParam = z.object({ id: v.uuid });
const motivo = z.object({
  motivo: z.string({ error: 'Explique o motivo.' }).trim().min(5, 'Explique o motivo para a profissional.').max(500),
});

const indicador = alias(usuarios, 'indicador');

// "2026-10-20" mais um mês, para a próxima revisão mensal dos documentos
function maisUmMes(d: Date): string {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
  return r.toISOString().slice(0, 10);
}

export function rotasAdmin(app: FastifyInstance, ctx: Contexto) {
  // lista de espera: quem veio por convite com prioridade na frente; depois, quem enviou primeiro
  app.get('/api/admin/fila', async (req) => {
    exigirAdmin(req);
    const linhas = await ctx.db
      .select({
        id: profissionais.usuarioId,
        nome: usuarios.nome,
        cidade: profissionais.cidade,
        uf: profissionais.uf,
        enviadoEm: profissionais.enviadoAnaliseEm,
        indicadoPor: indicador.nome,
        prioridade: profissionais.prioridadeFila,
      })
      .from(profissionais)
      .innerJoin(usuarios, eq(usuarios.id, profissionais.usuarioId))
      .leftJoin(indicacoes, eq(indicacoes.indicadoId, profissionais.usuarioId))
      .leftJoin(indicador, eq(indicador.id, indicacoes.indicadorId))
      .where(eq(profissionais.situacao, 'em_analise'))
      .orderBy(desc(profissionais.prioridadeFila), asc(profissionais.enviadoAnaliseEm));
    return { fila: linhas.map((l, i) => ({ ...l, posicao: i + 1 })) };
  });

  // ficha completa para a análise, com CPF, CNPJ e endereço sem máscara
  app.get('/api/admin/profissionais/:id', async (req) => {
    exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const [l] = await ctx.db
      .select({ u: { nome: usuarios.nome, email: usuarios.email, celular: usuarios.celular, emailVerificadoEm: usuarios.emailVerificadoEm, celularVerificadoEm: usuarios.celularVerificadoEm, criadoEm: usuarios.criadoEm }, p: profissionais })
      .from(profissionais)
      .innerJoin(usuarios, eq(usuarios.id, profissionais.usuarioId))
      .where(eq(profissionais.usuarioId, id));
    if (!l) throw naoEncontrado('Profissional não encontrada.');
    const historico = await ctx.db
      .select({
        id: documentos.id,
        tipo: documentos.tipo,
        nomeOriginal: documentos.nomeOriginal,
        tipoArquivo: documentos.tipoArquivo,
        tamanho: documentos.tamanho,
        sha256: documentos.sha256,
        situacao: documentos.situacao,
        motivoRecusa: documentos.motivoRecusa,
        enviadoEm: documentos.enviadoEm,
        revisadoEm: documentos.revisadoEm,
      })
      .from(documentos)
      .where(eq(documentos.profissionalId, id))
      .orderBy(asc(documentos.enviadoEm));
    const [ind] = await ctx.db
      .select({ nome: indicador.nome, codigo: indicacoes.codigo })
      .from(indicacoes)
      .innerJoin(indicador, eq(indicador.id, indicacoes.indicadorId))
      .where(eq(indicacoes.indicadoId, id));
    const cursos = await ctx.db
      .select({
        id: qualificacoes.id,
        titulo: qualificacoes.titulo,
        instituicao: qualificacoes.instituicao,
        cargaHorariaHoras: qualificacoes.cargaHorariaHoras,
        anoConclusao: qualificacoes.anoConclusao,
        situacao: qualificacoes.situacao,
        motivoRecusa: qualificacoes.motivoRecusa,
        enviadoEm: qualificacoes.enviadoEm,
      })
      .from(qualificacoes)
      .where(eq(qualificacoes.profissionalId, id))
      .orderBy(asc(qualificacoes.enviadoEm));
    const { p, u } = l;
    return {
      profissional: {
        id,
        ...u,
        slug: p.slug,
        situacao: p.situacao,
        cidadeAtendimento: `${p.cidade}/${p.uf}`,
        cpf: p.cpf,
        cnpj: p.cnpj,
        razaoSocial: p.razaoSocial,
        endereco: { cep: p.cep, logradouro: p.logradouro, numero: p.numero, complemento: p.complemento, bairro: p.bairro, cidade: p.enderecoCidade, uf: p.enderecoUf },
        enviadoAnaliseEm: p.enviadoAnaliseEm,
        motivoCorrecao: p.motivoCorrecao,
        indicadoPor: ind ?? null,
        veiculoIncluso: p.veiculoIncluso,
        documentosExigidos: documentosExigidos(!!p.cnpj, p.veiculoIncluso).map((tipo) => ({ tipo, rotulo: ROTULO_DOCUMENTO[tipo] })),
        documentos: historico,
        qualificacoes: cursos,
      },
    };
  });

  // documentos esperando análise. Os de quem está na fila também aparecem na ficha; os
  // `avulso` são de quem já está fora da fila (por exemplo, a CNH de uma aprovada que
  // quer passar a oferecer veículo) e só aparecem aqui.
  app.get('/api/admin/documentos', async (req) => {
    exigirAdmin(req);
    const linhas = await ctx.db
      .select({
        id: documentos.id,
        tipo: documentos.tipo,
        nomeOriginal: documentos.nomeOriginal,
        tipoArquivo: documentos.tipoArquivo,
        tamanho: documentos.tamanho,
        enviadoEm: documentos.enviadoEm,
        profissional: { id: profissionais.usuarioId, nome: usuarios.nome, situacao: profissionais.situacao, veiculoIncluso: profissionais.veiculoIncluso },
      })
      .from(documentos)
      .innerJoin(profissionais, eq(profissionais.usuarioId, documentos.profissionalId))
      .innerJoin(usuarios, eq(usuarios.id, documentos.profissionalId))
      .where(eq(documentos.situacao, 'enviado'))
      .orderBy(asc(documentos.enviadoEm));
    return {
      documentos: linhas.map((d) => ({ ...d, rotulo: ROTULO_DOCUMENTO[d.tipo], avulso: d.profissional.situacao !== 'em_analise' })),
    };
  });

  app.get('/api/admin/documentos/:id/arquivo', async (req, reply) => {
    exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const [d] = await ctx.db
      .select({ chave: documentos.arquivoChave, tipoArquivo: documentos.tipoArquivo, nome: documentos.nomeOriginal })
      .from(documentos)
      .where(eq(documentos.id, id));
    if (!d) throw naoEncontrado('Documento não encontrado.');
    return enviarArquivo(ctx, reply, d);
  });

  const revisarDocumento = (rota: 'aprovar' | 'recusar') =>
    app.post(`/api/admin/documentos/:id/${rota}`, async (req) => {
      const admin = exigirAdmin(req);
      const { id } = idParam.parse(req.params);
      const dados = rota === 'recusar' ? motivo.parse(req.body) : null;
      const agora = ctx.agora();
      const [d] = await ctx.db
        .update(documentos)
        .set({ situacao: rota === 'aprovar' ? 'aprovado' : 'recusado', motivoRecusa: dados?.motivo ?? null, revisadoEm: agora, revisadoPor: admin.id })
        .where(and(eq(documentos.id, id), eq(documentos.situacao, 'enviado')))
        .returning({ id: documentos.id, tipo: documentos.tipo, situacao: documentos.situacao, motivoRecusa: documentos.motivoRecusa });
      if (!d) throw conflito('documento_ja_revisado', 'Este documento já foi revisado ou foi substituído.');
      return { documento: d };
    });
  revisarDocumento('aprovar');
  revisarDocumento('recusar');

  // aprova o perfil: só com todos os documentos exigidos aprovados
  app.post('/api/admin/profissionais/:id/aprovar', async (req) => {
    const admin = exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const [p] = await ctx.db
      .select({ situacao: profissionais.situacao, cnpj: profissionais.cnpj, veiculo: profissionais.veiculoIncluso, taxaEspecialMeses: profissionais.taxaEspecialMeses, taxaEspecialAte: profissionais.taxaEspecialAte })
      .from(profissionais)
      .where(eq(profissionais.usuarioId, id));
    if (!p) throw naoEncontrado('Profissional não encontrada.');
    if (p.situacao !== 'em_analise') throw conflito('fora_da_fila', 'Este perfil não está na lista de espera.');
    const atuais = await documentosAtuais(ctx.db, id);
    const pendentes = documentosExigidos(!!p.cnpj, p.veiculo).filter((t) => atuais.get(t)?.situacao !== 'aprovado');
    if (pendentes.length) {
      throw new ErroApi(422, 'documentos_pendentes', `Aprove antes: ${pendentes.map((t) => ROTULO_DOCUMENTO[t]).join(', ')}.`);
    }
    const agora = ctx.agora();
    await ctx.db.transaction(async (tx) => {
      await tx
        .update(profissionais)
        .set({
          situacao: 'aprovado',
          aprovadoEm: agora,
          aprovadoPor: admin.id,
          revisadoEm: agora.toISOString().slice(0, 10),
          proximaRevisao: maisUmMes(agora),
          // o prazo da taxa especial do convite começa a contar na primeira aprovação
          ...(p.taxaEspecialMeses && !p.taxaEspecialAte ? { taxaEspecialAte: maisMeses(agora, p.taxaEspecialMeses) } : {}),
          atualizadoEm: agora,
        })
        .where(eq(profissionais.usuarioId, id));
      // etapa da indicação, para o bônus de quem indicou
      await tx.update(indicacoes).set({ aprovadoEm: agora }).where(and(eq(indicacoes.indicadoId, id), isNull(indicacoes.aprovadoEm)));
    });
    return { ok: true };
  });

  // devolve o cadastro para a profissional corrigir, com o motivo
  app.post('/api/admin/profissionais/:id/correcao', async (req) => {
    exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const dados = motivo.parse(req.body);
    const agora = ctx.agora();
    const r = await ctx.db
      .update(profissionais)
      .set({ situacao: 'correcao', motivoCorrecao: dados.motivo, atualizadoEm: agora })
      .where(and(eq(profissionais.usuarioId, id), inArray(profissionais.situacao, ['em_analise', 'aprovado', 'vencido'])))
      .returning({ id: profissionais.usuarioId });
    if (!r.length) throw conflito('fora_da_fila', 'Este perfil não está em análise.');
    return { ok: true };
  });
}
