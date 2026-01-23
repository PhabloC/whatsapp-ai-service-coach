import { ChatSession, CriteriaConfig } from "@/types";

export interface SidebarProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onLogout: () => void;
    onUpdateSessionPrompt: (id: string, prompt: string) => void;
    onAddConnection: () => void;
    userName: string;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    connections: ConnectionInstance[];
    onDisconnectInstance: (id: string) => void;
    currentView: 'chats' | 'dashboard' | 'settings';
    onViewChange: (view: 'chats' | 'dashboard' | 'settings') => void;
    instanceCriteria: Map<string, CriteriaConfig>;
    onUpdateInstanceCriteria: (instanceId: string, criteria: CriteriaConfig) => void;
  }
  
  export interface ConnectionInstance {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'connecting';
    connectedAt?: string;
  }