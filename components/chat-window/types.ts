import { AnalysisEntry, ChatSession, Message } from "@/types";

export interface ChatWindowProps {
    session: ChatSession | null;
    onUpdateSessionPrompt: (sessionId: string, prompt: string) => void;
    onSaveAnalysis: (sessionId: string, analysis: AnalysisEntry) => void;
    onInjectMessage: (sessionId: string, message: Message) => void;
  }