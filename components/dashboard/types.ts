import { ChatSession, HeatmapAnalysis } from "@/types";
import { ConnectionInstance } from "../sidebar/types";

export interface DashboardProps {
    sessions: ChatSession[];
    connections: ConnectionInstance[];
  }
  
  export interface SourceStats {
    sourceId: string;
    sourceName: string;
    totalSessions: number;
    totalAnalyses: number;
    averageScore: number;
    heatmaps: HeatmapAnalysis[];
    averageHeatmap: {
      estrutura: number;
      spiced: number;
      solucao: number;
      objeções: number;
      rapport: number;
      nota_final: number;
    };
  }