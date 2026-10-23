// Dados de demonstração para desenvolvimento. Nunca roda em produção.
// Profissionais: Ana Oliveira e Cláudia Ramos, aprovadas; Joana Prado na lista de espera, com
// documentos enviados e indicada pela Ana. Famílias: Mariana Costa (mãe Helena) e Rafael Souza
// (mãe Dirce). Equipe Minha Companhia com acesso de administração. Pedidos em todas as
// situações, com datas contadas a partir de hoje, e pagamentos simulados dos confirmados e feitos.
import { createHash, randomUUID } from 'node:crypto';
import { inArray, or, sql } from 'drizzle-orm';
import { armazenamentoEmDisco } from '../armazenamento.js';
import { gerarHashSenha } from '../auth.js';
import { slugDoNome } from '../rotas/contas.js';
import { abrirBanco } from '../db/index.js';
import { avaliacoes, contratantes, disponibilidade, documentos, indicacoes, pagamentos, pessoasAcompanhadas, profissionais, qualificacoes, servicos, tarefasProfissional, usuarios } from '../db/schema.js';

// A conta da equipe tem senha conhecida: com um Postgres que não seja desta máquina (o Neon
// do .env.local, por exemplo), o seed criaria um administrador aberto em produção.
const destino = process.env.DATABASE_URL ?? '';
const postgresRemoto = /^postgres(ql)?:\/\//.test(destino) && !/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(destino);
if (process.env.NODE_ENV === 'production' || process.env.VERCEL || postgresRemoto) {
  console.error('O seed só roda fora de produção, no PGlite ou num Postgres local.');
  process.exit(1);
}

