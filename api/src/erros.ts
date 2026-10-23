import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

// Erro esperado da regra de negócio, com mensagem pronta para a tela.
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly campos?: Record<string, string>,
  ) {
    super(mensagem);
  }
}

export const naoEncontrado = (mensagem = 'Não encontramos o que você procurou.') =>
  new ErroApi(404, 'nao_encontrado', mensagem);
export const proibido = (mensagem = 'Você não tem acesso a isto.') => new ErroApi(403, 'proibido', mensagem);
export const conflito = (codigo: string, mensagem: string, campos?: Record<string, string>) =>
  new ErroApi(409, codigo, mensagem, campos);

// Código do Postgres para violação de índice único, venha o erro direto ou embrulhado pelo Drizzle.
export function violouUnico(err: unknown, restricao?: string): boolean {
  for (let e: any = err; e; e = e.cause) {
    if (e.code === '23505') return !restricao || e.constraint === restricao;
  }
  return false;
}

// Quem abre uma tela no navegador (e não a API) recebe a página de erro do site, com o
// status certo; fetch, curl e a própria API continuam recebendo o JSON.
function querTela(req: FastifyRequest) {
  return (
    (req.method === 'GET' || req.method === 'HEAD') &&
    !/^\/api(?:[/?]|$)/.test(req.url) &&
    (req.headers.accept ?? '').includes('text/html')
  );
}

async function paginaDeErro(reply: FastifyReply, site: string, status: 404 | 500) {
  let html: Buffer;
  try {
    html = await readFile(join(site, `${status}.html`));
  } catch {
    return false;
  }
  await reply.status(status).header('cache-control', 'no-store').type('text/html; charset=utf-8').send(html);
  return true;
}

export function registrarTratamentoDeErros(app: FastifyInstance, site: string | false = false) {
  app.setErrorHandler(async (err: FastifyError | ErroApi | ZodError, req, reply) => {
    if (err instanceof ErroApi) {
      return reply.status(err.status).send({ erro: { codigo: err.codigo, mensagem: err.message, campos: err.campos } });
    }
    if (err instanceof ZodError) {
      const campos: Record<string, string> = {};
      for (const issue of err.issues) campos[issue.path.join('.') || '_'] ??= issue.message;
      return reply
        .status(400)
        .send({ erro: { codigo: 'dados_invalidos', mensagem: 'Revise os campos destacados.', campos } });
    }
    const status = (err as FastifyError).statusCode ?? 500;
    if (status === 429) {
      return reply
        .status(429)
        .send({ erro: { codigo: 'muitas_tentativas', mensagem: 'Muitas tentativas. Espere um minuto e tente de novo.' } });
    }
    if (status < 500) {
      return reply.status(status).send({ erro: { codigo: 'requisicao_invalida', mensagem: 'Não foi possível ler o pedido.' } });
    }
    req.log.error(err);
    if (site && querTela(req) && (await paginaDeErro(reply, site, 500))) return reply;
    return reply.status(500).send({ erro: { codigo: 'erro_interno', mensagem: 'Algo deu errado do nosso lado. Tente de novo.' } });
  });

  app.setNotFoundHandler(async (req, reply) => {
    if (site && querTela(req) && (await paginaDeErro(reply, site, 404))) return reply;
    return reply.status(404).send({ erro: { codigo: 'nao_encontrado', mensagem: 'Endereço não encontrado.' } });
  });
}
