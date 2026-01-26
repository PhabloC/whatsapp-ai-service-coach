import React, { useState, useEffect } from 'react';
import { QRCodeScanner } from './components/qr-code-scanner/QRCodeScanner';
import { ChatSession, User, AnalysisEntry, Message, CriteriaConfig, HeatmapAnalysis } from './types';
import { ChatWindow } from './components/chat-window/ChatWindow';
import { ConnectionInstance } from './components/sidebar/types';
import { Sidebar } from './components/sidebar/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { SidebarResizer } from './components/resizer/SidebarResizer';
import { whatsappAPI } from './src/services/whatsapp-api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [connections, setConnections] = useState<ConnectionInstance[]>([]);
  const [currentView, setCurrentView] = useState<'chats' | 'dashboard' | 'settings'>('chats');
  const [instanceCriteria, setInstanceCriteria] = useState<Map<string, CriteriaConfig>>(new Map());
  const [sidebarWidth, setSidebarWidth] = useState<number>(320); // Largura padrão da sidebar

  // Conectar WebSocket e carregar instâncias ao fazer login
  useEffect(() => {
    if (!user) return;

    whatsappAPI.connect();
    loadInstances();

    // Listener para mensagens do WhatsApp
    const handleMessage = (data: { instanceId: string; message: any }) => {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:31',message:'handleMessage ENTRY',data:{instanceId:data.instanceId,messageId:data.message.id,instanceCriteriaSize:instanceCriteria.size,instanceCriteriaKeys:Array.from(instanceCriteria.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('📥 Mensagem recebida no frontend:', data);
      const { instanceId, message } = data;
      const contactName = message.contactName || message.from.split('@')[0];
      
      // Usar a flag isFromMe do backend para determinar o sender
      const isFromMe = message.isFromMe || false;
      const sender: 'client' | 'agent' = isFromMe ? 'agent' : 'client';
      
      // Identificar o número do cliente (sempre será o remoteJid, que está em 'from' quando recebida ou 'to' quando enviada)
      // Quando isFromMe = false: cliente está em 'from'
      // Quando isFromMe = true: cliente está em 'to'
      const clientJid = isFromMe ? message.to : message.from;
      
      // Encontrar ou criar sessão para este contato (usar o JID do cliente)
      const sessionId = `${instanceId}-${clientJid}`;
      
      setSessions(prev => {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:48',message:'setSessions callback ENTRY',data:{sessionId,prevSessionsCount:prev.length,instanceCriteriaSize:instanceCriteria.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        let session = prev.find(s => s.id === sessionId);

        if (!session) {
          // Buscar critérios da instância para aplicar à nova sessão
          let instanceCriteriaConfig: CriteriaConfig | undefined;
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:54',message:'BEFORE criteria lookup',data:{instanceCriteriaSize:instanceCriteria.size,instanceCriteriaKeys:Array.from(instanceCriteria.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          for (const [instId, criteria] of instanceCriteria.entries()) {
            if (sessionId.startsWith(instId + '-')) {
              instanceCriteriaConfig = criteria;
              break;
            }
          }
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:59',message:'AFTER criteria lookup',data:{foundCriteria:!!instanceCriteriaConfig},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion

          session = {
            id: sessionId,
            contactName: contactName,
            lastMessage: message.body,
            timestamp: new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            messages: [],
            analysisHistory: [],
            criteriaConfig: instanceCriteriaConfig,
          };
          console.log('✅ Nova sessão criada:', sessionId, contactName, instanceCriteriaConfig ? 'com critérios' : 'sem critérios');
          return [...prev, session];
        }

        // Verificar se a mensagem já existe (evitar duplicatas)
        const messageExists = session.messages.some(m => m.id === message.id);
        if (messageExists) {
          console.log('⚠️ Mensagem duplicada ignorada:', message.id);
          return prev;
        }

        // Adicionar mensagem à sessão
        const newMessage: Message = {
          id: message.id,
          sender: sender,
          text: message.body,
          timestamp: new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          contactName: contactName,
        };

        console.log(`➕ Adicionando mensagem à sessão ${sessionId}:`, sender, message.body.substring(0, 30));
        return prev.map(s => {
          if (s.id === sessionId) {
            return {
              ...s,
              messages: [...s.messages, newMessage],
              lastMessage: message.body,
              timestamp: newMessage.timestamp,
            };
          }
          return s;
        });
      });
    };

    // Listener para conexões estabelecidas
    const handleInstanceConnected = (data: { instanceId: string; phoneNumber?: string }) => {
      loadInstances();
    };

    // Listener para desconexões
    const handleInstanceDisconnected = (data: { instanceId: string }) => {
      loadInstances();
    };

    whatsappAPI.on('message', handleMessage);
    whatsappAPI.on('instance_connected', handleInstanceConnected);
    whatsappAPI.on('instance_disconnected', handleInstanceDisconnected);

    return () => {
      whatsappAPI.off('message', handleMessage);
      whatsappAPI.off('instance_connected', handleInstanceConnected);
      whatsappAPI.off('instance_disconnected', handleInstanceDisconnected);
    };
  }, [user, instanceCriteria]);

  const loadInstances = async (): Promise<ConnectionInstance[]> => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:126',message:'loadInstances ENTRY',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const instances = await whatsappAPI.getInstances();
      const connectionInstances: ConnectionInstance[] = instances.map(inst => ({
        id: inst.id,
        name: inst.name,
        status: inst.status === 'connected' ? 'active' : inst.status === 'connecting' || inst.status === 'qr_ready' ? 'connecting' : 'inactive',
        connectedAt: inst.connectedAt ? new Date(inst.connectedAt).toLocaleString('pt-BR') : undefined,
        phoneNumber: inst.phoneNumber,
      }));
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:135',message:'loadInstances BEFORE setConnections',data:{instancesCount:connectionInstances.length,instancesIds:connectionInstances.map(i=>i.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setConnections(connectionInstances);
      setIsConnected(connectionInstances.some(c => c.status === 'active'));
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:137',message:'loadInstances AFTER setConnections',data:{instancesCount:connectionInstances.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return connectionInstances;
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      return [];
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({ id: 'u1', email: 'admin@coach.ai', name: 'Gestor de Atendimento' });
  };

  const handleConnectWhatsApp = async (instanceId: string) => {
    try {
      await loadInstances();
      setIsConnected(true);
      setShowQRScanner(false);
    } catch (error) {
      console.error('Erro ao conectar:', error);
    }
  };

  const handleAddConnection = () => {
    setShowQRScanner(true);
  };

  const handleDisconnectInstance = async (id: string) => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:161',message:'handleDisconnectInstance ENTRY',data:{instanceId:id,connectionsCount:connections.length,connectionsIds:connections.map(c=>c.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log('🗑️ Removendo instância:', id);
      
      // Remover sessões relacionadas primeiro (para feedback mais rápido)
      setSessions(prev => {
        const filtered = prev.filter(s => !s.id.startsWith(id + '-'));
        console.log(`Removidas ${prev.length - filtered.length} sessões relacionadas`);
        return filtered;
      });
      
      // Remover da lista de conexões imediatamente (otimista)
      setConnections(prev => prev.filter(c => c.id !== id));
      
      // Deletar no backend
      await whatsappAPI.deleteInstance(id);
      console.log('✅ Instância removida do backend');
      
      // Recarregar instâncias para garantir sincronização e obter estado atualizado
      const updatedConnections = await loadInstances();
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:204',message:'AFTER loadInstances - using returned value',data:{updatedConnectionsCount:updatedConnections.length,updatedConnectionsIds:updatedConnections.map(c=>c.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Verificar se ainda há conexões ativas usando o valor retornado (não o closure stale)
      const remainingConnections = updatedConnections.filter(c => c.id !== id);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:210',message:'AFTER filtering - using updated connections',data:{remainingConnectionsCount:remainingConnections.length,willSetIsConnectedFalse:remainingConnections.length === 0 || !remainingConnections.some(c => c.status === 'active')},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (remainingConnections.length === 0 || !remainingConnections.some(c => c.status === 'active')) {
        setIsConnected(false);
      }
      
      // Se estava visualizando uma sessão da instância removida, limpar seleção
      if (activeSessionId && activeSessionId.startsWith(id + '-')) {
        setActiveSessionId(null);
      }
      
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:194',message:'handleDisconnectInstance ERROR',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('❌ Erro ao remover instância:', error);
      // Reverter mudanças em caso de erro
      await loadInstances();
      alert('Erro ao remover conexão. Tente novamente.');
    }
  };

  const updateSessionPrompt = (sessionId: string, newPrompt: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, customPrompt: newPrompt } : s
    ));
  };

  const updateSessionCriteria = (sessionId: string, criteria: CriteriaConfig) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, criteriaConfig: criteria } : s
    ));
  };

  const updateInstanceCriteria = (instanceId: string, criteria: CriteriaConfig) => {
    setInstanceCriteria(prev => {
      const newMap = new Map(prev);
      newMap.set(instanceId, criteria);
      return newMap;
    });
    
    // Aplicar critérios a todas as sessões existentes e futuras desta instância
    setSessions(prev => prev.map(s => {
      if (s.id.startsWith(instanceId + '-')) {
        return { ...s, criteriaConfig: criteria };
      }
      return s;
    }));
    
    console.log(`✅ Critérios atualizados para instância ${instanceId}`);
  };

  // Aplicar critérios da instância quando novas sessões são criadas ou critérios são atualizados
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:250',message:'criteria useEffect ENTRY',data:{instanceCriteriaSize:instanceCriteria.size,instanceCriteriaKeys:Array.from(instanceCriteria.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    // Só atualizar se houver critérios configurados e sessões sem critérios
    if (instanceCriteria.size === 0) return;
    
    setSessions(prev => {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:254',message:'criteria useEffect setSessions callback',data:{prevSessionsCount:prev.length,instanceCriteriaSize:instanceCriteria.size},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      let hasChanges = false;
      const updated = prev.map(session => {
        // Se a sessão não tem critérios, buscar da instância
        if (!session.criteriaConfig) {
          for (const [instanceId, criteria] of instanceCriteria.entries()) {
            if (session.id.startsWith(instanceId + '-')) {
              // #region agent log
              fetch('http://127.0.0.1:7245/ingest/66e591df-86df-42d1-99fb-24432197f6e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:262',message:'criteria applied to session',data:{sessionId:session.id,instanceId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
              // #endregion
              hasChanges = true;
              return { ...session, criteriaConfig: criteria };
            }
          }
        }
        return session;
      });
      // Só retornar novo array se houver mudanças para evitar re-renders desnecessários
      return hasChanges ? updated : prev;
    });
  }, [instanceCriteria]);

  const handleSaveHeatmapAnalysis = (sessionId: string, heatmap: HeatmapAnalysis) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const newHeatmapHistory = s.heatmapHistory || [];
        return {
          ...s,
          heatmapHistory: [{ 
            id: Date.now().toString(), 
            timestamp: new Date().toLocaleString('pt-BR'), 
            analysis: heatmap 
          }, ...newHeatmapHistory]
        };
      }
      return s;
    }));
  };

  const handleSaveAnalysis = (sessionId: string, analysis: AnalysisEntry) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, analysisHistory: [analysis, ...s.analysisHistory] } : s
    ));
  };

  const handleInjectMessage = (sessionId: string, message: Message) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: [...s.messages, message],
          lastMessage: message.text,
          timestamp: message.timestamp
        };
      }
      return s;
    }));
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Tela de Login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800 animate-fade-in">
          <div className="p-10 space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" /></svg>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Coach AI</h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Plataforma de Auditoria</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" defaultValue="admin@coach.ai" placeholder="E-mail Administrativo" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all" required />
              <input type="password" defaultValue="password" placeholder="Senha" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all" required />
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-xl transition-all active:scale-[0.98] tracking-widest text-sm">ENTRAR</button>
            </form>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center">
                Versão 1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Conexão QR Code
  if (showQRScanner) {
    return (
      <QRCodeScanner 
        onConnect={(instanceId) => handleConnectWhatsApp(instanceId)}
        onCancel={() => setShowQRScanner(false)}
      />
    );
  }

  // Tela inicial sem conexão
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6">
        <div className="w-full max-w-lg bg-white p-12 rounded-3xl shadow-xl text-center space-y-8 border border-slate-100 animate-fade-in">
          <div className="space-y-2">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800">Bem-vindo, {user.name}!</h2>
            <p className="text-slate-500 text-sm">Conecte sua primeira instância do WhatsApp para começar a monitorar atendimentos.</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-700 text-sm">O que você pode fazer:</h3>
            <ul className="text-sm text-slate-500 space-y-2 text-left">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Monitorar conversas em tempo real
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Auditar qualidade de atendimento com IA
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Acompanhar evolução dos atendentes
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Personalizar prompts por departamento
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setUser(null)} 
              className="flex-1 py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
            >
              Sair
            </button>
            <button 
              onClick={handleAddConnection}
              className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              CONECTAR WHATSAPP
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Principal
  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden relative">
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 p-3 bg-white shadow-xl border border-slate-100 rounded-2xl text-slate-600 hover:text-emerald-500 transition-all active:scale-95 animate-fade-in"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>
      )}

      <div 
        className="relative flex-shrink-0" 
        style={{ 
          width: isSidebarOpen ? `${sidebarWidth}px` : '0px', 
          transition: isSidebarOpen ? 'width 0.2s' : 'none',
          overflow: 'hidden'
        }}
      >
        <Sidebar 
          sessions={sessions} 
          activeSessionId={activeSessionId} 
          onSelectSession={setActiveSessionId} 
          userName={user.name} 
          onLogout={() => setUser(null)}
          onUpdateSessionPrompt={updateSessionPrompt}
          onAddConnection={handleAddConnection}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          connections={connections}
          onDisconnectInstance={handleDisconnectInstance}
          currentView={currentView}
          onViewChange={setCurrentView}
          instanceCriteria={instanceCriteria}
          onUpdateInstanceCriteria={updateInstanceCriteria}
        />
        {isSidebarOpen && (
          <SidebarResizer
            onResize={setSidebarWidth}
            currentWidth={sidebarWidth}
            minWidth={240}
            maxWidth={600}
          />
        )}
      </div>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Navbar */}
        <div className="p-4 bg-white border-b flex items-center gap-4 lg:hidden">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
           <h2 className="font-black text-slate-800 tracking-tight">Coach AI</h2>
        </div>
        
        {currentView === 'dashboard' ? (
          <Dashboard sessions={sessions} connections={connections} />
        ) : (
          <ChatWindow 
            session={activeSession} 
            onUpdateSessionPrompt={updateSessionPrompt}
            onUpdateSessionCriteria={updateSessionCriteria}
            onSaveAnalysis={handleSaveAnalysis}
            onSaveHeatmap={handleSaveHeatmapAnalysis}
            onInjectMessage={handleInjectMessage}
            instanceCriteria={instanceCriteria}
          />
        )}
      </main>
    </div>
  );
};

export default App;