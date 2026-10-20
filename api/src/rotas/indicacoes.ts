import { randomInt } from 'node:crypto';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exigirUsuario } from '../auth.js';
import { nomeCurto } from '../avaliacoes.js';
import type { Contexto } from '../contexto.js';
import type { Db } from '../db/index.js';
import { indicacoes, profissionais, usuarios } from '../db/schema.js';
import { ErroApi, naoEncontrado } from '../erros.js';

// sem 0/O e 1/I/L, que se confundem quando a pessoa digita o código
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const codigoIndicacao = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,8}-[A-Z0-9]{4}$/, 'Confira o código de indicação.');

function novoCodigo(nome: string): string {
  const prefixo =
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z]/g, ' ')
      .trim()
      .split(/\s+/)[0]
      ?.slice(0, 8) || 'MC';
  const sufixo = Array.from({ length: 4 }, () => LETRAS[randomInt(LETRAS.length)]).join('');
  return `${prefixo}-${sufixo}`;
}

// O código nasce na primeira vez que a pessoa abre a área de indicações.
async function codigoDe(db: Db, usuarioId: string): Promise<string> {
  const [u] = await db.select({ codigo: usuarios.codigoIndicacao, nome: usuarios.nome }).from(usuarios).where(eq(usuarios.id, usuarioId));
  if (u!.codigo) return u!.codigo;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = novoCodigo(u!.nome);
    const [ocupado] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.codigoIndicacao, codigo));
    if (ocupado) continue;
    const [feito] = await db
      .update(usuarios)
      .set({ codigoIndicacao: codigo })
      .where(and(eq(usuarios.id, usuarioId), isNull(usuarios.codigoIndicacao)))
      .returning({ codigo: usuarios.codigoIndicacao });
    if (feito) return feito.codigo!;
    return codigoDe(db, usuarioId);
  }
  throw new ErroApi(500, 'erro_interno', 'Não conseguimos criar seu código agora. Tente de novo.');
}

// usado no cadastro: liga a conta nova a quem indicou, dentro da mesma transação
export async function registrarIndicacao(tx: Db, codigo: string | undefined, indicadoId: string) {
  if (!codigo) return;
  const [quem] = await tx.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.codigoIndicacao, codigo));
  if (!quem) {
    throw new ErroApi(400, 'dados_invalidos', 'Não encontramos este código de indicação.', {
      codigoIndicacao: 'Código não encontrado. Confira ou deixe em branco.',
    });
  }
  await tx.insert(indicacoes).values({ indicadorId: quem.id, indicadoId, codigo });
}

// quando um serviço é feito, marca o primeiro serviço de quem foi indicado (família ou profissional)
export async function marcarPrimeiroServico(db: Db, envolvidos: string[], agora: Date) {
  await db
    .update(indicacoes)
    .set({ primeiroServicoEm: agora })
    .where(and(inArray(indicacoes.indicadoId, envolvidos), isNull(indicacoes.primeiroServicoEm)));
}

export function rotasIndicacoes(app: FastifyInstance, ctx: Contexto, limite: { max: number; timeWindow: string }) {
  app.get('/api/indicacoes/eu', async (req) => {
    const u = exigirUsuario(req);
    const codigo = await codigoDe(ctx.db, u.id);
    const linhas = await ctx.db
      .select({
        nome: usuarios.nome,
        profissional: profissionais.usuarioId,
        cadastradaEm: indicacoes.criadoEm,
        aprovadaEm: indicacoes.aprovadoEm,
        primeiroServicoEm: indicacoes.primeiroServicoEm,
      })
      .from(indicacoes)
      .innerJoin(usuarios, eq(usuarios.id, indicacoes.indicadoId))
      .leftJoin(profissionais, eq(profissionais.usuarioId, indicacoes.indicadoId))
      .where(eq(indicacoes.indicadorId, u.id))
      .orderBy(asc(indicacoes.criadoEm));
    // de quem foi indicado, só o primeiro nome com a inicial e a etapa
    const indicadas = linhas.map((l) => ({
      nome: nomeCurto(l.nome),
      tipo: l.profissional ? ('profissional' as const) : ('familia' as const),
      etapa: l.primeiroServicoEm ? 'primeiro_servico' : l.aprovadaEm ? 'aprovada' : 'cadastrada',
      cadastradaEm: l.cadastradaEm,
      aprovadaEm: l.aprovadaEm,
      primeiroServicoEm: l.primeiroServicoEm,
    }));
    return {
      codigo,
      links: {
        profissional: `/entrar.html?perfil=pro&modo=criar&indicacao=${codigo}`,
        familia: `/entrar.html?modo=criar&indicacao=${codigo}`,
      },
      resumo: {
        cadastradas: indicadas.length,
        aprovadas: indicadas.filter((i) => i.aprovadaEm).length,
        comPrimeiroServico: indicadas.filter((i) => i.primeiroServicoEm).length,
      },
      indicadas,
    };
  });

  // a tela de cadastro mostra "Indicação de Ana O." antes de a pessoa criar a conta
  app.get('/api/indicacoes/:codigo', { config: { rateLimit: limite } }, async (req) => {
    const { codigo } = z.object({ codigo: codigoIndicacao }).parse(req.params);
    const [quem] = await ctx.db.select({ nome: usuarios.nome }).from(usuarios).where(eq(usuarios.codigoIndicacao, codigo));
    if (!quem) throw naoEncontrado('Código de indicação não encontrado.');
    return { codigo, indicador: nomeCurto(quem.nome) };
  });
}

