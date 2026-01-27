import React, { useState } from 'react';
import { SalesScriptModalProps } from './types';

export const SalesScriptModal: React.FC<SalesScriptModalProps> = ({ 
  script, 
  isLoading, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'gatilhos' | 'objecoes' | 'dicas'>('script');
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleCopyStep = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {isLoading ? 'Gerando Script de Vendas...' : script?.titulo || 'Script de Vendas'}
                </h2>
                <p className="text-emerald-100 text-sm">Baseado na conversa convertida em venda</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
            <p className="text-slate-600 font-medium">Analisando conversa e gerando script...</p>
            <p className="text-slate-400 text-sm mt-2">Isso pode levar alguns segundos</p>
          </div>
        ) : script ? (
          <>
            {/* Tabs */}
            <div className="flex border-b bg-slate-50">
              {[
                { id: 'script', label: 'Script', icon: '📝' },
                { id: 'gatilhos', label: 'Gatilhos', icon: '🎯' },
                { id: 'objecoes', label: 'Objeções', icon: '🛡️' },
                { id: 'dicas', label: 'Dicas', icon: '💡' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-emerald-600 border-b-2 border-emerald-500 bg-white'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'script' && (
                <div className="space-y-6">
                  {/* Resumo */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Resumo da Conversa</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{script.resumo_conversa}</p>
                  </div>

                  {/* Steps do Script */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Passos do Script</h4>
                    {script.script_recomendado.map((step, index) => (
                      <div
                        key={index}
                        className="bg-white border-2 border-slate-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0">
                            {step.etapa}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-bold text-slate-800">{step.titulo}</h5>
                              <button
                                onClick={() => handleCopyStep(step.fala_sugerida, index)}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded-lg transition-all"
                                title="Copiar fala"
                              >
                                {copiedStep === index ? (
                                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                              <p className="text-slate-700 text-sm italic">"{step.fala_sugerida}"</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">Objetivo:</span>
                              <span>{step.objetivo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'gatilhos' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                    Gatilhos Identificados na Conversa
                  </h4>
                  <div className="grid gap-3">
                    {script.gatilhos_identificados.map((gatilho, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{gatilho}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'objecoes' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                    Objeções Previstas e Respostas
                  </h4>
                  <div className="space-y-4">
                    {script.objecoes_previstas.map((item, index) => (
                      <div key={index} className="border-2 border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-red-50 p-4 border-b border-slate-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-red-500">❌</span>
                            <span className="text-xs font-bold text-red-600 uppercase">Objeção</span>
                          </div>
                          <p className="text-slate-700 text-sm">{item.objecao}</p>
                        </div>
                        <div className="bg-emerald-50 p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-emerald-500">✓</span>
                            <span className="text-xs font-bold text-emerald-600 uppercase">Resposta Sugerida</span>
                          </div>
                          <p className="text-slate-700 text-sm italic">"{item.resposta_sugerida}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'dicas' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                    Dicas de Aplicação
                  </h4>
                  <div className="grid gap-3">
                    {script.dicas_aplicacao.map((dica, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{dica}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
