import { describe, expect, it } from 'vitest';
import { mensageiroResend, type Mensagem } from '../src/mensagens.js';

const codigo: Mensagem = { canal: 'email', destino: 'ana@exemplo.com', assunto: 'Seu código', texto: 'Seu código é 123456.' };

describe('mensageiro do Resend', () => {
  const falso = (status = 200, corpo: unknown = { id: 'email_1' }) => {
    const chamadas: { url: string; corpo: any; auth: string | null }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      chamadas.push({ url, corpo: JSON.parse(String(init.body)), auth: new Headers(init.headers).get('authorization') });
      return new Response(JSON.stringify(corpo), { status });
    }) as unknown as typeof fetch;
    return { f, chamadas };
  };

  it('manda o e-mail com o remetente configurado', async () => {
    const { f, chamadas } = falso();
    const m = mensageiroResend('re_chave', 'Minha companhia <nao-responda@exemplo.com>', { fetch: f });
    await m.enviar(codigo);
    expect(chamadas).toEqual([
      {
        url: 'https://api.resend.com/emails',
        auth: 'Bearer re_chave',
        corpo: { from: 'Minha companhia <nao-responda@exemplo.com>', to: ['ana@exemplo.com'], subject: 'Seu código', text: 'Seu código é 123456.' },
      },
    ]);
  });

  it('recusa do Resend vira erro com o motivo', async () => {
    const { f } = falso(403, { statusCode: 403, message: 'The exemplo.com domain is not verified.' });
    const m = mensageiroResend('re_chave', 'x <a@exemplo.com>', { fetch: f });
    await expect(m.enviar(codigo)).rejects.toThrow('Resend respondeu 403: The exemplo.com domain is not verified.');
  });

  it('o que não é e-mail segue para o outro mensageiro', async () => {
    const { f, chamadas } = falso();
    const outras: Mensagem[] = [];
    const m = mensageiroResend('re_chave', 'x <a@exemplo.com>', { fetch: f, outros: { enviar: async (msg) => void outras.push(msg) } });
    await m.enviar({ ...codigo, canal: 'whatsapp', destino: '19988881234' });
    expect(chamadas).toHaveLength(0);
    expect(outras).toHaveLength(1);
  });

  it('sem outro mensageiro, o WhatsApp responde indisponível', async () => {
    const { f } = falso();
    const m = mensageiroResend('re_chave', 'x <a@exemplo.com>', { fetch: f });
    await expect(m.enviar({ ...codigo, canal: 'whatsapp' })).rejects.toMatchObject({ status: 503, codigo: 'envio_indisponivel' });
  });
});
