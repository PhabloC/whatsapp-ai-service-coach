
export interface Message {
  id: string;
  sender: 'client' | 'agent';
  text: string;
  timestamp: string;
  contactName: string;
  rawTimestamp?: number; // Timestamp original em milissegundos para ordenação
}

export interface AnalysisEntry {
  id: string;
  timestamp: string;
  promptUsed: string;
  result: AnalysisResult;
}

export interface HeatmapHistoryEntry {
  id: string;
  timestamp: string;
  analysis: HeatmapAnalysis;
}

export interface ChatSession {
  id: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  lastMessageTimestamp?: number; // Timestamp em ms para ordenação
  messages: Message[];
  customPrompt?: string;
  analysisHistory: AnalysisEntry[];
  criteriaConfig?: CriteriaConfig;
  heatmapHistory?: HeatmapHistoryEntry[];
  markedAsSale?: boolean;
  salesScriptHistory?: SalesScriptHistoryEntry[];
  profilePicture?: string | null; // URL da foto de perfil do contato
  contactJid?: string; // JID do contato para buscar foto
}

export interface AnalysisResult {
  score: number;
  strengths: string[];
  improvements: string[];
  coachingTips: string;
}

// Nova estrutura de análise com Heatmap Score
export interface PilarScore {
  nota: number;
  justificativa: string;
}

export interface HeatmapAnalysis {
  analise: {
    estrutura: PilarScore;
    spiced: PilarScore;
    solucao: PilarScore;
    objeções: PilarScore;
    rapport: PilarScore;
  };
  nota_final: number;
  performance_status: 'Em desenvolvimento' | 'Destaque' | 'Alerta';
}

export interface CriteriaConfig {
  estrutura: string;
  spiced: string;
  solucao: string;
  objeções: string;
  rapport: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

// Script de Vendas gerado por IA
export interface SalesScript {
  titulo: string;
  resumo_conversa: string;
  gatilhos_identificados: string[];
  script_recomendado: ScriptStep[];
  dicas_aplicacao: string[];
  objecoes_previstas: ObjecaoResposta[];
}

export interface ScriptStep {
  etapa: number;
  titulo: string;
  fala_sugerida: string;
  objetivo: string;
}

export interface ObjecaoResposta {
  objecao: string;
  resposta_sugerida: string;
}

export interface SalesScriptHistoryEntry {
  id: string;
  timestamp: string;
  script: SalesScript;
}
