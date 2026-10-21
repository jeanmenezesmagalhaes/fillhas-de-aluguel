// Aplica as migrations pendentes e sai. Na Vercel roda no build (`vercel-build`), já que
// a função não leva a pasta drizzle/.
// Uso: npm run db:migrar
import { abrirBanco } from '../db/index.js';

if (process.env.VERCEL && !process.env.DATABASE_URL?.match(/^postgres(ql)?:\/\//)) {
  console.error('DATABASE_URL não definida: na Vercel a API precisa de um Postgres (postgres://…).');
  process.exit(1);
}

const banco = await abrirBanco();
await banco.fechar();
console.log('Migrations aplicadas.');
