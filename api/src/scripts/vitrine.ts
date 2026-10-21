// Perfis fictícios para mostrar o produto: profissionais aprovadas em várias cidades, com
// tarefas, horários e avaliações de famílias também fictícias. Diferente do seed, roda no
// banco de produção (DATABASE_URL) e só mexe nas contas @vitrine.minhacompanhia.test.
//   npm run vitrine              cria (ou recria) os perfis
//   npm run vitrine -- --remover  apaga todos
// Usa SQL só com colunas que já estão no main e não roda migrations no Postgres, para
// funcionar mesmo quando o código local está à frente do banco.
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { gerarHashSenha } from '../auth.js';
import { abrirBanco } from '../db/index.js';
import { slugDoNome } from '../rotas/contas.js';

const DOMINIO = 'vitrine.minhacompanhia.test';
const remover = process.argv.includes('--remover');

type Tarefa = 'consulta' | 'banco' | 'mercado' | 'passeio';
// Turnos: m (7h às 12h), t (12h às 18h), n (18h às 22h).
const PROFISSIONAIS: {
  id: string; nome: string; cidade: string; uf: string; bairros: string[]; valor: number; desconto?: [number, number];
  minimo: number; veiculo: boolean; outras?: boolean; dias: number[]; turnos: string; tarefas: Tarefa[]; anos: number; apresentacao: string;
  notas: number[];
}[] = [
  {
    id: 'beatriz', nome: 'Beatriz Andrade', cidade: 'Campinas', uf: 'SP', bairros: ['Cambuí', 'Centro'], valor: 85, desconto: [4, 75], minimo: 2,
    veiculo: true, outras: true, dias: [1, 2, 3, 4, 5], turnos: 'mt', tarefas: ['consulta', 'banco', 'mercado', 'passeio'], anos: 12,
    apresentacao: 'Técnica de enfermagem por dez anos, hoje acompanho pessoas idosas em consultas, exames e no dia a dia. Levo no meu carro e espero junto até o fim.',
    notas: [5, 5, 5, 4, 5],
  },
  {
    id: 'helio', nome: 'Hélio Batista', cidade: 'Campinas', uf: 'SP', bairros: ['Barão Geraldo', 'Taquaral'], valor: 75, minimo: 2,
    veiculo: true, dias: [1, 2, 3, 4, 5, 6], turnos: 'm', tarefas: ['consulta', 'banco'], anos: 7,
    apresentacao: 'Aposentado do Banco do Brasil. Ajudo com banco, cartório e INSS, e acompanho em consultas pela manhã.',
    notas: [5, 4, 5],
  },
  {
    id: 'irene', nome: 'Irene Cardoso', cidade: 'Campinas', uf: 'SP', bairros: ['Guanabara', 'Castelo'], valor: 72, minimo: 2,
    veiculo: false, outras: true, dias: [0, 2, 4, 6], turnos: 'tn', tarefas: ['mercado', 'passeio'], anos: 4,
    apresentacao: 'Gosto de conversar e de caminhar sem pressa. Faço companhia em casa, no mercado e em passeios à tarde.',
    notas: [5, 5],
  },
  {
    id: 'denise', nome: 'Denise Vasconcelos', cidade: 'São Paulo', uf: 'SP', bairros: ['Perdizes', 'Pinheiros', 'Lapa'], valor: 95, desconto: [5, 85], minimo: 3,
    veiculo: true, dias: [1, 2, 3, 4, 5], turnos: 'mt', tarefas: ['consulta', 'banco', 'mercado'], anos: 15,
    apresentacao: 'Cuidadora formada pelo Senac, com curso de primeiros socorros. Acompanho em hospitais grandes e sei me virar nas recepções.',
    notas: [5, 5, 5, 5, 4, 5],
  },
  {
    id: 'mauricio', nome: 'Maurício Teixeira', cidade: 'São Paulo', uf: 'SP', bairros: ['Santana', 'Tucuruvi'], valor: 80, minimo: 2,
    veiculo: false, dias: [1, 3, 5, 6], turnos: 'mt', tarefas: ['consulta', 'banco', 'passeio'], anos: 5,
    apresentacao: 'Acompanho de metrô ou táxi, no ritmo de quem vai comigo. Tenho paciência com fila e com papelada.',
    notas: [4, 5, 5],
  },
  {
    id: 'glaucia', nome: 'Gláucia Monteiro', cidade: 'Rio de Janeiro', uf: 'RJ', bairros: ['Laranjeiras', 'Flamengo', 'Botafogo'], valor: 85, minimo: 2,
    veiculo: false, outras: true, dias: [1, 2, 3, 4, 5, 6], turnos: 'mt', tarefas: ['consulta', 'mercado', 'passeio'], anos: 9,
    apresentacao: 'Cuidei da minha mãe por oito anos e foi assim que comecei. Hoje acompanho em consultas, compras e passeios pela orla.',
    notas: [5, 5, 4, 5],
  },
  {
    id: 'otavio', nome: 'Otávio Rezende', cidade: 'Belo Horizonte', uf: 'MG', bairros: ['Funcionários', 'Lourdes', 'Sion'], valor: 78, minimo: 2,
    veiculo: true, dias: [1, 2, 3, 4, 5], turnos: 'mtn', tarefas: ['consulta', 'banco', 'mercado'], anos: 8,
    apresentacao: 'Busco em casa, levo e trago de volta. Atendo também no começo da noite, para quem tem exame tarde.',
    notas: [5, 4, 4, 5],
  },
  {
    id: 'rosangela', nome: 'Rosângela Prates', cidade: 'Curitiba', uf: 'PR', bairros: ['Batel', 'Bigorrilho', 'Centro'], valor: 76, minimo: 2,
    veiculo: false, dias: [1, 2, 3, 4, 5], turnos: 'm', tarefas: ['consulta', 'mercado', 'passeio'], anos: 6,
    apresentacao: 'Acompanho em consultas e exames de manhã. Anoto tudo o que o médico fala e mando para a família no fim.',
    notas: [5, 5, 5],
  },
  {
    id: 'neusa', nome: 'Neusa Kieling', cidade: 'Porto Alegre', uf: 'RS', bairros: ['Moinhos de Vento', 'Bom Fim'], valor: 74, minimo: 2,
    veiculo: true, dias: [1, 2, 3, 4, 5, 6], turnos: 'mt', tarefas: ['consulta', 'banco', 'mercado', 'passeio'], anos: 11,
    apresentacao: 'Fui auxiliar de farmácia muitos anos. Ajudo a organizar remédios, receitas e as idas ao médico.',
    notas: [5, 5, 4],
  },
  {
    id: 'edvaldo', nome: 'Edvaldo Cavalcanti', cidade: 'Recife', uf: 'PE', bairros: ['Boa Viagem', 'Pina'], valor: 70, minimo: 2,
    veiculo: true, dias: [1, 2, 3, 4, 5], turnos: 'mt', tarefas: ['consulta', 'banco'], anos: 6,
    apresentacao: 'Motorista de confiança da família há anos. Levo em consultas e no banco, com calma e pontualidade.',
    notas: [5, 4],
  },
  {
    id: 'jussara', nome: 'Jussara Brito', cidade: 'Salvador', uf: 'BA', bairros: ['Barra', 'Graça', 'Ondina'], valor: 72, minimo: 2,
    veiculo: false, outras: true, dias: [1, 2, 3, 4, 5, 6], turnos: 'mt', tarefas: ['consulta', 'mercado', 'passeio'], anos: 10,
    apresentacao: 'Acompanho com carinho e atenção. Faço companhia em casa, em consultas e em passeios pela Barra.',
    notas: [5, 5, 5, 5],
  },
  {
    id: 'wagner', nome: 'Wagner Peixoto', cidade: 'Brasília', uf: 'DF', bairros: ['Asa Sul', 'Sudoeste', 'Lago Sul'], valor: 88, desconto: [4, 80], minimo: 3,
    veiculo: true, dias: [1, 2, 3, 4, 5], turnos: 'mt', tarefas: ['consulta', 'banco'], anos: 13,
    apresentacao: 'Socorrista do Corpo de Bombeiros, aposentado. Acompanho em consultas, exames e procedimentos com sedação.',
    notas: [5, 5, 4, 5],
  },
];

