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
    // o celular é o WhatsApp: avisos de serviço e de pagamento vão para ele
    celularVerificadoEm: quando('celular_verificado_em'),
    // código que a pessoa compartilha para indicar outras (ex.: ANA-7K2P)
    codigoIndicacao: text('codigo_indicacao').unique(),
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
    // aceita pedidos de tarefas fora da lista dela ("Outra tarefa · a combinar"), com mínimo de 1 h
    aceitaOutras: boolean('aceita_outras').notNull().default(false),
    situacao: situacaoProfissional('situacao').notNull().default('rascunho'),
    revisadoEm: date('revisado_em', { mode: 'string' }),
    proximaRevisao: date('proxima_revisao', { mode: 'string' }),
    // Dados para verificar quem ela é e para receber os pagamentos. Só ela e a
    // administração veem; nas respostas da própria profissional o CPF vai mascarado.
    cpf: text('cpf').unique(),
    cnpj: text('cnpj'),
    razaoSocial: text('razao_social'),
    // endereço residencial, conferido com o comprovante (não é a cidade de atendimento)
    cep: text('cep'),
    logradouro: text('logradouro'),
    numero: text('numero'),
    complemento: text('complemento'),
    bairro: text('bairro'),
    enderecoCidade: text('endereco_cidade'),
    enderecoUf: text('endereco_uf'),
    // entrada na lista de espera; a ordem da fila é por esta data
    enviadoAnaliseEm: quando('enviado_analise_em'),
    motivoCorrecao: text('motivo_correcao'),
    aprovadoEm: quando('aprovado_em'),
    aprovadoPor: uuid('aprovado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    criadoEm: quando('criado_em').notNull().defaultNow(),
    atualizadoEm: quando('atualizado_em').notNull().defaultNow(),
  },
  (t) => [
    check('cpf_formato', sql`${t.cpf} is null or ${t.cpf} ~ '^[0-9]{11}$'`),
    check('cnpj_formato', sql`${t.cnpj} is null or ${t.cnpj} ~ '^[0-9]{14}$'`),
    check('cep_formato', sql`${t.cep} is null or ${t.cep} ~ '^[0-9]{8}$'`),
    index('profissionais_fila').on(t.situacao, t.enviadoAnaliseEm),
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
    // tipo da tarefa na lista da profissional, quando o pedido veio por ela
    tipoTarefa: text('tipo_tarefa'),
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

export const canalVerificacao = pgEnum('canal_verificacao', ['email', 'whatsapp']);

// Código de 6 dígitos enviado para confirmar e-mail e WhatsApp. Só o hash fica no banco.
export const verificacoes = pgTable(
  'verificacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    canal: canalVerificacao('canal').notNull(),
    destino: text('destino').notNull(),
    codigoHash: text('codigo_hash').notNull(),
    tentativas: smallint('tentativas').notNull().default(0),
    criadoEm: quando('criado_em').notNull().defaultNow(),
    expiraEm: quando('expira_em').notNull(),
    confirmadoEm: quando('confirmado_em'),
  },
  (t) => [index('verificacoes_por_usuario').on(t.usuarioId, t.canal, t.criadoEm)],
);

// a CNH é exigida de quem atende com veículo, além do documento com foto
export const tipoDocumento = pgEnum('tipo_documento', ['documento_identidade', 'comprovante_endereco', 'cartao_cnpj', 'cnh']);
export const situacaoDocumento = pgEnum('situacao_documento', ['enviado', 'aprovado', 'recusado', 'substituido']);

// Arquivos enviados pela profissional. O arquivo fica no armazenamento (disco ou S3),
// fora da pasta pública; aqui ficam a chave, o hash e a análise.
export const documentos = pgTable(
  'documentos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profissionalId: uuid('profissional_id')
      .notNull()
      .references(() => profissionais.usuarioId, { onDelete: 'cascade' }),
    tipo: tipoDocumento('tipo').notNull(),
    arquivoChave: text('arquivo_chave').notNull().unique(),
    nomeOriginal: text('nome_original').notNull(),
    tipoArquivo: text('tipo_arquivo').notNull(),
    tamanho: integer('tamanho').notNull(),
    sha256: text('sha256').notNull(),
    situacao: situacaoDocumento('situacao').notNull().default('enviado'),
    motivoRecusa: text('motivo_recusa'),
    enviadoEm: quando('enviado_em').notNull().defaultNow(),
    revisadoEm: quando('revisado_em'),
    revisadoPor: uuid('revisado_por').references(() => usuarios.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('documentos_por_profissional').on(t.profissionalId, t.tipo),
    check('documento_recusado_tem_motivo', sql`${t.situacao} <> 'recusado' or ${t.motivoRecusa} is not null`),
  ],
);

