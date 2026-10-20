import { fileURLToPath } from 'node:url';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { carregarUsuario } from './auth.js';
import type { Contexto } from './contexto.js';
import type { Db } from './db/index.js';
import { ErroApi, registrarTratamentoDeErros } from './erros.js';
import { rotasContas } from './rotas/contas.js';
import { rotasProfissionais } from './rotas/profissionais.js';
import { rotasServicos } from './rotas/servicos.js';

export interface OpcoesApp {
  db: Db;
  agora?: () => Date;
  producao?: boolean;
  logger?: FastifyServerOptions['logger'];
  // tentativas de login e cadastro por IP a cada minuto
  limiteTentativas?: number;
  // pasta das telas estáticas; false para servir só a API
  site?: string | false;
}

const raizDoSite = fileURLToPath(new URL('../../', import.meta.url));

// Só as telas e seus arquivos. Nada de api/, docs/, .git ou do banco local.
const arquivoDoSite = /^\/(?:[\w-]+\.(?:html|css|js|svg)|(?:assets|fonts)\/[\w.-]+\.(?:webp|jpg|png|svg|woff2|json))?$/;

export async function criarApp(op: OpcoesApp) {
  const ctx: Contexto = { db: op.db, agora: op.agora ?? (() => new Date()), producao: op.producao ?? false };
  const app = Fastify({ logger: op.logger ?? false, trustProxy: ctx.producao, bodyLimit: 64 * 1024 });

  registrarTratamentoDeErros(app);
  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  app.decorateRequest('usuario', null);
  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/api/')) return;
    // Pedidos que mudam algo só valem vindos deste mesmo site. O cookie já é SameSite=Lax;
    // isto fecha o que sobra de CSRF.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origem = req.headers.origin;
      if (origem && URL.parse(origem)?.host !== req.headers.host) {
        throw new ErroApi(403, 'origem_invalida', 'Pedido de outra origem recusado.');
      }
    }
    req.usuario = await carregarUsuario(ctx, req);
  });

  const limite = { max: op.limiteTentativas ?? 10, timeWindow: '1 minute' };
  rotasContas(app, ctx, limite);
  rotasProfissionais(app, ctx);
  rotasServicos(app, ctx);

  app.get('/api/saude', async () => ({ ok: true }));

  const site = op.site === undefined ? raizDoSite : op.site;
  if (site) {
    await app.register(fastifyStatic, {
      root: site,
      index: 'index.html',
      dotfiles: 'deny',
      allowedPath: (caminho) => arquivoDoSite.test(caminho),
    });
  }

  return app;
}
