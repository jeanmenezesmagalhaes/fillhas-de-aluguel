import { randomUUID } from 'node:crypto';
import { ErroApi } from './erros.js';

// Cobrança da família e repasse para a profissional. O gateway do MVP é o AbacatePay:
// checkout hospedado (Pix ou cartão em até 12x, com a taxa do cartão paga pela família),
// estorno integral e envio de Pix para a chave da profissional. As rotas só conhecem
// esta interface; trocar de gateway (Asaas, por exemplo) não mexe nelas.

export type TipoChavePix = 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
export type SituacaoCobranca = 'pendente' | 'pago' | 'expirado' | 'cancelado' | 'reembolsado';

export interface Cobranca {
  id: string;
  url: string;
  situacao: SituacaoCobranca;
  metodo: 'PIX' | 'CARD' | null;
  parcelas: number | null;
  // o que a família pagou a mais pela taxa do cartão
  acrescimoCentavos: number | null;
  taxaGatewayCentavos: number | null;
  comprovanteUrl: string | null;
}

export interface NovaCobranca {
  // id do serviço: volta no webhook como externalId
  referencia: string;
  descricao: string;
  valorCentavos: number;
  // para onde a família volta se desistir e depois de pagar
  voltarUrl: string;
  concluirUrl: string;
}

export interface EnvioPix {
  referencia: string;
  descricao: string;
  valorCentavos: number;
  chave: string;
  tipo: TipoChavePix;
}

export interface GatewayPagamento {
  nome: string;
  criarCobranca(c: NovaCobranca): Promise<Cobranca>;
  consultarCobranca(id: string): Promise<Cobranca>;
  // estorno integral; cobrança já estornada conta como sucesso
  reembolsar(id: string, motivo: string): Promise<void>;
  enviarPix(p: EnvioPix): Promise<{ id: string; comprovanteUrl: string | null; taxaCentavos: number | null }>;
}

// Recusa do gateway, com a mensagem que ele devolveu (vai para o log e para a administração).
export class ErroGateway extends Error {}

// R$ 10 por parcela no mínimo, até 12x
export const maxParcelas = (valorCentavos: number) => Math.max(1, Math.min(12, Math.floor(valorCentavos / 1000)));

// --- AbacatePay (API v2) ---

const SITUACAO_ABACATE: Record<string, SituacaoCobranca> = {
  PENDING: 'pendente',
  PAID: 'pago',
  EXPIRED: 'expirado',
  CANCELLED: 'cancelado',
  REFUNDED: 'reembolsado',
};

interface CheckoutAbacate {
  id: string;
  url: string;
  status: string;
  methods?: string[];
  installmentsCount?: number | null;
  customerFee?: number | null;
  platformFee?: number | null;
  receiptUrl?: string | null;
}

const cobrancaAbacate = (c: CheckoutAbacate): Cobranca => {
  const situacao = SITUACAO_ABACATE[c.status] ?? 'pendente';
  const pago = situacao === 'pago' || situacao === 'reembolsado';
  // installmentsCount só vem preenchido no cartão; no Pix fica null
  const metodo = !pago ? null : c.installmentsCount != null ? 'CARD' : c.methods?.length === 1 ? (c.methods[0] as 'PIX' | 'CARD') : 'PIX';
  return {
    id: c.id,
    url: c.url,
    situacao,
    metodo,
    parcelas: c.installmentsCount ?? null,
    acrescimoCentavos: c.customerFee ?? null,
    taxaGatewayCentavos: c.platformFee ?? null,
    comprovanteUrl: c.receiptUrl ?? null,
  };
};

