import React, { useState, useMemo } from 'react';
import { ChatSession } from '@/types';
import { SidebarProps, ConnectionInstance } from './types';


export const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onLogout,
  onUpdateSessionPrompt,
  onAddConnection,
  userName,
  isOpen,
  setIsOpen,
  connections,
  onDisconnectInstance
}) => {
  const [view, setView] = useState<'chats' | 'settings'>('chats');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [tempPrompt, setTempPrompt] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Filtra sessões baseado no termo de busca
  const filteredSessions = useMemo(() => {
    if (!searchFilter.trim()) return sessions;
    
    const term = searchFilter.toLowerCase();
    return sessions.filter(session => 
      session.contactName.toLowerCase().includes(term) ||
      session.lastMessage.toLowerCase().includes(term) ||
      session.messages.some(m => m.text.toLowerCase().includes(term))
    );
  }, [sessions, searchFilter]);

  const startEditing = (session: ChatSession) => {
    setEditingPromptId(session.id);
    setTempPrompt(session.customPrompt || '');
  };

  const savePrompt = (id: string) => {
    onUpdateSessionPrompt(id, tempPrompt);
    setEditingPromptId(null);
  };

  const getStatusColor = (status: ConnectionInstance['status']) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'connecting': return 'bg-amber-500 animate-pulse';
      case 'inactive': return 'bg-slate-300';
    }
  };

  const getStatusText = (status: ConnectionInstance['status']) => {
    switch (status) {
      case 'active': return 'ATIVO';
      case 'connecting': return 'CONECTANDO';
      case 'inactive': return 'INATIVO';
    }
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-full flex flex-col">
        {/* Header com User Info */}
        <div className="p-4 border-b bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/20">
              {userName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-sm truncate w-32">{userName}</p>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Dashboard Admin</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b text-sm font-bold">
          <button 
            onClick={() => setView('chats')}
            className={`flex-1 py-4 transition-all flex items-center justify-center gap-2 ${view === 'chats' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            CHATS
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`flex-1 py-4 transition-all flex items-center justify-center gap-2 ${view === 'settings' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            AJUSTES
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {view === 'chats' ? (
            <div className="divide-y divide-slate-100">
              <div className="p-4">
                <div className="relative">
                  <input 
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar conversas..." 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  {searchFilter && (
                    <button 
                      onClick={() => setSearchFilter('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {searchFilter && (
                  <p className="text-[10px] text-slate-400 mt-2 px-1">
                    {filteredSessions.length} de {sessions.length} conversas
                  </p>
                )}
              </div>

              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 mx-auto text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm text-slate-400">Nenhuma conversa encontrada</p>
                  <p className="text-xs text-slate-300 mt-1">Tente outro termo de busca</p>
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      if (window.innerWidth < 1024) setIsOpen(false);
                    }}
                    className={`w-full p-4 flex items-center gap-3 transition-all hover:bg-white ${activeSessionId === session.id ? 'bg-white border-r-4 border-emerald-500 shadow-sm' : ''}`}
                  >
                    <div className={`relative w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-sm ${activeSessionId === session.id ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      {session.contactName.charAt(0)}
                      {session.analysisHistory.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">
                          {session.analysisHistory.length}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className={`font-bold text-sm truncate ${activeSessionId === session.id ? 'text-slate-900' : 'text-slate-600'}`}>{session.contactName}</h4>
                        <span className="text-[10px] text-slate-400 font-medium">{session.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate leading-relaxed">{session.lastMessage}</p>
                      {session.analysisHistory.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[10px] font-bold ${
                            session.analysisHistory[0].result.score >= 70 ? 'text-emerald-500' : 
                            session.analysisHistory[0].result.score >= 50 ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            Score: {session.analysisHistory[0].result.score}%
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="p-4 space-y-6 pb-20">
              {/* Gestão de Conexões Multi-Instância */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conexões WhatsApp</h5>
                   <button 
                    onClick={onAddConnection}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                     </svg>
                     NOVA CONEXÃO
                   </button>
                </div>
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <div 
                      key={conn.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(conn.status)}`} />
                          <div>
                            <span className="text-xs font-bold text-slate-700">{conn.name}</span>
                            {conn.connectedAt && (
                              <p className="text-[10px] text-slate-400">Conectado: {conn.connectedAt}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            conn.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                            conn.status === 'connecting' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {getStatusText(conn.status)}
                          </span>
                          {conn.status === 'active' && (
                            <button 
                              onClick={() => onDisconnectInstance(conn.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              title="Desconectar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {connections.length === 0 && (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                      <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-slate-400">Nenhuma conexão ativa</p>
                      <button 
                        onClick={onAddConnection}
                        className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        Conectar WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Gestão de Prompts */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prompts por WhatsApp</h5>
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800">{session.contactName}</span>
                        {editingPromptId !== session.id ? (
                          <button 
                            onClick={() => startEditing(session)}
                            className="p-1 text-slate-400 hover:text-emerald-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        ) : (
                          <button 
                            onClick={() => savePrompt(session.id)}
                            className="p-1 text-emerald-500 hover:text-emerald-600 font-bold text-[10px]"
                          >
                            SALVAR
                          </button>
                        )}
                      </div>
                      
                      {editingPromptId === session.id ? (
                        <textarea 
                          className="w-full text-xs p-2 border rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500 outline-none h-20"
                          value={tempPrompt}
                          onChange={(e) => setTempPrompt(e.target.value)}
                        />
                      ) : (
                        <p className="text-[10px] text-slate-500 italic line-clamp-2">
                          {session.customPrompt || 'Sem prompt customizado configurado.'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações Globais */}
              <div className="pt-6 border-t space-y-2">
                <button 
                  onClick={onLogout}
                  className="w-full py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Encerrar Sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export type { ConnectionInstance };