// famílias que avaliam; cada avaliação vira um atendimento feito com uma delas
const FAMILIAS = [
  { id: 'camila', nome: 'Camila Duarte', pessoa: 'Lourdes Duarte' },
  { id: 'eduardo', nome: 'Eduardo Nogueira', pessoa: 'Antônio Nogueira' },
  { id: 'priscila', nome: 'Priscila Lacerda', pessoa: 'Zilda Lacerda' },
  { id: 'gustavo', nome: 'Gustavo Amaral', pessoa: 'Iracema Amaral' },
  { id: 'leticia', nome: 'Letícia Bastos', pessoa: 'Olga Bastos' },
];
const COMENTARIOS: Record<number, string[]> = {
  5: [
    'Pontual e muito cuidadosa com a minha mãe.',
    'Explicou tudo o que o médico falou. Recomendo.',
    'Meu pai voltou animado do passeio. Vamos chamar de novo.',
    'Paciência de sobra na fila do banco. Resolveu tudo.',
    'Mandou mensagem no fim com o resumo da consulta. Muito atenciosa.',
    'Chegou antes da hora e esperou junto até o fim do exame.',
  ],
  4: ['Tudo certo, só atrasou uns minutos por causa do trânsito.', 'Atenciosa e educada. Recomendo.'],
};
const TAREFA = { consulta: 'Consulta médica', banco: 'Banco', mercado: 'Mercado e farmácia', passeio: 'Passeio' } as const;

