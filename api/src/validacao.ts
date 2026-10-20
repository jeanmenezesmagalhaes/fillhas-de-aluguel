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
