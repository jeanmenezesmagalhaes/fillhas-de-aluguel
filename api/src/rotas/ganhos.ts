import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exigirProfissional } from '../auth.js';
import type { Contexto } from '../contexto.js';
import { avaliacoes, pagamentos, pessoasAcompanhadas, profissionais, servicos, usuarios } from '../db/schema.js';
import { PRAZO_AVALIACAO_MS } from '../avaliacoes.js';
import { ErroApi } from '../erros.js';
import { dataBrasilia, diasUteisDepois, percentualDaTaxa, REGRAS, taxaDe } from '../financeiro.js';
import { beneficioDaProfissional } from './pagamentos.js';

const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;

type Estado = 'previsto' | 'aguardando_conclusao' | 'programado' | 'depositado';

const periodo = z.object({
  de: z.iso.date('Use a data no formato AAAA-MM-DD.').optional(),
  ate: z.iso.date('Use a data no formato AAAA-MM-DD.').optional(),
});

const primeiro = (nome: string) => nome.trim().split(/\s+/)[0]!;

export function rotasGanhos(app: FastifyInstance, ctx: Contexto) {
  // Extrato da profissional no período (pela data do atendimento): o que a família paga,
  // o desconto que ela deu, a taxa, o que fica com ela e quando cai na conta.
  app.get('/api/profissionais/eu/ganhos', async (req) => {
    const u = exigirProfissional(req);
    const agora = ctx.agora();
    const hoje = dataBrasilia(agora);
    const p = periodo.parse(req.query);
    const de = p.de ?? dataBrasilia(new Date(agora.getTime() - 30 * DIA_MS));
    const ate = p.ate ?? dataBrasilia(new Date(agora.getTime() + 60 * DIA_MS));
    if (de > ate) throw new ErroApi(422, 'periodo_invalido', 'A data inicial precisa vir antes da final.', { de: 'Confira o período.' });
    if (new Date(ate).getTime() - new Date(de).getTime() > 400 * DIA_MS) {
      throw new ErroApi(422, 'periodo_longo', 'Consulte no máximo 13 meses de cada vez.', { de: 'Período longo demais.' });
    }

    const linhas = await ctx.db
      .select({
        id: servicos.id,
        tarefa: servicos.tarefa,
        inicio: servicos.inicio,
        horas: servicos.horas,
        valorHora: servicos.valorHoraCentavos,
        valorHoraCheio: servicos.valorHoraCheioCentavos,
        situacao: servicos.situacao,
        realizadoEm: servicos.realizadoEm,
        canceladoEm: servicos.canceladoEm,
        canceladoPor: servicos.canceladoPor,
        familia: usuarios.nome,
        pessoa: pessoasAcompanhadas.nome,
        pagamento: {
          situacao: pagamentos.situacao,
          metodo: pagamentos.metodo,
          parcelas: pagamentos.parcelas,
          repasse: pagamentos.repasseSituacao,
          repassadoEm: pagamentos.repassadoEm,
        },
        avaliadoPelaFamilia: avaliacoes.id,
      })
      .from(servicos)
      .innerJoin(usuarios, eq(usuarios.id, servicos.contratanteId))
      .leftJoin(pessoasAcompanhadas, eq(pessoasAcompanhadas.id, servicos.pessoaAcompanhadaId))
      .leftJoin(pagamentos, eq(pagamentos.servicoId, servicos.id))
      .leftJoin(avaliacoes, and(eq(avaliacoes.servicoId, servicos.id), eq(avaliacoes.sentido, 'familia_avalia_profissional')))
      .where(
        and(
          eq(servicos.profissionalId, u.id),
          inArray(servicos.situacao, ['confirmado', 'realizado', 'cancelado']),
          // data do atendimento em Brasília dentro do período
          gte(servicos.inicio, new Date(`${de}T03:00:00Z`)),
          lte(servicos.inicio, new Date(new Date(`${ate}T03:00:00Z`).getTime() + DIA_MS - 1)),
        ),
      )
      .orderBy(asc(servicos.inicio));

    const [beneficio] = await ctx.db
      .select({ ...beneficioDaProfissional, dias: profissionais.taxaEspecialDias })
      .from(profissionais)
      .where(eq(profissionais.usuarioId, u.id));

    const lancamentos = linhas.flatMap((s) => {
      const fim = new Date(s.inicio.getTime() + s.horas * HORA_MS);
      const cheio = s.horas * (s.valorHoraCheio ?? s.valorHora);
      const total = s.horas * s.valorHora;
      let tipo: 'atendimento' | 'cancelamento_tardio' = 'atendimento';
      let bruto = total;
      let estado: Estado;
      let depositoEm: string | null;
      if (s.situacao === 'cancelado') {
        // só entra o cancelamento da família em cima da hora; os outros não geram valor
        const tardio =
          s.canceladoPor === 'contratante' &&
          s.canceladoEm &&
          s.inicio.getTime() - s.canceladoEm.getTime() < REGRAS.cancelamentoTardioHoras * HORA_MS;
        // com o pagamento devolvido (no MVP, todo cancelamento devolve tudo), não há o que receber
        if (!tardio || s.pagamento?.situacao === 'reembolsado') return [];
        tipo = 'cancelamento_tardio';
        bruto = Math.round((total * REGRAS.cancelamentoTardioPercentual) / 100);
        depositoEm = diasUteisDepois(dataBrasilia(s.inicio), REGRAS.prazoDepositoDiasUteis);
        estado = depositoEm <= hoje ? 'depositado' : 'programado';
      } else if (s.pagamento?.situacao === 'pago' && (s.situacao === 'realizado' || s.inicio > agora)) {
        // Pagamento de verdade: cai na conta quando a equipe libera o repasse, depois da avaliação
        // da família (ou do fim do prazo de avaliar). Até lá, a data é uma estimativa: o dia útil
        // seguinte à avaliação, ou ao fim do prazo.
        const enviado = s.pagamento.repasse === 'enviado' && s.pagamento.repassadoEm;
        const libera = s.avaliadoPelaFamilia ? hoje : dataBrasilia(new Date((s.realizadoEm ?? fim).getTime() + PRAZO_AVALIACAO_MS));
        depositoEm = enviado ? dataBrasilia(s.pagamento.repassadoEm!) : diasUteisDepois(libera > hoje ? libera : hoje, 1);
        estado = enviado ? 'depositado' : s.situacao === 'realizado' ? 'programado' : 'previsto';
      } else if (s.situacao === 'realizado') {
        depositoEm = diasUteisDepois(dataBrasilia(fim), REGRAS.prazoDepositoDiasUteis);
        estado = depositoEm <= hoje ? 'depositado' : 'programado';
      } else if (s.inicio > agora) {
        depositoEm = diasUteisDepois(dataBrasilia(fim), REGRAS.prazoDepositoDiasUteis);
        estado = 'previsto';
      } else {
        // o horário já passou, mas ela ainda não marcou como feito: o depósito espera
        depositoEm = null;
        estado = 'aguardando_conclusao';
      }
      const taxa = taxaDe(bruto, percentualDaTaxa(beneficio, s.inicio));
      return [
        {
          servicoId: s.id,
          tipo,
          estado,
          tarefa: s.tarefa,
          familia: s.familia,
          para: s.pessoa ? primeiro(s.pessoa) : null,
          inicio: s.inicio,
          horas: s.horas,
          valorHoraCentavos: s.valorHora,
          // quanto ela deixou de cobrar pelo desconto por horas
          descontoCentavos: tipo === 'atendimento' ? cheio - total : 0,
          brutoCentavos: bruto,
          taxaCentavos: taxa,
          liquidoCentavos: bruto - taxa,
          depositoEm,
          // forma de pagamento da família, quando pagou pelo gateway
          pagamento: s.pagamento?.metodo ? { metodo: s.pagamento.metodo, parcelas: s.pagamento.parcelas } : null,
        },
      ];
    });

    const soma = (l: typeof lancamentos, campo: 'brutoCentavos' | 'taxaCentavos' | 'liquidoCentavos' | 'descontoCentavos') =>
      l.reduce((t, x) => t + x[campo], 0);
    const doEstado = (e: Estado) => lancamentos.filter((l) => l.estado === e);
    const feitos = lancamentos.filter((l) => l.tipo === 'atendimento' && (l.estado === 'programado' || l.estado === 'depositado'));

    const porDia = new Map<string, { data: string; liquidoCentavos: number; lancamentos: number }>();
    for (const l of lancamentos) {
      if (!l.depositoEm || l.estado === 'depositado') continue;
      const d = porDia.get(l.depositoEm) ?? { data: l.depositoEm, liquidoCentavos: 0, lancamentos: 0 };
      d.liquidoCentavos += l.liquidoCentavos;
      d.lancamentos++;
      porDia.set(l.depositoEm, d);
    }

    return {
      periodo: { de, ate },
      // sem pagamento real ainda: valores e datas seguem as regras propostas
      simulado: true,
      regras: REGRAS,
      // taxa menor do pacote de convite: o percentual, por quantos dias e até quando (null antes da aprovação)
      taxaEspecial:
        beneficio?.taxaEspecialPercentual != null
          ? { percentual: beneficio.taxaEspecialPercentual, dias: beneficio.dias, ate: beneficio.taxaEspecialAte }
          : null,
      resumo: {
        atendimentosFeitos: feitos.length,
        horasFeitas: feitos.reduce((t, l) => t + l.horas, 0),
        brutoCentavos: soma(lancamentos, 'brutoCentavos'),
        descontoCentavos: soma(lancamentos, 'descontoCentavos'),
        taxaCentavos: soma(lancamentos, 'taxaCentavos'),
        liquidoCentavos: soma(lancamentos, 'liquidoCentavos'),
        depositadoCentavos: soma(doEstado('depositado'), 'liquidoCentavos'),
        programadoCentavos: soma(doEstado('programado'), 'liquidoCentavos'),
        previstoCentavos: soma(doEstado('previsto'), 'liquidoCentavos'),
        aguardandoConclusaoCentavos: soma(doEstado('aguardando_conclusao'), 'liquidoCentavos'),
      },
      proximosDepositos: [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data)),
      lancamentos,
    };
  });
}
