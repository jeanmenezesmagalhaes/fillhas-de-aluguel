import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { and, eq, gt } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { contratantes, profissionais, sessoes, usuarios } from './db/schema.js';
import type { Contexto } from './contexto.js';
import { ErroApi } from './erros.js';
import { chaveLogin, contarTentativa, JANELA_LOGIN_MS, MAX_FALHAS_LOGIN, muitasFalhasDeLogin, zerarTentativas } from './limites.js';

export const COOKIE_SESSAO = 'mc_sessao';
const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000;

export interface UsuarioSessao {
  id: string;
  sessaoId: string;
  nome: string;
  email: string;
  admin: boolean;
  contratante: boolean;
  profissional: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    usuario: UsuarioSessao | null;
  }
}

// argon2id com os parâmetros padrão da biblioteca (19 MiB, 2 passadas), os mínimos da OWASP.
export const gerarHashSenha = (senha: string) => hash(senha);

// Sem conta para o e-mail, ainda comparamos com um hash qualquer, para que a resposta
// leve o mesmo tempo e não revele quais e-mails têm conta.
let hashFalso: Promise<string> | undefined;
export async function conferirSenha(senhaHash: string | undefined, senha: string): Promise<boolean> {
  if (!senhaHash) {
    hashFalso ??= hash(randomBytes(16).toString('hex'));
    await verify(await hashFalso, senha);
    return false;
  }
  return verify(senhaHash, senha);
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function abrirSessao(ctx: Contexto, req: FastifyRequest, reply: FastifyReply, usuarioId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(ctx.agora().getTime() + DURACAO_SESSAO_MS);
  await ctx.db.insert(sessoes).values({
    tokenHash: hashToken(token),
    usuarioId,
    expiraEm,
    ip: req.ip,
    userAgent: req.headers['user-agent']?.slice(0, 300) ?? null,
  });
  reply.setCookie(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: ctx.producao,
    path: '/',
    expires: expiraEm,
  });
}

export async function encerrarSessao(ctx: Contexto, reply: FastifyReply, sessaoId: string) {
  await ctx.db.delete(sessoes).where(eq(sessoes.id, sessaoId));
  reply.clearCookie(COOKIE_SESSAO, { path: '/' });
}

export async function carregarUsuario(ctx: Contexto, req: FastifyRequest): Promise<UsuarioSessao | null> {
  const token = req.cookies[COOKIE_SESSAO];
  if (!token) return null;
  const [linha] = await ctx.db
    .select({
      id: usuarios.id,
      sessaoId: sessoes.id,
      nome: usuarios.nome,
      email: usuarios.email,
      admin: usuarios.admin,
      contratante: contratantes.usuarioId,
      profissional: profissionais.usuarioId,
    })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .leftJoin(contratantes, eq(contratantes.usuarioId, usuarios.id))
    .leftJoin(profissionais, eq(profissionais.usuarioId, usuarios.id))
    .where(and(eq(sessoes.tokenHash, hashToken(token)), gt(sessoes.expiraEm, ctx.agora())))
    .limit(1);
  if (!linha) return null;
  return { ...linha, contratante: !!linha.contratante, profissional: !!linha.profissional };
}

const semSessao = () => new ErroApi(401, 'sem_sessao', 'Entre na sua conta para continuar.');

export function exigirUsuario(req: FastifyRequest): UsuarioSessao {
  if (!req.usuario) throw semSessao();
  return req.usuario;
}

export function exigirContratante(req: FastifyRequest): UsuarioSessao {
  const u = exigirUsuario(req);
  if (!u.contratante) throw new ErroApi(403, 'so_contratante', 'Esta ação é da conta da família.');
  return u;
}

export function exigirProfissional(req: FastifyRequest): UsuarioSessao {
  const u = exigirUsuario(req);
  if (!u.profissional) throw new ErroApi(403, 'so_profissional', 'Esta ação é da área profissional.');
  return u;
}

export function exigirAdmin(req: FastifyRequest): UsuarioSessao {
  const u = exigirUsuario(req);
  if (!u.admin) throw new ErroApi(403, 'so_admin', 'Esta ação é da administração.');
  return u;
}

// Para mudança sensível (a chave Pix do repasse): pede de novo a senha, mesmo com a sessão aberta.
// As falhas somam no mesmo contador do login, para a sessão roubada não servir para adivinhar a senha.
export async function exigirSenhaAtual(ctx: Contexto, u: UsuarioSessao, senha: string | undefined) {
  if (!senha) throw new ErroApi(422, 'senha_exigida', 'Confirme com a sua senha.', { senhaAtual: 'Confirme com a sua senha.' });
  const chave = chaveLogin(u.email);
  const { contagem } = await contarTentativa(ctx.db, chave, JANELA_LOGIN_MS, ctx.agora());
  if (contagem > MAX_FALHAS_LOGIN) throw muitasFalhasDeLogin();
  const [linha] = await ctx.db.select({ senhaHash: usuarios.senhaHash }).from(usuarios).where(eq(usuarios.id, u.id));
  if (!(await conferirSenha(linha?.senhaHash, senha))) {
    throw new ErroApi(422, 'senha_incorreta', 'Senha incorreta.', { senhaAtual: 'Senha incorreta.' });
  }
  await zerarTentativas(ctx.db, chave);
}
