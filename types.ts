
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

export interface ChatSession {
  id: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
  customPrompt?: string;
  analysisHistory: AnalysisEntry[];
}

export interface AnalysisResult {
  score: number;
  strengths: string[];
  improvements: string[];
  coachingTips: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
