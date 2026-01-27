import React, { useState, useEffect } from 'react';
import { AnalysisEntry, CriteriaConfig, HeatmapAnalysis, SalesScript } from '@/types';
import { ChatWindowProps } from './types';
import { analyzeConversation, analyzeConversationWithHeatmap, generateSalesScript } from '@/geminiService';
import { EvolutionHistory } from '@/components/evolution-history/EvolutionHistory';
import { CriteriaConfigComponent } from '../criteria-config/CriteriaConfig';
import { HeatmapScore } from '../heatmap/HeatmapScore';
import { SalesScriptModal } from '../sales-script/SalesScriptModal';



export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  session, 
  userId,
  onUpdateSessionPrompt,
  onUpdateSessionCriteria,
  onSaveAnalysis,
  onSaveHeatmap,
  onInjectMessage,
  onMarkAsSale,
  onSaveSalesScript,
  instanceCriteria
}) => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingHeatmap, setIsAnalyzingHeatmap] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [showCriteriaConfig, setShowCriteriaConfig] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [selectedHeatmapId, setSelectedHeatmapId] = useState<string | null>(null);
  const [showEvolutionHistory, setShowEvolutionHistory] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'classic' | 'heatmap'>('heatmap');
  const [showSalesScriptModal, setShowSalesScriptModal] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [currentSalesScript, setCurrentSalesScript] = useState<SalesScript | null>(null);

  useEffect(() => {
    if (session) {
      setCurrentPrompt(session.customPrompt || 'Analise o tom de voz e a eficiência em resolver o problema do cliente.');
      setSelectedHistoryId(session.analysisHistory.length > 0 ? session.analysisHistory[0].id : null);
      setSelectedHeatmapId(session.heatmapHistory && session.heatmapHistory.length > 0 ? session.heatmapHistory[0].id : null);
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

  const handleAnalyzeHeatmap = async () => {
    if (!session) return;
    
    // Buscar critérios da sessão ou da instância
    let criteriaToUse = session.criteriaConfig;
    
    // Se não tem critérios na sessão, tentar buscar da instância
    if (!criteriaToUse && instanceCriteria) {
      // Extrair instanceId do sessionId (formato: instanceId-contactJid)
      // Tentar encontrar a instância correspondente
      for (const [instanceId, criteria] of instanceCriteria.entries()) {
        if (session.id.startsWith(instanceId + '-')) {
          criteriaToUse = criteria;
          break;
        }
      }
    }
    
    // Se ainda não tem critérios, mostrar alerta
    if (!criteriaToUse || !(Object.values(criteriaToUse) as string[]).some(v => v.trim() !== '')) {
      alert('Por favor, configure os critérios de avaliação primeiro na aba AJUSTES > Critérios de Avaliação.');
      return;
    }

    setIsAnalyzingHeatmap(true);
    try {
      const result = await analyzeConversationWithHeatmap(session.messages, criteriaToUse);
      
      // Salvar heatmap
      if (onSaveHeatmap) {
        onSaveHeatmap(session.id, result);
      }

      // Também criar uma entrada de análise para compatibilidade
      if (onSaveAnalysis) {
        const analysisEntry: AnalysisEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('pt-BR'),
          promptUsed: 'Análise Heatmap Score',
          result: {
            score: result.nota_final * 10, // Converter para 0-100
            strengths: Object.values(result.analise).map(p => p.justificativa),
            improvements: [],
            coachingTips: `Status: ${result.performance_status}`
          }
        };
        onSaveAnalysis(session.id, analysisEntry);
      }

      // Selecionar o heatmap recém-criado
      const newHeatmapId = Date.now().toString();
      setSelectedHeatmapId(newHeatmapId);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar Heatmap Score. Verifique se a chave da API Gemini está configurada.');
    } finally {
      setIsAnalyzingHeatmap(false);
    }
  };

  const handleSaveCriteria = (criteria: CriteriaConfig, generatedPrompt?: string) => {
    if (!session) return;
    onUpdateSessionCriteria(session.id, criteria, generatedPrompt);
    setShowCriteriaConfig(false);
  };

  const handleMarkAsSale = async () => {
    if (!session) return;
    
    // Marcar a sessão como venda
    if (onMarkAsSale) {
      onMarkAsSale(session.id, true);
    }
    
    // Iniciar geração do script
    setShowSalesScriptModal(true);
    setIsGeneratingScript(true);
    setCurrentSalesScript(null);
    
    try {
      const script = await generateSalesScript(session.messages);
      setCurrentSalesScript(script);
      
      // Salvar o script no histórico da sessão
      if (onSaveSalesScript) {
        onSaveSalesScript(session.id, script);
      }
    } catch (error) {
      console.error('Erro ao gerar script de vendas:', error);
      alert('Erro ao gerar script de vendas. Verifique se a chave da API Gemini está configurada.');
      setShowSalesScriptModal(false);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleViewSalesScript = () => {
    if (session?.salesScriptHistory && session.salesScriptHistory.length > 0) {
      setCurrentSalesScript(session.salesScriptHistory[0].script);
      setShowSalesScriptModal(true);
    }
  };

  const activeAnalysis = session?.analysisHistory.find(h => h.id === selectedHistoryId)?.result;
  const activeHeatmap = session?.heatmapHistory?.find(h => h.id === selectedHeatmapId)?.analysis;

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
      {/* Evolution History Modal */}
      {showEvolutionHistory && (
        <EvolutionHistory
          analysisHistory={session.analysisHistory}
          onClose={() => setShowEvolutionHistory(false)}
        />
      )}

      {/* Criteria Config Modal */}
      {showCriteriaConfig && session && (
        <CriteriaConfigComponent
          criteria={session.criteriaConfig || {
            estrutura: '',
            spiced: '',
            solucao: '',
            objeções: '',
            rapport: ''
          }}
          userId={userId}
          onSave={handleSaveCriteria}
          onCancel={() => setShowCriteriaConfig(false)}
        />
      )}

      {/* Sales Script Modal */}
      {showSalesScriptModal && (
        <SalesScriptModal
          script={currentSalesScript}
          isLoading={isGeneratingScript}
          onClose={() => setShowSalesScriptModal(false)}
        />
      )}

      <div className="flex-1 flex flex-col bg-[#e5ddd5] dark:bg-slate-900 overflow-hidden relative">
        <div className="p-4 bg-white border-b flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-emerald-100 overflow-hidden">
              {session.profilePicture ? (
                <img 
                  src={session.profilePicture} 
                  alt={session.contactName}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.avatar-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`avatar-fallback absolute inset-0 flex items-center justify-center text-emerald-600 font-bold ${session.profilePicture ? 'hidden' : ''}`}>
                {session.contactName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{session.contactName}</h3>
              <p className="text-xs text-emerald-500 font-medium">Conexão Ativa • {session.messages.length} mensagens</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botão de Marcar como Venda / Ver Script */}
            {session?.markedAsSale ? (
              <button 
                onClick={handleViewSalesScript}
                className="p-2 rounded-full bg-emerald-100 text-emerald-600 transition-colors hover:bg-emerald-200"
                title="Ver Script de Vendas"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            ) : (
              <button 
                onClick={handleMarkAsSale}
                className="p-2 rounded-full text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors group relative"
                title="Marcar como Venda Concluída"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            {/* Botão de Configuração de Critérios */}
            <button 
              onClick={() => setShowCriteriaConfig(true)}
              className={`p-2 rounded-full transition-colors ${session?.criteriaConfig ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Configurar Critérios do Heatmap"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </button>
            {/* Botão de Configuração de Prompt */}
            <button 
              onClick={() => setIsEditingConfig(!isEditingConfig)}
              className={`p-2 rounded-full transition-colors ${isEditingConfig ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Configurar Prompt"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </div>

        {isEditingConfig && (
          <div className="absolute top-20 right-4 left-4 bg-white shadow-2xl rounded-2xl p-6 z-20 border border-emerald-100 animate-fade-in">
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
            <div key={m.id} className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
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
          <div className="flex items-center gap-2">
            {/* Toggle entre modos de análise */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setAnalysisMode('heatmap')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  analysisMode === 'heatmap' 
                    ? 'bg-emerald-500 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setAnalysisMode('classic')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  analysisMode === 'classic' 
                    ? 'bg-emerald-500 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Clássica
              </button>
            </div>
            {session.analysisHistory.length > 1 && (
              <button 
                onClick={() => setShowEvolutionHistory(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
                title="Ver Histórico de Evolução"
              >
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </button>
            )}
            <button 
              onClick={analysisMode === 'heatmap' ? handleAnalyzeHeatmap : handleAnalyze} 
              disabled={isAnalyzing || isAnalyzingHeatmap}
              className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg disabled:opacity-50 transition-all"
              title={analysisMode === 'heatmap' ? 'Gerar Heatmap Score' : 'Gerar Análise Clássica'}
            >
              {(isAnalyzing || isAnalyzingHeatmap) ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Exibir Heatmap se disponível e modo selecionado */}
          {analysisMode === 'heatmap' && activeHeatmap ? (
            <div className="animate-fade-in">
              <HeatmapScore analysis={activeHeatmap} />
            </div>
          ) : analysisMode === 'heatmap' && session.heatmapHistory && session.heatmapHistory.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico de Heatmaps</label>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {session.heatmapHistory.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHeatmapId(h.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${selectedHeatmapId === h.id ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {h.timestamp.split(',')[1]?.trim() || h.timestamp} - {h.analysis.nota_final.toFixed(1)}
                  </button>
                ))}
              </div>
              {activeHeatmap && <HeatmapScore analysis={activeHeatmap} />}
            </div>
          ) : analysisMode === 'heatmap' ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8 opacity-40">
              <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <p className="text-sm font-medium">Nenhum Heatmap gerado ainda.</p>
              {!session.criteriaConfig && (
                <p className="text-xs text-amber-600 mt-2">Configure os critérios primeiro!</p>
              )}
              <button onClick={handleAnalyzeHeatmap} className="mt-4 text-xs font-bold text-emerald-500 uppercase">Gerar Heatmap</button>
            </div>
          ) : null}

          {/* Análise Clássica */}
          {analysisMode === 'classic' && session.analysisHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico de Sessões</label>
                {session.analysisHistory.length > 1 && (
                  <button 
                    onClick={() => setShowEvolutionHistory(true)}
                    className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600"
                  >
                    Ver Evolução
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {session.analysisHistory.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHistoryId(h.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${selectedHistoryId === h.id ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {h.timestamp.split(',')[1]?.trim() || h.timestamp} - {h.result.score}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {analysisMode === 'classic' && activeAnalysis ? (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <div className={`text-5xl font-black mb-2 ${activeAnalysis.score >= 70 ? 'text-emerald-500' : activeAnalysis.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {activeAnalysis.score}%
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase">Score de Qualidade</p>
                
                {/* Mini trend indicator */}
                {session.analysisHistory.length > 1 && selectedHistoryId === session.analysisHistory[0].id && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    {(() => {
                      const prevScore = session.analysisHistory[1]?.result.score || 0;
                      const diff = activeAnalysis.score - prevScore;
                      if (diff > 0) {
                        return (
                          <span className="text-xs font-bold text-emerald-500 flex items-center justify-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            +{diff}% vs anterior
                          </span>
                        );
                      } else if (diff < 0) {
                        return (
                          <span className="text-xs font-bold text-red-500 flex items-center justify-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            {diff}% vs anterior
                          </span>
                        );
                      }
                      return <span className="text-xs font-bold text-slate-400">= Igual ao anterior</span>;
                    })()}
                  </div>
                )}
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
          ) : analysisMode === 'classic' ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8 opacity-40">
              <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <p className="text-sm font-medium">Nenhuma análise realizada para esta sessão.</p>
              <button onClick={handleAnalyze} className="mt-4 text-xs font-bold text-emerald-500 uppercase">Iniciar Agora</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
