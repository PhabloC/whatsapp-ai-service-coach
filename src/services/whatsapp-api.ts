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
}

export const whatsappAPI = new WhatsAppAPI();
