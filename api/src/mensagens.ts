import type { FastifyBaseLogger } from 'fastify';
import { ErroApi } from './erros.js';

export interface Mensagem {
  canal: 'email' | 'whatsapp';
  destino: string;
  assunto: string;
  texto: string;
}

// Envio de e-mail e WhatsApp. O e-mail sai pelo Resend; o WhatsApp ainda não tem
// provedor (WhatsApp Cloud API ou Twilio): quem implementar esta interface liga o
// envio de verdade sem mexer nas rotas.
export interface Mensageiro {
  enviar(m: Mensagem): Promise<void>;
}

// Em desenvolvimento, a mensagem só aparece no log do servidor.
export const mensageiroNoLog = (log: FastifyBaseLogger): Mensageiro => ({
  async enviar(m) {
    log.info({ canal: m.canal, destino: m.destino, assunto: m.assunto }, `mensagem (não enviada): ${m.texto}`);
  },
});

// Em produção sem provedor configurado, recusa em vez de fingir que enviou.
export const mensageiroIndisponivel: Mensageiro = {
  async enviar() {
    throw new ErroApi(503, 'envio_indisponivel', 'O envio de mensagens ainda não está disponível. Tente mais tarde.');
  },
};

// E-mail pelo Resend. O remetente precisa ser de um domínio verificado no Resend; o que
// não for e-mail segue para `outros` (o WhatsApp, por ora indisponível).
export function mensageiroResend(
  chave: string,
  remetente: string,
  op: { outros?: Mensageiro; fetch?: typeof fetch; base?: string } = {},
): Mensageiro {
  const base = op.base ?? 'https://api.resend.com';
  const buscar = op.fetch ?? fetch;
  const outros = op.outros ?? mensageiroIndisponivel;
  return {
    async enviar(m) {
      if (m.canal !== 'email') return outros.enviar(m);
      const r = await buscar(`${base}/emails`, {
        method: 'POST',
        headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: remetente, to: [m.destino], subject: m.assunto, text: m.texto }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) {
        // vai para o log como erro interno; a tela recebe a mensagem genérica
        const json = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(`Resend respondeu ${r.status}: ${json?.message ?? 'sem detalhe'}`);
      }
    },
  };
}
