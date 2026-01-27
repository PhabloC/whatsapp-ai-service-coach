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
  isHistorical?: boolean; // true = mensagem do histórico/sincronização, false = mensagem em tempo real
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker'; // tipo de mídia se houver
  hasMedia?: boolean; // true se a mensagem contém mídia
}

// Eventos emitidos pelo WhatsAppManager
export interface WhatsAppEvents {
  // Conexão
  qr: (instanceId: string, qrCode: string) => void;
  pairingCode: (instanceId: string, code: string) => void;
  connected: (instanceId: string, phoneNumber: string) => void;
  disconnected: (instanceId: string) => void;
  loggedOut: (instanceId: string) => void;
  error: (instanceId: string, error: Error) => void;

  // Mensagens
  message: (instanceId: string, message: WhatsAppMessage) => void;
  messageStatus: (instanceId: string, data: { messageId: string; remoteJid: string; status: number }) => void;
  messageEdited: (instanceId: string, data: { messageId: string; remoteJid: string; newMessage: string }) => void;
  messageDeleted: (instanceId: string, data: { messageId: string; remoteJid: string; fromMe: boolean }) => void;
  messageReaction: (instanceId: string, data: { messageId: string; remoteJid: string; reaction: any }) => void;
  messageReceipt: (instanceId: string, data: { messageId: string; remoteJid: string; receipt: any }) => void;
  chatCleared: (instanceId: string, data: { jid: string }) => void;

  // Chats
  chats: (instanceId: string, chats: any[]) => void;
  chatsUpsert: (instanceId: string, chats: any[]) => void;
  chatsUpdate: (instanceId: string, updates: any[]) => void;
  chatsDelete: (instanceId: string, deletedChats: string[]) => void;

  // Contatos
  contacts: (instanceId: string, contacts: any[]) => void;
  contactsUpsert: (instanceId: string, contacts: any[]) => void;
  contactsUpdate: (instanceId: string, updates: any[]) => void;

  // Grupos
  groupsUpsert: (instanceId: string, groups: any[]) => void;
  groupsUpdate: (instanceId: string, updates: any[]) => void;
  groupParticipantsUpdate: (instanceId: string, data: { groupId: string; participants: string[]; action: string }) => void;

  // Blocklist
  blocklistSet: (instanceId: string, blocklist: string[]) => void;
  blocklistUpdate: (instanceId: string, data: { action: string; blocklist: string[] }) => void;

  // Chamadas
  call: (instanceId: string, data: { id: string; from: string; status: string; isVideo: boolean; isGroup: boolean }) => void;

  // Histórico
  historySyncComplete: (instanceId: string, data: { chatsCount: number; contactsCount: number; messagesCount: number; syncType: any }) => void;

  // LID Mapping (v7)
  lidMappingUpdate: (instanceId: string, mapping: any) => void;

  // Instância
  deleted: (instanceId: string) => void;
}
