import type { FastifyBaseLogger } from 'fastify';
import { ErroApi } from './erros.js';

export interface Mensagem {
  canal: 'email' | 'whatsapp';
  destino: string;
  assunto: string;
  texto: string;
}

// Envio de e-mail e WhatsApp. O provedor ainda não foi escolhido (Resend, SES ou
// Postmark para e-mail; WhatsApp Cloud API, Twilio ou Z-API para WhatsApp): quem
// implementar esta interface liga o envio de verdade sem mexer nas rotas.
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
