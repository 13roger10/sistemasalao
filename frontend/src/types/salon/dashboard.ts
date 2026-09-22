// Dashboard types — mirrors com.belezza.api.dto.dashboard.* on the backend

export interface FaturamentoPorFormaPagamento {
  formaPagamento: string;
  valor: number;
  valorFormatado: string;
  quantidade: number;
  percentual: number;
}

export interface Faturamento {
  valorTotal: number;
  valorTotalFormatado: string;
  valorPeriodoAnterior: number;
  percentualVariacao: number;
  crescimento: boolean;
  porFormaPagamento: FaturamentoPorFormaPagamento[];
  ticketMedio: number;
  ticketMedioFormatado: string;
}

export interface AgendamentosMetricas {
  total: number;
  confirmados: number;
  concluidos: number;
  cancelados: number;
  noShow: number;
  pendentes: number;
  totalPeriodoAnterior: number;
  percentualVariacao: number;
  crescimento: boolean;
  taxaComparecimento: number;
  taxaCancelamento: number;
  porHora: Record<string, number>;
}

export interface RankingProfissional {
  posicao: number;
  profissionalId: string;
  nome: string;
  fotoUrl?: string;
  faturamento: number;
  faturamentoFormatado: string;
  atendimentos: number;
  ticketMedio: number;
  ticketMedioFormatado: string;
  avaliacaoMedia: number;
  comissaoTotal: number;
  comissaoTotalFormatada: string;
}

export interface ServicoPopular {
  posicao: number;
  servicoId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  faturamento: number;
  faturamentoFormatado: string;
  percentualTotal: number;
  preco: number;
  precoFormatado: string;
}

export interface ClientesMetricas {
  totalCadastrados: number;
  novosNoPeriodo: number;
  atendidosNoPeriodo: number;
  recorrentes: number;
  taxaRetorno: number;
  aniversariantes: number;
  emProgramaFidelidade: number;
  fidelidadeCompleta: number;
}

export interface ComissoesMetricas {
  totalCalculado: number;
  totalCalculadoFormatado: string;
  totalPago: number;
  totalPagoFormatado: string;
  totalPendente: number;
  totalPendenteFormatado: string;
  quantidadeCalculadas: number;
  quantidadePagas: number;
  quantidadePendentes: number;
}

export interface DashboardData {
  dataReferencia: string;
  periodo: "DIARIO" | "SEMANAL" | "MENSAL" | "PERSONALIZADO";
  faturamento: Faturamento;
  agendamentos: AgendamentosMetricas;
  rankingProfissionais: RankingProfissional[];
  servicosMaisVendidos: ServicoPopular[];
  clientes: ClientesMetricas;
  comissoes: ComissoesMetricas;
}
