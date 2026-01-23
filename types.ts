
export interface Message {
  id: string;
  sender: 'client' | 'agent';
  text: string;
  timestamp: string;
  contactName: string;
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
  messages: Message[];
  customPrompt?: string;
  analysisHistory: AnalysisEntry[];
  criteriaConfig?: CriteriaConfig;
  heatmapHistory?: HeatmapHistoryEntry[];
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