// senha das contas de demonstração (só para o banco local)
const SENHA_DEMO = 'demonstracao-local';
// Demais profissionais da listagem de exemplo (docs/gera_busca.py), aprovadas e no ar, em
// várias cidades. Turnos: m (7h às 12h), t (12h às 18h), n (18h às 22h).
const LISTAGEM = [
  { id: 'marta', nome: 'Marta Ferreira', cidade: 'Campinas', uf: 'SP', bairros: ["Centro", "Bosque"], valor: 75, minimo: 3, veiculo: true, dias: [1,2,3,4,5], turnos: 'm', tarefas: ["consulta", "banco"] as const, anos: 9 },
  { id: 'roberto', nome: 'Roberto Lima', cidade: 'Campinas', uf: 'SP', bairros: ["Barão Geraldo"], valor: 80, minimo: 2, veiculo: true, dias: [1,2,3,4,5], turnos: 'mt', tarefas: ["consulta", "banco", "mercado"] as const, anos: 8 },
  { id: 'luciana', nome: 'Luciana Alves', cidade: 'Campinas', uf: 'SP', bairros: ["Nova Campinas", "Cambuí"], valor: 85, minimo: 3, veiculo: true, dias: [1,2,3,4,5], turnos: 'mt', tarefas: ["consulta", "banco", "mercado", "passeio"] as const, anos: 11 },
  { id: 'patricia', nome: 'Patrícia Gomes', cidade: 'Campinas', uf: 'SP', bairros: ["Castelo", "Guanabara"], valor: 72, minimo: 2, veiculo: false, dias: [0,1,2,3,4,5,6], turnos: 'm', tarefas: ["consulta", "mercado"] as const, anos: 2 },
  { id: 'sonia', nome: 'Sônia Martins', cidade: 'Campinas', uf: 'SP', bairros: ["Sousas"], valor: 90, minimo: 4, veiculo: true, dias: [1,2,4,5], turnos: 'mt', tarefas: ["consulta", "passeio"] as const, anos: 14 },
  { id: 'paulo', nome: 'Paulo Mendes', cidade: 'Campinas', uf: 'SP', bairros: ["Centro", "Guanabara"], valor: 70, minimo: 1, veiculo: true, dias: [1,2,3,4,5,6], turnos: 'tn', tarefas: ["banco", "mercado"] as const, anos: 5 },
  { id: 'renata', nome: 'Renata Dias', cidade: 'Campinas', uf: 'SP', bairros: ["Taquaral", "Barão Geraldo"], valor: 78, minimo: 2, veiculo: false, dias: [1,2,3,4,5], turnos: 'mtn', tarefas: ["consulta", "banco", "mercado", "passeio"] as const, anos: 7 },
  { id: 'vera', nome: 'Vera Nunes', cidade: 'Campinas', uf: 'SP', bairros: ["Bosque", "Centro"], valor: 74, minimo: 2, veiculo: false, dias: [0,3,4,5,6], turnos: 't', tarefas: ["consulta", "passeio"] as const, anos: 6 },
  { id: 'elaine', nome: 'Elaine Rocha', cidade: 'Campinas', uf: 'SP', bairros: ["Castelo"], valor: 82, minimo: 2, veiculo: true, dias: [1,3,5,6], turnos: 'mn', tarefas: ["consulta", "mercado", "passeio"] as const, anos: 10 },
  { id: 'fernanda', nome: 'Fernanda Lopes', cidade: 'São Paulo', uf: 'SP', bairros: ["Pinheiros", "Vila Madalena"], valor: 90, minimo: 2, veiculo: false, dias: [1,2,3,4,5], turnos: 'mt', tarefas: ["consulta", "banco", "mercado", "passeio"] as const, anos: 9 },
  { id: 'carlos', nome: 'Carlos Henrique Souza', cidade: 'São Paulo', uf: 'SP', bairros: ["Moema", "Vila Mariana"], valor: 95, minimo: 3, veiculo: true, dias: [1,2,3,4,5,6], turnos: 'mt', tarefas: ["consulta", "banco", "mercado"] as const, anos: 12 },
  { id: 'juliana', nome: 'Juliana Freitas', cidade: 'São Paulo', uf: 'SP', bairros: ["Tatuapé", "Mooca"], valor: 80, minimo: 2, veiculo: false, dias: [2,3,4,5,6], turnos: 'tn', tarefas: ["consulta", "mercado", "passeio"] as const, anos: 5 },
  { id: 'adriana', nome: 'Adriana Matos', cidade: 'Rio de Janeiro', uf: 'RJ', bairros: ["Copacabana", "Botafogo"], valor: 85, minimo: 2, veiculo: false, dias: [1,2,3,4,5], turnos: 'mt', tarefas: ["consulta", "banco", "mercado", "passeio"] as const, anos: 8 },
  { id: 'marcia', nome: 'Márcia Pinto', cidade: 'Rio de Janeiro', uf: 'RJ', bairros: ["Tijuca"], valor: 75, minimo: 2, veiculo: true, dias: [1,2,3,4,5,6], turnos: 'm', tarefas: ["consulta", "banco"] as const, anos: 6 },
  { id: 'cristina', nome: 'Cristina Barbosa', cidade: 'Belo Horizonte', uf: 'MG', bairros: ["Savassi", "Funcionários"], valor: 78, minimo: 2, veiculo: true, dias: [1,2,3,4,5], turnos: 'mt', tarefas: ["consulta", "banco", "mercado", "passeio"] as const, anos: 10 },
  { id: 'simone', nome: 'Simone Ribeiro', cidade: 'Curitiba', uf: 'PR', bairros: ["Batel", "Água Verde"], valor: 76, minimo: 2, veiculo: false, dias: [1,2,3,4,5], turnos: 'mt', tarefas: ["consulta", "mercado", "passeio"] as const, anos: 7 },
  { id: 'lucia', nome: 'Lúcia Fernandes', cidade: 'Porto Alegre', uf: 'RS', bairros: ["Moinhos de Vento", "Petrópolis"], valor: 74, minimo: 2, veiculo: true, dias: [1,2,3,4,5], turnos: 'mt', tarefas: ["consulta", "banco"] as const, anos: 11 },
  { id: 'jose', nome: 'José Carlos Araújo', cidade: 'Recife', uf: 'PE', bairros: ["Boa Viagem"], valor: 70, minimo: 2, veiculo: true, dias: [1,2,3,4,5,6], turnos: 'mt', tarefas: ["consulta", "banco", "mercado"] as const, anos: 6 },
  { id: 'rita', nome: 'Rita Santana', cidade: 'Salvador', uf: 'BA', bairros: ["Barra", "Pituba"], valor: 72, minimo: 2, veiculo: false, dias: [1,2,3,4,5,6], turnos: 'mt', tarefas: ["consulta", "mercado", "passeio"] as const, anos: 9 },
  { id: 'tania', nome: 'Tânia Moreira', cidade: 'Brasília', uf: 'DF', bairros: ["Asa Sul", "Asa Norte"], valor: 88, minimo: 3, veiculo: true, dias: [1,2,3,4,5], turnos: 'mt', tarefas: ["consulta", "banco"] as const, anos: 13 },
];

