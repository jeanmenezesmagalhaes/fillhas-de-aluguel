import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';

// Serve as telas estáticas sem o @fastify/static: a 10.x (que corrige o desvio do
// `allowedPath` por caminhos como `//`, `/./` e `/../`) puxa um pacote só-ESM que derruba a
// função na Vercel. Aqui só passa um nome de arquivo da lista, conferido no caminho cru
// (sem decodificar): `%2e`, `%2f`, barras duplas e pontos soltos nunca casam.
const arquivoDoSite = /^\/(?:[\w-]+\.(?:html|css|js|svg)|(?:assets|fonts)\/[\w-][\w.-]*\.(?:webp|jpg|png|svg|woff2|json))$/;

const TIPOS: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  png: 'image/png',
  woff2: 'font/woff2',
  json: 'application/json; charset=utf-8',
};

// Endereços sem `.html`, como o `cleanUrls` da Vercel: `/busca` serve busca.html e
// `/busca.html` redireciona para `/busca` (e `/index.html` para `/`), mantendo a query.
const telaComExtensao = /^\/([\w-]+)\.html$/;
const telaSemExtensao = /^\/[\w-]+$/;

export function rotasTelas(app: FastifyInstance, raiz: string) {
  app.get('/*', async (req, reply) => {
    const [caminho, query] = req.url.split(/\?(.*)/s) as [string, string | undefined];
    const comExtensao = telaComExtensao.exec(caminho);
    if (comExtensao) {
      const limpo = comExtensao[1] === 'index' ? '/' : `/${comExtensao[1]}`;
      return reply.redirect(query ? `${limpo}?${query}` : limpo, 308);
    }
    const nome = caminho === '/' ? '/index.html' : telaSemExtensao.test(caminho) ? `${caminho}.html` : caminho;
    if (!arquivoDoSite.test(nome) || nome.includes('..')) return reply.callNotFound();
    const arquivo = join(raiz, nome);
    let info;
    try {
      info = await stat(arquivo);
    } catch {
      return reply.callNotFound();
    }
    if (!info.isFile()) return reply.callNotFound();
    const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
    reply
      .header('etag', etag)
      .header('cache-control', 'public, max-age=0, must-revalidate')
      .header('x-content-type-options', 'nosniff');
    if (req.headers['if-none-match'] === etag) return reply.status(304).send();
    return reply.type(TIPOS[nome.slice(nome.lastIndexOf('.') + 1)]!).send(await readFile(arquivo));
  });
}
