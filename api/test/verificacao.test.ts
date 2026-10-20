import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ambiente,
  cliente,
  CNPJ,
  CPFS,
  DIA,
  enderecoTeste,
  familia,
  HORA,
  PDF,
  PNG,
  profissional,
  profissionalAprovada,
  tornarAdmin,
  ultimoCodigo,
  type Ambiente,
} from './ajuda.js';

let amb: Ambiente;
let admin: ReturnType<typeof cliente>;
beforeAll(async () => {
  amb = await ambiente();
  admin = cliente(amb.app);
  const r = await admin.post('/api/contas', familia({ nome: 'Equipe Minha Companhia' }));
  await tornarAdmin(amb, r.corpo.usuario.id);
});
afterAll(() => amb.fechar());

const cpfs = [...CPFS];

// profissional nova, já com e-mail e WhatsApp confirmados
async function novaProfissional(extra: Record<string, unknown> = {}) {
  const c = cliente(amb.app);
  const dados = profissional(extra);
  const r = await c.post('/api/profissionais', dados);
  const u = r.corpo.usuario;
  for (const canal of ['email', 'whatsapp'] as const) {
    await c.post('/api/eu/verificacoes', { canal });
    const destino = canal === 'email' ? u.email : u.celular;
    expect((await c.post('/api/eu/verificacoes/confirmar', { canal, codigo: ultimoCodigo(amb, destino) })).status).toBe(200);
  }
  return { c, u };
}

// ...e com CPF, endereço e os dois documentos: pronta para a lista de espera
async function profissionalCompleta(extra: Record<string, unknown> = {}) {
  const p = await novaProfissional(extra);
  expect((await p.c.put('/api/profissionais/eu/dados-fiscais', { cpf: cpfs.shift(), endereco: enderecoTeste })).status).toBe(200);
  await p.c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'documento_identidade' }, { nome: 'rg.png', dados: PNG });
  await p.c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'comprovante_endereco' }, { nome: 'conta-de-luz.pdf', dados: PDF });
  return p;
}

describe('confirmação de e-mail e WhatsApp', () => {
  it('envia código para o WhatsApp e confirma', async () => {
    const c = cliente(amb.app);
    const { corpo } = await c.post('/api/profissionais', profissional({ celular: '(19) 98888-1234' }));
    const r = await c.post('/api/eu/verificacoes', { canal: 'whatsapp' });
    expect(r.status).toBe(202);
    expect(r.corpo.enviadoPara).toBe('(19) *****-1234');
    expect(amb.mensagens.at(-1)).toMatchObject({ canal: 'whatsapp', destino: '19988881234' });

    expect((await c.post('/api/eu/verificacoes/confirmar', { canal: 'whatsapp', codigo: '000000' })).status).toBe(422);
    const ok = await c.post('/api/eu/verificacoes/confirmar', { canal: 'whatsapp', codigo: ultimoCodigo(amb, corpo.usuario.celular) });
    expect(ok.status).toBe(200);
    expect((await c.get('/api/eu')).corpo.usuario.celularVerificado).toBe(true);
    expect((await c.post('/api/eu/verificacoes', { canal: 'whatsapp' })).status).toBe(409);
  });

  it('espera um minuto para reenviar e o código vence em 15 minutos', async () => {
    const c = cliente(amb.app);
    const { corpo } = await c.post('/api/contas', familia());
    await c.post('/api/eu/verificacoes', { canal: 'email' });
    expect((await c.post('/api/eu/verificacoes', { canal: 'email' })).status).toBe(429);
    const codigo = ultimoCodigo(amb, corpo.usuario.email);
    amb.relogio.avancar(16 * 60 * 1000);
    const r = await c.post('/api/eu/verificacoes/confirmar', { canal: 'email', codigo });
    expect(r.status).toBe(422);
    expect(r.corpo.erro.mensagem).toContain('expirou');
  });

  it('bloqueia o código depois de 5 tentativas erradas', async () => {
    const c = cliente(amb.app);
    const { corpo } = await c.post('/api/contas', familia());
    await c.post('/api/eu/verificacoes', { canal: 'email' });
    for (let i = 0; i < 5; i++) await c.post('/api/eu/verificacoes/confirmar', { canal: 'email', codigo: '999999' });
    const r = await c.post('/api/eu/verificacoes/confirmar', { canal: 'email', codigo: ultimoCodigo(amb, corpo.usuario.email) });
    expect(r.corpo.erro.mensagem).toContain('Muitas tentativas');
  });
});

