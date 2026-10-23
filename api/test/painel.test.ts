import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { profissionais } from '../src/db/schema.js';
import { aceitarEPagar, ambiente, cliente, DIA, familia, HORA, profissional, profissionalAprovada, tornarAdmin, type Ambiente } from './ajuda.js';

let amb: Ambiente;
beforeAll(async () => {
  amb = await ambiente();
});
afterAll(() => amb.fechar());

async function adminNovo() {
  const c = cliente(amb.app);
  const r = await c.post('/api/contas', familia({ nome: 'Equipe Minha Companhia' }));
  await tornarAdmin(amb, r.corpo.usuario.id);
  return c;
}

describe('convites especiais', () => {
  it('a equipe cria e manda o convite; a profissional se cadastra com os benefícios', async () => {
    const admin = await adminNovo();
    const curioso = cliente(amb.app);
    await curioso.post('/api/profissionais', profissional());
    expect((await curioso.post('/api/admin/convites', { nome: 'Maria' })).status).toBe(403);

    // só os pacotes padrão; taxa e prazo não vêm de fora
    expect((await admin.post('/api/admin/convites', { nome: 'Maria', pacote: 'vip' })).corpo.erro.campos.pacote).toBeTruthy();
    expect((await admin.post('/api/admin/convites', { nome: 'Maria', enviarEmail: true })).corpo.erro.campos.email).toBeTruthy();
    const pacotes = (await admin.get('/api/admin/convites')).corpo.pacotes;
    expect(pacotes.map((p: { id: string }) => p.id)).toEqual(['boas_vindas', 'parceria']);
    expect(pacotes[1]).toMatchObject({ nome: 'Parceria', taxaPercentual: 6, taxaDias: 180, prioridadeFila: true, isencaoMeses: 12 });

    const criado = await admin.post('/api/admin/convites', {
      nome: 'Maria Souza',
      email: 'Maria.Souza@exemplo.com',
      mensagem: 'Foi um prazer conhecer você na feira.',
      // tentar mudar a taxa não muda nada: vale o pacote
      taxaPercentual: 0,
      enviarEmail: true,
    });
    expect(criado.status).toBe(201);
    const { convite } = criado.corpo;
    expect(convite).toMatchObject({ situacao: 'ativo', usos: 0, usosMaximos: 1, email: 'maria.souza@exemplo.com', pacote: 'boas_vindas', nomePacote: 'Boas-vindas', taxaPercentual: 6, taxaDias: 90, prioridadeFila: true, isencaoMeses: 6 });
    expect(convite.codigo).toMatch(/^MC-[A-Z0-9]{8}$/);
    expect(criado.corpo.envio).toEqual({ ok: true });
    const email = amb.mensagens.at(-1)!;
    expect(email).toMatchObject({ canal: 'email', destino: 'maria.souza@exemplo.com' });
    expect(email.texto).toContain(`/entrar?perfil=pro&modo=criar&convite=${convite.codigo}`);
    expect(email.texto).toContain('Com o convite Boas-vindas você tem:');
    expect(email.texto).toContain('taxa da plataforma de 6% (no lugar de 12%) nos primeiros 90 dias depois da aprovação');
    expect(email.texto).toContain('prioridade na análise');
    expect(email.texto).toContain('cadastro e mensalidade sem custo nos primeiros 6 meses');

    // a tela de cadastro mostra o convite sem precisar de conta
    const publico = await cliente(amb.app).get(`/api/convites/${convite.codigo.toLowerCase()}`);
    expect(publico.corpo.convite).toMatchObject({ nome: 'Maria', pacote: 'Boas-vindas', emailExigido: true, mensagem: 'Foi um prazer conhecer você na feira.' });
    expect(publico.corpo.convite.beneficios).toHaveLength(3);

    // o convite com e-mail só vale para aquele e-mail
    const outra = await cliente(amb.app).post('/api/profissionais', profissional({ codigoConvite: convite.codigo }));
    expect(outra.status).toBe(422);
    expect(outra.corpo.erro.codigo).toBe('convite_invalido');

    const maria = cliente(amb.app);
    const r = await maria.post('/api/profissionais', profissional({ nome: 'Maria Souza', email: 'maria.souza@exemplo.com', codigoConvite: convite.codigo }));
    expect(r.status).toBe(201);
    const [p] = await amb.banco.db.select().from(profissionais).where(eq(profissionais.usuarioId, r.corpo.usuario.id));
    // os prazos só começam na aprovação
    expect(p).toMatchObject({ conviteId: convite.id, beneficioPacote: 'boas_vindas', taxaEspecialPercentual: 6, taxaEspecialDias: 90, taxaEspecialAte: null, prioridadeFila: true, isencaoMeses: 6, isencaoAte: null });

    // usado: não vale de novo
    expect((await cliente(amb.app).get(`/api/convites/${convite.codigo}`)).status).toBe(410);
    const lista = (await admin.get('/api/admin/convites')).corpo;
    const meu = lista.convites.find((c: { id: string }) => c.id === convite.id);
    expect(meu).toMatchObject({ situacao: 'usado', usos: 1, cadastradas: [{ nome: 'Maria Souza', situacao: 'rascunho' }] });
  });

  it('convite de vários usos, vencido ou cancelado', async () => {
    const admin = await adminNovo();
    const { convite } = (await admin.post('/api/admin/convites', { nome: 'Turma do Senac', pacote: 'parceria', usosMaximos: 2, validadeDias: 3 })).corpo;
    expect((await cliente(amb.app).post('/api/profissionais', profissional({ codigoConvite: convite.codigo }))).status).toBe(201);
    amb.relogio.avancar(3 * DIA + HORA);
    const vencido = await cliente(amb.app).post('/api/profissionais', profissional({ codigoConvite: convite.codigo }));
    expect(vencido.corpo.erro.mensagem).toContain('não vale mais');

    const outro = (await admin.post('/api/admin/convites', { nome: 'Joana', usosMaximos: 5 })).corpo.convite;
    expect((await admin.post(`/api/admin/convites/${outro.id}/cancelar`)).status).toBe(200);
    expect((await admin.post(`/api/admin/convites/${outro.id}/cancelar`)).status).toBe(409);
    expect((await cliente(amb.app).get(`/api/convites/${outro.codigo}`)).status).toBe(410);
    // sem e-mail, não há o que reenviar
    expect((await admin.post(`/api/admin/convites/${outro.id}/enviar`)).status).toBe(422);
  });

  it('quem tem prioridade passa na frente da lista de espera', async () => {
    const admin = await adminNovo();
    const db = amb.banco.db;
    const comum = (await cliente(amb.app).post('/api/profissionais', profissional({ nome: 'Clara Comum' }))).corpo.usuario.id;
    const vip = (await cliente(amb.app).post('/api/profissionais', profissional({ nome: 'Vera Convidada' }))).corpo.usuario.id;
    const agora = amb.relogio.agora.getTime();
    await db.update(profissionais).set({ situacao: 'em_analise', enviadoAnaliseEm: new Date(agora - 2 * DIA) }).where(eq(profissionais.usuarioId, comum));
    await db.update(profissionais).set({ situacao: 'em_analise', enviadoAnaliseEm: new Date(agora - DIA), prioridadeFila: true }).where(eq(profissionais.usuarioId, vip));
    const fila = (await admin.get('/api/admin/fila')).corpo.fila.filter((f: { id: string }) => [comum, vip].includes(f.id));
    expect(fila.map((f: { nome: string }) => f.nome)).toEqual(['Vera Convidada', 'Clara Comum']);
    await db.update(profissionais).set({ situacao: 'rascunho' }).where(eq(profissionais.usuarioId, comum));
    await db.update(profissionais).set({ situacao: 'rascunho' }).where(eq(profissionais.usuarioId, vip));
  });
});

