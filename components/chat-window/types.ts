import { AnalysisEntry, ChatSession, Message, CriteriaConfig, HeatmapAnalysis } from "@/types";

export interface ChatWindowProps {
    session: ChatSession | null;
    onUpdateSessionPrompt: (sessionId: string, prompt: string) => void;
    onUpdateSessionCriteria: (sessionId: string, criteria: CriteriaConfig) => void;
    onSaveAnalysis: (sessionId: string, analysis: AnalysisEntry) => void;
    onSaveHeatmap?: (sessionId: string, heatmap: HeatmapAnalysis) => void;
    onInjectMessage: (sessionId: string, message: Message) => void;
    instanceCriteria?: Map<string, CriteriaConfig>;
  }