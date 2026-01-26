import makeWASocket, {
  ConnectionState,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import { WhatsAppInstance, WhatsAppMessage } from './types.js';
import { EventEmitter } from 'events';

export class WhatsAppManager extends EventEmitter {
  private instances: Map<string, { socket: WASocket | null; instance: WhatsAppInstance }> = new Map();
  private authDir: string;
  private cachedVersion: any = null;

  constructor(authDir: string = './auth') {
    super();
    this.authDir = authDir;
  }

  private async getBaileysVersion() {
    if (!this.cachedVersion) {
      this.cachedVersion = await fetchLatestBaileysVersion();
    }
    return this.cachedVersion;
  }

  async createInstance(instanceId: string, instanceName: string): Promise<WhatsAppInstance> {
    if (this.instances.has(instanceId)) {
      throw new Error('Instância já existe');
    }

    const instance: WhatsAppInstance = {
      id: instanceId,
      name: instanceName,
      status: 'connecting',
    };

    this.instances.set(instanceId, { socket: null, instance });

    await this.initializeSocket(instanceId);

    return instance;
  }

  private async initializeSocket(instanceId: string) {
    const entry = this.instances.get(instanceId);
    if (!entry) return;

    try {
      // Usar versão em cache para acelerar
      const { version } = await this.getBaileysVersion();
      const { state, saveCreds } = await useMultiFileAuthState(`${this.authDir}/${instanceId}`);

      const socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Coach AI', 'Chrome', '1.0.0'],
        // Habilitar sincronização do histórico de mensagens
        syncFullHistory: true,
      });

      entry.socket = socket;

      socket.ev.on('creds.update', saveCreds);

      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            // Gerar QR Code com configurações otimizadas para velocidade
            const qrCodeDataUrl = await QRCode.toDataURL(qr, {
              errorCorrectionLevel: 'M',
              type: 'image/png',
              quality: 0.92,
              margin: 1,
              width: 300
            });
            entry.instance.status = 'qr_ready';
            entry.instance.qrCode = qrCodeDataUrl;
            this.emit('qr', instanceId, qrCodeDataUrl);
            console.log(`QR Code gerado para instância ${instanceId}`);
          } catch (err) {
            console.error('Erro ao gerar QR Code:', err);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          entry.instance.status = 'disconnected';
          entry.instance.qrCode = undefined;
          this.emit('disconnected', instanceId);

          if (shouldReconnect) {
            setTimeout(() => this.initializeSocket(instanceId), 3000);
          } else {
            this.instances.delete(instanceId);
          }
        } else if (connection === 'open') {
          console.log(`✅ Conexão estabelecida para instância ${instanceId}`);
          entry.instance.status = 'connected';
          entry.instance.qrCode = undefined;
          entry.instance.connectedAt = new Date().toISOString();
          
          const phoneNumber = socket.user?.id.split(':')[0];
          entry.instance.phoneNumber = phoneNumber;
          
          console.log(`📱 Telefone conectado: ${phoneNumber}`);
          this.emit('connected', instanceId, phoneNumber);
        } else if (connection === 'connecting') {
          console.log(`🔄 Conectando instância ${instanceId}...`);
        }
      });

      socket.ev.on('messages.upsert', async (m) => {
        console.log(`📨 Evento messages.upsert para instância ${instanceId}:`, m.messages.length, 'mensagens');
        console.log('Tipo:', m.type); // 'notify' ou 'append'
        
        // Capturar todas as mensagens (recebidas e enviadas)
        const allMessages = m.messages.filter(msg => msg.message);
        
        for (const msg of allMessages) {
          const isFromMe = msg.key.fromMe || false;
          const remoteJid = msg.key.remoteJid || '';
          
          // Ignorar mensagens de grupo por enquanto (pode ser configurável depois)
          if (remoteJid.includes('@g.us')) {
            console.log('Ignorando mensagem de grupo:', remoteJid);
            continue;
          }

          // Determinar remetente e destinatário corretamente
          const myJid = socket.user?.id || '';
          const fromJid = isFromMe ? myJid : remoteJid;
          const toJid = isFromMe ? remoteJid : myJid;

          const message: WhatsAppMessage = {
            id: msg.key.id || `${Date.now()}-${Math.random()}`,
            from: fromJid,
            to: toJid,
            body: this.extractMessageText(msg.message),
            timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now(),
            isGroup: false,
            contactName: this.extractContactName(remoteJid),
            isFromMe: isFromMe, // Flag para identificar se é do agente
          };

          console.log(`💬 ${isFromMe ? '📤 ENVIADA' : '📥 RECEBIDA'} de ${message.contactName} (${remoteJid}): ${message.body.substring(0, 50)}${message.body.length > 50 ? '...' : ''}`);
          this.emit('message', instanceId, message);
        }
      });

      // Também escutar eventos de mensagens individuais
      socket.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
          if (update.update && 'message' in update.update) {
            console.log(`🔄 Atualização de mensagem recebida para instância ${instanceId}`);
          }
        }
      });

      // Escutar histórico de mensagens quando a conexão é estabelecida
      socket.ev.on('messaging-history.set', async (history) => {
        console.log(`📚 Histórico de mensagens recebido para instância ${instanceId}`);
        console.log(`📬 Chats: ${history.chats?.length || 0}, Mensagens: ${history.messages?.length || 0}`);
        
        if (history.messages && history.messages.length > 0) {
          // Processar mensagens do histórico
          for (const msg of history.messages) {
            if (!msg.message) continue;

            const isFromMe = msg.key.fromMe || false;
            const remoteJid = msg.key.remoteJid || '';

            // Ignorar mensagens de grupo
            if (remoteJid.includes('@g.us')) {
              continue;
            }

            // Determinar remetente e destinatário
            const myJid = socket.user?.id || '';
            const fromJid = isFromMe ? myJid : remoteJid;
            const toJid = isFromMe ? remoteJid : myJid;

            const message: WhatsAppMessage = {
              id: msg.key.id || `${msg.key.remoteJid}-${msg.messageTimestamp || Date.now()}-${Math.random()}`,
              from: fromJid,
              to: toJid,
              body: this.extractMessageText(msg.message),
              timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now(),
              isGroup: false,
              contactName: this.extractContactName(remoteJid),
              isFromMe: isFromMe,
            };

            // Emitir mensagem histórica
            this.emit('message', instanceId, message);
          }
          
          console.log(`✅ ${history.messages.length} mensagens históricas processadas para instância ${instanceId}`);
        }
      });

    } catch (error) {
      console.error(`Erro ao inicializar socket para ${instanceId}:`, error);
      entry.instance.status = 'disconnected';
      this.emit('error', instanceId, error);
    }
  }

  private extractMessageText(message: any): string {
    if (message?.conversation) return message.conversation;
    if (message?.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message?.imageMessage?.caption) return message.imageMessage.caption;
    if (message?.videoMessage?.caption) return message.videoMessage.caption;
    return '[Mídia ou mensagem não suportada]';
  }

  private extractContactName(remoteJid: string): string {
    if (!remoteJid) return 'Desconhecido';
    const number = remoteJid.split('@')[0];
    // Formatar número brasileiro se possível
    if (number.length === 13 && number.startsWith('55')) {
      const ddd = number.substring(2, 4);
      const num = number.substring(4);
      return `+${number} (${ddd}) ${num.substring(0, 5)}-${num.substring(5)}`;
    }
    return number;
  }

  getInstance(instanceId: string): WhatsAppInstance | null {
    const entry = this.instances.get(instanceId);
    return entry ? entry.instance : null;
  }

  getAllInstances(): WhatsAppInstance[] {
    return Array.from(this.instances.values()).map(entry => entry.instance);
  }

  async deleteInstance(instanceId: string): Promise<boolean> {
    const entry = this.instances.get(instanceId);
    if (!entry) return false;

    if (entry.socket) {
      await entry.socket.logout();
      entry.socket.end(undefined);
    }

    this.instances.delete(instanceId);
    this.emit('deleted', instanceId);
    return true;
  }

  async sendMessage(instanceId: string, to: string, message: string): Promise<boolean> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return false;
    }

    try {
      await entry.socket.sendMessage(to, { text: message });
      return true;
    } catch (error) {
      console.error(`Erro ao enviar mensagem:`, error);
      return false;
    }
  }

}