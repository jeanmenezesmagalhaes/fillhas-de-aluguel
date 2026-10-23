import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { z } from 'zod';
import { exigirAdmin, exigirProfissional } from '../auth.js';
import type { Contexto } from '../contexto.js';
import type { Db } from '../db/index.js';
import { fotosPerfil, profissionais, usuarios } from '../db/schema.js';
import { conflito, ErroApi, naoEncontrado } from '../erros.js';
import * as v from '../validacao.js';
import { lerEnvio } from './verificacao.js';
import { dadosDaConta } from './contas.js';

const LADO_MAXIMO = 1200;
const idParam = z.object({ id: v.uuid });
const motivo = z.object({
  motivo: z.string({ error: 'Explique o motivo.' }).trim().min(5, 'Explique o motivo para a profissional.').max(500),
});

const urlDaFoto = (id: string) => `/api/fotos/${id}`;

// Regrava a foto: corrige a rotação, limita a 1200 px e salva em WebP. Regravar descarta
// os metadados (EXIF), inclusive a localização GPS que o celular grava na foto.
async function regravar(dados: Buffer) {
  try {
    const { data, info } = await sharp(dados, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { dados: data, largura: info.width, altura: info.height };
  } catch {
    throw new ErroApi(415, 'foto_ilegivel', 'Não conseguimos abrir esta foto. Envie em JPG ou PNG.', { arquivo: 'Envie a foto em JPG ou PNG.' });
  }
}

// A foto que aparece no portfólio: a última aprovada.
export async function fotoPublica(db: Db, profissionalId: string) {
  const [f] = await db
    .select({ id: fotosPerfil.id })
    .from(fotosPerfil)
    .where(and(eq(fotosPerfil.profissionalId, profissionalId), eq(fotosPerfil.situacao, 'aprovado')))
    .orderBy(desc(fotosPerfil.revisadoEm))
    .limit(1);
  return f ? urlDaFoto(f.id) : null;
}

// Para a própria profissional: a foto mais recente (enviada, aprovada ou recusada) e a que está no ar.
export async function fotoDaConta(db: Db, profissionalId: string) {
  // a enviada ou recusada é sempre mais nova que a aprovada (aprovar tira a anterior do ar)
  const [f] = await db
    .select({ id: fotosPerfil.id, situacao: fotosPerfil.situacao, motivoRecusa: fotosPerfil.motivoRecusa })
    .from(fotosPerfil)
    .where(and(eq(fotosPerfil.profissionalId, profissionalId), ne(fotosPerfil.situacao, 'substituido')))
    .orderBy(sql`${fotosPerfil.situacao} = 'aprovado'`, desc(fotosPerfil.enviadoEm))
    .limit(1);
  const rotulo = { enviado: 'enviada', aprovado: 'aprovada', recusado: 'recusada', substituido: 'substituida' } as const;
  return {
    foto: f ? { url: urlDaFoto(f.id), situacao: rotulo[f.situacao], motivoRecusa: f.motivoRecusa } : null,
    fotoUrl: await fotoPublica(db, profissionalId),
  };
}

export function rotasFotos(app: FastifyInstance, ctx: Contexto) {
  // foto nova: fica "enviada" até a equipe conferir; a aprovada continua no ar até lá
  app.post('/api/profissionais/eu/foto', async (req, reply) => {
    const u = exigirProfissional(req);
    const { arquivo } = await lerEnvio(req);
    if (arquivo.tipoArquivo === 'application/pdf') {
      throw new ErroApi(415, 'formato_invalido', 'Envie uma foto, em JPG ou PNG.', { arquivo: 'Envie uma foto, em JPG ou PNG.' });
    }
    const foto = await regravar(arquivo.dados);
    const chave = randomUUID();
    await ctx.armazenamento.salvar(chave, foto.dados);
    const antigas = await ctx.db.transaction(async (tx) => {
      // a enviada ou recusada anterior sai; a aprovada fica até a nova ser aprovada
      const saem = await tx
        .update(fotosPerfil)
        .set({ situacao: 'substituido' })
        .where(and(eq(fotosPerfil.profissionalId, u.id), inArray(fotosPerfil.situacao, ['enviado', 'recusado'])))
        .returning({ chave: fotosPerfil.arquivoChave });
      await tx.insert(fotosPerfil).values({
        profissionalId: u.id,
        arquivoChave: chave,
        tipoArquivo: 'image/webp',
        largura: foto.largura,
        altura: foto.altura,
        tamanho: foto.dados.length,
        enviadoEm: ctx.agora(),
      });
      return saem;
    });
    for (const a of antigas) await ctx.armazenamento.remover(a.chave);
    // como o PATCH do perfil: a conta inteira em `usuario`, e a foto também no topo
    return reply.status(201).send({ ...(await fotoDaConta(ctx.db, u.id)), usuario: await dadosDaConta(ctx.db, u.id, ctx.agora()) });
  });

  // A foto aprovada e no ar é pública (o endereço muda a cada foto, então pode ficar em
  // cache). As outras só a dona e a administração veem.
  app.get('/api/fotos/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const [f] = await ctx.db
      .select({ chave: fotosPerfil.arquivoChave, tipo: fotosPerfil.tipoArquivo, situacao: fotosPerfil.situacao, dona: fotosPerfil.profissionalId, perfil: profissionais.situacao })
      .from(fotosPerfil)
      .innerJoin(profissionais, eq(profissionais.usuarioId, fotosPerfil.profissionalId))
      .where(eq(fotosPerfil.id, id));
    if (!f || f.situacao === 'substituido') throw naoEncontrado('Foto não encontrada.');
    const publica = f.situacao === 'aprovado' && f.perfil === 'aprovado';
    if (!publica && req.usuario?.id !== f.dona && !req.usuario?.admin) throw naoEncontrado('Foto não encontrada.');
    return reply
      .header('content-type', f.tipo)
      .header('cache-control', publica ? 'public, max-age=86400' : 'private, no-store')
      .header('x-content-type-options', 'nosniff')
      .send(await ctx.armazenamento.ler(f.chave));
  });

  app.get('/api/admin/fotos', async (req) => {
    exigirAdmin(req);
    const lista = await ctx.db
      .select({ id: fotosPerfil.id, enviadoEm: fotosPerfil.enviadoEm, largura: fotosPerfil.largura, altura: fotosPerfil.altura, profissional: { id: usuarios.id, nome: usuarios.nome } })
      .from(fotosPerfil)
      .innerJoin(usuarios, eq(usuarios.id, fotosPerfil.profissionalId))
      .where(eq(fotosPerfil.situacao, 'enviado'))
      .orderBy(asc(fotosPerfil.enviadoEm));
    return { fotos: lista.map((f) => ({ ...f, url: urlDaFoto(f.id) })) };
  });

  app.post('/api/admin/fotos/:id/aprovar', async (req) => {
    const admin = exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const agora = ctx.agora();
    const antigas = await ctx.db.transaction(async (tx) => {
      const [f] = await tx
        .update(fotosPerfil)
        .set({ situacao: 'aprovado', revisadoEm: agora, revisadoPor: admin.id })
        .where(and(eq(fotosPerfil.id, id), eq(fotosPerfil.situacao, 'enviado')))
        .returning({ dona: fotosPerfil.profissionalId });
      if (!f) throw conflito('ja_revisada', 'Esta foto já foi revisada ou foi substituída.');
      // a aprovada anterior sai do ar
      return tx
        .update(fotosPerfil)
        .set({ situacao: 'substituido' })
        .where(and(eq(fotosPerfil.profissionalId, f.dona), eq(fotosPerfil.situacao, 'aprovado'), ne(fotosPerfil.id, id)))
        .returning({ chave: fotosPerfil.arquivoChave });
    });
    for (const a of antigas) await ctx.armazenamento.remover(a.chave);
    return { ok: true };
  });

  app.post('/api/admin/fotos/:id/recusar', async (req) => {
    const admin = exigirAdmin(req);
    const { id } = idParam.parse(req.params);
    const dados = motivo.parse(req.body);
    const [f] = await ctx.db
      .update(fotosPerfil)
      .set({ situacao: 'recusado', motivoRecusa: dados.motivo, revisadoEm: ctx.agora(), revisadoPor: admin.id })
      .where(and(eq(fotosPerfil.id, id), eq(fotosPerfil.situacao, 'enviado')))
      .returning({ id: fotosPerfil.id });
    if (!f) throw conflito('ja_revisada', 'Esta foto já foi revisada ou foi substituída.');
    return { ok: true };
  });
}
