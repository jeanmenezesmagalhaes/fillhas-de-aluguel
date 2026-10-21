import { eq } from 'drizzle-orm';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { criarApp } from '../src/app.js';
import { abrirBanco, type Banco } from '../src/db/index.js';
import { profissionais, usuarios } from '../src/db/schema.js';
import type { Mensagem } from '../src/mensagens.js';

export interface Ambiente {
  app: FastifyInstance;
  banco: Banco;
  relogio: { agora: Date; avancar: (ms: number) => void };
  // mensagens que seriam enviadas por e-mail e WhatsApp
  mensagens: Mensagem[];
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
  const mensagens: Mensagem[] = [];
  const app = await criarApp({
    db: banco.db,
    mensageiro: { enviar: async (m) => void mensagens.push(m) },
    agora: () => relogio.agora,
    site: false,
    limiteTentativas: op.limiteTentativas ?? 1000,
  });
  return {
    app,
    banco,
    relogio,
    mensagens,
    fechar: async () => {
      await app.close();
      await banco.fechar();
    },
  };
}

// Um "navegador": guarda o cookie de sessão entre os pedidos.
export function cliente(app: FastifyInstance) {
  let cookie: string | undefined;
  const pedir = async (method: InjectOptions['method'], url: string, payload?: unknown, headers: Record<string, string> = {}) => {
    const r = await app.inject({ method, url, payload: payload as InjectOptions['payload'], headers: { ...headers, ...(cookie ? { cookie } : {}) } });
    const sessao = r.cookies.find((c) => c.name === 'mc_sessao');
    if (sessao) cookie = sessao.value ? `mc_sessao=${sessao.value}` : undefined;
    const json = String(r.headers['content-type'] ?? '').includes('json');
    return { status: r.statusCode, corpo: r.body && json ? r.json() : null, resposta: r };
  };
  return {
    get: (url: string) => pedir('GET', url),
    post: (url: string, corpo?: unknown) => pedir('POST', url, corpo ?? {}),
    patch: (url: string, corpo: unknown) => pedir('PATCH', url, corpo),
    put: (url: string, corpo: unknown) => pedir('PUT', url, corpo),
    delete: (url: string) => pedir('DELETE', url),
    // multipart/form-data com campos de texto e um arquivo
    enviarArquivo: (url: string, campos: Record<string, string>, arquivo: { nome: string; dados: Buffer }) => {
      const b = `----limite${Math.random().toString(16).slice(2)}`;
      const partes = Object.entries(campos).map(([k, v]) => `--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`);
      const corpo = Buffer.concat([
        Buffer.from(partes.join('')),
        Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="arquivo"; filename="${arquivo.nome}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
        arquivo.dados,
        Buffer.from(`\r\n--${b}--\r\n`),
      ]);
      return pedir('POST', url, corpo, { 'content-type': `multipart/form-data; boundary=${b}` });
    },
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

export const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
export const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
// CPFs e CNPJ de teste com dígitos verificadores corretos
export const CPFS = ['10000000108', '10000792012', '10001583905', '10002375834', '10003167771', '10003959600', '10004751582', '10005543410', '10006335357', '10007127294', '10007919123', '10008711003'];
export const CNPJ = '11.222.333/0001-81';

export const enderecoTeste = { cep: '13025-320', logradouro: 'Rua Maria Monteiro', numero: '120', bairro: 'Cambuí', cidade: 'Campinas', uf: 'SP' };

// último código enviado para um destino (e-mail ou celular)
export function ultimoCodigo(amb: Ambiente, destino: string) {
  const m = [...amb.mensagens].reverse().find((x) => x.destino === destino);
  return m?.texto.match(/\d{6}/)?.[0];
}

export async function tornarAdmin(amb: Ambiente, usuarioId: string) {
  await amb.banco.db.update(usuarios).set({ admin: true }).where(eq(usuarios.id, usuarioId));
}
