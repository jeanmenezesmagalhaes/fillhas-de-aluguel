import { criarApp } from './app.js';
import { armazenamentoEmDisco } from './armazenamento.js';
import { abrirBanco } from './db/index.js';

const producao = process.env.NODE_ENV === 'production';
const banco = await abrirBanco();
// em produção, trocar pelo bucket privado (S3 ou R2) antes de abrir para o público
const armazenamento = armazenamentoEmDisco(process.env.PASTA_ARQUIVOS ?? './.data/arquivos');
const app = await criarApp({
  db: banco.db,
  producao,
  armazenamento,
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

const fechar = async () => {
  await app.close();
  await banco.fechar();
  process.exit(0);
};
process.on('SIGINT', fechar);
process.on('SIGTERM', fechar);

await app.listen({ port: Number(process.env.PORT ?? 4175), host: process.env.HOST ?? '127.0.0.1' });