describe('CPF, CNPJ e endereço', () => {
  it('confere os dígitos e devolve o CPF mascarado', async () => {
    const { c } = await novaProfissional();
    const errado = await c.put('/api/profissionais/eu/dados-fiscais', { cpf: '123.456.789-00', endereco: enderecoTeste });
    expect(errado.status).toBe(400);
    expect(errado.corpo.erro.campos.cpf).toContain('não batem');
    const r = await c.put('/api/profissionais/eu/dados-fiscais', { cpf: '935.411.347-80', endereco: enderecoTeste });
    expect(r.status).toBe(200);
    expect(r.corpo.verificacao.dadosFiscais).toEqual({ cpf: '***.411.347-**', cnpj: null, razaoSocial: null });
    expect(r.corpo.verificacao.endereco).toMatchObject({ cep: '13025320', cidade: 'Campinas' });
    expect(JSON.stringify(r.corpo)).not.toContain('93541134780');
  });

  it('o mesmo CPF não serve para dois cadastros', async () => {
    const a = await novaProfissional();
    const b = await novaProfissional();
    const cpf = cpfs.shift();
    await a.c.put('/api/profissionais/eu/dados-fiscais', { cpf, endereco: enderecoTeste });
    const r = await b.c.put('/api/profissionais/eu/dados-fiscais', { cpf, endereco: enderecoTeste });
    expect(r.status).toBe(409);
    expect(r.corpo.erro.codigo).toBe('cpf_em_uso');
  });

  it('com CNPJ, pede razão social e o cartão CNPJ', async () => {
    const { c } = await novaProfissional();
    const sem = await c.put('/api/profissionais/eu/dados-fiscais', { cpf: '529.982.247-25', cnpj: CNPJ, endereco: enderecoTeste });
    expect(sem.status).toBe(400);
    expect(sem.corpo.erro.campos.razaoSocial).toBeDefined();
    const r = await c.put('/api/profissionais/eu/dados-fiscais', { cpf: '529.982.247-25', cnpj: CNPJ, razaoSocial: 'Ana Oliveira MEI', endereco: enderecoTeste });
    expect(r.corpo.verificacao.documentos.map((d: { tipo: string }) => d.tipo)).toEqual(['documento_identidade', 'comprovante_endereco', 'cartao_cnpj']);
  });
});

describe('documentos', () => {
  it('aceita PDF e imagem, recusa outro formato e substitui o envio anterior', async () => {
    const { c } = await novaProfissional();
    const txt = await c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'comprovante_endereco' }, { nome: 'conta.pdf', dados: Buffer.from('não sou pdf') });
    expect(txt.status).toBe(415);
    const a = await c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'comprovante_endereco' }, { nome: 'conta.pdf', dados: PDF });
    expect(a.status).toBe(201);
    expect(a.corpo.documento).toMatchObject({ tipo: 'comprovante_endereco', situacao: 'enviado', tipoArquivo: 'application/pdf' });
    const b = await c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'comprovante_endereco' }, { nome: 'foto.png', dados: PNG });
    const atual = b.corpo.verificacao.documentos.find((d: { tipo: string }) => d.tipo === 'comprovante_endereco');
    expect(atual.arquivo).toMatchObject({ id: b.corpo.documento.id, nome: 'foto.png' });

    const proprio = await c.get(`/api/profissionais/eu/documentos/${b.corpo.documento.id}/arquivo`);
    expect(proprio.status).toBe(200);
    expect(proprio.resposta.headers['content-type']).toBe('image/png');
    expect(proprio.resposta.headers['cache-control']).toBe('private, no-store');
    const outra = await novaProfissional();
    expect((await outra.c.get(`/api/profissionais/eu/documentos/${b.corpo.documento.id}/arquivo`)).status).toBe(404);
  });

  it('recusa arquivo acima de 10 MB', async () => {
    const { c } = await novaProfissional();
    const grande = Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024 + 1)]);
    const r = await c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'comprovante_endereco' }, { nome: 'grande.pdf', dados: grande });
    expect(r.status).toBe(413);
  });
});