const emailDe = (id: string) => `${id}@${DOMINIO}`;
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const agora = new Date();
const hojeBrasilia = new Date(agora.getTime() - 3 * HORA);
// dia relativo a hoje, numa hora cheia do horário de Brasília
const em = (dias: number, hora: number) =>
  new Date(Date.UTC(hojeBrasilia.getUTCFullYear(), hojeBrasilia.getUTCMonth(), hojeBrasilia.getUTCDate() + dias, hora + 3));
const data = (d: Date) => d.toISOString().slice(0, 10);

// turnos contínuos viram uma faixa só (mt = 7h às 18h); manhã e noite ficam em duas
const TURNO = { m: [7, 12], t: [12, 18], n: [18, 22] } as const;
const faixas = (turnos: string) => {
  const juntas: [number, number][] = [];
  for (const t of turnos) {
    const [ini, fim] = TURNO[t as keyof typeof TURNO];
    const ultima = juntas.at(-1);
    if (ultima && ultima[1] === ini) ultima[1] = fim;
    else juntas.push([ini, fim]);
  }
  return juntas;
};

// o PGlite local precisa das tabelas; o Postgres de produção já é migrado no deploy
const url = process.env.DATABASE_URL ?? './.data/pglite';
const banco = await abrirBanco(url, { migrar: !/^postgres(ql)?:\/\//.test(url) });
// senha aleatória e descartada: ninguém entra nessas contas
const senhaHash = await gerarHashSenha(randomUUID());

await banco.db.transaction(async (tx) => {
  const linhas = async <T>(q: ReturnType<typeof sql>) => ((await tx.execute(q)) as unknown as { rows: T[] }).rows;
  const antigos = await linhas<{ id: string }>(sql`select id from usuarios where lower(email) like ${'%@' + DOMINIO}`);
  if (antigos.length) {
    const ids = sql.join(antigos.map((u) => sql`${u.id}::uuid`), sql`, `);
    await tx.execute(sql`delete from servicos where contratante_id in (${ids}) or profissional_id in (${ids})`);
    await tx.execute(sql`delete from usuarios where id in (${ids})`);
  }
  if (remover) {
    console.log(`${antigos.length} contas da vitrine apagadas.`);
    return;
  }

  const conta = async (nome: string, email: string, celular: string) => {
    const [u] = await linhas<{ id: string }>(sql`
      insert into usuarios (nome, email, celular, senha_hash, termos_aceitos_em, email_verificado_em, celular_verificado_em, criado_em)
      values (${nome}, ${email}, ${celular}, ${senhaHash}, ${em(-60, 10)}, ${em(-60, 10)}, ${em(-60, 10)}, ${em(-60, 10)})
      returning id`);
    return u!.id;
  };

  const familias = [];
  for (const [n, f] of FAMILIAS.entries()) {
    const id = await conta(f.nome, emailDe(f.id), `1192222${String(n).padStart(4, '0')}`);
    await tx.execute(sql`insert into contratantes (usuario_id) values (${id})`);
    const [p] = await linhas<{ id: string }>(sql`
      insert into pessoas_acompanhadas (contratante_id, nome) values (${id}, ${f.pessoa}) returning id`);
    familias.push({ id, pessoaId: p!.id });
  }

  let k = 0;
  for (const [n, p] of PROFISSIONAIS.entries()) {
    const id = await conta(p.nome, emailDe(p.id), `1191111${String(n).padStart(4, '0')}`);
    const [aPartir, valorDesconto] = p.desconto ?? [null, null];
    await tx.execute(sql`
      insert into profissionais (usuario_id, slug, cidade, uf, bairros, apresentacao, valor_hora_centavos, desconto_a_partir_horas,
        valor_hora_desconto_centavos, horas_minimas, veiculo_incluso, aceita_outras, anos_experiencia, situacao, revisado_em,
        proxima_revisao, aprovado_em)
      values (${id}, ${slugDoNome(p.nome)}, ${p.cidade}, ${p.uf}, ${sql.param(p.bairros)}::text[], ${p.apresentacao}, ${p.valor * 100}, ${aPartir},
        ${valorDesconto === null ? null : valorDesconto * 100}, ${p.minimo}, ${p.veiculo}, ${p.outras ?? false}, ${p.anos}, 'aprovado',
        ${data(em(-5 - (n % 20), 12))}, ${data(em(25 - (n % 20), 12))}, ${em(-50, 12)})`);
    for (const [ordem, tipo] of p.tarefas.entries()) {
      await tx.execute(sql`
        insert into tarefas_profissional (profissional_id, tipo, minimo_horas, ordem) values (${id}, ${tipo}, ${p.minimo}, ${ordem})`);
    }
    for (const d of p.dias) {
      for (const [ini, fim] of faixas(p.turnos)) {
        await tx.execute(sql`
          insert into disponibilidade (profissional_id, dia, inicio_min, fim_min) values (${id}, ${d}, ${ini * 60}, ${fim * 60})`);
      }
    }

    // atendimentos feitos há mais de duas semanas, avaliados pelos dois lados
    for (const [i, nota] of p.notas.entries()) {
      const familia = familias[(n + i) % familias.length]!;
      const tipo = p.tarefas[i % p.tarefas.length]!;
      const horas = Math.max(p.minimo, 2 + (i % 2));
      const inicio = em(-18 - i * 9 - (n % 5), 8 + (i % 3) * 2);
      const comentarios = COMENTARIOS[nota]!;
      const [s] = await linhas<{ id: string }>(sql`
        insert into servicos (contratante_id, profissional_id, pessoa_acompanhada_id, tarefa, tipo_tarefa, inicio, horas,
          valor_hora_centavos, situacao, realizado_em, criado_em)
        values (${familia.id}, ${id}, ${familia.pessoaId}, ${TAREFA[tipo]}, ${tipo}, ${inicio}, ${horas}, ${p.valor * 100},
          'realizado', ${new Date(inicio.getTime() + horas * HORA)}, ${new Date(inicio.getTime() - 3 * DIA)})
        returning id`);
      const avaliadoEm = new Date(inicio.getTime() + DIA);
      await tx.execute(sql`
        insert into avaliacoes (servico_id, autor_id, avaliado_id, sentido, nota, comentario, criado_em) values
          (${s!.id}, ${familia.id}, ${id}, 'familia_avalia_profissional', ${nota}, ${comentarios[k++ % comentarios.length]!}, ${avaliadoEm}),
          (${s!.id}, ${id}, ${familia.id}, 'profissional_avalia_familia', 5, ${'Família atenciosa, tudo combinado com clareza.'}, ${avaliadoEm})`);
    }
  }
  console.log(`${PROFISSIONAIS.length} profissionais e ${FAMILIAS.length} famílias da vitrine criadas (@${DOMINIO}).`);
});

await banco.fechar();
