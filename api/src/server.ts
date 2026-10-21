import { iniciarApi } from './iniciar.js';

const { app, banco } = await iniciarApi();

const fechar = async () => {
  await app.close();
  await banco.fechar();
  process.exit(0);
};
process.on('SIGINT', fechar);
process.on('SIGTERM', fechar);

await app.listen({ port: Number(process.env.PORT ?? 4175), host: process.env.HOST ?? '127.0.0.1' });
