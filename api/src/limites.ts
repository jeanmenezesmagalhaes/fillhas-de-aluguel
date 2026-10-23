import { eq, lt, sql } from 'drizzle-orm';
import type { FastifyRateLimitStore, FastifyRateLimitStoreCtor } from '@fastify/rate-limit';
import type { Db } from './db/index.js';
import { tentativas } from './db/schema.js';
import { ErroApi } from './erros.js';

// Login: falhas por e-mail (exista ou não a conta), somadas em todos os IPs.
export const MAX_FALHAS_LOGIN = 10;
export const JANELA_LOGIN_MS = 15 * 60 * 1000;
export const chaveLogin = (email: string) => `login:${email.toLowerCase()}`;
export const muitasFalhasDeLogin = () =>
  new ErroApi(429, 'muitas_tentativas', 'Muitas tentativas de entrar com este e-mail. Espere 15 minutos e tente de novo.');

// Soma uma tentativa na chave numa só instrução (duas instâncias ao mesmo tempo não perdem
// contagem). Janela vencida recomeça do 1.
export async function contarTentativa(db: Db, chave: string, janelaMs: number, agora: Date) {
  const fim = new Date(agora.getTime() + janelaMs);
  const [linha] = await db
    .insert(tentativas)
    .values({ chave, contagem: 1, expiraEm: fim })
    .onConflictDoUpdate({
      target: tentativas.chave,
      set: {
        contagem: sql`case when ${tentativas.expiraEm} <= ${agora}::timestamptz then 1 else ${tentativas.contagem} + 1 end`,
        expiraEm: sql`case when ${tentativas.expiraEm} <= ${agora}::timestamptz then ${fim}::timestamptz else ${tentativas.expiraEm} end`,
      },
    })
    .returning({ contagem: tentativas.contagem, expiraEm: tentativas.expiraEm });
  // de vez em quando, limpa o que já venceu há mais de um dia
  if (Math.random() < 0.01) await db.delete(tentativas).where(lt(tentativas.expiraEm, new Date(agora.getTime() - 86_400_000)));
  return linha!;
}

export async function zerarTentativas(db: Db, chave: string) {
  await db.delete(tentativas).where(eq(tentativas.chave, chave));
}

// Loja do @fastify/rate-limit no banco. Cada rota com limite próprio ganha um prefixo, para
// que o login e o cadastro não dividam o mesmo contador.
export function lojaNoBanco(db: Db, agora: () => Date): FastifyRateLimitStoreCtor {
  const loja = (prefixo: string): FastifyRateLimitStore => ({
    incr(chave, cb, janelaMs) {
      const momento = agora();
      contarTentativa(db, `${prefixo}${chave}`, janelaMs, momento).then(
        (l) => cb(null, { current: l.contagem, ttl: Math.max(0, l.expiraEm.getTime() - momento.getTime()) }),
        (err: Error) => cb(err),
      );
    },
    child(opcoes) {
      const rota = (opcoes as { routeInfo?: { method?: string | string[]; url?: string } }).routeInfo;
      return loja(rota?.url ? `ip:${String(rota.method)}:${rota.url}:` : 'ip:');
    },
  });
  return class {
    constructor() {
      return loja('ip:');
    }
  } as unknown as FastifyRateLimitStoreCtor;
}
