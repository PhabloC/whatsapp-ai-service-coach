import React, { useState, useEffect } from 'react';
import { QRCodeScanner } from './components/qr-code-scanner/QRCodeScanner';
import { ChatSession, AnalysisEntry, Message, CriteriaConfig, HeatmapAnalysis, SalesScript } from './types';
import { ChatWindow } from './components/chat-window/ChatWindow';
import { ConnectionInstance } from './components/sidebar/types';
import { Dashboard } from './components/dashboard/Dashboard';
import { LoadingScreen } from './components/loading';
import { MainLayout } from './components/layout';
import { whatsappAPI } from './src/services/whatsapp-api';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { ResetPassword } from './pages/reset-password';
import { NewPassword } from './pages/new-password';
import { WelcomeScreen } from './pages/welcome';
import { useAuth } from './src/hooks/useAuth';

type AuthPage = 'login' | 'register' | 'reset';

const App: React.FC = () => {
  const { 
    user, 
    loading: authLoading, 
    error: authError, 
    isRecoveryMode,
    signIn, 
    signUp, 
    signOut, 
    resetPassword, 
    updatePassword,
    clearError,
    clearRecoveryMode 
  } = useAuth();
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connections, setConnections] = useState<ConnectionInstance[]>([]);
  const [currentView, setCurrentView] = useState<'chats' | 'dashboard' | 'settings'>('chats');
  const [instanceCriteria, setInstanceCriteria] = useState<Map<string, CriteriaConfig>>(new Map());

  // Estado para controlar carregamento inicial das conexões
  const [loadingConnections, setLoadingConnections] = useState(true);

  // Conectar WebSocket e carregar instâncias ao fazer login
  useEffect(() => {
    if (!user) return;

    const initializeConnections = async () => {
      setLoadingConnections(true);
      try {
        whatsappAPI.connect();
        
        // Tentar restaurar sessão automaticamente
        const restoredInstance = await whatsappAPI.autoRestoreSession();
        
        if (restoredInstance) {
          console.log('✅ Sessão restaurada automaticamente:', restoredInstance.id);
        }
        
        // Carregar todas as instâncias (incluindo a restaurada)
        await loadInstances();
      } catch (error) {
        console.error('Erro ao inicializar conexões:', error);
      } finally {
        setLoadingConnections(false);
      }
    };

    initializeConnections();

    const handleMessage = (data: { instanceId: string; message: any }) => {
      const { instanceId, message } = data;
      const contactName = message.contactName || message.from.split('@')[0];
      const isFromMe = message.isFromMe || false;
      const sender: 'client' | 'agent' = isFromMe ? 'agent' : 'client';
      const clientJid = isFromMe ? message.to : message.from;
      const sessionId = `${instanceId}-${clientJid}`;
      
      setSessions(prev => {
        let session = prev.find(s => s.id === sessionId);

        if (!session) {
          let instanceCriteriaConfig: CriteriaConfig | undefined;
          for (const [instId, criteria] of instanceCriteria.entries()) {
            if (sessionId.startsWith(instId + '-')) {
              instanceCriteriaConfig = criteria;
              break;
            }
          }

          // Criar sessão com JID para buscar foto depois
          session = {
            id: sessionId,
            contactName: contactName,
            lastMessage: message.body,
            timestamp: new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            messages: [],
            analysisHistory: [],
            criteriaConfig: instanceCriteriaConfig,
            contactJid: clientJid, // Armazenar JID para buscar foto
            profilePicture: undefined, // Será preenchido assincronamente
          };

          // Buscar foto de perfil assincronamente (não bloqueia a criação da sessão)
          whatsappAPI.getProfilePicture(instanceId, clientJid).then(profilePic => {
            if (profilePic) {
              setSessions(prevSessions => 
                prevSessions.map(s => 
                  s.id === sessionId ? { ...s, profilePicture: profilePic } : s
                )
              );
            }
          }).catch(err => console.error('Erro ao buscar foto de perfil:', err));

          return [...prev, session];
        }

        const messageExists = session.messages.some(m => m.id === message.id);
        if (messageExists) return prev;

        const newMessage: Message = {
          id: message.id,
          sender: sender,
          text: message.body,
          timestamp: new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          contactName: contactName,
        };

        return prev.map(s => {
          if (s.id === sessionId) {
            // Atualizar nome do contato se recebemos um nome melhor (não numérico)
            const currentNameIsNumeric = /^\+?\d[\d\s\-()]+$/.test(s.contactName);
            const newNameIsNumeric = /^\+?\d[\d\s\-()]+$/.test(contactName);
            const shouldUpdateName = currentNameIsNumeric && !newNameIsNumeric;
            
            return {
              ...s,
              messages: [...s.messages, newMessage],
              lastMessage: message.body,
              timestamp: newMessage.timestamp,
              // Atualizar nome se o novo nome for melhor (nome real vs número)
              ...(shouldUpdateName && { contactName: contactName }),
            };
          }
          return s;
        });
      });
    };

    const handleInstanceConnected = () => loadInstances();
    const handleInstanceDisconnected = () => loadInstances();

    whatsappAPI.on('message', handleMessage);
    whatsappAPI.on('instance_connected', handleInstanceConnected);
    whatsappAPI.on('instance_disconnected', handleInstanceDisconnected);

    return () => {
      whatsappAPI.off('message', handleMessage);
      whatsappAPI.off('instance_connected', handleInstanceConnected);
      whatsappAPI.off('instance_disconnected', handleInstanceDisconnected);
    };
  }, [user, instanceCriteria]);

  // Aplicar critérios da instância quando atualizados
  useEffect(() => {
    if (instanceCriteria.size === 0) return;
    
    setSessions(prev => {
      let hasChanges = false;
      const updated = prev.map(session => {
        if (!session.criteriaConfig) {
          for (const [instanceId, criteria] of instanceCriteria.entries()) {
            if (session.id.startsWith(instanceId + '-')) {
              hasChanges = true;
              return { ...session, criteriaConfig: criteria };
            }
          }
        }
        return session;
      });
      return hasChanges ? updated : prev;
    });
  }, [instanceCriteria]);

  const loadInstances = async (): Promise<ConnectionInstance[]> => {
    try {
      const instances = await whatsappAPI.getInstances();
      const connectionInstances: ConnectionInstance[] = instances.map(inst => ({
        id: inst.id,
        name: inst.name,
        status: inst.status === 'connected' ? 'active' : inst.status === 'connecting' || inst.status === 'qr_ready' ? 'connecting' : 'inactive',
        connectedAt: inst.connectedAt ? new Date(inst.connectedAt).toLocaleString('pt-BR') : undefined,
        phoneNumber: inst.phoneNumber,
      }));
      setConnections(connectionInstances);
      setIsConnected(connectionInstances.some(c => c.status === 'active'));
      return connectionInstances;
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      return [];
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleConnectWhatsApp = async () => {
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
      setSessions(prev => prev.filter(s => !s.id.startsWith(id + '-')));
      setConnections(prev => prev.filter(c => c.id !== id));
      
      await whatsappAPI.deleteInstance(id);
      
      const updatedConnections = await loadInstances();
      const remainingConnections = updatedConnections.filter(c => c.id !== id);
      
      if (remainingConnections.length === 0 || !remainingConnections.some(c => c.status === 'active')) {
        setIsConnected(false);
      }
      
      if (activeSessionId && activeSessionId.startsWith(id + '-')) {
        setActiveSessionId(null);
      }
    } catch (error) {
      console.error('Erro ao remover instância:', error);
      await loadInstances();
      alert('Erro ao remover conexão. Tente novamente.');
    }
  };

  const updateSessionPrompt = (sessionId: string, newPrompt: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, customPrompt: newPrompt } : s
    ));
  };

  const updateSessionCriteria = (sessionId: string, criteria: CriteriaConfig, generatedPrompt?: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { 
        ...s, 
        criteriaConfig: criteria,
        // Se tiver prompt gerado, atualizar o customPrompt da sessão
        customPrompt: generatedPrompt || s.customPrompt 
      } : s
    ));
  };

  const updateInstanceCriteria = (instanceId: string, criteria: CriteriaConfig) => {
    setInstanceCriteria(prev => {
      const newMap = new Map(prev);
      newMap.set(instanceId, criteria);
      return newMap;
    });
    
    setSessions(prev => prev.map(s => {
      if (s.id.startsWith(instanceId + '-')) {
        return { ...s, criteriaConfig: criteria };
      }
      return s;
    }));
  };

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

  const handleMarkAsSale = (sessionId: string, markedAsSale: boolean) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, markedAsSale } : s
    ));
  };

  const handleSaveSalesScript = (sessionId: string, script: SalesScript) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const newScriptHistory = s.salesScriptHistory || [];
        return {
          ...s,
          salesScriptHistory: [{ 
            id: Date.now().toString(), 
            timestamp: new Date().toLocaleString('pt-BR'), 
            script 
          }, ...newScriptHistory]
        };
      }
      return s;
    }));
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Tela de carregamento inicial
  if (authLoading && !user && !isRecoveryMode) {
    return <LoadingScreen />;
  }

  // Tela de nova senha (após clicar no link do email)
  if (isRecoveryMode) {
    return (
      <NewPassword 
        loading={authLoading}
        error={authError}
        onUpdatePassword={updatePassword}
        onClearError={clearError}
        onNavigateToLogin={() => {
          clearRecoveryMode();
          setAuthPage('login');
        }}
      />
    );
  }

  // Telas de autenticação
  if (!user) {
    if (authPage === 'register') {
      return (
        <Register 
          loading={authLoading}
          error={authError}
          onSignUp={signUp}
          onClearError={clearError}
          onNavigateToLogin={() => setAuthPage('login')}
        />
      );
    }

    if (authPage === 'reset') {
      return (
        <ResetPassword 
          loading={authLoading}
          error={authError}
          onResetPassword={resetPassword}
          onClearError={clearError}
          onNavigateToLogin={() => setAuthPage('login')}
        />
      );
    }

    return (
      <Login 
        loading={authLoading}
        error={authError}
        onSignIn={signIn}
        onClearError={clearError}
        onNavigateToRegister={() => setAuthPage('register')}
        onNavigateToReset={() => setAuthPage('reset')}
      />
    );
  }

  // Tela de Conexão QR Code
  if (showQRScanner) {
    return (
      <QRCodeScanner 
        onConnect={handleConnectWhatsApp}
        onCancel={() => setShowQRScanner(false)}
      />
    );
  }

  // Tela de carregamento enquanto verifica conexões existentes
  if (loadingConnections) {
    return <LoadingScreen />;
  }

  // Tela de boas-vindas (sem conexão)
  if (!isConnected) {
    return (
      <WelcomeScreen 
        userName={user.name}
        onLogout={handleLogout}
        onConnect={handleAddConnection}
      />
    );
  }

  // Dashboard Principal
  return (
    <MainLayout
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSelectSession={setActiveSessionId}
      userName={user.name}
      onLogout={handleLogout}
      onUpdateSessionPrompt={updateSessionPrompt}
      onAddConnection={handleAddConnection}
      connections={connections}
      onDisconnectInstance={handleDisconnectInstance}
      currentView={currentView}
      onViewChange={setCurrentView}
      instanceCriteria={instanceCriteria}
      onUpdateInstanceCriteria={updateInstanceCriteria}
    >
      {currentView === 'dashboard' ? (
        <Dashboard sessions={sessions} connections={connections} />
      ) : (
        <ChatWindow 
          session={activeSession}
          userId={user?.id}
          onUpdateSessionPrompt={updateSessionPrompt}
          onUpdateSessionCriteria={updateSessionCriteria}
          onSaveAnalysis={handleSaveAnalysis}
          onSaveHeatmap={handleSaveHeatmapAnalysis}
          onInjectMessage={handleInjectMessage}
          onMarkAsSale={handleMarkAsSale}
          onSaveSalesScript={handleSaveSalesScript}
          instanceCriteria={instanceCriteria}
        />
      )}
    </MainLayout>
  );
};

export default App;
