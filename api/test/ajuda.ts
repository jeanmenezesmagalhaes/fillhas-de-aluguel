import { eq } from 'drizzle-orm';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { criarApp } from '../src/app.js';
import { abrirBanco, type Banco } from '../src/db/index.js';
import { profissionais } from '../src/db/schema.js';

export interface Ambiente {
  app: FastifyInstance;
  banco: Banco;
  relogio: { agora: Date; avancar: (ms: number) => void };
  fechar: () => Promise<void>;
}

export const HORA = 60 * 60 * 1000;
export const DIA = 24 * HORA;

export async function ambiente(op: { limiteTentativas?: number } = {}): Promise<Ambiente> {
  const banco = await abrirBanco('memory://');
  const relogio = {
    agora: new Date('2026-10-20T12:00:00Z'),
    avancar(ms: number) {
      this.agora = new Date(this.agora.getTime() + ms);
    },
  };
  const app = await criarApp({
    db: banco.db,
    agora: () => relogio.agora,
    site: false,
    limiteTentativas: op.limiteTentativas ?? 1000,
  });
  return {
    app,
    banco,
    relogio,
    fechar: async () => {
      await app.close();
      await banco.fechar();
    },
  };
}

// Um "navegador": guarda o cookie de sessão entre os pedidos.
export function cliente(app: FastifyInstance) {
  let cookie: string | undefined;
  const pedir = async (method: InjectOptions['method'], url: string, payload?: unknown) => {
    const r = await app.inject({ method, url, payload: payload as InjectOptions['payload'], headers: cookie ? { cookie } : {} });
    const sessao = r.cookies.find((c) => c.name === 'mc_sessao');
    if (sessao) cookie = sessao.value ? `mc_sessao=${sessao.value}` : undefined;
    return { status: r.statusCode, corpo: r.body ? r.json() : null, resposta: r };
  };
  return {
    get: (url: string) => pedir('GET', url),
    post: (url: string, corpo?: unknown) => pedir('POST', url, corpo ?? {}),
    patch: (url: string, corpo: unknown) => pedir('PATCH', url, corpo),
    delete: (url: string) => pedir('DELETE', url),
    esquecer: () => {
      cookie = undefined;
    },
  };
}

let n = 0;
export const familia = (extra: Record<string, unknown> = {}) => ({
  nome: 'Mariana Costa',
  email: `mariana${++n}@exemplo.com`,
  celular: '(19) 99999-0000',
  senha: 'senha-de-teste-1',
  aceitaTermos: true,
  ...extra,
});

export const profissional = (extra: Record<string, unknown> = {}) => ({
  nome: 'Ana Oliveira',
  email: `ana${++n}@exemplo.com`,
  celular: '19 98888-0000',
  senha: 'senha-de-teste-2',
  aceitaTermos: true,
  cidade: 'Campinas',
  uf: 'sp',
  ...extra,
});

// Profissional com preço definido e perfil aprovado (a aprovação ainda não tem rota).
export async function profissionalAprovada(amb: Ambiente, extra: Record<string, unknown> = {}) {
  const c = cliente(amb.app);
  const r = await c.post('/api/profissionais', profissional(extra));
  await c.patch('/api/profissionais/eu', { valorHoraCentavos: 7000, horasMinimas: 2, veiculoIncluso: true });
  await amb.banco.db
    .update(profissionais)
    .set({ situacao: 'aprovado' })
    .where(eq(profissionais.slug, r.corpo.usuario.profissional.slug));
  return { c, usuario: r.corpo.usuario, slug: r.corpo.usuario.profissional.slug as string };
}
