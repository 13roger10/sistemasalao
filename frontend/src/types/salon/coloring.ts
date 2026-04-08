// Coloring types for the salon system

import { ID, Timestamps } from './common';

// Enums
export type SkinTone = 'MUITO_CLARO' | 'CLARO' | 'MEDIO' | 'MORENO_CLARO' | 'MORENO' | 'MORENO_ESCURO' | 'NEGRO';
export type SkinUndertone = 'QUENTE' | 'FRIO' | 'NEUTRO' | 'OLIVA';
export type HairType = 'LISO' | 'ONDULADO' | 'CACHEADO' | 'CRESPO';
export type ColoringTechnique =
  | 'GLOBAL' | 'MECHAS' | 'BALAYAGE' | 'OMBRE' | 'LUZES'
  | 'RETOQUE_RAIZ' | 'TONALIZACAO' | 'REFLEXO' | 'CALIFORNIANAS'
  | 'MORENA_ILUMINADA' | 'PLATINADO' | 'VIVIDOS';

// Ficha de Coloração
export interface ColoringProfile extends Timestamps {
  id: ID;
  clienteId: ID;
  clienteNome: string;
  clienteEmail: string;
  clienteTelefone: string;
  salonId: ID;

  // Skin analysis
  tomPele?: SkinTone;
  tomPeleDescricao?: string;
  subtomPele?: SkinUndertone;
  subtomPeleDescricao?: string;

  // Hair characteristics
  tipoCabelo?: HairType;
  tipoCabeloDescricao?: string;
  corNatural?: string;
  corAtual?: string;
  porcentagemBrancos?: string;
  texturaCabelo?: string;
  porosidade?: string;
  elasticidade?: string;

  // Chemical history
  temQuimica: boolean;
  historicoQuimico?: string;
  ultimaQuimica?: string;

  // Allergies
  temAlergia: boolean;
  alergias?: string;
  sensibilidadeCouro: boolean;

  // Preferences
  preferenciaCores?: string;
  coresEvitar?: string;
  observacoes?: string;

  // Reference photos
  fotoReferencia1?: string;
  fotoReferencia2?: string;
  fotoReferencia3?: string;
}

export interface ColoringProfileCreateInput {
  clienteId: ID;
  tomPele?: SkinTone;
  subtomPele?: SkinUndertone;
  tipoCabelo?: HairType;
  corNatural?: string;
  corAtual?: string;
  porcentagemBrancos?: string;
  texturaCabelo?: string;
  porosidade?: string;
  elasticidade?: string;
  temQuimica?: boolean;
  historicoQuimico?: string;
  ultimaQuimica?: string;
  temAlergia?: boolean;
  alergias?: string;
  sensibilidadeCouro?: boolean;
  preferenciaCores?: string;
  coresEvitar?: string;
  observacoes?: string;
  fotoReferencia1?: string;
  fotoReferencia2?: string;
  fotoReferencia3?: string;
}

// Histórico de Coloração
export interface ColoringHistory {
  id: ID;
  fichaId: ID;
  clienteId: ID;
  clienteNome: string;
  profissionalId: ID;
  profissionalNome: string;
  agendamentoId?: ID;
  dataServico: string;

  tecnica: ColoringTechnique;
  tecnicaNome: string;
  tecnicaDescricao: string;

  marcaTinta?: string;
  nomeCor?: string;
  numeroCor?: string;
  oxidante?: string;
  formulacao?: string;

  tempoAplicacao?: number;
  tempoPausa?: number;

  corAntes?: string;
  corDepois?: string;
  resultadoObtido?: string;
  satisfacaoCliente: number;

  fotoAntes?: string;
  fotoDepois?: string;

  observacoes?: string;
  recomendacoes?: string;
  proximaManutencao?: string;

  criadoEm: string;
}

export interface ColoringHistoryCreateInput {
  fichaId: ID;
  profissionalId: ID;
  agendamentoId?: ID;
  dataServico: string;
  tecnica: ColoringTechnique;
  marcaTinta?: string;
  nomeCor?: string;
  numeroCor?: string;
  oxidante?: string;
  formulacao?: string;
  tempoAplicacao?: number;
  tempoPausa?: number;
  corAntes?: string;
  corDepois?: string;
  resultadoObtido?: string;
  satisfacaoCliente?: number;
  fotoAntes?: string;
  fotoDepois?: string;
  observacoes?: string;
  recomendacoes?: string;
  proximaManutencao?: string;
}

// Sugestão de Tonalidade
export interface TonalitySuggestion {
  tomPele: string;
  subtomPele: string;
  coresRecomendadas: {
    categoria: string;
    tons: string[];
    descricao: string;
    nivel: string;
  }[];
  coresEvitar: string[];
  dicasGerais: string[];
}

// Enums Response
export interface ColoringEnums {
  tonsPele: { value: string; label: string }[];
  subtomsPele: { value: string; label: string }[];
  tiposCabelo: { value: string; label: string }[];
  tecnicas: { value: string; label: string }[];
}

// Labels
export const SkinToneLabels: Record<SkinTone, string> = {
  MUITO_CLARO: 'Muito Claro',
  CLARO: 'Claro',
  MEDIO: 'Médio',
  MORENO_CLARO: 'Moreno Claro',
  MORENO: 'Moreno',
  MORENO_ESCURO: 'Moreno Escuro',
  NEGRO: 'Negro',
};

export const SkinUndertoneLabels: Record<SkinUndertone, string> = {
  QUENTE: 'Quente',
  FRIO: 'Frio',
  NEUTRO: 'Neutro',
  OLIVA: 'Oliva',
};

export const HairTypeLabels: Record<HairType, string> = {
  LISO: 'Liso',
  ONDULADO: 'Ondulado',
  CACHEADO: 'Cacheado',
  CRESPO: 'Crespo',
};

export const ColoringTechniqueLabels: Record<ColoringTechnique, string> = {
  GLOBAL: 'Coloração Global',
  MECHAS: 'Mechas',
  BALAYAGE: 'Balayage',
  OMBRE: 'Ombre',
  LUZES: 'Luzes',
  RETOQUE_RAIZ: 'Retoque de Raiz',
  TONALIZACAO: 'Tonalização',
  REFLEXO: 'Reflexo',
  CALIFORNIANAS: 'Californianas',
  MORENA_ILUMINADA: 'Morena Iluminada',
  PLATINADO: 'Platinado',
  VIVIDOS: 'Cores Fantasia',
};
