export interface QRCodeScannerProps {
    onConnect: (instanceId: string) => void;
    onCancel: () => void;
  }
  
export interface StageInfo {
    title: string;
    description: string;
    progress: number;
  }