import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acrescimoCartao } from '../src/pagamentos.js';
import { aceitarEPagar, ambiente, cliente, CPFS, DIA, familia, HORA, pagar, profissionalAprovada, SEGREDO_WEBHOOK, tornarAdmin, type Ambiente } from './ajuda.js';

let amb: Ambiente;
beforeAll(async () => {
  amb = await ambiente();
});
afterAll(() => amb.fechar());

// família e profissional com um pedido de 4 h (R$ 70/h) para daqui a 2 dias
async function pedido(horas = 4) {
  const pro = await profissionalAprovada(amb);
  const fam = cliente(amb.app);
  await fam.post('/api/contas', familia());
  const inicio = new Date(amb.relogio.agora.getTime() + 2 * DIA).toISOString();
  const { id } = (await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Consulta', inicio, horas })).corpo.servico;
  return { pro, fam, id: id as string };
}

async function adminNovo() {
  const c = cliente(amb.app);
  const r = await c.post('/api/contas', familia({ nome: 'Equipe Minha Companhia' }));
  await tornarAdmin(amb, r.corpo.usuario.id);
  return c;
}

const webhook = (corpo: unknown, segredo = SEGREDO_WEBHOOK) =>
  amb.app.inject({ method: 'POST', url: `/api/pagamentos/abacatepay?webhookSecret=${segredo}`, payload: corpo as object });

describe('cobrança da família', () => {
  it('aceitar segura o horário e espera o pagamento; pagar confirma', async () => {
    const { pro, fam, id } = await pedido();
    const aceito = (await pro.c.post(`/api/servicos/${id}/aceitar`)).corpo.servico;
    expect(aceito.situacao).toBe('aguardando_pagamento');
    expect(new Date(aceito.respondaAte).getTime()).toBe(amb.relogio.agora.getTime() + DIA);

    // só a família do pedido paga
    expect((await pro.c.post(`/api/servicos/${id}/pagamento`)).status).toBe(403);
    const outra = cliente(amb.app);
    await outra.post('/api/contas', familia());
    expect((await outra.post(`/api/servicos/${id}/pagamento`)).status).toBe(404);

    const aberto = (await fam.post(`/api/servicos/${id}/pagamento`)).corpo.pagamento;
    expect(aberto).toMatchObject({ situacao: 'pendente', valorCentavos: 28000 });
    expect(aberto.url).toMatch(/^\/api\/pagamentos\/simulado\/sim_/);
    // abrir de novo reaproveita a cobrança
    expect((await fam.post(`/api/servicos/${id}/pagamento`)).corpo.pagamento.url).toBe(aberto.url);
    expect((await amb.app.inject({ method: 'GET', url: aberto.url })).body).toContain('Pagamento simulado');

    const volta = await pagar(fam, id);
    expect(volta.corpo.volta).toContain(`/pedidos?pago=${id}`);
    const s = (await fam.get(`/api/servicos/${id}`)).corpo.servico;
    expect(s).toMatchObject({ situacao: 'confirmado', respondaAte: null, pagamento: { situacao: 'pago', metodo: 'PIX', repasseSituacao: 'aguardando' } });
    expect((await pro.c.get(`/api/servicos/${id}/pagamento`)).corpo).toMatchObject({ situacaoServico: 'confirmado', pagamento: { situacao: 'pago', url: null } });
  });

  it('no cartão parcelado, a família paga o acréscimo da taxa', async () => {
    const { pro, fam, id } = await pedido();
    await pro.c.post(`/api/servicos/${id}/aceitar`);
    await pagar(fam, id, 'CARD', 3);
    const p = (await fam.get(`/api/servicos/${id}/pagamento`)).corpo.pagamento;
    expect(p).toMatchObject({ situacao: 'pago', metodo: 'CARD', parcelas: 3, valorCentavos: 28000, acrescimoCentavos: acrescimoCartao(28000, 3) });
    expect(p.acrescimoCentavos).toBeGreaterThan(0);
  });

  it('aceite sem pagamento no prazo expira, e o horário volta a ficar livre', async () => {
    const { pro, fam, id } = await pedido();
    await pro.c.post(`/api/servicos/${id}/aceitar`);
    await fam.post(`/api/servicos/${id}/pagamento`);
    amb.relogio.avancar(DIA + HORA);
    expect((await fam.get(`/api/servicos/${id}`)).corpo.servico.situacao).toBe('expirado');
    const r = await fam.post(`/api/servicos/${id}/pagamento`);
    expect(r.status).toBe(409);
    expect(r.corpo.erro.mensagem).toMatch(/prazo para pagar/);
  });

  it('pagamento que chega depois do prazo é devolvido sozinho', async () => {
    const { pro, fam, id } = await pedido();
    await pro.c.post(`/api/servicos/${id}/aceitar`);
    const url = (await fam.post(`/api/servicos/${id}/pagamento`)).corpo.pagamento.url as string;
    amb.relogio.avancar(DIA + HORA);
    await fam.get('/api/servicos'); // expira
    await fam.post(`${url}/pagar`, { metodo: 'PIX' });
    const r = (await fam.get(`/api/servicos/${id}/pagamento`)).corpo;
    expect(r).toMatchObject({ situacaoServico: 'expirado', pagamento: { situacao: 'reembolsado' } });
  });

  it('webhook confere o segredo e confirma pela consulta ao gateway', async () => {
    const { pro, fam, id } = await pedido();
    await pro.c.post(`/api/servicos/${id}/aceitar`);
    const cobranca = String((await fam.post(`/api/servicos/${id}/pagamento`)).corpo.pagamento.url).split('/').pop()!;
    const evento = { id: 'log_1', event: 'checkout.completed', data: { checkout: { id: cobranca, externalId: id, status: 'PAID' } } };
    expect((await webhook(evento, 'errado')).statusCode).toBe(401);
    // o corpo diz "pago", mas o gateway ainda não recebeu: nada muda
    expect((await webhook(evento)).statusCode).toBe(200);
    expect((await fam.get(`/api/servicos/${id}`)).corpo.servico.situacao).toBe('aguardando_pagamento');
    amb.gateway.pagar(cobranca, 'PIX');
    expect((await webhook(evento)).statusCode).toBe(200);
    expect((await webhook(evento)).statusCode).toBe(200); // reenvio não muda nada
    expect((await fam.get(`/api/servicos/${id}`)).corpo.servico).toMatchObject({ situacao: 'confirmado', pagamento: { situacao: 'pago' } });
    // evento de outra loja ou de cobrança desconhecida
    expect((await webhook({ event: 'checkout.completed', data: { checkout: { id: 'bill_x' } } })).statusCode).toBe(200);
  });
});

describe('cancelamento', () => {
  it('cancelar um serviço pago devolve tudo à família', async () => {
    const { pro, fam, id } = await pedido();
    await aceitarEPagar(pro.c, fam, id);
    const s = (await pro.c.post(`/api/servicos/${id}/cancelar`)).corpo.servico;
    expect(s).toMatchObject({ situacao: 'cancelado', pagamento: { situacao: 'reembolsado' } });
  });

  it('estorno recusado fica para a equipe tentar de novo', async () => {
    const admin = await adminNovo();
    const { pro, fam, id } = await pedido();
    await aceitarEPagar(pro.c, fam, id);
    amb.gateway.falharProximo = 'INSUFFICIENT_FUNDS';
    expect((await fam.post(`/api/servicos/${id}/cancelar`)).corpo.servico).toMatchObject({ situacao: 'cancelado', pagamento: { situacao: 'pago' } });

    const item = (await admin.get('/api/admin/pagamentos')).corpo.pagamentos.find((p: { servico: { id: string } }) => p.servico.id === id);
    expect(item).toMatchObject({ etapa: 'estornar', reembolsoErro: 'INSUFFICIENT_FUNDS' });
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/repassar`)).status).toBe(422);
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/estornar`)).corpo).toMatchObject({ pagamento: { situacao: 'reembolsado' } });
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/estornar`)).status).toBe(409);
  });
});

describe('repasse para a profissional', () => {
  it('só sai depois do atendimento feito e avaliado, para a chave Pix dela, uma vez', async () => {
    const admin = await adminNovo();
    const { pro, fam, id } = await pedido();
    await aceitarEPagar(pro.c, fam, id);
    expect((await pro.c.get('/api/admin/pagamentos')).status).toBe(403);
    const achar = async () =>
      (await admin.get('/api/admin/pagamentos')).corpo.pagamentos.find((p: { servico: { id: string } }) => p.servico.id === id);
    let item = await achar();
    expect(item).toMatchObject({ etapa: 'aguardando_atendimento', valorCentavos: 28000, taxaCentavos: 3360, repasseCentavos: 24640, metodo: 'PIX' });
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/repassar`)).corpo.erro.codigo).toBe('servico_nao_realizado');

    amb.relogio.avancar(2 * DIA + 4 * HORA);
    await pro.c.post(`/api/servicos/${id}/concluir`);
    item = await achar();
    expect(item.etapa).toBe('aguardando_avaliacao');
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/repassar`)).corpo.erro.codigo).toBe('aguardando_avaliacao');

    await fam.post(`/api/servicos/${id}/avaliacoes`, { nota: 5 });
    item = await achar();
    expect(item).toMatchObject({ etapa: 'liberar', avaliacao: { nota: 5 }, liberaEm: null });
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/repassar`)).corpo.erro.codigo).toBe('sem_chave_pix');

    expect((await pro.c.patch('/api/profissionais/eu', { chavePix: { tipo: 'CPF', chave: '123.456.789-00' } })).status).toBe(400);
    const conta = await pro.c.patch('/api/profissionais/eu', {
      chavePix: { tipo: 'CPF', chave: CPFS[0]!.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') },
      senhaAtual: 'senha-de-teste-2',
    });
    expect(conta.corpo.usuario.profissional.chavePix).toEqual({ tipo: 'CPF', chave: CPFS[0], recebeAPartirDe: new Date(amb.relogio.agora.getTime() + 48 * HORA).toISOString() });

    // chave recém-cadastrada: o repasse espera a carência de 48 horas
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/repassar`)).corpo.erro.codigo).toBe('chave_pix_recente');
    amb.relogio.avancar(48 * HORA);

    // o gateway recusa: fica marcado como falha e dá para tentar de novo
    amb.gateway.falharProximo = 'Limite diário de Pix atingido';
    const falha = await admin.post(`/api/admin/pagamentos/${item.id}/repassar`);
    expect(falha.status).toBe(502);
    expect(falha.corpo.erro.mensagem).toContain('Limite diário');
    expect((await achar()).repasse).toMatchObject({ situacao: 'falhou', erro: 'Limite diário de Pix atingido' });

    const ok = await admin.post(`/api/admin/pagamentos/${item.id}/repassar`);
    expect(ok.corpo.pagamento).toMatchObject({ repasseSituacao: 'enviado', repasseValorCentavos: 24640 });
    expect(amb.gateway.pix.at(-1)).toMatchObject({ valorCentavos: 24640, chave: CPFS[0], tipo: 'CPF' });
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/repassar`)).status).toBe(409);
    expect((await achar()).etapa).toBe('repassado');

    // no extrato dela, o atendimento passa a depositado na data do repasse
    const g = (await pro.c.get('/api/profissionais/eu/ganhos')).corpo;
    expect(g.lancamentos.find((l: { servicoId: string }) => l.servicoId === id)).toMatchObject({ estado: 'depositado', liquidoCentavos: 24640 });
    expect((await fam.get(`/api/servicos/${id}`)).corpo.servico.pagamento.repasseSituacao).toBe('enviado');
  });

  it('sem avaliação da família, libera quando o prazo de avaliar termina', async () => {
    const admin = await adminNovo();
    const { pro, fam, id } = await pedido(2);
    await aceitarEPagar(pro.c, fam, id);
    await pro.c.patch('/api/profissionais/eu', { chavePix: { tipo: 'EMAIL', chave: 'Ana@Exemplo.com' }, senhaAtual: 'senha-de-teste-2' });
    amb.relogio.avancar(2 * DIA + 2 * HORA);
    await pro.c.post(`/api/servicos/${id}/concluir`);
    const achar = async () =>
      (await admin.get('/api/admin/pagamentos')).corpo.pagamentos.find((p: { servico: { id: string } }) => p.servico.id === id);
    expect((await achar()).etapa).toBe('aguardando_avaliacao');
    amb.relogio.avancar(14 * DIA + HORA);
    const item = await achar();
    expect(item).toMatchObject({ etapa: 'liberar', avaliacao: null });
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/repassar`)).corpo.pagamento.repasseValorCentavos).toBe(14000 - 1680);
    expect(amb.gateway.pix.at(-1)).toMatchObject({ chave: 'ana@exemplo.com', tipo: 'EMAIL' });
  });
});

describe('troca da chave Pix', () => {
  const CPF_A = CPFS[1]!;
  const CPF_B = CPFS[2]!;

  it('pede a senha de novo, avisa por e-mail e não pede para repetir a mesma chave', async () => {
    const pro = await profissionalAprovada(amb);
    const semSenha = await pro.c.patch('/api/profissionais/eu', { chavePix: { tipo: 'CPF', chave: CPF_A } });
    expect(semSenha.status).toBe(422);
    expect(semSenha.corpo.erro).toMatchObject({ codigo: 'senha_exigida', campos: { senhaAtual: 'Confirme com a sua senha.' } });
    const errada = await pro.c.patch('/api/profissionais/eu', { chavePix: { tipo: 'CPF', chave: CPF_A }, senhaAtual: 'nao-e-esta' });
    expect(errada.corpo.erro.codigo).toBe('senha_incorreta');
    expect((await pro.c.get('/api/eu')).corpo.usuario.profissional.chavePix).toBeNull();

    const avisos = amb.mensagens.length;
    const ok = await pro.c.patch('/api/profissionais/eu', { chavePix: { tipo: 'CPF', chave: CPF_A }, senhaAtual: 'senha-de-teste-2' });
    expect(ok.status).toBe(200);
    expect(ok.corpo.usuario.profissional.chavePix.chave).toBe(CPF_A);
    const aviso = amb.mensagens.at(-1)!;
    expect(amb.mensagens.length).toBe(avisos + 1);
    expect(aviso).toMatchObject({ canal: 'email', destino: pro.usuario.email, assunto: 'Sua chave Pix foi alterada' });
    expect(aviso.texto).toContain(`terminado em ${CPF_A.slice(-4)}`);

    // a mesma chave de novo (a tela salva o formulário inteiro): sem senha, sem aviso
    const igual = await pro.c.patch('/api/profissionais/eu', { chavePix: { tipo: 'CPF', chave: CPF_A } });
    expect(igual.status).toBe(200);
    expect(amb.mensagens.length).toBe(avisos + 1);
    // tirar a chave também pede a senha
    expect((await pro.c.patch('/api/profissionais/eu', { chavePix: null })).corpo.erro.codigo).toBe('senha_exigida');
  });

  it('chave trocada depois do atendimento: o repasse espera 48 horas e sai para a chave nova', async () => {
    const admin = await adminNovo();
    const { pro, fam, id } = await pedido(2);
    await pro.c.patch('/api/profissionais/eu', { chavePix: { tipo: 'CPF', chave: CPF_A }, senhaAtual: 'senha-de-teste-2' });
    await aceitarEPagar(pro.c, fam, id);
    amb.relogio.avancar(2 * DIA + 2 * HORA);
    await pro.c.post(`/api/servicos/${id}/concluir`);
    await fam.post(`/api/servicos/${id}/avaliacoes`, { nota: 5 });

    // quem tomou a conta troca a chave na hora de liberar
    await pro.c.patch('/api/profissionais/eu', { chavePix: { tipo: 'CPF', chave: CPF_B }, senhaAtual: 'senha-de-teste-2' });
    const item = (await admin.get('/api/admin/pagamentos')).corpo.pagamentos.find((p: { servico: { id: string } }) => p.servico.id === id);
    const recusa = await admin.post(`/api/admin/pagamentos/${item.id}/repassar`);
    expect(recusa.status).toBe(422);
    expect(recusa.corpo.erro.codigo).toBe('chave_pix_recente');
    expect(amb.gateway.pix.some((p) => p.chave === CPF_B)).toBe(false);

    amb.relogio.avancar(48 * HORA);
    expect((await admin.post(`/api/admin/pagamentos/${item.id}/repassar`)).corpo.pagamento.repasseSituacao).toBe('enviado');
    expect(amb.gateway.pix.at(-1)).toMatchObject({ chave: CPF_B, tipo: 'CPF' });
  });

  it('senha errada na troca soma no mesmo limite do login', async () => {
    const pro = await profissionalAprovada(amb);
    const trocar = (senhaAtual: string) => pro.c.patch('/api/profissionais/eu', { chavePix: { tipo: 'CPF', chave: CPF_A }, senhaAtual });
    for (let i = 0; i < 10; i++) expect((await trocar('chute')).corpo.erro.codigo).toBe('senha_incorreta');
    expect((await trocar('senha-de-teste-2')).status).toBe(429);
    const outro = cliente(amb.app);
    expect((await outro.post('/api/sessoes', { email: pro.usuario.email, senha: 'senha-de-teste-2' })).status).toBe(429);
  });
});

describe('cliente do AbacatePay', () => {
  const falso = (respostas: Record<string, unknown>) => {
    const chamadas: { url: string; metodo: string; corpo: any; auth: string | null }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      const caminho = new URL(url).pathname.replace('/v2', '');
      chamadas.push({ url, metodo: init.method!, corpo: init.body ? JSON.parse(String(init.body)) : null, auth: new Headers(init.headers).get('authorization') });
      const r = respostas[caminho];
      const erro = typeof r === 'string' ? r : null;
      return new Response(JSON.stringify({ data: erro ? null : r, success: !erro, error: erro }), { status: erro ? 400 : 200 });
    }) as unknown as typeof fetch;
    return { f, chamadas };
  };

  it('cria produto e checkout com Pix e cartão, a taxa do cartão por conta da família', async () => {
    const { gatewayAbacatePay } = await import('../src/pagamentos.js');
    const { f, chamadas } = falso({
      '/products/create': { id: 'prod_1' },
      '/checkouts/create': { id: 'bill_1', url: 'https://app.abacatepay.com/pay/bill_1', status: 'PENDING' },
      '/checkouts/get': { id: 'bill_1', url: 'u', status: 'PAID', methods: ['PIX', 'CARD'], installmentsCount: 3, customerFee: 1234, platformFee: 1200 },
      '/checkouts/refund': 'Esta cobrança já foi reembolsada.',
      '/pix/send': { id: 'tran_1', status: 'COMPLETE', receiptUrl: 'https://r', platformFee: 80 },
    });
    const g = gatewayAbacatePay('abc_dev_chave', { fetch: f });
    const c = await g.criarCobranca({ referencia: 'srv-1', descricao: 'Consulta com Ana', valorCentavos: 28000, voltarUrl: 'https://x/pedidos', concluirUrl: 'https://x/pedidos?pago=srv-1' });
    expect(c).toMatchObject({ id: 'bill_1', situacao: 'pendente', url: 'https://app.abacatepay.com/pay/bill_1' });
    expect(chamadas[0]).toMatchObject({ metodo: 'POST', auth: 'Bearer abc_dev_chave', corpo: { name: 'Consulta com Ana', price: 28000, currency: 'BRL' } });
    expect(chamadas[1]!.corpo).toMatchObject({
      items: [{ id: 'prod_1', quantity: 1 }],
      externalId: 'srv-1',
      methods: ['PIX', 'CARD'],
      card: { maxInstallments: 12, passFeesToCustomer: true },
      completionUrl: 'https://x/pedidos?pago=srv-1',
    });
    expect(await g.consultarCobranca('bill_1')).toMatchObject({ situacao: 'pago', metodo: 'CARD', parcelas: 3, acrescimoCentavos: 1234 });
    expect(chamadas[2]!.url).toContain('/checkouts/get?id=bill_1');
    await expect(g.reembolsar('bill_1', 'Cancelado.')).resolves.toBeUndefined();
    expect(await g.enviarPix({ referencia: 'r1', descricao: 'Repasse', valorCentavos: 24640, chave: 'ana@exemplo.com', tipo: 'EMAIL' })).toMatchObject({ id: 'tran_1', taxaCentavos: 80 });
    expect(chamadas.at(-1)!.corpo).toEqual({ amount: 24640, description: 'Repasse', externalId: 'r1', pix: { key: 'ana@exemplo.com', type: 'EMAIL' } });
  });

  it('erro do gateway chega com a mensagem dele', async () => {
    const { gatewayAbacatePay, ErroGateway } = await import('../src/pagamentos.js');
    const { f } = falso({ '/pix/send': 'INSUFFICIENT_FUNDS', '/checkouts/refund': 'TRANSACTION_UNDER_DISPUTE' });
    const g = gatewayAbacatePay('k', { fetch: f });
    await expect(g.enviarPix({ referencia: 'r', descricao: 'd', valorCentavos: 100, chave: 'k', tipo: 'EMAIL' })).rejects.toThrow(ErroGateway);
    await expect(g.reembolsar('bill_1', 'x')).rejects.toThrow('TRANSACTION_UNDER_DISPUTE');
  });
});
