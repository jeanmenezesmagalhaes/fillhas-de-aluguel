import { z } from 'zod';

export const VALOR_HORA_MINIMO_CENTAVOS = 7000;

export const nome = z
  .string({ error: 'Digite seu nome.' })
  .trim()
  .min(2, 'Digite seu nome.')
  .max(120, 'Use no máximo 120 caracteres.');

export const email = z
  .string({ error: 'Digite seu e-mail.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Digite um e-mail válido, como nome@exemplo.com.').max(254));

// Guarda só os dígitos: DDD + número, 10 ou 11 dígitos.
export const celular = z
  .string({ error: 'Digite o celular com DDD.' })
  .transform((v) => v.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''))
  .pipe(z.string().regex(/^[1-9]{2}9?\d{8}$/, 'Digite o celular com DDD.'));

export const senhaNova = z
  .string({ error: 'Crie uma senha.' })
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .max(200, 'Use no máximo 200 caracteres.');

export const aceitaTermos = z.literal(true, {
  error: 'Para criar a conta, aceite os termos de uso e a política de privacidade.',
});

export const dataIso = z.iso.date('Use a data no formato AAAA-MM-DD.');

export const uuid = z.uuid('Identificador inválido.');

export const valorHoraCentavos = z
  .number({ error: 'Informe o valor da hora.' })
  .int('Informe o valor em centavos, sem casas decimais.')
  .min(VALOR_HORA_MINIMO_CENTAVOS, 'O valor mínimo da hora é R$ 70.')
  .max(100_000, 'Confira o valor da hora.');

const soDigitos = (v: string) => v.replace(/\D/g, '');

// dígitos verificadores do CPF (módulo 11); sequências como 111.111.111-11 não valem
export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10]);
}

export function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((t, p, i) => t + Number(cnpj[i]) * p, 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(cnpj[12]) && dv(13) === Number(cnpj[13]);
}

export const cpf = z
  .string({ error: 'Informe seu CPF.' })
  .transform(soDigitos)
  .refine(cpfValido, 'Confira o CPF: os números não batem.');

export const cnpj = z
  .string()
  .transform(soDigitos)
  .refine(cnpjValido, 'Confira o CNPJ: os números não batem.');

export const cep = z
  .string({ error: 'Informe o CEP.' })
  .transform(soDigitos)
  .pipe(z.string().regex(/^\d{8}$/, 'O CEP tem 8 números.'));

export const uf = z
  .string({ error: 'Informe o estado.' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Use a sigla do estado, como SP.');

// Chave Pix para o repasse, já no formato que o gateway espera: CPF e CNPJ só com números,
// celular com DDD (sem +55), e-mail em minúsculas e chave aleatória como UUID.
export const chavePix = z
  .object({
    tipo: z.enum(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM'], { error: 'Escolha o tipo da chave Pix.' }),
    chave: z.string({ error: 'Informe a chave Pix.' }).trim().min(1, 'Informe a chave Pix.').max(120),
  })
  .transform((p, c) => {
    const erro = (m: string) => {
      c.addIssue({ code: 'custom', path: ['chave'], message: m });
      return z.NEVER;
    };
    const d = soDigitos(p.chave);
    switch (p.tipo) {
      case 'CPF':
        return cpfValido(d) ? { tipo: p.tipo, chave: d } : erro('Confira o CPF: os números não batem.');
      case 'CNPJ':
        return cnpjValido(d) ? { tipo: p.tipo, chave: d } : erro('Confira o CNPJ: os números não batem.');
      case 'PHONE': {
        const n = d.length > 11 && d.startsWith('55') ? d.slice(2) : d;
        return /^\d{10,11}$/.test(n) ? { tipo: p.tipo, chave: n } : erro('Use o celular com DDD, como (19) 99999-0000.');
      }
      case 'EMAIL':
        return z.email().safeParse(p.chave.toLowerCase()).success ? { tipo: p.tipo, chave: p.chave.toLowerCase() } : erro('Confira o e-mail.');
      case 'RANDOM':
        return z.uuid().safeParse(p.chave.toLowerCase()).success ? { tipo: p.tipo, chave: p.chave.toLowerCase() } : erro('A chave aleatória tem 32 letras e números, separados por traços.');
    }
  });

// "123.456.789-09" vira "***.456.789-**": basta para a pessoa reconhecer o próprio CPF
export const mascararCpf = (c: string) => `***.${c.slice(3, 6)}.${c.slice(6, 9)}-**`;
export const mascararCnpj = (c: string) => `${c.slice(0, 2)}.***.***/${c.slice(8, 12)}-**`;

// Telefone, e-mail ou link em texto livre que a outra parte lê: barrado para que ninguém
// combine o serviço por fora da plataforma.
export const MSG_CONTATO = 'Não coloque telefone, e-mail ou link aqui.';
const RE_EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const RE_LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|me|app|link|ly|site|info)\b)/i;
export function temContato(t: string): boolean {
  if (RE_EMAIL.test(t) || RE_LINK.test(t)) return true;
  // 8 dígitos ou mais seguidos, aceitando espaço, ponto, hífen, parênteses e +
  for (const m of t.matchAll(/[\d()+\-.\s]{8,}/g)) if (m[0].replace(/\D/g, '').length >= 8) return true;
  return false;
}
export const semContato = <T extends z.ZodType<string | undefined | null>>(s: T) =>
  s.refine((t) => !t || !temContato(t), MSG_CONTATO);
