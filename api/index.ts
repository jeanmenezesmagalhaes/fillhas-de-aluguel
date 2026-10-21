// Entrada da API na Vercel (Root Directory = api). A Vercel usa o primeiro arquivo entre
// app, index, server, src/app, src/index e src/server que importe 'fastify'; sem este
// arquivo ela pegaria src/app.ts, que só monta o app. Por isso o import de tipo abaixo.
// Ela também não espera o listen(): recebe um handler (req, res) e repassa ao Fastify.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FastifyInstance } from 'fastify';
import { iniciarApi } from './src/iniciar.js';

const { app }: { app: FastifyInstance } = await iniciarApi();
await app.ready();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app.server.emit('request', req, res);
}