const EMAILS = ['ana', 'claudia', 'mariana', 'rafael', 'joana', 'equipe', ...LISTAGEM.map((p) => p.id)].map((n) => `${n}@demo.minhacompanhia.test`);

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

  const conta = async (nome: string, email: string, celular: string, extra: Partial<typeof usuarios.$inferInsert> = {}) => {
    const [u] = await tx
      .insert(usuarios)
      .values({ nome, email, celular, senhaHash, termosAceitosEm: agora, emailVerificadoEm: agora, celularVerificadoEm: agora, ...extra })
      .returning({ id: usuarios.id });
    return u!.id;
  };
  // CPFs de teste (dígitos verificadores válidos, não pertencem a ninguém conhecido)
  const endereco = { cep: '13025320', logradouro: 'Rua Maria Monteiro', numero: '120', bairro: 'Cambuí', enderecoCidade: 'Campinas', enderecoUf: 'SP' };

  const ana = await conta('Ana Oliveira', EMAILS[0]!, '19988880000', { codigoIndicacao: 'ANA-DEMO' });
  await tx.insert(profissionais).values({
    usuarioId: ana,
    slug: 'ana-oliveira',
    cidade: 'Campinas',
    uf: 'SP',
    bairros: ['Cambuí', 'Taquaral'],
    apresentacao: 'Acompanho pessoas idosas em consultas, exames, banco e compras há 6 anos.',
    // R$ 80 a hora; a partir de 4 h, R$ 70 (decidido pelo usuário em 20/10/2026)
    valorHoraCentavos: 8000,
    descontoAPartirHoras: 4,
    valorHoraDescontoCentavos: 7000,
    horasMinimas: 1,
    veiculoIncluso: true,
    aceitaOutras: true,
    anosExperiencia: 6,
    situacao: 'aprovado',
    revisadoEm: dia(em(-19, 12)),
    proximaRevisao: dia(em(11, 12)),
    cpf: '10000000108',
    chavePix: '10000000108',
    tipoChavePix: 'CPF',
    ...endereco,
    aprovadoEm: em(-19, 12),
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
    cpf: '10000792012',
    ...endereco,
    aprovadoEm: em(-15, 12),
  });

  // Joana: cadastro completo, na lista de espera há dois dias, indicada pela Ana
  const joana = await conta('Joana Prado', EMAILS[4]!, '19955550000');
  await tx.insert(profissionais).values({
    usuarioId: joana,
    slug: 'joana-prado',
    cidade: 'Campinas',
    uf: 'SP',
    bairros: ['Cambuí'],
    valorHoraCentavos: 7000,
    horasMinimas: 2,
    situacao: 'em_analise',
    enviadoAnaliseEm: em(-2, 18),
    cpf: '10001583905',
    ...endereco,
    numero: '45',
  });
  await tx.insert(indicacoes).values({ indicadorId: ana, indicadoId: joana, codigo: 'ANA-DEMO', criadoEm: em(-3, 10) });
  const arquivos = armazenamentoEmDisco(process.env.PASTA_ARQUIVOS ?? './.data/arquivos');
  // arquivo PDF de demonstração, gravado no armazenamento local
  const pdf = async (nome: string) => {
    const dados = Buffer.from(`%PDF-1.4\n% documento de demonstração: ${nome}\n%%EOF\n`);
    const chave = randomUUID();
    await arquivos.salvar(chave, dados);
    return { arquivoChave: chave, nomeOriginal: nome, tipoArquivo: 'application/pdf', tamanho: dados.length, sha256: createHash('sha256').update(dados).digest('hex') };
  };
  for (const [tipo, nome] of [['documento_identidade', 'rg-joana.pdf'], ['comprovante_endereco', 'conta-de-luz.pdf']] as const) {
    await tx.insert(documentos).values({ profissionalId: joana, tipo, ...(await pdf(nome)), enviadoEm: em(-2, 17) });
  }
  await tx.insert(qualificacoes).values({
    profissionalId: joana, titulo: 'Cuidador de idosos', instituicao: 'Senac Campinas', cargaHorariaHoras: 160, anoConclusao: 2022,
    ...(await pdf('certificado-cuidador.pdf')), enviadoEm: em(-2, 17),
  });
  // Ana atende com veículo: CNH aprovada, e um curso validado que aparece no portfólio
  await tx.insert(documentos).values({ profissionalId: ana, tipo: 'cnh', ...(await pdf('cnh-ana.pdf')), situacao: 'aprovado', enviadoEm: em(-20, 10), revisadoEm: em(-19, 12) });
  await tx.insert(qualificacoes).values([
    { profissionalId: ana, titulo: 'Cuidador de idosos', instituicao: 'Senac Campinas', cargaHorariaHoras: 160, anoConclusao: 2019, ...(await pdf('certificado-ana.pdf')), situacao: 'aprovado', enviadoEm: em(-20, 10), revisadoEm: em(-19, 12) },
    { profissionalId: ana, titulo: 'Primeiros socorros', instituicao: 'Cruz Vermelha Brasileira', cargaHorariaHoras: 16, anoConclusao: 2024, ...(await pdf('primeiros-socorros.pdf')), situacao: 'aprovado', enviadoEm: em(-20, 10), revisadoEm: em(-19, 12) },
  ]);

  // tarefas de cada uma, com o mínimo de horas (o mínimo geral é o menor deles)
  await tx.insert(tarefasProfissional).values([
    { profissionalId: ana, tipo: 'consulta', minimoHoras: 2, ordem: 0 },
    { profissionalId: ana, tipo: 'banco', minimoHoras: 2, ordem: 1 },
    { profissionalId: ana, tipo: 'mercado', minimoHoras: 1, ordem: 2 },
    { profissionalId: ana, tipo: 'passeio', minimoHoras: 2, ordem: 3 },
    { profissionalId: claudia, tipo: 'mercado', minimoHoras: 1, ordem: 0 },
    { profissionalId: claudia, tipo: 'passeio', minimoHoras: 1, ordem: 1 },
    { profissionalId: claudia, tipo: 'personalizada', nome: 'Companhia em casa', minimoHoras: 2, ordem: 2 },
    { profissionalId: joana, tipo: 'consulta', minimoHoras: 2, ordem: 0 },
    { profissionalId: joana, tipo: 'banco', minimoHoras: 2, ordem: 1 },
  ]);

  // dias e horários: Ana de segunda a sexta, 8h às 18h; Cláudia terça, quinta e sábado de manhã
  await tx.insert(disponibilidade).values([
    ...[1, 2, 3, 4, 5].map((dia) => ({ profissionalId: ana, dia, inicioMin: 8 * 60, fimMin: 18 * 60 })),
    ...[2, 4, 6].map((dia) => ({ profissionalId: claudia, dia, inicioMin: 8 * 60, fimMin: 13 * 60 })),
  ]);

  // turnos contínuos viram uma faixa só (mt = 7h às 18h); manhã e noite ficam em duas
  const TURNO = { m: [7, 12], t: [12, 18], n: [18, 22] } as const;
  const faixas = (turnos: string) => {
    const lista = [...turnos].map((t) => TURNO[t as keyof typeof TURNO]);
    const juntas: [number, number][] = [];
    for (const [ini, fim] of lista) {
      const ultima = juntas.at(-1);
      if (ultima && ultima[1] === ini) ultima[1] = fim;
      else juntas.push([ini, fim]);
    }
    return juntas;
  };
  for (const [n, p] of LISTAGEM.entries()) {
    const id = await conta(p.nome, `${p.id}@demo.minhacompanhia.test`, `1193333${String(n).padStart(4, '0')}`);
    await tx.insert(profissionais).values({
      usuarioId: id, slug: slugDoNome(p.nome), cidade: p.cidade, uf: p.uf, bairros: p.bairros,
      valorHoraCentavos: p.valor * 100, horasMinimas: p.minimo, veiculoIncluso: p.veiculo, anosExperiencia: p.anos,
      situacao: 'aprovado', aprovadoEm: em(-30, 12), revisadoEm: dia(em(-10 - (n % 15), 12)), proximaRevisao: dia(em(20 - (n % 15), 12)),
    });
    await tx.insert(tarefasProfissional).values(p.tarefas.map((tipo, ordem) => ({ profissionalId: id, tipo, minimoHoras: p.minimo, ordem })));
    await tx.insert(disponibilidade).values(
      p.dias.flatMap((d) => faixas(p.turnos).map(([ini, fim]) => ({ profissionalId: id, dia: d, inicioMin: ini * 60, fimMin: fim * 60 }))),
    );
  }

  await conta('Equipe Minha Companhia', EMAILS[5]!, '19944440000', { admin: true });

  const mariana = await conta('Mariana Costa', EMAILS[2]!, '19999990000');
  await tx.insert(contratantes).values({ usuarioId: mariana });
  const [helena] = await tx
    .insert(pessoasAcompanhadas)
    .values({ contratanteId: mariana, nome: 'Helena Costa', dataNascimento: '1948-03-02', parentesco: 'filha', observacoes: 'Caminha devagar.' })
    .returning({ id: pessoasAcompanhadas.id });

  const rafael = await conta('Rafael Souza', EMAILS[3]!, '19966660000');
  await tx.insert(contratantes).values({ usuarioId: rafael });
  const [dirce] = await tx
    .insert(pessoasAcompanhadas)
    .values({ contratanteId: rafael, nome: 'Dirce Souza', dataNascimento: '1944-05-10', parentesco: 'filho' })
    .returning({ id: pessoasAcompanhadas.id });

  // valor da hora congelado em cada pedido: Cláudia R$ 70; Ana R$ 80, ou R$ 70 a partir de 4 h
  const base = { valorHoraCentavos: 7000 };
  const daAna = (horas: number) => ({ profissionalId: ana, valorHoraCentavos: horas >= 4 ? 7000 : 8000, valorHoraCheioCentavos: horas >= 4 ? 8000 : null });
  const doMariana = { contratanteId: mariana, pessoaAcompanhadaId: helena!.id };
  const doRafael = { contratanteId: rafael, pessoaAcompanhadaId: dirce!.id };
  const feitos = await tx
    .insert(servicos)
    .values([
      { ...doRafael, ...daAna(2), tarefa: 'Banco', local: 'Agência Centro', inicio: em(10, 14), horas: 2, respondaAte: em(1, 20) },
      {
        ...doMariana, ...daAna(4), tarefa: 'Consulta médica', local: 'Clínica Viva Mais, Centro',
        observacoes: 'Helena caminha devagar. Levar os exames anteriores, na pasta azul da sala.', inicio: em(8, 9), horas: 4, respondaAte: em(1, 18),
      },
      {
        ...base, ...doMariana, profissionalId: claudia, tarefa: 'Mercado e farmácia', local: 'Rua Maria Monteiro, 120',
        inicio: em(11, 9), horas: 2, situacao: 'proposta_alterada', propostaInicio: em(11, 10), propostaHoras: 2,
        propostaRecado: 'Às 9h tenho outro atendimento. Às 10h consigo ir com calma.', respondaAte: em(1, 21),
      },
      { ...doRafael, ...daAna(3), tarefa: 'Exame de imagem', local: 'Hospital Vera Cruz', inicio: em(2, 8), horas: 3, situacao: 'confirmado' },
      { ...doMariana, ...daAna(2), tarefa: 'Passeio no Taquaral', inicio: em(-1, 10), horas: 2, situacao: 'confirmado' },
      { ...doMariana, ...daAna(2), tarefa: 'Banco', inicio: em(-6, 10), horas: 2, situacao: 'realizado', realizadoEm: em(-6, 12) },
      { ...doRafael, ...daAna(4), tarefa: 'Consulta médica', inicio: em(-11, 8), horas: 4, situacao: 'realizado', realizadoEm: em(-11, 12) },
      // Ana aceitou; falta a Mariana pagar até amanhã
      { ...doMariana, ...daAna(2), tarefa: 'Mercado e farmácia', local: 'Rua Maria Monteiro, 120', inicio: em(4, 15), horas: 2, situacao: 'aguardando_pagamento', respondaAte: em(1, 20) },
    ])
    .returning({ id: servicos.id, horas: servicos.horas, valorHora: servicos.valorHoraCentavos });

  // pagamentos simulados: confirmados e feitos já pagos, com o dinheiro retido até o repasse
  const pago = (i: number, metodo: 'PIX' | 'CARD', pagoEm: Date, parcelas: number | null = null) => ({
    servicoId: feitos[i]!.id,
    gateway: 'simulado',
    cobrancaId: `seed_${randomUUID()}`,
    url: '',
    valorCentavos: feitos[i]!.horas * feitos[i]!.valorHora,
    situacao: 'pago' as const,
    metodo,
    parcelas,
    acrescimoCentavos: metodo === 'CARD' ? Math.ceil((feitos[i]!.horas * feitos[i]!.valorHora + 60) / 0.96) - feitos[i]!.horas * feitos[i]!.valorHora : 0,
    pagoEm,
  });
  await tx.insert(pagamentos).values([pago(3, 'CARD', em(-2, 10), 3), pago(4, 'PIX', em(-3, 18)), pago(5, 'PIX', em(-8, 9)), pago(6, 'CARD', em(-13, 11), 2)]);

  const consultaDoRafael = feitos[6]!.id;
  await tx.insert(avaliacoes).values([
    { servicoId: consultaDoRafael, autorId: rafael, avaliadoId: ana, sentido: 'familia_avalia_profissional', nota: 5, comentario: 'Pontual e cuidadosa com a minha mãe.' },
    { servicoId: consultaDoRafael, autorId: ana, avaliadoId: rafael, sentido: 'profissional_avalia_familia', nota: 5, comentario: 'Tudo combinado com clareza.' },
  ]);
});

await banco.fechar();
console.log(`Contas de demonstração: ${EMAILS.join(', ')} (senha em src/scripts/seed.ts).`);
