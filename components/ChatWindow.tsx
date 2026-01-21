
import React, { useState, useEffect } from 'react';
import { ChatSession, AnalysisResult, AnalysisEntry } from '../types';
import { analyzeConversation } from '../geminiService';

interface ChatWindowProps {
  session: ChatSession | null;
  onUpdateSessionPrompt: (sessionId: string, prompt: string) => void;
  onSaveAnalysis: (sessionId: string, analysis: AnalysisEntry) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ session, onUpdateSessionPrompt, onSaveAnalysis }) => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      setCurrentPrompt(session.customPrompt || 'Analise o tom de voz e a eficiência em resolver o problema do cliente.');
      setSelectedHistoryId(session.analysisHistory.length > 0 ? session.analysisHistory[0].id : null);
    }
  }, [session]);

  const handleAnalyze = async () => {
    if (!session) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeConversation(session.messages, currentPrompt);
      const newEntry: AnalysisEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('pt-BR'),
        promptUsed: currentPrompt,
        result: result
      };
      onSaveAnalysis(session.id, newEntry);
      setSelectedHistoryId(newEntry.id);
    } catch (error) {
      console.error(error);
      alert('Erro ao analisar conversa.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeAnalysis = session?.analysisHistory.find(h => h.id === selectedHistoryId)?.result;

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 text-slate-400">
        <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        <p className="text-lg font-medium">Selecione uma conversa para começar o coaching</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-row h-full overflow-hidden">
      <div className="flex-1 flex flex-col bg-[#e5ddd5] dark:bg-slate-900 overflow-hidden relative">
        <div className="p-4 bg-white border-b flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              {session.contactName.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{session.contactName}</h3>
              <p className="text-xs text-emerald-500 font-medium">Conexão Ativa</p>
            </div>
          </div>
          <button 
            onClick={() => setIsEditingConfig(!isEditingConfig)}
            className={`p-2 rounded-full transition-colors ${isEditingConfig ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>

        {isEditingConfig && (
          <div className="absolute top-20 right-4 left-4 bg-white shadow-2xl rounded-2xl p-6 z-20 border border-emerald-100 animate-in slide-in-from-top-4">
            <h4 className="font-bold text-slate-800 mb-2">Configurar Prompt desta Conexão</h4>
            <textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="w-full p-4 border rounded-xl text-sm h-32 mb-4 bg-slate-50"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditingConfig(false)} className="px-4 py-2 text-slate-500">Fechar</button>
              <button onClick={() => { onUpdateSessionPrompt(session.id, currentPrompt); setIsEditingConfig(false); }} className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold">Salvar Configuração</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {session.messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-xl shadow-sm ${m.sender === 'agent' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                <p className="text-sm text-slate-800">{m.text}</p>
                <p className="text-[10px] text-slate-400 mt-1 text-right">{m.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-96 border-l bg-white flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Análise do Coach
          </h3>
          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg disabled:opacity-50 transition-all"
          >
            {isAnalyzing ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {session.analysisHistory.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico de Sessões</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {session.analysisHistory.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHistoryId(h.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${selectedHistoryId === h.id ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {h.timestamp.split(',')[1].trim()} - {h.result.score}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeAnalysis ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <div className={`text-5xl font-black mb-2 ${activeAnalysis.score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {activeAnalysis.score}%
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase">Score de Qualidade</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div> Pontos de Sucesso
                </h4>
                <ul className="space-y-2">
                  {activeAnalysis.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-slate-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex gap-2">
                      <span className="text-emerald-500">★</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div> Oportunidades
                </h4>
                <ul className="space-y-2">
                  {activeAnalysis.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-2">
                      <span className="text-amber-500">!</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase mb-2">Feedback Estratégico</h4>
                <p className="text-sm text-slate-200 italic leading-relaxed">
                  "{activeAnalysis.coachingTips}"
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-[10px] text-slate-500 italic truncate">Prompt: {session.analysisHistory.find(h => h.id === selectedHistoryId)?.promptUsed}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8 opacity-40">
              <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <p className="text-sm font-medium">Nenhuma análise realizada para esta sessão.</p>
              <button onClick={handleAnalyze} className="mt-4 text-xs font-bold text-emerald-500 uppercase">Iniciar Agora</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
