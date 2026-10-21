import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Onde ficam os arquivos dos documentos. A chave é sempre gerada pela API (nunca vem
// de quem envia), e nada daqui é servido como arquivo público.
export interface Armazenamento {
  salvar(chave: string, dados: Buffer): Promise<void>;
  ler(chave: string): Promise<Buffer>;
  remover(chave: string): Promise<void>;
}

// Disco local, para desenvolvimento. Em produção, um bucket privado (S3 ou R2) com a
// mesma interface.
export function armazenamentoEmDisco(pasta: string): Armazenamento {
  return {
    async salvar(chave, dados) {
      await mkdir(pasta, { recursive: true });
      await writeFile(join(pasta, chave), dados, { flag: 'wx', mode: 0o600 });
    },
    ler: (chave) => readFile(join(pasta, chave)),
    remover: (chave) => rm(join(pasta, chave), { force: true }),
  };
}

export function armazenamentoEmMemoria(): Armazenamento {
  const arquivos = new Map<string, Buffer>();
  return {
    async salvar(chave, dados) {
      arquivos.set(chave, dados);
    },
    async ler(chave) {
      const d = arquivos.get(chave);
      if (!d) throw new Error(`arquivo ${chave} não existe`);
      return d;
    },
    async remover(chave) {
      arquivos.delete(chave);
    },
  };
}