describe('lista de espera', () => {
  it('diz o que falta e só deixa entrar com tudo enviado', async () => {
    const c = cliente(amb.app);
    await c.post('/api/profissionais', profissional());
    const r = await c.post('/api/profissionais/eu/analise');
    expect(r.status).toBe(422);
    expect(Object.keys(r.corpo.erro.campos).sort()).toEqual(['dadosFiscais', 'documentos', 'email', 'endereco', 'whatsapp']);
    const v = await c.get('/api/profissionais/eu/verificacao');
    expect(v.corpo.verificacao).toMatchObject({ situacao: 'rascunho', podeEnviar: false, filaDeEspera: null });
  });

  it('entra na fila com posição e fica sem poder mudar os dados', async () => {
    const a = await profissionalCompleta({ nome: 'Joana Prado' });
    const b = await profissionalCompleta({ nome: 'Vera Nunes' });
    const ra = await a.c.post('/api/profissionais/eu/analise');
    expect(ra.corpo.verificacao).toMatchObject({ situacao: 'em_analise', filaDeEspera: { posicao: 1 } });
    amb.relogio.avancar(HORA);
    const rb = await b.c.post('/api/profissionais/eu/analise');
    expect(rb.corpo.verificacao.filaDeEspera.posicao).toBe(2);
    expect((await a.c.put('/api/profissionais/eu/dados-fiscais', { cpf: '111.444.777-35', endereco: enderecoTeste })).status).toBe(409);
    expect((await a.c.post('/api/profissionais/eu/analise')).status).toBe(409);
  });
});

describe('aprovação pela administração', () => {
  it('só a administração vê a fila e a ficha completa', async () => {
    const p = await profissionalCompleta();
    await p.c.post('/api/profissionais/eu/analise');
    expect((await p.c.get('/api/admin/fila')).status).toBe(403);
    const fila = (await admin.get('/api/admin/fila')).corpo.fila;
    expect(fila.at(-1)).toMatchObject({ id: p.u.id, posicao: fila.length });
    const ficha = (await admin.get(`/api/admin/profissionais/${p.u.id}`)).corpo.profissional;
    expect(ficha.cpf).toMatch(/^\d{11}$/);
    expect(ficha.documentos).toHaveLength(2);
    const arquivo = await admin.get(`/api/admin/documentos/${ficha.documentos[0].id}/arquivo`);
    expect(arquivo.status).toBe(200);
  });

  it('aprova depois dos documentos; com documento recusado, volta para correção', async () => {
    const p = await profissionalCompleta();
    await p.c.post('/api/profissionais/eu/analise');
    const ficha = (await admin.get(`/api/admin/profissionais/${p.u.id}`)).corpo.profissional;
    const [rg, conta] = ficha.documentos;

    expect((await admin.post(`/api/admin/profissionais/${p.u.id}/aprovar`)).status).toBe(422);
    expect((await admin.post(`/api/admin/documentos/${conta.id}/recusar`, {})).status).toBe(400);
    await admin.post(`/api/admin/documentos/${conta.id}/recusar`, { motivo: 'Comprovante com mais de 90 dias.' });
    await admin.post(`/api/admin/documentos/${rg.id}/aprovar`);
    await admin.post(`/api/admin/profissionais/${p.u.id}/correcao`, { motivo: 'Envie um comprovante de endereço recente.' });

    const v = (await p.c.get('/api/profissionais/eu/verificacao')).corpo.verificacao;
    expect(v).toMatchObject({ situacao: 'correcao', motivoCorrecao: 'Envie um comprovante de endereço recente.', falta: ['documentos'] });
    expect(v.documentos.find((d: { tipo: string }) => d.tipo === 'comprovante_endereco')).toMatchObject({ situacao: 'recusado', motivoRecusa: 'Comprovante com mais de 90 dias.' });

    const novo = await p.c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'comprovante_endereco' }, { nome: 'conta-nova.pdf', dados: PDF });
    await p.c.post('/api/profissionais/eu/analise');
    await admin.post(`/api/admin/documentos/${novo.corpo.documento.id}/aprovar`);
    expect((await admin.post(`/api/admin/profissionais/${p.u.id}/aprovar`)).status).toBe(200);
    const depois = (await p.c.get('/api/eu')).corpo.usuario.profissional;
    expect(depois.situacao).toBe('aprovado');
  });
});

