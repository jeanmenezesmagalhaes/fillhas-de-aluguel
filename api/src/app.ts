import { fileURLToPath } from 'node:url';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { armazenamentoEmMemoria, type Armazenamento } from './armazenamento.js';
import { carregarUsuario } from './auth.js';
import { ipDoVisitante } from './cloudflare.js';
import type { Contexto } from './contexto.js';
import type { Db } from './db/index.js';
import { ErroApi, registrarTratamentoDeErros } from './erros.js';
import { lojaNoBanco } from './limites.js';
import { mensageiroIndisponivel, mensageiroNoLog, type Mensageiro } from './mensagens.js';
import { gatewayIndisponivel, gatewaySimulado, type GatewayPagamento } from './pagamentos.js';
import { rotasAdmin } from './rotas/admin.js';
import { rotasAgenda } from './rotas/agenda.js';
import { rotasBloqueios } from './rotas/bloqueios.js';
import { rotasBusca } from './rotas/busca.js';
import { rotasFotos } from './rotas/fotos.js';
import { rotasGanhos } from './rotas/ganhos.js';
import { rotasPagamentos } from './rotas/pagamentos.js';
import { rotasPainel } from './rotas/painel.js';
import { rotasContas } from './rotas/contas.js';
import { rotasConvites } from './rotas/convites.js';
import { rotasIndicacoes } from './rotas/indicacoes.js';
import { rotasProfissionais } from './rotas/profissionais.js';
import { rotasQualificacoes } from './rotas/qualificacoes.js';
import { rotasServicos } from './rotas/servicos.js';
import { rotasVerificacao, TAMANHO_MAXIMO_ARQUIVO } from './rotas/verificacao.js';
import { rotasTelas } from './telas.js';

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
  // exige o código do WhatsApp para a lista de espera; sem informar, só o e-mail é exigido
  verificarWhatsapp?: boolean;
  // onde guardar os documentos; sem informar, fica na memória (só para testes)
  armazenamento?: Armazenamento;
  // segredo dos links de agenda; sem ele, fora de produção usa um fixo de desenvolvimento
  segredoAgenda?: string | null;
  // gateway de pagamento; sem informar, fora de produção usa o simulado (tela de pagamento da própria API)
  pagamentos?: GatewayPagamento;
  // segredo que o AbacatePay manda na URL do webhook (?webhookSecret=); sem ele, o webhook responde 503
  segredoWebhook?: string | null;
  // endereço público do site, para a volta do checkout; sem ele, usa o endereço do pedido
  siteUrl?: string;
}

const raizDoSite = fileURLToPath(new URL('../../', import.meta.url));

export async function criarApp(op: OpcoesApp) {
  const producao = op.producao ?? false;
  const app = Fastify({ logger: op.logger ?? false, trustProxy: producao, bodyLimit: 64 * 1024 });
  const ctx: Contexto = {
    db: op.db,
    agora: op.agora ?? (() => new Date()),
    producao,
    mensageiro: op.mensageiro ?? (producao ? mensageiroIndisponivel : mensageiroNoLog(app.log)),
    verificarWhatsapp: op.verificarWhatsapp ?? false,
    armazenamento: op.armazenamento ?? armazenamentoEmMemoria(),
    pagamentos: op.pagamentos ?? (producao ? gatewayIndisponivel : gatewaySimulado()),
  };

  registrarTratamentoDeErros(app);
  await app.register(cookie);
  // o contador fica no banco: na Vercel cada instância tem a própria memória
  await app.register(rateLimit, { global: false, store: lojaNoBanco(ctx.db, ctx.agora) });
  await app.register(multipart, { limits: { fileSize: TAMANHO_MAXIMO_ARQUIVO, files: 1, fields: 8 } });

  app.decorateRequest('usuario', null);
  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/api/')) return;
    // req.ip lê o x-forwarded-for a cada acesso: trocado aqui, o limite de tentativas e as
    // sessões passam a ver o visitante, e não o Cloudflare
    const visitante = ipDoVisitante(req.ip, req.headers['cf-connecting-ip']);
    if (visitante) req.raw.headers['x-forwarded-for'] = visitante;
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
  // nenhuma tela abre dentro de moldura de outro site (troca da chave Pix, repasse no admin)
  // e o endereço com ?volta= ou ?pago= não vaza para outros sites. Os mesmos de api/vercel.json.
  app.addHook('onSend', async (_req, reply) => {
    reply
      .header('x-frame-options', 'DENY')
      .header('content-security-policy', "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'")
      .header('referrer-policy', 'strict-origin-when-cross-origin')
      .header('x-content-type-options', 'nosniff');
  });

  const limite = { max: op.limiteTentativas ?? 10, timeWindow: '1 minute' };
  rotasContas(app, ctx, limite);
  rotasProfissionais(app, ctx);
  rotasServicos(app, ctx);
  rotasVerificacao(app, ctx, limite);
  rotasIndicacoes(app, ctx, limite);
  rotasAdmin(app, ctx);
  rotasConvites(app, ctx, { limite, siteUrl: op.siteUrl });
  rotasPainel(app, ctx);
  rotasQualificacoes(app, ctx);
  rotasBloqueios(app, ctx);
  rotasFotos(app, ctx);
  rotasBusca(app, ctx);
  rotasGanhos(app, ctx);
  rotasPagamentos(app, ctx, { segredoWebhook: op.segredoWebhook ?? null, siteUrl: op.siteUrl });
  rotasAgenda(app, ctx, op.segredoAgenda !== undefined ? op.segredoAgenda : producao ? null : 'segredo-de-desenvolvimento-da-agenda');

  app.get('/api/saude', async () => ({ ok: true }));

  const site = op.site === undefined ? raizDoSite : op.site;
  if (site) rotasTelas(app, site);

  return app;
}