// Quem indicou quem. As datas marcam as etapas que um bônus pode usar depois
// (cadastro, aprovação, primeiro serviço feito); o bônus em si ainda não foi definido.
export const indicacoes = pgTable(
  'indicacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    indicadorId: uuid('indicador_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    indicadoId: uuid('indicado_id')
      .notNull()
      .unique()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    codigo: text('codigo').notNull(),
    criadoEm: quando('criado_em').notNull().defaultNow(),
    aprovadoEm: quando('aprovado_em'),
    primeiroServicoEm: quando('primeiro_servico_em'),
  },
  (t) => [
    index('indicacoes_por_indicador').on(t.indicadorId),
    check('indicacao_sem_autoindicacao', sql`${t.indicadorId} <> ${t.indicadoId}`),
  ],
);

// Cursos e treinamentos da profissional, cada um com o comprovante (certificado) para a
// administração validar. Só os aprovados aparecem no portfólio.
export const qualificacoes = pgTable(
  'qualificacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profissionalId: uuid('profissional_id')
      .notNull()
      .references(() => profissionais.usuarioId, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    instituicao: text('instituicao').notNull(),
    cargaHorariaHoras: smallint('carga_horaria_horas'),
    anoConclusao: smallint('ano_conclusao'),
    arquivoChave: text('arquivo_chave').notNull().unique(),
    nomeOriginal: text('nome_original').notNull(),
    tipoArquivo: text('tipo_arquivo').notNull(),
    tamanho: integer('tamanho').notNull(),
    sha256: text('sha256').notNull(),
    situacao: situacaoDocumento('situacao').notNull().default('enviado'),
    motivoRecusa: text('motivo_recusa'),
    enviadoEm: quando('enviado_em').notNull().defaultNow(),
    revisadoEm: quando('revisado_em'),
    revisadoPor: uuid('revisado_por').references(() => usuarios.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('qualificacoes_por_profissional').on(t.profissionalId, t.situacao),
    index('qualificacoes_pendentes').on(t.situacao, t.enviadoEm),
    check('qualificacao_recusada_tem_motivo', sql`${t.situacao} <> 'recusado' or ${t.motivoRecusa} is not null`),
    check('qualificacao_carga_horaria', sql`${t.cargaHorariaHoras} is null or ${t.cargaHorariaHoras} between 1 and 5000`),
    check('qualificacao_ano', sql`${t.anoConclusao} is null or ${t.anoConclusao} between 1950 and 2100`),
  ],
);

export const tipoTarefa = pgEnum('tipo_tarefa', ['consulta', 'banco', 'mercado', 'passeio', 'personalizada']);

// Tarefas que a profissional faz, cada uma com o próprio mínimo de horas. As fixas não se
// repetem; as personalizadas têm nome próprio, também sem repetir.
export const tarefasProfissional = pgTable(
  'tarefas_profissional',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profissionalId: uuid('profissional_id')
      .notNull()
      .references(() => profissionais.usuarioId, { onDelete: 'cascade' }),
    tipo: tipoTarefa('tipo').notNull(),
    nome: text('nome'),
    minimoHoras: smallint('minimo_horas').notNull(),
    ordem: smallint('ordem').notNull().default(0),
  },
  (t) => [
    uniqueIndex('tarefa_fixa_unica').on(t.profissionalId, t.tipo).where(sql`${t.tipo} <> 'personalizada'`),
    uniqueIndex('tarefa_personalizada_unica').on(t.profissionalId, sql`lower(${t.nome})`).where(sql`${t.tipo} = 'personalizada'`),
    check('tarefa_minimo_faixa', sql`${t.minimoHoras} between 1 and 12`),
    check('tarefa_nome_personalizada', sql`(${t.tipo} = 'personalizada') = (${t.nome} is not null)`),
    index('tarefas_por_tipo').on(t.tipo),
  ],
);
