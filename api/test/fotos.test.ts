import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ambiente, cliente, familia, PDF, profissionalAprovada, tornarAdmin, type Ambiente } from './ajuda.js';

let amb: Ambiente;
let admin: ReturnType<typeof cliente>;
beforeAll(async () => {
  amb = await ambiente();
  admin = cliente(amb.app);
  const r = await admin.post('/api/contas', familia({ nome: 'Equipe Minha Companhia' }));
  await tornarAdmin(amb, r.corpo.usuario.id);
});
afterAll(() => amb.fechar());

// foto grande de celular, com a localização GPS gravada no EXIF
const fotoDeCelular = () =>
  sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#b08060' } })
    .jpeg()
    .withExif({ IFD0: { Make: 'Celular', Model: 'Teste' }, IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '22/1 54/1 0/1' } })
    .toBuffer();

const baixar = (c: ReturnType<typeof cliente> | null, url: string) => (c ? c.get(url) : cliente(amb.app).get(url));

describe('foto do perfil', () => {
  it('regrava sem metadados e só aparece depois da conferência', async () => {
    const pro = await profissionalAprovada(amb);
    const original = await fotoDeCelular();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const r = await pro.c.enviarArquivo('/api/profissionais/eu/foto', {}, { nome: 'IMG_0001.jpg', dados: original });
    expect(r.status).toBe(201);
    expect(r.corpo).toMatchObject({ foto: { situacao: 'enviada', motivoRecusa: null }, fotoUrl: null });
    expect(r.corpo.usuario.profissional.foto).toEqual(r.corpo.foto);
    const url = r.corpo.foto.url as string;

    // só a dona e a administração veem a foto em conferência
    expect((await baixar(null, url)).status).toBe(404);
    const daDona = await pro.c.get(url);
    expect(daDona.status).toBe(200);
    expect(daDona.resposta.headers['content-type']).toBe('image/webp');
    const meta = await sharp(daDona.resposta.rawPayload).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 1200, height: 800 });
    expect(meta.exif).toBeUndefined();

    expect((await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).corpo.profissional.fotoUrl).toBeNull();
    const pendentes = (await admin.get('/api/admin/fotos')).corpo.fotos;
    expect(pendentes.find((f: { url: string }) => f.url === url)).toBeDefined();
    expect((await admin.get(url)).status).toBe(200);
    expect((await pro.c.post(`/api/admin/fotos/${url.split('/').at(-1)}/aprovar`)).status).toBe(403);
    await admin.post(`/api/admin/fotos/${url.split('/').at(-1)}/aprovar`);

    const publico = (await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).corpo.profissional;
    expect(publico.fotoUrl).toBe(url);
    const aberta = await baixar(null, url);
    expect(aberta.status).toBe(200);
    expect(aberta.resposta.headers['cache-control']).toBe('public, max-age=86400');
  });

  it('a aprovada fica no ar até a nova ser aprovada; recusada mostra o motivo', async () => {
    const pro = await profissionalAprovada(amb);
    const envia = async () => (await pro.c.enviarArquivo('/api/profissionais/eu/foto', {}, { nome: 'f.jpg', dados: await fotoDeCelular() })).corpo;
    const id = (url: string) => url.split('/').at(-1)!;

    const primeira = (await envia()).foto.url;
    await admin.post(`/api/admin/fotos/${id(primeira)}/aprovar`);
    const segunda = await envia();
    expect(segunda).toMatchObject({ foto: { situacao: 'enviada' }, fotoUrl: primeira });

    expect((await admin.post(`/api/admin/fotos/${id(segunda.foto.url)}/recusar`, {})).status).toBe(400);
    await admin.post(`/api/admin/fotos/${id(segunda.foto.url)}/recusar`, { motivo: 'O rosto precisa aparecer inteiro.' });
    const conta = (await pro.c.get('/api/eu')).corpo.usuario.profissional;
    expect(conta).toMatchObject({ foto: { situacao: 'recusada', motivoRecusa: 'O rosto precisa aparecer inteiro.' }, fotoUrl: primeira });

    const terceira = (await envia()).foto.url;
    expect((await pro.c.get(segunda.foto.url)).status).toBe(404);
    await admin.post(`/api/admin/fotos/${id(terceira)}/aprovar`);
    expect((await cliente(amb.app).get(`/api/profissionais/${pro.slug}`)).corpo.profissional.fotoUrl).toBe(terceira);
    expect((await baixar(null, primeira)).status).toBe(404);
  });

  it('recusa PDF e arquivo que não é imagem', async () => {
    const pro = await profissionalAprovada(amb);
    expect((await pro.c.enviarArquivo('/api/profissionais/eu/foto', {}, { nome: 'doc.pdf', dados: PDF })).status).toBe(415);
    const quebrada = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
    const r = await pro.c.enviarArquivo('/api/profissionais/eu/foto', {}, { nome: 'x.jpg', dados: quebrada });
    expect(r.status).toBe(415);
    expect(r.corpo.erro.codigo).toBe('foto_ilegivel');
  });
});
