import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { WhatsAppManager } from './whatsapp-manager.js';
import { WhatsAppInstance, WhatsAppMessage } from './types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Criar diretório auth se não existir
const authDir = join(__dirname, '..', 'auth');
if (!existsSync(authDir)) {
  mkdirSync(authDir, { recursive: true });
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const whatsappManager = new WhatsAppManager(authDir);

// Event listeners do WhatsApp Manager
whatsappManager.on('qr', (instanceId: string, qrCode: string) => {
  io.emit('qr', { instanceId, qrCode });
});

whatsappManager.on('connected', (instanceId: string, phoneNumber?: string) => {
  console.log(`📡 Emitindo evento 'connected' para instância ${instanceId}`);
  io.emit('connected', { instanceId, phoneNumber });
});

whatsappManager.on('disconnected', (instanceId: string) => {
  io.emit('disconnected', { instanceId });
});

whatsappManager.on('message', (instanceId: string, message: WhatsAppMessage) => {
  console.log(`📤 Enviando mensagem via WebSocket para instância ${instanceId}:`, message.body.substring(0, 50));
  io.emit('message', { instanceId, message });
});

whatsappManager.on('error', (instanceId: string, error: any) => {
  io.emit('error', { instanceId, error: error.message });
});

// Rotas REST API

// Criar nova instância
app.post('/api/instances', async (req, res) => {
  try {
    const { name } = req.body;
    const instanceId = `instance-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const instance = await whatsappManager.createInstance(instanceId, name || `Instância ${instanceId.slice(-6)}`);
    res.json(instance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Listar todas as instâncias
app.get('/api/instances', (req, res) => {
  const instances = whatsappManager.getAllInstances();
  res.json(instances);
});

// Obter instância específica
app.get('/api/instances/:id', (req, res) => {
  const instance = whatsappManager.getInstance(req.params.id);
  if (!instance) {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }
  res.json(instance);
});

// Endpoint para buscar QR Code rapidamente (polling)
app.get('/api/instances/:id/qr', (req, res) => {
  const instance = whatsappManager.getInstance(req.params.id);
  if (!instance) {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }
  res.json({ 
    qrCode: instance.qrCode, 
    status: instance.status,
    hasQR: !!instance.qrCode 
  });
});

// Deletar instância
app.delete('/api/instances/:id', async (req, res) => {
  try {
    const deleted = await whatsappManager.deleteInstance(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar mensagem
app.post('/api/instances/:id/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'Campos "to" e "message" são obrigatórios' });
    }

    const success = await whatsappManager.sendMessage(req.params.id, to, message);
    if (!success) {
      return res.status(400).json({ error: 'Não foi possível enviar a mensagem' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obter foto de perfil de um contato
app.get('/api/instances/:id/profile-picture/:jid', async (req, res) => {
  try {
    const { id, jid } = req.params;
    const highRes = req.query.highRes === 'true';
    
    const url = await whatsappManager.getProfilePicture(id, jid, highRes);
    
    res.json({ jid, profilePicture: url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obter fotos de perfil de múltiplos contatos
app.post('/api/instances/:id/profile-pictures', async (req, res) => {
  try {
    const { id } = req.params;
    const { jids, highRes } = req.body;
    
    if (!jids || !Array.isArray(jids)) {
      return res.status(400).json({ error: 'Campo "jids" deve ser um array de JIDs' });
    }
    
    const results = await whatsappManager.getProfilePictures(id, jids, highRes === true);
    
    // Converter Map para objeto
    const profilePictures: { [jid: string]: string | null } = {};
    results.forEach((url, jid) => {
      profilePictures[jid] = url;
    });
    
    res.json({ profilePictures });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obter informações completas de um contato
app.get('/api/instances/:id/contacts/:jid', async (req, res) => {
  try {
    const { id, jid } = req.params;
    
    const contactInfo = await whatsappManager.getContactInfo(id, jid);
    if (!contactInfo) {
      return res.status(404).json({ error: 'Não foi possível obter informações do contato' });
    }
    
    res.json(contactInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar se número está no WhatsApp
app.get('/api/instances/:id/check/:phoneNumber', async (req, res) => {
  try {
    const { id, phoneNumber } = req.params;
    
    const exists = await whatsappManager.isOnWhatsApp(id, phoneNumber);
    res.json({ phoneNumber, exists });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Listar sessões salvas no disco (para reconexão)
app.get('/api/sessions/saved', (req, res) => {
  const savedSessions = whatsappManager.getSavedSessionIds();
  res.json({ sessions: savedSessions });
});

// Restaurar/reconectar uma sessão salva
app.post('/api/sessions/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se já está na memória e conectada
    const existingInstance = whatsappManager.getInstance(id);
    if (existingInstance && existingInstance.status === 'connected') {
      return res.json(existingInstance);
    }
    
    const instance = await whatsappManager.restoreInstance(id);
    if (!instance) {
      return res.status(404).json({ error: 'Sessão não encontrada ou não autenticada' });
    }
    
    res.json(instance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 WebSocket disponível em ws://localhost:${PORT}`);
  
  // Restaurar sessões salvas automaticamente
  console.log('🔄 Iniciando restauração automática de sessões...');
  await whatsappManager.restoreAllSessions();
});