import { api } from "@/lib/api";

// ─── Period helpers ───────────────────────────────────────────────────────────

export type PeriodoPreset =
  | "this_month"
  | "last_30"
  | "last_3_months"
  | "last_6_months"
  | "this_year";

export interface DateRange {
  dataInicio: string; // yyyy-MM-dd
  dataFim: string;    // yyyy-MM-dd
}

export function presetToRange(preset: PeriodoPreset): DateRange {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case "this_month": {
      const ini = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dataInicio: fmt(ini), dataFim: fmt(today) };
    }
    case "last_30": {
      const ini = new Date(today);
      ini.setDate(today.getDate() - 30);
      return { dataInicio: fmt(ini), dataFim: fmt(today) };
    }
    case "last_3_months": {
      const ini = new Date(today);
      ini.setMonth(today.getMonth() - 3);
      return { dataInicio: fmt(ini), dataFim: fmt(today) };
    }
    case "last_6_months": {
      const ini = new Date(today);
      ini.setMonth(today.getMonth() - 6);
      return { dataInicio: fmt(ini), dataFim: fmt(today) };
    }
    case "this_year": {
      const ini = new Date(today.getFullYear(), 0, 1);
      return { dataInicio: fmt(ini), dataFim: fmt(today) };
    }
  }
}

export const PERIODO_LABELS: Record<PeriodoPreset, string> = {
  this_month: "Este mês",
  last_30: "Últimos 30 dias",
  last_3_months: "Últimos 3 meses",
  last_6_months: "Últimos 6 meses",
  this_year: "Este ano",
};

// ─── Response types (mirrors backend DTOs) ───────────────────────────────────

export interface MetricasAgendamento {
  periodo: string;
  total: number;
  concluidos: number;
  cancelados: number;
  noShows: number;
  taxaConclusao: number;
  porProfissional: {
    profissionalId: number;
    profissionalNome: string;
    totalAgendamentos: number;
    concluidos: number;
    cancelados: number;
    noShows: number;
    taxaConclusao: number;
  }[];
  porServico: {
    servicoId: number;
    servicoNome: string;
    totalAgendamentos: number;
    concluidos: number;
    ticketMedio: number;
  }[];
  evolucaoDiaria: {
    data: string;
    total: number;
    concluidos: number;
    cancelados: number;
  }[];
}

export interface MetricasFinanceiras {
  periodo: string;
  totalBruto: number;
  totalLiquido: number;
  ticketMedio: number;
  totalAtendimentos: number;
  porFormaPagamento: {
    formaPagamento: string;
    total: number;
    quantidade: number;
    percentual: number;
  }[];
  porServico: {
    servicoId: number;
    servicoNome: string;
    total: number;
    quantidade: number;
    ticketMedio: number;
  }[];
  porProfissional: {
    profissionalId: number;
    profissionalNome: string;
    total: number;
    quantidade: number;
    ticketMedio: number;
  }[];
  evolucaoMensal: {
    mes: string;
    totalBruto: number;
    quantidade: number;
    ticketMedio: number;
    crescimentoPercentual: number;
  }[];
}

export interface MetricasSocial {
  periodo: string;
  postsPublicados: number;
  totalCurtidas: number;
  totalComentarios: number;
  totalCompartilhamentos: number;
  alcanceTotal: number;
  engajamentoMedio: number;
  melhorHorario: string;
  melhorDia: string;
  porPlataforma: {
    plataforma: string;
    postsPublicados: number;
    totalCurtidas: number;
    totalComentarios: number;
    totalCompartilhamentos: number;
    alcanceTotal: number;
    engajamentoMedio: number;
  }[];
  topPosts: {
    postId: number;
    imagemUrl: string;
    legenda: string;
    curtidas: number;
    comentarios: number;
    compartilhamentos: number;
    alcance: number;
    engajamentoRate: number;
    publicadoEm: string;
  }[];
  evolucaoDiaria: {
    data: string;
    posts: number;
    curtidas: number;
    comentarios: number;
    compartilhamentos: number;
    alcance: number;
    engajamentoRate: number;
  }[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

function buildParams(salonId: number, range: DateRange) {
  return {
    salonId,
    dataInicio: range.dataInicio,
    dataFim: range.dataFim,
  };
}

export const analyticsService = {
  async agendamentos(salonId: number, range: DateRange): Promise<MetricasAgendamento> {
    const r = await api.get<MetricasAgendamento>("/api/metricas/agendamentos", {
      params: buildParams(salonId, range),
    });
    return r.data;
  },

  async financeiro(salonId: number, range: DateRange): Promise<MetricasFinanceiras> {
    const r = await api.get<MetricasFinanceiras>("/api/metricas/faturamento", {
      params: buildParams(salonId, range),
    });
    return r.data;
  },

  async social(salonId: number, range: DateRange): Promise<MetricasSocial> {
    const r = await api.get<MetricasSocial>("/api/metricas/social", {
      params: buildParams(salonId, range),
    });
    return r.data;
  },
};
