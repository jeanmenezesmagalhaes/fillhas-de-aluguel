import { BlockList, isIP } from 'node:net';

// Faixas de onde o Cloudflare conecta (https://www.cloudflare.com/ips). Mudam raramente.
const FAIXAS = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32',
];

const cloudflare = new BlockList();
for (const faixa of FAIXAS) {
  const [rede, bits] = faixa.split('/') as [string, string];
  cloudflare.addSubnet(rede, Number(bits), isIP(rede) === 6 ? 'ipv6' : 'ipv4');
}

// Com o proxy do Cloudflare na frente da Vercel, quem conecta na Vercel é o Cloudflare, e o
// visitante vem em cf-connecting-ip. Só vale se o pedido chegou mesmo pelo Cloudflare: quem
// bate direto na Vercel poderia inventar o cabeçalho e trocar de "IP" a cada tentativa.
export function ipDoVisitante(ipVisto: string, cfConnectingIp: string | string[] | undefined): string | null {
  if (typeof cfConnectingIp !== 'string' || !isIP(cfConnectingIp)) return null;
  const ip = ipVisto.startsWith('::ffff:') ? ipVisto.slice(7) : ipVisto;
  const tipo = isIP(ip);
  if (!tipo || !cloudflare.check(ip, tipo === 6 ? 'ipv6' : 'ipv4')) return null;
  return cfConnectingIp;
}
