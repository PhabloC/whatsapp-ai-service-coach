import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Tipos compatíveis com o backend
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

export class WhatsAppAPI {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    // Limpar socket anterior se existir (mas não conectado)
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    // Usar a URL base diretamente, Socket.io detecta automaticamente o protocolo
    this.socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket conectado');
      this.emit('connected', {});
    });

    this.socket.on('qr', (data: { instanceId: string; qrCode: string }) => {
      this.emit('qr', data);
    });

    this.socket.on('connected', (data: { instanceId: string; phoneNumber?: string }) => {
      this.emit('instance_connected', data);
    });

    this.socket.on('disconnected', (data: { instanceId: string }) => {
      this.emit('instance_disconnected', data);
    });

    this.socket.on('message', (data: { instanceId: string; message: WhatsAppMessage }) => {
      console.log('📡 Mensagem recebida via WebSocket:', data.instanceId);
      this.emit('message', data);
    });

    this.socket.on('error', (data: { instanceId: string; error: string }) => {
      this.emit('error', data);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket desconectado');
      this.emit('disconnected', {});
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  async createInstance(name: string): Promise<WhatsAppInstance> {
    const response = await fetch(`${API_BASE_URL}/api/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar instância');
    }

    return response.json();
  }

  async getInstances(): Promise<WhatsAppInstance[]> {
    const response = await fetch(`${API_BASE_URL}/api/instances`);
    if (!response.ok) {
      throw new Error('Erro ao buscar instâncias');
    }
    return response.json();
  }

  async getInstance(id: string): Promise<WhatsAppInstance> {
    const response = await fetch(`${API_BASE_URL}/api/instances/${id}`);
    if (!response.ok) {
      throw new Error('Instância não encontrada');
    }
    return response.json();
  }

  async getQRCode(id: string): Promise<{ qrCode?: string; status: string; hasQR: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/instances/${id}/qr`);
    if (!response.ok) {
      throw new Error('Erro ao buscar QR Code');
    }
    return response.json();
  }

  async deleteInstance(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/instances/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Erro ao deletar instância');
    }
  }

  async sendMessage(instanceId: string, to: string, message: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/instances/${instanceId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });

    if (!response.ok) {
      throw new Error('Erro ao enviar mensagem');
    }
  }

  /**
   * Lista todas as sessões salvas no servidor (mesmo que não estejam na memória)
   */
  async getSavedSessions(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/sessions/saved`);
    if (!response.ok) {
      throw new Error('Erro ao buscar sessões salvas');
    }
    const data = await response.json();
    return data.sessions || [];
  }

  /**
   * Restaura uma sessão salva no servidor
   * Útil quando a página é recarregada e a instância já estava autenticada
   */
  async restoreSession(instanceId: string): Promise<WhatsAppInstance> {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${instanceId}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Erro ao restaurar sessão');
    }

    return response.json();
  }

  /**
   * Tenta restaurar automaticamente a primeira sessão disponível
   * Retorna a instância restaurada ou null se não houver sessões
   */
  async autoRestoreSession(): Promise<WhatsAppInstance | null> {
    try {
      // Primeiro, verificar instâncias já em memória no servidor
      const instances = await this.getInstances();
      if (instances.length > 0) {
        // Já existe uma instância carregada, usar ela
        const connectedInstance = instances.find(i => i.status === 'connected');
        if (connectedInstance) {
          return connectedInstance;
        }
        // Se tem instância mas não está conectada, retornar a primeira
        return instances[0];
      }

      // Se não tem instâncias em memória, verificar sessões salvas
      const savedSessions = await this.getSavedSessions();
      if (savedSessions.length > 0) {
        // Restaurar a primeira sessão salva
        return await this.restoreSession(savedSessions[0]);
      }

      return null;
    } catch (error) {
      console.error('Erro ao auto-restaurar sessão:', error);
      return null;
    }
  }

  /**
   * Busca a foto de perfil de um contato
   * @param instanceId ID da instância WhatsApp
   * @param jid JID do contato (ex: 5511999999999@s.whatsapp.net)
   * @param highRes Se true, busca em alta resolução (mais lento)
   * @returns URL da foto ou null se não tiver
   */
  async getProfilePicture(instanceId: string, jid: string, highRes: boolean = false): Promise<string | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/instances/${instanceId}/profile-picture/${encodeURIComponent(jid)}?highRes=${highRes}`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.profilePicture || null;
    } catch (error) {
      console.error('Erro ao buscar foto de perfil:', error);
      return null;
    }
  }

  /**
   * Busca fotos de perfil de múltiplos contatos em paralelo
   * @param instanceId ID da instância WhatsApp
   * @param jids Array de JIDs dos contatos
   * @param highRes Se true, busca em alta resolução
   * @returns Objeto com JID como chave e URL como valor
   */
  async getProfilePictures(instanceId: string, jids: string[], highRes: boolean = false): Promise<{ [jid: string]: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/instances/${instanceId}/profile-pictures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jids, highRes }),
      });
      
      if (!response.ok) {
        return {};
      }
      
      const data = await response.json();
      return data.profilePictures || {};
    } catch (error) {
      console.error('Erro ao buscar fotos de perfil:', error);
      return {};
    }
  }
}

export const whatsappAPI = new WhatsAppAPI();