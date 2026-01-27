import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  proto,
  WAMessageKey,
  downloadMediaMessage,
  getContentType,
} from 'baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import { WhatsAppInstance, WhatsAppMessage } from './types.js';
import { EventEmitter } from 'events';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Cache para metadados de grupo (evita rate limit)
interface GroupMetadataCache {
  [jid: string]: {
    data: any;
    timestamp: number;
  };
}

// Cache para mensagens (necessário para getMessage)
interface MessageCache {
  [key: string]: proto.IMessage;
}

// Mapeamento LID <-> PN (Phone Number)
// Na v7, WhatsApp usa LIDs (Local Identifiers) para identificar usuários
interface LidPnMapping {
  [lid: string]: string; // LID -> PN
  [pn: string]: string;  // PN -> LID
}

// Cache para fotos de perfil
interface ProfilePictureCache {
  [jid: string]: {
    url: string | null; // null = sem foto
    timestamp: number;
  };
}

// Tipos de mídia suportados
type MediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker';

export class WhatsAppManager extends EventEmitter {
  private instances: Map<string, { socket: WASocket | null; instance: WhatsAppInstance }> = new Map();
  private authDir: string;
  private groupMetadataCache: GroupMetadataCache = {};
  private messageCache: MessageCache = {};
  private lidPnMapping: LidPnMapping = {};
  private profilePictureCache: ProfilePictureCache = {};
  private readonly GROUP_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly MESSAGE_CACHE_SIZE = 1000; // Limite de mensagens em cache
  private readonly PROFILE_PIC_CACHE_TTL = 30 * 60 * 1000; // 30 minutos para fotos de perfil

  constructor(authDir: string = './auth') {
    super();
    this.authDir = authDir;
  }

  /**
   * Restaura todas as instâncias previamente autenticadas
   * Deve ser chamado na inicialização do servidor
   */
  async restoreAllSessions(): Promise<void> {
    console.log('🔄 Verificando sessões salvas...');
    
    if (!existsSync(this.authDir)) {
      console.log('📁 Diretório de auth não existe, nenhuma sessão para restaurar');
      return;
    }

    try {
      const directories = readdirSync(this.authDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const instanceId of directories) {
        const credsPath = join(this.authDir, instanceId, 'creds.json');
        
        // Verificar se existe arquivo de credenciais (indica sessão autenticada)
        if (existsSync(credsPath)) {
          try {
            const credsContent = readFileSync(credsPath, 'utf-8');
            const creds = JSON.parse(credsContent);
            
            // Verificar se está registrado (já fez login)
            if (creds.registered === true) {
              console.log(`📱 Restaurando sessão: ${instanceId}`);
              await this.restoreInstance(instanceId);
            } else {
              console.log(`⏭️ Sessão ${instanceId} não está registrada, ignorando`);
            }
          } catch (err) {
            console.error(`❌ Erro ao ler credenciais de ${instanceId}:`, err);
          }
        }
      }

      console.log('✅ Restauração de sessões concluída');
    } catch (error) {
      console.error('❌ Erro ao restaurar sessões:', error);
    }
  }

  /**
   * Restaura uma instância específica a partir das credenciais salvas
   * @param instanceId ID da instância a ser restaurada
   */
  async restoreInstance(instanceId: string): Promise<WhatsAppInstance | null> {
    // Verificar se já existe na memória
    if (this.instances.has(instanceId)) {
      console.log(`⚠️ Instância ${instanceId} já existe na memória`);
      return this.instances.get(instanceId)!.instance;
    }

    const credsPath = join(this.authDir, instanceId, 'creds.json');
    
    if (!existsSync(credsPath)) {
      console.log(`❌ Credenciais não encontradas para ${instanceId}`);
      return null;
    }

    try {
      const instance: WhatsAppInstance = {
        id: instanceId,
        name: `Instância ${instanceId.slice(-6)}`,
        status: 'connecting',
      };

      this.instances.set(instanceId, { socket: null, instance });

      await this.initializeSocket(instanceId);

      return instance;
    } catch (error) {
      console.error(`❌ Erro ao restaurar instância ${instanceId}:`, error);
      this.instances.delete(instanceId);
      return null;
    }
  }

