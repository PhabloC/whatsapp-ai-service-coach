import { AnalysisEntry } from "@/types";

export interface EvolutionHistoryProps {
    analysisHistory: AnalysisEntry[];
    onClose: () => void;
  }