describe('benefício na taxa', () => {
  it('a taxa especial vale no repasse e no extrato, até o fim do prazo', async () => {
    const admin = await adminNovo();
    const pro = await profissionalAprovada(amb);
    await amb.banco.db.update(profissionais).set({ aprovadoEm: amb.relogio.agora }).where(eq(profissionais.slug, pro.slug));
    // já aprovada: os prazos do pacote começam agora
    const b = await admin.put(`/api/admin/profissionais/${pro.usuario.id}/beneficio`, { pacote: 'boas_vindas' });
    expect(b.corpo.beneficio).toMatchObject({ pacote: 'boas_vindas', nome: 'Boas-vindas', taxaPercentual: 6, taxaDias: 90, prioridadeFila: true, isencaoMeses: 6 });
    expect(new Date(b.corpo.beneficio.taxaAte).getTime()).toBe(amb.relogio.agora.getTime() + 90 * DIA);
    expect(new Date(b.corpo.beneficio.isencaoAte).getTime()).toBeGreaterThan(amb.relogio.agora.getTime() + 180 * DIA);
    expect((await admin.put(`/api/admin/profissionais/${pro.usuario.id}/beneficio`, { pacote: null })).corpo.beneficio).toBeNull();
    await admin.put(`/api/admin/profissionais/${pro.usuario.id}/beneficio`, { pacote: 'boas_vindas' });
    // para testar o fim sem pedir atendimento a 90 dias, o prazo acaba daqui a 10 dias
    await amb.banco.db.update(profissionais).set({ taxaEspecialAte: new Date(amb.relogio.agora.getTime() + 10 * DIA) }).where(eq(profissionais.slug, pro.slug));

    const fam = cliente(amb.app);
    await fam.post('/api/contas', familia());
    const pede = async (dias: number) => {
      const inicio = new Date(amb.relogio.agora.getTime() + dias * DIA).toISOString();
      const { id } = (await fam.post('/api/servicos', { profissional: pro.slug, tarefa: 'Consulta', inicio, horas: 4 })).corpo.servico;
      await aceitarEPagar(pro.c, fam, id);
      return id as string;
    };
    const dentro = await pede(2);
    const depois = await pede(40);
    const itens = (await admin.get('/api/admin/pagamentos')).corpo.pagamentos;
    // 4 h de R$ 70: 6% dentro do prazo, 12% depois
    expect(itens.find((i: { servico: { id: string } }) => i.servico.id === dentro)).toMatchObject({ taxaPercentual: 6, taxaCentavos: 1680, repasseCentavos: 26320 });
    expect(itens.find((i: { servico: { id: string } }) => i.servico.id === depois)).toMatchObject({ taxaPercentual: 12, taxaCentavos: 3360 });

    const g = (await pro.c.get('/api/profissionais/eu/ganhos?ate=' + new Date(amb.relogio.agora.getTime() + 50 * DIA).toISOString().slice(0, 10))).corpo;
    expect(g.taxaEspecial).toMatchObject({ percentual: 6, dias: 90 });
    expect(g.lancamentos.find((l: { servicoId: string }) => l.servicoId === dentro).taxaCentavos).toBe(1680);

    // o painel conta a receita com a taxa de cada profissional
    const resumo = (await admin.get('/api/admin/resumo')).corpo;
    expect(resumo.financeiro.recebidoCentavos).toBeGreaterThanOrEqual(56000);
    expect(resumo.financeiro.receitaPrevistaCentavos).toBeGreaterThanOrEqual(1680 + 3360);
  });
});

