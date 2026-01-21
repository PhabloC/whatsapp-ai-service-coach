import React from 'react';
import { AnalysisEntry } from '@/types';
import { EvolutionHistoryProps } from './types';



export const EvolutionHistory: React.FC<EvolutionHistoryProps> = ({ analysisHistory, onClose }) => {
  if (analysisHistory.length === 0) {
    return null;
  }

  const scores = analysisHistory.map(h => h.result.score).reverse();
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  // Calcula tendência
  const trend = scores.length >= 2 
    ? scores[scores.length - 1] - scores[0]
    : 0;

  const getTrendInfo = () => {
    if (trend > 10) return { text: 'Melhora Significativa', color: 'text-emerald-500', icon: '↑' };
    if (trend > 0) return { text: 'Leve Melhora', color: 'text-emerald-400', icon: '↗' };
    if (trend < -10) return { text: 'Queda Significativa', color: 'text-red-500', icon: '↓' };
    if (trend < 0) return { text: 'Leve Queda', color: 'text-amber-500', icon: '↘' };
    return { text: 'Estável', color: 'text-slate-400', icon: '→' };
  };

  const trendInfo = getTrendInfo();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold">Histórico de Evolução</h3>
                <p className="text-xs text-slate-400">{analysisHistory.length} auditorias realizadas</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-slate-800">{avgScore}%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Média</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-600">{maxScore}%</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase">Melhor</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-amber-600">{minScore}%</p>
              <p className="text-[10px] font-bold text-amber-500 uppercase">Pior</p>
            </div>
            <div className={`rounded-2xl p-4 text-center ${trend >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className={`text-2xl font-black ${trendInfo.color}`}>
                {trendInfo.icon} {Math.abs(trend)}
              </p>
              <p className={`text-[10px] font-bold uppercase ${trendInfo.color}`}>Tendência</p>
            </div>
          </div>

          {/* Visual Chart */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Evolução dos Scores</h4>
            <div className="h-32 flex items-end gap-1">
              {scores.map((score, index) => {
                const height = (score / 100) * 100;
                const isLatest = index === scores.length - 1;
                return (
                  <div 
                    key={index}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-bold text-slate-500">{score}%</span>
                    <div 
                      className={`w-full rounded-t-lg transition-all ${
                        score >= 70 
                          ? isLatest ? 'bg-emerald-500' : 'bg-emerald-300'
                          : score >= 50 
                            ? isLatest ? 'bg-amber-500' : 'bg-amber-300'
                            : isLatest ? 'bg-red-500' : 'bg-red-300'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400">
              <span>Mais antiga</span>
              <span>Mais recente</span>
            </div>
          </div>

          {/* Trend Analysis */}
          <div className={`p-4 rounded-2xl ${trend >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trend >= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                <span className="text-white text-xl">{trendInfo.icon}</span>
              </div>
              <div>
                <p className={`font-bold ${trendInfo.color}`}>{trendInfo.text}</p>
                <p className="text-xs text-slate-500">
                  {trend >= 0 
                    ? 'O atendente está evoluindo positivamente com base nas dicas do Coach AI.'
                    : 'Recomenda-se atenção extra e treinamento focado nas áreas de melhoria.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Detailed History */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico Detalhado</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {analysisHistory.map((entry, index) => (
                <div 
                  key={entry.id}
                  className="p-4 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-black ${
                        entry.result.score >= 70 ? 'text-emerald-500' : 
                        entry.result.score >= 50 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {entry.result.score}%
                      </span>
                      {index === 0 && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                          MAIS RECENTE
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{entry.timestamp}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="font-bold text-emerald-600 mb-1">Pontos Fortes ({entry.result.strengths.length})</p>
                      <ul className="text-slate-500 space-y-0.5">
                        {entry.result.strengths.slice(0, 2).map((s, i) => (
                          <li key={i} className="truncate">• {s}</li>
                        ))}
                        {entry.result.strengths.length > 2 && (
                          <li className="text-slate-400">+{entry.result.strengths.length - 2} mais...</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold text-amber-600 mb-1">Melhorias ({entry.result.improvements.length})</p>
                      <ul className="text-slate-500 space-y-0.5">
                        {entry.result.improvements.slice(0, 2).map((s, i) => (
                          <li key={i} className="truncate">• {s}</li>
                        ))}
                        {entry.result.improvements.length > 2 && (
                          <li className="text-slate-400">+{entry.result.improvements.length - 2} mais...</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <p className="text-[10px] text-slate-400 italic truncate">
                      Prompt: {entry.promptUsed}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex-shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
