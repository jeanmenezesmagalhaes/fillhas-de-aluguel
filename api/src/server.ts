import { criarApp } from './app.js';
import { abrirBanco } from './db/index.js';

const producao = process.env.NODE_ENV === 'production';
const banco = await abrirBanco();
const app = await criarApp({ db: banco.db, producao, logger: { level: producao ? 'info' : 'debug' } });

const fechar = async () => {
  await app.close();
  await banco.fechar();
  process.exit(0);
};
process.on('SIGINT', fechar);
process.on('SIGTERM', fechar);

await app.listen({ port: Number(process.env.PORT ?? 4173), host: process.env.HOST ?? '127.0.0.1' });
