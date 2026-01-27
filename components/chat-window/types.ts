import { AnalysisEntry, ChatSession, Message, CriteriaConfig, HeatmapAnalysis, SalesScript } from "@/types";

export interface ChatWindowProps {
    session: ChatSession | null;
    userId?: string;
    onUpdateSessionPrompt: (sessionId: string, prompt: string) => void;
    onUpdateSessionCriteria: (sessionId: string, criteria: CriteriaConfig, generatedPrompt?: string) => void;
    onSaveAnalysis: (sessionId: string, analysis: AnalysisEntry) => void;
    onSaveHeatmap?: (sessionId: string, heatmap: HeatmapAnalysis) => void;
    onInjectMessage: (sessionId: string, message: Message) => void;
    onMarkAsSale?: (sessionId: string, markedAsSale: boolean) => void;
    onSaveSalesScript?: (sessionId: string, script: SalesScript) => void;
    instanceCriteria?: Map<string, CriteriaConfig>;
  }