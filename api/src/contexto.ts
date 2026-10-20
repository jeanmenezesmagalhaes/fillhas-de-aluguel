import type { Armazenamento } from './armazenamento.js';
import type { Db } from './db/index.js';
import type { Mensageiro } from './mensagens.js';

export interface Contexto {
  db: Db;
  // relógio injetável: os testes avançam o tempo sem esperar
  agora: () => Date;
  producao: boolean;
  mensageiro: Mensageiro;
  armazenamento: Armazenamento;
}