describe('indicações', () => {
  it('quem indica acompanha cadastro, aprovação e primeiro serviço', async () => {
    const ana = await profissionalCompleta({ nome: 'Ana Oliveira' });
    const minha = await ana.c.get('/api/indicacoes/eu');
    const codigo = minha.corpo.codigo as string;
    expect(codigo).toMatch(/^ANA-[A-Z0-9]{4}$/);
    expect(minha.corpo.links.profissional).toContain(`indicacao=${codigo}`);
    expect((await ana.c.get('/api/indicacoes/eu')).corpo.codigo).toBe(codigo);

    expect((await cliente(amb.app).get(`/api/indicacoes/${codigo.toLowerCase()}`)).corpo).toEqual({ codigo, indicador: 'Ana O.' });
    expect((await cliente(amb.app).post('/api/profissionais', profissional({ codigoIndicacao: 'NAO-EXIS' }))).status).toBe(400);

    // uma profissional e uma família chegam pelo código da Ana
    const claudia = await profissionalCompleta({ nome: 'Cláudia Ramos', codigoIndicacao: codigo });
    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia({ nome: 'Rafael Souza', codigoIndicacao: codigo }));
    let lista = (await ana.c.get('/api/indicacoes/eu')).corpo;
    expect(lista.resumo).toEqual({ cadastradas: 2, aprovadas: 0, comPrimeiroServico: 0 });
    expect(lista.indicadas.map((i: { nome: string; tipo: string; etapa: string }) => [i.nome, i.tipo, i.etapa])).toEqual([
      ['Cláudia R.', 'profissional', 'cadastrada'],
      ['Rafael S.', 'familia', 'cadastrada'],
    ]);
    expect(JSON.stringify(lista)).not.toContain('Ramos');

    // a administração vê de quem veio a indicação e aprova
    await claudia.c.post('/api/profissionais/eu/analise');
    const ficha = (await admin.get(`/api/admin/profissionais/${claudia.u.id}`)).corpo.profissional;
    expect(ficha.indicadoPor).toEqual({ nome: 'Ana Oliveira', codigo });
    for (const d of ficha.documentos) await admin.post(`/api/admin/documentos/${d.id}/aprovar`);
    await admin.post(`/api/admin/profissionais/${claudia.u.id}/aprovar`);

    // o Rafael faz o primeiro serviço com outra profissional
    const pro = await profissionalAprovada(amb);
    const inicio = new Date(amb.relogio.agora.getTime() + DIA).toISOString();
    const { id } = (await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Banco', inicio, horas: 2 })).corpo.servico;
    await pro.c.post(`/api/servicos/${id}/aceitar`);
    amb.relogio.avancar(DIA + 3 * HORA);
    await pro.c.post(`/api/servicos/${id}/concluir`);

    lista = (await ana.c.get('/api/indicacoes/eu')).corpo;
    expect(lista.resumo).toEqual({ cadastradas: 2, aprovadas: 1, comPrimeiroServico: 1 });
    expect(lista.indicadas.map((i: { etapa: string }) => i.etapa)).toEqual(['aprovada', 'primeiro_servico']);
  });
});

