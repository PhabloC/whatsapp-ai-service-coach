import React, { useState } from 'react';
import { QRCodeScanner } from './components/qr-code-scanner/QRCodeScanner';
import { ChatSession, User, AnalysisEntry, Message } from './types';
import { ChatWindow } from './components/chat-window/ChatWindow';
import { ConnectionInstance } from './components/sidebar/types';
import { Sidebar } from './components/sidebar/Sidebar';

const INITIAL_MOCK_SESSIONS: ChatSession[] = [
  {
    id: '1',
    contactName: 'Vendas SP - Loja 01',
    lastMessage: 'Qual o prazo de entrega?',
    timestamp: '14:20',
    customPrompt: 'Avalie se o vendedor tentou fazer up-selling e se explicou corretamente a política de frete.',
    analysisHistory: [],
    messages: [
      { id: '1a', sender: 'client', text: 'Olá, gostaria de saber sobre o meu pedido #1234', timestamp: '14:05', contactName: 'João Silva' },
      { id: '1b', sender: 'agent', text: 'Olá João! Vou verificar no sistema agora mesmo. Um momento.', timestamp: '14:07', contactName: 'João Silva' },
      { id: '1c', sender: 'agent', text: 'Verifiquei aqui. Ele já saiu para entrega e deve chegar até as 18h. Já aproveitou para ver nossa promoção de kits de limpeza?', timestamp: '14:15', contactName: 'João Silva' },
      { id: '1d', sender: 'client', text: 'Perfeito! Qual o prazo de entrega?', timestamp: '14:20', contactName: 'João Silva' }
    ]
  },
  {
    id: '2',
    contactName: 'Suporte Técnico BR',
    lastMessage: 'Muito obrigada pela ajuda!',
    timestamp: '11:05',
    customPrompt: 'Análise técnica de solução de problemas. O atendente foi direto ao ponto? Usou termos muito complexos?',
    analysisHistory: [],
    messages: [
      { id: '2a', sender: 'client', text: 'Não consigo acessar minha conta.', timestamp: '10:50', contactName: 'Maria Oliveira' },
      { id: '2b', sender: 'agent', text: 'Bom dia Maria. Você já tentou redefinir a senha através do link esqueci minha senha?', timestamp: '10:55', contactName: 'Maria Oliveira' },
      { id: '2c', sender: 'client', text: 'Consegui agora! Muito obrigada pela ajuda!', timestamp: '11:05', contactName: 'Maria Oliveira' }
    ]
  },
  {
    id: '3',
    contactName: 'SAC Premium',
    lastMessage: 'Vou verificar seu caso com prioridade.',
    timestamp: '09:30',
    customPrompt: 'Avalie o nível de empatia e se o atendente demonstrou urgência adequada para clientes premium.',
    analysisHistory: [],
    messages: [
      { id: '3a', sender: 'client', text: 'Boa dia, sou cliente há 5 anos e estou com um problema grave.', timestamp: '09:15', contactName: 'Carlos Mendes' },
      { id: '3b', sender: 'agent', text: 'Bom dia Sr. Carlos! Reconheço sua fidelidade conosco. Por favor, me conte o que está acontecendo.', timestamp: '09:18', contactName: 'Carlos Mendes' },
      { id: '3c', sender: 'client', text: 'Minha fatura veio com valor errado, quase o dobro do normal.', timestamp: '09:22', contactName: 'Carlos Mendes' },
      { id: '3d', sender: 'agent', text: 'Entendo sua preocupação e peço desculpas pelo transtorno. Vou verificar seu caso com prioridade.', timestamp: '09:30', contactName: 'Carlos Mendes' }
    ]
  }
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_MOCK_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [connections, setConnections] = useState<ConnectionInstance[]>([]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({ id: 'u1', email: 'admin@coach.ai', name: 'Gestor de Atendimento' });
  };

  const handleConnectWhatsApp = () => {
    const newConnection: ConnectionInstance = {
      id: `conn-${Date.now()}`,
      name: `Instância ${String(connections.length + 1).padStart(2, '0')}`,
      status: 'active',
      connectedAt: new Date().toLocaleString('pt-BR')
    };
    setConnections(prev => [...prev, newConnection]);
    setIsConnected(true);
    setShowQRScanner(false);
  };

  const handleAddConnection = () => {
    setShowQRScanner(true);
  };

  const handleDisconnectInstance = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
    if (connections.length === 1) {
      setIsConnected(false);
    }
  };

  const updateSessionPrompt = (sessionId: string, newPrompt: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, customPrompt: newPrompt } : s
    ));
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
                Versão 1.0 • Modo Sandbox Ativo
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
        onConnect={handleConnectWhatsApp}
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
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Navbar */}
        <div className="p-4 bg-white border-b flex items-center gap-4 lg:hidden">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
           <h2 className="font-black text-slate-800 tracking-tight">Coach AI</h2>
        </div>
        
        <ChatWindow 
          session={activeSession} 
          onUpdateSessionPrompt={updateSessionPrompt} 
          onSaveAnalysis={handleSaveAnalysis}
          onInjectMessage={handleInjectMessage}
        />
      </main>
    </div>
  );
};

export default App;
