// Copia as telas estáticas (as mesmas que a API serve em desenvolvimento) para public/,
// que a Vercel entrega pela CDN. Lá a API não serve arquivos.
// Uso: npm run montar-public
import { cpSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../../', import.meta.url));
const destino = fileURLToPath(new URL('../../public/', import.meta.url));

rmSync(destino, { recursive: true, force: true });
for (const nome of readdirSync(raiz)) {
  if (/^[\w-]+\.(?:html|css|js|svg)$/.test(nome) || nome === 'assets' || nome === 'fonts') {
    cpSync(raiz + nome, destino + nome, { recursive: true });
  }
}
console.log(`Telas copiadas para ${destino}`);
