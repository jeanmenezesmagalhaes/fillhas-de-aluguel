import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarApp } from '../src/app.js';
import { abrirBanco, type Banco } from '../src/db/index.js';

// Uma pasta como a raiz do repositório: as telas e, ao lado, o que nunca pode sair.
let raiz: string;
let banco: Banco;
let app: FastifyInstance;
beforeAll(async () => {
  raiz = mkdtempSync(join(tmpdir(), 'telas-'));
  const grava = (nome: string, conteudo: string) => {
    mkdirSync(join(raiz, nome, '..'), { recursive: true });
    writeFileSync(join(raiz, nome), conteudo);
  };
  grava('index.html', '<h1>início</h1>');
  grava('busca.html', '<h1>busca</h1>');
  grava('site.css', 'body{}');
  grava('assets/foto.webp', 'webp');
  grava('.env.local', 'DATABASE_URL=segredo');
  grava('assets/.oculto.json', '{"segredo":true}');
  grava('api/.env', 'SEGREDO=1');
  grava('api/src/auth.js', 'segredo');
  grava('docs/notas.html', 'interno');
  banco = await abrirBanco('memory://');
  app = await criarApp({ db: banco.db, site: raiz });
  await app.listen({ port: 0, host: '127.0.0.1' });
});
afterAll(async () => {
  await app.close();
  await banco.fechar();
  rmSync(raiz, { recursive: true, force: true });
});

// Pedido HTTP de verdade, com o caminho cru: o inject normaliza `/./` e `%2e%2e` antes de
// chegar à rota, e o que importa é o que um navegador ou um curl mandam.
function pedir(caminho: string, headers: Record<string, string> = {}) {
  const { port } = app.server.address() as AddressInfo;
  return new Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: caminho, headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (parte) => (body += parte));
      res.on('end', () => resolve({ statusCode: res.statusCode!, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('telas estáticas', () => {
  it('serve as telas e os arquivos de assets/ com o tipo certo', async () => {
    const inicio = await pedir('/');
    expect(inicio.statusCode).toBe(200);
    expect(inicio.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(inicio.body).toContain('início');
    const busca = await pedir('/busca');
    expect(busca.statusCode).toBe(200);
    expect(busca.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(busca.body).toContain('busca');
    expect((await pedir('/site.css')).headers['content-type']).toBe('text/css; charset=utf-8');
    const foto = await pedir('/assets/foto.webp?v=2');
    expect(foto.statusCode).toBe(200);
    expect(foto.headers['content-type']).toBe('image/webp');
    expect(foto.headers['x-content-type-options']).toBe('nosniff');
  });

  it('não deixa outro site abrir as telas nem a API numa moldura', async () => {
    for (const caminho of ['/', '/api/saude', '/api/nao-existe']) {
      const r = await pedir(caminho);
      expect(r.headers['x-frame-options']).toBe('DENY');
      expect(r.headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(r.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    }
  });

  it('redireciona os endereços com .html para os sem extensão', async () => {
    const busca = await pedir('/busca.html?cidade=pinhal');
    expect(busca.statusCode).toBe(308);
    expect(busca.headers.location).toBe('/busca?cidade=pinhal');
    const inicio = await pedir('/index.html');
    expect(inicio.statusCode).toBe(308);
    expect(inicio.headers.location).toBe('/');
  });

  it('responde 304 quando o navegador já tem o arquivo', async () => {
    const primeira = await pedir('/site.css');
    const etag = String(primeira.headers.etag);
    const segunda = await pedir('/site.css', { 'if-none-match': etag });
    expect(segunda.statusCode).toBe(304);
    expect(segunda.body).toBe('');
  });

  // os caminhos do GHSA-8pvw-jcv7-9cmj e do GHSA-83w8-p2f5-377r, e o que mais tentar sair da lista
  it.each([
    '//site.css',
    '/./site.css',
    '/assets/../site.css',
    '/assets/../.env.local',
    '/assets/..%2f..%2fapi%2f.env',
    '/assets/..%2fsite.css',
    '/assets/%2e%2e/.env.local',
    '/%2e%2e/site.css',
    '/.env.local',
    '/assets/.oculto.json',
    '/api/.env',
    '/api/src/auth.js',
    '/docs/notas.html',
    '/assets/',
    '/assets',
    '/nao-existe',
    '/api',
    '/api/nao-existe',
  ])('não serve %s', async (url) => {
    const r = await pedir(url);
    expect(r.statusCode).toBe(404);
    expect(r.body).not.toContain('segredo');
    expect(r.body).not.toContain('interno');
  });
});
