import { ChatSession, CriteriaConfig } from "@/types";
import { ConnectionInstance } from "../sidebar/types";
import React from "react";

export interface MainLayoutProps {
    children: React.ReactNode;
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (id: string | null) => void;
    userName: string;
    onLogout: () => void;
    onUpdateSessionPrompt: (sessionId: string, prompt: string) => void;
    onAddConnection: () => void;
    connections: ConnectionInstance[];
    onDisconnectInstance: (id: string) => void;
    currentView: 'chats' | 'dashboard' | 'settings';
    onViewChange: (view: 'chats' | 'dashboard' | 'settings') => void;
    instanceCriteria: Map<string, CriteriaConfig>;
    onUpdateInstanceCriteria: (instanceId: string, criteria: CriteriaConfig) => void;
  }