import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // cada arquivo sobe um Postgres embutido (PGlite) e roda todas as migrations;
    // com a máquina ocupada isso passa dos 10 s padrão
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
