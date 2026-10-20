// Dá acesso de administração a uma conta que já existe.
// Uso: npm run admin -- pessoa@exemplo.com
import { eq, sql } from 'drizzle-orm';
import { abrirBanco } from '../db/index.js';
import { usuarios } from '../db/schema.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Uso: npm run admin -- <email>');
  process.exit(1);
}

const banco = await abrirBanco();
const feitos = await banco.db
  .update(usuarios)
  .set({ admin: true })
  .where(eq(sql`lower(${usuarios.email})`, email))
  .returning({ nome: usuarios.nome });
await banco.fechar();

if (!feitos.length) {
  console.error(`Nenhuma conta com o e-mail ${email}.`);
  process.exit(1);
}
console.log(`${feitos[0]!.nome} agora tem acesso de administração.`);
