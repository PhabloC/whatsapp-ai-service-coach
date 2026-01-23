export interface WhatsAppInstance {
  id: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready';
  qrCode?: string;
  connectedAt?: string;
  phoneNumber?: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isGroup: boolean;
  contactName?: string;
  isFromMe?: boolean; // true = mensagem enviada pelo agente, false = recebida do cliente
}