describe('CNH de quem atende com veículo', () => {
  it('com veículo, a CNH entra na lista e a aprovação espera por ela', async () => {
    const p = await profissionalCompleta();
    expect((await p.c.patch('/api/profissionais/eu', { veiculoIncluso: true })).status).toBe(200);
    let v = (await p.c.get('/api/profissionais/eu/verificacao')).corpo.verificacao;
    expect(v.veiculoIncluso).toBe(true);
    expect(v.documentos.find((d: { tipo: string }) => d.tipo === 'cnh')).toMatchObject({ situacao: 'pendente' });
    expect(v.falta).toEqual(['documentos']);
    expect((await p.c.post('/api/profissionais/eu/analise')).status).toBe(422);

    await p.c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'cnh' }, { nome: 'cnh.pdf', dados: PDF });
    v = (await p.c.post('/api/profissionais/eu/analise')).corpo.verificacao;
    expect(v.situacao).toBe('em_analise');

    const ficha = (await admin.get(`/api/admin/profissionais/${p.u.id}`)).corpo.profissional;
    expect(ficha.documentosExigidos.map((d: { tipo: string }) => d.tipo)).toContain('cnh');
    for (const d of ficha.documentos.filter((x: { tipo: string }) => x.tipo !== 'cnh')) await admin.post(`/api/admin/documentos/${d.id}/aprovar`);
    expect((await admin.post(`/api/admin/profissionais/${p.u.id}/aprovar`)).corpo.erro.mensagem).toContain('CNH');
    const cnh = ficha.documentos.find((x: { tipo: string }) => x.tipo === 'cnh');
    await admin.post(`/api/admin/documentos/${cnh.id}/aprovar`);
    expect((await admin.post(`/api/admin/profissionais/${p.u.id}/aprovar`)).status).toBe(200);
  });

  it('na fila, não dá para passar a oferecer veículo', async () => {
    const p = await profissionalCompleta();
    await p.c.post('/api/profissionais/eu/analise');
    expect((await p.c.patch('/api/profissionais/eu', { veiculoIncluso: true })).status).toBe(409);
  });

  it('aprovada sem veículo manda a CNH e só oferece veículo depois de aprovada', async () => {
    const p = await profissionalCompleta();
    await p.c.post('/api/profissionais/eu/analise');
    const ficha = (await admin.get(`/api/admin/profissionais/${p.u.id}`)).corpo.profissional;
    for (const d of ficha.documentos) await admin.post(`/api/admin/documentos/${d.id}/aprovar`);
    await admin.post(`/api/admin/profissionais/${p.u.id}/aprovar`);

    const antes = await p.c.patch('/api/profissionais/eu', { veiculoIncluso: true });
    expect(antes.status).toBe(422);
    expect(antes.corpo.erro.codigo).toBe('cnh_pendente');
    expect((await p.c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'comprovante_endereco' }, { nome: 'x.pdf', dados: PDF })).status).toBe(409);
    const cnh = await p.c.enviarArquivo('/api/profissionais/eu/documentos', { tipo: 'cnh' }, { nome: 'cnh.png', dados: PNG });
    expect(cnh.status).toBe(201);
    expect((await p.c.patch('/api/profissionais/eu', { veiculoIncluso: true })).corpo.erro.campos.veiculoIncluso).toContain('em análise');
    await admin.post(`/api/admin/documentos/${cnh.corpo.documento.id}/aprovar`);
    const depois = await p.c.patch('/api/profissionais/eu', { veiculoIncluso: true });
    expect(depois.corpo.usuario.profissional.veiculoIncluso).toBe(true);
  });
});

