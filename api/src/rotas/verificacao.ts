import { createHash, randomInt, randomUUID } from 'node:crypto';
import { and, count, desc, eq, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { exigirProfissional, exigirUsuario } from '../auth.js';
import type { Contexto } from '../contexto.js';
import type { Db } from '../db/index.js';
import { documentos, profissionais, usuarios, verificacoes } from '../db/schema.js';
import { conflito, ErroApi, naoEncontrado, violouUnico } from '../erros.js';
import * as v from '../validacao.js';

const VALIDADE_CODIGO_MS = 15 * 60 * 1000;
const ESPERA_REENVIO_MS = 60 * 1000;
const MAX_TENTATIVAS = 5;
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;

type TipoDocumento = (typeof documentos.$inferSelect)['tipo'];
type Situacao = (typeof profissionais.$inferSelect)['situacao'];

// a profissional só mexe nos dados de verificação antes da fila ou quando pedem correção
const PODE_EDITAR: Situacao[] = ['rascunho', 'correcao'];

const canal = z.enum(['email', 'whatsapp'], { error: 'Escolha e-mail ou WhatsApp.' });

const dadosFiscais = z
  .object({
    cpf: v.cpf,
    // CNPJ é opcional (MEI, por exemplo); com ele, pedimos o cartão CNPJ
    cnpj: v.cnpj.optional(),
    razaoSocial: z.string().trim().min(2).max(160).optional(),
    endereco: z.object({
      cep: v.cep,
      logradouro: z.string({ error: 'Informe a rua.' }).trim().min(2, 'Informe a rua.').max(160),
      numero: z.string({ error: 'Informe o número.' }).trim().min(1, 'Informe o número.').max(20),
      complemento: z.string().trim().max(80).optional(),
      bairro: z.string({ error: 'Informe o bairro.' }).trim().min(2, 'Informe o bairro.').max(80),
      cidade: z.string({ error: 'Informe a cidade.' }).trim().min(2, 'Informe a cidade.').max(80),
      uf: v.uf,
    }),
  })
  .refine((d) => !d.cnpj || d.razaoSocial, { path: ['razaoSocial'], message: 'Informe a razão social do CNPJ.' });

const tipoDocumento = z.enum(['documento_identidade', 'comprovante_endereco', 'cartao_cnpj', 'cnh'], {
  error: 'Escolha o tipo do documento.',
});

export const ROTULO_DOCUMENTO: Record<TipoDocumento, string> = {
  documento_identidade: 'Documento com foto (RG ou CNH)',
  comprovante_endereco: 'Comprovante de endereço',
  cartao_cnpj: 'Cartão CNPJ',
  cnh: 'CNH (para quem atende com veículo)',
};

// O tipo do arquivo é conferido pelos primeiros bytes, não pelo nome nem pelo que o
// navegador diz.
function tipoDoArquivo(dados: Buffer): string | null {
  if (dados.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (dados[0] === 0xff && dados[1] === 0xd8 && dados[2] === 0xff) return 'image/jpeg';
  if (dados.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (dados.subarray(4, 12).toString('latin1').match(/^ftyp(heic|heix|mif1)/)) return 'image/heic';
  if (dados.subarray(0, 4).toString('latin1') === 'RIFF' && dados.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

const hashCodigo = (usuarioId: string, codigo: string) => createHash('sha256').update(`${usuarioId}:${codigo}`).digest('hex');

const mascararEmail = (e: string) => e.replace(/^(.)[^@]*(@.*)$/, (_, a, b) => `${a}***${b}`);
const mascararCelular = (c: string) => `(${c.slice(0, 2)}) *****-${c.slice(-4)}`;

// documento que vale no momento: o mais recente de cada tipo que não foi substituído
export async function documentosAtuais(db: Db, profissionalId: string) {
  const linhas = await db
    .select({
      id: documentos.id,
      tipo: documentos.tipo,
      nomeOriginal: documentos.nomeOriginal,
      tipoArquivo: documentos.tipoArquivo,
      tamanho: documentos.tamanho,
      situacao: documentos.situacao,
      motivoRecusa: documentos.motivoRecusa,
      enviadoEm: documentos.enviadoEm,
      revisadoEm: documentos.revisadoEm,
    })
    .from(documentos)
    .where(and(eq(documentos.profissionalId, profissionalId), ne(documentos.situacao, 'substituido')))
    .orderBy(desc(documentos.enviadoEm));
  const porTipo = new Map<TipoDocumento, (typeof linhas)[number]>();
  for (const d of linhas) if (!porTipo.has(d.tipo)) porTipo.set(d.tipo, d);
  return porTipo;
}

// documento com foto e comprovante sempre; cartão CNPJ com CNPJ; CNH com veículo
export const documentosExigidos = (temCnpj: boolean, temVeiculo: boolean): TipoDocumento[] => [
  'documento_identidade',
  'comprovante_endereco',
  ...(temCnpj ? (['cartao_cnpj'] as const) : []),
  ...(temVeiculo ? (['cnh'] as const) : []),
];

// Lê um envio multipart/form-data: os campos de texto e um arquivo, já conferido.
export async function lerEnvio(req: FastifyRequest) {
  if (!req.isMultipart()) throw new ErroApi(415, 'envie_arquivo', 'Envie o arquivo como formulário (multipart/form-data).');
  const campos: Record<string, string> = {};
  let arquivo: { nome: string; dados: Buffer } | undefined;
  for await (const parte of req.parts()) {
    if (parte.type === 'field') campos[parte.fieldname] = String(parte.value);
    else {
      const dados = await parte.toBuffer();
      if (parte.file.truncated) throw new ErroApi(413, 'arquivo_grande', 'O arquivo passa de 10 MB. Envie uma foto ou PDF menor.');
      arquivo = { nome: parte.filename.slice(0, 200) || 'arquivo', dados };
    }
  }
  if (!arquivo || !arquivo.dados.length) throw new ErroApi(400, 'dados_invalidos', 'Escolha o arquivo.', { arquivo: 'Escolha o arquivo.' });
  const tipoArquivo = tipoDoArquivo(arquivo.dados);
  if (!tipoArquivo) {
    throw new ErroApi(415, 'formato_invalido', 'Use foto (JPG, PNG ou HEIC) ou PDF.', { arquivo: 'Use foto (JPG, PNG ou HEIC) ou PDF.' });
  }
  return {
    campos,
    arquivo: { ...arquivo, tipoArquivo, tamanho: arquivo.dados.length, sha256: createHash('sha256').update(arquivo.dados).digest('hex') },
  };
}

// quem tem prioridade (convite especial) passa na frente de quem não tem
export async function posicaoNaFila(db: Db, enviadoEm: Date, prioridade = false) {
  const [r] = await db
    .select({ n: count() })
    .from(profissionais)
    .where(
      and(
        eq(profissionais.situacao, 'em_analise'),
        prioridade
          ? and(eq(profissionais.prioridadeFila, true), lt(profissionais.enviadoAnaliseEm, enviadoEm))
          : or(eq(profissionais.prioridadeFila, true), lt(profissionais.enviadoAnaliseEm, enviadoEm)),
      ),
    );
  return (r?.n ?? 0) + 1;
}

// Tudo o que falta para entrar na lista de espera, item por item, para a tela de cadastro.
export async function situacaoDaVerificacao(ctx: Contexto, usuarioId: string) {
  const [linha] = await ctx.db
    .select({
      email: usuarios.email,
      celular: usuarios.celular,
      emailVerificadoEm: usuarios.emailVerificadoEm,
      celularVerificadoEm: usuarios.celularVerificadoEm,
      p: profissionais,
    })
    .from(profissionais)
    .innerJoin(usuarios, eq(usuarios.id, profissionais.usuarioId))
    .where(eq(profissionais.usuarioId, usuarioId));
  const { p } = linha!;
  const atuais = await documentosAtuais(ctx.db, usuarioId);
  const exigidos = documentosExigidos(!!p.cnpj, p.veiculoIncluso);
  const docs = exigidos.map((tipo) => {
    const d = atuais.get(tipo);
    return {
      tipo,
      rotulo: ROTULO_DOCUMENTO[tipo],
      situacao: d ? d.situacao : ('pendente' as const),
      motivoRecusa: d?.motivoRecusa ?? null,
      arquivo: d ? { id: d.id, nome: d.nomeOriginal, tipoArquivo: d.tipoArquivo, tamanho: d.tamanho, enviadoEm: d.enviadoEm } : null,
    };
  });
  const itens = {
    email: !!linha!.emailVerificadoEm,
    // com a verificação do WhatsApp desligada, o item não entra no que falta
    whatsapp: !ctx.verificarWhatsapp || !!linha!.celularVerificadoEm,
    dadosFiscais: !!p.cpf,
    endereco: !!p.cep,
    documentos: docs.every((d) => d.situacao === 'enviado' || d.situacao === 'aprovado'),
  };
  const falta = Object.entries(itens)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  return {
    situacao: p.situacao,
    // com veículo, a CNH entra na lista de documentos
    veiculoIncluso: p.veiculoIncluso,
    contatos: {
      email: { destino: mascararEmail(linha!.email), verificado: itens.email },
      whatsapp: { destino: mascararCelular(linha!.celular), verificado: !!linha!.celularVerificadoEm, exigido: ctx.verificarWhatsapp },
    },
    dadosFiscais: p.cpf
      ? { cpf: v.mascararCpf(p.cpf), cnpj: p.cnpj ? v.mascararCnpj(p.cnpj) : null, razaoSocial: p.razaoSocial }
      : null,
    endereco: p.cep
      ? { cep: p.cep, logradouro: p.logradouro, numero: p.numero, complemento: p.complemento, bairro: p.bairro, cidade: p.enderecoCidade, uf: p.enderecoUf }
      : null,
    documentos: docs,
    falta,
    podeEnviar: PODE_EDITAR.includes(p.situacao) && falta.length === 0,
    filaDeEspera:
      p.situacao === 'em_analise' && p.enviadoAnaliseEm
        ? { desde: p.enviadoAnaliseEm, posicao: await posicaoNaFila(ctx.db, p.enviadoAnaliseEm, p.prioridadeFila) }
        : null,
    motivoCorrecao: p.situacao === 'correcao' ? p.motivoCorrecao : null,
  };
}

async function situacaoAtual(db: Db, usuarioId: string): Promise<Situacao> {
  const [p] = await db.select({ situacao: profissionais.situacao }).from(profissionais).where(eq(profissionais.usuarioId, usuarioId));
  return p!.situacao;
}

const bloqueadoNaFila = () =>
  new ErroApi(409, 'em_analise', 'Seus dados estão na lista de espera e não podem mudar agora. Se precisar corrigir algo, fale com a gente.');

export function rotasVerificacao(app: FastifyInstance, ctx: Contexto, limite: { max: number; timeWindow: string }) {
  // código de 6 dígitos para o e-mail ou o WhatsApp da conta
  app.post('/api/eu/verificacoes', { config: { rateLimit: limite } }, async (req, reply) => {
    const u = exigirUsuario(req);
    const dados = z.object({ canal }).parse(req.body);
    const [conta] = await ctx.db
      .select({ email: usuarios.email, celular: usuarios.celular, emailOk: usuarios.emailVerificadoEm, celularOk: usuarios.celularVerificadoEm })
      .from(usuarios)
      .where(eq(usuarios.id, u.id));
    if ((dados.canal === 'email' && conta!.emailOk) || (dados.canal === 'whatsapp' && conta!.celularOk)) {
      throw conflito('ja_verificado', dados.canal === 'email' ? 'Seu e-mail já foi confirmado.' : 'Seu WhatsApp já foi confirmado.');
    }
    const agora = ctx.agora();
    const [ultimo] = await ctx.db
      .select({ criadoEm: verificacoes.criadoEm })
      .from(verificacoes)
      .where(and(eq(verificacoes.usuarioId, u.id), eq(verificacoes.canal, dados.canal)))
      .orderBy(desc(verificacoes.criadoEm))
      .limit(1);
    if (ultimo && agora.getTime() - ultimo.criadoEm.getTime() < ESPERA_REENVIO_MS) {
      throw new ErroApi(429, 'espere_para_reenviar', 'Acabamos de enviar um código. Espere um minuto para pedir outro.');
    }
    const destino = dados.canal === 'email' ? conta!.email : conta!.celular;
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiraEm = new Date(agora.getTime() + VALIDADE_CODIGO_MS);
    await ctx.mensageiro.enviar({
      canal: dados.canal,
      destino,
      assunto: 'Seu código da Minha companhia',
      texto: `Seu código da Minha companhia é ${codigo}. Ele vale por 15 minutos. Se não foi você, ignore esta mensagem.`,
    });
    await ctx.db.insert(verificacoes).values({ usuarioId: u.id, canal: dados.canal, destino, codigoHash: hashCodigo(u.id, codigo), criadoEm: agora, expiraEm });
    return reply.status(202).send({
      enviadoPara: dados.canal === 'email' ? mascararEmail(destino) : mascararCelular(destino),
      expiraEm,
    });
  });

  app.post('/api/eu/verificacoes/confirmar', { config: { rateLimit: limite } }, async (req) => {
    const u = exigirUsuario(req);
    const dados = z
      .object({ canal, codigo: z.string({ error: 'Digite o código.' }).trim().regex(/^\d{6}$/, 'O código tem 6 números.') })
      .parse(req.body);
    const agora = ctx.agora();
    const [ultimo] = await ctx.db
      .select()
      .from(verificacoes)
      .where(and(eq(verificacoes.usuarioId, u.id), eq(verificacoes.canal, dados.canal), isNull(verificacoes.confirmadoEm)))
      .orderBy(desc(verificacoes.criadoEm))
      .limit(1);
    const invalido = (msg: string) => new ErroApi(422, 'codigo_invalido', msg, { codigo: msg });
    if (!ultimo || ultimo.expiraEm <= agora) throw invalido('Este código expirou. Peça um novo.');
    // conta a tentativa numa só instrução antes de conferir: pedidos em paralelo não passam do limite
    const [contada] = await ctx.db
      .update(verificacoes)
      .set({ tentativas: sql`${verificacoes.tentativas} + 1` })
      .where(and(eq(verificacoes.id, ultimo.id), lt(verificacoes.tentativas, MAX_TENTATIVAS)))
      .returning({ id: verificacoes.id });
    if (!contada) throw invalido('Muitas tentativas com este código. Peça um novo.');
    if (ultimo.codigoHash !== hashCodigo(u.id, dados.codigo)) throw invalido('Código incorreto. Confira e tente de novo.');
    await ctx.db.transaction(async (tx) => {
      await tx.update(verificacoes).set({ confirmadoEm: agora }).where(eq(verificacoes.id, ultimo.id));
      await tx
        .update(usuarios)
        .set(dados.canal === 'email' ? { emailVerificadoEm: agora, atualizadoEm: agora } : { celularVerificadoEm: agora, atualizadoEm: agora })
        .where(eq(usuarios.id, u.id));
    });
    return { verificado: dados.canal };
  });

  app.get('/api/profissionais/eu/verificacao', async (req) => {
    const u = exigirProfissional(req);
    return { verificacao: await situacaoDaVerificacao(ctx, u.id) };
  });

  app.put('/api/profissionais/eu/dados-fiscais', async (req) => {
    const u = exigirProfissional(req);
    if (!PODE_EDITAR.includes(await situacaoAtual(ctx.db, u.id))) throw bloqueadoNaFila();
    const d = dadosFiscais.parse(req.body);
    try {
      await ctx.db
        .update(profissionais)
        .set({
          cpf: d.cpf,
          cnpj: d.cnpj ?? null,
          razaoSocial: d.cnpj ? d.razaoSocial : null,
          cep: d.endereco.cep,
          logradouro: d.endereco.logradouro,
          numero: d.endereco.numero,
          complemento: d.endereco.complemento || null,
          bairro: d.endereco.bairro,
          enderecoCidade: d.endereco.cidade,
          enderecoUf: d.endereco.uf,
          atualizadoEm: ctx.agora(),
        })
        .where(eq(profissionais.usuarioId, u.id));
    } catch (err) {
      if (violouUnico(err, 'profissionais_cpf_unique')) {
        throw conflito('cpf_em_uso', 'Este CPF já está em outro cadastro profissional. Fale com a gente se for um engano.', {
          cpf: 'CPF já cadastrado.',
        });
      }
      throw err;
    }
    return { verificacao: await situacaoDaVerificacao(ctx, u.id) };
  });

  // um arquivo por envio, com o campo `tipo` (multipart/form-data). Aprovada, ela ainda pode
  // mandar a CNH, para passar a oferecer veículo.
  app.post('/api/profissionais/eu/documentos', async (req, reply) => {
    const u = exigirProfissional(req);
    const { campos, arquivo } = await lerEnvio(req);
    const tipo = tipoDocumento.parse(campos.tipo);
    const situacao = await situacaoAtual(ctx.db, u.id);
    if (!PODE_EDITAR.includes(situacao) && !(situacao === 'aprovado' && tipo === 'cnh')) throw bloqueadoNaFila();
    const chave = randomUUID();
    await ctx.armazenamento.salvar(chave, arquivo.dados);
    const agora = ctx.agora();
    const [doc] = await ctx.db.transaction(async (tx) => {
      // o envio novo substitui o anterior do mesmo tipo que ainda não foi aprovado
      await tx
        .update(documentos)
        .set({ situacao: 'substituido' })
        .where(and(eq(documentos.profissionalId, u.id), eq(documentos.tipo, tipo), inArray(documentos.situacao, ['enviado', 'recusado'])));
      return tx
        .insert(documentos)
        .values({
          profissionalId: u.id,
          tipo,
          arquivoChave: chave,
          nomeOriginal: arquivo.nome,
          tipoArquivo: arquivo.tipoArquivo,
          tamanho: arquivo.tamanho,
          sha256: arquivo.sha256,
          enviadoEm: agora,
        })
        .returning({ id: documentos.id, tipo: documentos.tipo, situacao: documentos.situacao, tipoArquivo: documentos.tipoArquivo, tamanho: documentos.tamanho });
    });
    return reply.status(201).send({ documento: doc, verificacao: await situacaoDaVerificacao(ctx, u.id) });
  });

  // a própria profissional pode rever o que enviou
  app.get('/api/profissionais/eu/documentos/:id/arquivo', async (req, reply) => {
    const u = exigirProfissional(req);
    const { id } = z.object({ id: v.uuid }).parse(req.params);
    const [d] = await ctx.db
      .select({ chave: documentos.arquivoChave, tipoArquivo: documentos.tipoArquivo, nome: documentos.nomeOriginal })
      .from(documentos)
      .where(and(eq(documentos.id, id), eq(documentos.profissionalId, u.id)));
    if (!d) throw naoEncontrado('Documento não encontrado.');
    return enviarArquivo(ctx, reply, d);
  });

  // entra na lista de espera para a aprovação da plataforma
  app.post('/api/profissionais/eu/analise', async (req) => {
    const u = exigirProfissional(req);
    const atual = await situacaoDaVerificacao(ctx, u.id);
    if (!PODE_EDITAR.includes(atual.situacao)) throw new ErroApi(409, 'ja_enviado', 'Seu cadastro já foi enviado para análise.');
    if (atual.falta.length) {
      throw new ErroApi(422, 'cadastro_incompleto', 'Ainda faltam itens para entrar na lista de espera.', Object.fromEntries(atual.falta.map((f) => [f, 'Pendente.'])));
    }
    const agora = ctx.agora();
    await ctx.db
      .update(profissionais)
      .set({ situacao: 'em_analise', enviadoAnaliseEm: agora, motivoCorrecao: null, atualizadoEm: agora })
      .where(and(eq(profissionais.usuarioId, u.id), inArray(profissionais.situacao, PODE_EDITAR)));
    return { verificacao: await situacaoDaVerificacao(ctx, u.id) };
  });
}

export async function enviarArquivo(
  ctx: Contexto,
  reply: FastifyReply,
  d: { chave: string; tipoArquivo: string; nome: string },
) {
  const dados = await ctx.armazenamento.ler(d.chave);
  return reply
    .header('content-type', d.tipoArquivo)
    .header('content-disposition', `inline; filename="${encodeURIComponent(d.nome)}"`)
    .header('cache-control', 'private, no-store')
    .header('x-content-type-options', 'nosniff')
    .send(dados);
}

