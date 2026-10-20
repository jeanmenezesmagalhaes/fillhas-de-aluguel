// Dados de demonstração para desenvolvimento. Nunca roda em produção.
// Profissionais: Ana Oliveira e Cláudia Ramos, aprovadas. Famílias: Mariana Costa (mãe Helena)
// e Rafael Souza (mãe Dirce). Pedidos em todas as situações, com datas contadas a partir de hoje.
import { inArray, or, sql } from 'drizzle-orm';
import { gerarHashSenha } from '../auth.js';
import { abrirBanco } from '../db/index.js';
import { avaliacoes, contratantes, pessoasAcompanhadas, profissionais, servicos, usuarios } from '../db/schema.js';

if (process.env.NODE_ENV === 'production') {
  console.error('O seed só roda fora de produção.');
  process.exit(1);
}

// senha das contas de demonstração (só para o banco local)
const SENHA_DEMO = 'demonstracao-local';
const EMAILS = ['ana', 'claudia', 'mariana', 'rafael'].map((n) => `${n}@demo.minhacompanhia.test`);

// dia relativo a hoje, numa hora cheia do horário de Brasília (UTC-3, sem horário de verão)
const HORA = 60 * 60 * 1000;
const hoje = new Date(Date.now() - 3 * HORA);
const em = (dias: number, hora: number) =>
  new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + dias, hora + 3));
const dia = (d: Date) => d.toISOString().slice(0, 10);

const banco = await abrirBanco();
const senhaHash = await gerarHashSenha(SENHA_DEMO);
const agora = new Date();

await banco.db.transaction(async (tx) => {
  const antigos = await tx
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(sql`lower(${usuarios.email}) in ${EMAILS}`);
  if (antigos.length) {
    const ids = antigos.map((u) => u.id);
    await tx.delete(servicos).where(or(inArray(servicos.contratanteId, ids), inArray(servicos.profissionalId, ids)));
    await tx.delete(usuarios).where(inArray(usuarios.id, ids));
  }

  const conta = async (nome: string, email: string, celular: string) => {
    const [u] = await tx.insert(usuarios).values({ nome, email, celular, senhaHash, termosAceitosEm: agora }).returning({ id: usuarios.id });
    return u!.id;
  };

  const ana = await conta('Ana Oliveira', EMAILS[0]!, '19988880000');
  await tx.insert(profissionais).values({
    usuarioId: ana,
    slug: 'ana-oliveira',
    cidade: 'Campinas',
    uf: 'SP',
    bairros: ['Cambuí', 'Taquaral'],
    apresentacao: 'Acompanho pessoas idosas em consultas, exames, banco e compras há 6 anos.',
    valorHoraCentavos: 7000,
    horasMinimas: 2,
    veiculoIncluso: true,
    situacao: 'aprovado',
    revisadoEm: dia(em(-19, 12)),
    proximaRevisao: dia(em(11, 12)),
  });

  const claudia = await conta('Cláudia Ramos', EMAILS[1]!, '19977770000');
  await tx.insert(profissionais).values({
    usuarioId: claudia,
    slug: 'claudia-ramos',
    cidade: 'Campinas',
    uf: 'SP',
    bairros: ['Taquaral'],
    valorHoraCentavos: 7000,
    horasMinimas: 1,
    veiculoIncluso: false,
    situacao: 'aprovado',
    revisadoEm: dia(em(-15, 12)),
    proximaRevisao: dia(em(15, 12)),
  });

  const mariana = await conta('Mariana Costa', EMAILS[2]!, '19999990000');
  await tx.insert(contratantes).values({ usuarioId: mariana });
  const [helena] = await tx
    .insert(pessoasAcompanhadas)
    .values({ contratanteId: mariana, nome: 'Helena Costa', dataNascimento: '1948-03-02', observacoes: 'Caminha devagar.' })
    .returning({ id: pessoasAcompanhadas.id });

  const rafael = await conta('Rafael Souza', EMAILS[3]!, '19966660000');
  await tx.insert(contratantes).values({ usuarioId: rafael });
  const [dirce] = await tx
    .insert(pessoasAcompanhadas)
    .values({ contratanteId: rafael, nome: 'Dirce Souza', dataNascimento: '1944-05-10' })
    .returning({ id: pessoasAcompanhadas.id });

  const base = { valorHoraCentavos: 7000 };
  const doMariana = { contratanteId: mariana, pessoaAcompanhadaId: helena!.id };
  const doRafael = { contratanteId: rafael, pessoaAcompanhadaId: dirce!.id };
  const feitos = await tx
    .insert(servicos)
    .values([
      { ...base, ...doRafael, profissionalId: ana, tarefa: 'Banco', local: 'Agência Centro', inicio: em(10, 14), horas: 2 },
      {
        ...base, ...doMariana, profissionalId: ana, tarefa: 'Consulta médica', local: 'Clínica Viva Mais, Centro',
        observacoes: 'Helena caminha devagar. Levar os exames anteriores, na pasta azul da sala.', inicio: em(8, 9), horas: 4,
      },
      {
        ...base, ...doMariana, profissionalId: claudia, tarefa: 'Mercado e farmácia', local: 'Rua Maria Monteiro, 120',
        inicio: em(11, 9), horas: 2, situacao: 'proposta_alterada', propostaInicio: em(11, 10), propostaHoras: 2,
        propostaRecado: 'Às 9h tenho outro atendimento. Às 10h consigo ir com calma.',
      },
      { ...base, ...doRafael, profissionalId: ana, tarefa: 'Exame de imagem', local: 'Hospital Vera Cruz', inicio: em(2, 8), horas: 3, situacao: 'confirmado' },
      { ...base, ...doMariana, profissionalId: ana, tarefa: 'Passeio no Taquaral', inicio: em(-1, 10), horas: 2, situacao: 'confirmado' },
      { ...base, ...doMariana, profissionalId: ana, tarefa: 'Banco', inicio: em(-6, 10), horas: 2, situacao: 'realizado', realizadoEm: em(-6, 12) },
      { ...base, ...doRafael, profissionalId: ana, tarefa: 'Consulta médica', inicio: em(-11, 8), horas: 4, situacao: 'realizado', realizadoEm: em(-11, 12) },
    ])
    .returning({ id: servicos.id });

  const consultaDoRafael = feitos[6]!.id;
  await tx.insert(avaliacoes).values([
    { servicoId: consultaDoRafael, autorId: rafael, avaliadoId: ana, sentido: 'familia_avalia_profissional', nota: 5, comentario: 'Pontual e cuidadosa com a minha mãe.' },
    { servicoId: consultaDoRafael, autorId: ana, avaliadoId: rafael, sentido: 'profissional_avalia_familia', nota: 5, comentario: 'Tudo combinado com clareza.' },
  ]);
});

await banco.fechar();
console.log(`Contas de demonstração: ${EMAILS.join(', ')} (senha em src/scripts/seed.ts).`);
