import { SalesScript } from "@/types";

export interface SalesScriptModalProps {
  script: SalesScript | null;
  isLoading: boolean;
  onClose: () => void;
}
