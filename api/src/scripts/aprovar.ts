// Aprova um perfil profissional enquanto o painel administrativo não existe.
// Uso: npm run aprovar -- ana-oliveira
import { eq } from 'drizzle-orm';
import { abrirBanco } from '../db/index.js';
import { profissionais } from '../db/schema.js';

const slug = process.argv[2];
if (!slug) {
  console.error('Uso: npm run aprovar -- <slug-do-portfolio>');
  process.exit(1);
}

const hoje = new Date();
const proxima = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
const dia = (d: Date) => d.toISOString().slice(0, 10);

const banco = await abrirBanco();
const feitos = await banco.db
  .update(profissionais)
  .set({ situacao: 'aprovado', revisadoEm: dia(hoje), proximaRevisao: dia(proxima), atualizadoEm: hoje })
  .where(eq(profissionais.slug, slug))
  .returning({ slug: profissionais.slug });
await banco.fechar();

if (!feitos.length) {
  console.error(`Nenhum perfil com o endereço "${slug}".`);
  process.exit(1);
}
console.log(`Perfil ${slug} aprovado. Próxima revisão: ${dia(proxima)}.`);
