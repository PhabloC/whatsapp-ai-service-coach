export interface QRCodeScannerProps {
    onConnect: () => void;
    onCancel: () => void;
  }
  
export interface StageInfo {
    title: string;
    description: string;
    progress: number;
  }