  /**
   * Obtém IDs de todas as sessões salvas no disco
   */
  getSavedSessionIds(): string[] {
    if (!existsSync(this.authDir)) {
      return [];
    }

    try {
      const directories = readdirSync(this.authDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      return directories.filter(instanceId => {
        const credsPath = join(this.authDir, instanceId, 'creds.json');
        if (!existsSync(credsPath)) return false;
        
        try {
          const credsContent = readFileSync(credsPath, 'utf-8');
          const creds = JSON.parse(credsContent);
          return creds.registered === true;
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }

  /**
   * Obtém mensagem do cache (necessário para reenvio e descriptografia de votos de enquete)
   * Implementação obrigatória segundo documentação Baileys
   */
  private getMessage = async (key: WAMessageKey): Promise<proto.IMessage | undefined> => {
    const cacheKey = `${key.remoteJid}-${key.id}`;
    return this.messageCache[cacheKey];
  };

  /**
   * Armazena mensagem no cache
   */
  private storeMessage(key: WAMessageKey, message: proto.IMessage): void {
    const cacheKey = `${key.remoteJid}-${key.id}`;
    
    // Limpar cache se exceder o limite
    const keys = Object.keys(this.messageCache);
    if (keys.length >= this.MESSAGE_CACHE_SIZE) {
      // Remove as primeiras 100 mensagens (mais antigas)
      keys.slice(0, 100).forEach(k => delete this.messageCache[k]);
    }
    
    this.messageCache[cacheKey] = message;
  }

  /**
   * Obtém metadados de grupo do cache (evita rate limit e bans)
   */
  private getCachedGroupMetadata = async (jid: string): Promise<any | undefined> => {
    const cached = this.groupMetadataCache[jid];
    if (cached && Date.now() - cached.timestamp < this.GROUP_CACHE_TTL) {
      return cached.data;
    }
    return undefined;
  };

  /**
   * Armazena metadados de grupo no cache
   */
  private cacheGroupMetadata(jid: string, metadata: any): void {
    this.groupMetadataCache[jid] = {
      data: metadata,
      timestamp: Date.now(),
    };
  }

  /**
   * Armazena mapeamento LID <-> PN
   * Na v7, o WhatsApp usa LIDs para privacidade dos usuários
   */
  private storeLidPnMapping(lid: string, pn: string): void {
    this.lidPnMapping[lid] = pn;
    this.lidPnMapping[pn] = lid;
  }

  /**
   * Obtém o PN (número de telefone) a partir de um LID
   */
  public getPnFromLid(lid: string): string | undefined {
    return this.lidPnMapping[lid];
  }

  /**
   * Obtém o LID a partir de um PN (número de telefone)
   */
  public getLidFromPn(pn: string): string | undefined {
    return this.lidPnMapping[pn];
  }

  /**
   * Extrai o identificador mais útil (PN se disponível, senão LID)
   * Usa remoteJidAlt para DMs e participantAlt para grupos
   */
  private extractBestIdentifier(key: any, socket: WASocket): string {
    // Para DMs, verificar se tem remoteJidAlt (PN alternativo)
    if (key.remoteJidAlt) {
      return key.remoteJidAlt;
    }
    
    // Tentar obter do mapeamento interno do socket
    const remoteJid = key.remoteJid || '';
    
    // Se for um LID, tentar converter para PN
    if (remoteJid.includes('@lid')) {
      const pn = this.getPnFromLid(remoteJid);
      if (pn) return pn;
      
      // Tentar usar o repositório interno do socket
      try {
        const lidMapping = (socket as any).signalRepository?.lidMapping;
        if (lidMapping?.getPNForLID) {
          const mappedPn = lidMapping.getPNForLID(remoteJid);
          if (mappedPn) {
            this.storeLidPnMapping(remoteJid, mappedPn);
            return mappedPn;
          }
        }
      } catch (err) {
        // Ignorar erros de mapeamento
      }
    }
    
    return remoteJid;
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

  /**
   * Conecta usando Pairing Code ao invés de QR Code
   * O número DEVE estar no formato E.164 sem o '+' (ex: 5511999999999)
   * @param instanceId ID da instância
   * @param phoneNumber Número no formato E.164 sem '+'
   */
  async requestPairingCode(instanceId: string, phoneNumber: string): Promise<string | null> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket) {
      console.error(`Instância ${instanceId} não encontrada ou socket não inicializado`);
      return null;
    }

    try {
      // Remover caracteres não numéricos
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      console.log(`📱 Solicitando código de pareamento para ${cleanNumber}`);
      
      const code = await entry.socket.requestPairingCode(cleanNumber);
      console.log(`🔑 Código de pareamento gerado: ${code}`);
      
      this.emit('pairingCode', instanceId, code);
      return code;
    } catch (error) {
      console.error(`Erro ao solicitar código de pareamento:`, error);
      return null;
    }
  }

  private async initializeSocket(instanceId: string) {
    const entry = this.instances.get(instanceId);
    if (!entry) return;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(`${this.authDir}/${instanceId}`);
      
      // Logger configurado para streaming (pode ser redirecionado para arquivo se necessário)
      const logger = pino({ 
        level: process.env.LOG_LEVEL || 'silent',
        transport: process.env.NODE_ENV === 'development' ? {
          target: 'pino-pretty',
          options: { colorize: true }
        } : undefined
      });

      const socket = makeWASocket({
        // Auth state - obrigatório (v7 requer suporte a lid-mapping, device-list, tctoken)
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        // Logger - obrigatório
        logger,
        // getMessage - obrigatório para reenvio de mensagens e descriptografia de votos
        getMessage: this.getMessage,
        // Não imprimir QR no terminal (geramos via API)
        printQRInTerminal: false,
        // Browser config para desktop (necessário para syncFullHistory)
        // Para pairing code, usar browser válido como Chrome
        browser: Browsers.macOS('Desktop'),
        // Habilitar sincronização do histórico de mensagens
        syncFullHistory: true,
        // Não marcar como online ao conectar (mantém notificações no celular)
        markOnlineOnConnect: false,
        // Cache de metadados de grupo (evita rate limit e possíveis bans)
        cachedGroupMetadata: this.getCachedGroupMetadata,
      });

      entry.socket = socket;

      // ==================== EVENTOS DE CREDENCIAIS ====================
      
      // Salvar credenciais quando atualizadas
      socket.ev.on('creds.update', saveCreds);

      // ==================== EVENTOS DE MAPEAMENTO LID/PN (v7) ====================
      
      // Escutar mapeamento LID <-> PN (novo na v7)
      socket.ev.on('lid-mapping.update', (mapping: any) => {
        console.log(`🔗 Mapeamento LID-PN recebido para instância ${instanceId}`);
        if (mapping && typeof mapping === 'object') {
          for (const [lid, pn] of Object.entries(mapping)) {
            if (typeof pn === 'string') {
              this.storeLidPnMapping(lid, pn);
            }
          }
        }
        this.emit('lidMappingUpdate', instanceId, mapping);
      });

      // ==================== EVENTOS DE CONEXÃO ====================

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
          
          // Tratar diferentes razões de desconexão conforme documentação Baileys
          if (statusCode === DisconnectReason.loggedOut) {
            // Usuário fez logout - remover instância
            console.log(`🚪 Usuário fez logout da instância ${instanceId}`);
            entry.instance.status = 'disconnected';
            entry.instance.qrCode = undefined;
            this.instances.delete(instanceId);
            this.emit('loggedOut', instanceId);
          } else if (statusCode === DisconnectReason.restartRequired) {
            // Reconexão necessária após escanear QR (comportamento normal)
            console.log(`🔄 Reconexão necessária para instância ${instanceId} (após QR scan)`);
            entry.instance.status = 'connecting';
            // Reconectar imediatamente - o socket antigo é inútil após este evento
            this.initializeSocket(instanceId);
          } else {
            // Outras razões de desconexão - tentar reconectar
            console.log(`⚠️ Desconectado instância ${instanceId}, código: ${statusCode}. Reconectando...`);
            entry.instance.status = 'disconnected';
            entry.instance.qrCode = undefined;
            this.emit('disconnected', instanceId);
            // Aguardar antes de reconectar
            setTimeout(() => this.initializeSocket(instanceId), 3000);
          }
        } else if (connection === 'open') {
          console.log(`✅ Conexão estabelecida para instância ${instanceId}`);
          entry.instance.status = 'connected';
          entry.instance.qrCode = undefined;
          entry.instance.connectedAt = new Date().toISOString();
          
          // Na v7, user.id pode ser LID ou PN
          const userId = socket.user?.id || '';
          const phoneNumber = userId.split(':')[0].split('@')[0];
          entry.instance.phoneNumber = phoneNumber;
          
          console.log(`📱 Telefone conectado: ${phoneNumber}`);
          this.emit('connected', instanceId, phoneNumber);
        } else if (connection === 'connecting') {
          console.log(`🔄 Conectando instância ${instanceId}...`);
        }
      });

      // ==================== EVENTOS DE MENSAGENS ====================

      // messages.upsert - Mensagens novas ou sincronizadas
      socket.ev.on('messages.upsert', async ({ type, messages }) => {
        console.log(`📨 Evento messages.upsert para instância ${instanceId}:`, messages.length, 'mensagens');
        console.log('Tipo:', type); // 'notify' = novas mensagens, 'append' = mensagens antigas
        
        // Capturar todas as mensagens (recebidas e enviadas)
        const allMessages = messages.filter(msg => msg.message);
        
        for (const msg of allMessages) {
          // Armazenar mensagem no cache (necessário para getMessage)
          if (msg.key && msg.message) {
            this.storeMessage(msg.key, msg.message);
          }

          const isFromMe = msg.key.fromMe || false;
          
          // Na v7, usar extractBestIdentifier para lidar com LIDs
          const remoteJid = this.extractBestIdentifier(msg.key, socket);
          
          // Ignorar mensagens de grupo por enquanto (pode ser configurável depois)
          if (remoteJid.includes('@g.us')) {
            console.log('Ignorando mensagem de grupo:', remoteJid);
            continue;
          }

          // Determinar remetente e destinatário corretamente
          const myJid = socket.user?.id || '';
          const fromJid = isFromMe ? myJid : remoteJid;
          const toJid = isFromMe ? remoteJid : myJid;

          // Extrair informações de mídia se houver
          const mediaInfo = this.extractMediaInfo(msg.message);

          const message: WhatsAppMessage = {
            id: msg.key.id || `${Date.now()}-${Math.random()}`,
            from: fromJid,
            to: toJid,
            body: this.extractMessageText(msg.message),
            timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
            isGroup: false,
            contactName: this.extractContactName(remoteJid),
            isFromMe: isFromMe,
            isHistorical: type === 'append',
            mediaType: mediaInfo?.type,
            hasMedia: !!mediaInfo,
          };

          console.log(`💬 ${isFromMe ? '📤 ENVIADA' : '📥 RECEBIDA'} ${type === 'append' ? '(histórico)' : ''} de ${message.contactName} (${remoteJid}): ${message.body.substring(0, 50)}${message.body.length > 50 ? '...' : ''}`);
          this.emit('message', instanceId, message);
        }
      });

      // messages.update - Edições, deleções, mudança de status de recibo
      socket.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
          const messageId = update.key.id;
          const remoteJid = update.key.remoteJid;
          
          console.log(`🔄 Atualização de mensagem ${messageId} em ${remoteJid}`);
          
          // Verificar se é atualização de status (lido, entregue, etc.)
          if (update.update?.status) {
            this.emit('messageStatus', instanceId, {
              messageId,
              remoteJid,
              status: update.update.status,
            });
          }
          
          // Verificar se mensagem foi editada
          if (update.update?.message) {
            this.emit('messageEdited', instanceId, {
              messageId,
              remoteJid,
              newMessage: this.extractMessageText(update.update.message),
            });
          }
        }
      });

      // messages.delete - Deleção de mensagens
      socket.ev.on('messages.delete', (deletion) => {
        console.log(`🗑️ Mensagem(ns) deletada(s) para instância ${instanceId}`);
        
        // deletion pode ser { keys: WAMessageKey[] } ou { jid: string, all: true }
        if ('keys' in deletion) {
          for (const key of deletion.keys) {
            this.emit('messageDeleted', instanceId, {
              messageId: key.id,
              remoteJid: key.remoteJid,
              fromMe: key.fromMe,
            });
          }
        } else if ('all' in deletion && deletion.all) {
          this.emit('chatCleared', instanceId, {
            jid: (deletion as any).jid,
          });
        }
      });

      // messages.reaction - Reações a mensagens
      socket.ev.on('messages.reaction', (reactions) => {
        for (const reaction of reactions) {
          console.log(`😀 Reação recebida para instância ${instanceId}`);
          this.emit('messageReaction', instanceId, {
            messageId: reaction.key.id,
            remoteJid: reaction.key.remoteJid,
            reaction: reaction.reaction,
          });
        }
      });

      // message-receipt.update - Atualizações de recibo (lido/entregue/reproduzido)
      socket.ev.on('message-receipt.update', (updates) => {
        for (const update of updates) {
          console.log(`📬 Recibo atualizado para instância ${instanceId}`);
          this.emit('messageReceipt', instanceId, {
            messageId: update.key.id,
            remoteJid: update.key.remoteJid,
            receipt: update.receipt,
          });
        }
      });

      // ==================== EVENTOS DE CHATS ====================

      // chats.upsert - Novo chat aberto
      socket.ev.on('chats.upsert', (chats) => {
        console.log(`💬 ${chats.length} novo(s) chat(s) para instância ${instanceId}`);
        this.emit('chatsUpsert', instanceId, chats);
      });

      // chats.update - Atualização de chat (unread count, última mensagem)
      socket.ev.on('chats.update', (updates) => {
        this.emit('chatsUpdate', instanceId, updates);
      });

      // chats.delete - Chat deletado
      socket.ev.on('chats.delete', (deletedChats) => {
        console.log(`🗑️ ${deletedChats.length} chat(s) deletado(s) para instância ${instanceId}`);
        this.emit('chatsDelete', instanceId, deletedChats);
      });

      // ==================== EVENTOS DE CONTATOS ====================

      // contacts.upsert - Novo contato adicionado
      socket.ev.on('contacts.upsert', (contacts) => {
        console.log(`👤 ${contacts.length} contato(s) adicionado(s) para instância ${instanceId}`);
        
        // Extrair mapeamentos LID <-> PN dos novos contatos
        for (const contact of contacts) {
          const contactAny = contact as any;
          if (contactAny.id && contactAny.phoneNumber && contactAny.id.includes('@lid')) {
            this.storeLidPnMapping(contactAny.id, contactAny.phoneNumber);
          }
          if (contactAny.id && contactAny.lid) {
            this.storeLidPnMapping(contactAny.lid, contactAny.id);
          }
        }
        
        this.emit('contactsUpsert', instanceId, contacts);
      });

      // contacts.update - Contato atualizado
      socket.ev.on('contacts.update', (updates) => {
        console.log(`👤 ${updates.length} contato(s) atualizado(s) para instância ${instanceId}`);
        this.emit('contactsUpdate', instanceId, updates);
      });

      // ==================== EVENTOS DE GRUPOS ====================

      // groups.upsert - Entrou em novo grupo
      socket.ev.on('groups.upsert', (groups) => {
        console.log(`👥 Entrou em ${groups.length} novo(s) grupo(s) para instância ${instanceId}`);
        
        // Cachear metadados dos novos grupos
        for (const group of groups) {
          if (group.id) {
            this.cacheGroupMetadata(group.id, group);
          }
        }
        
        this.emit('groupsUpsert', instanceId, groups);
      });

      // groups.update - Metadados do grupo alterados
      socket.ev.on('groups.update', async (updates) => {
        for (const group of updates) {
          if (group.id) {
            // Buscar metadados completos e armazenar no cache
            try {
              const metadata = await socket.groupMetadata(group.id);
              this.cacheGroupMetadata(group.id, metadata);
              console.log(`📋 Metadados do grupo ${group.id} atualizados no cache`);
            } catch (err) {
              console.error(`Erro ao obter metadados do grupo ${group.id}:`, err);
            }
          }
        }
        this.emit('groupsUpdate', instanceId, updates);
      });

      // group-participants.update - Participantes alterados
      socket.ev.on('group-participants.update', async ({ id, participants, action }) => {
        console.log(`👥 Atualização de participantes no grupo ${id}: ${action} - ${participants.join(', ')}`);
        // Invalidar cache do grupo para forçar nova busca
        delete this.groupMetadataCache[id];
        
        this.emit('groupParticipantsUpdate', instanceId, {
          groupId: id,
          participants,
          action, // 'add' | 'remove' | 'promote' | 'demote'
        });
      });

      // ==================== EVENTOS DE BLOCKLIST ====================

      // blocklist.set - Lista de bloqueio definida
      socket.ev.on('blocklist.set', (blocklist) => {
        console.log(`🚫 Lista de bloqueio definida para instância ${instanceId}: ${blocklist.blocklist.length} contatos`);
        this.emit('blocklistSet', instanceId, blocklist.blocklist);
      });

      // blocklist.update - Lista de bloqueio atualizada
      socket.ev.on('blocklist.update', (update) => {
        console.log(`🚫 Lista de bloqueio atualizada para instância ${instanceId}: ${update.action} - ${update.blocklist.join(', ')}`);
        this.emit('blocklistUpdate', instanceId, {
          action: update.action, // 'add' | 'remove'
          blocklist: update.blocklist,
        });
      });

      // ==================== EVENTOS DE CHAMADAS ====================

      // call - Eventos de chamadas (oferta, aceite, recusa, timeout)
      socket.ev.on('call', (calls) => {
        for (const call of calls) {
          console.log(`📞 Chamada ${call.status} de ${call.from} para instância ${instanceId}`);
          this.emit('call', instanceId, {
            id: call.id,
            from: call.from,
            status: call.status,
            isVideo: call.isVideo,
            isGroup: call.isGroup,
          });
        }
      });

      // ==================== EVENTOS DE HISTÓRICO ====================

      // messaging-history.set - Histórico de mensagens sincronizado
      socket.ev.on('messaging-history.set', async ({ chats, contacts, messages, syncType }) => {
        console.log(`📚 Histórico de mensagens recebido para instância ${instanceId}`);
        console.log(`📬 Chats: ${chats?.length || 0}, Contatos: ${contacts?.length || 0}, Mensagens: ${messages?.length || 0}`);
        console.log(`🔄 Tipo de sincronização: ${syncType}`);
        
        // Emitir evento de chats recebidos
        if (chats && chats.length > 0) {
          this.emit('chats', instanceId, chats);
        }

        // Processar contatos e extrair mapeamentos LID <-> PN
        if (contacts && contacts.length > 0) {
          for (const contact of contacts) {
            const contactAny = contact as any;
            if (contactAny.id && contactAny.phoneNumber && contactAny.id.includes('@lid')) {
              this.storeLidPnMapping(contactAny.id, contactAny.phoneNumber);
            }
            if (contactAny.id && contactAny.lid) {
              this.storeLidPnMapping(contactAny.lid, contactAny.id);
            }
          }
          this.emit('contacts', instanceId, contacts);
        }

        if (messages && messages.length > 0) {
          // Processar mensagens do histórico
          for (const msg of messages) {
            if (!msg.message) continue;

            // Armazenar mensagem no cache (necessário para getMessage)
            if (msg.key && msg.message) {
              this.storeMessage(msg.key, msg.message);
            }

            const isFromMe = msg.key.fromMe || false;
            const remoteJid = this.extractBestIdentifier(msg.key, socket);

            // Ignorar mensagens de grupo
            if (remoteJid.includes('@g.us')) {
              continue;
            }

            const mediaInfo = this.extractMediaInfo(msg.message);

            const message: WhatsAppMessage = {
              id: msg.key.id || `${msg.key.remoteJid}-${msg.messageTimestamp || Date.now()}-${Math.random()}`,
              from: isFromMe ? (socket.user?.id || '') : remoteJid,
              to: isFromMe ? remoteJid : (socket.user?.id || ''),
              body: this.extractMessageText(msg.message),
              timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
              isGroup: false,
              contactName: this.extractContactName(remoteJid),
              isFromMe: isFromMe,
              isHistorical: true,
              mediaType: mediaInfo?.type,
              hasMedia: !!mediaInfo,
            };

            this.emit('message', instanceId, message);
          }
          
          console.log(`✅ ${messages.length} mensagens históricas processadas para instância ${instanceId}`);
        }

        // Emitir evento indicando que a sincronização foi concluída
        this.emit('historySyncComplete', instanceId, { 
          chatsCount: chats?.length || 0, 
          contactsCount: contacts?.length || 0,
          messagesCount: messages?.length || 0,
          syncType 
        });
      });

    } catch (error) {
      console.error(`Erro ao inicializar socket para ${instanceId}:`, error);
      entry.instance.status = 'disconnected';
      this.emit('error', instanceId, error);
    }
  }

  /**
   * Extrai o texto de uma mensagem
   * Suporta: conversation, extendedTextMessage, imageMessage, videoMessage, etc.
   */
  private extractMessageText(message: any): string {
    if (!message) return '';
    
    // Texto simples
    if (message.conversation) return message.conversation;
    
    // Texto com metadados (reply, link preview, etc.)
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    
    // Legendas de mídia
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.documentMessage?.caption) return message.documentMessage.caption;
    
    // Mensagens de localização
    if (message.locationMessage) {
      const loc = message.locationMessage;
      return `📍 Localização: ${loc.degreesLatitude}, ${loc.degreesLongitude}`;
    }
    
    // Contato
    if (message.contactMessage) {
      return `👤 Contato: ${message.contactMessage.displayName}`;
    }
    
    // Sticker
    if (message.stickerMessage) {
      return '[Sticker]';
    }
    
    // Áudio
    if (message.audioMessage) {
      const duration = message.audioMessage.seconds || 0;
      return `🎵 Áudio (${duration}s)`;
    }
    
    // Documento
    if (message.documentMessage) {
      return `📄 Documento: ${message.documentMessage.fileName || 'arquivo'}`;
    }
    
    // Enquete
    if (message.pollCreationMessage) {
      return `📊 Enquete: ${message.pollCreationMessage.name}`;
    }
    
    // Reação
    if (message.reactionMessage) {
      return `Reação: ${message.reactionMessage.text}`;
    }
    
    return '[Mídia ou mensagem não suportada]';
  }

  /**
   * Extrai informações de mídia de uma mensagem
   */
  private extractMediaInfo(message: any): { type: MediaType; mimetype?: string } | null {
    if (!message) return null;
    
    if (message.imageMessage) {
      return { type: 'image', mimetype: message.imageMessage.mimetype };
    }
    if (message.videoMessage) {
      return { type: 'video', mimetype: message.videoMessage.mimetype };
    }
    if (message.audioMessage) {
      return { type: 'audio', mimetype: message.audioMessage.mimetype };
    }
    if (message.documentMessage) {
      return { type: 'document', mimetype: message.documentMessage.mimetype };
    }
    if (message.stickerMessage) {
      return { type: 'sticker', mimetype: message.stickerMessage.mimetype };
    }
    
    return null;
  }

  private extractContactName(remoteJid: string): string {
    if (!remoteJid) return 'Desconhecido';
    
    // Remover sufixo @s.whatsapp.net ou @lid
    let number = remoteJid.split('@')[0];
    
    // Se for LID, tentar obter PN
    if (remoteJid.includes('@lid')) {
      const pn = this.getPnFromLid(remoteJid);
      if (pn) {
        number = pn.split('@')[0];
      } else {
        return `LID: ${number.substring(0, 8)}...`;
      }
    }
    
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

  /**
   * Envia mensagem de texto para um contato
   * @param instanceId ID da instância
   * @param to JID do destinatário (pode ser PN ou LID)
   * @param message Texto da mensagem
   */
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

  /**
   * Envia mensagem usando relayMessage (formato proto.IMessage)
   * Útil para reenviar mensagens ou criar mensagens complexas
   */
  async relayMessage(instanceId: string, to: string, message: proto.IMessage): Promise<boolean> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return false;
    }

    try {
      await entry.socket.relayMessage(to, message, {});
      return true;
    } catch (error) {
      console.error(`Erro ao relay mensagem:`, error);
      return false;
    }
  }

  /**
   * Busca histórico de mensagens sob demanda
   * Útil para carregar mais mensagens antigas
   */
  async fetchMessageHistory(instanceId: string, count: number = 50): Promise<boolean> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return false;
    }

    try {
      await entry.socket.fetchMessageHistory(count, undefined, undefined);
      console.log(`📜 Solicitado histórico de ${count} mensagens para instância ${instanceId}`);
      return true;
    } catch (error) {
      console.error(`Erro ao buscar histórico:`, error);
      return false;
    }
  }

  /**
   * Atualiza mídia de uma mensagem que estava faltando
   * Útil quando a mídia não foi baixada corretamente
   */
  async updateMediaMessage(instanceId: string, message: proto.IWebMessageInfo): Promise<proto.IWebMessageInfo | null> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return null;
    }

    try {
      const updated = await entry.socket.updateMediaMessage(message);
      console.log(`🖼️ Mídia atualizada para mensagem ${message.key?.id}`);
      return updated;
    } catch (error) {
      console.error(`Erro ao atualizar mídia:`, error);
      return null;
    }
  }

  /**
   * Baixa mídia de uma mensagem
   */
  async downloadMedia(instanceId: string, message: proto.IWebMessageInfo): Promise<Buffer | null> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return null;
    }

    try {
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: entry.socket.updateMediaMessage,
        }
      );
      return buffer as Buffer;
    } catch (error) {
      console.error(`Erro ao baixar mídia:`, error);
      return null;
    }
  }

  /**
   * Verifica se um número está no WhatsApp
   */
  async isOnWhatsApp(instanceId: string, phoneNumber: string): Promise<boolean> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return false;
    }

    try {
      const [result] = await entry.socket.onWhatsApp(phoneNumber);
      return result?.exists || false;
    } catch (error) {
      console.error(`Erro ao verificar número:`, error);
      return false;
    }
  }

  /**
   * Bloqueia um contato
   */
  async blockContact(instanceId: string, jid: string): Promise<boolean> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return false;
    }

    try {
      await entry.socket.updateBlockStatus(jid, 'block');
      console.log(`🚫 Contato ${jid} bloqueado`);
      return true;
    } catch (error) {
      console.error(`Erro ao bloquear contato:`, error);
      return false;
    }
  }

  /**
   * Desbloqueia um contato
   */
  async unblockContact(instanceId: string, jid: string): Promise<boolean> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return false;
    }

    try {
      await entry.socket.updateBlockStatus(jid, 'unblock');
      console.log(`✅ Contato ${jid} desbloqueado`);
      return true;
    } catch (error) {
      console.error(`Erro ao desbloquear contato:`, error);
      return false;
    }
  }

  /**
   * Obtém metadados de um grupo
   */
  async getGroupMetadata(instanceId: string, groupJid: string): Promise<any | null> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return null;
    }

    // Verificar cache primeiro
    const cached = await this.getCachedGroupMetadata(groupJid);
    if (cached) return cached;

    try {
      const metadata = await entry.socket.groupMetadata(groupJid);
      this.cacheGroupMetadata(groupJid, metadata);
      return metadata;
    } catch (error) {
      console.error(`Erro ao obter metadados do grupo:`, error);
      return null;
    }
  }

  /**
   * Obtém a URL da foto de perfil de um contato ou grupo
   * @param instanceId ID da instância
   * @param jid JID do contato ou grupo (pode ser PN, LID ou grupo)
   * @param highRes Se true, busca imagem em alta resolução (mais lento)
   * @returns URL da imagem ou null se não tiver foto
   */
  async getProfilePicture(instanceId: string, jid: string, highRes: boolean = false): Promise<string | null> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return null;
    }

    // Verificar cache primeiro
    const cacheKey = `${jid}-${highRes ? 'high' : 'low'}`;
    const cached = this.profilePictureCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.PROFILE_PIC_CACHE_TTL) {
      return cached.url;
    }

    try {
      // 'image' = alta resolução, 'preview' = miniatura (mais rápido)
      const type = highRes ? 'image' : 'preview';
      
      const url = await entry.socket.profilePictureUrl(jid, type);
      
      // Cachear resultado
      this.profilePictureCache[cacheKey] = {
        url: url || null,
        timestamp: Date.now(),
      };
      
      return url || null;
    } catch (error: any) {
      // 404 = contato sem foto de perfil (normal)
      if (error?.output?.statusCode === 404 || error?.message?.includes('item-not-found')) {
        // Cachear como null para não ficar buscando
        this.profilePictureCache[cacheKey] = {
          url: null,
          timestamp: Date.now(),
        };
        return null;
      }
      
      console.error(`Erro ao obter foto de perfil de ${jid}:`, error);
      return null;
    }
  }

  /**
   * Obtém fotos de perfil de múltiplos contatos em paralelo
   * @param instanceId ID da instância
   * @param jids Array de JIDs
   * @param highRes Se true, busca imagens em alta resolução
   * @returns Mapa de JID -> URL (ou null se não tiver foto)
   */
  async getProfilePictures(instanceId: string, jids: string[], highRes: boolean = false): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    // Buscar em paralelo com limite de concorrência para evitar rate limit
    const batchSize = 5;
    for (let i = 0; i < jids.length; i += batchSize) {
      const batch = jids.slice(i, i + batchSize);
      const promises = batch.map(async (jid) => {
        const url = await this.getProfilePicture(instanceId, jid, highRes);
        return { jid, url };
      });
      
      const batchResults = await Promise.all(promises);
      for (const { jid, url } of batchResults) {
        results.set(jid, url);
      }
    }
    
    return results;
  }

  /**
   * Limpa o cache de fotos de perfil
   * Útil para forçar atualização
   */
  clearProfilePictureCache(jid?: string): void {
    if (jid) {
      // Limpar apenas de um contato específico
      delete this.profilePictureCache[`${jid}-high`];
      delete this.profilePictureCache[`${jid}-low`];
    } else {
      // Limpar todo o cache
      this.profilePictureCache = {};
    }
  }

  /**
   * Obtém informações completas de um contato incluindo foto
   * @param instanceId ID da instância
   * @param jid JID do contato
   */
  async getContactInfo(instanceId: string, jid: string): Promise<{
    jid: string;
    name: string;
    profilePicture: string | null;
    isOnWhatsApp: boolean;
  } | null> {
    const entry = this.instances.get(instanceId);
    if (!entry?.socket || entry.instance.status !== 'connected') {
      return null;
    }

    try {
      // Buscar foto e verificar se está no WhatsApp em paralelo
      const [profilePicture, onWhatsApp] = await Promise.all([
        this.getProfilePicture(instanceId, jid),
        this.isOnWhatsApp(instanceId, jid.replace('@s.whatsapp.net', '').replace('@lid', '')),
      ]);

      return {
        jid,
        name: this.extractContactName(jid),
        profilePicture,
        isOnWhatsApp: onWhatsApp,
      };
    } catch (error) {
      console.error(`Erro ao obter info do contato ${jid}:`, error);
      return null;
    }
  }

}
