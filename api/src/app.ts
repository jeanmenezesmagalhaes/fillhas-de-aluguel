import { fileURLToPath } from 'node:url';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { armazenamentoEmMemoria, type Armazenamento } from './armazenamento.js';
import { carregarUsuario } from './auth.js';
import type { Contexto } from './contexto.js';
import type { Db } from './db/index.js';
import { ErroApi, registrarTratamentoDeErros } from './erros.js';
import { mensageiroIndisponivel, mensageiroNoLog, type Mensageiro } from './mensagens.js';
import { rotasAdmin } from './rotas/admin.js';
import { rotasAgenda } from './rotas/agenda.js';
import { rotasContas } from './rotas/contas.js';
import { rotasIndicacoes } from './rotas/indicacoes.js';
import { rotasProfissionais } from './rotas/profissionais.js';
import { rotasQualificacoes } from './rotas/qualificacoes.js';
import { rotasServicos } from './rotas/servicos.js';
import { rotasVerificacao, TAMANHO_MAXIMO_ARQUIVO } from './rotas/verificacao.js';

export interface OpcoesApp {
  db: Db;
  agora?: () => Date;
  producao?: boolean;
  logger?: FastifyServerOptions['logger'];
  // tentativas de login e cadastro por IP a cada minuto
  limiteTentativas?: number;
  // pasta das telas estáticas; false para servir só a API
  site?: string | false;
  // envio de e-mail e WhatsApp; sem provedor, só registra no log (fora de produção)
  mensageiro?: Mensageiro;
  // onde guardar os documentos; sem informar, fica na memória (só para testes)
  armazenamento?: Armazenamento;
  // segredo dos links de agenda; sem ele, fora de produção usa um fixo de desenvolvimento
  segredoAgenda?: string | null;
}

const raizDoSite = fileURLToPath(new URL('../../', import.meta.url));

// Só as telas e seus arquivos. Nada de api/, docs/, .git ou do banco local.
const arquivoDoSite = /^\/(?:[\w-]+\.(?:html|css|js|svg)|(?:assets|fonts)\/[\w.-]+\.(?:webp|jpg|png|svg|woff2|json))?$/;

export async function criarApp(op: OpcoesApp) {
  const producao = op.producao ?? false;
  const app = Fastify({ logger: op.logger ?? false, trustProxy: producao, bodyLimit: 64 * 1024 });
  const ctx: Contexto = {
    db: op.db,
    agora: op.agora ?? (() => new Date()),
    producao,
    mensageiro: op.mensageiro ?? (producao ? mensageiroIndisponivel : mensageiroNoLog(app.log)),
    armazenamento: op.armazenamento ?? armazenamentoEmMemoria(),
  };

  registrarTratamentoDeErros(app);
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  await app.register(multipart, { limits: { fileSize: TAMANHO_MAXIMO_ARQUIVO, files: 1, fields: 8 } });

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
  rotasVerificacao(app, ctx, limite);
  rotasIndicacoes(app, ctx, limite);
  rotasAdmin(app, ctx);
  rotasQualificacoes(app, ctx);
  rotasAgenda(app, ctx, op.segredoAgenda !== undefined ? op.segredoAgenda : producao ? null : 'segredo-de-desenvolvimento-da-agenda');

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
