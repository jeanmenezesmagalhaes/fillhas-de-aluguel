import type { Armazenamento } from './armazenamento.js';
import type { Db } from './db/index.js';
import type { Mensageiro } from './mensagens.js';
import type { GatewayPagamento } from './pagamentos.js';

export interface Contexto {
  db: Db;
  // relógio injetável: os testes avançam o tempo sem esperar
  agora: () => Date;
  producao: boolean;
  mensageiro: Mensageiro;
  // confirmar o WhatsApp por código é exigência para a lista de espera (desligado por ora: cada envio custa)
  verificarWhatsapp: boolean;
  armazenamento: Armazenamento;
  pagamentos: GatewayPagamento;
}