export function gatewayAbacatePay(chave: string, op: { fetch?: typeof fetch; base?: string } = {}): GatewayPagamento {
  const base = op.base ?? 'https://api.abacatepay.com/v2';
  const buscar = op.fetch ?? fetch;
  const chamar = async <T>(metodo: 'GET' | 'POST', caminho: string, corpo?: unknown): Promise<T> => {
    const r = await buscar(`${base}${caminho}`, {
      method: metodo,
      headers: { authorization: `Bearer ${chave}`, ...(corpo ? { 'content-type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await r.json().catch(() => null)) as { data: T; success?: boolean; error: string | null } | null;
    if (!r.ok || !json || json.error || json.success === false) {
      throw new ErroGateway(json?.error || `AbacatePay respondeu ${r.status}`);
    }
    return json.data;
  };
  return {
    nome: 'abacatepay',
    async criarCobranca(c) {
      // o checkout só aceita produtos do catálogo: um produto por cobrança, com o preço do serviço
      const produto = await chamar<{ id: string }>('POST', '/products/create', {
        externalId: `servico-${c.referencia}-${Date.now()}`,
        name: c.descricao.slice(0, 120),
        price: c.valorCentavos,
        currency: 'BRL',
      });
      const checkout = await chamar<CheckoutAbacate>('POST', '/checkouts/create', {
        items: [{ id: produto.id, quantity: 1 }],
        externalId: c.referencia,
        returnUrl: c.voltarUrl,
        completionUrl: c.concluirUrl,
        methods: ['PIX', 'CARD'],
        // a família paga a taxa do cartão (inclusive a do parcelamento); a plataforma recebe o preço cheio
        card: { maxInstallments: maxParcelas(c.valorCentavos), passFeesToCustomer: true },
        metadata: { servicoId: c.referencia },
      });
      return cobrancaAbacate(checkout);
    },
    async consultarCobranca(id) {
      return cobrancaAbacate(await chamar<CheckoutAbacate>('GET', `/checkouts/get?id=${encodeURIComponent(id)}`));
    },
    async reembolsar(id, motivo) {
      try {
        await chamar('POST', '/checkouts/refund', { id, reason: motivo });
      } catch (err) {
        if (err instanceof ErroGateway && /já foi reembolsada/i.test(err.message)) return;
        throw err;
      }
    },
    async enviarPix(p) {
      const t = await chamar<{ id: string; status: string; receiptUrl?: string | null; platformFee?: number | null }>('POST', '/pix/send', {
        amount: p.valorCentavos,
        description: p.descricao.slice(0, 140),
        externalId: p.referencia,
        pix: { key: p.chave, type: p.tipo },
      });
      if (t.status === 'FAILED') throw new ErroGateway('O envio do Pix falhou; o valor voltou para o saldo.');
      return { id: t.id, comprovanteUrl: t.receiptUrl ?? null, taxaCentavos: t.platformFee ?? null };
    },
  };
}

// --- simulado (desenvolvimento e testes) ---

// Taxa do cartão no AbacatePay, para simular o acréscimo que a família paga.
const taxaCartao = (parcelas: number) => (parcelas <= 1 ? 0.035 : parcelas <= 6 ? 0.04 : 0.045);
export const acrescimoCartao = (valorCentavos: number, parcelas: number) =>
  Math.ceil((valorCentavos + 60) / (1 - taxaCartao(parcelas))) - valorCentavos;

type CobrancaSimulada = Cobranca & { valorCentavos: number; concluirUrl: string; voltarUrl: string; descricao: string };

export interface GatewaySimulado extends GatewayPagamento {
  // a família "paga" na tela simulada; devolve a cobrança atualizada
  pagar(id: string, metodo: 'PIX' | 'CARD', parcelas?: number): CobrancaSimulada;
  cobrancas: Map<string, CobrancaSimulada>;
  pix: EnvioPix[];
  // faz o próximo envio de Pix ou estorno falhar, para testar o caminho de erro
  falharProximo?: string;
}

// Sem chave do AbacatePay, fora de produção: a cobrança abre uma tela da própria API
// (/api/pagamentos/simulado/:id) onde dá para pagar com um clique. Fica só na memória.
export function gatewaySimulado(): GatewaySimulado {
  const cobrancas: GatewaySimulado['cobrancas'] = new Map();
  const pix: EnvioPix[] = [];
  const g: GatewaySimulado = {
    nome: 'simulado',
    cobrancas,
    pix,
    async criarCobranca(c) {
      const id = `sim_${randomUUID()}`;
      const nova = {
        id,
        url: `/api/pagamentos/simulado/${id}`,
        situacao: 'pendente' as const,
        metodo: null,
        parcelas: null,
        acrescimoCentavos: null,
        taxaGatewayCentavos: null,
        comprovanteUrl: null,
        valorCentavos: c.valorCentavos,
        concluirUrl: c.concluirUrl,
        voltarUrl: c.voltarUrl,
        descricao: c.descricao,
      };
      cobrancas.set(id, nova);
      return { ...nova };
    },
    async consultarCobranca(id) {
      const c = cobrancas.get(id);
      // a API reiniciou e a memória se perdeu: a cobrança vence e a família gera outra
      if (!c) return { id, url: '', situacao: 'expirado', metodo: null, parcelas: null, acrescimoCentavos: null, taxaGatewayCentavos: null, comprovanteUrl: null };
      return { ...c };
    },
    pagar(id, metodo, parcelas = 1) {
      const c = cobrancas.get(id);
      if (!c) throw new ErroApi(404, 'nao_encontrado', 'Cobrança simulada não encontrada. Volte e gere o pagamento de novo.');
      if (c.situacao === 'pendente') {
        Object.assign(c, {
          situacao: 'pago',
          metodo,
          parcelas: metodo === 'CARD' ? parcelas : null,
          acrescimoCentavos: metodo === 'CARD' ? acrescimoCartao(c.valorCentavos, parcelas) : 0,
          taxaGatewayCentavos: metodo === 'PIX' ? 80 : 0,
        });
      }
      return { ...c };
    },
    async reembolsar(id) {
      if (g.falharProximo) {
        const m = g.falharProximo;
        g.falharProximo = undefined;
        throw new ErroGateway(m);
      }
      const c = cobrancas.get(id);
      if (c && c.situacao === 'pago') c.situacao = 'reembolsado';
    },
    async enviarPix(p) {
      if (g.falharProximo) {
        const m = g.falharProximo;
        g.falharProximo = undefined;
        throw new ErroGateway(m);
      }
      pix.push(p);
      return { id: `sim_pix_${randomUUID()}`, comprovanteUrl: null, taxaCentavos: 80 };
    },
  };
  return g;
}

// Em produção sem chave configurada: recusa em vez de fingir que cobrou.
export const gatewayIndisponivel: GatewayPagamento = {
  nome: 'indisponivel',
  async criarCobranca() {
    throw new ErroApi(503, 'pagamento_indisponivel', 'O pagamento ainda não está disponível. Tente mais tarde.');
  },
  async consultarCobranca() {
    throw new ErroApi(503, 'pagamento_indisponivel', 'O pagamento ainda não está disponível. Tente mais tarde.');
  },
  async reembolsar() {
    throw new ErroGateway('Gateway de pagamento não configurado.');
  },
  async enviarPix() {
    throw new ErroGateway('Gateway de pagamento não configurado.');
  },
};
