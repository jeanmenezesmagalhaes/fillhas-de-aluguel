// Regras de dinheiro da profissional. Ainda são propostas (o modelo de recebimento não foi
// decidido), por isso vêm de variáveis de ambiente e as respostas dizem que não são definitivas.
// Sem gateway de pagamento, os ganhos são uma projeção a partir dos atendimentos.

const numero = (nome: string, padrao: number) => {
  const v = Number(process.env[nome]);
  return Number.isFinite(v) && process.env[nome] !== '' && process.env[nome] !== undefined ? v : padrao;
};

export const REGRAS = {
  taxaPercentual: numero('TAXA_PLATAFORMA_PERCENT', 12),
  prazoDepositoDiasUteis: numero('PRAZO_DEPOSITO_DIAS_UTEIS', 2),
  // família que cancela com menos de N horas paga parte do serviço, que vai para a profissional
  cancelamentoTardioHoras: numero('CANCELAMENTO_TARDIO_HORAS', 24),
  cancelamentoTardioPercentual: numero('CANCELAMENTO_TARDIO_PERCENT', 50),
  definitivas: false,
};

const DIA_MS = 86_400_000;

// data no horário de Brasília (UTC-3, sem horário de verão desde 2019), como AAAA-MM-DD
export const dataBrasilia = (d: Date) => new Date(d.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const feriadosCache = new Map<number, Set<string>>();
// feriados bancários nacionais: fixos, Carnaval, Sexta-feira Santa e Corpus Christi
export function feriados(ano: number): Set<string> {
  let s = feriadosCache.get(ano);
  if (s) return s;
  const p = pascoa(ano).getTime();
  const movel = (dias: number) => new Date(p + dias * DIA_MS).toISOString().slice(0, 10);
  s = new Set([
    ...['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map((md) => `${ano}-${md}`),
    movel(-48), movel(-47), movel(-2), movel(60),
  ]);
  feriadosCache.set(ano, s);
  return s;
}

const diaUtil = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  const semana = d.getUTCDay();
  return semana !== 0 && semana !== 6 && !feriados(d.getUTCFullYear()).has(iso);
};

// N dias úteis depois da data (a própria data não conta)
export function diasUteisDepois(iso: string, n: number): string {
  let d = new Date(`${iso}T12:00:00Z`);
  let faltam = n;
  while (faltam > 0) {
    d = new Date(d.getTime() + DIA_MS);
    if (diaUtil(d.toISOString().slice(0, 10))) faltam--;
  }
  return d.toISOString().slice(0, 10);
}

export const taxaDe = (brutoCentavos: number) => Math.round((brutoCentavos * REGRAS.taxaPercentual) / 100);
