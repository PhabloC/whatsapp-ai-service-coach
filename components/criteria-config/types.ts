import { CriteriaConfig } from "@/types";

export interface CriteriaConfigProps {
    criteria: CriteriaConfig;
    userId?: string;
    onSave: (criteria: CriteriaConfig, generatedPrompt?: string) => void;
    onCancel: () => void;
  }