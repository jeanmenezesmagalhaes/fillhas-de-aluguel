import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { temContato, MSG_CONTATO } from './validacao.js';
import type { Db } from './db/index.js';
import { tarefasProfissional } from './db/schema.js';

export const TIPOS_FIXOS = ['consulta', 'banco', 'mercado', 'passeio'] as const;
export type TipoTarefa = (typeof TIPOS_FIXOS)[number] | 'personalizada';

export const NOME_TAREFA: Record<(typeof TIPOS_FIXOS)[number], string> = {
  consulta: 'Consulta ou exame',
  banco: 'Banco ou cartório',
  mercado: 'Mercado e farmácia',
  passeio: 'Passeio',
};

export const MAX_TAREFAS = 10;

const horasTexto = (n: number) => `${n} ${n === 1 ? 'hora' : 'horas'}`;

const tarefa = z.object({
  tipo: z.enum([...TIPOS_FIXOS, 'personalizada'], { error: 'Escolha a tarefa.' }),
  nome: z.string().trim().optional(),
  minimoHoras: z
    .number({ error: 'Informe o mínimo de horas.' })
    .int('Use horas inteiras.')
    .min(1, 'O mínimo é 1 hora.')
    .max(12, 'O mínimo pode ser de até 12 horas.'),
});

// lista que a profissional salva: fixas sem repetir; personalizadas com nome, sem repetir nome
export const listaDeTarefas = z
  .array(tarefa)
  .max(MAX_TAREFAS, `Cadastre no máximo ${MAX_TAREFAS} tarefas.`)
  .superRefine((lista, c) => {
    const fixas = new Set<string>();
    const nomes = new Set<string>();
    lista.forEach((t, i) => {
      if (t.tipo === 'personalizada') {
        const nome = t.nome ?? '';
        if (nome.length < 2 || nome.length > 60) {
          c.addIssue({ code: 'custom', path: [i, 'nome'], message: 'Dê um nome à atividade, com 2 a 60 caracteres.' });
          return;
        }
        if (temContato(nome)) c.addIssue({ code: 'custom', path: [i, 'nome'], message: MSG_CONTATO });
        const chave = nome.toLocaleLowerCase('pt-BR');
        if (nomes.has(chave)) c.addIssue({ code: 'custom', path: [i, 'nome'], message: 'Você já tem uma atividade com este nome.' });
        nomes.add(chave);
      } else {
        if (fixas.has(t.tipo)) c.addIssue({ code: 'custom', path: [i, 'tipo'], message: 'Esta tarefa já está na lista.' });
        fixas.add(t.tipo);
      }
    });
  });

export type ListaDeTarefas = z.infer<typeof listaDeTarefas>;

// fixas na ordem da plataforma, depois as personalizadas na ordem em que ela pôs
export async function tarefasDe(db: Db, profissionalId: string) {
  const linhas = await db
    .select({ tipo: tarefasProfissional.tipo, nome: tarefasProfissional.nome, minimoHoras: tarefasProfissional.minimoHoras, ordem: tarefasProfissional.ordem })
    .from(tarefasProfissional)
    .where(eq(tarefasProfissional.profissionalId, profissionalId))
    .orderBy(asc(tarefasProfissional.ordem));
  const posicao = (t: { tipo: string; ordem: number }) => {
    const i = (TIPOS_FIXOS as readonly string[]).indexOf(t.tipo);
    return i >= 0 ? i : TIPOS_FIXOS.length + t.ordem;
  };
  return linhas
    .sort((a, b) => posicao(a) - posicao(b))
    .map((t) => ({ tipo: t.tipo, nome: t.tipo === 'personalizada' ? t.nome! : NOME_TAREFA[t.tipo], minimoHoras: t.minimoHoras }));
}

// troca a lista inteira, dentro da transação de quem chama
export async function salvarTarefas(tx: Db, profissionalId: string, lista: ListaDeTarefas) {
  await tx.delete(tarefasProfissional).where(eq(tarefasProfissional.profissionalId, profissionalId));
  if (lista.length) {
    await tx.insert(tarefasProfissional).values(
      lista.map((t, i) => ({
        profissionalId,
        tipo: t.tipo,
        nome: t.tipo === 'personalizada' ? t.nome! : null,
        minimoHoras: t.minimoHoras,
        ordem: i,
      })),
    );
  }
}

export const mensagemAbaixoDoMinimo = (nome: string, minimo: number) =>
  `Para ${nome.toLocaleLowerCase('pt-BR')}, esta profissional atende a partir de ${horasTexto(minimo)}.`;
