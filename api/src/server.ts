import { criarApp } from './app.js';
import { armazenamentoEmDisco } from './armazenamento.js';
import { abrirBanco } from './db/index.js';

const producao = process.env.NODE_ENV === 'production';
const banco = await abrirBanco();
// em produção, trocar pelo bucket privado (S3 ou R2) antes de abrir para o público
const armazenamento = armazenamentoEmDisco(process.env.PASTA_ARQUIVOS ?? './.data/arquivos');
const app = await criarApp({ db: banco.db, producao, armazenamento, logger: { level: producao ? 'info' : 'debug' } });

const fechar = async () => {
  await app.close();
  await banco.fechar();
  process.exit(0);
};
process.on('SIGINT', fechar);
process.on('SIGTERM', fechar);

await app.listen({ port: Number(process.env.PORT ?? 4173), host: process.env.HOST ?? '127.0.0.1' });
