import { fileURLToPath } from 'node:url';
import { criarApp } from './app.js';
import { armazenamentoEmDisco } from './armazenamento.js';
import { abrirBanco } from './db/index.js';
import { mensageiroResend } from './mensagens.js';
import { gatewayAbacatePay } from './pagamentos.js';

// Monta a API a partir do ambiente. Quem sobe é src/server.ts (local) ou index.ts (Vercel).
export async function iniciarApi() {
  // Na Vercel o disco é só leitura e some a cada instância: o PGlite não serve, as
  // migrations rodam no build e as telas vêm de public/ (montada no build).
  const naVercel = Boolean(process.env.VERCEL);
  // Na Vercel (produção ou preview) vale sempre o modo de produção, mesmo sem NODE_ENV: o
  // pagamento simulado (que confirma serviço sem cobrar), o segredo fixo da agenda e os
  // códigos no log só existem rodando local.
  const producao = process.env.NODE_ENV === 'production' || naVercel;
  if (naVercel && !process.env.DATABASE_URL?.match(/^postgres(ql)?:\/\//)) {
    throw new Error('DATABASE_URL não definida: na Vercel a API precisa de um Postgres (postgres://…).');
  }
  const chaveResend = process.env.RESEND_API_KEY;
  if (chaveResend && !process.env.EMAIL_REMETENTE) {
    throw new Error('EMAIL_REMETENTE não definido: com RESEND_API_KEY, informe o remetente (ex.: Minha companhia <nao-responda@seu-dominio>).');
  }
  const banco = await abrirBanco(undefined, { migrar: !naVercel });
  // em produção, trocar pelo bucket privado (S3 ou R2) antes de abrir para o público
  const armazenamento = armazenamentoEmDisco(process.env.PASTA_ARQUIVOS ?? './.data/arquivos');
  const app = await criarApp({
    db: banco.db,
    producao,
    armazenamento,
    site: naVercel ? fileURLToPath(new URL('../public/', import.meta.url)) : undefined,
    // sem RESEND_API_KEY, fora de produção a mensagem só vai para o log; em produção responde 503
    mensageiro: chaveResend ? mensageiroResend(chaveResend, process.env.EMAIL_REMETENTE!) : undefined,
    // VERIFICAR_WHATSAPP=1 volta a exigir o código do WhatsApp no cadastro profissional
    verificarWhatsapp: process.env.VERIFICAR_WHATSAPP === '1',
    // sem SEGREDO_AGENDA em produção, a assinatura da agenda responde 503
    segredoAgenda: process.env.SEGREDO_AGENDA ?? (producao ? null : undefined),
    // sem ABACATEPAY_API_KEY, fora de produção o pagamento é simulado; em produção responde 503
    pagamentos: process.env.ABACATEPAY_API_KEY ? gatewayAbacatePay(process.env.ABACATEPAY_API_KEY) : undefined,
    segredoWebhook: process.env.ABACATEPAY_WEBHOOK_SECRET || null,
    siteUrl: process.env.SITE_URL || undefined,
    logger: {
      level: producao ? 'info' : 'debug',
      // o link da agenda é a própria chave de acesso: não vai para o log
      serializers: {
        req: (req: { method: string; url: string }) => ({
          method: req.method,
          url: req.url.replace(/\/api\/agenda\/[^/?]+\.ics/, '/api/agenda/***.ics').replace(/webhookSecret=[^&]*/, 'webhookSecret=***'),
        }),
      },
    },
  });
  return { app, banco };
}