describe('painel da administração', () => {
  it('resume a operação e lista as contas com o que falta', async () => {
    const admin = await adminNovo();
    const nova = cliente(amb.app);
    const r = await nova.post('/api/profissionais', profissional({ nome: 'Rita Rascunho', celular: '19 97777-4321' }));
    expect((await nova.get('/api/admin/resumo')).status).toBe(403);

    const resumo = (await admin.get('/api/admin/resumo')).corpo;
    expect(resumo.contas.total).toBeGreaterThan(0);
    expect(resumo.contas.profissionais).toBeGreaterThan(0);
    expect(resumo.profissionais.rascunho).toBeGreaterThan(0);
    expect(resumo.financeiro.meses).toHaveLength(6);
    expect(resumo.recentes[0]).toMatchObject({ nome: 'Rita Rascunho', tipo: 'profissional', situacao: 'rascunho' });

    const busca = (await admin.get('/api/admin/usuarios?busca=rita')).corpo;
    expect(busca.total).toBe(1);
    expect(busca.usuarios[0]).toMatchObject({
      id: r.corpo.usuario.id,
      papeis: ['profissional'],
      profissional: { situacao: 'rascunho', cidade: 'Campinas' },
      falta: ['email', 'dadosFiscais', 'endereco', 'documentos', 'valorHora'],
    });
    expect(busca.usuarios[0].ultimoAcesso).toBeTruthy();
    expect((await admin.get('/api/admin/usuarios?busca=4321')).corpo.total).toBe(1);

    const rascunhos = (await admin.get('/api/admin/usuarios?filtro=rascunho')).corpo.usuarios;
    expect(rascunhos.every((u: { profissional: { situacao: string } }) => u.profissional.situacao === 'rascunho')).toBe(true);
    const admins = (await admin.get('/api/admin/usuarios?filtro=admins')).corpo.usuarios;
    expect(admins.every((u: { papeis: string[] }) => u.papeis.includes('admin'))).toBe(true);
    // filtro desconhecido é ignorado, busca com % não vira curinga
    expect((await admin.get('/api/admin/usuarios?filtro=xyz')).status).toBe(200);
    expect((await admin.get('/api/admin/usuarios?busca=%25')).corpo.total).toBe(0);
  });
});
