// Aplica as migrations pendentes e sai. Na Vercel roda no build (`vercel-build`), já que
// a função não leva a pasta drizzle/.
// Uso: npm run db:migrar
import { abrirBanco } from '../db/index.js';

if (process.env.VERCEL && !process.env.DATABASE_URL?.match(/^postgres(ql)?:\/\//)) {
  console.error('DATABASE_URL não definida: na Vercel a API precisa de um Postgres (postgres://…).');
  process.exit(1);
}

// Preview de branch não migra o banco sozinho: com a mesma DATABASE_URL da produção, uma
// migration ainda não aprovada mudaria o banco real. Com banco próprio no Preview (branch do
// Neon por preview, por exemplo), ligue PREVIEW_COM_BANCO_PROPRIO=1 no ambiente Preview.
if (process.env.VERCEL_ENV === 'preview' && process.env.PREVIEW_COM_BANCO_PROPRIO !== '1') {
  console.warn('Preview sem banco próprio: migrations não aplicadas (ligue PREVIEW_COM_BANCO_PROPRIO=1 quando o Preview tiver o próprio banco).');
  process.exit(0);
}

const banco = await abrirBanco();
await banco.fechar();
console.log('Migrations aplicadas.');
