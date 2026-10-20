import type { Db } from './db/index.js';

export interface Contexto {
  db: Db;
  // relógio injetável: os testes avançam o tempo sem esperar
  agora: () => Date;
  producao: boolean;
}
