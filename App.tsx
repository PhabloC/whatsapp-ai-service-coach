
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatSession, User, AnalysisEntry } from './types';

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
  }
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_MOCK_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({ id: 'u1', email: 'admin@coach.ai', name: 'Gestor de Atendimento' });
  };

  const handleConnectWhatsApp = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 1500);
  };

  const handleAddConnection = () => {
    setIsConnected(false);
    setIsConnecting(false);
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

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
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
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg bg-white p-12 rounded-3xl shadow-xl text-center space-y-8 border border-slate-100">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">Conectar WhatsApp</h2>
            <p className="text-slate-500 text-sm">Escaneie o QR Code abaixo para sincronizar uma nova instância de monitoramento.</p>
          </div>
          <div className="aspect-square w-64 mx-auto bg-white rounded-3xl flex items-center justify-center border border-slate-100 shadow-inner relative group">
            {isConnecting ? (
              <div className="flex flex-col items-center gap-4">
                 <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                 <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Sincronizando...</p>
              </div>
            ) : (
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=coach-ai-sync-new" alt="QR Code" className="w-full h-full p-6 opacity-80" />
            )}
          </div>
          <div className="flex gap-3">
             <button onClick={() => setIsConnected(true)} className="flex-1 py-4 text-slate-400 font-bold text-sm">Voltar</button>
             <button onClick={handleConnectWhatsApp} disabled={isConnecting} className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all">CONECTAR APARELHO</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden relative">
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 p-3 bg-white shadow-xl border border-slate-100 rounded-2xl text-slate-600 hover:text-emerald-500 transition-all active:scale-95 animate-in fade-in zoom-in"
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
        />
      </main>
    </div>
  );
};

export default App;
