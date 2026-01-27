export interface SidebarResizerProps {
    onResize: (width: number) => void;
    currentWidth: number;
    minWidth?: number;
    maxWidth?: number;
  }