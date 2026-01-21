import { Message } from "@/types";

export interface MessageInjectorProps {
    sessionId: string;
    contactName: string;
    onInjectMessage: (sessionId: string, message: Message) => void;
    onClose: () => void;
  }
  
  export interface MessageTemplate {
    id: string;
    name: string;
    sender: 'client' | 'agent';
    text: string;
  }