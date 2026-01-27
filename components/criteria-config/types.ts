import { CriteriaConfig } from "@/types";

export interface CriteriaConfigProps {
    criteria: CriteriaConfig;
    onSave: (criteria: CriteriaConfig) => void;
    onCancel: () => void;
  }