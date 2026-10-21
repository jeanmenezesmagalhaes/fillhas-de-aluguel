import { fileURLToPath } from 'node:url';
import { criarApp } from './app.js';
import { armazenamentoEmDisco } from './armazenamento.js';
import { abrirBanco } from './db/index.js';

// Monta a API a partir do ambiente. Quem sobe é src/server.ts (local) ou index.ts (Vercel).
export async function iniciarApi() {
  const producao = process.env.NODE_ENV === 'production';
  // Na Vercel o disco é só leitura e some a cada instância: o PGlite não serve, as
  // migrations rodam no build e as telas vêm de public/ (montada no build).
  const naVercel = Boolean(process.env.VERCEL);
  if (naVercel && !process.env.DATABASE_URL?.match(/^postgres(ql)?:\/\//)) {
    throw new Error('DATABASE_URL não definida: na Vercel a API precisa de um Postgres (postgres://…).');
  }
  const banco = await abrirBanco(undefined, { migrar: !naVercel });
  // em produção, trocar pelo bucket privado (S3 ou R2) antes de abrir para o público
  const armazenamento = armazenamentoEmDisco(process.env.PASTA_ARQUIVOS ?? './.data/arquivos');
  const app = await criarApp({
    db: banco.db,
    producao,
    armazenamento,
    site: naVercel ? fileURLToPath(new URL('../public/', import.meta.url)) : undefined,
    // sem SEGREDO_AGENDA em produção, a assinatura da agenda responde 503
    segredoAgenda: process.env.SEGREDO_AGENDA ?? (producao ? null : undefined),
    logger: {
      level: producao ? 'info' : 'debug',
      // o link da agenda é a própria chave de acesso: não vai para o log
      serializers: {
        req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url.replace(/\/api\/agenda\/[^/?]+\.ics/, '/api/agenda/***.ics') }),
      },
    },
  });
  return { app, banco };
}