describe('cursos e treinamentos', () => {
  it('envia o curso com comprovante; só o aprovado aparece no portfólio', async () => {
    const pro = await profissionalAprovada(amb);
    const errado = await pro.c.enviarArquivo('/api/profissionais/eu/qualificacoes', { titulo: 'Cuidador de idosos', instituicao: 'Senac', anoConclusao: '1900' }, { nome: 'cert.pdf', dados: PDF });
    expect(errado.status).toBe(400);
    expect(errado.corpo.erro.campos.anoConclusao).toBeDefined();

    const a = await pro.c.enviarArquivo('/api/profissionais/eu/qualificacoes', { titulo: 'Cuidador de idosos', instituicao: 'Senac', cargaHorariaHoras: '160', anoConclusao: '2021' }, { nome: 'certificado.pdf', dados: PDF });
    expect(a.status).toBe(201);
    expect(a.corpo.qualificacao).toMatchObject({ titulo: 'Cuidador de idosos', cargaHorariaHoras: 160, anoConclusao: 2021, situacao: 'enviado' });
    const b = await pro.c.enviarArquivo('/api/profissionais/eu/qualificacoes', { titulo: 'Primeiros socorros', instituicao: 'Cruz Vermelha', cargaHorariaHoras: '' }, { nome: 'ps.png', dados: PNG });
    expect(b.corpo.qualificacao.cargaHorariaHoras).toBeNull();

    expect((await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).corpo.profissional.qualificacoes).toEqual([]);

    const pendentes = (await admin.get('/api/admin/qualificacoes')).corpo.qualificacoes;
    expect(pendentes.filter((q: { profissional: { id: string } }) => q.profissional.id === pro.usuario.id)).toHaveLength(2);
    expect((await admin.get(`/api/admin/qualificacoes/${a.corpo.qualificacao.id}/arquivo`)).status).toBe(200);
    expect((await admin.post(`/api/admin/qualificacoes/${b.corpo.qualificacao.id}/recusar`, {})).status).toBe(400);
    await admin.post(`/api/admin/qualificacoes/${b.corpo.qualificacao.id}/recusar`, { motivo: 'O certificado não mostra o nome completo.' });
    await admin.post(`/api/admin/qualificacoes/${a.corpo.qualificacao.id}/aprovar`);

    const publico = (await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).corpo.profissional.qualificacoes;
    expect(publico).toEqual([{ titulo: 'Cuidador de idosos', instituicao: 'Senac', cargaHorariaHoras: 160, anoConclusao: 2021, verificadoEm: expect.any(String) }]);
    const meus = (await pro.c.get('/api/profissionais/eu/qualificacoes')).corpo.qualificacoes;
    expect(meus.find((q: { id: string }) => q.id === b.corpo.qualificacao.id)).toMatchObject({ situacao: 'recusado', motivoRecusa: 'O certificado não mostra o nome completo.' });
    const ficha = (await admin.get(`/api/admin/profissionais/${pro.usuario.id}`)).corpo.profissional;
    expect(ficha.qualificacoes).toHaveLength(2);
  });

  it('só a dona vê e apaga o curso; apagar remove o comprovante', async () => {
    const pro = await profissionalAprovada(amb);
    const q = (await pro.c.enviarArquivo('/api/profissionais/eu/qualificacoes', { titulo: 'Curso de libras', instituicao: 'Instituto X' }, { nome: 'libras.pdf', dados: PDF })).corpo.qualificacao;
    const outra = await profissionalAprovada(amb);
    expect((await outra.c.get(`/api/profissionais/eu/qualificacoes/${q.id}/arquivo`)).status).toBe(404);
    expect((await outra.c.delete(`/api/profissionais/eu/qualificacoes/${q.id}`)).status).toBe(404);
    expect((await pro.c.get(`/api/profissionais/eu/qualificacoes/${q.id}/arquivo`)).status).toBe(200);
    expect((await pro.c.delete(`/api/profissionais/eu/qualificacoes/${q.id}`)).status).toBe(204);
    expect((await pro.c.get(`/api/profissionais/eu/qualificacoes/${q.id}/arquivo`)).status).toBe(404);
  });
});
