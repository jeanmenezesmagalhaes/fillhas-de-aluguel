import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const quando = (nome: string) => timestamp(nome, { withTimezone: true, mode: 'date' });

// Uma pessoa, uma conta. O papel vem das tabelas ligadas a ela: quem tem linha em
// `contratantes` contrata, quem tem linha em `profissionais` presta o serviço.
export const usuarios = pgTable(
  'usuarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    senhaHash: text('senha_hash').notNull(),
    nome: text('nome').notNull(),
    celular: text('celular').notNull(),
    admin: boolean('admin').notNull().default(false),
    emailVerificadoEm: quando('email_verificado_em'),
    // registro do aceite dos termos de uso e da política de privacidade (LGPD)
    termosAceitosEm: quando('termos_aceitos_em').notNull(),
    criadoEm: quando('criado_em').notNull().defaultNow(),
    atualizadoEm: quando('atualizado_em').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('usuarios_email_unico').on(sql`lower(${t.email})`),
  ],
);

export const contratantes = pgTable('contratantes', {
  usuarioId: uuid('usuario_id')
    .primaryKey()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  criadoEm: quando('criado_em').notNull().defaultNow(),
});

// Quem recebe o acompanhamento: a mãe ou o pai. Não opera a conta.
export const pessoasAcompanhadas = pgTable(
  'pessoas_acompanhadas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contratanteId: uuid('contratante_id')
      .notNull()
      .references(() => contratantes.usuarioId, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    dataNascimento: date('data_nascimento', { mode: 'string' }),
    observacoes: text('observacoes'),
    criadoEm: quando('criado_em').notNull().defaultNow(),
  },
  (t) => [index('pessoas_por_contratante').on(t.contratanteId)],
);

export const situacaoProfissional = pgEnum('situacao_profissional', [
  'rascunho',
  'em_analise',
  'aprovado',
  'correcao',
  'vencido',
]);

export const profissionais = pgTable(
  'profissionais',
  {
    usuarioId: uuid('usuario_id')
      .primaryKey()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    cidade: text('cidade').notNull(),
    uf: text('uf').notNull(),
    bairros: text('bairros').array().notNull().default(sql`'{}'::text[]`),
    apresentacao: text('apresentacao'),
    // valor em centavos; definido depois do cadastro, no painel
    valorHoraCentavos: integer('valor_hora_centavos'),
    horasMinimas: smallint('horas_minimas').notNull().default(1),
    veiculoIncluso: boolean('veiculo_incluso').notNull().default(false),
    situacao: situacaoProfissional('situacao').notNull().default('rascunho'),
    revisadoEm: date('revisado_em', { mode: 'string' }),
    proximaRevisao: date('proxima_revisao', { mode: 'string' }),
    criadoEm: quando('criado_em').notNull().defaultNow(),
    atualizadoEm: quando('atualizado_em').notNull().defaultNow(),
  },
  (t) => [
    check('valor_hora_minimo', sql`${t.valorHoraCentavos} is null or ${t.valorHoraCentavos} >= 7000`),
    check('horas_minimas_faixa', sql`${t.horasMinimas} between 1 and 12`),
    check('uf_formato', sql`${t.uf} ~ '^[A-Z]{2}$'`),
    index('profissionais_por_cidade').on(t.cidade, t.situacao),
  ],
);

// Guardamos só o hash do token; o token em si vive no cookie.
export const sessoes = pgTable(
  'sessoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull().unique(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    criadoEm: quando('criado_em').notNull().defaultNow(),
    expiraEm: quando('expira_em').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [index('sessoes_por_usuario').on(t.usuarioId)],
);

export const situacaoServico = pgEnum('situacao_servico', [
  'solicitado',
  'proposta_alterada',
  'confirmado',
  'recusado',
  'cancelado',
  'realizado',
]);

export const servicos = pgTable(
  'servicos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contratanteId: uuid('contratante_id')
      .notNull()
      .references(() => contratantes.usuarioId),
    profissionalId: uuid('profissional_id')
      .notNull()
      .references(() => profissionais.usuarioId),
    pessoaAcompanhadaId: uuid('pessoa_acompanhada_id').references(() => pessoasAcompanhadas.id, {
      onDelete: 'set null',
    }),
    tarefa: text('tarefa').notNull(),
    // onde: endereço de saída ou do compromisso, como a família escreveu
    local: text('local'),
    // recado da família para a profissional
    observacoes: text('observacoes'),
    inicio: quando('inicio').notNull(),
    horas: smallint('horas').notNull(),
    // outro horário proposto pela profissional; vira inicio/horas quando a família aceita
    propostaInicio: quando('proposta_inicio'),
    propostaHoras: smallint('proposta_horas'),
    propostaRecado: text('proposta_recado'),
    // congelado no pedido: mudar o preço depois não altera serviços já pedidos
    valorHoraCentavos: integer('valor_hora_centavos').notNull(),
    situacao: situacaoServico('situacao').notNull().default('solicitado'),
    realizadoEm: quando('realizado_em'),
    criadoEm: quando('criado_em').notNull().defaultNow(),
    atualizadoEm: quando('atualizado_em').notNull().defaultNow(),
  },
  (t) => [
    check('servico_horas_positivas', sql`${t.horas} >= 1`),
    check('servico_partes_distintas', sql`${t.contratanteId} <> ${t.profissionalId}`),
    check(
      'servico_proposta_completa',
      sql`${t.situacao} <> 'proposta_alterada' or (${t.propostaInicio} is not null and ${t.propostaHoras} >= 1)`,
    ),
    check(
      'servico_realizado_tem_data',
      sql`(${t.situacao} = 'realizado') = (${t.realizadoEm} is not null)`,
    ),
    index('servicos_por_contratante').on(t.contratanteId),
    index('servicos_por_profissional').on(t.profissionalId),
  ],
);

export const sentidoAvaliacao = pgEnum('sentido_avaliacao', [
  'familia_avalia_profissional',
  'profissional_avalia_familia',
]);

// Uma avaliação por sentido por serviço: a família avalia a profissional e a
// profissional avalia a família, sempre presas a um serviço realizado.
export const avaliacoes = pgTable(
  'avaliacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    servicoId: uuid('servico_id')
      .notNull()
      .references(() => servicos.id, { onDelete: 'cascade' }),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => usuarios.id),
    avaliadoId: uuid('avaliado_id')
      .notNull()
      .references(() => usuarios.id),
    sentido: sentidoAvaliacao('sentido').notNull(),
    nota: smallint('nota').notNull(),
    comentario: text('comentario'),
    criadoEm: quando('criado_em').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('avaliacao_unica_por_sentido').on(t.servicoId, t.sentido),
    check('avaliacao_nota_faixa', sql`${t.nota} between 1 and 5`),
    check('avaliacao_partes_distintas', sql`${t.autorId} <> ${t.avaliadoId}`),
    index('avaliacoes_por_avaliado').on(t.avaliadoId, t.sentido),
  ],
);
